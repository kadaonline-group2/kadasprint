import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import { createApp } from "../src/app";
import { AiServiceHttpError, HttpAiServiceClient } from "../src/clients/http-ai-service.client";
import type { AiServiceClient } from "../src/contracts/ai-service.types";
import { validState } from "./fixtures/website-state";

function responseFor(websiteState: unknown, requestId: string, isFallback = false): unknown {
  return {
    success: true,
    data: { websiteState },
    meta: { requestId, attempts: 1, isFallback, latencyMs: 1 },
  };
}

function errorResponseFor(code: string, requestId: string): unknown {
  return {
    success: false,
    error: { code, message: "Private AI service detail" },
    meta: { requestId },
  };
}

function clientWithGenerate(generate: AiServiceClient["generate"]): AiServiceClient {
  return { health: async () => null, generate, revise: async () => null };
}

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

async function postGenerate(client: AiServiceClient, body: unknown, requestId = "req_generate") {
  const server = createServer(createApp(client));
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as unknown };
  } finally {
    await close(server);
  }
}

test("generate normalizes the AI state and returns a full WebsiteState", async () => {
  let receivedInput: unknown;
  const rawState = structuredClone(validState);
  rawState.contact.whatsappNumber = "+62 812-3456-789";
  rawState.templateId = "template-services";
  const client = clientWithGenerate(async (input) => {
    receivedInput = input;
    return responseFor(rawState, input.requestId);
  });

  const result = await postGenerate(client, { businessDescription: "  Warung kopi di Surabaya  " });

  assert.equal(result.status, 200);
  assert.deepEqual(receivedInput, {
    businessDescription: "Warung kopi di Surabaya",
    requestId: "req_generate",
  });
  const response = result.body as {
    success: boolean;
    data: unknown;
    meta: { requestId: string; isFallback: boolean; latencyMs: number };
  };
  assert.equal(response.success, true);
  assert.deepEqual(response.data, validState);
  assert.equal(response.meta.requestId, "req_generate");
  assert.equal(response.meta.isFallback, false);
  assert.ok(response.meta.latencyMs >= 0);
});

test("generate preserves an absent WhatsApp number as null", async () => {
  const state = structuredClone(validState);
  state.contact.whatsappNumber = null;
  const result = await postGenerate(clientWithGenerate(async (input) =>
    responseFor(state, input.requestId)), { businessDescription: "Warung kopi tanpa nomor WA" });

  assert.equal(result.status, 200);
  assert.equal((result.body as { data: typeof validState }).data.contact.whatsappNumber, null);
});

test("generate selects the F&B template for a coffee shop category", async () => {
  const state = structuredClone(validState);
  state.meta.category = "Kedai Kopi";
  state.templateId = "template-services";
  const result = await postGenerate(clientWithGenerate(async (input) =>
    responseFor(state, input.requestId)), { businessDescription: "Kopi Senja, kedai kopi di Bandung" });

  assert.equal(result.status, 200);
  assert.equal((result.body as { data: typeof validState }).data.templateId, "template-fnb");
});

test("generate rejects invalid requests before calling the AI client", async () => {
  let calls = 0;
  const client = clientWithGenerate(async () => {
    calls += 1;
    return responseFor(validState, "req_generate");
  });

  const result = await postGenerate(client, { businessDescription: "short" });

  assert.equal(result.status, 400);
  assert.equal(calls, 0);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "INVALID_REQUEST", message: "Business description must be 10 to 4000 characters" },
    meta: { requestId: "req_generate" },
  });
});

test("generate rejects invalid AI state without exposing it", async () => {
  const invalidState = structuredClone(validState);
  invalidState.testimonials.pop();
  const result = await postGenerate(clientWithGenerate(async (input) =>
    responseFor(invalidState, input.requestId)), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 502);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "LLM_UNAVAILABLE", message: "Website generation is unavailable" },
    meta: { requestId: "req_generate" },
  });
});

test("generate maps AI timeout or provider failure to a public error", async () => {
  const result = await postGenerate(clientWithGenerate(async () => {
    throw new Error("private provider detail");
  }), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 502);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "LLM_UNAVAILABLE", message: "Website generation is unavailable" },
    meta: { requestId: "req_generate" },
  });
});

