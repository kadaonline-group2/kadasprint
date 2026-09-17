import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const validRequestId = /^[A-Za-z0-9_-]{1,128}$/;

export const requestIdMiddleware: RequestHandler = (request, response, next) => {
  const suppliedId = request.header("X-Request-Id");
  const requestId = suppliedId && validRequestId.test(suppliedId)
    ? suppliedId
    : `req_${randomUUID()}`;

  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);
  next();
};
