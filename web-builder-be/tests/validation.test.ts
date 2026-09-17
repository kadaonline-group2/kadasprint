import assert from "node:assert/strict";
import { test } from "node:test";
import { MockAiServiceClient } from "../src/clients/mock-ai-service.client";
import type { WebsiteState } from "../src/types/website-state";
import { parseGenerateRequest, parseInstruction } from "../src/validators/request.validator";
import { validateRevisionMutation } from "../src/validators/revision-mutation.validator";
import { validateWebsiteState } from "../src/validators/website-state.validator";
import { validMutation, validState } from "./fixtures/website-state";

test("WebsiteState accepts a complete state", () => {
  assert.equal(validateWebsiteState(validState), true);
});

test("WebsiteState rejects missing required fields and unknown fields", () => {
  const missingHero: Partial<WebsiteState> = structuredClone(validState);
  delete missingHero.hero;
  assert.equal(validateWebsiteState(missingHero), false);

  const extraField = { ...validState, unexpected: true };
  assert.equal(validateWebsiteState(extraField), false);
});

test("WebsiteState rejects malformed colors", () => {
  const state = structuredClone(validState);
  state.theme.primaryColor = "brown";
  assert.equal(validateWebsiteState(state), false);
});

test("WebsiteState requires at least three services and two testimonials", () => {
  const state = structuredClone(validState);
  state.services.pop();
  assert.equal(validateWebsiteState(state), false);

  state.services = structuredClone(validState.services);
  state.testimonials.pop();
  assert.equal(validateWebsiteState(state), false);
});

test("WebsiteState rejects a non-normalized WhatsApp number", () => {
  const state = structuredClone(validState);
  state.contact.whatsappNumber = "08123456789";
  assert.equal(validateWebsiteState(state), false);
});

test("WebsiteState accepts null but rejects placeholder WhatsApp numbers", () => {
  const state = structuredClone(validState);
  state.contact.whatsappNumber = null;
  assert.equal(validateWebsiteState(state), true);
  state.contact.whatsappNumber = "628xxxxxxxxxx";
  assert.equal(validateWebsiteState(state), false);
});

test("RevisionMutation validates intent-specific payloads and paths", () => {
  assert.equal(validateRevisionMutation(validMutation), true);
  assert.equal(validateRevisionMutation({
    intent: "ADD_SERVICE",
    changedPaths: ["services"],
    services: { append: [{ name: "Teh Hangat", description: "Teh segar", priceEstimate: "Rp8.000" }] },
  }), true);
  assert.equal(validateRevisionMutation({ intent: "UPDATE_THEME", changedPaths: ["theme.primaryColor"] }), false);
  assert.equal(validateRevisionMutation({ intent: "ADD_SERVICE", changedPaths: ["services"] }), false);
  assert.equal(validateRevisionMutation({ ...validMutation, changedPaths: ["testimonials"] }), false);
  assert.equal(validateRevisionMutation({ ...validMutation, theme: { primaryColor: "red" } }), false);
  assert.equal(validateRevisionMutation({ ...validMutation, unexpected: true }), false);
});

test("request parsing trims valid input and rejects invalid lengths", () => {
  assert.deepEqual(parseGenerateRequest({ businessDescription: "  Warung kopi Surabaya  " }), {
    businessDescription: "Warung kopi Surabaya",
  });
  assert.equal(parseGenerateRequest({ businessDescription: "short" }), null);
  assert.equal(parseGenerateRequest({ businessDescription: "a".repeat(4001) }), null);
  assert.equal(parseGenerateRequest({ businessDescription: 123 }), null);
  assert.equal(parseGenerateRequest(null), null);
  assert.equal(parseInstruction("  Ganti warna  "), "Ganti warna");
  assert.equal(parseInstruction("   "), null);
});

test("mock AI service returns valid internal envelopes without network calls", async () => {
  const client = new MockAiServiceClient(validState, validMutation);
  const generated = await client.generate({ businessDescription: "Warung kopi Surabaya", requestId: "req_generate" });
  const revised = await client.revise({
    currentState: validState,
    instruction: "Ganti warna",
    requestId: "req_revise",
  });

  assert.deepEqual(generated, {
    success: true,
    data: { websiteState: validState },
    meta: { requestId: "req_generate", attempts: 1, isFallback: false, latencyMs: 0 },
  });
  assert.deepEqual(revised, {
    success: true,
    data: { mutation: validMutation },
    meta: { requestId: "req_revise", attempts: 1, isFallback: false, latencyMs: 0 },
  });
});
