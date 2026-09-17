import type { TemplateId, WebsiteState } from "../types";

export const templatePalettes = {
  "template-services": {
    className: "template-services",
    label: "Jasa",
    primaryColor: "#176B66",
    accentColor: "#E0A458",
    paperColor: "#F4F1EB",
    inkColor: "#20221F",
    mutedColor: "#62645E",
  },
  "template-fnb": {
    className: "template-fnb",
    label: "F&B",
    primaryColor: "#4C2E22",
    accentColor: "#B7653C",
    paperColor: "#F4EFE7",
    inkColor: "#2E241D",
    mutedColor: "#76675C",
  },
  "template-retail": {
    className: "template-retail",
    label: "Retail",
    primaryColor: "#171716",
    accentColor: "#D6F43B",
    paperColor: "#F4F0E8",
    inkColor: "#171716",
    mutedColor: "#716F68",
  },
} as const;

export const safeColor = (value: string, fallback: string): string =>
  /^#[0-9A-F]{6}$/i.test(value) ? value : fallback;

export function contrastText(hexColor: string): "#000" | "#fff" {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hexColor.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#000" : "#fff";
}

export function fontStack(fontFamily: WebsiteState["theme"]["fontFamily"]): string {
  if (fontFamily === "serif") return "Georgia, 'Times New Roman', serif";
  if (fontFamily === "display") return "'Trebuchet MS', 'Segoe UI', sans-serif";
  return "Verdana, 'Segoe UI', sans-serif";
}

export function resolveTheme(state: WebsiteState) {
  const palette =
    templatePalettes[state.templateId] ?? templatePalettes["template-services"];
  return {
    primary: safeColor(state.theme.primaryColor, palette.primaryColor),
    accent: safeColor(state.theme.accentColor, palette.accentColor),
    paper: palette.paperColor,
    ink: palette.inkColor,
    muted: palette.mutedColor,
    font: fontStack(state.theme.fontFamily),
    palette,
  };
}

export function rootCss(state: WebsiteState): string {
  const theme = resolveTheme(state);
  return `:root{--primary:${theme.primary};--accent:${theme.accent};--on-primary:${contrastText(theme.primary)};--on-accent:${contrastText(theme.accent)};--paper:${theme.paper};--ink:${theme.ink};--muted:${theme.muted};--font:${theme.font}}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);line-height:1.6}a{color:inherit}img{max-width:100%}@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}`;
}

export function paletteFor(templateId: TemplateId) {
  return templatePalettes[templateId] ?? templatePalettes["template-services"];
}
