import { describe, expect, it } from "vitest";
import { applyManualEdit, areManualFieldsValid } from "./manual-edit";
import { sampleWebsite } from "./test/fixtures";
import type { WebsiteState } from "./types";

describe("manual website edits", () => {
  it("updates only the selected fields and keeps contact data untouched", () => {
    const original: WebsiteState = {
      ...sampleWebsite,
      contact: { ...sampleWebsite.contact, whatsappNumber: null },
    };
    const edits = [
      { field: "businessName", value: "Kopi Pagi" },
      { field: "heroTitle", value: "Mulai hari dengan kopi" },
      { field: "heroSubtitle", value: "Kopi segar setiap pagi." },
      { field: "service", index: 1, serviceField: "name", value: "Roti Panggang" },
      { field: "service", index: 1, serviceField: "description", value: "Roti hangat untuk sarapan." },
      { field: "service", index: 1, serviceField: "priceEstimate", value: "Rp19.000" },
      { field: "primaryColor", value: "#123456" },
    ] as const;
    const edited = edits.reduce((state, edit) => applyManualEdit(state, edit), original);

    expect(edited.meta.businessName).toBe("Kopi Pagi");
    expect(edited.hero).toEqual({
      ...original.hero,
      title: "Mulai hari dengan kopi",
      subtitle: "Kopi segar setiap pagi.",
    });
    expect(edited.services[1]).toEqual({
      ...original.services[1],
      name: "Roti Panggang",
      description: "Roti hangat untuk sarapan.",
      priceEstimate: "Rp19.000",
    });
    expect(edited.services[0]).toEqual(original.services[0]);
    expect(edited.theme.primaryColor).toBe("#123456");
    expect(edited.contact).toBe(original.contact);
    expect(areManualFieldsValid(edited)).toBe(true);
  });

  it("rejects invalid colors and service indexes", () => {
    expect(applyManualEdit(sampleWebsite, { field: "primaryColor", value: "red" })).toBe(sampleWebsite);
    expect(applyManualEdit(sampleWebsite, { field: "service", index: 99, serviceField: "name", value: "Other" })).toBe(sampleWebsite);
  });

  it("marks an empty required field as incomplete", () => {
    const edited = applyManualEdit(sampleWebsite, { field: "service", index: 0, serviceField: "priceEstimate", value: "  " });
    expect(areManualFieldsValid(edited)).toBe(false);
  });
});
