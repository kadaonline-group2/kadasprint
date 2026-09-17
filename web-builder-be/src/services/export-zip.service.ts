import JSZip from "jszip";
import type { WebsiteState } from "../types/website-state";
import { renderWebsiteHtml } from "./export-renderer.service";

export async function buildWebsiteZip(state: WebsiteState): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("index.html", renderWebsiteHtml(state), { date: new Date("1980-01-01T00:00:00.000Z") });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
