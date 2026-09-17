import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app";
import { HttpAiServiceClient } from "../src/clients/http-ai-service.client";

let server: Server;
let baseUrl: string;
let unhealthy = false;

before(async () => {
  server = createServer(createApp({
    health: async ({ requestId }) => unhealthy ? null : {
      success: true,
      data: { status: "ok", service: "ai-website-builder-ai-service" },
      meta: { requestId },
    },
    generate: async () => null,
    revise: async () => null,
  }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("GET /api/v1/health returns the success envelope and request ID", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    headers: { "X-Request-Id": "req_health001", Origin: "http://localhost:5173" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-request-id"), "req_health001");
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.deepEqual(await response.json(), {
    success: true,
    data: { status: "ok", service: "ai-website-builder-backend" },
    meta: { requestId: "req_health001" },
  });
});

test("health fails safely when the AI service is unhealthy", async () => {
  unhealthy = true;
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { "X-Request-Id": "req_unhealthy" },
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      success: false,
      error: { code: "LLM_UNAVAILABLE", message: "AI service is unavailable" },
      meta: { requestId: "req_unhealthy" },
    });
  } finally {
    unhealthy = false;
  }
});

test("HTTP AI health client forwards request ID and internal token", async () => {
  const upstream = createServer(async (request, response) => {
    assert.equal(request.method, "GET");
    assert.equal(request.url, "/internal/v1/health");
    assert.equal(request.headers["x-request-id"], "req_upstream");
    assert.equal(request.headers.authorization, "Bearer test-token");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
      success: true,
      data: { status: "ok", service: "ai-website-builder-ai-service" },
      meta: { requestId: "req_upstream" },
    }));
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  assert.ok(address && typeof address !== "string");
  try {
    const client = new HttpAiServiceClient(`http://127.0.0.1:${address.port}`, 1000, "test-token");
    assert.deepEqual(await client.health({ requestId: "req_upstream" }), {
      success: true,
      data: { status: "ok", service: "ai-website-builder-ai-service" },
      meta: { requestId: "req_upstream" },
    });
  } finally {
    upstream.closeAllConnections();
    await new Promise<void>((resolve, reject) => upstream.close((error) => error ? reject(error) : resolve()));
  }
});

test("requests without a valid request ID receive a generated one", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    headers: { "X-Request-Id": "invalid id" },
  });
  const body = await response.json() as { meta: { requestId: string } };

  assert.match(body.meta.requestId, /^req_[0-9a-f-]{36}$/);
  assert.equal(response.headers.get("x-request-id"), body.meta.requestId);
});

test("invalid JSON uses the error envelope", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Request-Id": "req_invalid001" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    error: { code: "INVALID_REQUEST", message: "Invalid JSON request body" },
    meta: { requestId: "req_invalid001" },
  });
});
