// Pure rule helpers. They read state and tuning and never change anything.

export function cellKey(x, y) {
  return x + "," + y;
}

export function cellCentre(x, y) {
  return { x: x + 1 / 2, y: y + 1 / 2 };
}

// "a" or "an" before a name, for messages: "an Oyster", "a Shiitake".
export function aOrAn(name) {
  return (/^[aeiou]/i.test(name) ? "an " : "a ") + name;
}

export function findById(list, id) {
  for (const item of list) if (item.id === id) return item;
  return null;
}

export function inGrid(tuning, x, y) {
  const g = tuning.grid;
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < g.cols && y < g.rows;
}

// The wild edge ring: wild mushrooms appear here and it cannot be owned.
export function isEdge(tuning, x, y) {
  const g = tuning.grid;
  return x < g.edge || y < g.edge || x >= g.cols - g.edge || y >= g.rows - g.edge;
}

// Pieces that can be placed: every substrate and tree, and every environment piece.
export function placeablePieces(content) {
  return content.substrates.concat(content.environment);
}

export function pieceName(content, id) {
  const p = findById(content.substrates, id) || findById(content.environment, id);
  return p ? p.name : id;
}

export function cellCost(tuning, alreadyBought) {
  return Math.round(tuning.cellBaseCost * Math.pow(tuning.cellCostGrowth, alreadyBought));
}

export function canBuyCell(state, tuning, x, y) {
  if (!inGrid(tuning, x, y)) return "outside the garden";
  if (isEdge(tuning, x, y)) return "the wild edge cannot be bought";
  if (state.cells[cellKey(x, y)]) return "already yours";
  const beside =
    state.cells[cellKey(x - 1, y)] || state.cells[cellKey(x + 1, y)] ||
    state.cells[cellKey(x, y - 1)] || state.cells[cellKey(x, y + 1)];
  if (!beside) return "must touch a cell you own";
  return null;
}

export function freshSeconds(tuning, speciesId) {
  const stab = tuning.species[speciesId].stab;
  return tuning.freshBase * (tuning.freshFloor + tuning.freshStabScale * stab) * tuning.secondsPerMinute;
}

// "fresh", then "dried", then "spent" (it has broken down).
export function mushroomStage(tuning, mushroom) {
  const fresh = freshSeconds(tuning, mushroom.species);
  if (mushroom.age < fresh) return "fresh";
  if (mushroom.age < fresh * (1 + tuning.driedFactor)) return "dried";
  return "spent";
}

// Share of the current stage still left, from 1 down to 0. For the freshness bar.
export function stageShareLeft(tuning, mushroom) {
  const fresh = freshSeconds(tuning, mushroom.species);
  if (mushroom.age < fresh) return 1 - mushroom.age / fresh;
  const dried = fresh * tuning.driedFactor;
  return Math.max(0, 1 - (mushroom.age - fresh) / dried);
}

// Which needs of a species are met at a cell. Returns { ok, missing: [names] }.
export function needsAt(state, content, tuning, speciesId, x, y) {
  const species = findById(content.species, speciesId);
  const have = {};
  let hostNear = false;
  for (let dx = -tuning.reach; dx <= tuning.reach; dx += 1) {
    for (let dy = -tuning.reach; dy <= tuning.reach; dy += 1) {
      if (dx === 0 && dy === 0) continue;
      const cell = state.cells[cellKey(x + dx, y + dy)];
      if (!cell) continue;
      if (cell.piece) have[cell.piece] = true;
      if (species.host && cell.colony && cell.colony.species === species.host && cell.colony.stage === "established") {
        hostNear = true;
      }
    }
  }
  const missing = [];
  for (const need of species.needs) if (!have[need]) missing.push(pieceName(content, need));
  if (species.host && !hostNear) {
    missing.push("an established " + findById(content.species, species.host).name + " colony");
  }
  return { ok: missing.length === 0, missing };
}

// The four steps every species climbs, in order.
export const LADDER = ["appear", "visit", "resident", "spread"];

// ---------- the rank clock ----------

function ranksOn(tuning) {
  return Boolean(tuning.features && tuning.features.ranks);
}

