// Prints the numbers for the verification stamp in claude/packet-02-result.md.
// Usage: node tools/stamp.mjs

import { runScripted, allFeaturesOff } from "./scripted-run.js";

const stars = (s) => (s.stats.picked ? (s.stats.starsPicked / s.stats.picked).toFixed(2) : "n/a");
const line = (s) =>
  s.coins + " coins, " + stars(s) + " average stars over " + s.stats.picked + " picked, " +
  s.stats.chores + " chores, " + Object.keys(s.stats.foraged).length + " species foraged, " +
  s.stats.coloniesStarted + " colonies started, " + s.stats.sold + " sold";

const a = runScripted(1, 30, { tend: true });
const b = runScripted(1, 30, { tend: true });
const same = JSON.stringify(a.engine.state) === JSON.stringify(b.engine.state);
console.log("Determinism check (all switches on, tending): " + (same ? "pass" : "fail"));

const off = runScripted(1, 30, { tuning: allFeaturesOff() }).engine.state;
const matches = off.coins === 323 && Object.keys(off.stats.foraged).length === 3 && off.stats.coloniesStarted === 4;
console.log("Switches-off run matches packet 01 stamp: " + (matches ? "pass" : "fail") + " (" + line(off) + ")");

console.log("Scripted 30-minute run, seed 1, tending: " + line(a.engine.state));
console.log("Scripted 30-minute run, seed 1, neglecting: " + line(runScripted(1, 30, { tend: false }).engine.state));

for (const seed of [2, 3, 4, 5]) {
  console.log("seed " + seed + " tending:    " + line(runScripted(seed, 30, { tend: true }).engine.state));
  console.log("seed " + seed + " neglecting: " + line(runScripted(seed, 30, { tend: false }).engine.state));
}
