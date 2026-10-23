// Prints the numbers for the verification stamp in claude/packet-04-result.md.
// Usage: node tools/stamp.mjs

import { runScripted, allFeaturesOff } from "./scripted-run.js";
import { content } from "../shared/content.js";
import { tuning } from "../shared/tuning.js";
import { titleFor } from "../src/engine/rules.js";

const ladder = (s) => {
  const count = { appear: 0, visit: 0, resident: 0, spread: 0 };
  for (const step of Object.values(s.ladder)) count[step] += 1;
  return "ladder " + Object.entries(count).map(([k, v]) => k + " " + v).join(", ");
};
const rankAt = (s) => "rank " + s.rank + " (" + titleFor(content, tuning, s.rank) + "), " + s.xp + " xp";
const line = (s) =>
  s.coins + " coins, " + rankAt(s) + ", " + ladder(s) + ", " + Object.keys(s.awards).length + " awards, " +
  s.stats.coloniesStarted + " colonies started, " + s.stats.spreads + " spreads, " + s.stats.sold + " sold, " +
  Object.keys(s.cells).length + " cells";

// The rank lines use the explorer, which tries each released piece once; the baseline line uses packet 03's player.
const a = runScripted(1, 30, { tend: true, explore: true });
const b = runScripted(1, 30, { tend: true, explore: true });
console.log("Determinism check (all switches on, tending): " + (JSON.stringify(a.engine.state) === JSON.stringify(b.engine.state) ? "pass" : "fail"));
console.log("Scripted 30-minute run, seed 1, tending: " + line(a.engine.state));
console.log("Scripted 60-minute run, seed 1, tending: " + line(runScripted(1, 60, { tend: true, explore: true }).engine.state));
const off = runScripted(1, 30, { tuning: allFeaturesOff() }).engine.state;
const matches = off.coins === 137 && Object.keys(off.stats.foraged).length === 2 && off.stats.coloniesStarted === 9;
console.log("Switches-off run matches packet 03 baseline: " + (matches ? "pass" : "fail") + " (" + line(off) + ")");

// When each rank was reached, from the journal log of a 60-minute run.
const s = runScripted(1, 60, { tend: true, explore: true }).engine.state;
const times = Object.values(s.awards).sort((x, y) => x - y);
console.log("Award times (minutes), 60-minute explorer run: " + times.map((t) => (t / tuning.secondsPerMinute).toFixed(1)).join(", "));
for (const seed of [2, 3, 4, 5]) console.log("seed " + seed + " 30 min explorer: " + line(runScripted(seed, 30, { tend: true, explore: true }).engine.state));