// Experience needed to go from a rank to the next one.
export function xpForNextRank(tuning, rank) {
  return Math.round(tuning.rank.firstXp * Math.pow(tuning.rank.growth, rank - 1));
}

// Total experience at which a rank begins.
export function xpAtRank(tuning, rank) {
  let total = 0;
  for (let r = 1; r < rank; r += 1) total += xpForNextRank(tuning, r);
  return total;
}

export function rankFromXp(tuning, xp) {
  let rank = 1;
  while (xp >= xpAtRank(tuning, rank + 1)) rank += 1;
  return rank;
}

export function titleFor(content, tuning, rank) {
  const index = Math.min(Math.floor((rank - 1) / tuning.rank.titleEvery), content.titles.length - 1);
  return content.titles[index];
}

export function speciesReleased(state, tuning, speciesId) {
  return !ranksOn(tuning) || state.rank >= tuning.species[speciesId].rank;
}

export function pieceReleased(state, tuning, pieceId) {
  return !ranksOn(tuning) || state.rank >= tuning.pieceRank[pieceId];
}

// Road buyers wait for their rank; creek buyers come from the start.
export function routeReleased(state, tuning, route) {
  return route !== "road" || !ranksOn(tuning) || state.rank >= tuning.land.rank;
}

// The most cells the player may own at a rank, and the rank that next raises it (null if none).
export function cellCap(state, tuning) {
  if (!ranksOn(tuning)) return { cells: Infinity, nextRank: null };
  let cells = 0;
  let nextRank = null;
  for (const cap of tuning.garden.cellCaps) {
    if (state.rank >= cap.rank) cells = cap.cells;
    else if (nextRank === null || cap.rank < nextRank) nextRank = cap.rank;
  }
  return { cells, nextRank };
}

// What a rank releases, as names, in a fixed order: a new title, species, pieces, garden space, buyers.
export function releasesAt(content, tuning, rank) {
  const out = [];
  if (rank > 1 && (rank - 1) % tuning.rank.titleEvery === 0) out.push("the title " + titleFor(content, tuning, rank));
  for (const species of content.species) if (tuning.species[species.id].rank === rank) out.push(species.name + " can appear");
  for (const piece of placeablePieces(content)) if (tuning.pieceRank[piece.id] === rank) out.push(piece.name);
  for (const cap of tuning.garden.cellCaps) if (cap.rank === rank && rank > 1) out.push("room for " + cap.cells + " cells");
  if (tuning.land.rank === rank) out.push("the travelling merchant by road");
  return out;
}

// The highest rank anything is scheduled for.
export function lastScheduledRank(tuning) {
  let last = tuning.land.rank;
  for (const id of Object.keys(tuning.species)) last = Math.max(last, tuning.species[id].rank);
  for (const id of Object.keys(tuning.pieceRank)) last = Math.max(last, tuning.pieceRank[id]);
  for (const cap of tuning.garden.cellCaps) last = Math.max(last, cap.rank);
  return last;
}

// Appear: its outline turns up at the edge once at least one of its needed pieces is in the garden,
// and its rank has been reached.
export function appearEligible(state, content, tuning, speciesId) {
  if (!speciesReleased(state, tuning, speciesId)) return false;
  const species = findById(content.species, speciesId);
  for (const need of species.needs) if (state.pieceCounts[need] > 0) return true;
  return false;
}

// True when an established colony of a species is anywhere in the garden.
export function establishedAnywhere(state, speciesId) {
  for (const key of Object.keys(state.cells)) {
    const c = state.cells[key].colony;
    if (c && c.species === speciesId && c.stage === "established") return true;
  }
  return false;
}

// What a species still lacks before it visits: needed pieces not yet anywhere in the garden,
// and for a parasite, an established host colony anywhere. Returns a list of names.
export function visitMissing(state, content, speciesId) {
  const species = findById(content.species, speciesId);
  const missing = [];
  for (const need of species.needs) if (!(state.pieceCounts[need] > 0)) missing.push(pieceName(content, need));
  if (species.host && !establishedAnywhere(state, species.host)) {
    missing.push("an established " + findById(content.species, species.host).name + " colony");
  }
  return missing;
}

// Visit: a wild flush can be foraged once every needed piece is somewhere in the garden.
export function visitEligible(state, content, speciesId) {
  return visitMissing(state, content, speciesId).length === 0;
}

