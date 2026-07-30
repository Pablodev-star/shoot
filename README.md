# SHOOT!

**Shoot!** is a turn-based western duel in pixel art. Reload, shield yourself, or
shoot before your rival. Walk the desert, manage hunger, buy at shops, rest at
inns, and ride through five worlds to the final boss.

Three years, four versions, one duel. This is the definitive one: plain
HTML/CSS/JS modules, no build step, no binary assets, hosted on GitHub Pages.

© 2026, All Rights Reserved.

---

## Play

Open `index.html` from any static web server. There is nothing to install and
nothing to compile:

```bash
python3 -m http.server 8000     # then visit http://localhost:8000
```

On GitHub Pages, serve the repository root.

## The duel

The rule set has not changed since the first prototype:

| Move       | Bullets   | You are…   | Effect                                                          |
| ---------- | --------- | ---------- | --------------------------------------------------------------- |
| **Reload** | +1        | vulnerable | —                                                                |
| **Shield** | unchanged | protected  | —                                                                |
| **Shoot**  | −1        | vulnerable | rival vulnerable → rival loses a life; rival shielded → nothing   |

Both duellists shoot in the same turn → both lose a life. First to zero lives
loses. Lives are red diamonds, and always will be.

## Story mode

There is no level select. You walk, and the road decides what you meet.

- **Auto-walk** through a side-scrolling desert with five parallax layers. No
  progress bar, no timer — you only ever see your character walking.
- **Guided randomness**: every world guarantees a minimum number of duels, shops
  and inns, then shuffles their order and spacing. An inn always sits just past
  a shop.
- **Hunger** drains while you travel. At zero you lose a life every 12 seconds,
  so food is a real purchase, not a nicety.
- **A horse** roughly halves travel time.
- **Day and night** run on a continuous clock, and the **weather** turns —
  overcast, rain, sandstorm. Both reach into combat: rain misfires, a sandstorm
  or nightfall throws off your opponent's read on you.
- **Shops** stock three items (more with the right perks) rolled from a
  per-world rarity table, at exponential prices, with random half-price deals.
- **Inns** sell a basic bed (heals more in later worlds) or a premium bed (heals
  everything).
- **A real inventory**: eat, heal, throw dynamite mid-duel, or sell anything back
  for half its value.
- **Five worlds plus the Galaxy**, where a two-phase boss is waiting.

Three save slots. Progress writes after every encounter.

## Online

The online lobby is **built but not wired**: room browser, create-room dialog,
join-by-code and matchmaking are all there at final visual quality, and every
action politely says *coming soon*. When the backend exists, only the handlers
marked `// NETWORK:` in `src/menu/online.js` need bodies.

## Layout

```
index.html              boot page: one canvas, one screen root, one overlay
styles/                 base tokens · UI kit · menu screens · game screens
src/
  main.js               boot order + screen registry
  core/                 engine plumbing, no game rules
    scene.js              shared canvas + frame loop
    router.js             screen mounting and the saloon-door transition
    events.js             the event bus every system talks through
    storage.js            THE data access layer — swap this for a remote DB
    settings.js           device settings + local profile
    audio.js              synthesised placeholder cues + the real-file manifest
    rng.js, dom.js        seeded randomness, DOM helpers
  art/                   every sprite, drawn from character maps at load time
    palette.js            the one palette the whole game uses
    pixel.js, font.js     baking helpers + a built-in 5x7 pixel font
    sprites-character.js  player, rider and horse animations (Block 2a)
    sprites-environment.js props, buildings, parallax layers (Block 2b)
    sprites-items.js      item and UI icons (Block 2c)
  menu/                  title, online, profile, settings, credits
  explore/               walk engine, parallax, encounters, hunger, day/night, weather
  shops/                 shop and inn logic + screens
  duel/                  duel engine, agents, scene, screen
  game/                  items, worlds, progression maths, player state,
                         enemies, save slots, run controller, interstitials
```

Three rules hold the architecture together:

1. **Systems never import each other's screens.** They publish events
   (`src/core/events.js`) and the run controller routes.
2. **Nothing touches `localStorage` directly.** Everything goes through
   `src/core/storage.js`, so moving saves to a server is a one-file change.
3. **The duel engine knows nothing about input or drawing.** Each side is an
   agent with one method, `chooseMove()`. Story mode passes a UI agent and an AI
   agent; online will pass a network agent and change nothing else.

## Tuning

Balance lives in data, not in code:

- `src/game/worlds.js` — per-world difficulty, rarity tables, price and reward
  multipliers, encounter guarantees, bosses.
- `src/game/progression.js` — every curve: exp, gold, prices, inn healing,
  hunger drain, walking speed, the horse discount.
- `src/game/items.js` — the item catalogue. Adding an entry is enough; shops,
  inventory, selling and the duel item bar pick it up.

## Adding audio

`src/core/audio.js` synthesises every cue so the game is never silent. To use
real sound, drop the files listed in `AUDIO_MANIFEST` into `/assets/audio/` and
set `USE_FILES = true`. Nothing else changes.

## Development hook

`window.SHOOT` is exposed in the browser console for testing:

```js
SHOOT.go('shop', { encounter: { index: 0 } });
SHOOT.player.addGold(1000);
SHOOT.run.beginWorld(6);        // jump to the Galaxy
```

## Keyboard

`1` reload · `2` shield · `3` shoot · `I` saddlebag.
