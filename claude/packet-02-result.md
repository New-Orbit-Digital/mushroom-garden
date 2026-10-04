# Packet 02 result: weather, the three conditions and chores

Executor: Claude (Cowork session), 4 Oct 2026. Branch `packet-02`, PR to `main`, not merged.

The contract (`claude/packet-02-weather-conditions-chores.md`) was drafted by Claude and approved by Justin on 4 Oct 2026 ("go on packet 2") with no defaults changed. Its header still reads DRAFT; treat this line as the approval record.

## Verification stamp

```
Packet 02 completed 4 Oct 2026 at 59e54079b9244ab76a555f1c5c62c5164a346127
Tests: 42 passed / 42 total   CI: NOT RUN (workflow file still refused, see "Open item")
Determinism check: pass
Switches-off run matches packet 01 stamp: pass (323 coins, 3 species foraged, 4 colonies started)
Scripted 30-minute run, seed 1, tending: 353 coins, 3.66 average stars, 24 chores
Scripted 30-minute run, seed 1, neglecting: 327 coins, 2.86 average stars
Engine purity check: pass
```

How it was checked: a fresh `git clone` of branch `packet-02` at the commit above, Node v22.22.0, `node --test` and `node tools/stamp.mjs`. The single-page build of the same commit was loaded in headless Chromium at 1280x720 and played by keyboard for 6 minutes 44 seconds of game time: the weather line, the next weather and countdown, and the three bars on an established colony all showed, with no console errors and no page scroll.

## Open item: CI

The workflow file was tried again twice after the permission was granted (once as a multi-file push, once as a single file). Both were refused with the same 403, "Resource not accessible by integration". The permission has not reached the connector this session uses. **CI has still never run.** The intended file is in `claude/packet-01-result.md`.

## Acceptance list

- [x] `node --test` passes: 42 of 42. The 26 packet 01 tests are unchanged in meaning; one line changed (the "cannot be placed yet" check now uses a fixture, because the fan became placeable).
- [x] Tests cover every case the contract lists (`test/conditions.test.js`).
- [x] With all switches off, the seed 1 scripted run matches the packet 01 stamp.
- [x] Each switch alone changes only its own feature: one test each for weather, conditions, moisture, air, light and envPieces.
- [x] Same seed and inputs give an identical end state twice with all switches on.
- [x] `src/engine/` stays pure (test).
- [x] No numbers hard-coded in `src/` beyond 0, 1 and 2 (test).
- [x] Browser at 1280x720, no console errors, weather and bars visible.
- [ ] CI green. Not done, see above.

## What was built

- **Weather.** One kind at a time from nine (clear, sunny, hot sun, overcast, drizzle, rain, breezy, windy, still air), a new spell every 5 minutes. The side panel shows the current weather, the next one and a countdown.
- **Conditions.** Each colony has moisture, air and light from 0 to 1. Established colonies drift toward the level the weather sets. Fruiting colonies do not drift.
- **Chores.** A new action, `tend`. E next to a colony that is out of band does the chore that is most needed and the hint names it (mist, drain, fan, shelter, uncover, shade). One press puts that condition at the middle of the band.
- **Quality.** Each grow records how long each condition was in band. All three in band for at least 90% of the grow: +1 star. Each condition in band for less than half: -1 star. Never below 1 star.
- **Environment pieces.** All seven can be placed. Six hold one side of one condition for colonies within reach. The soaking trough does nothing yet.
- **Feature switches** in `shared/tuning.js`: weather, conditions, moisture, air, light, envPieces.
- **Screen.** Three small bars on each established colony (moisture, air, light), the liked band in green, the marker red when out. Each spore row now also says what the species likes.
- **Scripted player.** `runScripted(seed, minutes, { tend, tuning })` plays as a tender or a neglecter, under any tuning.
- `spawnBuyer` is no longer exposed by the engine (packet 01 leftover).

## Contract changes and choices made while building

1. **Weather has its own random stream.** Not in the contract. Turning weather on or off changes no buyer, wild-spawn or quality-luck roll, so two runs on the same seed differ only by the feature under test. A test checks it.
2. **Weather sets a level, it does not push.** The contract said each kind "has a push" on each condition. Built as: each kind has a level per condition, and colonies drift toward it at a fixed speed. Mild weather therefore never pushes a mid-liking species out of band.
3. **The "+1 star" needs 90% in band, not the whole grow** (`quality.goodShare`), so one late chore does not forfeit it.
4. **"Out of band for most of the grow" is "in band for less than half"** (`quality.neglectShare`).
5. **`tend` without a named condition fixes the worst one.** The contract required a condition.
6. **Time spent fruiting counts as in band,** since fruiting colonies are exempt.
7. **The compost pile marker moved** to the top corner of the cell to make room for the bars.
8. **The single-page build and its artifact are unchanged in form;** keys 1 to 4 were not added, as agreed.

## Balance observations (not tuned)

From the scripted player over 30 minutes on seeds 1 to 5. Four colonies of Oyster, Wine cap and Enoki, no environment pieces.

| Seed | Tending: coins / stars / chores | Neglecting: coins / stars |
|---|---|---|
| 1 | 353 / 3.66 / 24 | 327 / 2.86 |
| 2 | 341 / 4.15 / 30 | 316 / 3.30 |
| 3 | 392 / 3.75 / 42 | 354 / 2.44 |
| 4 | 396 / 3.72 / 34 | 351 / 2.35 |
| 5 | 281 / 3.51 / 32 | 341 / 2.45 |

With conditions off (packet 01 rules), seed 1 gives 323 coins and 2.74 stars.

- **Chores are worth about one star and little money.** Tending lifts average quality by about 0.8 to 1.4 stars, but coins by only 25 to 45 in four of five seeds. At tier 1 prices of 2 to 4 coins a star often rounds away.
- **Tending can cost money.** On seed 5 the tender earned 60 coins less than the neglecter: it picked 41 mushrooms against 47 and sold 58 against 77. Time spent on chores was time not spent foraging and selling.
- **About one chore a minute** for four colonies (24 to 42 in 30 minutes). Whether that is pleasant upkeep or nagging is the main thing to feel.
- **Neglect is nearly free on a lucky seed.** On seed 1 the neglecter scored higher stars (2.86) than the game with conditions off (2.74), because mild weather kept colonies in band and paid the bonus anyway.
- **Oyster is the needy one.** It likes high moisture and low light; every weather except drizzle and rain dries it out of band in about 3 minutes, and sunny spells push its light out too. Wine cap, liking the middle of everything, is rarely out of band.
- **Environment pieces were not exercised by the bot.** A mister costs 50 coins against about 340 earned in 30 minutes, so it is affordable early; whether it pays for itself is untested.
- **The switches-off run is exact,** so packet 04 can compare any feature mix against the packet 01 baseline on the same seeds.

## Only Justin can judge, by playing

1. Whether a chore about once a minute feels like pleasant upkeep or like nagging.
2. Whether the three bars are readable at that size, and whether it matters that the character covers them when standing on a colony.
3. Whether seeing the next weather makes you plan, or you just react to red markers.
4. Whether one press to fix a condition is too little to feel like a chore.
5. Whether a one-star swing is a reason to care at these prices.
6. Whether buying a mister or shade cloth feels like relief.
