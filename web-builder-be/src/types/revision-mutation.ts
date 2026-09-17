import type { WebsiteState } from "./website-state";

export type RevisionIntent = "UPDATE_THEME" | "UPDATE_COPY" | "ADD_SERVICE" | "UPDATE_CONTACT";

export interface RevisionMutation {
  intent: RevisionIntent;
  changedPaths: string[];
  theme?: Partial<WebsiteState["theme"]>;
  meta?: Partial<WebsiteState["meta"]>;
  hero?: Partial<WebsiteState["hero"]>;
  about?: Partial<WebsiteState["about"]>;
  services?: { append: WebsiteState["services"] };
  contact?: Partial<WebsiteState["contact"]>;
}
