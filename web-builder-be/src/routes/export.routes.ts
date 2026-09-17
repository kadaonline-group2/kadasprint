import { Router } from "express";
import { exportController } from "../controllers/export.controller";

export const exportRouter = Router();
exportRouter.post("/export", exportController);
