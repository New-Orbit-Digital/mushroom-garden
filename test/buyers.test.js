import test from "node:test";
import assert from "node:assert/strict";
import { tuning, content, SPM, newGame, standAt, addBuyer, standByBuyer } from "../tools/testkit.js";
import { freshSeconds, salePrice } from "../src/engine/rules.js";

const driedAge = (id) => freshSeconds(tuning, id) + 1;

test("a restaurateur refuses dried mushrooms and takes fresh ones", () => {
  const e = newGame();
  const s = e.state;
  const buyer = addBuyer(e, "restaurateur", [{ species: "oyster", count: 3 }]);
  standByBuyer(e, buyer);
  s.basket.push({ species: "oyster", quality: 3, age: driedAge("oyster") });

  const refused = e.act({ type: "sell", buyer: buyer.id });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /dried/);
  assert.equal(s.basket.length, 1);
  assert.equal(s.coins, tuning.startCoins);

  const fresh = { species: "oyster", quality: 3, age: 0 };
  const price = salePrice(tuning, buyer, fresh);
  s.basket.push(fresh);
  const sold = e.act({ type: "sell", buyer: buyer.id });
  assert.equal(sold.ok, true);
  assert.equal(sold.sold, 1);
  assert.equal(s.coins, tuning.startCoins + price);
  assert.equal(s.basket.length, 1, "the dried one stays in the basket");
  assert.equal(buyer.wants[0].count, 2);
});

test("the travelling merchant pays the dried bonus", () => {
  const e = newGame();
  const s = e.state;
  const buyer = addBuyer(e, "merchant", [{ species: "morel", count: 2 }]);
  standByBuyer(e, buyer);
  s.basket.push({ species: "morel", quality: 3, age: driedAge("morel") });

  const sp = tuning.species.morel;
  const base = sp.price * (1 + tuning.unstablePremium * (1 - sp.stab)) *
    tuning.qualityPrice[3 - tuning.minQuality] * tuning.buyers.merchant.pays * tuning.driedShare;
  const withBonus = Math.round(base * tuning.buyers.merchant.driedBonus);

  const sold = e.act({ type: "sell", buyer: buyer.id });
  assert.equal(sold.ok, true);
  assert.equal(sold.earned, withBonus);
  assert.ok(withBonus > Math.round(base), "the bonus pays more than plain dried");
});

test("dried sells for driedShare of fresh; quality and the buyer's favourite raise the price", () => {
  const e = newGame();
  const buyer = addBuyer(e, "market_boat", [{ species: "truffle", count: 2 }]);
  const fresh = salePrice(tuning, buyer, { species: "truffle", quality: 3, age: 0 });
  const dried = salePrice(tuning, buyer, { species: "truffle", quality: 3, age: driedAge("truffle") });
  assert.ok(Math.abs(dried - fresh * tuning.driedShare) <= 1);
  const top = salePrice(tuning, buyer, { species: "truffle", quality: tuning.maxQuality, age: 0 });
  assert.ok(top > fresh);
  buyer.favourite = "truffle";
  assert.ok(salePrice(tuning, buyer, { species: "truffle", quality: 3, age: 0 }) > fresh);
});

test("selling out of reach is refused", () => {
  const e = newGame();
  const s = e.state;
  const buyer = addBuyer(e, "market_boat", [{ species: "oyster", count: 3 }]);
  s.basket.push({ species: "oyster", quality: 3, age: 0 });
  standAt(e, 1, tuning.grid.rows - 1);
  const far = e.act({ type: "sell", buyer: buyer.id });
  assert.equal(far.ok, false);
  assert.match(far.reason, /too far/);
  assert.equal(s.basket.length, 1);
  standByBuyer(e, buyer);
  assert.equal(e.act({ type: "sell", buyer: buyer.id }).ok, true);
});

test("a buyer takes only what it asked for, up to the count", () => {
  const e = newGame();
  const s = e.state;
  const buyer = addBuyer(e, "market_boat", [{ species: "oyster", count: 2 }]);
  standByBuyer(e, buyer);
  for (let i = 0; i < 3; i += 1) s.basket.push({ species: "oyster", quality: 3, age: 0 });
  s.basket.push({ species: "wine_cap", quality: 3, age: 0 });
  const sold = e.act({ type: "sell", buyer: buyer.id });
  assert.equal(sold.sold, 2);
  assert.equal(s.basket.length, 2);
  assert.match(e.act({ type: "sell", buyer: buyer.id }).reason, /nothing in the basket/);
});

test("only the merchant buys spare spores, and one of each is kept", () => {
  const e = newGame();
  const s = e.state;
  s.spores.oyster = 3;
  const boat = addBuyer(e, "market_boat", [{ species: "oyster", count: 2 }]);
  standByBuyer(e, boat);
  assert.match(e.act({ type: "sell", buyer: boat.id, what: "spores" }).reason, /does not buy spores/);

  const merchant = addBuyer(e, "merchant", [{ species: "oyster", count: 2 }]);
  standByBuyer(e, merchant);
  const sold = e.act({ type: "sell", buyer: merchant.id, what: "spores" });
  assert.equal(sold.ok, true);
  assert.equal(sold.sold, 3 - tuning.keepSpores);
  assert.equal(s.spores.oyster, tuning.keepSpores);
  assert.ok(s.coins > tuning.startCoins);
});

test("buyers arrive on their own with two or three wants, by creek and by road, and leave", () => {
  const e = newGame();
  const s = e.state;
  const seenRoutes = {};
  const kindIds = content.buyers.map((b) => b.id);
  let visits = 0;
  let lastId = 0;
  for (let t = 0; t < 40 * SPM; t += 1) {
    e.step(1);
    for (const b of s.buyers) {
      if (b.id <= lastId) continue;
      lastId = b.id;
      visits += 1;
      seenRoutes[b.route] = true;
      assert.ok(kindIds.includes(b.kind));
      assert.ok(b.wants.length >= tuning.wantSpeciesMin && b.wants.length <= tuning.wantSpeciesMax);
      for (const w of b.wants) assert.ok(w.count >= tuning.wantCountMin && w.count <= tuning.wantCountMax);
      assert.equal(new Set(b.wants.map((w) => w.species)).size, b.wants.length, "no species twice");
      const stay = b.route === "creek" ? tuning.creek.stayMinutes : tuning.land.stayMinutes + tuning.land.walkMinutes * 2;
      assert.equal(b.total, stay * SPM);
    }
  }
  assert.ok(visits >= 5);
  assert.deepEqual(Object.keys(seenRoutes).sort(), ["creek", "road"]);
  assert.ok(s.buyers.length <= 2, "buyers leave when their time is up");
});
