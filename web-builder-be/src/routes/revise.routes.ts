import { Router } from "express";
import { createReviseController } from "../controllers/revise.controller";
import type { WebsiteOrchestrator } from "../services/website-orchestrator.service";

export function createReviseRouter(orchestrator: WebsiteOrchestrator): Router {
  const router = Router();
  router.post("/revise", createReviseController(orchestrator));
  return router;
}
