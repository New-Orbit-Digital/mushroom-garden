// Builds one self-contained page from index.html and the modules, for sharing a playable copy.
// The repo itself needs no build step; this only inlines the same files.
// Usage: node tools/build-single.mjs   writes dist/mushroom-garden.html

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

// Dependency order: a module comes after everything it imports.
const modules = [
  "shared/tuning.js",
  "shared/content.js",
  "src/engine/rng.js",
  "src/engine/conditions.js",
  "src/engine/rules.js",
  "src/engine/query.js",
  "src/engine/engine.js",
  "src/ui/draw.js",
  "src/ui/hud.js",
  "src/ui/main.js",
];

const html = await readFile(join(root, "index.html"), "utf8");
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const page = html.split("<!-- page:start -->")[1].split("<!-- page:end -->")[0];

let script = "";
for (const path of modules) {
  const source = await readFile(join(root, path), "utf8");
  script +=
    "\n// ---- " + path + " ----\n" +
    source.replace(/^import[\s\S]*?from\s+"[^"]+";\n/gm, "").replace(/^export\s+/gm, "");
}

const out = title + "\n" + style + "\n" + page.trim() + "\n<script type=\"module\">" + script + "</script>\n";
await mkdir(join(root, "dist"), { recursive: true });
await writeFile(join(root, "dist", "mushroom-garden.html"), out);
console.log("Wrote dist/mushroom-garden.html (" + out.length + " characters)");