// The piece two colonies need beside them to spread: the species' home, or its first need.
export function homePiece(species) {
  return species.home || species.needs[0];
}

// True when two different cells are within reach of each other.
export function withinReach(tuning, a, b) {
  const far = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  return far > 0 && far <= tuning.reach;
}

// Owned cells within reach of a cell, in a fixed order (top to bottom, left to right).
function cellsAround(state, tuning, x, y) {
  const out = [];
  for (let dy = -tuning.reach; dy <= tuning.reach; dy += 1) {
    for (let dx = -tuning.reach; dx <= tuning.reach; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const cell = state.cells[cellKey(x + dx, y + dy)];
      if (cell) out.push(cell);
    }
  }
  return out;
}

// Whether the colony at (x, y) can spread now, and if so with which partner and onto which cell.
// Returns { ok: true, partner: cell, target: cell } or { ok: false, reason }.
export function spreadPlan(state, content, tuning, x, y) {
  const cell = state.cells[cellKey(x, y)];
  const c = cell ? cell.colony : null;
  if (!c) return { ok: false, reason: "no colony there" };
  const species = findById(content.species, c.species);
  if (c.stage !== "established") return { ok: false, reason: "a fruiting colony cannot spread yet" };
  if (c.restLeft > 0) return { ok: false, reason: "it is resting after spreading" };
  const partners = cellsAround(state, tuning, x, y).filter((p) =>
    p.colony && p.colony.species === c.species && p.colony.stage === "established" && !(p.colony.restLeft > 0));
  if (!partners.length) return { ok: false, reason: "it needs a second established " + species.name + " colony beside it" };
  const home = homePiece(species);
  const homeBeside = (a) => cellsAround(state, tuning, a.x, a.y).some((p) => p.piece === home);
  let homeFound = false;
  for (const partner of partners) {
    if (!homeBeside(cell) && !homeBeside(partner)) continue;
    homeFound = true;
    for (const target of cellsAround(state, tuning, x, y)) {
      if (target.piece || target.colony || !withinReach(tuning, target, partner)) continue;
      if (!needsAt(state, content, tuning, c.species, target.x, target.y).ok) continue;
      return { ok: true, partner, target };
    }
  }
  if (!homeFound) return { ok: false, reason: "they need " + pieceName(content, home) + " beside them" };
  return { ok: false, reason: "it needs a free cell beside both colonies where " + species.name + "'s needs are met" };
}

export function buyerPosition(tuning, buyer) {
  const g = tuning.grid;
  const spm = tuning.secondsPerMinute;
  if (buyer.route === "creek") {
    return { x: (g.cols * buyer.elapsed) / buyer.total, y: -g.stripRows / 2 };
  }
  const walk = tuning.land.walkMinutes * spm;
  const stay = tuning.land.stayMinutes * spm;
  const y = g.rows + g.stripRows / 2;
  const standX = tuning.land.standX;
  if (buyer.elapsed < walk) return { x: (standX * buyer.elapsed) / walk, y };
  if (buyer.elapsed < walk + stay) return { x: standX, y };
  return { x: standX + ((g.cols - standX) * (buyer.elapsed - walk - stay)) / walk, y };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Price = species price x stability premium x quality x buyer taste,
// and for dried stock x driedShare x the buyer kind's dried bonus.
export function salePrice(tuning, buyer, mushroom) {
  const sp = tuning.species[mushroom.species];
  const kind = tuning.buyers[buyer.kind];
  let price = sp.price;
  price *= 1 + tuning.unstablePremium * (1 - sp.stab);
  price *= tuning.qualityPrice[mushroom.quality - tuning.minQuality];
  price *= kind.pays;
  if (buyer.favourite === mushroom.species) price *= tuning.tasteBonus;
  if (mushroomStage(tuning, mushroom) === "dried") price *= tuning.driedShare * kind.driedBonus;
  return Math.max(tuning.minSalePrice, Math.round(price));
}

export function sporePrice(tuning, buyer, speciesId) {
  const price = tuning.species[speciesId].price * tuning.sporeShare * tuning.buyers[buyer.kind].pays;
  return Math.max(tuning.minSalePrice, Math.round(price));
}
