// The rules engine. No DOM, no canvas, no clock, no global randomness.
// Time moves only through step(seconds). Everything the player does goes
// through act(action). The same seed and the same calls give the same state.

import { seedToRngState, nextRandom, randomInt, weightedIndex } from "./rng.js";
import {
  featureOn, bandFor, bandMiddle, newColonyConditions, resetGrowTracking,
  updateColonyConditions, worstCondition, isInBand, conditionActive, conditionQualityBonus,
} from "./conditions.js";
import {
  cellKey, findById, inGrid, placeablePieces, pieceName, cellCost, canBuyCell,
  mushroomStage, needsAt, appearEligible, visitEligible, salePrice, sporePrice, isEdge,
  LADDER, spreadPlan, aOrAn, rankFromXp, titleFor, releasesAt, pieceReleased, routeReleased, cellCap,
} from "./rules.js";

export function createEngine(options) {
  const tuning = options.tuning;
  const content = options.content;
  const spm = tuning.secondsPerMinute;
  const g = tuning.grid;
  const seed = options.seed === undefined || options.seed === null ? tuning.defaultSeed : options.seed;

  const state = {
    seed,
    rngState: seedToRngState(seed, tuning.rng),
    time: 0, // seconds played
    coins: tuning.startCoins,
    compost: 0,
    spores: {}, // species id -> count
    basket: [], // { species, quality, age (seconds) }
    cells: {}, // owned cells only: key -> { x, y, piece, colony }
    cellsBought: 0,
    pieceCounts: {}, // piece id -> how many are placed
    wild: {}, // species id -> { x, y, present (a flush to forage), outline (appeared, not ready to forage), regrowLeft }
    // Weather has its own random stream, so switching it on or off never changes any other roll.
    weather: {
      rngState: (seedToRngState(seed, tuning.rng) + tuning.rng.weatherSalt) % tuning.rng.modulus,
      kind: null, // current weather id, or null when weather is switched off
      next: null, // the weather that comes after
      left: 0, // seconds until it changes
    },
    buyers: [],
    nextBuyerId: 1,
    timers: { creek: tuning.creek.firstMinutes * spm, road: tuning.land.firstMinutes * spm },
    known: {}, // species the player has held at least once
    ladder: {}, // species id -> the highest ladder step reached: appear, visit, resident or spread
    awards: {}, // award id -> the time (seconds played) it was earned; each is earned once
    xp: 0, // experience from awards; it fills the rank clock
    rank: 1, // the rank the experience has reached
    stats: { foraged: {}, coloniesStarted: 0, spreads: 0, picked: 0, starsPicked: 0, chores: 0, sold: 0, sporesSold: 0, earned: 0 },
    events: [], // recent messages: { time, text }
  };

  for (let dx = 0; dx < g.startCols; dx += 1) {
    for (let dy = 0; dy < g.startRows; dy += 1) {
      const x = g.startCol + dx;
      const y = g.startRow + dy;
      state.cells[cellKey(x, y)] = { x, y, piece: null, colony: null };
    }
  }

  const rand = () => nextRandom(state, tuning.rng);
  const randInt = (min, max) => randomInt(state, tuning.rng, min, max);
  const speciesName = (id) => findById(content.species, id).name;
  const tierOf = (id) => tuning.tiers[tuning.species[id].tier];
  const refuse = (reason) => ({ ok: false, reason });

  function log(text) {
    state.events.push({ time: state.time, text });
    while (state.events.length > tuning.eventLogSize) state.events.shift();
  }

  // ---------- journal awards ----------
  // Each award is earned once and adds its experience. Awards are the only source of experience.

  function grant(id, kind, text) {
    if (state.awards[id] !== undefined) return false;
    const xp = tuning.awards.xp[kind];
    state.awards[id] = state.time;
    state.xp += xp;
    log("Journal: " + text + " (+" + xp + " xp).");
    const reached = rankFromXp(tuning, state.xp);
    while (state.rank < reached) {
      state.rank += 1;
      const releases = releasesAt(content, tuning, state.rank);
      log("Rank " + state.rank + ", " + titleFor(content, tuning, state.rank) + "." + (releases.length ? " New: " + releases.join(", ") + "." : ""));
    }
    return true;
  }

  const stepText = {
    appear: (name) => name + " appeared at the edge",
    visit: (name) => "first " + name + " foraged",
    resident: (name) => "first " + name + " colony established",
    spread: (name) => name + " spread for the first time",
  };

  // Reaching a step also grants any earlier step not yet earned, so the ladder has no gaps.
  function reachStep(speciesId, step) {
    const target = LADDER.indexOf(step);
    for (let i = 0; i <= target; i += 1) {
      const s = LADDER[i];
      grant(s + ":" + speciesId, s, stepText[s](speciesName(speciesId)));
    }
    const current = state.ladder[speciesId] ? LADDER.indexOf(state.ladder[speciesId]) : -1;
    if (target > current) state.ladder[speciesId] = step;
  }

  // ---------- weather ----------

  function rollWeather() {
    const weights = content.weather.map((w) => tuning.weather.kinds[w.id].weight);
    return content.weather[weightedIndex(state.weather, tuning.rng, weights)].id;
  }

  if (featureOn(tuning, "weather")) {
    state.weather.kind = rollWeather();
    state.weather.next = rollWeather();
    state.weather.left = tuning.weather.changeMinutes * spm;
  }

  function updateWeather(dt) {
    const w = state.weather;
    if (!w.kind) return;
    w.left -= dt;
    if (w.left > 0) return;
    w.kind = w.next;
    w.next = rollWeather();
    w.left += tuning.weather.changeMinutes * spm;
    log("The weather turns: " + findById(content.weather, w.kind).name + ".");
  }

  // ---------- quality ----------

  // colony is null for a wild mushroom. Luck, plus compost, plus how the grow's conditions went.
  function rollQuality(colony) {
    let stars = tuning.minQuality + weightedIndex(state, tuning.rng, tuning.qualityWeights);
    if (colony && colony.composted) stars += tuning.compostQualityBonus;
    stars += conditionQualityBonus(state, colony, tuning);
    return Math.max(tuning.minQuality, Math.min(tuning.maxQuality, Math.round(stars)));
  }

  // ---------- time ----------

  function step(seconds) {
    let left = seconds;
    while (left > 0) {
      const dt = Math.min(left, tuning.tickSeconds);
      tick(dt);
      left -= dt;
    }
  }

  function tick(dt) {
    state.time += dt;
    updateWeather(dt);
    updateWild(dt);
    updateColonies(dt);
    ageBasket(dt);
    updateBuyers(dt);
  }

  function freeEdgeCell() {
    const free = [];
    for (let y = 0; y < g.rows; y += 1) {
      for (let x = 0; x < g.cols; x += 1) {
        if (!isEdge(tuning, x, y)) continue;
        let taken = false;
        for (const id of Object.keys(state.wild)) {
          const w = state.wild[id];
          if ((w.present || w.outline) && w.x === x && w.y === y) taken = true;
        }
        if (!taken) free.push({ x, y });
      }
    }
    return free[randInt(0, free.length - 1)];
  }

  // Appear: an outline at the edge. Visit: the outline becomes a flush that can be foraged.
  // After foraging, it regrows somewhere on the edge: a flush if Visit still holds, else an outline.
  function updateWild(dt) {
    for (const species of content.species) {
      const id = species.id;
      let w = state.wild[id];
      if (!w) {
        if (!appearEligible(state, content, tuning, id)) continue;
        const spot = freeEdgeCell();
        w = { x: spot.x, y: spot.y, present: false, outline: true, regrowLeft: 0 };
        state.wild[id] = w;
        reachStep(id, "appear");
      }
      if (w.present) continue;
      if (w.regrowLeft > 0) {
        w.regrowLeft -= dt;
        if (w.regrowLeft > 0) continue;
        w.regrowLeft = 0;
        const spot = freeEdgeCell();
        w.x = spot.x;
        w.y = spot.y;
        w.outline = true;
      }
      if (w.outline && visitEligible(state, content, id)) {
        w.outline = false;
        w.present = true;
        if (state.ladder[id] === "appear") log("A wild " + species.name + " is flushing at the edge.");
      }
    }
  }

  function updateColonies(dt) {
    for (const key of Object.keys(state.cells)) {
      const cell = state.cells[key];
      const c = cell.colony;
      if (!c) continue;
      const tier = tierOf(c.species);
      const rate = c.stage === "fruiting" ? tuning.fruitingGrowRate : 1;
      updateColonyConditions(state, content, tuning, cell, dt);
      if (c.restLeft > 0) c.restLeft = Math.max(0, c.restLeft - dt);
      if (c.stage === "fruiting") {
        c.fruitLeft -= dt;
        if (c.fruitLeft <= 0) {
          c.fruitLeft = 0;
          c.stage = "established";
          log("The " + speciesName(c.species) + " colony is established.");
          reachStep(c.species, "resident");
          checkSeven(c.species);
        }
      }
      if (c.ready) {
        c.ready.waitLeft -= dt;
        if (c.ready.waitLeft <= 0) {
          // Unpicked: straight to a compost pile where it stands. No spore.
          c.ready = null;
          c.pile += 1;
        }
      } else {
        c.grow += dt * rate;
        if (c.grow >= tier.growMinutes * spm) {
          c.grow = 0;
          c.ready = { quality: rollQuality(c), waitLeft: tuning.unpickedMinutes * spm };
          c.composted = false; // compost lasts one grow
          resetGrowTracking(c);
        }
      }
    }
  }

  function checkSeven(speciesId) {
    let count = 0;
    for (const key of Object.keys(state.cells)) {
      const other = state.cells[key].colony;
      if (other && other.species === speciesId && other.stage === "established") count += 1;
    }
    if (count >= tuning.sevenColonies) {
      grant("seven:" + speciesId, "seven", tuning.sevenColonies + " " + speciesName(speciesId) + " colonies at once");
    }
  }

  function ageBasket(dt) {
    const kept = [];
    for (const m of state.basket) {
      m.age += dt;
      if (mushroomStage(tuning, m) === "spent") {
        // Nothing is lost: it breaks down into one compost and one spore.
        state.compost += 1;
        state.spores[m.species] = (state.spores[m.species] || 0) + 1;
        log("A dried " + speciesName(m.species) + " broke down into compost and a spore.");
      } else {
        kept.push(m);
      }
    }
    state.basket = kept;
  }

  // ---------- buyers ----------

  function rollWants() {
    let pool = content.species.filter((s) => state.known[s.id] || state.wild[s.id]);
    if (pool.length < tuning.wantSpeciesMin) {
      const extra = content.species.filter(
        (s) => tuning.species[s.id].tier === tuning.starterTier && pool.indexOf(s) < 0,
      );
      pool = pool.concat(extra);
    }
    const howMany = Math.min(randInt(tuning.wantSpeciesMin, tuning.wantSpeciesMax), pool.length);
    const wants = [];
    for (let i = 0; i < howMany; i += 1) {
      const weights = pool.map((s) => tierOf(s.id).demandWeight);
      const at = weightedIndex(state, tuning.rng, weights);
      wants.push({ species: pool[at].id, count: randInt(tuning.wantCountMin, tuning.wantCountMax) });
      pool = pool.filter((s, index) => index !== at);
    }
    return wants;
  }

  function spawnBuyer(route) {
    const kinds = content.buyers.filter((b) => b.route === route);
    const kind = kinds[randInt(0, kinds.length - 1)];
    const wants = rollWants();
    const cfg = route === "creek" ? tuning.creek : tuning.land;
    const walk = route === "creek" ? 0 : tuning.land.walkMinutes * 2;
    const buyer = {
      id: state.nextBuyerId,
      kind: kind.id,
      route,
      wants,
      favourite: wants[randInt(0, wants.length - 1)].species,
      elapsed: 0,
      total: (cfg.stayMinutes + walk) * spm,
    };
    state.nextBuyerId += 1;
    state.buyers.push(buyer);
    const who = aOrAn(kind.name);
    log(who.charAt(0).toUpperCase() + who.slice(1) + (route === "creek" ? " is drifting down the creek." : " is walking in along the road."));
  }

  function updateBuyers(dt) {
    for (const route of ["creek", "road"]) {
      if (!routeReleased(state, tuning, route)) continue; // its first visit is timed from the rank that opens it
      const cfg = route === "creek" ? tuning.creek : tuning.land;
      state.timers[route] -= dt;
      if (state.timers[route] <= 0) {
        const jitter = cfg.jitterMinutes * (rand() * 2 - 1);
        state.timers[route] = (cfg.everyMinutes + jitter) * spm;
        if (!state.buyers.some((b) => b.route === route)) spawnBuyer(route);
      }
    }
    for (const buyer of state.buyers) buyer.elapsed += dt;
    state.buyers = state.buyers.filter((b) => b.elapsed < b.total);
  }

  // ---------- actions ----------

  function basketFull() {
    return state.basket.length >= tuning.basketSize;
  }

  function actForage(a) {
    const w = state.wild[a.species];
    if (!w || !w.present) {
      if (w && w.outline) return refuse("the " + speciesName(a.species) + " is only an outline so far");
      return refuse("nothing wild to forage there");
    }
    if (basketFull()) return refuse("the basket is full");
    const quality = rollQuality(null);
    state.basket.push({ species: a.species, quality, age: 0 });
    state.spores[a.species] = (state.spores[a.species] || 0) + 1;
    state.known[a.species] = true;
    state.stats.foraged[a.species] = (state.stats.foraged[a.species] || 0) + 1;
    w.present = false;
    w.regrowLeft = tierOf(a.species).wildRegrowMinutes * spm;
    log("Foraged a wild " + speciesName(a.species) + ": one mushroom and one spore.");
    reachStep(a.species, "visit");
    return { ok: true, quality };
  }

  function actStartColony(a) {
    if (!findById(content.species, a.species)) return refuse("unknown species");
    if (!(state.spores[a.species] > 0)) return refuse("no " + speciesName(a.species) + " spore");
    const cell = state.cells[cellKey(a.x, a.y)];
    if (!cell) return refuse("that cell is not yours");
    if (cell.piece || cell.colony) return refuse("that cell is not free");
    const needs = needsAt(state, content, tuning, a.species, a.x, a.y);
    if (!needs.ok) return refuse(speciesName(a.species) + " needs " + needs.missing.join(" and ") + " next to it");
    state.spores[a.species] -= 1;
    cell.colony = newColony(a.species);
    state.stats.coloniesStarted += 1;
    log("Started " + aOrAn(speciesName(a.species)) + " colony.");
    return { ok: true };
  }

  function newColony(speciesId) {
    return Object.assign({
      species: speciesId,
      stage: "fruiting",
      fruitLeft: tierOf(speciesId).waitMinutes * spm,
      grow: 0,
      ready: null, // { quality, waitLeft }
      pile: 0, // compost piles waiting to be collected
      composted: false,
      restLeft: 0, // seconds left resting after a Spread
    }, newColonyConditions(content, tuning, speciesId)); // moisture, air, light, and this grow's time in band
  }

  // Spread: two established colonies of a species, side by side with its home piece, make a third.
  function actSpread(a) {
    const plan = spreadPlan(state, content, tuning, a.x, a.y);
    if (!plan.ok) return refuse(plan.reason);
    const source = state.cells[cellKey(a.x, a.y)].colony;
    plan.target.colony = newColony(source.species);
    source.restLeft = tuning.spreadRestMinutes * spm;
    plan.partner.colony.restLeft = tuning.spreadRestMinutes * spm;
    state.stats.spreads += 1;
    log("The " + speciesName(source.species) + " colonies spread to a new cell.");
    reachStep(source.species, "spread");
    return { ok: true, x: plan.target.x, y: plan.target.y };
  }

  function colonyAt(a) {
    const cell = state.cells[cellKey(a.x, a.y)];
    return cell && cell.colony ? cell.colony : null;
  }

  function actPick(a) {
    const c = colonyAt(a);
    if (!c || !c.ready) return refuse("nothing ready to pick there");
    if (basketFull()) return refuse("the basket is full");
    const quality = c.ready.quality;
    state.basket.push({ species: c.species, quality, age: 0 });
    state.known[c.species] = true;
    state.stats.picked += 1;
    state.stats.starsPicked += quality;
    c.ready = null;
    if (quality >= tuning.maxQuality) {
      grant("fiveStar:" + c.species, "fiveStar", "first " + tuning.maxQuality + "-star " + speciesName(c.species));
    }
    return { ok: true, quality };
  }

  function actCollectCompost(a) {
    const c = colonyAt(a);
    if (!c || c.pile <= 0) return refuse("no compost pile there");
    const amount = c.pile;
    state.compost += amount;
    c.pile = 0;
    return { ok: true, amount };
  }

  function actApplyCompost(a) {
    const c = colonyAt(a);
    if (!c) return refuse("no colony there");
    if (state.compost <= 0) return refuse("no compost");
    if (c.composted) return refuse("that colony already has compost");
    state.compost -= 1;
    c.composted = true;
    return { ok: true };
  }

  // A chore: put one condition of an established colony back in the middle of its band.
  // Without a.condition it fixes whichever is furthest out.
  function actTend(a) {
    const c = colonyAt(a);
    if (!c) return refuse("no colony there");
    if (!featureOn(tuning, "conditions")) return refuse("colonies need no tending");
    if (c.stage !== "established") return refuse("a fruiting colony needs no tending");
    const worst = worstCondition(content, tuning, c);
    const condition = a.condition || (worst ? worst.condition : null);
    if (!condition || content.conditions.indexOf(condition) < 0) return refuse("that colony is fine as it is");
    if (!conditionActive(tuning, condition) || isInBand(content, tuning, c, condition)) {
      return refuse("its " + condition + " is fine as it is");
    }
    const band = bandFor(content, tuning, c.species, condition);
    const chore = content.chores[condition][c[condition] < band.low ? "raise" : "lower"];
    c[condition] = bandMiddle(band);
    state.stats.chores += 1;
    return { ok: true, condition, chore };
  }

  function actSell(a) {
    const buyer = state.buyers.find((b) => b.id === a.buyer);
    if (!buyer) return refuse("that buyer has gone");
    const kind = findById(content.buyers, buyer.kind);
    let earned = 0;
    let sold = 0;

    if (a.what === "spores") {
      if (!kind.buysSpores) return refuse("the " + kind.name + " does not buy spores");
      for (const id of Object.keys(state.spores)) {
        while (state.spores[id] > tuning.keepSpores) {
          state.spores[id] -= 1;
          earned += sporePrice(tuning, buyer, id);
          sold += 1;
        }
      }
      if (sold === 0) return refuse("no spare spores to sell");
      state.coins += earned;
      state.stats.sporesSold += sold;
      state.stats.earned += earned;
      log("Sold " + sold + " spare spores for " + earned + " coins.");
      grant("sale:" + kind.id, "sale", "first sale to " + aOrAn(kind.name));
      return { ok: true, sold, earned };
    }

    let driedRefused = false;
    for (const want of buyer.wants) {
      while (want.count > 0) {
        let best = -1;
        for (let i = 0; i < state.basket.length; i += 1) {
          const m = state.basket[i];
          if (m.species !== want.species) continue;
          const dried = mushroomStage(tuning, m) === "dried";
          if (dried && !kind.acceptsDried) {
            driedRefused = true;
            continue;
          }
          if (best < 0 || salePrice(tuning, buyer, m) > salePrice(tuning, buyer, state.basket[best])) best = i;
        }
        if (best < 0) break;
        earned += salePrice(tuning, buyer, state.basket[best]);
        state.basket.splice(best, 1);
        want.count -= 1;
        sold += 1;
      }
    }
    if (sold === 0) {
      if (driedRefused) return refuse("the " + kind.name + " does not take dried mushrooms");
      return refuse("nothing in the basket that the " + kind.name + " wants");
    }
    state.coins += earned;
    state.stats.sold += sold;
    state.stats.earned += earned;
    log("Sold " + sold + " to the " + kind.name + " for " + earned + " coins.");
    grant("sale:" + kind.id, "sale", "first sale to " + aOrAn(kind.name));
    return { ok: true, sold, earned };
  }

  function actBuyCell(a) {
    const why = canBuyCell(state, tuning, a.x, a.y);
    if (why) return refuse(why);
    const cap = cellCap(state, tuning);
    if (Object.keys(state.cells).length >= cap.cells) {
      return refuse(cap.nextRank === null ? "the garden is as big as it gets" : "the garden can't grow past " + cap.cells + " cells until rank " + cap.nextRank);
    }
    const cost = cellCost(tuning, state.cellsBought);
    if (state.coins < cost) return refuse("a new cell costs " + cost + " coins");
    state.coins -= cost;
    state.cellsBought += 1;
    state.cells[cellKey(a.x, a.y)] = { x: a.x, y: a.y, piece: null, colony: null };
    return { ok: true, cost };
  }

  function actPlacePiece(a) {
    if (!findById(placeablePieces(content), a.piece)) return refuse("that piece cannot be placed yet");
    if (!pieceReleased(state, tuning, a.piece)) return refuse(pieceName(content, a.piece) + " opens at rank " + tuning.pieceRank[a.piece]);
    if (!inGrid(tuning, a.x, a.y)) return refuse("outside the garden");
    const cell = state.cells[cellKey(a.x, a.y)];
    if (!cell) return refuse("that cell is not yours");
    if (cell.piece || cell.colony) return refuse("that cell is not free");
    const cost = tuning.pieceCost[a.piece];
    if (state.coins < cost) return refuse(pieceName(content, a.piece) + " costs " + cost + " coins");
    state.coins -= cost;
    cell.piece = a.piece;
    state.pieceCounts[a.piece] = (state.pieceCounts[a.piece] || 0) + 1;
    log("Placed " + pieceName(content, a.piece) + ".");
    return { ok: true, cost };
  }

  const handlers = {
    forage: actForage,
    startColony: actStartColony,
    pick: actPick,
    collectCompost: actCollectCompost,
    applyCompost: actApplyCompost,
    tend: actTend,
    spread: actSpread,
    sell: actSell,
    buyCell: actBuyCell,
    placePiece: actPlacePiece,
  };

  // The one door for player intent. Returns { ok: true, ... } or { ok: false, reason }.
  function act(action) {
    const handler = action && handlers[action.type];
    if (!handler) return refuse("unknown action");
    return handler(action);
  }

  return { state, step, act };
}
