/**
 * MapLibre GL JS v6 loads its web worker at runtime relative to the library
 * module URL, which bundlers rewrite. We serve the version-matched worker from
 * /public and point `setWorkerUrl()` at it (see components/control-tower/live-map.tsx).
 *
 * Runs on postinstall / predev / prebuild so the copy always matches the
 * installed maplibre-gl version. Output is git-ignored.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
  const packageDir = dirname(require.resolve("maplibre-gl/package.json"));
  const { version } = require("maplibre-gl/package.json");
  const target = join(process.cwd(), "public", "vendor", "maplibre-gl");
  mkdirSync(target, { recursive: true });
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    copyFileSync(join(packageDir, "dist", file), join(target, file));
  }
  console.log(`[maplibre] worker ${version} copied to public/vendor/maplibre-gl`);
} catch (error) {
  console.warn("[maplibre] could not copy worker files:", error instanceof Error ? error.message : error);
}
