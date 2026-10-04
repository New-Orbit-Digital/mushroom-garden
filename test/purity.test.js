import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tuning, content } from "../tools/testkit.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (name.endsWith(".js")) out.push(path);
  }
  return out;
}

// Code with comments and string contents removed, so only real code is checked.
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/ .*$/gm, "")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, "\"\"")
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

test("src/engine is pure: nothing from src/ui, no DOM, no clock, no global randomness", () => {
  const files = filesUnder(join(root, "src", "engine"));
  assert.ok(files.length >= 4);
  const banned = [
    /\bdocument\b/, /\bwindow\b/, /\bcanvas\b/i, /\bnavigator\b/, /\blocalStorage\b/,
    /Date\.now/, /new Date/, /\bperformance\b/, /Math\.random/, /requestAnimationFrame/, /setTimeout|setInterval/,
  ];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const imports = [...raw.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    for (const path of imports) {
      assert.ok(path.startsWith("./"), file + " imports " + path + "; the engine may only import its own files");
    }
    const code = codeOnly(raw);
    for (const pattern of banned) assert.equal(pattern.test(code), false, file + " uses " + pattern);
  }
});

test("no numbers hard-coded in src/: only 0, 1 and 2 appear as literals", () => {
  // 0, 1 and 2 are structural (start a count, step by one, halve to find a centre), not tunable values.
  const allowed = new Set(["0", "1", "2"]);
  const found = [];
  for (const file of filesUnder(join(root, "src"))) {
    const code = codeOnly(readFileSync(file, "utf8"));
    for (const match of code.matchAll(/(?<![\w$.])(\d+\.?\d*|\.\d+)(?![\w$])/g)) {
      if (!allowed.has(match[1])) found.push(file.slice(root.length) + ": " + match[1]);
    }
  }
  assert.deepEqual(found, []);
});

test("content lists match design v0.3: 19 species, 9 substrates, 7 environment pieces, 5 fixtures, 3 buyers", () => {
  assert.equal(content.species.length, 19);
  assert.equal(content.substrates.length, 9);
  assert.equal(content.environment.length, 7);
  assert.equal(content.fixtures.length, 5);
  assert.equal(content.buyers.length, 3);
  const pieces = new Set([...content.substrates, ...content.environment].map((p) => p.id));
  for (const s of content.species) {
    assert.ok(tuning.species[s.id], s.id + " has tuning numbers");
    assert.ok(tuning.tiers[tuning.species[s.id].tier], s.id + " has a tier");
    for (const need of s.needs) {
      assert.ok(pieces.has(need), s.id + " needs a listed piece: " + need);
      assert.ok(tuning.pieceCost[need] > 0, need + " has a cost");
    }
    if (s.host) assert.ok(content.species.some((o) => o.id === s.host));
  }
  for (const b of content.buyers) assert.ok(tuning.buyers[b.id], b.id + " has tuning numbers");
});

test("every tuning line carries a comment", () => {
  const lines = readFileSync(join(root, "shared", "tuning.js"), "utf8").split("\n");
  const bare = lines.filter((line) => /\d/.test(line.replace(/\/\/.*$/, "")) && !line.includes("//"));
  assert.deepEqual(bare, []);
});
