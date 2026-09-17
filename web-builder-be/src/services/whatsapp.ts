export function normalizeWhatsappNumber(value: string): string | null {
  const compact = value.replace(/[\s()+-]/g, "");
  const number = compact.startsWith("0") ? `62${compact.slice(1)}` : compact;

  return /^62[0-9]{8,13}$/.test(number) ? number : null;
}
