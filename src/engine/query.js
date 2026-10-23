// Read-only questions about the state. The screen uses these to show what a click would do
// and to fill the journal; packet 06's bots can use them too. Nothing here changes state.

import {
  cellKey, findById, distance, needsAt, buyerPosition, pieceName, homePiece, spreadPlan,
  visitEligible, visitMissing, LADDER, aOrAn,
} from "./rules.js";
import { worstCondition } from "./conditions.js";

// The buyer under a point (in cells; the creek strip is above row 0), or null.
export function buyerAt(state, tuning, point) {
  let best = null;
  for (const buyer of state.buyers) {
    const d = distance(buyerPosition(tuning, buyer), point);
    if (d > tuning.pointReach) continue;
    if (!best || d < best.d) best = { d, buyer };
  }
  return best ? best.buyer : null;
}

// The owned cell under a point, or null.
export function cellAt(state, point) {
  return state.cells[cellKey(Math.floor(point.x), Math.floor(point.y))] || null;
}

// The wild species whose outline or flush sits on the cell under a point, or null.
export function wildAt(state, point) {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  for (const id of Object.keys(state.wild)) {
    const w = state.wild[id];
    if ((w.present || w.outline) && w.x === x && w.y === y) return id;
  }
  return null;
}

// What a click at a point would do. Returns { action, label }, where action can be passed
// straight to engine.act(), or { action: null, label } when there is only something to say,
// or null when there is nothing there at all.
// On a colony the order is: pick, collect compost, tend, spread.
export function actionAt(state, content, tuning, point, selectedSpore) {
  const nameOf = (id) => findById(content.species, id).name;

  const buyer = buyerAt(state, tuning, point);
  if (buyer) {
    const kind = findById(content.buyers, buyer.kind);
    return { action: { type: "sell", buyer: buyer.id }, label: "sell to the " + kind.name };
  }

  const wild = wildAt(state, point);
  if (wild) {
    if (state.wild[wild].present) return { action: { type: "forage", species: wild }, label: "forage the wild " + nameOf(wild) };
    return { action: null, label: "an outline of " + nameOf(wild) + ". " + nextCondition(state, content, tuning, wild) };
  }

  const cell = cellAt(state, point);
  if (!cell) return null;
  const at = { x: cell.x, y: cell.y };

  if (cell.colony) {
    const c = cell.colony;
    const name = nameOf(c.species);
    if (c.ready) return { action: { type: "pick", ...at }, label: "pick the " + name };
    if (c.pile > 0) return { action: { type: "collectCompost", ...at }, label: "collect compost" };
    const worst = worstCondition(content, tuning, c);
    if (worst) return { action: { type: "tend", ...at, condition: worst.condition }, label: worst.chore + " the " + name };
    const plan = spreadPlan(state, content, tuning, cell.x, cell.y);
    if (plan.ok) return { action: { type: "spread", ...at }, label: "spread the " + name };
    return { action: null, label: name + " colony: " + (c.stage === "fruiting" ? "still fruiting" : "can't spread yet, " + plan.reason) };
  }

  if (cell.piece) return { action: null, label: pieceName(content, cell.piece) };

  if (!selectedSpore || !(state.spores[selectedSpore] > 0)) {
    return { action: null, label: "a free cell. Forage a wild mushroom to get a spore to plant here" };
  }
  const needs = needsAt(state, content, tuning, selectedSpore, cell.x, cell.y);
  const label = "plant " + aOrAn(nameOf(selectedSpore)) + " spore here" + (needs.ok ? "" : " (it needs " + needs.missing.join(" and ") + " beside it)");
  return { action: { type: "startColony", species: selectedSpore, ...at }, label };
}

// The next condition in a species' ladder, in words.
export function nextCondition(state, content, tuning, speciesId) {
  const species = findById(content.species, speciesId);
  const step = state.ladder[speciesId];
  const needNames = species.needs.map((n) => pieceName(content, n));
  if (species.host) needNames.push("an established " + findById(content.species, species.host).name + " colony");
  if (!step || step === "appear") {
    const w = state.wild[speciesId];
    if (w && w.present) return "Visit: a wild flush is at the edge. Click it to forage.";
    if (visitEligible(state, content, speciesId)) return "Visit: a wild flush is on its way.";
    return "Visit: place " + visitMissing(state, content, speciesId).join(" and ") + " anywhere in the garden.";
  }
  if (step === "visit") return "Resident: plant its spore with " + needNames.join(" and ") + " beside it.";
  if (step === "resident") {
    return "Spread: two established colonies side by side, with " + pieceName(content, homePiece(species)) +
      " beside them and a free cell next to both.";
  }
  return "All four steps done.";
}

// One entry per species that has appeared, in content order, plus totals.
export function journal(state, content, tuning) {
  const entries = [];
  for (const species of content.species) {
    const step = state.ladder[species.id];
    if (!step) continue;
    entries.push({
      species: species.id,
      name: species.name,
      step,
      stepNumber: LADDER.indexOf(step) + 1,
      steps: LADDER.length,
      next: nextCondition(state, content, tuning, species.id),
    });
  }
  return {
    entries,
    unseen: content.species.length - entries.length,
    awards: Object.keys(state.awards).length,
    xp: state.xp,
  };
}
