// Seeded random numbers. The generator's state lives inside the engine state,
// so the same seed and the same inputs always give the same game.

export function seedToRngState(seed, cfg) {
  const whole = Math.abs(Math.floor(Number(seed) || 0));
  return whole % cfg.modulus;
}

// Returns a number from 0 (inclusive) to 1 (exclusive) and advances the state.
export function nextRandom(state, cfg) {
  state.rngState = (cfg.multiplier * state.rngState + cfg.increment) % cfg.modulus;
  return state.rngState / cfg.modulus;
}

// Whole number from min to max, both inclusive.
export function randomInt(state, cfg, min, max) {
  return min + Math.floor(nextRandom(state, cfg) * (max - min + 1));
}

// Index into weights, chosen in proportion to each weight.
export function weightedIndex(state, cfg, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let roll = nextRandom(state, cfg) * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}
