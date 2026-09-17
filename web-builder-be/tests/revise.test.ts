import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import { createApp } from "../src/app";
import { AiServiceHttpError, HttpAiServiceClient } from "../src/clients/http-ai-service.client";
import type { AiServiceClient } from "../src/contracts/ai-service.types";
import type { RevisionMutation } from "../src/types/revision-mutation";
import { validState } from "./fixtures/website-state";

function responseFor(mutation: unknown, requestId: string): unknown {
  return {
    success: true,
    data: { mutation },
    meta: { requestId, attempts: 1, isFallback: false, latencyMs: 1 },
  };
}

function clientWithRevise(revise: AiServiceClient["revise"]): AiServiceClient {
  return { health: async () => null, generate: async () => null, revise };
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

async function postRevise(client: AiServiceClient, body: unknown, requestId = "req_revise") {
  const server = createServer(createApp(client));
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as unknown };
  } finally {
    await close(server);
  }
}

test("revise applies a theme mutation and preserves untouched sections", async () => {
  let receivedInput: unknown;
  const mutation: RevisionMutation = {
    intent: "UPDATE_THEME",
    changedPaths: ["theme.primaryColor", "theme.accentColor"],
    theme: { primaryColor: "#4A2C20", accentColor: "#D7B899" },
  };
  const client = clientWithRevise(async (input) => {
    receivedInput = input;
    return responseFor(mutation, input.requestId);
  });

  const result = await postRevise(client, {
    currentState: validState,
    instruction: "  Ganti warna menjadi cokelat klasik  ",
  });

  assert.equal(result.status, 200);
  assert.deepEqual(receivedInput, {
    currentState: validState,
    instruction: "Ganti warna menjadi cokelat klasik",
    requestId: "req_revise",
  });
  const response = result.body as {
    data: typeof validState;
    meta: { revisionApplied: boolean; changedPaths: string[]; isFallback: boolean };
  };
  assert.equal(response.data.theme.primaryColor, "#4A2C20");
  assert.equal(response.data.theme.accentColor, "#D7B899");
  assert.deepEqual(response.data.hero, validState.hero);
  assert.deepEqual(response.data.services, validState.services);
  assert.deepEqual(response.data.testimonials, validState.testimonials);
  assert.deepEqual(response.data.contact, validState.contact);
  assert.equal(response.meta.revisionApplied, true);
  assert.equal(response.meta.isFallback, false);
  assert.deepEqual(response.meta.changedPaths, mutation.changedPaths);
});

test("revise appends exactly one service without changing existing items", async () => {
  const newService = {
    name: "Pisang Goreng Keju",
    description: "Pisang goreng dengan keju",
    priceEstimate: "Rp15.000",
  };
  const mutation: RevisionMutation = {
    intent: "ADD_SERVICE",
    changedPaths: ["services"],
    services: { append: [newService] },
  };
  const result = await postRevise(clientWithRevise(async (input) =>
    responseFor(mutation, input.requestId)), {
    currentState: validState,
    instruction: "Tambahkan menu pisang goreng keju",
  });

  assert.equal(result.status, 200);
  const state = (result.body as { data: typeof validState }).data;
  assert.equal(state.services.length, validState.services.length + 1);
  assert.deepEqual(state.services.slice(0, validState.services.length), validState.services);
  assert.deepEqual(state.services.at(-1), newService);
  assert.deepEqual(state.theme, validState.theme);
  assert.deepEqual(state.testimonials, validState.testimonials);
});

