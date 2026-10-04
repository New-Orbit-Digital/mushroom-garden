// Shared setup for the tests in test/. Kept outside test/ so the test runner
// does not count it as a test file.
// These helpers reach into state directly. That is for arranging a test only;
// the game itself (and the scripted run) goes through engine.act().

import { tuning } from "../shared/tuning.js";
import { content } from "../shared/content.js";
import { createEngine } from "../src/engine/engine.js";

export { tuning, content };
export const SPM = tuning.secondsPerMinute;

export function newGame(seed = 1) {
  return createEngine({ tuning, content, seed });
}

export function standAt(engine, x, y) {
  engine.state.player.x = x;
  engine.state.player.y = y;
}

// Puts a buyer of a given kind in the middle of its stay.
export function addBuyer(engine, kindId, wants, favourite = null) {
  const s = engine.state;
  const kind = content.buyers.find((b) => b.id === kindId);
  const creek = kind.route === "creek";
  const walk = creek ? 0 : tuning.land.walkMinutes * SPM;
  const stay = (creek ? tuning.creek.stayMinutes : tuning.land.stayMinutes) * SPM;
  const buyer = {
    id: s.nextBuyerId,
    kind: kindId,
    route: kind.route,
    wants,
    favourite,
    elapsed: walk + stay / 2,
    total: stay + walk * 2,
  };
  s.nextBuyerId += 1;
  s.buyers.push(buyer);
  return buyer;
}

// Where to stand to be next to a buyer added with addBuyer.
export function standByBuyer(engine, buyer) {
  if (buyer.route === "creek") standAt(engine, tuning.grid.cols / 2, 0.2);
  else standAt(engine, tuning.land.standX, tuning.grid.rows - 0.2);
}
