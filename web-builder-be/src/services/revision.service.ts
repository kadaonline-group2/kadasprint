import type { RevisionMutation } from "../types/revision-mutation";
import type { WebsiteState } from "../types/website-state";
import { validateRevisionMutation } from "../validators/revision-mutation.validator";
import { validateWebsiteState } from "../validators/website-state.validator";
import { normalizeWhatsappNumber } from "./whatsapp";

const fieldsByIntent = {
  UPDATE_THEME: { theme: ["primaryColor", "accentColor", "fontFamily"] },
  UPDATE_COPY: {
    meta: ["businessName", "category", "tagline"],
    hero: ["title", "subtitle", "ctaText", "ctaWhatsappMessage"],
    about: ["story", "highlights"],
  },
  ADD_SERVICE: { services: ["append"] },
  UPDATE_CONTACT: { contact: ["whatsappNumber", "address", "instagram"] },
} as const;

function mutationPaths(mutation: RevisionMutation): string[] | null {
  const allowed = fieldsByIntent[mutation.intent] as Record<string, readonly string[]>;
  const paths: string[] = [];

  for (const [section, fields] of Object.entries(allowed)) {
    const payload = mutation[section as keyof RevisionMutation];
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) continue;

    for (const field of Object.keys(payload)) {
      if (!fields.includes(field)) return null;
      paths.push(mutation.intent === "ADD_SERVICE" ? "services" : `${section}.${field}`);
    }
  }

  const payloadSections = ["theme", "meta", "hero", "about", "services", "contact"]
    .filter((section) => mutation[section as keyof RevisionMutation] !== undefined);
  if (payloadSections.some((section) => !(section in allowed))) return null;

  return [...new Set(paths)].sort();
}

function changedPathsMatch(mutation: RevisionMutation): boolean {
  const paths = mutationPaths(mutation);
  const declared = [...new Set(mutation.changedPaths)].sort();
  if (mutation.intent === "ADD_SERVICE" && paths?.length === 1 && paths[0] === "services") {
    return declared.length === 1 && ["services", "services.append"].includes(declared[0]);
  }
  return paths !== null && paths.length > 0 &&
    paths.length === declared.length && paths.every((path, index) => path === declared[index]);
}

export function applyRevisionMutation(
  currentState: WebsiteState,
  mutationValue: unknown,
): { websiteState: WebsiteState; changedPaths: string[] } | null {
  if (!validateRevisionMutation(mutationValue) || !changedPathsMatch(mutationValue)) {
    return null;
  }

  const mutation = mutationValue;
  const websiteState = structuredClone(currentState);

  if (mutation.intent === "UPDATE_THEME" && mutation.theme) {
    Object.assign(websiteState.theme, mutation.theme);
  } else if (mutation.intent === "UPDATE_COPY") {
    if (mutation.meta) Object.assign(websiteState.meta, mutation.meta);
    if (mutation.hero) Object.assign(websiteState.hero, mutation.hero);
    if (mutation.about) Object.assign(websiteState.about, mutation.about);
  } else if (mutation.intent === "ADD_SERVICE" && mutation.services?.append.length === 1) {
    websiteState.services.push(structuredClone(mutation.services.append[0]));
  } else if (mutation.intent === "UPDATE_CONTACT" && mutation.contact) {
    Object.assign(websiteState.contact, mutation.contact);
    if (mutation.contact.whatsappNumber !== undefined) {
      if (mutation.contact.whatsappNumber === null) {
        websiteState.contact.whatsappNumber = null;
      } else {
        const normalized = normalizeWhatsappNumber(mutation.contact.whatsappNumber);
        if (!normalized) return null;
        websiteState.contact.whatsappNumber = normalized;
      }
    }
  } else {
    return null;
  }

  return validateWebsiteState(websiteState)
    ? { websiteState, changedPaths: [...mutation.changedPaths] }
    : null;
}
