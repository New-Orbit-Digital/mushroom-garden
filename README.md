# Mushroom garden (working title)

A cozy, unpunishing economy game about a small mushroom garden. Species arrive when the garden suits them, you cultivate them from spores, and buyers come to you by creek, by land and by letter.

**Status:** design stage. No game code yet. The only built thing is the economy lab, a flat simulator used to tune the core economy before anything else is made.

## Ground rules

- No time limit and no energy meter.
- Time passes only while playing.
- Nothing is lost for good: anything unpicked or unsold becomes another resource.
- The garden is the main stage; buyers come to the player.
- The 3D world is not built until most ideas are scoped.

## Where things are

| What | File |
|---|---|
| The rules as currently scoped, open questions, decision log | `docs/design-v0_2.md` (v0.1 kept for history) |
| Every tunable number, labeled with what happens when it changes | `shared/tuning.js` |
| The economy lab, a single HTML file that reads the tuning file | `tools/lab.html` |

Open `tools/lab.html` in a browser from a local clone to use the lab. It loads `../shared/tuning.js`, so edit the tuning file and reload.

## How work happens here

- Ideas are worked out in chat first, then written into `docs/`.
- Tunable values live in one isolated tuning file, edited directly.
- Verified results are stamped into the file they describe, with the date and the evidence.
- Design docs are versioned by filename, and older versions stay.

## Hosting

Nothing is hosted yet. When there is something to play it goes to justbost.com like the other games.
