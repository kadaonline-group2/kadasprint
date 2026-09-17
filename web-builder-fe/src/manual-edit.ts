import type { WebsiteState } from "./types";

type ServiceField = "name" | "description" | "priceEstimate";

export type ManualEdit =
  | { field: "businessName" | "heroTitle" | "heroSubtitle" | "primaryColor"; value: string }
  | { field: "service"; index: number; serviceField: ServiceField; value: string };

export function applyManualEdit(state: WebsiteState, edit: ManualEdit): WebsiteState {
  if (edit.field === "businessName") {
    return { ...state, meta: { ...state.meta, businessName: edit.value } };
  }
  if (edit.field === "heroTitle") {
    return { ...state, hero: { ...state.hero, title: edit.value } };
  }
  if (edit.field === "heroSubtitle") {
    return { ...state, hero: { ...state.hero, subtitle: edit.value } };
  }
  if (edit.field === "primaryColor") {
    if (!/^#[0-9a-f]{6}$/i.test(edit.value)) return state;
    return { ...state, theme: { ...state.theme, primaryColor: edit.value } };
  }
  if (edit.field !== "service") return state;
  if (edit.index < 0 || edit.index >= state.services.length) return state;
  return {
    ...state,
    services: state.services.map((service, index) =>
      index === edit.index ? { ...service, [edit.serviceField]: edit.value } : service,
    ),
  };
}

export function areManualFieldsValid(state: WebsiteState): boolean {
  return [
    state.meta.businessName,
    state.hero.title,
    state.hero.subtitle,
    ...state.services.flatMap((service) => [
      service.name,
      service.description,
      service.priceEstimate,
    ]),
  ].every((value) => value.trim().length > 0);
}
