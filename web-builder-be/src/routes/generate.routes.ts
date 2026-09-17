import { Router } from "express";
import { createGenerateController } from "../controllers/generate.controller";
import type { WebsiteOrchestrator } from "../services/website-orchestrator.service";

export function createGenerateRouter(orchestrator: WebsiteOrchestrator): Router {
  const router = Router();
  router.post("/generate", createGenerateController(orchestrator));
  return router;
}
