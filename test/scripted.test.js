import test from "node:test";
import assert from "node:assert/strict";
import { runScripted } from "../tools/scripted-run.js";

test("a scripted player, using the actions API only, plays 30 minutes and ends with coins", () => {
  const { engine } = runScripted(1, 30);
  const s = engine.state;
  assert.ok(s.time >= 30 * 60);
  assert.ok(Object.keys(s.stats.foraged).length >= 1, "foraged at least one species");
  assert.ok(s.stats.coloniesStarted >= 1, "started a colony");
  assert.ok(s.stats.picked >= 1, "harvested");
  assert.ok(s.stats.sold >= 1, "sold");
  assert.ok(s.stats.earned > 0);
  assert.ok(s.coins > 0, "coins above zero");
});

test("the first forage, colony, harvest and sale all happen within ten minutes", () => {
  const { engine } = runScripted(1, 10);
  const s = engine.state.stats;
  assert.ok(Object.keys(s.foraged).length >= 1);
  assert.ok(s.coloniesStarted >= 1);
  assert.ok(s.picked >= 1);
  assert.ok(s.sold >= 1);
});

test("the same seed and inputs give an identical end state twice", () => {
  const a = JSON.stringify(runScripted(1, 30).engine.state);
  const b = JSON.stringify(runScripted(1, 30).engine.state);
  assert.equal(a, b);
  const other = JSON.stringify(runScripted(2, 30).engine.state);
  assert.notEqual(a, other, "a different seed gives a different game");
});
