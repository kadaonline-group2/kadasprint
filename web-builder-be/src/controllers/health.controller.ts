import type { RequestHandler } from "express";
import type { AiServiceClient } from "../contracts/ai-service.types";
import { ApiError } from "../errors/api-error";

function isHealthyResponse(value: unknown, requestId: string): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  const data = result.data;
  const meta = result.meta;
  return result.success === true && typeof data === "object" && data !== null &&
    !Array.isArray(data) && (data as Record<string, unknown>).status === "ok" &&
    (data as Record<string, unknown>).service === "ai-website-builder-ai-service" &&
    typeof meta === "object" && meta !== null && !Array.isArray(meta) &&
    (meta as Record<string, unknown>).requestId === requestId;
}

export function createHealthController(client: AiServiceClient): RequestHandler {
  return async (_request, response) => {
    const requestId = response.locals.requestId as string;
    let result: unknown;
    try {
      result = await client.health({ requestId });
    } catch {
      throw new ApiError(502, "LLM_UNAVAILABLE", "AI service is unavailable");
    }
    if (!isHealthyResponse(result, requestId)) {
      throw new ApiError(502, "LLM_UNAVAILABLE", "AI service is unavailable");
    }

    response.json({
      success: true,
      data: { status: "ok", service: "ai-website-builder-backend" },
      meta: { requestId },
    });
  };
}
