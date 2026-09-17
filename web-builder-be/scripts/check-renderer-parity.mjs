import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";
import backendRendererModule from "../dist/src/renderer.js";
import rendererModule from "../dist/src/services/export-renderer.service.js";
import zipModule from "../dist/src/services/export-zip.service.js";
import fixtureModule from "../dist/tests/fixtures/website-state.js";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = resolve(backendRoot, "../web-builder-fe");
const frontendRequire = createRequire(resolve(frontendRoot, "package.json"));
const vitePath = frontendRequire.resolve("vite");
const { createServer } = await import(pathToFileURL(vitePath).href);
const { renderWebsiteHtml } = rendererModule;
const { renderWebsite: renderBackendWebsite } = backendRendererModule;
const { buildWebsiteZip } = zipModule;
const { validState } = fixtureModule;

const vite = await createServer({
  root: frontendRoot,
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { renderWebsite } = await vite.ssrLoadModule("/src/renderer.ts");
  for (const templateId of ["template-services", "template-fnb", "template-retail"]) {
    for (const whatsappNumber of [validState.contact.whatsappNumber, null]) {
      const state = {
        ...validState,
        templateId,
        contact: { ...validState.contact, whatsappNumber },
      };
      const previewHtml = renderWebsite(state);
      assert.equal(renderWebsiteHtml(state), previewHtml, `${templateId} renderer differs`);
      const zip = await JSZip.loadAsync(await buildWebsiteZip(state));
      assert.equal(await zip.file("index.html")?.async("string"), previewHtml, `${templateId} ZIP differs`);
      const uploadedImage = "data:image/webp;base64,AQID";
      assert.equal(
        renderBackendWebsite(state, uploadedImage),
        renderWebsite(state, uploadedImage),
        `${templateId} uploaded-image renderer differs`,
      );
    }
  }
  process.stdout.write("Renderer parity passed with optional hero images; backend ZIP parity passed for every template and WhatsApp state.\n");
} finally {
  await vite.close();
}
