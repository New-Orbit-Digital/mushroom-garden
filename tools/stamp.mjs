// Prints the numbers for the verification stamp in claude/packet-01-result.md.
// Usage: node tools/stamp.mjs

import { runScripted } from "./scripted-run.js";

const first = runScripted(1, 30);
const second = runScripted(1, 30);
const same = JSON.stringify(first.engine.state) === JSON.stringify(second.engine.state);
const s = first.engine.state;

console.log("Determinism check: " + (same ? "pass" : "fail"));
console.log(
  "Scripted 30-minute run, seed 1: " + s.coins + " coins at end, " +
  Object.keys(s.stats.foraged).length + " species foraged (" + Object.keys(s.stats.foraged).join(", ") + "), " +
  s.stats.coloniesStarted + " colonies started",
);
console.log("Detail: " + JSON.stringify(s.stats) + ", actions sent: " + first.acts + ", compost: " + s.compost);
