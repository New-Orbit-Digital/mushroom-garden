import test from "node:test";
import assert from "node:assert/strict";
import { tuning, content, SPM, standAt } from "../tools/testkit.js";
import { createEngine } from "../src/engine/engine.js";
import { bandFor, bandMiddle } from "../src/engine/conditions.js";
import { runScripted, tuningWithFeatures, allFeaturesOff } from "../tools/scripted-run.js";

const g = tuning.grid;
const BED = { x: g.startCol + 1, y: g.startRow }; // straw bed, middle of the top row
const LEFT = { x: g.startCol, y: g.startRow + 1 }; // colony cell beside the bed
const RIGHT = { x: g.startCol + 2, y: g.startRow + 1 }; // colony cell beside the bed, two columns from LEFT_TOP
const LEFT_TOP = { x: g.startCol, y: g.startRow }; // beside LEFT, out of reach of RIGHT
const MIDDLE = { x: g.startCol + 1, y: g.startRow + 1 }; // beside both colonies
const WAIT = tuning.tiers[1].waitMinutes * SPM;
const CONDITIONS = content.conditions;

function game(features = {}, seed = 1) {
  const t = tuningWithFeatures(features);
  const e = createEngine({ tuning: t, content, seed });
  e.state.coins = 100000;
  assert.equal(e.act({ type: "placePiece", piece: "straw_bed", ...BED }).ok, true);
  return { e, t };
}

function startOyster(e, cell) {
  e.state.spores.oyster = (e.state.spores.oyster || 0) + 1;
  standAt(e, cell.x + 0.5, cell.y + 0.5);
  assert.equal(e.act({ type: "startColony", species: "oyster", ...cell }).ok, true);
  return e.state.cells[cell.x + "," + cell.y].colony;
}

// Test setup only: pin the weather so a test does not depend on the schedule.
function holdWeather(e, kind) {
  e.state.weather.kind = kind;
  e.state.weather.next = kind;
  e.state.weather.left = 1e9;
}

function establishedOyster(e, cell = LEFT) {
  const colony = startOyster(e, cell);
  e.step(WAIT);
  assert.equal(colony.stage, "established");
  return colony;
}

const middle = (condition) => bandMiddle(bandFor(content, tuning, "oyster", condition));
const levels = (colony) => CONDITIONS.map((c) => colony[c]);

test("weather changes on schedule and is the same for the same seed", () => {
  const sequence = (seed) => {
    const e = createEngine({ tuning, content, seed });
    const seen = [e.state.weather.kind];
    for (let i = 0; i < 8; i += 1) {
      const coming = e.state.weather.next;
      e.step(tuning.weather.changeMinutes * SPM - 1);
      assert.equal(e.state.weather.kind, seen[seen.length - 1], "no change before the spell ends");
      e.step(1);
      assert.equal(e.state.weather.kind, coming, "the announced weather arrives");
      seen.push(e.state.weather.kind);
    }
    return seen;
  };
  const first = sequence(1);
  assert.deepEqual(sequence(1), first);
  const ids = content.weather.map((w) => w.id);
  for (const kind of first) assert.ok(ids.includes(kind));
  assert.ok(new Set(first).size > 1, "the weather does change");
});

test("weather has its own random stream: buyers are the same with weather on or off", () => {
  const on = createEngine({ tuning, content, seed: 1 });
  const off = createEngine({ tuning: tuningWithFeatures({ weather: false }), content, seed: 1 });
  on.step(20 * SPM);
  off.step(20 * SPM);
  assert.equal(on.state.rngState, off.state.rngState);
  assert.deepEqual(on.state.buyers, off.state.buyers);
});

test("rain raises moisture, hot sun lowers it and raises light, wind raises air", () => {
  const after = (kind) => {
    const { e } = game();
    const colony = establishedOyster(e);
    holdWeather(e, kind);
    assert.deepEqual(levels(colony), CONDITIONS.map(middle), "a new colony starts mid-band");
    e.step(SPM);
    return colony;
  };
  assert.ok(after("rain").moisture > middle("moisture"));
  const hot = after("hot");
  assert.ok(hot.moisture < middle("moisture"));
  assert.ok(hot.light > middle("light"));
  assert.ok(after("windy").air > middle("air"));
});

