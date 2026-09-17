import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const aiRoot = resolve(backendRoot, "../web-builder-ai");
const pythonFromVenv = resolve(aiRoot, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
const python = process.env.AI_INTEGRATION_PYTHON ?? (existsSync(pythonFromVenv) ? pythonFromVenv : "python3");
const token = randomBytes(24).toString("hex");

if (!existsSync(resolve(aiRoot, "tests/integration_server.py"))) {
  throw new Error("Clone web-builder-ai beside web-builder-be before running this test");
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveReady);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolveClosed) => server.close(resolveClosed));
  return address.port;
}

function start(command, args, cwd, env) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const processState = { child, error: null, output: "" };
  child.on("error", (error) => { processState.error = error; });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      processState.output = (processState.output + chunk.toString()).slice(-1200);
    });
  }
  return processState;
}

async function stop(processState) {
  if (!processState) return;
  const { child } = processState;
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill();
  let timeoutId;
  const timedOut = new Promise((resolveWait) => { timeoutId = setTimeout(resolveWait, 3000); });
  await Promise.race([exited, timedOut]);
  clearTimeout(timeoutId);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

async function waitReady(url, processState, headers = {}) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (processState.error) throw processState.error;
    if (processState.child.exitCode !== null) {
      throw new Error(`Service exited during startup: ${processState.output}`);
    }
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      // The service may still be starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Service did not become ready: ${processState.output}`);
}

async function request(baseUrl, path, { method = "GET", body, requestId, authorization } = {}) {
  const headers = { Accept: "application/json" };
  if (requestId) headers["X-Request-Id"] = requestId;
  if (authorization) headers.Authorization = authorization;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, body: await response.json() };
}

