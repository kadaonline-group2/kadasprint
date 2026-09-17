export async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard tidak tersedia.");
  }
  await navigator.clipboard.writeText(value);
}
