# Packet 01: engine and core loop (top-down mockup)

**Executor:** Claude Code, working in a clone of `New-Orbit-Digital/mushroom-garden` on branch `packet-01`, opening a PR to `main`.
**Planner:** Claude chat session (🔨 Mushroom garden mockup), 4 Oct 2026.
**Prerequisite:** none. This is the first packet.
**Blocks:** packets 02 to 04.
**Read first:** `docs/design-v0_2.md`, then `docs/design-v0_3.md`.

---

## Intent

Make the core loop playable in a browser as a top-down mockup with flat 2D placeholders, on a rules engine that a person can play and, later, bots can fast-forward. Justin wants to feel whether the loop and its soft timeboxes are forgiving before anything is built in 3D.

The loop in this packet: walk, place habitat, forage a wild mushroom, start a colony from its spore, harvest by hand, watch the basket age, sell to buyers who come by creek and by road.

---

## Decisions (Justin)

1. Top-down view, flat 2D placeholders. No art.
2. Keyboard on desktop first.
3. A character on screen that the player moves. Placing things happens in a build mode with no character.
4. Harvesting happens only when the player does it.
5. Time passes only while the page is open and unpaused. No offline progress.
6. Nothing is lost for good (see the ageing paths in design v0.2 section 6).
7. Every tunable value lives in one isolated tuning file that Justin edits directly. No in-game tuning panel.
8. There is no action budget or energy meter of any kind.

---

## Contract

### 1. Stack and layout

- No build step. Native ES modules, plain canvas 2D, no framework, no dependencies at runtime.
- Node 22 for tests (`node --test`). No test framework dependency.

```
index.html
src/engine/     rules only. No DOM, no canvas, no Date.now, no Math.random.
src/ui/         canvas drawing, input, HUD
shared/tuning.js    every number, commented
shared/content.js   species, habitat pieces, buyers (lists, not numbers)
tools/serve.mjs     one-file static server for local play
test/           node tests
claude/         packets and results
```

- Remove the two stale lines in `README.md` that point at `tools/lab.html` and describe the old lab; describe this layout instead.

### 2. Engine

- Deterministic. A seeded RNG owned by the engine; `?seed=` in the URL sets it. Same seed and same inputs give the same state.
- Advances by `engine.step(seconds)`. The UI calls it from the frame loop; tests call it directly.
- All player intent goes through one actions API, for example `engine.act({ type: "pick", cell })`. Packet 04's bots will call the same API, so the UI must not reach into state to change it.
- Actions needed now: move (the engine owns the player's position and walking speed), forage, startColony, pick, collectCompost, applyCompost, sell, and in build mode buyCell, placePiece.
- An action on a thing requires the player to be next to it. Build-mode actions do not.

### 3. Garden and grid

- A rectangular grid. Owned cells are usable; more are bought in build mode at a rising cost.
- Each habitat piece and each colony takes one cell.
- A colony's need for a piece is met when that piece is within `reach` cells (start with the 8 neighbours).
- The creek runs along one side and the road along the opposite side. Wild mushrooms appear on edge cells.

### 4. Species lifecycle

- **Wild:** a species appears at the edge once at least one of its needed pieces exists in the garden. It reappears `wildRegrow` after being foraged. Foraging gives one fresh mushroom and one spore.
- **Colony:** needs one spore, a free owned cell and every needed piece within reach. Fruiting for `wait`, then established. Fruiting colonies grow at half speed.
- **Grow:** every `growMinutes` an established colony has one mushroom ready. It waits `unpickedMinutes`; unpicked, it becomes a compost pile on that cell, collected by hand.
- **Host:** Lobster mushroom needs an established Chanterelle colony within reach.
- **Quality** in this packet is luck plus compost only, 1 to 5 stars. Conditions arrive in packet 02; leave a clear seam for them.

### 5. Basket

- Holds `basketSize` mushrooms. Each has species, quality and age.
- Fresh for `freshBase x (0.3 + 2 x stab)` minutes, then dried for `driedFactor` times that, then it becomes one compost and one spore.
- Compost applied to a colony lifts the next grow's quality and is used up.

### 6. Buyers

- Creek buyers drift along the creek and are in reach for `creekStay`. Land merchants walk in along the road and stand for `landStay`.
- Each is one of the buyer kinds in `content.js` and wants two or three species, a few of each, drawn by rarity.
- What a buyer wants is visible before the player walks over.
- Price: species price x stability premium x quality multiplier x buyer taste; dried sells at `driedShare`, and the travelling merchant pays a bonus for dried and buys spare spores.
- Selling requires standing next to the buyer.

### 7. Content and tuning

- `shared/content.js` holds all 19 species, the 9 substrates and trees, and the three buyer kinds from design v0.3 section 3. Environment pieces and fixtures from that section are listed but inert until packets 02 and 03.
- `shared/tuning.js` holds every number with a one-line comment saying what it does. Starting values: take them from design v0.3 section 1 (timeboxes) and the tier price ranges; choose the rest sensibly and mark the file header "placeholders, not tuned".
- No number may be hard-coded in `src/`.

### 8. Screen and controls

- WASD or arrows to walk. E to act on the nearest thing in reach. B toggles build mode, where the mouse places pieces and buys cells. P pauses.
- Flat shapes with text labels: squares for habitat, circles for colonies, a different outline for wild mushrooms, a strip for the creek, a strip for the road.
- A colony shows whether it is fruiting, established or has a mushroom ready, and how long the ready mushroom has left.
- HUD: coins, basket contents with a freshness bar each, spores per species, compost count, and each present buyer's wants.
- Readable at 1280x720.

---

## Acceptance

- [ ] `node tools/serve.mjs` serves the game; a new player can forage, start a colony, harvest and sell within ten minutes of play
- [ ] `node --test` passes
- [ ] Tests cover: wild appears only when a needed piece exists; colony start is refused without a spore, a free cell or needs in reach; fruiting to established timing; an unpicked mushroom becomes a compost pile and gives no spore; basket ageing goes fresh, dried, then one compost and one spore; a restaurant refuses dried; the merchant pays the dried bonus; selling out of reach is refused; Lobster mushroom needs its host
- [ ] One scripted test plays 30 simulated minutes through the actions API only and ends with coins above zero
- [ ] The same seed and inputs give an identical end state twice
- [ ] `src/engine/` imports nothing from `src/ui/` and uses no DOM, `Date.now` or `Math.random`
- [ ] No numbers hard-coded in `src/`
- [ ] A CI workflow runs `node --test` on push and PR to `main`, and is green

---

## Out of scope

Weather, the three conditions and chores (packet 02). Letters, bulletin board, dock, upgrades and the journal screen (packet 03). Bots, the pacing timeline and cost fitting (packet 04). Art, sound, saving progress, touch controls. If play reveals a balance problem, write it in the result file; do not tune it here.

---

## Not verifiable headless

Whether the timeboxes feel forgiving, whether walking distance feels right, and whether the loop is pleasant. That needs Justin to play it.

---

## Result and verification stamp

Write `claude/packet-01-result.md` on completion: what was built, any contract item changed and why, anything noticed about balance, and this stamp.

```
Packet 01 completed <date> at <commit sha>
Tests: <n passed / n total>   CI: <url>
Determinism check: <pass/fail>
Scripted 30-minute run, seed 1: <coins at end>, <species foraged>, <colonies started>
Engine purity check: <pass/fail>
```
