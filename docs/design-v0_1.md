# Mushroom garden (working title): design v0.1

Date: 4 Oct 2026. Status: rules scoped in chat, nothing built except the economy lab.
Companion files: `shared/tuning.js` (baseline 1), `tools/lab.html` (the economy lab).

Everything under "Decisions" was stated by Justin. Anything Claude filled in is marked **placeholder**.

## 1. Premise and tone

A small economy game about a mushroom garden. Cozy, relaxed, not punishing. Species arrive when the garden suits them, the player cultivates them, and buyers come to the garden to trade.

Inspiration: Viva Piñata. You build the conditions and the creature shows up, and the satisfaction is in creating a home that something chooses.

## 2. Ground rules

- **No time limit and no energy meter.** Nothing like a Stardew day clock.
- **Time passes only while playing.** No idle or offline progress.
- **Nothing is lost for good.** Anything unpicked or unsold becomes another resource.
- **The garden is the main stage.** Buyers come to the player.
- **Conditions, not calendar.** Changing conditions matter; seasons would only be narrative.
- **Mild pressure is fine.** Missing a passing buyer is acceptable because another comes shortly.

## 3. Core loop

1. Place habitat in build mode.
2. A species whose needs are partly met appears wild at the garden's edge.
3. Forage it: one fresh mushroom and one spore of that species. The wild one grows back shortly.
4. Meet the species' full needs and start a colony with the spore.
5. Tend and harvest by hand.
6. Sell to buyers who arrive by creek, by land or by letter.
7. Spend coins on habitat, plots and upgrades.

Shared habitat pieces mean one species' home is often the beginning of the next one's, so species ladder into each other.

## 4. Player and space

- 3D, small play area, similar in scale to FIELD.
- A character on screen that the player moves to tend, harvest and forage.
- Placing things switches to a build mode with no character.
- Harvesting happens only when the player does it.
- A creek winds through the world; some buyers float past on it.
- **The 3D world is not to be built until most ideas are scoped.**

## 5. Species lifecycle

**Wild**
- Appears at the edge once at least one of its habitat needs is present.
- Foraging gives one fresh mushroom and one spore.
- Regrows at the edge shortly after, whether or not the player used the first one.
- Until there is a 3D world, foraging can be a committed action with a chance of a find.

**Cultivated**
- Needs one spore per colony and the species' full habitat needs.
- Goes through fruiting, then established.
- Species only stay and flourish in the right conditions.
- Each grow rolls a semi-random quality. Environmental factors and compost move the roll.

## 6. What a mushroom becomes

| Situation | Path |
|---|---|
| Picked | Fresh, then dried, then compost and spores |
| Left unpicked | Fresh, then straight to compost (no spores) |

- Dried is the last chance to sell.
- Unpicked skips dried so that harvesting is always worth doing.
- Stability ties to rarity and price: less stable species can be worth more. Not in every case.

## 7. Resources

| Resource | Source | Use |
|---|---|---|
| Coins | Selling | Habitat, plots, upgrades |
| Fresh mushrooms | Foraging, harvesting | Sell; age into dried |
| Dried stock | Aged picked mushrooms | Sell |
| Spores | Foraging; breakdown of picked mushrooms; merchants | One per new colony; keep as a catalogue; sell |
| Compost | Breakdown of picked and unpicked mushrooms | Improves the quality roll; used up when applied |
| Habitat pieces | Bought with coins | Meet species needs; permanent |
| Plots | Bought with coins | Space for colonies and habitat |
| Upgrades | Bought from merchants with coins | Tools, systems, better buyer odds |
| Journal | Filled by play | One entry per species, tracking what is known |

Substrate is a category of habitat (straw, log, leaf litter, compost heap), not a held resource. Weather, moisture and shade are conditions.

## 8. Buyers

- **Creek buyers** float past periodically. Merchants and restaurateurs.
- **Land merchants** walk into the garden.
- **Letters** arrive on their own with requests or offers. A letter is not tied to catching anyone.
- Needs and offers are randomized and weighted by rarity.
- The player can buy improvements to those odds.
- Merchants also sell tool and system upgrades, and spores.

## 9. Economy baseline

Baseline 1 is in `shared/tuning.js`. It uses the requirements model: shared habitat pieces, limited plots that habitat also occupies, arrival stages, buyer saturation, several buyers with different tastes, stability, and drifting weather.

Verified 4 Oct 2026 by running the tuning file through the lab's simulator: style balance 81%, close calls 29%, surprises 1, longest quiet stretch 65 minutes, top species share 59%.

The eight species, seven habitat pieces, three buyers and all prices in that file are **placeholders** written by Claude. Justin tuned the settings block only.

Findings from the baseline that still need a fix:
- Truffle never settles inside 10 hours.
- All three bot play styles settle species in the same order.
- One species takes 90 minutes of play to go from needs met to established.

## 10. Changes the lab needs before it matches this doc

The lab sells every minute to always-present buyers and has no inventory. To match this design it needs:
- Buyer visits with randomized, rarity-weighted wants
- Letters as a second sales channel
- A basket with the fresh, dried, breakdown path
- Spores as a held resource, one per colony
- Compost as a consumable that lifts quality
- A quality roll per grow
- Hand harvesting as a limit on output
- Wild edge spawns separate from cultivated colonies

## 11. Confirmed assumptions

Confirmed by Justin on 4 Oct 2026 and now folded into sections 5 and 6:
- Unpicked mushrooms give compost only, no spores.
- The fruiting and established stages apply to cultivated colonies.
- Wild species appear when at least one of their habitat needs is present.

## 12. Open questions

1. What feeds the quality roll besides compost and weather, and what scale quality uses
2. How compost is applied: per colony, per grow, or to an area
3. Whether compost from unpicked mushrooms must be collected or is banked automatically
4. How long fresh and dried last, and how that follows from stability
5. What dried stock sells for relative to fresh
6. How much a single buyer visit wants
7. The list of tool and system upgrades
8. What a spore sells for, and how the catalogue works
9. How plots and habitat placement work in 3D build mode
10. The real species list, habitat list and their needs

## 13. Decision log

- 3 Oct: tone, loop and staged plan set. Economy first, then player interaction.
- 3 Oct: no time limit, no energy; conditions over calendar.
- 3 Oct: Viva Piñata arrival model adopted; garden is the main stage.
- 3 Oct: requirements model chosen over economy-only.
- 4 Oct: baseline 1 fixed in the tuning file and set as the lab default.
- 4 Oct: 3D small area, character plus build mode, hand harvesting.
- 4 Oct: buyers come to the garden by creek, land and letter.
- 4 Oct: time passes only while playing.
- 4 Oct: foraging is edge spawns gated by partial needs.
- 4 Oct: currency briefly seeds, then back to coins.
- 4 Oct: quality roll per grow, moved by environment and compost.
- 4 Oct: ageing paths, spore per colony, compost used up, upgrades from merchants, randomized buyers.
- 4 Oct: three assumptions confirmed (section 11).
