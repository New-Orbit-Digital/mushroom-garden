// Mushroom garden content lists: species, habitat pieces, buyers.
// Lists only. Every number (tier, price, cost, stability) is in shared/tuning.js under the same id.
// PLACEHOLDERS by Claude, from docs/design-v0_3.md section 3. Not checked against a source.

const like = (moisture, air, light) => ({ moisture, air, light });

export const content = {
  // needs: habitat pieces that must be within reach of the colony.
  // host: a species that must have an established colony within reach.
  // likes: preferred band of moisture / air / light. Inert until packet 02.
  species: [
    { id: "oyster", name: "Oyster", short: "Oyster", needs: ["straw_bed"], likes: like("high", "mid", "low") },
    { id: "wine_cap", name: "Wine cap", short: "WineCap", needs: ["wood_chips"], likes: like("mid", "mid", "mid") },
    { id: "field_mushroom", name: "Field mushroom", short: "Field", needs: ["compost_bed"], likes: like("mid", "low", "low") },
    { id: "shiitake", name: "Shiitake", short: "Shiitake", needs: ["hardwood_log"], likes: like("mid", "mid", "low") },
    { id: "lions_mane", name: "Lion's mane", short: "Lion's", needs: ["hardwood_log", "mister"], likes: like("high", "high", "low") },
    { id: "nameko", name: "Nameko", short: "Nameko", needs: ["hardwood_log", "mister"], likes: like("high", "low", "low") },
    { id: "enoki", name: "Enoki", short: "Enoki", needs: ["hardwood_log", "wood_chips"], likes: like("mid", "low", "low") },
    { id: "shaggy_mane", name: "Shaggy mane", short: "Shaggy", needs: ["compost_bed", "soil_bed"], likes: like("mid", "mid", "mid") },
    { id: "blewit", name: "Blewit", short: "Blewit", needs: ["leaf_litter"], likes: like("mid", "mid", "low") },
    { id: "parasol", name: "Parasol", short: "Parasol", needs: ["soil_bed"], likes: like("low", "high", "high") },
    { id: "chanterelle", name: "Chanterelle", short: "Chant.", needs: ["oak", "leaf_litter"], likes: like("high", "mid", "low") },
    { id: "porcini", name: "Porcini", short: "Porcini", needs: ["pine", "soil_bed"], likes: like("mid", "mid", "mid") },
    { id: "hedgehog", name: "Hedgehog", short: "Hedgehog", needs: ["pine", "leaf_litter"], likes: like("mid", "low", "low") },
    { id: "black_trumpet", name: "Black trumpet", short: "Trumpet", needs: ["oak", "leaf_litter", "mister"], likes: like("high", "low", "low") },
    { id: "morel", name: "Morel", short: "Morel", needs: ["soil_bed", "drainage_bed"], likes: like("low", "high", "mid") },
    { id: "maitake", name: "Maitake", short: "Maitake", needs: ["old_oak"], likes: like("mid", "mid", "low") },
    { id: "matsutake", name: "Matsutake", short: "Matsu.", needs: ["pine", "drainage_bed"], likes: like("low", "mid", "low") },
    { id: "truffle", name: "Truffle", short: "Truffle", needs: ["old_oak", "soil_bed"], likes: like("mid", "low", "low") },
    { id: "lobster_mushroom", name: "Lobster mushroom", short: "Lobster", needs: ["leaf_litter"], host: "chanterelle", likes: like("mid", "mid", "low") },
  ],

  // Substrates and trees. All can be placed in build mode.
  substrates: [
    { id: "straw_bed", name: "Straw bed", short: "straw" },
    { id: "wood_chips", name: "Wood chips", short: "chips" },
    { id: "compost_bed", name: "Compost bed", short: "compost" },
    { id: "hardwood_log", name: "Hardwood log", short: "log" },
    { id: "soil_bed", name: "Soil bed", short: "soil" },
    { id: "leaf_litter", name: "Leaf litter", short: "leaves" },
    { id: "oak", name: "Oak", short: "oak" },
    { id: "pine", name: "Pine", short: "pine" },
    { id: "old_oak", name: "Old oak", short: "old oak" },
  ],

  // Environment pieces. Their effect on conditions arrives in packet 02.
  // In this packet only the ones a species lists as a need can be placed, and they do nothing else.
  environment: [
    { id: "mister", name: "Mister", short: "mister" },
    { id: "fan", name: "Fan", short: "fan" },
    { id: "shade_cloth", name: "Shade cloth", short: "shade" },
    { id: "rain_cover", name: "Rain cover", short: "cover" },
    { id: "drainage_bed", name: "Drainage bed", short: "drain" },
    { id: "windbreak", name: "Windbreak", short: "wind" },
    { id: "soaking_trough", name: "Soaking trough", short: "trough" },
  ],

  // Fixtures. Inert until packet 03.
  fixtures: [
    { id: "bigger_basket", name: "Bigger basket" },
    { id: "bulletin_board", name: "Bulletin board" },
    { id: "drying_rack", name: "Drying rack" },
    { id: "dock", name: "Dock" },
    { id: "spore_cabinet", name: "Spore cabinet" },
  ],

  // Buyer kinds. route: where they arrive. acceptsDried: whether they take dried stock.
  // buysSpores: whether they buy spare spores.
  buyers: [
    { id: "restaurateur", name: "Restaurateur", route: "creek", acceptsDried: false, buysSpores: false },
    { id: "market_boat", name: "Market boat", route: "creek", acceptsDried: true, buysSpores: false },
    { id: "merchant", name: "Travelling merchant", route: "road", acceptsDried: true, buysSpores: true },
  ],
};
