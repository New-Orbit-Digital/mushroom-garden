// A scripted player that plays through the actions API only: it reads state to decide,
// and changes the game only with engine.act() and engine.step().
// Cursor only: there is no walking, so each action instead costs tuning.bot.secondsPerAction
// of game time, standing in for a person moving the cursor and clicking.
// Used by the scripted tests and tools/stamp.mjs.
// options.tuning: a tuning object to play under (default: shared/tuning.js).
// options.tend: true makes it do chores; false or missing makes it neglect them.
// options.explore: true makes it try each released habitat piece once, like a curious player;
//   false or missing keeps packet 03's behaviour (a straw bed, then wood chips), so its baseline holds.

import { tuning as sharedTuning } from "../shared/tuning.js";
import { content } from "../shared/content.js";
import { createEngine } from "../src/engine/engine.js";
import { needsAt, mushroomStage, findById, spreadPlan, canBuyCell, cellCost, placeablePieces, pieceReleased } from "../src/engine/rules.js";
import { worstCondition } from "../src/engine/conditions.js";

export function runScripted(seed, minutes, options = {}) {
  const tuning = options.tuning || sharedTuning;
  const engine = createEngine({ tuning, content, seed });
  const s = engine.state;
  const end = minutes * tuning.secondsPerMinute;
  let acts = 0;
  const act = (a) => {
    acts += 1;
    const result = engine.act(a);
    if (result.ok) engine.step(tuning.bot.secondsPerAction);
    return result;
  };

  const cells = () => Object.values(s.cells);
  const start = tuning.grid;
  const bed = { x: start.startCol, y: start.startRow };

  // Opening move: a straw bed on the first owned cell.
  act({ type: "placePiece", piece: "straw_bed", ...bed });

  function doSomething() {
    // 1. Sell to a buyer who wants something we hold.
    for (const buyer of s.buyers) {
      const kind = findById(content.buyers, buyer.kind);
      const sellable = buyer.wants.some(
        (w) => w.count > 0 && s.basket.some(
          (m) => m.species === w.species && (kind.acceptsDried || mushroomStage(tuning, m) === "fresh"),
        ),
      );
      if (sellable) return act({ type: "sell", buyer: buyer.id }).ok;
    }
    const room = s.basket.length < tuning.basketSize;
    // 2. Pick anything ready.
    for (const cell of cells()) {
      if (room && cell.colony && cell.colony.ready) return act({ type: "pick", x: cell.x, y: cell.y }).ok;
    }
    // 2b. Chores, when this player tends: fix whichever condition is furthest out.
    if (options.tend) {
      for (const cell of cells()) {
        const worst = cell.colony ? worstCondition(content, tuning, cell.colony) : null;
        if (worst) return act({ type: "tend", x: cell.x, y: cell.y, condition: worst.condition }).ok;
      }
    }
    // 3. Collect compost piles.
    for (const cell of cells()) {
      if (cell.colony && cell.colony.pile > 0) return act({ type: "collectCompost", x: cell.x, y: cell.y }).ok;
    }
    // 4. Spend compost on a colony.
    if (s.compost > 0) {
      for (const cell of cells()) {
        if (cell.colony && !cell.colony.composted) return act({ type: "applyCompost", x: cell.x, y: cell.y }).ok;
      }
    }
    // 5. Spread wherever two colonies can.
    for (const cell of cells()) {
      if (cell.colony && spreadPlan(s, content, tuning, cell.x, cell.y).ok) return act({ type: "spread", x: cell.x, y: cell.y }).ok;
    }
    // 6. Start a colony wherever a held spore's needs are met.
    for (const species of content.species) {
      if (!(s.spores[species.id] > 0)) continue;
      for (const cell of cells()) {
        if (cell.piece || cell.colony) continue;
        if (!needsAt(s, content, tuning, species.id, cell.x, cell.y).ok) continue;
        return act({ type: "startColony", species: species.id, x: cell.x, y: cell.y }).ok;
      }
    }
    // 7. Forage whatever is flushing.
    for (const id of Object.keys(s.wild)) {
      if (room && s.wild[id].present) return act({ type: "forage", species: id }).ok;
    }
    // 8. Explorer: try each released habitat piece once, cheapest first, like a curious player: place it
    //    on a free cell when it can be afforded with the reserve kept back.
    // 8b. Otherwise (packet 03 behaviour): add wood chips on the far corner so a second species turns up.
    const corner = { x: start.startCol + start.startCols - 1, y: start.startRow };
    const cornerCell = s.cells[corner.x + "," + corner.y];
    if (!options.explore && !s.pieceCounts.wood_chips && s.coins >= tuning.pieceCost.wood_chips && !cornerCell.piece && !cornerCell.colony) {
      return act({ type: "placePiece", piece: "wood_chips", ...corner }).ok;
    }
    const untried = placeablePieces(content)
      .filter((p) => !s.pieceCounts[p.id] && pieceReleased(s, tuning, p.id) && content.species.some((sp) => sp.needs.includes(p.id)))
      .sort((a, b) => tuning.pieceCost[a.id] - tuning.pieceCost[b.id]);
    const freeCell = cells().find((c) => !c.piece && !c.colony);
    if (options.explore && untried.length && freeCell && s.coins >= tuning.pieceCost[untried[0].id] + tuning.bot.cellReserve) {
      return act({ type: "placePiece", piece: untried[0].id, x: freeCell.x, y: freeCell.y }).ok;
    }
    // 9. Buy cells, nearest the straw bed first, keeping a reserve, so colonies have room to spread.
    if (cells().length < tuning.bot.maxCells && s.coins >= cellCost(tuning, s.cellsBought) + tuning.bot.cellReserve) {
      let best = null;
      for (let y = 0; y < start.rows; y += 1) {
        for (let x = 0; x < start.cols; x += 1) {
          if (canBuyCell(s, tuning, x, y) !== null) continue;
          const d = Math.max(Math.abs(x - bed.x), Math.abs(y - bed.y));
          if (!best || d < best.d) best = { d, x, y };
        }
      }
      if (best) return act({ type: "buyCell", x: best.x, y: best.y }).ok;
    }
    return false;
  }

  while (s.time < end) {
    if (!doSomething()) engine.step(1);
  }
  return { engine, acts };
}

// A copy of the shared tuning with chosen feature switches changed.
export function tuningWithFeatures(overrides) {
  const copy = structuredClone(sharedTuning);
  Object.assign(copy.features, overrides);
  return copy;
}

export function allFeaturesOff() {
  const off = {};
  for (const name of Object.keys(sharedTuning.features)) off[name] = false;
  return tuningWithFeatures(off);
}
