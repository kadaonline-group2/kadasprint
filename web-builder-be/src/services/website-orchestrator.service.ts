import { AiServiceHttpError } from "../clients/http-ai-service.client";
import type { AiServiceClient } from "../contracts/ai-service.types";
import { ApiError } from "../errors/api-error";
import type { WebsiteState } from "../types/website-state";
import { validateWebsiteState } from "../validators/website-state.validator";
import { applyRevisionMutation } from "./revision.service";
import { selectTemplate } from "./template-selector";
import { normalizeWhatsappNumber } from "./whatsapp";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readGenerationResponse(value: unknown, requestId: string): {
  websiteState: unknown;
  isFallback: boolean;
} | null {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data) ||
    !isRecord(value.meta) || value.meta.requestId !== requestId ||
    typeof value.meta.isFallback !== "boolean" ||
    typeof value.meta.attempts !== "number" ||
    !Number.isInteger(value.meta.attempts) || value.meta.attempts < 1 ||
    typeof value.meta.latencyMs !== "number" ||
    !Number.isFinite(value.meta.latencyMs) || value.meta.latencyMs < 0) {
    return null;
  }

  return { websiteState: value.data.websiteState, isFallback: value.meta.isFallback };
}

function readRevisionResponse(value: unknown, requestId: string): unknown | null {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data) ||
    !isRecord(value.meta) || value.meta.requestId !== requestId ||
    value.meta.isFallback !== false ||
    typeof value.meta.attempts !== "number" ||
    !Number.isInteger(value.meta.attempts) || value.meta.attempts < 1 ||
    typeof value.meta.latencyMs !== "number" ||
    !Number.isFinite(value.meta.latencyMs) || value.meta.latencyMs < 0 ||
    !("mutation" in value.data)) {
    return null;
  }

  return value.data.mutation;
}

function internalErrorCode(value: unknown, requestId: string): string | null {
  return isRecord(value) && value.success === false && isRecord(value.error) &&
    typeof value.error.code === "string" && typeof value.error.message === "string" &&
    isRecord(value.meta) &&
    value.meta.requestId === requestId
    ? value.error.code
    : null;
}

function normalizeAndValidateState(value: unknown): WebsiteState | null {
  if (!isRecord(value) || !isRecord(value.contact) ||
    (value.contact.whatsappNumber !== null && typeof value.contact.whatsappNumber !== "string") ||
    !isRecord(value.meta) || typeof value.meta.category !== "string") {
    return null;
  }

  const whatsappNumber = value.contact.whatsappNumber === null
    ? null
    : normalizeWhatsappNumber(value.contact.whatsappNumber);
  if (value.contact.whatsappNumber !== null && !whatsappNumber) {
    return null;
  }

  const state = {
    ...value,
    contact: { ...value.contact, whatsappNumber },
    templateId: selectTemplate(value.meta.category),
  };

  return validateWebsiteState(state) ? state : null;
}

export class WebsiteOrchestrator {
  constructor(private readonly aiServiceClient: AiServiceClient) {}

  async generate(businessDescription: string, requestId: string): Promise<{
    websiteState: WebsiteState;
    isFallback: boolean;
  }> {
    let response: unknown;
    try {
      response = await this.aiServiceClient.generate({ businessDescription, requestId });
    } catch (error) {
      if (error instanceof AiServiceHttpError && error.status === 429 &&
        internalErrorCode(error.body, requestId) === "AI_RATE_LIMITED") {
        throw new ApiError(429, "RATE_LIMITED", "AI service rate limit reached");
      }
      if (error instanceof AiServiceHttpError && error.status === 400 &&
        internalErrorCode(error.body, requestId) === "AI_INVALID_REQUEST") {
        throw new ApiError(500, "INTERNAL_ERROR", "Internal server error");
      }
      throw new ApiError(502, "LLM_UNAVAILABLE", "Website generation is unavailable");
    }

    if (internalErrorCode(response, requestId) === "AI_RATE_LIMITED") {
      throw new ApiError(429, "RATE_LIMITED", "AI service rate limit reached");
    }

    const parsed = readGenerationResponse(response, requestId);
    const websiteState = parsed && normalizeAndValidateState(parsed.websiteState);

    if (!parsed || !websiteState) {
      throw new ApiError(502, "LLM_UNAVAILABLE", "Website generation is unavailable");
    }

    return { websiteState, isFallback: parsed.isFallback };
  }

  async revise(currentState: WebsiteState, instruction: string, requestId: string): Promise<{
    websiteState: WebsiteState;
    isFallback: boolean;
    revisionApplied: boolean;
    changedPaths: string[];
    fallbackReason?: "REVISION_FAILED";
  }> {
    let response: unknown;
    try {
      response = await this.aiServiceClient.revise({ currentState, instruction, requestId });
    } catch (error) {
      if (error instanceof AiServiceHttpError && error.status === 422 &&
        internalErrorCode(error.body, requestId) === "AI_UNSUPPORTED_REVISION") {
        throw new ApiError(422, "UNSUPPORTED_REVISION", "Revision instruction is not supported");
      }
      if (error instanceof AiServiceHttpError && error.status === 400 &&
        internalErrorCode(error.body, requestId) === "AI_INVALID_REQUEST") {
        throw new ApiError(500, "INTERNAL_ERROR", "Internal server error");
      }
      return this.revisionFallback(currentState);
    }

    const errorCode = internalErrorCode(response, requestId);
    if (errorCode === "AI_UNSUPPORTED_REVISION") {
      throw new ApiError(422, "UNSUPPORTED_REVISION", "Revision instruction is not supported");
    }
    if (errorCode !== null) {
      return this.revisionFallback(currentState);
    }

    const mutation = readRevisionResponse(response, requestId);
    const result = mutation === null ? null : applyRevisionMutation(currentState, mutation);
    if (!result) {
      return this.revisionFallback(currentState);
    }

    return {
      websiteState: result.websiteState,
      isFallback: false,
      revisionApplied: true,
      changedPaths: result.changedPaths,
    };
  }

  private revisionFallback(currentState: WebsiteState): {
    websiteState: WebsiteState;
    isFallback: true;
    revisionApplied: false;
    changedPaths: [];
    fallbackReason: "REVISION_FAILED";
  } {
    return {
      websiteState: structuredClone(currentState),
      isFallback: true,
      revisionApplied: false,
      changedPaths: [],
      fallbackReason: "REVISION_FAILED",
    };
  }
}
