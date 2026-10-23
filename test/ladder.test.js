import test from "node:test";
import assert from "node:assert/strict";
import { tuning, content, SPM, newGame, addBuyer } from "../tools/testkit.js";
import { createEngine } from "../src/engine/engine.js";
import { buyerPosition } from "../src/engine/rules.js";
import { actionAt, journal, nextCondition } from "../src/engine/query.js";
import { bandFor, bandMiddle } from "../src/engine/conditions.js";

const g = tuning.grid;
const XP = tuning.awards.xp;
// The six cells owned at the start: columns startCol..startCol+2, rows startRow..startRow+1.
const C0 = g.startCol;
const R0 = g.startRow;
const BED = { x: C0 + 1, y: R0 }; // straw bed, top middle
const A = { x: C0, y: R0 }; // first colony, beside the bed
const B = { x: C0, y: R0 + 1 }; // second colony, beside A and the bed
const TARGET = { x: C0 + 1, y: R0 + 1 }; // the free cell beside both and the bed
const at = (cell) => ({ x: cell.x + 0.5, y: cell.y + 0.5 }); // centre of a cell, as a cursor point

function rich(engine) {
  engine.state.coins = 1e6;
  return engine;
}

function plant(e, species, cell) {
  e.state.spores[species] = (e.state.spores[species] || 0) + 1;
  const result = e.act({ type: "startColony", species, ...cell });
  assert.equal(result.ok, true, result.reason);
  return e.state.cells[cell.x + "," + cell.y].colony;
}

const establish = (e, species) => e.step(tuning.tiers[tuning.species[species].tier].waitMinutes * SPM);

function twoOysters(customContent) {
  const e = rich(customContent ? createEngine({ tuning, content: customContent, seed: 1 }) : newGame());
  assert.equal(e.act({ type: "placePiece", piece: "straw_bed", ...BED }).ok, true);
  const a = plant(e, "oyster", A);
  const b = plant(e, "oyster", B);
  establish(e, "oyster");
  assert.equal(a.stage, "established");
  assert.equal(b.stage, "established");
  return { e, a, b };
}

test("cursor only: there is no move action and no character in the state", () => {
  const e = newGame();
  assert.equal(e.state.player, undefined);
  assert.match(e.act({ type: "move", dir: { x: 1, y: 0 } }).reason, /unknown action/);
});

test("Appear makes an outline that cannot be foraged; Visit needs every piece and makes a flush", () => {
  const e = rich(newGame());
  assert.equal(e.act({ type: "placePiece", piece: "wood_chips", ...A }).ok, true);
  e.step(1);
  const enoki = e.state.wild.enoki;
  assert.equal(enoki.outline, true, "Enoki has one of its two pieces, so it appears");
  assert.equal(enoki.present, false);
  assert.match(e.act({ type: "forage", species: "enoki" }).reason, /outline/);
  assert.equal(e.state.ladder.enoki, "appear");
  assert.equal(e.state.awards["appear:enoki"], e.state.time);

  e.step(10 * SPM);
  assert.equal(e.state.wild.enoki.present, false, "still only an outline without a hardwood log");
  assert.equal(e.act({ type: "placePiece", piece: "hardwood_log", ...BED }).ok, true);
  e.step(1);
  assert.equal(e.state.wild.enoki.present, true, "with every piece placed it flushes");
  assert.equal(e.state.wild.enoki.outline, false);
  assert.equal(e.act({ type: "forage", species: "enoki" }).ok, true);
  assert.equal(e.state.ladder.enoki, "visit");
});

test("a parasite visits only once its host has an established colony somewhere", () => {
  const e = rich(newGame());
  e.act({ type: "placePiece", piece: "leaf_litter", ...BED });
  e.act({ type: "placePiece", piece: "oak", ...TARGET });
  e.step(1);
  assert.equal(e.state.wild.lobster_mushroom.outline, true);
  plant(e, "chanterelle", A);
  e.step(1);
  assert.equal(e.state.wild.lobster_mushroom.present, false, "a fruiting host is not enough");
  establish(e, "chanterelle");
  e.step(1);
  assert.equal(e.state.wild.lobster_mushroom.present, true);
});

test("each award is granted once and adds its experience once", () => {
  const e = rich(newGame());
  e.act({ type: "placePiece", piece: "straw_bed", ...BED });
  e.step(1);
  const before = e.state.xp;
  assert.equal(e.act({ type: "forage", species: "oyster" }).ok, true);
  assert.equal(e.state.xp, before + XP.visit);
  e.step(tuning.tiers[1].wildRegrowMinutes * SPM);
  assert.equal(e.act({ type: "forage", species: "oyster" }).ok, true);
  assert.equal(e.state.xp, before + XP.visit, "a second forage earns nothing");
});

