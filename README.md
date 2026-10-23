# Mushroom garden (working title)

A garden game about silly invented mushrooms, built on Viva Piñata's systems: species arrive when the garden suits them, climb a four-step ladder, and every first earns a journal award. You cultivate them from spores, and buyers come to you by creek and by road.

**Status:** playable mockup. Top-down in a browser with flat placeholder shapes, on a rules engine that a person plays and bots can fast-forward. Built so far: the core loop (place habitat, forage, start a colony, harvest, basket ageing, sell), weather, conditions and chores, cursor-only controls, the species ladder (Appear, Visit, Resident, Spread), the journal and awards. Next: the rank clock, shops, visitors and helpers (packet 04), then threats, losses and variants (packet 05). Species are still v0.3 placeholders until the content pass.

## Ground rules

- No time limit and no energy meter.
- Time passes only while playing.
- Losses can be real, but never block progress (design v0.4).
- The garden is the main stage; buyers come to the player.
- The 3D world is not built until most ideas are scoped.

## Play it

```
node tools/serve.mjs
```

Then open http://localhost:8080. Add `?seed=7` to the address for a different random game. There is no build step and nothing to install; Node 22 is needed only for the server and the tests.

Controls: point at something to see what a click does, then click. Q picks which spore to plant, C composts the colony under the cursor, R sells spare spores to the buyer under the cursor, B toggles build mode (click places pieces and buys cells), P pauses.

## Where things are

| What | Where |
|---|---|
| The rules as scoped, open questions, decision log | `docs/design-v0_2.md`, amended by `docs/design-v0_3.md` and `docs/design-v0_4.md` (v0.1 kept for history) |
| Every number, each with a one-line comment | `shared/tuning.js` |
| Species, habitat pieces and buyers (lists, no numbers) | `shared/content.js` |
| The rules engine: no screen, no clock, seeded randomness | `src/engine/` |
| Canvas drawing, mouse and keys, side panel and journal | `src/ui/` |
| The page | `index.html` |
| Local server, scripted player, single-page build | `tools/` |
| Tests (`node --test`) | `test/` |
| Work packets and their results | `claude/` |

To change how the game plays, edit `shared/tuning.js` and reload the page. No number lives anywhere else.

## How work happens here

- Ideas are worked out in chat first, then written into `docs/`.
- Tunable values live in one isolated tuning file, edited directly.
- Verified results are stamped into the file they describe, with the date and the evidence.
- Design docs are versioned by filename, and older versions stay.
- Work is built as packets in `claude/`; each ends with a result file and a verification stamp.

## Hosting

Nothing is hosted yet. When there is something to play it goes to justbost.com like the other games.