test("revise accepts services.append but rejects more than one appended service", async () => {
  const newService = {
    name: "Pisang Goreng Keju",
    description: "Pisang goreng dengan keju",
    priceEstimate: "Rp15.000",
  };
  const accepted = await postRevise(clientWithRevise(async (input) => responseFor({
    intent: "ADD_SERVICE",
    changedPaths: ["services.append"],
    services: { append: [newService] },
  }, input.requestId)), {
    currentState: validState,
    instruction: "Tambahkan satu menu",
  });
  assert.equal((accepted.body as { meta: { revisionApplied: boolean } }).meta.revisionApplied, true);

  const rejected = await postRevise(clientWithRevise(async (input) => responseFor({
    intent: "ADD_SERVICE",
    changedPaths: ["services"],
    services: { append: [newService, { ...newService, name: "Menu Kedua" }] },
  }, input.requestId)), {
    currentState: validState,
    instruction: "Tambahkan dua menu",
  });
  assert.deepEqual((rejected.body as { data: unknown }).data, validState);
  assert.equal((rejected.body as { meta: { revisionApplied: boolean } }).meta.revisionApplied, false);
});

test("revise updates copy while preserving theme and contact", async () => {
  const mutation: RevisionMutation = {
    intent: "UPDATE_COPY",
    changedPaths: ["meta.tagline", "hero.title", "about.story"],
    meta: { tagline: "Ngopi nyaman setiap hari" },
    hero: { title: "Kopi Lokal untuk Semua" },
    about: { story: "Tempat menikmati kopi lokal bersama teman." },
  };
  const result = await postRevise(clientWithRevise(async (input) =>
    responseFor(mutation, input.requestId)), {
    currentState: validState,
    instruction: "Buat tulisan lebih ramah",
  });

  const state = (result.body as { data: typeof validState }).data;
  assert.equal(state.meta.tagline, mutation.meta?.tagline);
  assert.equal(state.hero.title, mutation.hero?.title);
  assert.equal(state.about.story, mutation.about?.story);
  assert.deepEqual(state.theme, validState.theme);
  assert.deepEqual(state.contact, validState.contact);
  assert.deepEqual(state.testimonials, validState.testimonials);
});

test("revise normalizes an updated WhatsApp number", async () => {
  const mutation: RevisionMutation = {
    intent: "UPDATE_CONTACT",
    changedPaths: ["contact.whatsappNumber"],
    contact: { whatsappNumber: "0813 2222-3333" },
  };
  const result = await postRevise(clientWithRevise(async (input) =>
    responseFor(mutation, input.requestId)), {
    currentState: validState,
    instruction: "Ganti nomor WhatsApp",
  });

  assert.equal(result.status, 200);
  assert.equal((result.body as { data: typeof validState }).data.contact.whatsappNumber, "6281322223333");
});

test("revise can add a WhatsApp number to a state without one", async () => {
  const currentState = structuredClone(validState);
  currentState.contact.whatsappNumber = null;
  const mutation: RevisionMutation = {
    intent: "UPDATE_CONTACT",
    changedPaths: ["contact.whatsappNumber"],
    contact: { whatsappNumber: "0813 2222-3333" },
  };
  const result = await postRevise(clientWithRevise(async (input) =>
    responseFor(mutation, input.requestId)), {
    currentState,
    instruction: "Ganti nomor WhatsApp menjadi 0813 2222-3333",
  });
  assert.equal(result.status, 200);
  assert.equal((result.body as { data: typeof validState }).data.contact.whatsappNumber, "6281322223333");
});

test("revise can remove a WhatsApp number without changing other contact fields", async () => {
  const mutation: RevisionMutation = {
    intent: "UPDATE_CONTACT",
    changedPaths: ["contact.whatsappNumber"],
    contact: { whatsappNumber: null },
  };
  const result = await postRevise(clientWithRevise(async (input) =>
    responseFor(mutation, input.requestId)), {
    currentState: validState,
    instruction: "Hapus nomor WhatsApp",
  });
  assert.equal(result.status, 200);
  const state = (result.body as { data: typeof validState }).data;
  assert.equal(state.contact.whatsappNumber, null);
  assert.equal(state.contact.address, validState.contact.address);
  assert.deepEqual(state.services, validState.services);
});

