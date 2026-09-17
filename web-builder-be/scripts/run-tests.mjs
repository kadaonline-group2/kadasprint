import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const testFiles = readdirSync(join(projectRoot, "tests"))
  .filter((file) => file.endsWith(".test.ts"))
  .sort()
  .map((file) => join(projectRoot, "dist", "tests", file.replace(/\.ts$/, ".js")));

if (testFiles.length === 0) {
  throw new Error("No test files found");
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], { stdio: "inherit" });
if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
