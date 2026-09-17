import type { AiServiceClient, InternalAiSuccessResponse } from "../contracts/ai-service.types";
import type { RevisionMutation } from "../types/revision-mutation";
import type { WebsiteState } from "../types/website-state";
import { validateRevisionMutation } from "../validators/revision-mutation.validator";
import { validateWebsiteState } from "../validators/website-state.validator";

export class MockAiServiceClient implements AiServiceClient {
  constructor(
    private readonly websiteState: WebsiteState,
    private readonly mutation: RevisionMutation,
  ) {
    if (!validateWebsiteState(websiteState) || !validateRevisionMutation(mutation)) {
      throw new Error("Mock AI service data must match the project schemas");
    }
  }

  async health(input: { requestId: string }): Promise<unknown> {
    return {
      success: true,
      data: { status: "ok", service: "ai-website-builder-ai-service" },
      meta: { requestId: input.requestId },
    };
  }

  async generate(input: { businessDescription: string; requestId: string }): Promise<unknown> {
    return {
      success: true,
      data: { websiteState: structuredClone(this.websiteState) },
      meta: { requestId: input.requestId, attempts: 1, isFallback: false, latencyMs: 0 },
    } satisfies InternalAiSuccessResponse<{ websiteState: WebsiteState }>;
  }

  async revise(input: {
    currentState: WebsiteState;
    instruction: string;
    requestId: string;
  }): Promise<unknown> {
    return {
      success: true,
      data: { mutation: structuredClone(this.mutation) },
      meta: { requestId: input.requestId, attempts: 1, isFallback: false, latencyMs: 0 },
    } satisfies InternalAiSuccessResponse<{ mutation: RevisionMutation }>;
  }
}