async function main() {
  const aiPort = await freePort();
  let backendPort = await freePort();
  while (backendPort === aiPort) backendPort = await freePort();
  const aiUrl = `http://127.0.0.1:${aiPort}`;
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  let aiProcess;
  let backendProcess;

  try {
    aiProcess = start(python, ["-m", "tests.integration_server"], aiRoot, {
      PORT: String(aiPort),
      INTERNAL_SERVICE_TOKEN: token,
      LLM_API_KEY: "integration-only",
      LLM_BASE_URL: "http://127.0.0.1:9",
      OPENAI_API_KEY: "",
    });
    await waitReady(`${aiUrl}/internal/v1/health`, aiProcess, { Authorization: `Bearer ${token}` });

    backendProcess = start(process.execPath, ["dist/src/server.js"], backendRoot, {
      PORT: String(backendPort),
      AI_SERVICE_BASE_URL: aiUrl,
      AI_SERVICE_TIMEOUT_MS: "1500",
      AI_SERVICE_TOKEN: token,
    });
    await waitReady(`${backendUrl}/api/v1/health`, backendProcess);

    const health = await request(backendUrl, "/api/v1/health", { requestId: "req_e2e_health" });
    assert.equal(health.status, 200);
    assert.equal(health.body.meta.requestId, "req_e2e_health");

    const unauthorized = await request(aiUrl, "/internal/v1/health", { requestId: "req_e2e_auth" });
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "INTERNAL_UNAUTHORIZED");
    assert.equal(unauthorized.body.meta.requestId, "req_e2e_auth");

    const invalidRequest = await request(backendUrl, "/api/v1/generate", {
      method: "POST", body: { businessDescription: "short" }, requestId: "req_e2e_invalid",
    });
    assert.equal(invalidRequest.status, 400);
    assert.equal(invalidRequest.body.error.code, "INVALID_REQUEST");

    const generated = await request(backendUrl, "/api/v1/generate", {
      method: "POST", body: { businessDescription: "Warung kopi dan camilan di Surabaya, WA 081234567890" },
      requestId: "req_e2e_generate",
    });
    assert.equal(generated.status, 200);
    assert.equal(generated.body.meta.requestId, "req_e2e_generate");
    assert.equal(generated.body.meta.isFallback, false);
    assert.equal(generated.body.data.templateId, "template-fnb");
    assert.equal(generated.body.data.contact.whatsappNumber, "6281234567890");
    assert.ok(generated.body.data.testimonials.length >= 2);

    const withoutNumber = await request(backendUrl, "/api/v1/generate", {
      method: "POST", body: { businessDescription: "Warung kopi dan camilan tanpa nomor kontak" },
      requestId: "req_e2e_no_whatsapp",
    });
    assert.equal(withoutNumber.status, 200);
    assert.equal(withoutNumber.body.data.contact.whatsappNumber, null);

    const withNumber = await request(backendUrl, "/api/v1/revise", {
      method: "POST",
      body: {
        currentState: withoutNumber.body.data,
        instruction: "Ganti nomor WhatsApp menjadi 0813 2222-3333",
      },
      requestId: "req_e2e_set_whatsapp",
    });
    assert.equal(withNumber.status, 200);
    assert.equal(withNumber.body.data.contact.whatsappNumber, "6281322223333");
    assert.deepEqual(withNumber.body.meta.changedPaths, ["contact.whatsappNumber"]);

    const removedNumber = await request(backendUrl, "/api/v1/revise", {
      method: "POST",
      body: { currentState: withNumber.body.data, instruction: "Hapus nomor WhatsApp" },
      requestId: "req_e2e_remove_whatsapp",
    });
    assert.equal(removedNumber.status, 200);
    assert.equal(removedNumber.body.data.contact.whatsappNumber, null);

    const original = generated.body.data;
    const colored = await request(backendUrl, "/api/v1/revise", {
      method: "POST", body: { currentState: original, instruction: "Ganti warna utama dan aksen" },
      requestId: "req_e2e_color",
    });
    assert.equal(colored.status, 200);
    assert.equal(colored.body.meta.requestId, "req_e2e_color");
    assert.equal(colored.body.meta.revisionApplied, true);
    assert.equal(colored.body.data.theme.primaryColor, "#123456");
    assert.equal(colored.body.data.theme.accentColor, "#654321");
    assert.deepEqual([...colored.body.meta.changedPaths].sort(), ["theme.accentColor", "theme.primaryColor"]);
    assert.deepEqual(colored.body.data.services, original.services);
    assert.deepEqual(colored.body.data.testimonials, original.testimonials);
    assert.deepEqual(colored.body.data.contact, original.contact);
    assert.deepEqual(colored.body.data.hero, original.hero);
    assert.deepEqual(colored.body.data.about, original.about);

    const coloredState = colored.body.data;
    const added = await request(backendUrl, "/api/v1/revise", {
      method: "POST", body: { currentState: coloredState, instruction: "Tambah layanan baru" },
      requestId: "req_e2e_service",
    });
    assert.equal(added.status, 200);
    assert.equal(added.body.meta.revisionApplied, true);
    assert.deepEqual(added.body.meta.changedPaths, ["services"]);
    assert.equal(added.body.data.services.length, coloredState.services.length + 1);
    assert.deepEqual(added.body.data.services.slice(0, -1), coloredState.services);
    assert.equal(added.body.data.services.at(-1).name, "Layanan Baru");
    assert.deepEqual(added.body.data.theme, coloredState.theme);
    assert.deepEqual(added.body.data.contact, coloredState.contact);
    assert.deepEqual(added.body.data.testimonials, coloredState.testimonials);

    const currentState = added.body.data;
    const unsupported = await request(backendUrl, "/api/v1/revise", {
      method: "POST", body: { currentState, instruction: "Hapus testimoni" },
      requestId: "req_e2e_unsupported",
    });
    assert.equal(unsupported.status, 422);
    assert.equal(unsupported.body.error.code, "UNSUPPORTED_REVISION");
    assert.equal(unsupported.body.meta.requestId, "req_e2e_unsupported");

    for (const instruction of ["trigger-invalid-mutation", "trigger-provider-error"]) {
      const fallback = await request(backendUrl, "/api/v1/revise", {
        method: "POST", body: { currentState, instruction }, requestId: "req_e2e_fallback",
      });
      assert.equal(fallback.status, 200);
      assert.equal(fallback.body.meta.revisionApplied, false);
      assert.equal(fallback.body.meta.isFallback, true);
      assert.deepEqual(fallback.body.data, currentState);
      assert.doesNotMatch(JSON.stringify(fallback.body), /Mock provider failure/);
    }

    const invalidOutput = await request(backendUrl, "/api/v1/generate", {
      method: "POST", body: { businessDescription: "trigger-invalid-output for a local business" },
      requestId: "req_e2e_output",
    });
    assert.equal(invalidOutput.status, 200);
    assert.equal(invalidOutput.body.meta.isFallback, true);
    assert.ok(invalidOutput.body.data.services.length >= 3);

    const timeout = await request(backendUrl, "/api/v1/generate", {
      method: "POST", body: { businessDescription: "trigger-timeout for a local business" },
      requestId: "req_e2e_timeout",
    });
    assert.equal(timeout.status, 502);
    assert.equal(timeout.body.error.code, "LLM_UNAVAILABLE");
    assert.equal(timeout.body.meta.requestId, "req_e2e_timeout");

    process.stdout.write("Dev 1 -> Dev 2 HTTP integration passed (health, auth, generate, revise, fallback, errors, timeout).\n");
  } finally {
    await stop(backendProcess);
    await stop(aiProcess);
  }
}

void main().catch((error) => {
  process.stderr.write(`${error.stack ?? String(error)}\n`);
  process.exitCode = 1;
});
