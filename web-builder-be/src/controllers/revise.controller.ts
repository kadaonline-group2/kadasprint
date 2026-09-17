import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import type { WebsiteOrchestrator } from "../services/website-orchestrator.service";
import { parseReviseRequest } from "../validators/request.validator";
import { validateWebsiteState } from "../validators/website-state.validator";

export function createReviseController(orchestrator: WebsiteOrchestrator): RequestHandler {
  return async (request, response) => {
    const input = parseReviseRequest(request.body);
    if (!input) {
      throw new ApiError(400, "INVALID_REQUEST", "Current state and revision instruction are required");
    }
    if (!validateWebsiteState(input.currentState)) {
      throw new ApiError(400, "INVALID_WEBSITE_STATE", "Current website state is invalid");
    }

    const startedAt = performance.now();
    const requestId = response.locals.requestId as string;
    const result = await orchestrator.revise(input.currentState, input.instruction, requestId);

    response.json({
      success: true,
      data: result.websiteState,
      meta: {
        requestId,
        isFallback: result.isFallback,
        revisionApplied: result.revisionApplied,
        changedPaths: result.changedPaths,
        ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
        latencyMs: Math.round(performance.now() - startedAt),
      },
    });
  };
}
