// Pure rule helpers. They read state and tuning and never change anything.

export function cellKey(x, y) {
  return x + "," + y;
}

export function cellCentre(x, y) {
  return { x: x + 1 / 2, y: y + 1 / 2 };
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

// Pieces that can be placed now: every substrate and tree, plus any
// environment piece that some species lists as a need.
export function placeablePieces(content) {
  const needed = {};
  for (const s of content.species) for (const n of s.needs) needed[n] = true;
  return content.substrates.concat(content.environment.filter((p) => needed[p.id]));
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

// A species turns up wild once at least one of its needed pieces is in the garden.
export function wildEligible(state, content, speciesId) {
  const species = findById(content.species, speciesId);
  for (const need of species.needs) if (state.pieceCounts[need] > 0) return true;
  return false;
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

export function isNear(state, tuning, point) {
  return distance(state.player, point) <= tuning.actReach;
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
