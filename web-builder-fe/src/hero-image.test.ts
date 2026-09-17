import { describe, expect, it, vi } from "vitest";
import { hasValidImageSignature, processHeroImage } from "./hero-image";

describe("hero image validation", () => {
  it("accepts only supported image signatures matching their MIME type", () => {
    expect(hasValidImageSignature(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg")).toBe(true);
    expect(hasValidImageSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png")).toBe(true);
    expect(hasValidImageSignature(new TextEncoder().encode("RIFF0000WEBP"), "image/webp")).toBe(true);
    expect(hasValidImageSignature(new TextEncoder().encode("<svg>"), "image/svg+xml")).toBe(false);
    expect(hasValidImageSignature(new TextEncoder().encode("<svg>"), "image/png")).toBe(false);
  });

  it("rejects empty and oversized files before decoding", async () => {
    const empty = { size: 0, type: "image/png" } as File;
    const oversized = { size: 5 * 1024 * 1024 + 1, type: "image/png" } as File;
    await expect(processHeroImage(empty)).rejects.toThrow("maksimal 5 MB");
    await expect(processHeroImage(oversized)).rejects.toThrow("maksimal 5 MB");
  });

  it("rejects disguised non-image bytes", async () => {
    const file = {
      size: 5,
      type: "image/png",
      arrayBuffer: async () => new TextEncoder().encode("hello").buffer,
    } as File;
    await expect(processHeroImage(file)).rejects.toThrow("gambar JPG, PNG, atau WebP yang valid");
  });

  it("re-encodes a valid image as a small WebP data URL", async () => {
    const drawImage = vi.fn();
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      { drawImage } as unknown as CanvasRenderingContext2D,
    );
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }));
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:hero-test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    class TestImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", TestImage);

    try {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
      const file = new File([bytes], "usaha.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
      const result = await processHeroImage(file);
      expect(result.name).toBe("usaha.jpg");
      expect(result.dataUrl).toBe("data:image/webp;base64,AQID");
      expect(drawImage).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:hero-test");
    } finally {
      vi.unstubAllGlobals();
      getContext.mockRestore();
      toBlob.mockRestore();
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    }
  });
});
