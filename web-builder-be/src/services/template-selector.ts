import type { WebsiteState } from "../types/website-state";

export function selectTemplate(category: string): WebsiteState["templateId"] {
  const normalized = category.toLowerCase();

  if (/f&b|food|beverage|kuliner|makanan|minuman|kafe|cafe|restoran|kopi|coffee/.test(normalized)) {
    return "template-fnb";
  }

  if (/retail|toko|produk|fashion|pakaian|barang/.test(normalized)) {
    return "template-retail";
  }

  return "template-services";
}
