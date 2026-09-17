export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_WEBSITE_STATE"
  | "UNSUPPORTED_REVISION"
  | "RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}
