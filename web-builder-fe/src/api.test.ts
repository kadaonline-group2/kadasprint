import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyManualEdit } from "./manual-edit";
import { sampleWebsite } from "./test/fixtures";
import { WebsiteApiError } from "./types";

const fetchImpl = vi.fn();

vi.stubGlobal(
  "URL",
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:website"),
    revokeObjectURL: vi.fn(),
  }),
);

describe("createWebsiteApi", () => {
  beforeEach(() => {
    fetchImpl.mockReset();
    vi.mocked(URL.createObjectURL).mockClear();
    vi.mocked(URL.revokeObjectURL).mockClear();
  });

  it("uses mock generate and revise without calling fetch", async () => {
    const { createWebsiteApi } = await import("./api");
    const api = createWebsiteApi({ mode: "mock", fetchImpl });
    const generated = await api.generate({
      businessDescription:
        "Warung Kopi Sejahtera, jual kopi tubruk dan roti bakar di Surabaya, target anak muda nugas, wa 08123456789",
    });
    expect(generated.state.templateId).toBe("template-fnb");
    expect(generated.state.meta.businessName).toContain("Warung Kopi");
    expect(fetchImpl).not.toHaveBeenCalled();

    const jasa = await api.generate({
      businessDescription:
        "Barbershop Ganteng, jasa potong rambut pria di Bandung, target mahasiswa, wa 08123456789",
    });
    expect(jasa.state.templateId).toBe("template-services");

    const revised = await api.revise({
      currentState: generated.state,
      instruction: "Ganti nuansa warna jadi cokelat tua klasik",
    });
    expect(revised.state.theme.primaryColor).toBe("#5C3317");
    expect(revised.state.contact.whatsappNumber).toBe(
      generated.state.contact.whatsappNumber,
    );
  });

  it("keeps contact and copy when only colors change, then adds a fourth service", async () => {
    const { createWebsiteApi } = await import("./api");
    const { renderWebsite } = await import("./renderer");
    const api = createWebsiteApi({ mode: "mock", fetchImpl });
    const draft = await api.generate({
      businessDescription:
        "Warung Kopi Sejahtera, jual kopi tubruk dan roti bakar di Surabaya, target anak muda nugas, wa 08123456789",
    });
    expect(draft.state.templateId).toBe("template-fnb");
    expect(draft.state.services).toHaveLength(3);
    const firstHtml = renderWebsite(draft.state);
    expect(firstHtml).toContain("https://wa.me/628123456789");
    expect(firstHtml).toContain("Kopi Tubruk");

    const recolored = await api.revise({
      currentState: draft.state,
      instruction: "Ganti nuansa warna jadi cokelat tua klasik",
    });
    expect(recolored.state.theme.primaryColor).toBe("#5C3317");
    expect(recolored.state.hero).toEqual(draft.state.hero);
    expect(recolored.state.contact).toEqual(draft.state.contact);
    expect(recolored.state.services).toEqual(draft.state.services);

    const expanded = await api.revise({
      currentState: recolored.state,
      instruction: "Tambahkan menu baru: Pisang Goreng Keju harga 15 ribu",
    });
    expect(expanded.state.services).toHaveLength(4);
    expect(expanded.state.contact).toEqual(draft.state.contact);
    const addedHtml = renderWebsite(expanded.state);
    expect(addedHtml).toContain("Pisang Goreng Keju");
    expect(addedHtml).not.toContain("<script");
  });

  it("parses a successful real generate envelope and replaces full state", async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: sampleWebsite,
        meta: {
          requestId: "req_abc",
          isFallback: false,
          latencyMs: 1200,
        },
      }),
    });
    const { createWebsiteApi, apiPaths } = await import("./api");
    const api = createWebsiteApi({ mode: "real", fetchImpl });
    const result = await api.generate({ businessDescription: "Warung kopi" });
    expect(result.state).toEqual(sampleWebsite);
    expect(result.isFallback).toBe(false);
    expect(result.requestId).toBe("req_abc");
    expect(fetchImpl).toHaveBeenCalledWith(
      apiPaths.generate,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("accepts a missing WhatsApp number without treating it as invalid state", async () => {
    const state = structuredClone(sampleWebsite);
    state.contact.whatsappNumber = null;
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: state, meta: { isFallback: false } }),
    });
    const { createWebsiteApi } = await import("./api");
    const api = createWebsiteApi({ mode: "real", fetchImpl });
    const result = await api.generate({ businessDescription: "Warung kopi tanpa nomor WA" });
    expect(result.state.contact.whatsappNumber).toBeNull();
  });

  it("throws WebsiteApiError for backend error envelopes", async () => {
    fetchImpl.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Business description tidak boleh kosong",
        },
      }),
    });
    const { createWebsiteApi } = await import("./api");
    const api = createWebsiteApi({ mode: "real", fetchImpl });
    await expect(
      api.generate({ businessDescription: "   " }),
    ).rejects.toMatchObject({
      name: "WebsiteApiError",
      code: "INVALID_REQUEST",
    } satisfies Partial<WebsiteApiError>);
  });

  it("rejects malformed success payloads", async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { templateId: "nope" } }),
    });
    const { createWebsiteApi } = await import("./api");
    const api = createWebsiteApi({ mode: "real", fetchImpl });
    await expect(
      api.revise({ currentState: sampleWebsite, instruction: "ubah warna" }),
    ).rejects.toBeInstanceOf(WebsiteApiError);
  });

  it("posts currentState to export and downloads a zip in real mode", async () => {
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockImplementation(() => {
      return { click, href: "", download: "" } as unknown as HTMLElement;
    });
    fetchImpl.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["zip-bytes"]),
    });
    const { createWebsiteApi, apiPaths } = await import("./api");
    const api = createWebsiteApi({ mode: "real", fetchImpl });
    await api.download(sampleWebsite);
    expect(fetchImpl).toHaveBeenCalledWith(
      apiPaths.export,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ currentState: sampleWebsite }),
      }),
    );
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:website");
    createElement.mockRestore();
  });

  it("creates an offline ZIP with the applied image without sending it to the backend", async () => {
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockImplementation(() => {
      return { click, href: "", download: "" } as unknown as HTMLElement;
    });
    let downloaded: Blob | undefined;
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => {
      downloaded = blob as Blob;
      return "blob:website";
    });

    try {
      const { createWebsiteApi } = await import("./api");
      const { default: JSZip } = await import("jszip");
      const api = createWebsiteApi({ mode: "real", fetchImpl });
      const editedState = applyManualEdit(
        applyManualEdit(sampleWebsite, { field: "businessName", value: "Kopi Pagi" }),
        { field: "service", index: 0, serviceField: "priceEstimate", value: "Rp17.000" },
      );
      await api.download(editedState, "data:image/webp;base64,AQID");

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(click).toHaveBeenCalledTimes(1);
      expect(downloaded).toBeInstanceOf(Blob);
      const zip = await JSZip.loadAsync(downloaded!);
      const html = await zip.file("index.html")!.async("string");
      expect(html).toContain('src="data:image/webp;base64,AQID"');
      expect(html).toContain("Kopi Pagi");
      expect(html).toContain("Rp17.000");
    } finally {
      createElement.mockRestore();
    }
  });
});