test("a fruiting colony does not drift and cannot be tended", () => {
  const { e } = game();
  const colony = startOyster(e, LEFT);
  holdWeather(e, "hot");
  e.step(WAIT - 1);
  assert.equal(colony.stage, "fruiting");
  assert.deepEqual(levels(colony), CONDITIONS.map(middle));
  assert.match(e.act({ type: "tend", ...LEFT, condition: "moisture" }).reason, /fruiting/);
});

test("a chore puts the condition at the middle of the band; refused out of reach or when in band", () => {
  const { e } = game();
  const colony = establishedOyster(e);
  holdWeather(e, "hot");
  e.step(5 * SPM);
  const band = bandFor(content, tuning, "oyster", "moisture");
  assert.ok(colony.moisture < band.low, "hot sun has dried it out of band");

  standAt(e, 1, 1);
  assert.match(e.act({ type: "tend", ...LEFT, condition: "moisture" }).reason, /too far/);
  standAt(e, LEFT.x + 0.5, LEFT.y + 0.5);
  const misted = e.act({ type: "tend", ...LEFT, condition: "moisture" });
  assert.equal(misted.ok, true);
  assert.equal(misted.chore, "mist");
  assert.equal(colony.moisture, middle("moisture"));
  assert.match(e.act({ type: "tend", ...LEFT, condition: "moisture" }).reason, /fine/);
  assert.match(e.act({ type: "tend", ...LEFT, condition: "air" }).reason, /fine/, "air is still in band");

  const shaded = e.act({ type: "tend", ...LEFT }); // no condition named: fixes the worst one
  assert.equal(shaded.ok, true);
  assert.equal(shaded.chore, "shade");
  assert.equal(colony.light, middle("light"));
  assert.equal(e.state.stats.chores, 2);
  assert.match(e.act({ type: "tend", ...LEFT }).reason, /fine/);
});

test("a grow fully in band earns the bonus", () => {
  const plain = game({ conditions: false });
  const kept = game({ weather: false }); // conditions on, nothing pushing them: always in band
  const a = startOyster(plain.e, LEFT);
  const b = startOyster(kept.e, LEFT);
  while (!a.ready) plain.e.step(1);
  while (!b.ready) kept.e.step(1);
  assert.equal(b.ready.quality, Math.min(tuning.maxQuality, a.ready.quality + tuning.quality.inBandStars));
});

test("neglect lowers quality, never below one star, and never removes anything", () => {
  const secondGrow = (features, weatherKind) => {
    const { e } = game(features);
    const colony = startOyster(e, LEFT);
    if (weatherKind) holdWeather(e, weatherKind);
    while (!colony.ready) e.step(1);
    e.step(tuning.unpickedMinutes * SPM); // leave it: it becomes a compost pile
    assert.equal(colony.pile, 1);
    while (!colony.ready) e.step(1);
    return { e, colony };
  };
  const plain = secondGrow({ conditions: false }, null);
  const neglected = secondGrow({}, "hot"); // moisture and light out of band for the whole second grow
  const expected = Math.max(tuning.minQuality, plain.colony.ready.quality - 2 * tuning.quality.neglectStars);
  assert.equal(neglected.colony.ready.quality, expected);
  assert.ok(neglected.colony.ready.quality >= tuning.minQuality);

  // Hours of neglect: the colony is still there, still producing, and every unpicked mushroom is a pile.
  neglected.e.step(120 * SPM);
  assert.equal(neglected.colony.stage, "established");
  assert.ok(neglected.colony.pile >= 10);
  assert.equal(neglected.e.state.spores.oyster, 0);
  assert.ok(neglected.colony.ready === null || neglected.colony.ready.quality >= tuning.minQuality);
});

