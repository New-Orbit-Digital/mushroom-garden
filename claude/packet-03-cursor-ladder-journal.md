# Packet 03: cursor-only controls, the species ladder, the journal and awards

**Status:** drafted by Claude on 23 Oct 2026 and built the same day on Justin's go ("keep working on building mechanics, we can use content placeholders"). The choices below are Claude's defaults; any can be changed after Justin plays it.

**Executor:** Claude, on branch `packet-03`, opening a PR to `main`.
**Prerequisite:** packets 01 and 02, merged to `main` at `c7eacb9` on 23 Oct 2026.
**Blocks:** packets 04 to 06.
**Read first:** `docs/design-v0_4.md` (sections 1, 3, 5 and 7 are the source for this packet), `claude/packet-02-result.md`.

---

## Intent

Turn the mockup into the shape design v0.4 describes. The player acts with the cursor, not a walking character. Every species climbs a four-step ladder (Appear, Visit, Resident, Spread). The journal shows each species' next condition, and every first on the way is an award worth experience, ready for packet 04's rank clock.

Content stays as placeholders: the 19 species from v0.3 keep their names and numbers until the content pass.

---

## Decisions already made (Justin, design v0.4)

1. Cursor only. No character on screen; the player acts anywhere with the cursor. The "must be next to it" rule goes.
2. Four steps per species: Appear (an outline at the edge), Visit (a wild flush to forage), Resident (an established colony), Spread (two colonies make a third).
3. The Appear rule stays "at least one needed piece". The Visit rule becomes "all needed pieces".
4. The journal shows each next condition.
5. Experience comes only from awards, and each award is earned once.
6. The basket, buyers, compost, weather, conditions and chores stay as built.

---

## Choices (Claude's defaults)

| # | Question | Default |
|---|---|---|
| A | What does a click on a colony do? | The first that applies: pick, collect compost, tend, spread. The hover hint says which before the click. |
| B | Where must a species' pieces be for Visit? | Anywhere in the garden. A parasite also needs an established host colony anywhere. Reach still matters for Resident. |
| C | How does Spread work here? | Instant, on a click. Two established colonies of a species within reach of each other, its home piece within reach of either, and a free owned cell within reach of both where its needs are met. The new colony starts fruiting; no spore is used. Both parents rest for `spreadRestMinutes`. The mycelium maze and the starter culture arrive in packet 05. |
| D | What is a species' home piece? | Its first listed need, unless the species names a `home`. |
| E | Which awards exist now? | Per species: Appear, Visit (first forage), Resident (first colony established), Spread, seven established colonies at once, first 5-star harvest. Per buyer kind: first sale. Variant, processing and threat awards come with their packets. |
| F | What if a later step comes first (say a spore from elsewhere)? | The earlier steps are awarded at the same moment, so the ladder never has gaps. |
| G | What do the C, R and Q keys do now? | C composts the colony under the cursor, R sells spare spores to the buyer under the cursor, Q picks the next spore. B and P are unchanged. |
| H | How does the scripted player stand in for cursor time? | Each action it takes costs `bot.secondsPerAction` of game time. |
| I | The packet 01 baseline (323 coins on seed 1) | Retired: it depended on walking. This packet records a new baseline for switches-off and switches-on runs. |

---

## Contract

### 1. Engine

- Remove the move action, the player position, walking and every "too far" refusal. `isNear` goes from `rules.js`.
- Wild records gain an outline stage: Appear makes an outline on a free edge cell (not forageable); when Visit holds, the outline becomes a flush that can be foraged; after foraging it regrows to a flush if Visit still holds, else an outline.
- New state: `ladder` (species id to the highest step reached), `awards` (award id to the time earned) and `xp`.
- One new action: `spread`, on a colony cell, refused with a reason for each unmet part of choice C.
- Awards are granted in the engine where each first happens, logged as a journal line with the experience earned.
- `src/engine/query.js`: `actionAt(state, content, tuning, point, selectedSpore)` returns what a click at a point would do (an action, or only a label), and `journal(state, content, tuning)` returns one entry per species that has appeared, with its step and the next condition in words. `suggestAction` and the nearest-thing helpers go.

### 2. Tuning and content

- `shared/tuning.js`: remove the walking and reach-ring settings; add `spreadRestMinutes`, `sevenColonies`, `awards.xp` per award kind, `pointReach` (how close a click must land to a buyer), `bot.secondsPerAction`, and the hover and outline settings for the screen. Every line commented.
- `shared/content.js`: no list changes. `home` is optional per species (choice D).

### 3. Screen

- Hover shows what a click would do in the hint line, and outlines the cell under the cursor. Click does it.
- Outlines at the edge are drawn faint and dashed with the species name; flushes as before.
- A Journal section in the side panel: each species that has appeared, its step (1 to 4), and its next condition; a count of species not yet seen; awards earned and total experience.
- The key line in the page header matches the new controls.

### 4. Scripted player

- `tools/scripted-run.js` acts without walking, pays `bot.secondsPerAction` per action, buys a few cells beside its first bed once it can afford them, and spreads when it can.
- `tools/stamp.mjs` prints this packet's stamp.

---

## Acceptance

- [ ] `node --test` passes; packet 01 and 02 tests are kept in meaning, with "too far" checks replaced by their cursor-only equivalents
- [ ] Tests cover: no `move` action and no player in state; Appear makes an outline that cannot be foraged; Visit needs every piece and turns it into a flush; a parasite's Visit needs an established host; foraging, the first established colony, Spread, seven colonies and a 5-star pick each grant their award once; a later step grants the earlier ones; each Spread refusal reason; Spread makes a fruiting colony and rests both parents; first sale per buyer kind; the journal's next condition at each step; `actionAt` picks the action of choice A and finds a buyer under the cursor
- [ ] The same seed and inputs give an identical end state twice, with all switches on
- [ ] The scripted 30-minute run on seed 1 reaches Resident for at least one species and ends with coins above zero
- [ ] `src/engine/` stays pure; no numbers hard-coded in `src/` beyond 0, 1 and 2
- [ ] Loaded in a browser at 1280x720 with no console errors; hover hint, click actions and the journal work

---

## Out of scope

The rank clock, titles and what ranks release (packet 04). Shops, visitors and helpers (packet 04). Threats, disease, losses, variants, the mycelium maze and the starter culture (packet 05). Bots, pacing and fitting (packet 06). Silly species content (the content pass). Art, sound, saving, touch.

---

## Not verifiable headless

Whether clicking feels better than walking, whether the hover hint is enough to know what a click does, whether outlines read as "coming soon", and whether the journal's next conditions are clear. That needs Justin to play it.

---

## Result and verification stamp

Write `claude/packet-03-result.md` on completion: what was built, any contract item changed and why, balance observations, and this stamp.

```
Packet 03 completed <date> at <commit sha>
Tests: <n passed / n total>   CI: <url or NOT RUN>
Determinism check: <pass/fail>
Scripted 30-minute run, seed 1, tending: <coins>, <species at each step>, <awards>, <xp>
Scripted 30-minute run, seed 1, switches off: <coins>, <species at each step>
Engine purity check: <pass/fail>
```
