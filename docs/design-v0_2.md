# Mushroom garden (working title): design v0.2

Date: 4 Oct 2026. Replaces v0.1. Status: rules scoped; the economy lab now runs these rules.
Companion files: `shared/tuning.js` (baseline 2), `tools/lab.html` (the economy lab).

Rules in this doc are Justin's decisions. The ten rules in section 9 were proposed by Claude as defaults and accepted by Justin on 4 Oct. Species, habitat, buyers, upgrades and every number are still **placeholders** by Claude.

## 1. Premise and tone

A small economy game about a mushroom garden. Cozy, relaxed, not punishing. Species arrive when the garden suits them, the player cultivates them from spores, and buyers come to the garden to trade.

Inspiration: Viva Piñata. You build the conditions and the creature shows up.

## 2. Ground rules

- No time limit and no energy meter.
- Time passes only while playing. No idle or offline progress.
- Nothing is lost for good. Anything unpicked or unsold becomes another resource.
- The garden is the main stage. Buyers come to the player.
- Conditions, not calendar.
- Mild pressure is fine. A missed buyer is acceptable because another comes shortly.
- The 3D world is not built until most ideas are scoped.

## 3. Core loop

1. Place habitat in build mode.
2. A species with at least one of its needs present appears wild at the garden's edge.
3. Forage it: one fresh mushroom and one spore. The wild one grows back shortly.
4. Meet the species' full needs and start a colony with the spore.
5. Tend and harvest by hand.
6. Sell to buyers who arrive by creek, by land or by letter.
7. Spend coins on habitat, cells and upgrades.

## 4. Player and space

- 3D, small play area, similar in scale to FIELD.
- A character the player moves to tend, harvest, forage and collect.
- Build mode has no character.
- The garden is a grid. Each habitat piece and each colony takes one cell. A habitat piece affects neighbouring cells.
- A creek winds through the world; some buyers float past on it.

## 5. Species lifecycle

**Wild:** appears at the edge when at least one habitat need is present. Foraging gives one fresh mushroom and one spore, and opens the species' journal entry. It regrows shortly.

**Cultivated:** one spore per colony, full habitat needs, a free cell. A colony is fruiting first, then established. Each grow rolls a quality.

## 6. What a mushroom becomes

| Situation | Path |
|---|---|
| Picked | Fresh, then dried, then compost and a spore |
| Left unpicked | Fresh, then straight to compost where it stands (no spore) |

- Dried is the last chance to sell.
- Unpicked skips dried so that harvesting is always worth doing.
- Less stable species can be worth more.

## 7. Resources

| Resource | Source | Use |
|---|---|---|
| Coins | Selling | Habitat, cells, upgrades |
| Fresh mushrooms | Foraging, harvesting | Sell; age into dried |
| Dried stock | Aged picked mushrooms | Sell at about half price; the merchant prefers it |
| Spores | Foraging; breakdown of picked mushrooms; merchants | One per new colony; keep; sell |
| Compost | Breakdown; collected by hand from unpicked | Applied to one colony for one grow; lifts quality; used up |
| Habitat pieces | Coins | Meet species needs; permanent |
| Cells | Coins | Space on the grid |
| Upgrades | Land merchants, coins | Basket, harvest speed, drying rack, signpost |
| Journal | Play | One entry per species; the catalogue shows one kept spore per species |

## 8. Buyers

- Creek buyers float past periodically. Land merchants walk in and stay longer.
- Letters arrive on their own with requests and are not tied to catching anyone.
- Needs are randomized and weighted by rarity. The player can buy better odds (the signpost).
- Land merchants sell upgrades. Merchants buy spare spores.

## 9. The ten rules accepted on 4 Oct

1. **Quality** is 1 to 5 stars. The roll is moved by compost, by weather that suits the species, and by having more than the minimum habitat.
2. **Compost** is applied per colony and lasts one grow.
3. **Compost from unpicked mushrooms** is collected by hand where it fell.
4. **Freshness** follows stability. Unstable species turn in a few minutes of play, stable ones last much longer. Dried lasts several times longer than fresh.
5. **Dried** sells for about half the fresh price, and the merchant prefers it.
6. **A buyer visit** asks for two or three species, a handful of each.
7. **Upgrades:** a bigger basket, a faster harvest, a drying rack that slows ageing, a signpost that improves buyer odds.
8. **A spore** sells for about a fifth of its mushroom's price. The catalogue is the journal showing one kept spore per species.
9. **Build mode** is a grid; each habitat piece and colony takes one cell; pieces affect neighbouring cells.
10. **Species and habitat** stay as placeholders for the lab and get replaced later.

## 10. Economy baseline 2

The lab was rewritten to these rules: visits and letters, a basket with fresh, dried and breakdown, spores per colony, compost, a quality roll, hand actions as a limit, wild spawns, and upgrades.

Verified 4 Oct 2026 by running `shared/tuning.js` through the lab's simulator (6 hours, 3 bot styles, 5 random runs each): style balance 89%, close calls 40%, surprises 3.0, longest quiet stretch 167 minutes, top species share 38%.

Findings:
- The three bot styles established species in three different orders. Under baseline 1 they all took the same order.
- Payback established 4.0 of 8 species, Collector 6.0, Letter chaser 4.4. Truffle was never established.
- Per 100 mushrooms in the Payback garden: 61 sold fresh, 12 sold dried, 3 broke down in the basket, 24 left unpicked.
- The basket is the tightest limit. Raising basket size from 12 to 30 lifted Payback's earnings from 3525 to 4545 coins and cut unpicked from 24% to 13%. Doubling actions per minute changed little.
- How often buyers come is the strongest income lever. A creek buyer every 2 minutes instead of 4 gave 6342 coins.
- The longest quiet stretch is nearly half the session, so the late game still runs out of news.

Lab simplifications:
- The grid is counted, not drawn. Each habitat piece serves a set number of colonies (`pieceReach`), standing in for neighbouring cells.
- Letters are requests only. Offers are not modeled.
- Bots are simple and the runs are random, so small differences are noise.

## 11. Open questions

- The real species list, habitat list and their needs
- What letters offer, beyond requests
- How the late game stays lively once most species are established
- Whether Truffle-tier species should be reachable in a first session
- How neighbouring-cell effects work exactly, once there is a grid to place on
- How the journal reveals needs step by step

## 12. Decision log

- 3 Oct: tone, loop and staged plan set. Economy first, then player interaction.
- 3 Oct: no time limit, no energy; conditions over calendar.
- 3 Oct: Viva Piñata arrival model adopted; garden is the main stage.
- 3 Oct: requirements model chosen over economy-only.
- 4 Oct: baseline 1 fixed.
- 4 Oct: 3D small area, character plus build mode, hand harvesting.
- 4 Oct: buyers come to the garden by creek, land and letter.
- 4 Oct: time passes only while playing.
- 4 Oct: foraging is edge spawns gated by partial needs.
- 4 Oct: currency briefly seeds, then back to coins.
- 4 Oct: quality roll per grow, moved by environment and compost.
- 4 Oct: ageing paths, spore per colony, compost used up, upgrades from merchants, randomized buyers.
- 4 Oct: three assumptions confirmed; ten default rules accepted (section 9).
- 4 Oct: lab rewritten to v0.2 rules; baseline 2 fixed.
