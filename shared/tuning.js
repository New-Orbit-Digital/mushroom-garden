// Mushroom garden tuning file.
// PLACEHOLDERS, NOT TUNED. Every number in the game lives here. Edit and reload.
// Times are in minutes of play unless the name says seconds.

export const tuning = {
  // ---- time ----
  secondsPerMinute: 60, // seconds in a minute of play; lower it to make the whole game run faster
  tickSeconds: 1, // largest slice of time the engine advances in one go; smaller is finer and slower
  defaultSeed: 1, // random seed used when the URL has no ?seed=

  // ---- random number generator (algorithm constants, not for tuning) ----
  rng: {
    multiplier: 1664525, // LCG multiplier; changing it changes every random roll
    increment: 1013904223, // LCG increment; changing it changes every random roll
    modulus: 4294967296, // LCG modulus (2 to the 32); do not change
  },

  // ---- garden and grid ----
  grid: {
    cols: 14, // grid width in cells, including the wild edge ring
    rows: 9, // grid height in cells, including the wild edge ring
    edge: 1, // thickness of the wild edge ring where wild mushrooms appear and nothing can be owned
    stripRows: 1, // height of the creek strip (top) and the road strip (bottom), in cells
    startCol: 6, // left column of the cells owned at the start
    startRow: 4, // top row of the cells owned at the start
    startCols: 3, // how many columns are owned at the start
    startRows: 2, // how many rows are owned at the start
  },
  reach: 1, // how many cells away a habitat piece (or host colony) still counts for a colony; 1 = the 8 neighbours
  cellBaseCost: 8, // coins for the first extra cell
  cellCostGrowth: 1.15, // each further cell costs this many times the one before

  // ---- player ----
  playerStart: { x: 7.5, y: 3.5 }, // where the character stands at the start, in cells
  walkSpeed: 4, // cells walked per second
  actReach: 1.5, // how close (in cells) the character must be to act on a thing
  arriveDistance: 0.05, // how close counts as arrived when walking to a point
  startCoins: 30, // coins at the start of a game

  // ---- colonies ----
  fruitingGrowRate: 0.5, // growth speed of a colony that is still fruiting, as a share of established speed
  unpickedMinutes: 8, // how long a ready mushroom waits before it turns into a compost pile

  // ---- quality ----
  minQuality: 1, // lowest star rating
  maxQuality: 5, // highest star rating
  qualityWeights: [10, 30, 35, 18, 7], // luck: relative chance of 1, 2, 3, 4, 5 stars
  compostQualityBonus: 1, // stars added to the next grow of a composted colony
  qualityPrice: [0.7, 0.85, 1, 1.25, 1.6], // price multiplier for 1, 2, 3, 4, 5 stars

  // ---- basket and ageing ----
  basketSize: 12, // how many mushrooms the basket holds
  freshBase: 8, // base fresh time; fresh minutes = freshBase x (freshFloor + freshStabScale x stab)
  freshFloor: 0.3, // share of freshBase that even the least stable species stays fresh
  freshStabScale: 2, // how strongly stability stretches fresh time
  driedFactor: 3, // a mushroom stays dried this many times as long as it stayed fresh

  // ---- prices ----
  unstablePremium: 0.5, // extra price share for a fully unstable species (stab 0); none at stab 1
  driedShare: 0.5, // dried sells for this share of the fresh price
  sporeShare: 0.2, // a spore sells for this share of its mushroom's price
  keepSpores: 1, // spores per species never sold as spare (the journal keeps one)
  tasteBonus: 1.25, // price multiplier for the one species a buyer is keenest on
  minSalePrice: 1, // no sale pays less than this many coins

  // ---- buyer wants ----
  wantSpeciesMin: 2, // fewest species a buyer asks for
  wantSpeciesMax: 3, // most species a buyer asks for
  wantCountMin: 2, // fewest mushrooms asked of one species
  wantCountMax: 5, // most mushrooms asked of one species
  starterTier: 1, // tier used to fill a buyer's wants before the player has met enough species

  // ---- buyer visits ----
  creek: {
    firstMinutes: 1.5, // when the first creek buyer drifts in
    everyMinutes: 4, // average gap between creek buyers
    jitterMinutes: 1, // the gap varies by up to this much either way
    stayMinutes: 2, // how long a creek buyer takes to drift past (the time it is in reach)
  },
  land: {
    firstMinutes: 5, // when the first land merchant walks in
    everyMinutes: 9, // average gap between land merchants
    jitterMinutes: 2, // the gap varies by up to this much either way
    stayMinutes: 6, // how long a land merchant stands waiting
    walkMinutes: 0.4, // how long the merchant takes to walk in, and again to walk out
    standX: 7, // where along the road the merchant stands, in cells from the left
  },

  // ---- buyer kinds (ids match shared/content.js) ----
  buyers: {
    restaurateur: { pays: 1.2, driedBonus: 1 }, // pays: overall price multiplier; driedBonus unused because dried is refused
    market_boat: { pays: 1, driedBonus: 1 }, // takes anything at the plain price
    merchant: { pays: 0.9, driedBonus: 1.5 }, // driedBonus: multiplier on top of driedShare for dried stock
  },

  // ---- tiers: pacing of growth, regrowth and demand ----
  tiers: {
    1: { waitMinutes: 3, growMinutes: 2, wildRegrowMinutes: 2, demandWeight: 10 }, // wait: fruiting time; grow: minutes per mushroom; demandWeight: how often buyers ask
    2: { waitMinutes: 6, growMinutes: 3, wildRegrowMinutes: 3, demandWeight: 6 }, // tier 2
    3: { waitMinutes: 10, growMinutes: 4, wildRegrowMinutes: 4, demandWeight: 4 }, // tier 3
    4: { waitMinutes: 16, growMinutes: 6, wildRegrowMinutes: 6, demandWeight: 2.5 }, // tier 4
    5: { waitMinutes: 25, growMinutes: 8, wildRegrowMinutes: 8, demandWeight: 1.5 }, // tier 5
  },

  // ---- species: tier, stability (0 spoils fast, 1 keeps), base price in coins ----
  species: {
    oyster: { tier: 1, stab: 0.6, price: 2 }, // tier 1 price range 2 to 4
    wine_cap: { tier: 1, stab: 0.5, price: 3 }, // tier 1
    field_mushroom: { tier: 1, stab: 0.5, price: 4 }, // tier 1
    shiitake: { tier: 2, stab: 0.9, price: 5 }, // tier 2 price range 5 to 9
    lions_mane: { tier: 2, stab: 0.4, price: 8 }, // tier 2
    nameko: { tier: 2, stab: 0.3, price: 9 }, // tier 2
    enoki: { tier: 2, stab: 0.6, price: 6 }, // tier 2
    shaggy_mane: { tier: 3, stab: 0.1, price: 16 }, // tier 3 price range 10 to 16
    blewit: { tier: 3, stab: 0.5, price: 10 }, // tier 3
    parasol: { tier: 3, stab: 0.4, price: 13 }, // tier 3
    chanterelle: { tier: 4, stab: 0.5, price: 22 }, // tier 4 price range 18 to 30
    porcini: { tier: 4, stab: 0.7, price: 26 }, // tier 4
    hedgehog: { tier: 4, stab: 0.6, price: 18 }, // tier 4
    black_trumpet: { tier: 4, stab: 0.3, price: 30 }, // tier 4
    morel: { tier: 5, stab: 0.8, price: 45 }, // tier 5 price range 35 to 60
    maitake: { tier: 5, stab: 0.6, price: 38 }, // tier 5
    matsutake: { tier: 5, stab: 0.5, price: 55 }, // tier 5
    truffle: { tier: 5, stab: 0.7, price: 60 }, // tier 5
    lobster_mushroom: { tier: 5, stab: 0.4, price: 50 }, // tier 5
  },

  // ---- habitat piece costs in coins ----
  pieceCost: {
    straw_bed: 10, // needed by Oyster
    wood_chips: 12, // needed by Wine cap, Enoki
    compost_bed: 14, // needed by Field mushroom, Shaggy mane
    hardwood_log: 40, // opens tier 2
    soil_bed: 60, // opens Parasol and parts of tiers 3 to 5
    leaf_litter: 70, // opens Blewit and parts of tiers 4 and 5
    oak: 150, // opens Chanterelle, Black trumpet
    pine: 160, // opens Porcini, Hedgehog, Matsutake
    old_oak: 400, // opens Maitake, Truffle
    mister: 50, // counts only as a need in this packet; no moisture effect yet
    drainage_bed: 120, // counts only as a need in this packet; no moisture effect yet
  },

  eventLogSize: 6, // how many recent messages the engine remembers

  // ---- screen (mockup only) ----
  ui: {
    cellPx: 56, // size of one grid cell on screen, in pixels
    msPerSecond: 1000, // milliseconds in a second, for the frame clock
    maxFrameSeconds: 0.1, // longest time one frame may advance; stops a jump after the tab was hidden
    hudSeconds: 0.2, // how often the side panel text refreshes
    messageSeconds: 5, // how long a message stays in the side panel
    labelPx: 11, // text size on the canvas
    smallPx: 10, // small text size on the canvas
    lineHeight: 1.15, // line spacing of canvas text, in text sizes
    lineWidth: 2, // outline width for shapes
    wildLineWidth: 3, // outline width for wild mushrooms
    wildDash: [5, 4], // dash pattern of the wild mushroom outline
    cellGap: 1, // gap between cells, in pixels
    pieceInset: 0.1, // margin around a habitat square, as a share of a cell
    colonyRadius: 0.4, // colony circle radius, as a share of a cell
    wildRadius: 0.34, // wild mushroom circle radius, as a share of a cell
    playerRadius: 0.22, // character circle radius, as a share of a cell
    buyerSize: 0.36, // buyer diamond half-size, as a share of a cell
    pileSize: 0.24, // compost pile square size, as a share of a cell
    reachAlpha: 0.12, // opacity of the reach ring around the character
    percent: 100, // for turning a share into a percentage bar
    colors: {
      creek: "#7fb4cf", // creek strip
      road: "#c9b48a", // road strip
      edge: "#5f7d4e", // wild edge ring
      unowned: "#86a26d", // garden cells not yet bought
      owned: "#d9c9a3", // owned cells
      buyable: "#b7c98f", // cells that can be bought now (build mode)
      hover: "#fff3b0", // cell under the mouse (build mode)
      piece: "#8a6a45", // habitat squares
      pieceText: "#fff8e8", // text on habitat squares
      fruiting: "#e6dcc3", // colony still fruiting
      established: "#f3ead4", // established colony
      ready: "#ffd76a", // colony with a mushroom ready
      outline: "#3b2f22", // outlines and dark text
      wild: "#fdf6e3", // wild mushroom fill
      pile: "#5a4028", // compost pile
      player: "#c2410c", // the character
      buyer: "#2f5d8a", // buyers
      lightText: "#ffffff", // text on dark shapes
    },
  },
};
