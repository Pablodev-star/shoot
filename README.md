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

**The opponent does not look at your gun.** It has a habit model — what you have
actually done this duel — and it plays the counter to a *sample* from it a
minority of the time; the rest of the time it plays its own game off its own
cylinder. It used to read your cylinder as well, which is where "every time I
reload, they fire" came from, and it used to take the argmax of that model,
which is how an even fifty-fifty habit came back as a certainty. Both are gone,
the shield is capped and can never come out twice in a row, and the share of
your shots that get eaten by one has halved. It is an easier fight than it was.
What it stopped being is a rigged one.

### What each world can do

The four effects above are the whole rule set, and always were. What changed is
that a world now says them in its own voice: the bayou does not have poison, it
has **swamp rot**, and swamp rot comes up out of the ground green. Eighteen
themed abilities across the six worlds, each with its own icon and its own
animation over the fighter it lands on — grit whipping across the road, hornets
closing in, a slab of ice coming down, an ember under your collar.

And each world has **one special**, which is not an ability at all. An enemy
carrying one can spend it once, usually early, and it does not resolve — it
raises something behind the road that is there for the rest of the fight:

| World | Special | What it does |
| ----- | ------- | ------------ |
| Dust Flats | **Dust Devil** | Sweeps the road every 22s. 2 lives, and it empties a chamber |
| Wildgrass Prairie | **Hornet Tree** | The swarm comes out every 20s. 2 lives, and it leaves you poisoned |
| Whitecrown Pass | **Hanging Cornice** | Breaks every 22s. 2 lives |
| Blackwater Bayou | **Blackdamp** | The bog breathes out every 20s. 2 lives, and it leaves you poisoned |
| Brimstone Basin | **Volcano** | Erupts every 20s. 3 lives, and the lava stays on the road |
| Galaxy | **The Rift** | Empties every 18s. 3 lives, and it takes a round with it |

That clock is real time. Every other rule in this game waits for you to press
something; a volcano does not. It stands on the horizon doing nothing, the sky
goes red, it throws, and it goes quiet and starts counting again — so the
countdown on the chip above the fight is the one number in a duel worth
hurrying for. A shield is no use under any of it (it is the ground, not a shot),
the vest still stops a fatal one, and the diadem does not touch it: the diadem
blocks things aimed at you, and a mountain is not aiming.

### What you can do back

Everything above is for sale. A world's shop is the only place to buy that
world's kit, and what you buy is equipment, not ammunition: you keep it for the
rest of the run and it works in every duel.

Two slots — one **basic**, one **special** — swapped in the saddlebag between
fights, never during one. Both **charge**: one point a round, and a plate above
the move buttons lights when it is full. Spending one is a free action, like
throwing a stick of dynamite: it does not cost you your turn. `Q` and `E`.

- **A basic** charges in three to five rounds, so it lands once or twice a
  fight. Take rounds out of their gun (and load one into yours), poison them
  through any shield, put a life on them on the spot, or make their hand go to
  the wrong thing entirely — they reload this round, wide open.
- **A special** charges in five or six and fires once. It calls that world's
  landmark down on your rival for a single eruption: two lives in the flats,
  four by the basin.

**How it is balanced.** Three numbers hold it together, and they are all in
`src/game/world-abilities.js`:

1. A basic is priced as a rare and a special as a legendary, so the existing
   curve puts one at about a third of what a world pays out and the other at
   most of it. Nothing new was invented for pricing.
2. Power is rationed by **time**, not by stock. A duel runs six or seven rounds;
   that is the whole limit.
3. Abilities improve in three steps (worlds 1-2, 3-4, 5-6), not six. Six would
   mean re-buying every world at a third of your income each time, which is a
   tax rather than an upgrade path.

The number actually watched while tuning is what a full charge is worth against
a **boss** — about a third of Big Jed, about two thirds of Old Scratch by the
time you can afford the basin's kit. A one-life drifter dies to anything and
always did; a boss is still a fight you can lose with a volcano in your pocket.