test("revise changes font without altering the other theme fields", async () => {
  const mutation: RevisionMutation = {
    intent: "UPDATE_THEME",
    changedPaths: ["theme.fontFamily"],
    theme: { fontFamily: "serif" },
  };
  const result = await postRevise(clientWithRevise(async (input) =>
    responseFor(mutation, input.requestId)), {
    currentState: validState,
    instruction: "Pakai font serif",
  });

  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { data: typeof validState }).data.theme, {
    ...validState.theme,
    fontFamily: "serif",
  });
});

test("revise rejects empty instructions before calling AI", async () => {
  let calls = 0;
  const result = await postRevise(clientWithRevise(async () => {
    calls += 1;
    return null;
  }), { currentState: validState, instruction: "   " });

  assert.equal(result.status, 400);
  assert.equal(calls, 0);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "INVALID_REQUEST", message: "Current state and revision instruction are required" },
    meta: { requestId: "req_revise" },
  });
});

test("revise rejects invalid currentState before calling AI", async () => {
  let calls = 0;
  const invalidState = structuredClone(validState);
  invalidState.testimonials.pop();
  const result = await postRevise(clientWithRevise(async () => {
    calls += 1;
    return null;
  }), { currentState: invalidState, instruction: "Ganti warna" });

  assert.equal(result.status, 400);
  assert.equal(calls, 0);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "INVALID_WEBSITE_STATE", message: "Current website state is invalid" },
    meta: { requestId: "req_revise" },
  });
});

test("revise returns the old state when mutation paths do not match the payload", async () => {
  const invalidMutation = {
    intent: "UPDATE_THEME",
    changedPaths: ["theme.accentColor"],
    theme: { primaryColor: "#4A2C20" },
  };
  const result = await postRevise(clientWithRevise(async (input) =>
    responseFor(invalidMutation, input.requestId)), {
    currentState: validState,
    instruction: "Ganti warna",
  });

  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { data: unknown }).data, validState);
  assert.deepEqual((result.body as { meta: unknown }).meta, {
    requestId: "req_revise",
    isFallback: true,
    revisionApplied: false,
    changedPaths: [],
    fallbackReason: "REVISION_FAILED",
    latencyMs: (result.body as { meta: { latencyMs: number } }).meta.latencyMs,
  });
});

test("revise rejects a mutation that changes a section outside its intent", async () => {
  const result = await postRevise(clientWithRevise(async (input) => responseFor({
    intent: "UPDATE_THEME",
    changedPaths: ["theme.primaryColor", "contact.address"],
    theme: { primaryColor: "#4A2C20" },
    contact: { address: "Alamat yang tidak diminta" },
  }, input.requestId)), { currentState: validState, instruction: "Ganti warna" });

  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { data: unknown }).data, validState);
  assert.equal((result.body as { meta: { revisionApplied: boolean } }).meta.revisionApplied, false);
});

test("revise returns the old state when the AI service fails", async () => {
  const result = await postRevise(clientWithRevise(async () => {
    throw new Error("private provider failure");
  }), { currentState: validState, instruction: "Ganti warna" });

  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { data: unknown }).data, validState);
  const meta = (result.body as { meta: { revisionApplied: boolean; isFallback: boolean } }).meta;
  assert.equal(meta.revisionApplied, false);
  assert.equal(meta.isFallback, true);
});

test("revise does not apply a mutation marked as internal fallback", async () => {
  const result = await postRevise(clientWithRevise(async (input) => ({
    success: true,
    data: { mutation: {
      intent: "UPDATE_THEME",
      changedPaths: ["theme.primaryColor"],
      theme: { primaryColor: "#4A2C20" },
    } },
    meta: { requestId: input.requestId, attempts: 1, isFallback: true, latencyMs: 1 },
  })), { currentState: validState, instruction: "Ganti warna" });

  assert.deepEqual((result.body as { data: unknown }).data, validState);
  assert.equal((result.body as { meta: { revisionApplied: boolean } }).meta.revisionApplied, false);
});

