// Seam for packet 02 (weather, moisture / air / light, chores).
// In packet 01 quality is luck plus compost only, so conditions add nothing.
// Packet 02 replaces the body of this function; the engine already calls it
// for every quality roll of a colony.

// colony is null for a wild mushroom.
export function conditionQualityBonus(state, colony, tuning) {
  return 0;
}
