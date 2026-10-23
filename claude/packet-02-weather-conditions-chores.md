# Packet 02: weather, the three conditions and chores

**Status: DRAFT by Claude, 4 Oct 2026. Not approved. Do not build until Justin approves the "Choices for Justin" section.**

**Executor:** Claude (Cowork session), on branch `packet-02`, opening a PR to `main`.
**Prerequisite:** packet 01, merged to `main` at `65989ae` on 4 Oct 2026.
**Blocks:** packets 03 and 04.
**Read first:** `docs/design-v0_2.md`, `docs/design-v0_3.md` (section 2 is the source for this packet), `claude/packet-01-result.md`.

---

## Intent

Add the part of the loop that gives an established garden something to do: weather pushes three conditions around, each species likes a band of each, and small chores put a colony back in band. Neglect only lowers quality. Nothing dies and nothing is lost.

Every feature here gets an on/off switch in the tuning file, so that packet 04's bots can run the game with each feature alone, in pairs, and all together.

---

## Decisions already made (Justin, design v0.3)

1. Weather helps and hinders. Rain raises moisture and can bring too much. Wind freshens air and can dry or batter. Sun is good and too much harms.
2. Three conditions per colony: moisture, air, light. Each species likes a band of each (the table in design v0.3 section 3, already in `shared/content.js`).
3. Established colonies need small chores to keep conditions in band.
4. Neglect only lowers quality.
5. Habitat and fixtures hold a condition steady so the matching chore fades.
6. Quality at harvest reflects how many of the three conditions were in band while it grew, plus compost, plus luck.
7. No time limit, no energy meter, no action budget.

---

## Choices for Justin

Design v0.3 section 6 leaves these open. Each has a default the build will use unless changed. All numbers are placeholders in `shared/tuning.js`.

| # | Question | Default in this draft |
|---|---|---|
| A | How does weather behave? | One weather kind at a time from a short list (clear, sunny, hot, overcast, drizzle, rain, breezy, windy, still). It changes about every 5 minutes, drawn by weight from the seeded generator. Each kind has a push on moisture, air and light. |
| B | Is the next weather visible? | Yes. The side panel shows the current weather and the next one with a countdown, so chores can be planned rather than reacted to. |
| C | What is a condition, as a number? | 0 to 1 per colony per condition. Bands: low 0 to 0.4, mid 0.3 to 0.7, high 0.6 to 1 (they overlap a little on purpose, to be forgiving). Each condition drifts toward the level the weather sets, slowly: about 3 minutes from the middle of a band to its edge in the worst weather. |
| D | What does a chore do? | One press moves that condition to the middle of the species' band. The colony then drifts again. No holding a key, no minigame. |
| E | Which chores exist? | One pair per condition, from the design table: mist / drain (moisture), fan / shelter (air), uncover / shade (light). E on a colony does whichever chore is most needed; the hint says which. |
| F | Do fruiting colonies need chores? | No. Only established colonies drift. A new colony is safe until it establishes. |
| G | How does it move quality? | Each grow tracks the share of time each condition spent in band. All three in band for the whole grow: +1 star. Each condition out of band for most of the grow: -1 star, to a floor of 1 star. Compost and luck stay as in packet 01. |
| H | What do the environment pieces do? | Within reach of a colony each holds one side of one condition: mister (moisture cannot fall below band), rain cover and drainage bed (moisture cannot rise above band), fan (air cannot fall below), windbreak (air cannot rise above), shade cloth (light cannot rise above). All seven become placeable. |
| I | The species-specific chores (soak logs, top up substrate, clear stems, cut out mould) | Left out of this packet. The soaking trough is placeable but does nothing yet. Proposed for a later packet once the three conditions have been played. |
| J | Crowding ("air pushed down by crowding" in the design table) | Left out. Air is moved by weather, chores and pieces only. |
| K | Wild mushrooms | Not affected by weather. Their quality stays luck only. |

---

## Contract

### 1. Engine

