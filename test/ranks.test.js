import test from "node:test";
import assert from "node:assert/strict";
import { tuning, content, SPM, rankedGame, newGame } from "../tools/testkit.js";
import { xpForNextRank, xpAtRank, rankFromXp, titleFor, releasesAt, canBuyCell } from "../src/engine/rules.js";
import { nextRelease, rankProgress } from "../src/engine/query.js";
import { runScripted, allFeaturesOff } from "../tools/scripted-run.js";

const g = tuning.grid;
const C0 = g.startCol;
const R0 = g.startRow;

// Every cell that could be bought next (touching the garden, not the edge, not owned).
function buyable(e) {
  const out = [];
  for (let y = 0; y < g.rows; y += 1) for (let x = 0; x < g.cols; x += 1) if (canBuyCell(e.state, tuning, x, y) === null) out.push({ x, y });
  return out;
}

// Buys cells until the garden has `target` cells or a purchase is refused. Returns the last refusal, if any.
function growTo(e, target) {
  while (Object.keys(e.state.cells).length < target) {
    const next = buyable(e)[0];
    const result = e.act({ type: "buyCell", ...next });
    if (!result.ok) return result;
  }
  return null;
}

// Test setup only: give experience as if awards had been earned, then let one real award move the clock.
function reachRank(e, rank) {
  e.state.xp = xpAtRank(tuning, rank) - tuning.awards.xp.sale;
  e.state.basket.push({ species: "oyster", quality: 3, age: 0 });
  e.state.buyers.push({ id: 99, kind: "market_boat", route: "creek", wants: [{ species: "oyster", count: 1 }], favourite: null, elapsed: 0, total: SPM });
  assert.equal(e.act({ type: "sell", buyer: 99 }).ok, true);
  assert.equal(e.state.rank, rank);
}

test("the curve: each rank costs growth times the one before, and rank follows experience", () => {
  assert.equal(xpForNextRank(tuning, 1), tuning.rank.firstXp);
  assert.equal(xpForNextRank(tuning, 2), Math.round(tuning.rank.firstXp * tuning.rank.growth));
  assert.equal(xpAtRank(tuning, 1), 0);
  assert.equal(xpAtRank(tuning, 3), xpForNextRank(tuning, 1) + xpForNextRank(tuning, 2));
  assert.equal(rankFromXp(tuning, 0), 1);
  assert.equal(rankFromXp(tuning, xpAtRank(tuning, 5) - 1), 4);
  assert.equal(rankFromXp(tuning, xpAtRank(tuning, 5)), 5);
});

test("one award can lift several ranks at once, and each rank-up is logged with its releases", () => {
  const e = rankedGame();
  e.state.xp = xpAtRank(tuning, 6) - tuning.awards.xp.sale;
  e.state.basket.push({ species: "oyster", quality: 3, age: 0 });
  e.state.buyers.push({ id: 7, kind: "market_boat", route: "creek", wants: [{ species: "oyster", count: 1 }], favourite: null, elapsed: 0, total: SPM });
  e.act({ type: "sell", buyer: 7 });
  assert.equal(e.state.rank, 6);
  const text = e.state.events.map((ev) => ev.text).join(" | ");
  assert.match(text, /Rank 2,/);
  assert.match(text, /Rank 6, Grower\. New: the title Grower, Lion's mane can appear, Nameko can appear, Mister\./);
});

test("titles change every five ranks, from New grower to Grand mycologist", () => {
  assert.equal(titleFor(content, tuning, 1), "New grower");
  assert.equal(titleFor(content, tuning, 5), "New grower");
  assert.equal(titleFor(content, tuning, 6), "Grower");
  assert.equal(titleFor(content, tuning, 41), "Grand mycologist");
  assert.equal(titleFor(content, tuning, 60), "Grand mycologist", "the last title holds");
});

test("a species cannot appear before its rank, and does once the rank is reached", () => {
  const e = rankedGame();
  e.state.coins = 1e6;
  assert.equal(e.act({ type: "placePiece", piece: "wood_chips", x: C0, y: R0 }).ok, true);
  e.step(1);
  assert.equal(e.state.wild.wine_cap.present, true, "Wine cap is rank 1");
  assert.equal(e.state.wild.enoki, undefined, "Enoki waits for rank " + tuning.species.enoki.rank);
  reachRank(e, tuning.species.enoki.rank);
  e.step(1);
  assert.equal(e.state.wild.enoki.outline, true);
});

test("a piece is refused before its rank and placed after", () => {
  const e = rankedGame();
  e.state.coins = 1e6;
  const early = e.act({ type: "placePiece", piece: "hardwood_log", x: C0, y: R0 });
  assert.equal(early.ok, false);
  assert.match(early.reason, new RegExp("Hardwood log opens at rank " + tuning.pieceRank.hardwood_log));
  reachRank(e, tuning.pieceRank.hardwood_log);
  assert.equal(e.act({ type: "placePiece", piece: "hardwood_log", x: C0, y: R0 }).ok, true);
});

test("the garden can grow only to the cap for the current rank", () => {
  const e = rankedGame();
  e.state.coins = 1e6;
  const first = tuning.garden.cellCaps[0];
  assert.equal(growTo(e, first.cells), null);
  assert.equal(Object.keys(e.state.cells).length, first.cells);
  const blocked = e.act({ type: "buyCell", ...buyable(e)[0] });
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, new RegExp("past " + first.cells + " cells until rank " + tuning.garden.cellCaps[1].rank));
  reachRank(e, tuning.garden.cellCaps[1].rank);
  assert.equal(e.act({ type: "buyCell", ...buyable(e)[0] }).ok, true, "the next cap lets it grow again");
});

