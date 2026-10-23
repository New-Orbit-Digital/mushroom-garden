// The rules engine. No DOM, no canvas, no clock, no global randomness.
// Time moves only through step(seconds). Everything the player does goes
// through act(action). The same seed and the same calls give the same state.

import { seedToRngState, nextRandom, randomInt, weightedIndex } from "./rng.js";
import {
  featureOn, bandFor, bandMiddle, newColonyConditions, resetGrowTracking,
  updateColonyConditions, worstCondition, isInBand, conditionActive, conditionQualityBonus,
} from "./conditions.js";
import {
  cellKey, cellCentre, findById, inGrid, placeablePieces, pieceName, cellCost, canBuyCell,
  mushroomStage, needsAt, wildEligible, buyerPosition, isNear, salePrice, sporePrice, isEdge,
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
    player: { x: tuning.playerStart.x, y: tuning.playerStart.y, dirX: 0, dirY: 0, target: null },
    cells: {}, // owned cells only: key -> { x, y, piece, colony }
    cellsBought: 0,
    pieceCounts: {}, // piece id -> how many are placed
    wild: {}, // species id -> { x, y, present, regrowLeft }
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
    stats: { foraged: {}, coloniesStarted: 0, picked: 0, starsPicked: 0, chores: 0, sold: 0, sporesSold: 0, earned: 0 },
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
    movePlayer(dt);
    updateWeather(dt);
    updateWild(dt);
    updateColonies(dt);
    ageBasket(dt);
    updateBuyers(dt);
  }

  function clampToGarden(p) {
    p.x = Math.max(0, Math.min(g.cols, p.x));
    p.y = Math.max(0, Math.min(g.rows, p.y));
  }

  function movePlayer(dt) {
    const p = state.player;
    const stride = tuning.walkSpeed * dt;
    if (p.target) {
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= Math.max(stride, tuning.arriveDistance)) {
        p.x = p.target.x;
        p.y = p.target.y;
        p.target = null;
      } else {
        p.x += (dx / d) * stride;
        p.y += (dy / d) * stride;
      }
    } else {
      p.x += p.dirX * stride;
      p.y += p.dirY * stride;
    }
    clampToGarden(p);
  }

  function freeEdgeCell() {
    const free = [];
    for (let y = 0; y < g.rows; y += 1) {
      for (let x = 0; x < g.cols; x += 1) {
        if (!isEdge(tuning, x, y)) continue;
        let taken = false;
        for (const id of Object.keys(state.wild)) {
          const w = state.wild[id];
          if (w.present && w.x === x && w.y === y) taken = true;
        }
        if (!taken) free.push({ x, y });
      }
    }
    return free[randInt(0, free.length - 1)];
  }

  function updateWild(dt) {
    for (const species of content.species) {
      const w = state.wild[species.id];
      if (!w) {
        if (!wildEligible(state, content, species.id)) continue;
        const spot = freeEdgeCell();
        state.wild[species.id] = { x: spot.x, y: spot.y, present: true, regrowLeft: 0 };
        log("A wild " + species.name + " appeared at the edge.");
      } else if (!w.present) {
        w.regrowLeft -= dt;
        if (w.regrowLeft <= 0) {
          const spot = freeEdgeCell();
          w.x = spot.x;
          w.y = spot.y;
          w.present = true;
          w.regrowLeft = 0;
        }
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
      if (c.stage === "fruiting") {
        c.fruitLeft -= dt;
        if (c.fruitLeft <= 0) {
          c.fruitLeft = 0;
          c.stage = "established";
          log("The " + speciesName(c.species) + " colony is established.");
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
    log("A " + kind.name + (route === "creek" ? " is drifting down the creek." : " is walking in along the road."));
  }

  function updateBuyers(dt) {
    for (const route of ["creek", "road"]) {
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

  function actMove(a) {
    const p = state.player;
    if (a.to) {
      p.target = { x: a.to.x, y: a.to.y };
      clampToGarden(p.target);
      p.dirX = 0;
      p.dirY = 0;
      return { ok: true };
    }
    const dx = a.dir ? a.dir.x : 0;
    const dy = a.dir ? a.dir.y : 0;
    const d = Math.hypot(dx, dy);
    p.target = null;
    p.dirX = d > 0 ? dx / d : 0;
    p.dirY = d > 0 ? dy / d : 0;
    return { ok: true };
  }

  function basketFull() {
    return state.basket.length >= tuning.basketSize;
  }

  function actForage(a) {
    const w = state.wild[a.species];
    if (!w || !w.present) return refuse("nothing wild to forage there");
    if (!isNear(state, tuning, cellCentre(w.x, w.y))) return refuse("too far away");
    if (basketFull()) return refuse("the basket is full");
    const quality = rollQuality(null);
    state.basket.push({ species: a.species, quality, age: 0 });
    state.spores[a.species] = (state.spores[a.species] || 0) + 1;
    state.known[a.species] = true;
    state.stats.foraged[a.species] = (state.stats.foraged[a.species] || 0) + 1;
    w.present = false;
    w.regrowLeft = tierOf(a.species).wildRegrowMinutes * spm;
    log("Foraged a wild " + speciesName(a.species) + ": one mushroom and one spore.");
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
    if (!isNear(state, tuning, cellCentre(a.x, a.y))) return refuse("too far away");
    state.spores[a.species] -= 1;
    cell.colony = Object.assign({
      species: a.species,
      stage: "fruiting",
      fruitLeft: tierOf(a.species).waitMinutes * spm,
      grow: 0,
      ready: null, // { quality, waitLeft }
      pile: 0, // compost piles waiting to be collected
      composted: false,
    }, newColonyConditions(content, tuning, a.species)); // moisture, air, light, and this grow's time in band
    state.stats.coloniesStarted += 1;
    log("Started a " + speciesName(a.species) + " colony.");
    return { ok: true };
  }

  function colonyAt(a) {
    const cell = state.cells[cellKey(a.x, a.y)];
    return cell && cell.colony ? cell.colony : null;
  }

  function actPick(a) {
    const c = colonyAt(a);
    if (!c || !c.ready) return refuse("nothing ready to pick there");
    if (!isNear(state, tuning, cellCentre(a.x, a.y))) return refuse("too far away");
    if (basketFull()) return refuse("the basket is full");
    const quality = c.ready.quality;
    state.basket.push({ species: c.species, quality, age: 0 });
    state.known[c.species] = true;
    state.stats.picked += 1;
    state.stats.starsPicked += quality;
    c.ready = null;
    return { ok: true, quality };
  }

  function actCollectCompost(a) {
    const c = colonyAt(a);
    if (!c || c.pile <= 0) return refuse("no compost pile there");
    if (!isNear(state, tuning, cellCentre(a.x, a.y))) return refuse("too far away");
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
    if (!isNear(state, tuning, cellCentre(a.x, a.y))) return refuse("too far away");
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
    if (!isNear(state, tuning, cellCentre(a.x, a.y))) return refuse("too far away");
    const band = bandFor(content, tuning, c.species, condition);
    const chore = content.chores[condition][c[condition] < band.low ? "raise" : "lower"];
    c[condition] = bandMiddle(band);
    state.stats.chores += 1;
    return { ok: true, condition, chore };
  }

  function actSell(a) {
    const buyer = state.buyers.find((b) => b.id === a.buyer);
    if (!buyer) return refuse("that buyer has gone");
    if (!isNear(state, tuning, buyerPosition(tuning, buyer))) return refuse("too far away");
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
    return { ok: true, sold, earned };
  }

  function actBuyCell(a) {
    const why = canBuyCell(state, tuning, a.x, a.y);
    if (why) return refuse(why);
    const cost = cellCost(tuning, state.cellsBought);
    if (state.coins < cost) return refuse("a new cell costs " + cost + " coins");
    state.coins -= cost;
    state.cellsBought += 1;
    state.cells[cellKey(a.x, a.y)] = { x: a.x, y: a.y, piece: null, colony: null };
    return { ok: true, cost };
  }

  function actPlacePiece(a) {
    if (!findById(placeablePieces(content), a.piece)) return refuse("that piece cannot be placed yet");
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
    move: actMove,
    forage: actForage,
    startColony: actStartColony,
    pick: actPick,
    collectCompost: actCollectCompost,
    applyCompost: actApplyCompost,
    tend: actTend,
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
