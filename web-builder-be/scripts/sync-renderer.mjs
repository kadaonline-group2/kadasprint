import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendSource = resolve(scriptDir, "../../web-builder-fe/src");
const backendSource = resolve(scriptDir, "../src");
const files = [
  "renderer.ts",
  "rendering/hero-image.ts",
  "rendering/html.ts",
  "rendering/icons.ts",
  "rendering/links.ts",
  "rendering/theme.ts",
  "rendering/template-fnb.ts",
  "rendering/template-retail.ts",
  "rendering/template-services.ts",
];
const mode = process.argv[2];

if (!["--check", "--sync"].includes(mode)) {
  throw new Error("Use --check or --sync");
}

const mismatches = [];
for (const file of files) {
  const source = resolve(frontendSource, file);
  const target = resolve(backendSource, file);
  if (!existsSync(source)) {
    throw new Error(`Frontend renderer source is missing: ${file}`);
  }
  if (mode === "--sync") {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  } else if (!existsSync(target) || !readFileSync(source).equals(readFileSync(target))) {
    mismatches.push(file);
  }
}

if (mismatches.length) {
  throw new Error(`Renderer mirror is out of sync: ${mismatches.join(", ")}. Run npm run renderer:sync.`);
}
process.stdout.write(mode === "--sync" ? "Renderer mirror synchronized.\n" : "Renderer sources match.\n");