test("the travelling merchant does not come by road before its rank; creek buyers do", () => {
  const e = rankedGame();
  e.step(60 * SPM);
  assert.ok(e.state.stats && e.state.buyers.every((b) => b.route === "creek"));
  assert.equal(e.state.timers.road, tuning.land.firstMinutes * SPM, "the road clock has not started");
  reachRank(e, tuning.land.rank);
  e.step(tuning.land.firstMinutes * SPM);
  assert.ok(e.state.buyers.some((b) => b.route === "road"), "the merchant arrives on its first-visit timing after the rank");
});

test("with ranks off, every species, piece, cell and buyer is open from the start", () => {
  const e = newGame();
  e.state.coins = 1e6;
  assert.equal(e.act({ type: "placePiece", piece: "old_oak", x: C0, y: R0 }).ok, true);
  assert.equal(growTo(e, tuning.garden.cellCaps[0].cells + 1), null, "no cap with ranks off");
});

test("what each rank releases, and the next release, in words", () => {
  assert.deepEqual(releasesAt(content, tuning, 4), ["Shiitake can appear", "Enoki can appear", "Hardwood log"]);
  assert.ok(releasesAt(content, tuning, 11).includes("the title Skilled grower"));
  assert.ok(releasesAt(content, tuning, 11).includes("room for " + tuning.garden.cellCaps[1].cells + " cells"));
  assert.ok(releasesAt(content, tuning, tuning.land.rank).includes("the travelling merchant by road"));
  const e = rankedGame();
  assert.deepEqual(nextRelease(e.state, content, tuning), { rank: 4, items: ["Shiitake can appear", "Enoki can appear", "Hardwood log"] });
  assert.deepEqual(rankProgress(e.state, tuning), { rank: 1, into: 0, need: tuning.rank.firstXp });
});

test("the schedule never releases a species before the pieces and host it needs", () => {
  for (const species of content.species) {
    const rank = tuning.species[species.id].rank;
    for (const need of species.needs) {
      assert.ok(tuning.pieceRank[need] <= rank, species.id + " (rank " + rank + ") needs " + need + " (rank " + tuning.pieceRank[need] + ")");
    }
    if (species.host) assert.ok(tuning.species[species.host].rank <= rank, species.id + " needs its host released first");
  }
});

test("switches off still matches the packet 03 baseline (the rank switch is among them)", () => {
  const s = runScripted(1, 30, { tuning: allFeaturesOff() }).engine.state;
  assert.equal(s.coins, 137);
  assert.equal(Object.keys(s.stats.foraged).length, 2);
  assert.equal(s.stats.coloniesStarted, 9);
});

test("under the rank gates, the same seed gives an identical game twice, and the scripted player ranks up", () => {
  const a = runScripted(1, 30, { tend: true }).engine.state;
  const b = runScripted(1, 30, { tend: true }).engine.state;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.ok(a.rank > 1);
});