## Story mode

There is no level select. You walk, and the road decides what you meet.

- **Auto-walk** through a side-scrolling landscape with five parallax layers. No
  progress bar, no timer — you only ever see your character walking.
- **Every world is a place, and every place is drawn.** The road opens in the
  **Dust Flats** and crosses the **Wildgrass Prairie**, **Whitecrown Pass**, the
  **Blackwater Bayou** and **Brimstone Basin** before the Galaxy. Six worlds,
  six biomes, no reskins: sand and saguaro, then grass and wildflowers, then a
  snow-capped pass above the treeline, then a mud causeway through black water,
  then a basalt floor with the fire still under it, and finally a shelf of
  broken violet stone hanging in open space. Each one has its own props, its own
  five depth layers, its own ground, its own weather and its own life in the air
  — spindrift and an aurora on the pass, will-o'-the-wisps over the bayou,
  embers rising through falling ash in the basin, dust that falls upward in the
  void.
- **Guided randomness**: a world's difficulty is a number of duels, and its
  shops and inns are rolled around them. One or two shops and — separately — one
  or two inns, usually two of each, shuffled into the road with at least a
  couple of fights between any two of them. So a stretch can offer a shop, three
  duels and another shop with no bed anywhere in between, or two inns and a
  single store. Nothing is ever adjacent to anything of its own kind, and no
  building is ever stumbled into: they are always approached.
- **Hunger** drains while you travel. At zero you lose a life every 12 seconds,
  so food is a real purchase, not a nicety. Harsh weather burns it faster — a
  sandstorm half again as fast, snow and ashfall close behind — and the meter
  says so: the multiplier sits next to the label and the bar looks scoured, so
  the change is never something you find out by dying.
- **A horse** roughly halves travel time.
- **Day and night** run on a continuous clock, and the **weather** turns —
  overcast, rain, sandstorm, fog, snow, ashfall, and a meteor shower out past
  the last horizon. All of it reaches into combat: rain misfires, and sand,
  snow, ash, fog, falling stars or plain nightfall throw off your opponent's
  read on you.
- **Weather belongs to the place.** Each biome carries its own table of what the
  sky can do, so sand only blows where there is sand: the desert gets
  sandstorms, the prairie gets river fog and far more rain, the pass is under
  snow more often than it is clear, the bayou fogs back up every time the rain
  stops, nothing falls on the basin that is not on fire, and the Galaxy — which
  has no weather at all in any honest sense — gets the one thing that does cross
  open space. Walking out of one biome into another clears any weather the new
  one cannot have.
- **Shops** stock three items (more with the right perks) rolled from a
  per-world rarity table, at exponential prices, with random half-price deals.
- **Inns** sell a basic bed (heals more in later worlds) or a premium bed (heals
  everything).
- **A real inventory**: eat, heal, throw dynamite mid-duel, or sell anything back
  for half its value.
- **The trail map** is a drawn map of the road you are on, not a list: the
  ground of the biome you are walking, the road winding through it, and every
  duel, shop, inn and boss marked on it, with your own position as a blue
  circle. Drag it, zoom it, and open it as often as you like — it is bought
  once and kept, not spent per look. It still shows no numbers.
- **Every enemy is somebody.** Twenty-seven hand-drawn archetypes — the
  Sombrero Outlaw, the Bone Marshal, the Reed Wraith, the Ash Widow, the Iron
  Kiln, the Star Reaver — each with its own head, torso, palette and set of
  names, and each world drawing from its own roster. The name always describes
  the sprite, because the names were written from the art.
- **Levelling is the slow reward.** Roughly 1.4 levels per world, so a run that
  reaches the Galaxy is around level 9. A level grants **one life** — one more
  maximum, and one more in the bar to go with it. It is not a refill: if you
  arrive at a level-up on your last life you leave it on your second, and the
  bed at the inn is still the only way back to the top.
