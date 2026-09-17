const icons: Record<string, string> = {
  coffee: "☕",
  bread: "🍞",
  milk: "🥛",
  food: "🍽️",
  shop: "🛍️",
  bag: "👜",
  wrench: "🔧",
  star: "★",
};

export function iconGlyph(keyword?: string): string {
  if (!keyword) return "✦";
  return icons[keyword.toLowerCase()] ?? "✦";
}
