import type { WebsiteState } from "../types/website-state";
import { renderWebsite } from "../renderer";

export function renderWebsiteHtml(state: WebsiteState): string {
  return renderWebsite(state);
}
