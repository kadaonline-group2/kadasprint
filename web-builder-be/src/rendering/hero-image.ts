import { escapeHtml } from "./html";

const safeImageDataUrl = /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/;

export function renderHeroImage(dataUrl: string | undefined, businessName: string): string {
  if (!dataUrl || !safeImageDataUrl.test(dataUrl)) return "";
  return `<img class="hero-upload" src="${dataUrl}" alt="Foto utama ${escapeHtml(businessName)}">`;
}
