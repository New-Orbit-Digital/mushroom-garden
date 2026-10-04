# Mushroom garden (working title)

A cozy, unpunishing economy game about a small mushroom garden. Species arrive when the garden suits them, you cultivate them from spores, and buyers come to you by creek, by land and by letter.

**Status:** first playable mockup. The core loop (walk, place habitat, forage, start a colony, harvest, basket ageing, sell) runs top-down in a browser with flat placeholder shapes, on a rules engine that a person plays and bots can later fast-forward. Weather, chores, letters, fixtures, the journal and pacing are not built yet (packets 02 to 04).

## Ground rules

- No time limit and no energy meter.
- Time passes only while playing.
- Nothing is lost for good: anything unpicked or unsold becomes another resource.
- The garden is the main stage; buyers come to the player.
- The 3D world is not built until most ideas are scoped.

## Play it

```
node tools/serve.mjs
```

Then open http://localhost:8080. Add `?seed=7` to the address for a different random game. There is no build step and nothing to install; Node 22 is needed only for the server and the tests.

Keys: WASD or arrows walk, E acts on the nearest thing, Q picks which spore to plant, C composts a colony, R sells spare spores to the merchant, B toggles build mode (mouse places pieces and buys cells), P pauses.

## Where things are

| What | Where |
|---|---|
| The rules as scoped, open questions, decision log | `docs/design-v0_2.md`, amended by `docs/design-v0_3.md` (v0.1 kept for history) |
| Every number, each with a one-line comment | `shared/tuning.js` |
| Species, habitat pieces and buyers (lists, no numbers) | `shared/content.js` |
| The rules engine: no screen, no clock, seeded randomness | `src/engine/` |
| Canvas drawing, keyboard and mouse, side panel | `src/ui/` |
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
