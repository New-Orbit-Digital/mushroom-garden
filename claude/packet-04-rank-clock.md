# Packet 04: the rank clock and what each rank releases

**Status:** drafted by Claude on 23 Oct 2026 and built the same day on Justin's go ("keep working on building mechanics, we can use content placeholders"). The choices below are Claude's defaults; any can be changed after Justin plays it.

**Executor:** Claude, on branch `packet-04` (stacked on `packet-03`), opening a PR.
**Prerequisite:** packet 03 (PR #4). Merge packet 03 first.
**Read first:** `docs/design-v0_4.md` section 5, `claude/packet-03-result.md`.

**Split from v0.4's packet 4.** Design v0.4 put the rank clock, staged shops and visitors, and helpers in one packet. This packet builds the rank clock and releases only what already exists in the game. Shops, visitors and helpers are new systems and follow as packet 04b.

---

## Intent

Give the game its second clock. Experience from journal awards fills ranks; each rank releases species, garden pieces, garden space and buyers on a schedule. Releases arrive because the player discovered things, not because time passed or coins piled up. This is design v0.4's answer to the burst-then-gap pacing the v0.2 lab measured.

---

## Decisions already made (Justin, design v0.4)

1. Experience comes only from journal awards, each earned once (built in packet 03).
2. Experience needed per rank rises, set in `shared/tuning.js`.
3. A title every five ranks.
4. Ranks gate the late, large species and everything around them; most species still arrive through ladders and chains.

---

## Choices (Claude's defaults)

| # | Question | Default |
|---|---|---|
| A | The experience curve | Rank 1 to 2 costs `rank.firstXp` (25); each rank after costs `rank.growth` (1.08) times the one before. No cap for now; titles stop at rank 41. |
| B | What ranks gate | Each species and each placeable piece has a rank in tuning. A species cannot Appear before its rank. A piece cannot be placed before its rank. |
| C | The placeholder schedule | Mirrors v0.4 section 5 for what exists today: tier 1 species and their pieces at rank 1; tier 2 at 4 and 6; tier 3 at 9 and 13; tier 4 at 21 to 27; tier 5 at 30 to 38. Environment pieces at 5 to 9. Trees at 21, 26 and 30. |
| D | Garden space | A cap on owned cells: 12 before rank 11, 30 from rank 11, the whole inner garden from rank 21. |
| E | Buyers | Creek buyers from the start. The travelling merchant (road) from rank 12. |
| F | Titles | Nine names in `shared/content.js`, one per five ranks: New grower, Grower, Skilled grower, Seasoned grower, Expert grower, Master grower, Renowned grower, Legendary grower, Grand mycologist. |
| G | A rank-up | Logged with the new rank, any new title and what it releases. |
| H | A switch | `features.ranks`. Off releases everything at the start, as in packet 03, so earlier baselines stay comparable. |

---

## Contract

### 1. Engine

- `state.rank`, recomputed when experience is granted; a rank-up logs its releases.
- `appearEligible` also needs the species' rank; `placePiece` and `buyCell` refuse with the rank that opens them; road buyers wait for their rank.
- Pure helpers in `rules.js`: rank from experience, experience for a rank, the title for a rank, the cell cap for a rank, whether a species or piece is released.
- `query.js`: `releasesAt(rank)` and `nextRelease(state)` in words, for the screen.

### 2. Tuning and content

- `shared/tuning.js`: `features.ranks`; `rank.firstXp`, `rank.growth`, `rank.titleEvery`; a `rank` on each species and each piece; `garden.cellCaps`; `land.rank`. Every line commented.
- `shared/content.js`: the nine titles.

### 3. Screen

- The stats line shows rank, title and an experience bar to the next rank.
- The side panel shows what the next rank releases.
- The build palette marks pieces not yet released with the rank that opens them.

### 4. Scripted player

- Unchanged in behaviour; it now plays under the rank gates. `tools/stamp.mjs` prints the rank reached.

---

## Acceptance

- [ ] `node --test` passes; earlier tests keep their meaning (tests that place late pieces run with ranks off)
- [ ] Tests cover: the curve and rank from experience, including several ranks at once; titles every five ranks; a species does not Appear before its rank and does after; a piece is refused before its rank and placed after; the cell cap per rank; no road merchant before its rank; with ranks off everything is open; the switches-off baseline from packet 03 still holds
- [ ] Same seed and inputs give an identical end state twice
- [ ] `src/engine/` stays pure; no numbers in `src/` beyond 0, 1 and 2
- [ ] Browser at 1280x720: rank, title, experience bar, next release and locked palette entries show, with no console errors

---

## Out of scope

Shops, visitors, helpers, tools and the processing shed (packet 04b). Threats, losses, variants and the maze (packet 05). Fitting the curve and schedule (packet 06's bots). Content pass.

---

## Not verifiable headless

Whether ranks arrive often enough to feel like progress, whether the next-release line pulls the player forward, and whether locked palette entries feel like goals or like walls.

---

## Result and verification stamp

Write `claude/packet-04-result.md` with this stamp:

```
Packet 04 completed <date> at <commit sha>
Tests: <n passed / n total>   CI: <url or NOT RUN>
Determinism check: <pass/fail>
Scripted 30-minute run, seed 1, tending: <coins>, rank <n> (<title>), <xp>, <species at each step>
Scripted 60-minute run, seed 1, tending: rank <n>, <xp>
Switches-off run matches packet 03 baseline: <pass/fail>
Engine purity check: <pass/fail>
```