- **Five worlds plus the Galaxy**, where a two-phase boss is waiting — and
  phase two is a different sprite, not a refilled bar.
- **The last fight has an entrance, and it is the fight.** The duel scene has a
  camera. The sequence is not a cut-scene played somewhere else — it is this
  fight, filmed: both duellists are standing on the road under every shot of
  it, the weather is running, and `lookAt` frames a point of a fighter in that
  fighter's own pixels. Cut to black, letterbox, then the wide shot of the two
  of them as the dark lifts and his fire comes up; the camera walks in; he
  talks and every line is a framing; you answer and it cuts to your face; a beat
  of silence on your gun hand and on his eyes; then a crash zoom, speed lines, a
  shockwave, impact frames and the name card along the top. `ESC` skips it.
- **The Stranger is enormous, and he is on fire.** Twice the size of the man
  across the road from him, drawn on a grid twice as coarse, and bigger again
  when the cowl comes off. He is sized against the frame rather than against
  the interface, so what happens when he grows is that the camera backs away
  and *you* get smaller. Purple fire burns all over him for the whole fight —
  pooled at his feet, up his sides, around the crown, with sparks coming off
  it — and taking the cowl off doubles it and adds arcs of white light. The
  phase change is a crash zoom, a shockwave and the frame coming apart.
- **Bosses hit harder than they last.** Every world's boss carries about three
  fifths of the lives it used to. A boss fight was a long exchange you could
  grind down; it is a short one you can lose.

Speech is a general system, not part of that one scene: a portrait, a name
plate and a line typing itself out, for anybody on either side of the road.
Tapping catches the typing up; tapping again moves on.

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
    sprites-abilities.js  an icon for every themed ability and world special
    sprites-hazards.js    the six landmarks a special raises, built not typed
    env-kit.js            the colour key + the shared layer generators
    biomes/               one file per landscape — desert, meadow, snow, swamp,
                          inferno, void: props, layers, ground, ambient life
    sprites-environment.js the biome registry + sky, buildings, storm deck (2b)
    sprites-portraits.js  32 x 32 faces, for speech and for the cut-scene (2e)
    sprites-items.js      item icons (Block 2c)
    sprites-ui.js         interface icons + the duel shield (Block 2d)
    map-art.js            the trail map: ground, markers, road, compass
  ui/                    shared widgets, saddlebag, trail map, toasts, dialogs,
                         speech
  menu/                  title, online, profile, settings, credits
  explore/               walk engine, parallax, encounters, hunger, day/night, weather
  shops/                 shop and inn logic + screens
  duel/                  duel engine, agents, scene, screen, boss entrances,
                         and the real-time clock a world special runs on
  game/                  items, worlds, progression maths, player state,
                         enemies, world abilities, save slots, run controller,
                         interstitials
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
  multipliers, how many duels the road holds, bosses, and which biome each world
  is in.
- `src/explore/encounters.js` — how the road is laid out: how many shops and
  inns a world rolls, how far apart they have to be, and the spacing between
  everything on it.
- `src/game/biomes.js` — per-biome weather tables (which skies a place can have
  and how it moves between them).
- `src/game/world-abilities.js` — every themed ability (name, icon, colour and
  motion over one of the four base effects) and the six specials: how often
  each one goes off, how many strikes it lands, and what a strike costs. A
  special that hurts too much is two numbers here — `strikes` and `damage` —
  and how many enemies carry one at all is `specialChance` in `worlds.js`.
  The player's half is at the bottom of the same file: `PLAYER_BASIC` and
  `PLAYER_SPECIAL` are charge costs and effect sizes per band, `ABILITY_PRICE`
  is the two base prices, and the reasoning each was set against is written
  above them.
- `src/game/progression.js` — every curve: exp and the level ladder (tuned
  together to hit ~1.4 levels per world), gold, prices, inn healing, hunger
  drain, walking speed, the horse discount.
