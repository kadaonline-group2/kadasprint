import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import JSZip from "jszip";
import { createApp } from "../src/app";
import type { AiServiceClient } from "../src/contracts/ai-service.types";
import { renderWebsiteHtml } from "../src/services/export-renderer.service";
import { validState } from "./fixtures/website-state";

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function postExport(body: unknown, client?: AiServiceClient) {
  const server = createServer(createApp(client));
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Request-Id": "req_export" },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      headers: response.headers,
      body: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    await close(server);
  }
}

test("export returns an extractable offline HTML ZIP without calling AI", async () => {
  let aiCalls = 0;
  const client: AiServiceClient = {
    health: async () => { aiCalls += 1; return null; },
    generate: async () => { aiCalls += 1; return null; },
    revise: async () => { aiCalls += 1; return null; },
  };
  const response = await postExport({ currentState: validState }, client);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/zip/);
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="website-umkm.zip"');
  assert.equal(response.headers.get("x-request-id"), "req_export");
  assert.equal(aiCalls, 0);
  assert.deepEqual((await postExport({ currentState: validState }, client)).body, response.body);
  assert.equal(aiCalls, 0);

  const zip = await JSZip.loadAsync(response.body);
  assert.deepEqual(Object.keys(zip.files), ["index.html"]);
  const html = await zip.file("index.html")?.async("string");
  assert.ok(html);
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<style>[\s\S]*<\/style>/);
  assert.match(html, /class="page template-fnb"/);
  assert.match(html, /--primary:#6B3E26/);
  assert.match(html, /--accent:#F4C27A/);
  assert.equal(html, renderWebsiteHtml(validState));
  assert.match(html, /Kopi Tubruk/);
  assert.match(html, /Pelayanannya cepat/);
  assert.match(html, /https:\/\/wa\.me\/628123456789\?text=Halo%2C%20saya%20ingin%20memesan/);
  assert.doesNotMatch(html, /<script\b|<link\b|\bsrc=|url\(/i);
});

test("export keeps WhatsApp actions inert when the number is missing", async () => {
  const state = structuredClone(validState);
  state.contact.whatsappNumber = null;
  const response = await postExport({ currentState: state });
  assert.equal(response.status, 200);
  const zip = await JSZip.loadAsync(response.body);
  const html = await zip.file("index.html")?.async("string");
  assert.ok(html);
  assert.match(html, /Nomor WhatsApp belum tersedia/);
  assert.match(html, /aria-disabled="true"/);
  assert.doesNotMatch(html, /https:\/\/wa\.me\//);
});

test("export escapes business content in the generated HTML", async () => {
  const state = structuredClone(validState);
  state.meta.businessName = '<script>alert("x")</script>';
  state.hero.title = '<img src=x onerror="alert(1)">';
  state.contact.instagram = '" onclick="alert(1)';
  const response = await postExport({ currentState: state });
  const zip = await JSZip.loadAsync(response.body);
  const html = await zip.file("index.html")?.async("string");

  assert.equal(response.status, 200);
  assert.ok(html);
  assert.doesNotMatch(html, /<script\b|<img\b/i);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test("export chooses readable foreground colors for extreme theme colors", async () => {
  const state = structuredClone(validState);
  state.theme.primaryColor = "#FFFFFF";
  state.theme.accentColor = "#000000";
  const response = await postExport({ currentState: state });
  const zip = await JSZip.loadAsync(response.body);
  const html = await zip.file("index.html")?.async("string");

  assert.equal(response.status, 200);
  assert.ok(html);
  assert.match(html, /--on-primary:#000;--on-accent:#fff/);
  assert.match(html, /\.menu-section\{[^}]*color:var\(--on-primary\)/);
  assert.match(html, /\.contact-section\{[^}]*color:var\(--on-accent\)/);
});

test("export rejects missing state with the standard JSON error envelope", async () => {
  const response = await postExport({});

  assert.equal(response.status, 400);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
  assert.deepEqual(JSON.parse(response.body.toString("utf8")), {
    success: false,
    error: { code: "INVALID_REQUEST", message: "Current state is required" },
    meta: { requestId: "req_export" },
  });
});

test("export rejects an invalid WebsiteState before building a ZIP", async () => {
  const state = structuredClone(validState);
  state.testimonials.pop();
  const response = await postExport({ currentState: state });

  assert.equal(response.status, 400);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
  assert.deepEqual(JSON.parse(response.body.toString("utf8")), {
    success: false,
    error: { code: "INVALID_WEBSITE_STATE", message: "Current website state is invalid" },
    meta: { requestId: "req_export" },
  });
});

test("export identifies each supported template in its HTML", async () => {
  for (const templateId of ["template-services", "template-fnb", "template-retail"] as const) {
    const response = await postExport({ currentState: { ...validState, templateId } });
    const zip = await JSZip.loadAsync(response.body);
    const html = await zip.file("index.html")?.async("string");
    assert.equal(response.status, 200);
    assert.match(html ?? "", new RegExp(`class="page ${templateId}"`));
    assert.equal(html, renderWebsiteHtml({ ...validState, templateId }));
  }
});
