import { describe, expect, it } from "vitest";
import { escapeHtml, wrapDocument } from "./html";
import { iconGlyph } from "./icons";
import { instagramUrl, whatsappAction, whatsappUrl } from "./links";
import { contrastText, fontStack, safeColor } from "./theme";

describe("escapeHtml", () => {
  it("escapes characters that would break HTML", () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'>`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;",
    );
  });
});

describe("wrapDocument", () => {
  it("builds a self-contained Indonesian HTML document", () => {
    const html = wrapDocument("Kopi", "body{margin:0}", "<p>Halo</p>");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('lang="id"');
    expect(html).toContain("<title>Kopi</title>");
    expect(html).toContain(".whatsapp-unavailable{opacity:.55;cursor:not-allowed}");
    expect(html).toContain("body{margin:0}</style>");
    expect(html).toContain("<p>Halo</p>");
    expect(html).not.toContain("<script");
  });
});

describe("safeColor", () => {
  it("keeps valid hex colors and falls back otherwise", () => {
    expect(safeColor("#7B3F00", "#111111")).toBe("#7B3F00");
    expect(safeColor("navy", "#111111")).toBe("#111111");
    expect(safeColor("#fff", "#111111")).toBe("#111111");
  });
});

describe("contrastText", () => {
  it("selects readable text for extreme theme backgrounds", () => {
    expect(contrastText("#FFFFFF")).toBe("#000");
    expect(contrastText("#000000")).toBe("#fff");
  });
});

describe("fontStack", () => {
  it("maps contract font tokens to CSS stacks", () => {
    expect(fontStack("serif")).toContain("Georgia");
    expect(fontStack("display")).toContain("Trebuchet");
    expect(fontStack("sans")).toContain("Verdana");
  });
});

describe("whatsappUrl", () => {
  it("builds an encoded wa.me URL from number and message", () => {
    expect(whatsappUrl("628123456789", "Halo, saya mau pesan kopi")).toBe(
      "https://wa.me/628123456789?text=Halo%2C%20saya%20mau%20pesan%20kopi",
    );
  });
});

describe("whatsappAction", () => {
  it("escapes labels and renders an inert element without a number", () => {
    const html = whatsappAction(null, "Halo", '<script>alert(1)</script>', "nav-cta");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("https://wa.me/");
  });
});

describe("instagramUrl", () => {
  it("strips a leading at-sign from the handle", () => {
    expect(instagramUrl("@warungkopisejahtera")).toBe(
      "https://instagram.com/warungkopisejahtera",
    );
  });
});

describe("iconGlyph", () => {
  it("maps known keywords and falls back to a neutral mark", () => {
    expect(iconGlyph("coffee")).toBe("☕");
    expect(iconGlyph("unknown")).toBe("✦");
    expect(iconGlyph(undefined)).toBe("✦");
  });
});