- `src/game/items.js` — the item catalogue. Adding an entry is enough; shops,
  inventory, selling and the duel item bar pick it up. The twenty-four ability
  entries are generated into it from the catalogue above rather than written
  out, so an ability is an ordinary thing in the saddlebag.

## Adding a biome

A biome is a landscape; a world is a difficulty curve with a name. They are
separate on purpose, so several worlds can share one landscape and retheming a
world never rebalances it.

1. Write `src/art/biomes/<id>.js` exporting the same shape the six existing
   ones do: `props` (pixel strings), `buildLayers()`, `manifest`, `scatter`,
   `groundFill`, `dust`, and optionally `scatterCell`, `structureGround` and an
   `ambient` factory.
2. Give any new colours a home in `src/art/palette.js` and a character of their
   own in `KEY` in `src/art/env-kit.js`. One character means one colour
   *everywhere in the game* — which is why the last four biomes are drawn in
   digits and punctuation, the letters having run out.
3. Register it in `BIOME_ART` in `src/art/sprites-environment.js`, and give it a
   `TERRAIN` entry in `src/art/map-art.js` so the trail map knows what its
   ground looks like from above.
4. Give it a weather table in `src/game/biomes.js`. Add the state itself to
   `src/explore/weather.js` first if it needs one that does not exist yet — a
   weather is a table entry, a spawn case, a step case and a draw case.
5. Point a world at it: `biome: '<id>'` in `src/game/worlds.js`.

Nothing else needs editing — the parallax renderer holds no landscape constants,
and the trail map draws itself out of the biome's own props.

## Giving a boss an entrance

The cut-scene machinery knows nothing about the Stranger. Any boss gets one by
adding an `intro` to its entry in `src/game/worlds.js`:

```js
intro: {
  lines: [
    { who: 'enemy',  shot: 'eyes', text: 'You are a long way from the flats.' },
    { who: 'player', shot: 'face', text: 'I know exactly how far I am.' },
    { who: 'enemy',  shot: 'face', text: 'Draw.', shake: 700 },
  ],
}
```

`shot` is a camera framing (`eyes`, `face`, `bust`, `low`, `hands`, `wide`),
`cut: true` hard-cuts to it instead of travelling, and `shake` kicks the frame
on the beat the line lands. The speaker needs a `portrait` on its archetype —
a 32 x 32 face in `src/art/sprites-portraits.js` — and that same face is what
the speech box shows.

The framings are measured in the fighter's OWN source pixels (`fill` is how
many of them span the height of the screen), so one number frames the player
and a boss drawn two and a half times larger identically.

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

## Adding a world ability

An ability is a **theme over one of four rules**. The rules are fixed —
`bulletSteal`, `poison`, `dynamite`, `mindControl` — and the engine only ever
switches on those, so a new one is data:

1. Add an entry to `ABILITIES` in `src/game/world-abilities.js`: its `base`,
   the name it goes by, the sentence that explains it, and an `fx` — one of six
   motions (`streak`, `swarm`, `fall`, `rise`, `burst`, `spiral`) and three
   colours.
2. Draw its 16 x 16 icon in `src/art/sprites-abilities.js`, using the shared
   key. New colours need a home in `palette.js` first.
3. Put its id in a world's `enemy.abilities` in `src/game/worlds.js`.

A **special** is the same shape with a landmark on the end of it: an entry in
`SPECIALS` (cycle, warning, active window, strikes, damage, the colour the sky
goes, and what it throws), a builder in `src/art/sprites-hazards.js` for the
thing on the horizon, and `special` / `specialChance` on the world. The clock,
the damage and the drawing are all generic — nothing in `duel-hazard.js`,
`duel-engine.js` or `duel-scene.js` knows what a volcano is.

Both halves reach the player for free. `src/game/items.js` turns the catalogue
into shop entries at load, so a new ability is on sale in its own world's shop
with no further work, and the player's version of it comes out of the band
tables — there is no second place to write the numbers down.

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
