# Packet 01 result: engine and core loop

Executor: Claude (Cowork session), 4 Oct 2026. Branch `packet-01`, PR to `main`, not merged.

## Verification stamp

```
Packet 01 completed 4 Oct 2026 at 0b36b68b83bfc4ba02548a2f5a0e741501097ec1
Tests: 26 passed / 26 total   CI: NOT RUN (workflow file could not be pushed, see "Open item")
Determinism check: pass
Scripted 30-minute run, seed 1: 323 coins at end, 3 species foraged (oyster, wine_cap, enoki), 4 colonies started
Engine purity check: pass
```

How each line was checked: a fresh `git clone` of the repo, branch `packet-01` at the commit above, Node v22.22.0, `node --test` and `node tools/stamp.mjs`. Nothing was tested from a local copy that differed from the repo. The page was also loaded in headless Chromium at 1280x720 through `node tools/serve.mjs`: a straw bed was placed with the mouse in build mode, the wild Oyster was foraged with E, and a colony was started with E, with no console errors and no page scroll.

## Open item: CI

The acceptance list asks for a CI workflow that is green. The GitHub connector refused to write `.github/workflows/test.yml` (403 "Resource not accessible by integration"; it lacks the workflows permission). Every other file went in. The workflow is therefore **not in the repo and CI has not run**. The intended file is:

```yaml
name: test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node --test
```

## Acceptance list

- [x] `node tools/serve.mjs` serves the game. The scripted player forages, starts a colony, harvests and sells inside ten simulated minutes (test). Whether a new human player does is for Justin to judge.
- [x] `node --test` passes: 26 of 26.
- [x] Tests cover every case the packet lists (lifecycle, basket and buyers test files).
- [x] Scripted 30-minute run through the actions API only ends with coins above zero (323).
- [x] Same seed and inputs give an identical end state twice; a different seed gives a different one.
- [x] `src/engine/` imports only its own files and uses no DOM, `Date.now` or `Math.random` (test).
- [x] No numbers hard-coded in `src/` (test; see contract change 1).
- [ ] CI workflow green. Not done, see above.

## What was built

- `shared/tuning.js`: every number, each with a one-line comment, header marked placeholders, not tuned.
- `shared/content.js`: 19 species, 9 substrates and trees, 7 environment pieces, 5 fixtures, 3 buyer kinds.
- `src/engine/`: `engine.js` (state, `step(seconds)`, `act(action)`), `rules.js` (pure helpers: needs, prices, freshness), `query.js` (read-only: what E would do), `rng.js` (seeded generator whose state lives in the game state), `conditions.js` (the seam for packet 02: one function the quality roll already calls, returning 0 for now).
- Actions: move, forage, startColony, pick, collectCompost, applyCompost, sell, buyCell, placePiece. Each returns `{ ok }` or `{ ok: false, reason }`. The screen changes the game only through `act`.
- `src/ui/`: canvas drawing, keyboard and mouse, side panel. `index.html` is the page.
- `tools/serve.mjs` (local server), `tools/scripted-run.js` (the scripted player), `tools/stamp.mjs` (prints the stamp numbers), `tools/testkit.js` (test setup), `tools/build-single.mjs` (inlines everything into one page for sharing; output is git-ignored).
- `README.md`: the two stale lab lines are gone and the layout is described.

## Contract changes and choices the packet left open

1. **"No number in src/" is enforced as: only the literals 0, 1 and 2.** They are structural (start a count, step by one, halve to find a centre). Everything else, including the random generator's constants and all screen sizes and colours, is in `tuning.js`.
2. **Buyer kinds are invented.** The packet points to design v0.3 section 3 for three buyer kinds, but that section lists none. Placeholders: Restaurateur (creek, fresh only, pays more), Market boat (creek, takes anything), Travelling merchant (road, dried bonus, buys spare spores).
3. **Mister and Drainage bed can be placed.** The packet says environment pieces are inert until packet 02, but five species list one of them as a need. They can be bought and count as a need; they do nothing else. The other five environment pieces are listed and cannot be placed.
4. **The wild edge is a fixed ring.** The outer ring of the grid can never be owned; wild mushrooms appear there. The garden inside is 12 x 7, with 6 cells owned at the start.
5. **Buyer taste has two parts:** a price multiplier per buyer kind (`pays`) and one favourite species per visit (`tasteBonus`), marked with a heart in the side panel.
6. **Buyers ask only for species the player has met or that are currently wild,** topped up from tier 1 if that gives fewer than two. Otherwise early buyers would ask for things the player cannot have.
7. **Three keys beyond the packet:** Q chooses which spore E plants, C composts the nearest colony, R sells spare spores to the merchant. The sell action takes `what: "spores"` for that.
8. **A fruiting colony does produce mushrooms,** at half speed, as the packet's wording implies.
9. **No collisions.** The character walks over pieces and colonies.
10. **Time keeps running in build mode.** Only P pauses.
11. **Leftover:** the engine object also exposes `spawnBuyer`, which nothing uses. It should be removed in packet 02.
12. `package.json` was added (`"type": "module"`, no dependencies) so Node reads the same module files the browser does.

## Balance observations (not tuned)

From the scripted player, seed 1, 30 minutes. It is a simple bot that never rests, so treat these as hints.

- **Foraging rivals farming.** 40 mushrooms were foraged and 50 picked. Wild mushrooms regrow every 2 to 3 minutes and cost nothing, so three wild species earn about as much as four colonies.
- **A cheap piece unlocks a dearer species.** Wood chips (12 coins) is one of Enoki's two needs, so a wild Enoki (tier 2) turns up without a hardwood log (40 coins). The "at least one need" rule makes this true for every multi-need species.
- **Income is quick against early costs.** 315 coins earned in 30 minutes against pieces at 10 to 70 coins; an oak (150) is about 15 minutes away. The first three tiers would likely arrive well inside the first hour, against a target of one new thing every 30 to 40 minutes.
- **Nothing went unpicked and no compost was made.** The bot always arrives inside the 8-minute wait, and stock sold before it dried through. The compost loop was not exercised in this run at all.
- **Every buyer was useful.** Because wants are limited to species the player has met, the bot sold to nearly every visitor (78 sales).
- **The basket never filled.** 12 slots were not a limit with four colonies.
- **Tier 1 prices round coarsely.** At 2 to 4 coins, quality and taste often round to the same price.
- **Walking costs almost nothing** at 4 cells a second on a 14 x 9 grid.

## Only Justin can judge, by playing

1. Whether 8 minutes for a ready mushroom, 2 minutes for a creek buyer and 4 to 17 minutes of freshness feel forgiving or slack.
2. Whether walking speed and garden size make distance matter at all.
3. Whether E on the nearest thing picks the thing you meant, and whether Q, C and R are tolerable.
4. Whether build mode with the mouse and no character feels right, and whether time should stop there.
5. Whether the first ten minutes explain themselves without the hint text.
6. Whether seeing a buyer's wants in the side panel is enough notice to act on.
7. Whether the loop is pleasant.
