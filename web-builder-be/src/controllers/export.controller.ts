import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { buildWebsiteZip } from "../services/export-zip.service";
import { parseExportRequest } from "../validators/request.validator";
import { validateWebsiteState } from "../validators/website-state.validator";

export const exportController: RequestHandler = async (request, response) => {
  const input = parseExportRequest(request.body);
  if (!input) {
    throw new ApiError(400, "INVALID_REQUEST", "Current state is required");
  }
  if (!validateWebsiteState(input.currentState)) {
    throw new ApiError(400, "INVALID_WEBSITE_STATE", "Current website state is invalid");
  }

  const zip = await buildWebsiteZip(input.currentState);
  response.setHeader("Content-Type", "application/zip");
  response.setHeader("Content-Disposition", 'attachment; filename="website-umkm.zip"');
  response.setHeader("Cache-Control", "no-store");
  response.send(zip);
};