test("reaching a later step grants the earlier ones, so the ladder has no gaps", () => {
  const e = rich(newGame());
  e.act({ type: "placePiece", piece: "straw_bed", ...BED });
  plant(e, "oyster", A); // a spore from elsewhere: never foraged
  assert.equal(e.state.awards["visit:oyster"], undefined);
  establish(e, "oyster");
  assert.equal(e.state.ladder.oyster, "resident");
  for (const step of ["appear", "visit", "resident"]) assert.ok(e.state.awards[step + ":oyster"] !== undefined, step);
  assert.equal(e.state.xp, XP.appear + XP.visit + XP.resident);
});

test("Spread makes a fruiting colony on the free cell beside both, uses no spore, and rests both parents", () => {
  const { e, a, b } = twoOysters();
  const spores = e.state.spores.oyster || 0;
  const xp = e.state.xp;
  const result = e.act({ type: "spread", ...A });
  assert.equal(result.ok, true, result.reason);
  assert.deepEqual({ x: result.x, y: result.y }, TARGET);
  const child = e.state.cells[TARGET.x + "," + TARGET.y].colony;
  assert.equal(child.species, "oyster");
  assert.equal(child.stage, "fruiting");
  assert.equal(e.state.spores.oyster || 0, spores);
  assert.equal(a.restLeft, tuning.spreadRestMinutes * SPM);
  assert.equal(b.restLeft, tuning.spreadRestMinutes * SPM);
  assert.equal(e.state.ladder.oyster, "spread");
  assert.equal(e.state.xp, xp + XP.spread);
  assert.match(e.act({ type: "spread", ...A }).reason, /resting/);
  assert.match(e.act({ type: "spread", ...B }).reason, /resting|second/);
  e.step(tuning.spreadRestMinutes * SPM);
  assert.equal(a.restLeft, 0);
});

test("each Spread refusal says what is missing", () => {
  const solo = rich(newGame());
  solo.act({ type: "placePiece", piece: "straw_bed", ...BED });
  const only = plant(solo, "oyster", A);
  assert.match(solo.act({ type: "spread", ...A }).reason, /fruiting/);
  establish(solo, "oyster");
  assert.equal(only.stage, "established");
  assert.match(solo.act({ type: "spread", ...A }).reason, /second established Oyster/);
  assert.match(solo.act({ type: "spread", ...TARGET }).reason, /no colony/);

  const full = twoOysters().e;
  full.act({ type: "placePiece", piece: "compost_bed", ...TARGET });
  assert.match(full.act({ type: "spread", ...A }).reason, /free cell/);

  const homed = structuredClone(content);
  homed.species.find((s) => s.id === "oyster").home = "wood_chips";
  const away = twoOysters(homed).e;
  assert.match(away.act({ type: "spread", ...A }).reason, /Wood chips beside them/);
  away.act({ type: "placePiece", piece: "wood_chips", x: C0 + 2, y: R0 });
  assert.match(away.act({ type: "spread", ...A }).reason, /Wood chips beside them/, "out of reach of both parents");
});

test("seven established colonies of one species at once earn the seven award, once", () => {
  const e = rich(newGame());
  for (const cell of [[C0 - 1, R0], [C0 - 1, R0 + 1], [C0 + 3, R0], [C0 + 3, R0 + 1], [C0 - 1, R0 + 2], [C0, R0 + 2], [C0 + 1, R0 + 2], [C0 + 2, R0 + 2], [C0 + 3, R0 + 2]]) {
    assert.equal(e.act({ type: "buyCell", x: cell[0], y: cell[1] }).ok, true);
  }
  e.act({ type: "placePiece", piece: "straw_bed", x: C0, y: R0 + 1 });
  e.act({ type: "placePiece", piece: "straw_bed", x: C0 + 2, y: R0 + 1 });
  const spots = [[C0 - 1, R0], [C0 - 1, R0 + 1], [C0 - 1, R0 + 2], [C0, R0], [C0, R0 + 2], [C0 + 1, R0], [C0 + 1, R0 + 2]];
  for (const [x, y] of spots) plant(e, "oyster", { x, y });
  establish(e, "oyster");
  assert.ok(e.state.awards["seven:oyster"] !== undefined);
  const xp = e.state.xp;
  plant(e, "oyster", { x: C0 + 3, y: R0 });
  establish(e, "oyster");
  assert.equal(e.state.xp, xp, "an eighth colony earns nothing more");
});

test("the first 5-star pick of a species earns its award, once", () => {
  const e = rich(newGame());
  e.act({ type: "placePiece", piece: "straw_bed", ...BED });
  const colony = plant(e, "oyster", A);
  while (!colony.ready) e.step(1);
  colony.ready.quality = tuning.maxQuality; // test setup: force the roll
  const xp = e.state.xp;
  assert.equal(e.act({ type: "pick", ...A }).ok, true);
  assert.equal(e.state.xp, xp + XP.fiveStar);
  while (!colony.ready) e.step(1);
  colony.ready.quality = tuning.maxQuality;
  assert.equal(e.act({ type: "pick", ...A }).ok, true);
  assert.equal(e.state.xp, xp + XP.fiveStar);
});

