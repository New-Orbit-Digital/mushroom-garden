import test from "node:test";
import assert from "node:assert/strict";
import { tuning, SPM, newGame, standAt } from "../tools/testkit.js";

const g = tuning.grid;
const BED = { x: g.startCol, y: g.startRow }; // an owned cell
const BESIDE = { x: g.startCol + 1, y: g.startRow }; // owned, next to BED
const FAR = { x: g.startCol + 2, y: g.startRow + 1 }; // owned, two columns from BED

function gameWithStrawBed() {
  const e = newGame();
  assert.equal(e.act({ type: "placePiece", piece: "straw_bed", ...BED }).ok, true);
  standAt(e, BESIDE.x + 0.5, BESIDE.y + 0.5);
  return e;
}

function startOyster(e) {
  e.state.spores.oyster = 1;
  assert.equal(e.act({ type: "startColony", species: "oyster", ...BESIDE }).ok, true);
  return e.state.cells[BESIDE.x + "," + BESIDE.y].colony;
}

test("a wild species appears only once one of its needed pieces exists", () => {
  const e = newGame();
  e.step(5 * SPM);
  assert.deepEqual(e.state.wild, {});

  e.act({ type: "placePiece", piece: "straw_bed", ...BED });
  e.step(1);
  assert.equal(e.state.wild.oyster.present, true);
  assert.equal(e.state.wild.wine_cap, undefined);
  const w = e.state.wild.oyster;
  const onEdge = w.x === 0 || w.y === 0 || w.x === g.cols - 1 || w.y === g.rows - 1;
  assert.equal(onEdge, true, "wild mushrooms appear on edge cells");
});

test("foraging gives one mushroom and one spore, and the wild one regrows", () => {
  const e = gameWithStrawBed();
  e.step(1);
  const w = e.state.wild.oyster;
  standAt(e, 7, 4);
  if (Math.hypot(w.x + 0.5 - 7, w.y + 0.5 - 4) > tuning.actReach) {
    assert.match(e.act({ type: "forage", species: "oyster" }).reason, /too far/);
  }
  standAt(e, w.x + 0.5, w.y + 0.5);
  assert.equal(e.act({ type: "forage", species: "oyster" }).ok, true);
  assert.equal(e.state.basket.length, 1);
  assert.equal(e.state.spores.oyster, 1);
  assert.equal(e.state.wild.oyster.present, false);
  e.step(tuning.tiers[1].wildRegrowMinutes * SPM);
  assert.equal(e.state.wild.oyster.present, true);
});

test("starting a colony is refused without a spore, a free cell, or needs in reach", () => {
  const e = gameWithStrawBed();

  const noSpore = e.act({ type: "startColony", species: "oyster", ...BESIDE });
  assert.equal(noSpore.ok, false);
  assert.match(noSpore.reason, /spore/);

  e.state.spores.oyster = 1;
  const taken = e.act({ type: "startColony", species: "oyster", ...BED });
  assert.equal(taken.ok, false);
  assert.match(taken.reason, /not free/);

  const notOwned = e.act({ type: "startColony", species: "oyster", x: 2, y: 2 });
  assert.equal(notOwned.ok, false);
  assert.match(notOwned.reason, /not yours/);

  standAt(e, FAR.x + 0.5, FAR.y + 0.5);
  const noNeeds = e.act({ type: "startColony", species: "oyster", ...FAR });
  assert.equal(noNeeds.ok, false);
  assert.match(noNeeds.reason, /needs Straw bed/);

  assert.equal(e.state.spores.oyster, 1, "a refused start keeps the spore");
  standAt(e, BESIDE.x + 0.5, BESIDE.y + 0.5);
  assert.equal(e.act({ type: "startColony", species: "oyster", ...BESIDE }).ok, true);
  assert.equal(e.state.spores.oyster, 0);
});

test("a colony fruits for the wait time, then is established; fruiting grows at half speed", () => {
  const e = gameWithStrawBed();
  const colony = startOyster(e);
  const wait = tuning.tiers[1].waitMinutes * SPM;
  const grow = tuning.tiers[1].growMinutes * SPM;

  e.step(wait - 1);
  assert.equal(colony.stage, "fruiting");
  e.step(1);
  assert.equal(colony.stage, "established");

  // Growth banked while fruiting counts at fruitingGrowRate.
  const banked = wait * tuning.fruitingGrowRate;
  assert.ok(banked < grow, "this test assumes the first mushroom comes after establishing");
  e.step(grow - banked - 1);
  assert.equal(colony.ready, null);
  e.step(1);
  assert.notEqual(colony.ready, null);
  assert.ok(colony.ready.quality >= tuning.minQuality && colony.ready.quality <= tuning.maxQuality);
});

