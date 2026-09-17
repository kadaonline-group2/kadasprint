import type { AiServiceClient } from "../contracts/ai-service.types";
import type { WebsiteState } from "../types/website-state";

export class AiServiceHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super("AI service returned an error");
  }
}

export class HttpAiServiceClient implements AiServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly token?: string,
  ) {}

  health(input: { requestId: string }): Promise<unknown> {
    return this.request("GET", "/internal/v1/health", input.requestId);
  }

  generate(input: { businessDescription: string; requestId: string }): Promise<unknown> {
    return this.post("/internal/v1/generate", {
      businessDescription: input.businessDescription,
      schemaVersion: "1.1",
    }, input.requestId);
  }

  revise(input: {
    currentState: WebsiteState;
    instruction: string;
    requestId: string;
  }): Promise<unknown> {
    return this.post("/internal/v1/revise", {
      currentState: input.currentState,
      instruction: input.instruction,
      schemaVersion: "1.1",
    }, input.requestId);
  }

  private async post(path: string, body: object, requestId: string): Promise<unknown> {
    return this.request("POST", path, requestId, body);
  }

  private async request(method: "GET" | "POST", path: string, requestId: string, body?: object): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Request-Id": requestId,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(new URL(path, this.baseUrl), {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    let payload: unknown;
    try {
      payload = await response.json() as unknown;
    } catch {
      throw new AiServiceHttpError(response.status, null);
    }

    if (!response.ok) {
      throw new AiServiceHttpError(response.status, payload);
    }

    return payload;
  }
}
