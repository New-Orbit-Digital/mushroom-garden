# Mushroom garden (working title): design v0.4

Date: 23 Oct 2026. Amends v0.3: everything in `design-v0_3.md` and `design-v0_2.md` stands unless this doc changes it.
Rules in section 1 are Justin's decisions from 23 Oct. Everything else, including every name, rank and number, is a **placeholder** by Claude, built on published Viva Piñata reference material (Claude's teardown of 23 Oct).

## 1. Decisions (Justin, 23 Oct)

1. **Viva Piñata's systems are the skeleton.** Its four-step species ladders, species that unlock species, colour variants, a rank clock fed only by firsts, helpers, staged shops and visitors, and threats released by rank are the starting point. The mushroom theme is adapted to them.
2. **Losses at Viva Piñata level.** Pests and disease can kill a colony for good. This replaces v0.3's "nothing dies and nothing is lost" and "neglect only lowers quality".
3. **But losses never block progress.** A species that dies out comes back at the edge once its Appear condition holds again, the forager's stall sells spores of any species already in the journal, and awards once earned are never lost.
4. **Mushroom Garden's economy stays.** Basket freshness, creek and road buyers, the bulletin board and the dock are kept, with Viva Piñata's systems around them.
5. **Viva Piñata breadth.** About 60 species and a longer game. This replaces "about 20 hours".
6. **The rhythm rule stands.** Something new every 30 to 40 minutes. Only the total length grows.
7. **Cursor only.** No character on screen. The player acts anywhere with the cursor. This replaces packet 01 decision 3 and the rule that actions need the player next to the thing.
8. **Everything living is silly and invented.** Species, threats, helpers and visitors are made-up creatures, each a cross between two things, the way Viva Piñata crosses animals with sweets. Species are loosely based on a real mushroom. This replaces v0.3's real species list.

Unchanged: no energy meter or action budget; time passes only while playing; the goal is a full journal; top-down flat 2D mockup.

**What players see stays ours.** Mechanics, structure and pacing are borrowed. Names, characters, art, text and look are not. Every name is our own coinage, never a Viva Piñata name or a near match, and nothing is drawn after a Viva Piñata character.

## 2. Core loop

1. Shape the garden: place substrates, trees, environment pieces and fixtures.
2. A species' conditions are met, and it climbs its four-step ladder (section 3).
3. Each first on the way is a journal award.
4. Awards fill the rank clock (section 5).
5. A new rank releases species, tools, helpers, shops, visitors, garden space and threats. Back to 1.

Harvests are sold through the basket and buyers as in v0.3. Coins pay for the garden but unlock nothing; only firsts move the rank clock.

## 3. The species ladder

| Step | What the player sees | Condition (default pattern) | Journal shows next |
|---|---|---|---|
| Appear | A faint outline of the species on an edge cell | At least one of its needed pieces is in the garden | The Visit condition |
| Visit | A wild flush at the edge, which can be foraged for one mushroom and one spore | All of its needed pieces are in the garden | The Resident condition |
| Resident | A colony, planted from a spore, fruits and then establishes | A spore, a free cell, and every need within reach of it | The Spread condition |
| Spread | Two colonies join and a new colony grows beside them | Two established colonies of the species within reach of each other and of its home piece, then a short mycelium maze | Its variants |

- The Visit rule (all needs present) fixes packet 01's finding that a cheap piece pulled in a dearer species.
- Species may override the default pattern with their own conditions at any step.
- **Repeats get cheaper.** After a species' first Spread, a starter culture from the supply shed lets it spread without the home piece.
- **The mycelium maze** is the Spread minigame: route threads from one colony to the other through a small grid of substrate. Each extra established colony of the species simplifies the maze. Look and rules are ours.

## 4. Species, chains and variants

**Silly species (decision 8).** Each species crosses a real mushroom with an animal, a food or an object. The real half suggests what it grows on and how it behaves; the other half gives it a look, a personality and its needs. Examples, placeholders only:

| Species | Real half | Other half | How the cross might show |
|---|---|---|---|
| Porcupini | Porcini | Porcupine | Spiny cap; needs a pine; pricks Crowbars |
| Morelephant | Morel | Elephant | Big, slow to establish; needs a drainage bed and a pond to drink from |
| Inkcapybara | Inkcap | Capybara | Sociable; established colonies help other species appear |
| Shiitaco | Shiitake | Taco | Grows on logs; buyers pay extra when it's fresh |
| Puffinball | Puffball | Puffin | Lives by the creek; drifts its spores along the water |
| Stinkhornet | Stinkhorn | Hornet | Late species; keeps Buzzkills away once resident |

