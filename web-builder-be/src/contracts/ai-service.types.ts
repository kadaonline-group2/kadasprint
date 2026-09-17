import type { WebsiteState } from "../types/website-state";

export interface InternalAiSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    attempts: number;
    isFallback: boolean;
    latencyMs: number;
  };
}

export interface InternalAiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: { requestId: string };
}

export interface AiServiceClient {
  health(input: { requestId: string }): Promise<unknown>;

  generate(input: {
    businessDescription: string;
    requestId: string;
  }): Promise<unknown>;

  revise(input: {
    currentState: WebsiteState;
    instruction: string;
    requestId: string;
  }): Promise<unknown>;
}
