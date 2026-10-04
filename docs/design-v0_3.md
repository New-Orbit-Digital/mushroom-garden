# Mushroom garden (working title): design v0.3

Date: 4 Oct 2026. Amends v0.2: everything in `design-v0_2.md` stands unless this doc changes it.
Rules here are Justin's decisions from 4 Oct. The content tables and every number are **placeholders** by Claude. Species and substrate pairings come from Claude's general knowledge and are not checked against a source.

## 1. What changed since v0.2

- **Goal:** a full journal. This loop will likely be merged into a larger game, so it must stand alone: nothing may depend on a world beyond the garden, the creek and the road.
- **Length and rhythm:** about 20 hours of play, with something new every 30 to 40 minutes. The point is to avoid hours with no progress.
- **A beat is:** a new wild species appearing, a first colony of a species establishing, a new habitat piece or fixture, or a journal entry completing. Upgrade levels and letters do not count.
- **Weather helps and hinders.** Rain brings moisture and can bring too much. Wind freshens air and can dry or batter. Sun is good and too much harms.
- **Three conditions per colony:** moisture, air and light. Each species likes a band of each.
- **Upkeep:** established colonies need small chores to keep conditions in band. Neglect only lowers quality. Nothing dies and nothing is lost.
- **Upgrades offset weather.** Habitat and fixtures hold a condition steady so the matching chore fades.
- **Buyer fixtures:** a bulletin board on the road where travellers post "seeking X, selling Y, back in Z", and a dock on the creek where buyers stop and wait.
- **No action budget.** The lab's "actions per minute" was a simulator stand-in for walking time. The game has no such meter.
- **Soft timeboxes** (placeholders, to be tested in play): a ready mushroom waits about 8 minutes, a creek buyer is in reach about 2 minutes, a picked mushroom stays fresh about 4 to 17 minutes by stability.
- **Mockup form:** top-down, flat 2D placeholders, keyboard on desktop first. The later 3D version is likely a PC game; top-down may also suit mobile.

## 2. Conditions, weather and chores

| Condition | Pushed up by | Pushed down by | Chore | Held steady by |
|---|---|---|---|---|
| Moisture | Rain, misting | Sun, wind | Mist (raise), uncover or drain (lower) | Mister, rain cover, drainage bed |
| Air | Wind, fanning | Still weather, crowding | Fan or vent | Fan, windbreak (against excess) |
| Light | Sun | Shade, cloud | Shade or uncover | Shade cloth, trees |

Other chores, used where they fit a species: soaking logs to trigger a flush, topping up substrate, clearing spent stems, cutting out mould.

Quality at harvest reflects how many of the three conditions were in band while it grew, plus compost, plus luck.

## 3. Content: five tiers, about 37 beats

Needs are habitat pieces that must be within reach of the colony on the grid. "Likes" is the preferred band of moisture / air / light. stab: 0 spoils fast, 1 keeps.

| Tier | Species | Needs | Likes (M / A / L) | stab |
|---|---|---|---|---|
| 1 | Oyster | straw bed | high / mid / low | 0.6 |
| 1 | Wine cap | wood chips | mid / mid / mid | 0.5 |
| 1 | Field mushroom | compost bed | mid / low / low | 0.5 |
| 2 | Shiitake | hardwood log | mid / mid / low | 0.9 |
| 2 | Lion's mane | hardwood log, mister | high / high / low | 0.4 |
| 2 | Nameko | hardwood log, mister | high / low / low | 0.3 |
| 2 | Enoki | hardwood log, wood chips | mid / low / low | 0.6 |
| 3 | Shaggy mane | compost bed, soil bed | mid / mid / mid | 0.1 |
| 3 | Blewit | leaf litter | mid / mid / low | 0.5 |
| 3 | Parasol | soil bed | low / high / high | 0.4 |
| 4 | Chanterelle | oak, leaf litter | high / mid / low | 0.5 |
| 4 | Porcini | pine, soil bed | mid / mid / mid | 0.7 |
| 4 | Hedgehog | pine, leaf litter | mid / low / low | 0.6 |
| 4 | Black trumpet | oak, leaf litter, mister | high / low / low | 0.3 |
| 5 | Morel | soil bed, drainage bed | low / high / mid | 0.8 |
| 5 | Maitake | old oak | mid / mid / low | 0.6 |
| 5 | Matsutake | pine, drainage bed | low / mid / low | 0.5 |
| 5 | Truffle | old oak, soil bed | mid / low / low | 0.7 |
| 5 | Lobster mushroom | leaf litter; host: an established Chanterelle colony | mid / mid / low | 0.4 |

Placeholder price ranges by tier: 2 to 4, 5 to 9, 10 to 16, 18 to 30, 35 to 60.

**Substrates and trees (9):** straw bed, wood chips, compost bed, hardwood log, soil bed, leaf litter, oak, pine, old oak.

**Environment pieces (7):** mister, fan, shade cloth, rain cover, drainage bed, windbreak, soaking trough.

**Fixtures (5):** bigger basket, bulletin board, drying rack, dock, spore cabinet.

## 4. Measured findings that motivated these changes

From the v0.2 lab, baseline 2, 12-hour runs on 4 Oct:
- Species established at hours 0.2, 1.2, 2.0, 5.4, 9.4, 10.1 (Payback); 0.2, 1.0, 1.2, 1.8, 2.2, 6.5, 6.9 (Collector); 0.2, 2.2, 2.3, 4.1, 8.6 (Letter chaser). A burst, then gaps of three to four hours.
- A smoother cost ladder, a bigger basket, cheaper upgrades and equal demand for rare species each moved arrival times by about an hour. None removed the gaps.
- Turning weather off moved earnings from 3,525 to 3,355 coins, inside the noise.
- Taste strength at zero or full changed earnings by under 300 coins.

## 5. Build plan

One rules engine reading the tuning file, run two ways: played top-down by a person, and fast-forwarded by bots for the pacing timeline. Built as packets in `claude/`:

1. Engine and core loop: walk, build, forage, colony, harvest, basket ageing, sell
2. Weather, the three conditions and chores
3. Letters, bulletin board, dock, upgrades, journal
4. Bot fast-forward and the pacing timeline, then fitting costs to the 30 to 40 minute rhythm

## 6. Open questions

- Exact bands and how hard weather pushes, to be found by play
- What letters and bulletin posts offer besides requests
- How the journal reveals a species' needs step by step
- Which chores belong to which species
