# Packet 03 result: cursor-only controls, the species ladder, journal and awards

Executor: Claude, 23 Oct 2026. Branch `packet-03`, PR #4 to `main`, not merged.

The contract (`claude/packet-03-cursor-ladder-journal.md`) was drafted and built the same day on Justin's go ("keep working on building mechanics, we can use content placeholders"). Its choices A to I are Claude's defaults.

## Verification stamp

```
Packet 03 completed 23 Oct 2026 at d88cdc512e26ce17a61a505a8573b756c61747e8
Tests: 55 passed / 55 total   CI: pass, https://github.com/New-Orbit-Digital/mushroom-garden/actions/runs/39961185846/job/120439284619
Determinism check: pass
Scripted 30-minute run, seed 1, tending: 160 coins; ladder: 2 species resident, 1 at appear; 12 awards; 135 xp
Scripted 30-minute run, seed 1, switches off: 137 coins; ladder: 2 species resident, 1 at appear
Engine purity check: pass
```

How each line was checked: a fresh `git clone` of branch `packet-03` at the commit above, Node v22.22.0, `node --test` and `node tools/stamp.mjs`. CI is the GitHub Actions run on PR #4 for the same commit. The page was loaded in headless Chromium at 1280x720 through `node tools/serve.mjs` and played with the mouse: a straw bed placed in build mode, the edge searched by hovering until the hint read "Click: forage the wild Oyster", a click to forage, a hover on a free cell showing "Click: plant an Oyster spore here", a click to plant, and the journal showing Oyster at step 2 of 4 with its next condition. A second run placed only wood chips and found the Enoki outline by hover ("An outline of Enoki. Visit: place Hardwood log anywhere in the garden."). No console errors and no page scroll in either run.

## CI, closed

Packet 01's open item is done. `.github/workflows/test.yml` went in with an ordinary `git push` (the earlier GitHub connector lacked the workflows permission). CI has now run once, on this PR, and passed.

## Acceptance list

- [x] `node --test` passes: 55 of 55. Packet 01 and 02 tests keep their meaning; each "too far" check became its cursor-only equivalent (for example, selling is refused once the buyer has gone).
- [x] Tests cover every case the contract lists (`test/ladder.test.js`, 13 tests).
- [x] Same seed and inputs give an identical end state twice, all switches on.
- [x] The seed 1 scripted run reaches Resident for two species and ends with 160 coins.
- [x] `src/engine/` stays pure; no numbers in `src/` beyond 0, 1 and 2.
- [x] Browser at 1280x720: hover hint, click actions and journal work, no console errors.

## What was built

- **Cursor only.** The move action, the player position, walking and every reach check are gone. Hovering shows what a click would do in the hint line and frames the cell; clicking does it. C composts the colony under the cursor, R sells spare spores to the buyer under the cursor, Q picks the next spore.
- **The ladder.** Appear puts a faint dashed outline, marked "soon", on a free edge cell; it cannot be foraged. Visit turns it into a flush once every needed piece is in the garden (and for a parasite, an established host anywhere). After foraging it regrows as a flush if Visit still holds, else as an outline. Resident is the first established colony. Spread is a new action, `spread`, on a colony.
- **Spread.** Two established colonies of a species within reach of each other, its home piece within reach of either, and a free owned cell within reach of both where its needs are met. The new colony starts fruiting, no spore is used, and both parents rest for `spreadRestMinutes` (6). Each unmet part has its own refusal reason.
- **Awards and experience.** Per species: Appear, Visit (first forage), Resident, Spread, seven established colonies at once, first 5-star pick. Per buyer kind: first sale. Each is earned once, logged as a journal line with its experience, and reaching a step grants any earlier step not yet earned. Experience values are in `tuning.awards.xp`.
- **Journal.** A side-panel section listing each species that has appeared, its step (1 to 4), its next condition in words, how many species are unseen, and the award and experience totals.
- **Query helpers** in `src/engine/query.js`: `actionAt`, `buyerAt`, `cellAt`, `wildAt`, `nextCondition`, `journal`.
- **Scripted player.** No walking; each action costs `bot.secondsPerAction` (2 seconds). It now spreads when it can and buys cells nearest its first bed (up to 12, keeping 20 coins back).
- **README** describes the v0.4 direction and the new controls.

## Contract changes and choices made while building

1. **A new baseline replaces packet 01's.** The switches-off seed 1 run is pinned in `test/conditions.test.js` at 137 coins, 2 species foraged, 9 colonies started. A change to the core loop should change it on purpose, as before.
2. **The journal has a third Visit message.** When a flush is already at the edge it says "click it to forage", not "on its way".
3. **Messages use "a" or "an"** by the name (`aOrAn` in `rules.js`), so "an Oyster", "a Shiitake".
4. **Experience values are placeholders:** appear 5, visit 10, resident 20, spread 30, seven 40, 5-star 15, first sale 10.
5. **The bot's cell buying is new behaviour**, so its coins are not comparable with packet 02's numbers.

## Balance observations (not tuned)

From the scripted player, 30 minutes, seeds 1 to 5. It only ever places a straw bed and wood chips, so treat these as hints.

| Seed | Coins | Species at Resident or beyond | Spreads | Awards | Experience |
|---|---|---|---|---|---|
| 1 | 160 | 2 | 0 | 12 | 135 |
| 2 | 210 | 2 | 0 | 12 | 135 |
| 3 | 158 | 2 | 1 | 13 | 165 |
| 4 | 223 | 2 | 1 | 13 | 165 |
| 5 | 130 | 2 | 1 | 13 | 165 |

- **Spores are plentiful, so Spread rarely beats planting.** Every forage and every dried-out mushroom gives a spore, so the bot fills free cells with spores before two colonies can spread. Spread happened once on three seeds and never on two. Spread matters more once variants, the starter culture or scarcer spores arrive (packet 05).
- **The Visit rule works as intended.** Wood chips alone bring Enoki's outline but not its flush; packet 01's "cheap piece pulls in a dearer species" is gone.
- **Experience comes early and in a burst.** 135 to 165 experience in 30 minutes, almost all in the first ten (the first species' Appear, Visit and Resident land together). Packet 04's rank curve needs early ranks cheap and later ones spaced by new species, not by time.
- **Two species in 30 minutes** for this bot, which never buys a third piece. A person exploring the build palette would see more; packet 06's bots will measure it properly.

## Only Justin can judge, by playing

1. Whether clicking feels better than walking did.
2. Whether the hover hint is enough to know what a click will do.
3. Whether the faint "soon" outlines read as "coming once you add something".
4. Whether the journal's next conditions are clear enough to plan from.
5. Whether an instant Spread is satisfying, or wants the mycelium maze sooner.