- Weather state lives in the game state and advances in `engine.step`. It uses the engine's seeded generator, so the same seed and inputs still give the same state.
- Each established colony carries `moisture`, `air`, `light`, and for the current grow, the seconds spent in band and out of band per condition.
- `src/engine/conditions.js` (the seam left by packet 01) holds the rules: drift, bands, the effect of pieces, and `conditionQualityBonus`. The quality roll in `engine.js` does not change shape.
- One new action: `tend`, with a cell and a condition. It requires the player to be next to the colony, like every other action on a thing. It is refused when that condition is already in band.
- `src/engine/query.js` offers `tend` for the E key after pick and collect, and before starting a colony.
- Remove the unused `spawnBuyer` from the engine's return value (leftover noted in the packet 01 result).

### 2. Feature switches

In `shared/tuning.js`, each with a comment:

- `features.weather`: off means the weather stays at a neutral kind that pushes nothing.
- `features.conditions`: off means colonies do not drift and the condition bonus is zero (packet 01 behaviour).
- `features.moisture`, `features.air`, `features.light`: each condition can be frozen in band on its own.
- `features.envPieces`: off means environment pieces count as needs only, as in packet 01.

With every switch off, the packet 01 scripted run must give the same result as before this packet.

### 3. Content and tuning

- `shared/content.js`: the weather kinds list; each environment piece gets the condition and side it holds.
- `shared/tuning.js`: weather weights, change interval, the push of each kind on each condition, band edges, drift speed, the quality steps, and costs for the five environment pieces that had none.
- No number in `src/` beyond 0, 1 and 2, as in packet 01.

### 4. Screen

- Side panel: current weather, next weather and countdown.
- Each established colony shows three small bars (moisture, air, light) with the band marked, coloured when out of band.
- The E hint names the chore, for example "E: mist the Oyster".
- Keys 1, 2, 3, 4 are **not** added here; the speed control is held for the tooling packet.

### 5. Scripted player

- `tools/scripted-run.js` gains tending, behind a setting, so the same script can run as a tender or as a neglecter. No other bot work; styles and looped runs are packet 04.

---

## Acceptance

- [ ] `node --test` passes, including all packet 01 tests unchanged in meaning
- [ ] Tests cover: weather changes on schedule and is the same for the same seed; rain raises moisture, sun lowers it and raises light, wind raises air; a fruiting colony does not drift; `tend` puts the condition at the band middle, is refused out of reach and when already in band; a grow fully in band gets the bonus; a neglected grow is lowered and never below 1 star; neglect never removes a colony, a mushroom or a spore; each environment piece holds its side of its condition within reach and not beyond it
- [ ] With all feature switches off, the seed 1 scripted 30-minute run matches the packet 01 stamp (323 coins, 3 species foraged, 4 colonies started)
- [ ] Each switch alone changes only its own feature (one test per switch)
- [ ] Same seed and inputs give an identical end state twice, with all switches on
- [ ] `src/engine/` stays pure: no DOM, clock or global randomness
- [ ] No numbers hard-coded in `src/`
- [ ] Loaded in a browser at 1280x720 with no console errors; weather and the three bars are visible
- [ ] CI green, if the workflow file is in the repo by then (see packet 01 result, "Open item")

---

## Out of scope

Letters, bulletin board, dock, upgrades, fixtures and the journal (packet 03). Bot styles, looped runs, the event log, the pacing timeline, the speed keys and cost fitting (tooling, packet 04). Species-specific chores and crowding (choices I and J). Art, sound, saving, touch. Balance problems are written in the result file, not tuned.

---

## Not verifiable headless

Whether chores feel like pleasant upkeep or like nagging, whether the bars are readable at a glance, and whether seeing the next weather makes planning interesting. That needs Justin to play it.

---

## Result and verification stamp

Write `claude/packet-02-result.md` on completion: what was built, any contract item changed and why, balance observations, and this stamp.

```
Packet 02 completed <date> at <commit sha>
Tests: <n passed / n total>   CI: <url or NOT RUN>
Determinism check: <pass/fail>
Switches-off run matches packet 01 stamp: <pass/fail>
Scripted 30-minute run, seed 1, tending: <coins>, <average stars>, <chores done>
Scripted 30-minute run, seed 1, neglecting: <coins>, <average stars>
Engine purity check: <pass/fail>
```
