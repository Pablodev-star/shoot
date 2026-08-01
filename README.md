# SHOOT!

**Shoot!** is a turn-based western duel in pixel art. Reload, shield yourself, or
shoot before your rival. Walk the trail, manage hunger, buy at shops, rest at
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

A round is played out rather than announced. Both fighters go for their guns —
hand to the holster, barrel out of leather, arm up, levelled — and only then
does anyone fire: a muzzle flash off the barrel, a tracer crossing the road,
the case out of the cylinder, and powder smoke left hanging. A life is lost
when the round arrives, not when the gun appears.

Poison, dynamite, bullet steal and mind control are shown as pixel icons on the
fighter they belong to, never as printed names — an ability lights its own icon
when it goes off, and a timed one carries its countdown.

## Story mode

There is no level select. You walk, and the road decides what you meet.

- **Auto-walk** through a side-scrolling landscape with five parallax layers. No
  progress bar, no timer — you only ever see your character walking.
- **Every world is a place.** The road opens in the **Dust Flats** and crosses
  the **Wildgrass Prairie**, **Whitecrown Pass**, the **Blackwater Bayou** and
  **Brimstone Basin** before the Galaxy. Each world names a biome; two of them
  are drawn (`desert`, `meadow`), and the rest ride the desert with a colour
  wash until their own art lands — see *Adding a biome* below.
- **Guided randomness**: every world guarantees a minimum number of duels, shops
  and inns, then shuffles their order and spacing. An inn always sits just past
  a shop.
- **Hunger** drains while you travel. At zero you lose a life every 12 seconds,
  so food is a real purchase, not a nicety. A sandstorm burns it half again as
  fast, and the meter says so — the multiplier sits next to the label and the
  bar looks scoured, so the change is never something you find out by dying.
- **A horse** roughly halves travel time.
- **Day and night** run on a continuous clock, and the **weather** turns —
  overcast, rain, sandstorm, fog. Both reach into combat: rain misfires, and a
  sandstorm, fog or nightfall throws off your opponent's read on you.
- **Weather belongs to the place.** Each biome carries its own table of what the
  sky can do, so sand only blows where there is sand: the desert gets
  sandstorms, the prairie gets river fog and far more rain, and walking out of
  one biome into another clears any weather the new one cannot have.
- **Shops** stock three items (more with the right perks) rolled from a
  per-world rarity table, at exponential prices, with random half-price deals.
- **Inns** sell a basic bed (heals more in later worlds) or a premium bed (heals
  everything).
- **A real inventory**: eat, heal, throw dynamite mid-duel, or sell anything back
  for half its value.
- **Every enemy is somebody.** Twenty-seven hand-drawn archetypes — the
  Sombrero Outlaw, the Bone Marshal, the Reed Wraith, the Ash Widow, the Iron
  Kiln, the Star Reaver — each with its own head, torso, palette and set of
  names, and each world drawing from its own roster. The name always describes
  the sprite, because the names were written from the art.
- **Five worlds plus the Galaxy**, where a two-phase boss is waiting — and
  phase two is a different sprite, not a refilled bar.

Three save slots. Progress writes after every encounter.

## Online

The online lobby is **built but not wired**: room browser, create-room dialog,
join-by-code and matchmaking are all there at final visual quality, and every
action politely says *coming soon*. When the backend exists, only the handlers
marked `// NETWORK:` in `src/menu/online.js` need bodies.

## Layout

The interface is built from five materials and nothing else — plank, iron,
brass, paper and rope — defined once in `styles/base.css`. Four rules keep it
honest: no screen is wider than its content needs, a control never stretches to
fill space it does not use, nothing on screen restates what the player can
already see, and every icon is drawn in the game's own palette rather than
typed as a character.

```
index.html              boot page: one canvas, one screen root, one overlay
styles/                 materials & tokens · UI kit · menu screens · game screens
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
    sprites-character.js  the fighter rig: player, rider, horse, the draw and
                          the revolver that comes out of it (Block 2a)
    sprites-enemies.js    enemy archetypes — heads, torsos, legs and palettes
                          composed on the rig
    sprites-fx.js         muzzle flash, powder smoke, spent brass, impact
    env-kit.js            the colour key + the shared layer generators
    biomes/               one file per landscape: props, layers, ambient life
    sprites-environment.js the biome registry + sky, buildings, storm deck (2b)
    sprites-items.js      item icons (Block 2c)
    sprites-ui.js         interface icons + the duel shield (Block 2d)
  menu/                  title, online, profile, settings, credits
  explore/               walk engine, parallax, encounters, hunger, day/night, weather
  shops/                 shop and inn logic + screens
  duel/                  duel engine, agents, scene, screen
  game/                  items, worlds, progression maths, player state,
                         enemies, save slots, run controller, interstitials
```

`docs/ui-audit.md` records what was wrong with the previous interface and why
each part of it was rebuilt.

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
  multipliers, encounter guarantees, bosses, and which biome each world is in.
- `src/game/biomes.js` — per-biome weather tables (which skies a place can have
  and how it moves between them).
- `src/game/progression.js` — every curve: exp, gold, prices, inn healing,
  hunger drain, walking speed, the horse discount.
- `src/game/items.js` — the item catalogue. Adding an entry is enough; shops,
  inventory, selling and the duel item bar pick it up.

## Adding a biome

A biome is a landscape; a world is a difficulty curve with a name. They are
separate on purpose, so several worlds can share one landscape and retheming a
world never rebalances it.

1. Write `src/art/biomes/<id>.js` exporting the same shape `desert.js` and
   `meadow.js` do: `props` (pixel strings), `buildLayers()`, `manifest`,
   `scatter`, `groundFill`, `dust`, and optionally `scatterCell`,
   `structureGround` and an `ambient` factory.
2. Register it in `BIOME_ART` in `src/art/sprites-environment.js`.
3. Give it a weather table in `src/game/biomes.js`. Add the state itself to
   `src/explore/weather.js` first if it needs one that does not exist yet.
4. Point a world at it: `biome: '<id>'` in `src/game/worlds.js`.

Nothing else needs editing — the parallax renderer holds no landscape
constants. Worlds 3 to 5 are named for biomes that are not drawn yet and say so
in a comment; each is a one-line change once its art exists.

## Adding an enemy

Enemies are composed, not drawn from scratch. One entry in `ARCHETYPES` in
`src/art/sprites-enemies.js` is a whole new opponent:

1. Pick or write a `head` (11 rows) and a `torso` (7 rows) in the same file.
   Custom `legs` are optional — a skirt and a trailing hem already exist.
2. Give it a palette and a `look`: the one line the sprite is supposed to say.
3. Give it `names` that all describe that look. If a name and the sprite ever
   disagree, the sprite is right and the name is a bug.
4. Add its id to a world's `enemy.roster` in `src/game/worlds.js`, or to a
   boss's `archetype`.

It is animated the moment it exists: the walk, the four-frame draw, the recoil
and the hit stagger all come from the rig in `src/art/sprites-character.js`.

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
