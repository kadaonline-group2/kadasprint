import Ajv from "ajv";
import websiteStateSchema from "../../schemas/website-state.schema.json";
import type { WebsiteState } from "../types/website-state";

const ajv = new Ajv({ allErrors: true });

export const validateWebsiteState = ajv.compile<WebsiteState>(websiteStateSchema);
