// A scripted player that plays through the actions API only: it reads state to decide,
// and changes the game only with engine.act() and engine.step().
// Used by the 30-minute test, the determinism test and tools/stamp.mjs.

import { tuning } from "../shared/tuning.js";
import { content } from "../shared/content.js";
import { createEngine } from "../src/engine/engine.js";
import { cellCentre, buyerPosition, isNear, needsAt, mushroomStage, findById } from "../src/engine/rules.js";

export function runScripted(seed, minutes) {
  const engine = createEngine({ tuning, content, seed });
  const s = engine.state;
  const end = minutes * tuning.secondsPerMinute;
  let acts = 0;
  const act = (a) => {
    acts += 1;
    return engine.act(a);
  };

  function walkTo(point) {
    act({ type: "move", to: point });
    let guard = 0;
    while (s.player.target && guard < 400) {
      engine.step(0.25);
      guard += 1;
    }
  }

  // Creek buyers drift, so keep re-aiming until in reach.
  function chase(buyerId) {
    for (let i = 0; i < 200; i += 1) {
      const buyer = s.buyers.find((b) => b.id === buyerId);
      if (!buyer) return false;
      const pos = buyerPosition(tuning, buyer);
      if (isNear(s, tuning, pos)) return true;
      act({ type: "move", to: pos });
      engine.step(0.25);
    }
    return false;
  }

  const cells = () => Object.values(s.cells);
  const start = tuning.grid;

  // Opening move: a straw bed on the first owned cell.
  act({ type: "placePiece", piece: "straw_bed", x: start.startCol, y: start.startRow });

  function doSomething() {
    // 1. Sell to a buyer who wants something we hold.
    for (const buyer of s.buyers) {
      const kind = findById(content.buyers, buyer.kind);
      const sellable = buyer.wants.some(
        (w) => w.count > 0 && s.basket.some(
          (m) => m.species === w.species && (kind.acceptsDried || mushroomStage(tuning, m) === "fresh"),
        ),
      );
      if (sellable && chase(buyer.id)) return act({ type: "sell", buyer: buyer.id }).ok;
    }
    const room = s.basket.length < tuning.basketSize;
    // 2. Pick anything ready.
    for (const cell of cells()) {
      if (room && cell.colony && cell.colony.ready) {
        walkTo(cellCentre(cell.x, cell.y));
        return act({ type: "pick", x: cell.x, y: cell.y }).ok;
      }
    }
    // 3. Collect compost piles.
    for (const cell of cells()) {
      if (cell.colony && cell.colony.pile > 0) {
        walkTo(cellCentre(cell.x, cell.y));
        return act({ type: "collectCompost", x: cell.x, y: cell.y }).ok;
      }
    }
    // 4. Spend compost on a colony.
    if (s.compost > 0) {
      for (const cell of cells()) {
        if (cell.colony && !cell.colony.composted) {
          walkTo(cellCentre(cell.x, cell.y));
          return act({ type: "applyCompost", x: cell.x, y: cell.y }).ok;
        }
      }
    }
    // 5. Start a colony wherever a held spore's needs are met.
    for (const species of content.species) {
      if (!(s.spores[species.id] > 0)) continue;
      for (const cell of cells()) {
        if (cell.piece || cell.colony) continue;
        if (!needsAt(s, content, tuning, species.id, cell.x, cell.y).ok) continue;
        walkTo(cellCentre(cell.x, cell.y));
        return act({ type: "startColony", species: species.id, x: cell.x, y: cell.y }).ok;
      }
    }
    // 6. Forage whatever is wild.
    for (const id of Object.keys(s.wild)) {
      const w = s.wild[id];
      if (room && w.present) {
        walkTo(cellCentre(w.x, w.y));
        return act({ type: "forage", species: id }).ok;
      }
    }
    // 7. Once affordable, add wood chips on the far corner so a second species turns up.
    const corner = { x: start.startCol + start.startCols - 1, y: start.startRow };
    const cornerCell = s.cells[corner.x + "," + corner.y];
    if (!s.pieceCounts.wood_chips && s.coins >= tuning.pieceCost.wood_chips && !cornerCell.piece && !cornerCell.colony) {
      return act({ type: "placePiece", piece: "wood_chips", x: corner.x, y: corner.y }).ok;
    }
    return false;
  }

  while (s.time < end) {
    if (!doSomething()) engine.step(1);
  }
  return { engine, acts };
}
