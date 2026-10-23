// Shared setup for the tests in test/. Kept outside test/ so the test runner
// does not count it as a test file.
// These helpers reach into state directly. That is for arranging a test only;
// the game itself (and the scripted run) goes through engine.act().

import { tuning } from "../shared/tuning.js";
import { content } from "../shared/content.js";
import { createEngine } from "../src/engine/engine.js";

export { tuning, content };
export const SPM = tuning.secondsPerMinute;

// The shared tuning with the rank clock switched off: everything open from the start.
// Tests of earlier features use it so they can place any piece; test/ranks.test.js uses the shared tuning.
export const openTuning = structuredClone(tuning);
openTuning.features.ranks = false;

export function newGame(seed = 1) {
  return createEngine({ tuning: openTuning, content, seed });
}

// A game under the shared tuning, ranks and all.
export function rankedGame(seed = 1) {
  return createEngine({ tuning, content, seed });
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
