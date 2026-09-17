import { Router } from "express";
import type { AiServiceClient } from "../contracts/ai-service.types";
import { createHealthController } from "../controllers/health.controller";

export function createHealthRouter(client: AiServiceClient): Router {
  const router = Router();
  router.get("/health", createHealthController(client));
  return router;
}