test("an environment piece holds its side of its condition within reach, and not beyond", () => {
  const run = (features) => {
    const { e } = game(features);
    assert.equal(e.act({ type: "placePiece", piece: "mister", ...LEFT_TOP }).ok, true);
    assert.equal(e.act({ type: "placePiece", piece: "shade_cloth", ...MIDDLE }).ok, true);
    const near = startOyster(e, LEFT);
    const far = startOyster(e, RIGHT);
    e.step(WAIT);
    holdWeather(e, "hot");
    e.step(10 * SPM);
    return { near, far };
  };
  const moisture = bandFor(content, tuning, "oyster", "moisture");
  const light = bandFor(content, tuning, "oyster", "light");

  const on = run({});
  assert.equal(on.near.moisture, moisture.low, "the mister stops moisture at the bottom of the band");
  assert.ok(on.far.moisture < moisture.low, "a colony out of the mister's reach dries out");
  assert.equal(on.near.light, light.high, "the shade cloth stops light at the top of the band");
  assert.equal(on.far.light, light.high, "the shade cloth reaches both neighbours");

  const off = run({ envPieces: false });
  assert.ok(off.near.moisture < moisture.low, "with envPieces off the mister holds nothing");
  assert.ok(off.near.light > light.high);
});

test("all seven environment pieces can be placed; fixtures cannot", () => {
  const { e } = game();
  const spots = [LEFT, RIGHT, LEFT_TOP, MIDDLE, { x: g.startCol + 2, y: g.startRow }];
  assert.equal(content.environment.length, 7);
  for (const piece of content.environment) {
    assert.ok(tuning.pieceCost[piece.id] > 0, piece.id + " has a cost");
  }
  for (let i = 0; i < spots.length; i += 1) {
    assert.equal(e.act({ type: "placePiece", piece: content.environment[i].id, ...spots[i] }).ok, true);
  }
  const fresh = game().e;
  assert.match(fresh.act({ type: "placePiece", piece: "dock", ...LEFT }).reason, /cannot be placed yet/);
});

test("switch: weather off means nothing drifts", () => {
  const { e } = game({ weather: false });
  const colony = establishedOyster(e);
  assert.equal(e.state.weather.kind, null);
  e.step(30 * SPM);
  assert.deepEqual(levels(colony), CONDITIONS.map(middle));
});

test("switch: conditions off means no drift and no chores, even in hot sun", () => {
  const { e } = game({ conditions: false });
  const colony = establishedOyster(e);
  holdWeather(e, "hot");
  e.step(30 * SPM);
  assert.deepEqual(levels(colony), CONDITIONS.map(middle));
  standAt(e, LEFT.x + 0.5, LEFT.y + 0.5);
  assert.equal(e.act({ type: "tend", ...LEFT, condition: "moisture" }).ok, false);
});

for (const frozen of CONDITIONS) {
  test("switch: " + frozen + " off freezes only " + frozen, () => {
    const { e } = game({ [frozen]: false });
    const colony = establishedOyster(e);
    holdWeather(e, frozen === "air" ? "windy" : "hot");
    e.step(10 * SPM);
    assert.equal(colony[frozen], middle(frozen));
    const moved = CONDITIONS.filter((c) => colony[c] !== middle(c));
    assert.ok(moved.length >= 1 && !moved.includes(frozen), "the others still drift");
  });
}

test("with every switch off, the seed 1 scripted run matches the packet 01 stamp", () => {
  const s = runScripted(1, 30, { tuning: allFeaturesOff() }).engine.state;
  assert.equal(s.coins, 323);
  assert.equal(Object.keys(s.stats.foraged).length, 3);
  assert.equal(s.stats.coloniesStarted, 4);
  assert.equal(s.stats.chores, 0);
});

test("with every switch on and a tending player, the same seed gives an identical end state twice", () => {
  const a = runScripted(1, 30, { tend: true }).engine.state;
  const b = runScripted(1, 30, { tend: true }).engine.state;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.ok(a.stats.chores > 0, "the tending player did chores");
  assert.ok(a.coins > 0);
});
