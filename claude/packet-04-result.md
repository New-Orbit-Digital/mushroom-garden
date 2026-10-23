# Packet 04 result: the rank clock and what each rank releases

Executor: Claude, 23 Oct 2026. Branch `packet-04`, stacked on `packet-03`, PR #5 to `main`, not merged. Merge PR #4 first.

The contract (`claude/packet-04-rank-clock.md`) was drafted and built the same day on Justin's go ("keep working on building mechanics, we can use content placeholders"). Its choices A to H are Claude's defaults. Shops, visitors and helpers were split out to packet 04b.

## Verification stamp

```
Packet 04 completed 23 Oct 2026 at c181b90fc6c7a869f42ed61538daf28f4b0b461f
Tests: 67 passed / 67 total   CI: pass, https://github.com/New-Orbit-Digital/mushroom-garden/actions/runs/39963384887/job/120446844192
Determinism check: pass
Scripted 30-minute run, seed 1, tending (explorer): 29 coins, rank 5 (New grower), 140 xp; ladder: 1 at appear, 1 resident, 1 spread
Scripted 60-minute run, seed 1, tending (explorer): rank 7 (Grower), 200 xp
Switches-off run matches packet 03 baseline: pass (137 coins, 2 species foraged, 9 colonies started)
Engine purity check: pass
```

The experience figures below (312 to rank 10, 6,479 to rank 41, 2,310 from every current award) were computed with the engine's own `xpAtRank` and `rankFromXp`, not estimated.

How each line was checked: a fresh `git clone` of branch `packet-04` at the commit above, Node v22.22.0, `node --test` and `node tools/stamp.mjs`. CI is the GitHub Actions run on PR #5 for the same commit. The page was loaded in headless Chromium at 1280x720: the stats line read "Rank 1 New grower 0/25 xp" with "Rank 4 brings: Shiitake can appear, Enoki can appear, Hardwood log"; build mode showed 13 of 16 pieces locked, each labelled with its rank; clicking with Hardwood log selected gave "Can't: Hardwood log opens at rank 4". No console errors.

## Acceptance list

- [x] `node --test` passes: 67 of 67. Earlier tests keep their meaning; those that place late pieces now run with ranks off (`newGame` in `tools/testkit.js`), and rank tests use `rankedGame`.
- [x] Tests cover every case the contract lists (`test/ranks.test.js`, 12 tests), plus a schedule check (below).
- [x] Same seed and inputs give an identical end state twice, under the rank gates.
- [x] `src/engine/` stays pure; no numbers in `src/` beyond 0, 1 and 2.
- [x] Browser at 1280x720: rank, title, experience bar, next release and locked palette entries show; no console errors.

## What was built

- **The curve.** Rank 1 to 2 costs 25 experience; each rank after costs 1.08 times the one before (rank 10 needs 312 experience in all, rank 41 needs 6,479). Rank is recomputed whenever an award adds experience; one award can lift several ranks.
- **Titles.** Nine names in `shared/content.js`, one per five ranks; the last holds past rank 41.
- **Releases.** Each species has a `rank` (it cannot Appear before it); each piece has a `pieceRank` (it cannot be placed before it); `garden.cellCaps` limits owned cells (12, then 30 at rank 11, then the whole inner garden of 84 at rank 21); the road merchant waits for `land.rank` (12), and its first visit is timed from that rank.
- **Rank-up messages.** For example: "Rank 6, Grower. New: the title Grower, Lion's mane can appear, Nameko can appear, Mister."
- **Screen.** Rank, title and an experience bar on the stats line; "Rank N brings: ..." beneath it; locked palette pieces are faded, dashed and labelled "opens at rank N".
- **Switch.** `features.ranks` off opens everything at the start.
- **Scripted player.** A new `explore` option tries each released habitat piece once, cheapest first, keeping 20 coins back. Off by default, so packet 03's baseline player is unchanged.

## Contract changes and choices made while building

1. **Hardwood log moved from rank 6 to rank 4.** The first schedule released Shiitake and Enoki at rank 4 but the log they need at rank 6, so rank 4's release did nothing. A new test checks that no species is ever released before its pieces or its host.
2. **The explorer is an option, not a change to the baseline player**, so the packet 03 baseline stays comparable.
3. **Placeholder rank for every species and piece:**

| Rank | Releases |
|---|---|
| 1 | Oyster, Wine cap, Field mushroom; Straw bed, Wood chips, Compost bed; up to 12 cells |
| 4 | Shiitake, Enoki; Hardwood log |
| 5 | Shade cloth, Rain cover |
| 6 | Title Grower; Lion's mane, Nameko; Mister |
| 7 | Drainage bed |
| 8 | Fan, Windbreak |
| 9 | Shaggy mane, Parasol; Soil bed, Soaking trough |
| 11 | Title Skilled grower; up to 30 cells |
| 12 | The travelling merchant by road |
| 13 | Blewit; Leaf litter |
| 16 | Title Seasoned grower |
| 21 | Title Expert grower; Chanterelle; Oak; the whole inner garden |
| 26 | Title Master grower; Porcini, Hedgehog; Pine |
| 27 | Black trumpet |
| 30 | Morel; Old oak |
| 31 | Title Renowned grower |
| 32, 33 | Maitake; Matsutake |
| 36 | Title Legendary grower; Truffle |
| 38 | Lobster mushroom |

## Balance observations (not tuned)

From the explorer, which tries each released piece once but plants without a plan. Treat as hints; packet 06's bots will measure properly.

| Seed | 30 min: rank | Experience | Awards |
|---|---|---|---|
| 1 | 5 | 140 | 11 |
| 2 | 6 | 170 | 11 |
| 3 | 7 | 185 | 13 |
| 4 | 7 | 210 | 15 |
| 5 | 7 | 195 | 13 |

- **The 30-minute player reaches rank 5 to 7.** Ranks 2 to 4 come in the first ten minutes; the first title change (rank 6) lands near the half hour.
- **Award gaps open after the first quarter hour.** On seed 1 over 60 minutes, awards came at 0.0, 0.0, 3.1, 5.5, 7.6, 10.6, 10.6, 13.7, 13.7, 28.6, 28.8, 36.3, 50.8 and 58.2 minutes. The two longest gaps are about 15 minutes each, inside the 30 to 40 minute rhythm, but this player finds far fewer firsts than a person would.
- **Experience on hand runs out at the 19 placeholder species.** All awards for 19 species and 3 buyer kinds add up to 2,310 experience, which reaches rank 28. The 60-species content pass, variants and threat awards fill the rest; packet 06 should fit the curve to the real total.
- **Without exploring, a player stalls at rank 5.** The packet 03 player, which only ever places a straw bed and wood chips, earns nothing after minute 12. Ranks reward trying new pieces, which is the intent.
- **Coins drop for the explorer** (29 at 30 minutes against 160 for the packet 03 player) because it buys pieces it does not yet use well.

## Only Justin can judge, by playing

1. Whether ranks arrive often enough to feel like progress in the first hour.
2. Whether "Rank N brings" pulls you forward.
3. Whether faded palette pieces feel like goals or like walls.
4. Whether 12 cells before rank 11 feels roomy or cramped.
