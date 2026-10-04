// Read-only questions about the state. The screen uses these to offer the
// E-key action; packet 04's bots can use them too. Nothing here changes state.

import { cellCentre, findById, isNear, distance, needsAt, buyerPosition } from "./rules.js";

// The action the E key should do right now, or null.
// Returns { action, label }. action can be passed straight to engine.act().
export function suggestAction(state, content, tuning, selectedSpore) {
  let best = null;
  const offer = (point, action, label) => {
    if (!isNear(state, tuning, point)) return;
    const d = distance(state.player, point);
    if (!best || d < best.d) best = { d, action, label };
  };
  const nameOf = (id) => findById(content.species, id).name;

  for (const id of Object.keys(state.wild)) {
    const w = state.wild[id];
    if (w.present) offer(cellCentre(w.x, w.y), { type: "forage", species: id }, "forage wild " + nameOf(id));
  }
  for (const buyer of state.buyers) {
    const kind = findById(content.buyers, buyer.kind);
    offer(buyerPosition(tuning, buyer), { type: "sell", buyer: buyer.id }, "sell to the " + kind.name);
  }
  for (const key of Object.keys(state.cells)) {
    const cell = state.cells[key];
    if (!cell.colony) continue;
    const c = cell.colony;
    if (c.ready) offer(cellCentre(cell.x, cell.y), { type: "pick", x: cell.x, y: cell.y }, "pick " + nameOf(c.species));
    else if (c.pile > 0) offer(cellCentre(cell.x, cell.y), { type: "collectCompost", x: cell.x, y: cell.y }, "collect compost");
  }
  if (best) return { action: best.action, label: best.label };

  // Nothing to gather or sell nearby: offer to start a colony on a free cell.
  if (!selectedSpore || !(state.spores[selectedSpore] > 0)) return null;
  let fit = null;
  let any = null;
  for (const key of Object.keys(state.cells)) {
    const cell = state.cells[key];
    if (cell.piece || cell.colony) continue;
    const point = cellCentre(cell.x, cell.y);
    if (!isNear(state, tuning, point)) continue;
    const d = distance(state.player, point);
    const entry = { d, cell };
    if (!any || d < any.d) any = entry;
    if (needsAt(state, content, tuning, selectedSpore, cell.x, cell.y).ok && (!fit || d < fit.d)) fit = entry;
  }
  const pick = fit || any;
  if (!pick) return null;
  return {
    action: { type: "startColony", species: selectedSpore, x: pick.cell.x, y: pick.cell.y },
    label: "start a " + nameOf(selectedSpore) + " colony",
  };
}

// Nearest colony in reach that could take compost, or null.
export function nearestCompostable(state, tuning) {
  let best = null;
  for (const key of Object.keys(state.cells)) {
    const cell = state.cells[key];
    if (!cell.colony || cell.colony.composted) continue;
    const point = cellCentre(cell.x, cell.y);
    if (!isNear(state, tuning, point)) continue;
    const d = distance(state.player, point);
    if (!best || d < best.d) best = { d, cell };
  }
  return best ? best.cell : null;
}

// Nearest buyer in reach, or null.
export function nearestBuyer(state, tuning) {
  let best = null;
  for (const buyer of state.buyers) {
    const point = buyerPosition(tuning, buyer);
    if (!isNear(state, tuning, point)) continue;
    const d = distance(state.player, point);
    if (!best || d < best.d) best = { d, buyer };
  }
  return best ? best.buyer : null;
}