test("an unpicked mushroom becomes a compost pile, collected by hand, and gives no spore", () => {
  const e = gameWithStrawBed();
  const colony = startOyster(e);
  while (!colony.ready) e.step(1);

  e.step(tuning.unpickedMinutes * SPM - 1);
  assert.notEqual(colony.ready, null);
  e.step(1);
  assert.equal(colony.ready, null);
  assert.equal(colony.pile, 1);
  assert.equal(e.state.spores.oyster, 0, "no spore from an unpicked mushroom");
  assert.equal(e.state.compost, 0, "compost stays on the cell until collected");
  assert.equal(e.state.basket.length, 0);

  standAt(e, 1, 1);
  assert.match(e.act({ type: "collectCompost", ...BESIDE }).reason, /too far/);
  standAt(e, BESIDE.x + 0.5, BESIDE.y + 0.5);
  assert.equal(e.act({ type: "collectCompost", ...BESIDE }).ok, true);
  assert.equal(e.state.compost, 1);
  assert.equal(colony.pile, 0);
});

test("picking needs the player next to the colony and puts the mushroom in the basket", () => {
  const e = gameWithStrawBed();
  const colony = startOyster(e);
  while (!colony.ready) e.step(1);
  const quality = colony.ready.quality;
  standAt(e, 1, 1);
  assert.match(e.act({ type: "pick", ...BESIDE }).reason, /too far/);
  standAt(e, BESIDE.x + 0.5, BESIDE.y + 0.5);
  assert.equal(e.act({ type: "pick", ...BESIDE }).ok, true);
  assert.deepEqual(e.state.basket, [{ species: "oyster", quality, age: 0 }]);
  assert.equal(e.state.spores.oyster, 0, "picking gives no spore by itself");
});

test("compost lifts the next grow by its bonus and is used up", () => {
  const plain = gameWithStrawBed();
  const a = startOyster(plain);
  const boosted = gameWithStrawBed();
  const b = startOyster(boosted);
  boosted.state.compost = 1;
  assert.equal(boosted.act({ type: "applyCompost", ...BESIDE }).ok, true);
  assert.equal(boosted.state.compost, 0);
  assert.match(boosted.act({ type: "applyCompost", ...BESIDE }).reason, /no compost/);

  while (!a.ready) plain.step(1);
  while (!b.ready) boosted.step(1);
  // Same seed, same rolls: the only difference is the compost.
  const expected = Math.min(tuning.maxQuality, a.ready.quality + tuning.compostQualityBonus);
  assert.equal(b.ready.quality, expected);
  assert.equal(b.composted, false, "compost lasts one grow");
});

test("Lobster mushroom needs an established Chanterelle colony within reach", () => {
  const e = newGame();
  const s = e.state;
  s.coins = 100000;
  const leaf = { x: g.startCol + 1, y: g.startRow + 1 };
  const oak = { x: g.startCol + 2, y: g.startRow + 1 };
  const chant = { x: g.startCol + 2, y: g.startRow };
  const lobster = { x: g.startCol + 1, y: g.startRow };
  assert.equal(e.act({ type: "placePiece", piece: "leaf_litter", ...leaf }).ok, true);
  assert.equal(e.act({ type: "placePiece", piece: "oak", ...oak }).ok, true);
  s.spores.lobster_mushroom = 1;
  s.spores.chanterelle = 1;
  standAt(e, lobster.x + 0.5, lobster.y + 0.5);

  const noHost = e.act({ type: "startColony", species: "lobster_mushroom", ...lobster });
  assert.equal(noHost.ok, false);
  assert.match(noHost.reason, /Chanterelle/);

  assert.equal(e.act({ type: "startColony", species: "chanterelle", ...chant }).ok, true);
  const stillFruiting = e.act({ type: "startColony", species: "lobster_mushroom", ...lobster });
  assert.equal(stillFruiting.ok, false, "a fruiting host is not enough");

  e.step(tuning.tiers[tuning.species.chanterelle.tier].waitMinutes * SPM);
  assert.equal(e.act({ type: "startColony", species: "lobster_mushroom", ...lobster }).ok, true);
});

test("build mode: cells cost more each time and must touch an owned cell; pieces need coins", () => {
  const e = newGame();
  const s = e.state;
  assert.match(e.act({ type: "buyCell", x: 0, y: 0 }).reason, /edge/);
  assert.match(e.act({ type: "buyCell", x: 2, y: 2 }).reason, /touch/);
  const first = e.act({ type: "buyCell", x: g.startCol - 1, y: g.startRow });
  assert.equal(first.ok, true);
  assert.equal(first.cost, tuning.cellBaseCost);
  assert.equal(s.coins, tuning.startCoins - tuning.cellBaseCost);
  const second = e.act({ type: "buyCell", x: g.startCol - 2, y: g.startRow });
  assert.ok(second.cost > first.cost);
  s.coins = 0;
  assert.match(e.act({ type: "placePiece", piece: "straw_bed", x: g.startCol, y: g.startRow }).reason, /costs/);
  assert.match(e.act({ type: "placePiece", piece: "fan", x: g.startCol, y: g.startRow }).reason, /cannot be placed yet/);
});
