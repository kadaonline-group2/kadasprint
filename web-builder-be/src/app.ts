import cors from "cors";
import express from "express";
import type { AiServiceClient } from "./contracts/ai-service.types";
import { HttpAiServiceClient } from "./clients/http-ai-service.client";
import { frontendOrigin, getAiServiceConfig } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { createGenerateRouter } from "./routes/generate.routes";
import { exportRouter } from "./routes/export.routes";
import { createHealthRouter } from "./routes/health.routes";
import { createReviseRouter } from "./routes/revise.routes";
import { WebsiteOrchestrator } from "./services/website-orchestrator.service";

function createDefaultAiServiceClient(): AiServiceClient {
  const config = getAiServiceConfig();
  return new HttpAiServiceClient(config.baseUrl, config.timeoutMs, config.token);
}

export function createApp(aiServiceClient?: AiServiceClient): express.Express {
  const app = express();
  const client = aiServiceClient ?? createDefaultAiServiceClient();
  const orchestrator = new WebsiteOrchestrator(client);

  app.use(requestIdMiddleware);
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json());
  app.use("/api/v1", createHealthRouter(client));
  app.use("/api/v1", createGenerateRouter(orchestrator));
  app.use("/api/v1", createReviseRouter(orchestrator));
  app.use("/api/v1", exportRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

export default app;
