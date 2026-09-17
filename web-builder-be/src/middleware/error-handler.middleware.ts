import type { ErrorRequestHandler, RequestHandler } from "express";
import { ApiError } from "../errors/api-error";

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    success: false,
    error: { code: "INVALID_REQUEST", message: "Route not found" },
    meta: { requestId: response.locals.requestId as string },
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const invalidJson = error instanceof SyntaxError &&
    typeof error === "object" && error !== null && "body" in error;
  const apiError = error instanceof ApiError ? error : null;

  response.status(apiError?.status ?? (invalidJson ? 400 : 500)).json({
    success: false,
    error: {
      code: apiError?.code ?? (invalidJson ? "INVALID_REQUEST" : "INTERNAL_ERROR"),
      message: apiError?.message ?? (invalidJson ? "Invalid JSON request body" : "Internal server error"),
    },
    meta: { requestId: response.locals.requestId as string },
  });
};