test("generate maps AI rate limits to HTTP 429", async () => {
  const result = await postGenerate(clientWithGenerate(async () => {
    throw new AiServiceHttpError(429, errorResponseFor("AI_RATE_LIMITED", "req_generate"));
  }), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 429);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "RATE_LIMITED", message: "AI service rate limit reached" },
    meta: { requestId: "req_generate" },
  });
});

test("generate maps an unexpected internal AI request rejection to HTTP 500", async () => {
  const result = await postGenerate(clientWithGenerate(async () => {
    throw new AiServiceHttpError(400, errorResponseFor("AI_INVALID_REQUEST", "req_generate"));
  }), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 500);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    meta: { requestId: "req_generate" },
  });
});

test("generate rejects an internal error envelope", async () => {
  const result = await postGenerate(clientWithGenerate(async (input) =>
    errorResponseFor("AI_PROVIDER_ERROR", input.requestId)), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 502);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "LLM_UNAVAILABLE", message: "Website generation is unavailable" },
    meta: { requestId: "req_generate" },
  });
});

test("generate does not trust a rate-limit error with another request ID", async () => {
  const result = await postGenerate(clientWithGenerate(async () => {
    throw new AiServiceHttpError(429, errorResponseFor("AI_RATE_LIMITED", "req_other"));
  }), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 502);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "LLM_UNAVAILABLE", message: "Website generation is unavailable" },
    meta: { requestId: "req_generate" },
  });
});

test("generate rejects non-finite latency metadata from the AI service", async () => {
  const result = await postGenerate(clientWithGenerate(async (input) => ({
    success: true,
    data: { websiteState: validState },
    meta: { requestId: input.requestId, attempts: 1, isFallback: false, latencyMs: Infinity },
  })), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 502);
});

test("generate preserves a valid fallback flag from the AI service", async () => {
  const result = await postGenerate(clientWithGenerate(async (input) =>
    responseFor(validState, input.requestId, true)), { businessDescription: "Warung kopi Surabaya" });

  assert.equal(result.status, 200);
  assert.equal((result.body as { meta: { isFallback: boolean } }).meta.isFallback, true);
});

test("HTTP AI client sends the internal contract body and request ID", async () => {
  let received: unknown;
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    received = {
      method: request.method,
      path: request.url,
      requestId: request.headers["x-request-id"],
      authorization: request.headers.authorization,
      body: JSON.parse(body) as unknown,
    };
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(responseFor(validState, "req_internal")));
  });
  const baseUrl = await listen(server);

  try {
    const client = new HttpAiServiceClient(baseUrl, 1000, "local-test-token");
    const response = await client.generate({ businessDescription: "Warung kopi Surabaya", requestId: "req_internal" });
    assert.deepEqual(response, responseFor(validState, "req_internal"));
    assert.deepEqual(received, {
      method: "POST",
      path: "/internal/v1/generate",
      requestId: "req_internal",
      authorization: "Bearer local-test-token",
      body: { businessDescription: "Warung kopi Surabaya", schemaVersion: "1.1" },
    });
  } finally {
    await close(server);
  }
});

test("HTTP AI client preserves a valid internal rate-limit envelope for public mapping", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(429, { "Content-Type": "application/json" });
    response.end(JSON.stringify(errorResponseFor("AI_RATE_LIMITED", "req_http_error")));
  });
  const baseUrl = await listen(server);

  try {
    const result = await postGenerate(clientWithGenerate((input) =>
      new HttpAiServiceClient(baseUrl, 1000).generate(input)),
    { businessDescription: "Warung kopi Surabaya" }, "req_http_error");
    assert.equal(result.status, 429);
    assert.deepEqual(result.body, {
      success: false,
      error: { code: "RATE_LIMITED", message: "AI service rate limit reached" },
      meta: { requestId: "req_http_error" },
    });
  } finally {
    await close(server);
  }
});

test("HTTP AI client applies its configured timeout", async () => {
  const server = createServer((_request, response) => {
    setTimeout(() => response.end("late"), 100);
  });
  const baseUrl = await listen(server);

  try {
    const client = new HttpAiServiceClient(baseUrl, 10);
    await assert.rejects(client.generate({
      businessDescription: "Warung kopi Surabaya",
      requestId: "req_timeout",
    }));
  } finally {
    await close(server);
  }
});