Chains borrow the logic of real fungi, applied to invented species:

- **Tree partners** need a living tree in reach, as mycorrhizal mushrooms do.
- **Followers** appear only once another species is established (for example, a tier 3 species after two tier 2 colonies).
- **Parasites** need an established host and convert it: the host colony is used up. This is the theme's version of a predator.

**Variants.** Species have up to three variants, each triggered by one condition: what the colony grows on, a fixture, or the light band. Finding every variant of a species is a journal award.

## 5. Rank clock

- Experience comes only from journal awards, and each award is earned once. Rank counts discoveries, not hours.
- Experience needed per rank rises, set in `shared/tuning.js`. Bots fit it to the rhythm rule.
- A title every five ranks. The maximum rank is reached by earning every award.

**Awards (placeholders):**

- Per species: first Appear, first Visit (forage), first Resident, first Spread, each variant, seven established colonies at once, first 5-star harvest.
- Per buyer kind: first sale.
- Per processing recipe: first success.
- Per threat: first deterred or befriended.

**Release schedule (placeholders, modelled rank for rank on Viva Piñata's level table):**

| Rank | Releases |
|---|---|
| 1 | Title: New grower. Tier 1 species can appear |
| 2 | Supply shed opens; the spawn seller visits |
| 4 | Letters begin; a tier 2 species can appear; Slugaronis appear |
| 5 | Knife upgrade 1; Slugaronis start feeding; forager's stall opens |
| 6 | Title: Grower. Log drill (log species possible); a tier 2 species can appear |
| 7 | Trench spade: drainage beds and a pond |
| 8 | Fixture shop opens: bigger basket, drying rack, spore cabinet |
| 9 | Processing shed: dry, pickle or powder, with success odds; Gnatchoos appear |
| 10 | Helper hut opens; helper: Spritzel; Gnatchoos start; disease possible; Doc Gillespie visits |
| 11 | Title: Skilled grower. Garden space upgrade 1 |
| 12 | Travelling merchant visits by road; helper: Pickpocketoo |
| 13 | Knife upgrade 2 |
| 14 | Bulletin board requests begin; helper: Snipsnail; Crowbars appear |
| 15 | Boarldozer visits; fence and saw available the same rank; Crowbars start |
| 16 | Title: Seasoned grower. Helper: Owlarm; dock opens |
| 19 | Mousakas appear |
| 20 | Mousakas start; Snatchcap visits |
| 21 | Title: Expert grower. Garden space at maximum; a tier 4 species can appear |
| 23 | Knife upgrade 3; Squirrelcopters appear |
| 24 | Squirrelcopters start |
| 26 | Title: Master grower. Helper: Tillerpillar; a tier 4 species can appear |
| 27 | Buzzkills appear; a tier 4 species can appear |
| 28 | Log drill upgrade; Buzzkills start |
| 30 | A tier 5 species can appear |
| 31 | Title: Renowned grower. Barkade appears |
| 32 | Barkade starts; a tier 5 species can appear |
| 33 | A tier 5 species can appear |
| 34 | Root Rotweiler appears |
| 35 | Root Rotweiler starts |
| 36 | Title: Legendary grower. A tier 5 species can appear |
| 38 | The last rank-gated species can appear |
| 41 | Title: Grand mycologist |

Like the reference, something releases at 30 of the first 41 ranks, with never more than two empty ranks in a row. Most species still arrive through ladders and chains; ranks gate the late, large ones and everything around them.

## 6. Threats, helpers and visitors

**Threats.** Each attacks one system, appears a rank before it starts acting, and has a counter available no later than the rank it starts. Several can kill a colony for good (decision 2); none can block progress (decision 3).

| Appears / starts | Threat | Cross | What it does | Kills a colony? | Counter |
|---|---|---|---|---|---|
| 4 / 5 | Slugaroni | Slug + macaroni | Slurps a ready mushroom before it's picked | No | Copper ring piece; toads at a pond |
| 9 / 10 | Gnatchoo | Gnat + sneeze | Sneezes on a colony and makes it sick, which starts the disease clock | Through disease | Sundew bed; Spritzel keeps conditions in band |
| 10 on | Disease | | A sick colony dies after a set time unless treated | Yes | Doc Gillespie's remedies, or cut out the cell (Snipsnail) |
| 14 / 15 | Crowbar | Crow + crowbar | Prises open sick colonies, which shortens the disease clock | Yes, if sick | Scarecrow; Owlarm |
| 15 | Boarldozer | Boar + bulldozer | Ploughs up soil beds and logs; pieces must be replaced | Colonies on them | Fence, released the same rank |
| 19 / 20 | Mousaka | Mouse + moussaka | Eats fruiting colonies before they establish | Yes | Owl box |
| 20 | Snatchcap | A rival forager | Strips the most valuable colony at dawn and tramples it | Yes | Locked gate; Owlarm |
| 23 / 24 | Squirrelcopter | Squirrel + helicopter | Spins down from trees and eats new colonies made by Spread | Yes | A feeder away from the colonies, after which it drops spores of known species instead |
| 27 / 28 | Buzzkill | Wasp + buzzkill | Chases helpers off | No | Decoy nest; a resident Stinkhornet |
| 31 / 32 | Barkade | Dog + barricade | Blocks the road and the dock so buyers can't reach the garden | No | A kennel, after which it guards the garden |
| 34 / 35 | Root Rotweiler | Root rot + rottweiler | Digs underground and kills neighbouring colonies | Yes | Root barrier pieces; cut out infected cells |

**Helpers**, released by rank (section 5):

| Rank | Helper | Cross | Job |
|---|---|---|---|
| 10 | Spritzel | Spritz + pretzel | Mists colonies to keep moisture in band |
| 12 | Pickpocketoo | Pickpocket + kangaroo | Pockets ready mushrooms into a crate |
| 14 | Snipsnail | Snips + snail | Cuts out mould and sick cells |
| 16 | Owlarm | Owl + alarm | Hoots pests away |
| 26 | Tillerpillar | Tiller + caterpillar | Turns compost and tills soil beds |

**Visitors** so far: the spawn seller (rank 2), the forager's stall (5), the travelling merchant (12), Doc Gillespie the mushroom doctor (10) and the creek and road buyers. The content pass gives the rest silly names and crosses.

## 7. What changes from packets 01 and 02

- **Remove:** the move action, walking speed, the player position and the "must be next to it" rule.
- **Keep:** the deterministic engine, the single actions API, `shared/tuning.js` and `shared/content.js`, the basket, buyers and compost, and packet 02's weather, three conditions, chores and feature switches.
- **Neglect:** packet 02 built "neglect only lowers quality". That stays as built; colony deaths arrive with disease in packet 05 (decision 2).
- **Soft timeboxes stay** (a ready mushroom waits about 8 minutes, a creek buyer is in reach about 2 minutes). With no walking, they now test attention rather than distance.
- **Content is replaced:** v0.3's 19 real species give way to about 60 invented ones (decision 8). The engine's species rules stay; `shared/content.js` changes.

## 8. Build plan (replaces v0.3 section 5)

Packets in `claude/`, each on a branch with a PR; merging needs Justin's go.

1. Done: engine and core loop (packet 01, on `main`)
2. Built, awaiting merge: weather, the three conditions and chores (packet 02, PR #2). It stands under v0.4 unchanged.
3. Cursor-only controls; the four-step ladder; the journal showing each next condition; awards
4. Rank clock, release schedule in tuning, titles, garden space; staged shops and visitors; helpers released by rank
5. Threats, disease and permanent losses; counters and befriending; variants; Spread and the mycelium maze
6. Bot fast-forward and the pacing timeline (v0.3's packet 4): longest gap between beats, experience curve and costs fitted to the rhythm rule

Alongside, in chat rather than a packet: a content pass for about 60 silly species (name, real half, other half, needs, chains, variants), plus the remaining visitors, shops and titles.

## 9. Open questions

- How many awards in total, and so how many ranks?
- Does the mycelium maze stay a minigame, or become a simple timed join?
- Which threats should be befriendable rather than only deterred?
- Do weather extremes also kill colonies, or only lower quality as in v0.3?
- Is the other half of each species cross always an animal, or also foods and objects?
