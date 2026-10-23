// Weather-driven conditions: moisture, air and light for each colony.
// Rules only: drift toward the weather, bands, what environment pieces hold steady,
// and how a grow's time in band moves quality. No randomness here.

import { cellKey, findById } from "./rules.js";

export function featureOn(tuning, name) {
  return Boolean(tuning.features && tuning.features[name]);
}

// A condition is live only when conditions as a whole and that one condition are switched on.
export function conditionActive(tuning, condition) {
  return featureOn(tuning, "conditions") && featureOn(tuning, condition);
}

// The band { low, high } a species likes for one condition.
export function bandFor(content, tuning, speciesId, condition) {
  return tuning.bands[findById(content.species, speciesId).likes[condition]];
}

export function bandMiddle(band) {
  return (band.low + band.high) / 2;
}

export function isInBand(content, tuning, colony, condition) {
  if (!conditionActive(tuning, condition)) return true;
  const band = bandFor(content, tuning, colony.species, condition);
  return colony[condition] >= band.low && colony[condition] <= band.high;
}

// Fields a new colony starts with: every condition in the middle of its band.
export function newColonyConditions(content, tuning, speciesId) {
  const fields = { growTime: 0, inBand: {} };
  for (const condition of content.conditions) {
    fields[condition] = bandMiddle(bandFor(content, tuning, speciesId, condition));
    fields.inBand[condition] = 0;
  }
  return fields;
}

export function resetGrowTracking(colony) {
  colony.growTime = 0;
  for (const condition of Object.keys(colony.inBand)) colony.inBand[condition] = 0;
}

// Which sides of which conditions are held steady at a cell by environment pieces in reach.
// Keys look like "moisture:floor".
export function heldSides(state, content, tuning, x, y) {
  const held = {};
  if (!featureOn(tuning, "envPieces")) return held;
  for (let dx = -tuning.reach; dx <= tuning.reach; dx += 1) {
    for (let dy = -tuning.reach; dy <= tuning.reach; dy += 1) {
      const cell = state.cells[cellKey(x + dx, y + dy)];
      if (!cell || !cell.piece) continue;
      const piece = findById(content.environment, cell.piece);
      if (piece && piece.holds) held[piece.holds.condition + ":" + piece.holds.side] = true;
    }
  }
  return held;
}

// One slice of time for one colony: established colonies drift toward the weather,
// and the current grow records how long each condition was in band.
// Fruiting colonies do not drift, so they always count as in band.
export function updateColonyConditions(state, content, tuning, cell, dt) {
  const colony = cell.colony;
  const established = colony.stage === "established";
  const kind = state.weather.kind ? tuning.weather.kinds[state.weather.kind] : null;
  const held = established && kind ? heldSides(state, content, tuning, cell.x, cell.y) : {};
  const stride = (tuning.weather.driftPerMinute / tuning.secondsPerMinute) * dt;
  for (const condition of content.conditions) {
    if (established && kind && conditionActive(tuning, condition)) {
      const gap = kind[condition] - colony[condition];
      colony[condition] += Math.max(-stride, Math.min(stride, gap));
      const band = bandFor(content, tuning, colony.species, condition);
      if (held[condition + ":floor"]) colony[condition] = Math.max(colony[condition], band.low);
      if (held[condition + ":cap"]) colony[condition] = Math.min(colony[condition], band.high);
    }
    if (!colony.ready && isInBand(content, tuning, colony, condition)) colony.inBand[condition] += dt;
  }
  if (!colony.ready) colony.growTime += dt;
}

// The condition furthest outside its band, with the chore that fixes it, or null if all are fine.
export function worstCondition(content, tuning, colony) {
  if (colony.stage !== "established") return null;
  let worst = null;
  for (const condition of content.conditions) {
    if (isInBand(content, tuning, colony, condition)) continue;
    const band = bandFor(content, tuning, colony.species, condition);
    const tooLow = colony[condition] < band.low;
    const gap = tooLow ? band.low - colony[condition] : colony[condition] - band.high;
    const direction = tooLow ? "raise" : "lower";
    if (!worst || gap > worst.gap) worst = { condition, direction, gap, chore: content.chores[condition][direction] };
  }
  return worst;
}

// Stars added to (or taken from) a quality roll by how the grow went.
// colony is null for a wild mushroom: weather does not touch those.
export function conditionQualityBonus(state, colony, tuning) {
  if (!colony || !featureOn(tuning, "conditions") || !(colony.growTime > 0)) return 0;
  let bonus = 0;
  let allGood = true;
  for (const condition of Object.keys(colony.inBand)) {
    const share = colony.inBand[condition] / colony.growTime;
    if (share < tuning.quality.goodShare) allGood = false;
    if (share < tuning.quality.neglectShare) bonus -= tuning.quality.neglectStars;
  }
  if (allGood) bonus += tuning.quality.inBandStars;
  return bonus;
}
