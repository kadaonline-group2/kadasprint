import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import type { WebsiteOrchestrator } from "../services/website-orchestrator.service";
import { parseGenerateRequest } from "../validators/request.validator";

export function createGenerateController(orchestrator: WebsiteOrchestrator): RequestHandler {
  return async (request, response) => {
    const input = parseGenerateRequest(request.body);
    if (!input) {
      throw new ApiError(400, "INVALID_REQUEST", "Business description must be 10 to 4000 characters");
    }

    const startedAt = performance.now();
    const requestId = response.locals.requestId as string;
    const result = await orchestrator.generate(input.businessDescription, requestId);

    response.json({
      success: true,
      data: result.websiteState,
      meta: {
        requestId,
        isFallback: result.isFallback,
        latencyMs: Math.round(performance.now() - startedAt),
      },
    });
  };
}
