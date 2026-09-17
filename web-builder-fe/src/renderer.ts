import type { WebsiteState } from "./types";
import { renderFnbTemplate } from "./rendering/template-fnb";
import { renderRetailTemplate } from "./rendering/template-retail";
import { renderServicesTemplate } from "./rendering/template-services";
import { templatePalettes } from "./rendering/theme";

export { templatePalettes };

// Canonical renderer for preview and export. Sync its source into Dev 2 with
// `npm run renderer:sync` from the backend repository after renderer changes.
export function renderWebsite(state: WebsiteState, heroImageDataUrl?: string): string {
  if (state.templateId === "template-fnb") return renderFnbTemplate(state, heroImageDataUrl);
  if (state.templateId === "template-retail") return renderRetailTemplate(state, heroImageDataUrl);
  return renderServicesTemplate(state, heroImageDataUrl);
}