test("revise maps unsupported instructions to HTTP 422", async () => {
  const result = await postRevise(clientWithRevise(async () => {
    throw new AiServiceHttpError(422, {
      success: false,
      error: { code: "AI_UNSUPPORTED_REVISION", message: "Private AI service detail" },
      meta: { requestId: "req_revise" },
    });
  }), { currentState: validState, instruction: "Hapus semua testimoni" });

  assert.equal(result.status, 422);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "UNSUPPORTED_REVISION", message: "Revision instruction is not supported" },
    meta: { requestId: "req_revise" },
  });
});

test("revise preserves the current state when an unsupported error has another request ID", async () => {
  const result = await postRevise(clientWithRevise(async () => {
    throw new AiServiceHttpError(422, {
      success: false,
      error: { code: "AI_UNSUPPORTED_REVISION", message: "Private AI service detail" },
      meta: { requestId: "req_other" },
    });
  }), { currentState: validState, instruction: "Ganti warna" });

  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { data: unknown }).data, validState);
  assert.equal((result.body as { meta: { revisionApplied: boolean } }).meta.revisionApplied, false);
});

test("revise does not treat an unrelated HTTP 422 as an unsupported instruction", async () => {
  const result = await postRevise(clientWithRevise(async () => {
    throw new AiServiceHttpError(422, {
      success: false,
      error: { code: "AI_PROVIDER_ERROR", message: "Private AI service detail" },
      meta: { requestId: "req_revise" },
    });
  }), { currentState: validState, instruction: "Ganti warna" });

  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { data: unknown }).data, validState);
  assert.equal((result.body as { meta: { revisionApplied: boolean } }).meta.revisionApplied, false);
});

test("revise maps an unsupported internal error envelope to HTTP 422", async () => {
  const result = await postRevise(clientWithRevise(async (input) => ({
    success: false,
    error: { code: "AI_UNSUPPORTED_REVISION", message: "internal detail" },
    meta: { requestId: input.requestId },
  })), { currentState: validState, instruction: "Hapus semua testimoni" });

  assert.equal(result.status, 422);
  assert.deepEqual(result.body, {
    success: false,
    error: { code: "UNSUPPORTED_REVISION", message: "Revision instruction is not supported" },
    meta: { requestId: "req_revise" },
  });
});

test("revise ignores an unsupported error envelope from another request", async () => {
  const result = await postRevise(clientWithRevise(async () => ({
    success: false,
    error: { code: "AI_UNSUPPORTED_REVISION", message: "Private AI service detail" },
    meta: { requestId: "req_other" },
  })), { currentState: validState, instruction: "Ganti warna" });

  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { data: unknown }).data, validState);
  assert.equal((result.body as { meta: { revisionApplied: boolean } }).meta.revisionApplied, false);
});

test("HTTP AI client sends revise request according to the internal contract", async () => {
  let received: unknown;
  const mutation: RevisionMutation = {
    intent: "UPDATE_THEME",
    changedPaths: ["theme.primaryColor"],
    theme: { primaryColor: "#4A2C20" },
  };
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    received = {
      path: request.url,
      requestId: request.headers["x-request-id"],
      body: JSON.parse(body) as unknown,
    };
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(responseFor(mutation, "req_internal_revise")));
  });
  const baseUrl = await listen(server);

  try {
    const client = new HttpAiServiceClient(baseUrl, 1000);
    await client.revise({
      currentState: validState,
      instruction: "Ganti warna",
      requestId: "req_internal_revise",
    });
    assert.deepEqual(received, {
      path: "/internal/v1/revise",
      requestId: "req_internal_revise",
      body: { currentState: validState, instruction: "Ganti warna", schemaVersion: "1.1" },
    });
  } finally {
    await close(server);
  }
});
