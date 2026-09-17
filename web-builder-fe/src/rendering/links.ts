import { escapeHtml } from "./html";

export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(message)}`;
}

export function whatsappAction(
  number: string | null,
  message: string,
  label: string,
  className?: string,
  ariaLabel?: string,
): string {
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : "";
  if (number === null) {
    const disabledClass = className ? `${className} whatsapp-unavailable` : "whatsapp-unavailable";
    const disabledLabel = `${ariaLabel ?? label} — nomor WhatsApp belum tersedia`;
    return `<span class="${escapeHtml(disabledClass)}" aria-disabled="true" aria-label="${escapeHtml(disabledLabel)}" title="Nomor WhatsApp belum tersedia">${escapeHtml(label)}</span>`;
  }
  const ariaAttribute = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : "";
  return `<a${classAttribute} href="${whatsappUrl(number, message)}" target="_blank" rel="noopener noreferrer"${ariaAttribute}>${escapeHtml(label)}</a>`;
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${encodeURIComponent(handle.replace(/^@/, ""))}`;
}

export function instagramHandle(handle: string): string {
  return handle.replace(/^@/, "");
}
