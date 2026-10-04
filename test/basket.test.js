import test from "node:test";
import assert from "node:assert/strict";
import { tuning, SPM, newGame, standAt } from "../tools/testkit.js";
import { freshSeconds, mushroomStage } from "../src/engine/rules.js";

test("fresh time follows freshBase x (freshFloor + freshStabScale x stab)", () => {
  const expected = tuning.freshBase * (tuning.freshFloor + tuning.freshStabScale * tuning.species.oyster.stab) * SPM;
  assert.equal(freshSeconds(tuning, "oyster"), expected);
  assert.ok(freshSeconds(tuning, "shaggy_mane") < freshSeconds(tuning, "shiitake"), "unstable species turn sooner");
});

test("a basket mushroom goes fresh, then dried, then one compost and one spore", () => {
  const e = newGame();
  const s = e.state;
  s.basket.push({ species: "oyster", quality: 3, age: 0 });
  const fresh = Math.round(freshSeconds(tuning, "oyster"));
  const dried = fresh * tuning.driedFactor;

  e.step(fresh - 1);
  assert.equal(mushroomStage(tuning, s.basket[0]), "fresh");
  e.step(1);
  assert.equal(mushroomStage(tuning, s.basket[0]), "dried");

  e.step(dried - 1);
  assert.equal(s.basket.length, 1);
  assert.equal(mushroomStage(tuning, s.basket[0]), "dried");
  assert.equal(s.compost, 0);

  e.step(1);
  assert.equal(s.basket.length, 0);
  assert.equal(s.compost, 1);
  assert.equal(s.spores.oyster, 1);
});

test("a full basket refuses more, and nothing is lost by the refusal", () => {
  const e = newGame();
  const s = e.state;
  e.act({ type: "placePiece", piece: "straw_bed", x: tuning.grid.startCol, y: tuning.grid.startRow });
  e.step(1);
  for (let i = 0; i < tuning.basketSize; i += 1) s.basket.push({ species: "oyster", quality: 3, age: 0 });
  const w = s.wild.oyster;
  standAt(e, w.x + 0.5, w.y + 0.5);
  const result = e.act({ type: "forage", species: "oyster" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /full/);
  assert.equal(s.wild.oyster.present, true);
});