test("the first sale to each buyer kind earns its award, once per kind", () => {
  const e = newGame();
  const s = e.state;
  const boat = addBuyer(e, "market_boat", [{ species: "oyster", count: 5 }]);
  s.basket.push({ species: "oyster", quality: 3, age: 0 }, { species: "oyster", quality: 3, age: 0 });
  assert.equal(e.act({ type: "sell", buyer: boat.id }).ok, true);
  assert.equal(s.xp, XP.sale);
  s.basket.push({ species: "oyster", quality: 3, age: 0 });
  assert.equal(e.act({ type: "sell", buyer: boat.id }).ok, true);
  assert.equal(s.xp, XP.sale);
  const merchant = addBuyer(e, "merchant", [{ species: "oyster", count: 1 }]);
  s.basket.push({ species: "oyster", quality: 3, age: 0 });
  assert.equal(e.act({ type: "sell", buyer: merchant.id }).ok, true);
  assert.equal(s.xp, XP.sale * 2);
});

test("the journal shows each species' next condition at every step", () => {
  const e = rich(newGame());
  assert.equal(journal(e.state, content, tuning).unseen, content.species.length);
  e.act({ type: "placePiece", piece: "wood_chips", x: C0 + 2, y: R0 + 1 }); // out of reach of A and B
  e.step(1);
  assert.equal(nextCondition(e.state, content, tuning, "enoki"), "Visit: place Hardwood log anywhere in the garden.");

  e.act({ type: "placePiece", piece: "straw_bed", ...BED });
  e.step(1);
  assert.equal(nextCondition(e.state, content, tuning, "oyster"), "Visit: a wild flush is at the edge. Click it to forage.");
  e.act({ type: "forage", species: "oyster" });
  assert.equal(nextCondition(e.state, content, tuning, "oyster"), "Resident: plant its spore with Straw bed beside it.");
  plant(e, "oyster", A);
  plant(e, "oyster", B);
  establish(e, "oyster");
  assert.match(nextCondition(e.state, content, tuning, "oyster"), /^Spread: .*Straw bed beside them/);
  e.act({ type: "spread", ...A });
  assert.equal(nextCondition(e.state, content, tuning, "oyster"), "All four steps done.");

  const book = journal(e.state, content, tuning);
  const oyster = book.entries.find((x) => x.species === "oyster");
  assert.equal(oyster.stepNumber, oyster.steps);
  assert.equal(book.unseen, content.species.length - book.entries.length);
  assert.equal(book.xp, e.state.xp);
});

test("a click picks, collects, tends or spreads, in that order, and finds a buyer under the cursor", () => {
  const { e, a, b } = twoOysters();
  const hold = (kind) => {
    e.state.weather.kind = kind;
    e.state.weather.next = kind;
    e.state.weather.left = 1e9;
  };
  hold("clear");
  for (const c of [a, b]) for (const k of content.conditions) c[k] = bandMiddle(bandFor(content, tuning, "oyster", k)); // test setup: in band
  assert.equal(actionAt(e.state, content, tuning, at(A), null).action.type, "spread");
  a.pile = 1;
  assert.equal(actionAt(e.state, content, tuning, at(A), null).action.type, "collectCompost");
  a.ready = { quality: 3, waitLeft: SPM };
  assert.equal(actionAt(e.state, content, tuning, at(A), null).action.type, "pick");
  b.moisture = 0;
  assert.equal(actionAt(e.state, content, tuning, at(B), null).action.type, "tend");

  const boat = addBuyer(e, "market_boat", [{ species: "oyster", count: 1 }]);
  const spot = buyerPosition(tuning, boat);
  assert.deepEqual(actionAt(e.state, content, tuning, spot, null).action, { type: "sell", buyer: boat.id });
  assert.equal(actionAt(e.state, content, tuning, { x: spot.x, y: spot.y + tuning.pointReach * 2 }, null), null);

  assert.equal(actionAt(e.state, content, tuning, at({ x: C0 + 2, y: R0 }), null).action, null, "no spore held: nothing to plant");
  e.state.spores.oyster = 1;
  assert.equal(actionAt(e.state, content, tuning, at({ x: C0 + 2, y: R0 }), "oyster").action.type, "startColony");
});

test("an outline under the cursor only says what it needs", () => {
  const e = rich(newGame());
  e.act({ type: "placePiece", piece: "wood_chips", ...A });
  e.step(1);
  const w = e.state.wild.enoki;
  const hint = actionAt(e.state, content, tuning, at(w), null);
  assert.equal(hint.action, null);
  assert.match(hint.label, /outline of Enoki.*Hardwood log/);
});
