// Prints the numbers for the verification stamp in claude/packet-03-result.md.
// Usage: node tools/stamp.mjs

import { runScripted, allFeaturesOff } from "./scripted-run.js";

const stars = (s) => (s.stats.picked ? (s.stats.starsPicked / s.stats.picked).toFixed(2) : "n/a");
const ladder = (s) => {
  const count = { appear: 0, visit: 0, resident: 0, spread: 0 };
  for (const step of Object.values(s.ladder)) count[step] += 1;
  return "ladder " + Object.entries(count).map(([k, v]) => k + " " + v).join(", ");
};
const line = (s) =>
  s.coins + " coins, " + stars(s) + " average stars over " + s.stats.picked + " picked, " +
  s.stats.chores + " chores, " + Object.keys(s.stats.foraged).length + " species foraged, " +
  s.stats.coloniesStarted + " colonies started, " + s.stats.spreads + " spreads, " + s.stats.sold + " sold, " +
  ladder(s) + ", " + Object.keys(s.awards).length + " awards, " + s.xp + " xp";

const a = runScripted(1, 30, { tend: true });
const b = runScripted(1, 30, { tend: true });
const same = JSON.stringify(a.engine.state) === JSON.stringify(b.engine.state);
console.log("Determinism check (all switches on, tending): " + (same ? "pass" : "fail"));

console.log("Scripted 30-minute run, seed 1, tending: " + line(a.engine.state));
console.log("Scripted 30-minute run, seed 1, switches off: " + line(runScripted(1, 30, { tuning: allFeaturesOff() }).engine.state));
console.log("Scripted 30-minute run, seed 1, neglecting: " + line(runScripted(1, 30, { tend: false }).engine.state));

for (const seed of [2, 3, 4, 5]) {
  console.log("seed " + seed + " tending:    " + line(runScripted(seed, 30, { tend: true }).engine.state));
}
