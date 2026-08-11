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

Everything an ability does is shown as a pixel icon on the fighter it is
working on, never as printed names, and every one of them carries the number of
rounds it has left to run.

**An ability is a thing that arrives.** Every one of the eighteen throws
something you can watch cross the road: a gourd of poison that tumbles and
smashes at their boots, a rope that leaves the hand with the line still on it, a
nest, a rock out of the top of the frame, a mirror assembling itself out of
loose shards. The **dynamite** is the one the whole system was built around — it
is thrown, it lands, and it lies there with the fuse burning until the round
resolves, because that is exactly what the rule always said: the biggest hit in
the game, and the one you get a whole round to raise a shield against.

**The opponent does not look at your gun.** It has a habit model — what you have
actually done this duel — and it plays the counter to a *sample* from it a
minority of the time; the rest of the time it plays its own game off its own
cylinder. It used to read your cylinder as well, which is where "every time I
reload, they fire" came from, and it used to take the argmax of that model,
which is how an even fifty-fifty habit came back as a certainty. Both are gone,
the shield is capped and can never come out twice in a row, and the share of
your shots that get eaten by one has halved.

### Abilities

There are **fourteen mechanics**, and each one does something the others cannot.
Ten of them never touch the life bar at all:

| | |
| --- | --- |
| **steal / empty / swap** | rounds out of their cylinder, all of them, or a straight trade |
| **blast** | damage now — **and a raised shield stops it dead** |
| **pierce** | damage now, straight through a shield |
| **venom** | one life *every* round, for three |
| **drain** | a life off them and onto you |
| **freeze** | they do nothing at all for two rounds. The turns are yours |
| **jam** | they cannot shoot |
| **panic** | their shield stops nothing |
| **blind** | their next shots go wide |
| **mark** | every shot that lands on them costs one extra |
| **doubleTap** | your next shots cost them one extra |
| **reflect** | the next shot that would hit you goes back at them |

Nineteen abilities across the six worlds are built from those, two to four per
world, and the numbers rise as the road does: Dust Snatch takes one round out of
a gun, Gravity Pull takes the whole cylinder and keeps two.

**Poison and Dynamite are world abilities now, not shop staples.** They used to
be throwables any shop in the game would sell. Poison belongs to the Blackwater
Bayou and dynamite to Brimstone Basin — sold in that world's shop and nowhere
else, carried by that world's riders and nobody else's — and both were rewritten
to be worth the trip:

- **Poison** — one life a round for three rounds. Nothing stops it.
- **Dynamite** — three lives at a stroke, the biggest single hit in the game,
  and the only ability of the fourteen a **shield** will stop. It is the hardest
  thing to be hit by and the easiest to be ready for.

Both cost more charge than anything else, and the enemies holding them reach for
them about a third as often as their other tricks — a signature, not a tax.

**Using one costs a turn.** This is the rule that makes the rest survivable:

- an **enemy** that casts is doing that *instead of* drawing — no shot, no
  shield, no round loaded, and open all round;
- a **player** who casts knocks the enemy's hand to its belt: it reloads that
  round, whatever it had picked;
- the **player** is never restricted — cast and still shoot, shield, reload, or
  cast the other slot.

An ability is not extra damage bolted onto a turn. It is a turn taken away from
somebody, which is why the strong ones want five or six rounds of charge.

### What each world can do

Each world also has **one special**, which is not an ability at all. An enemy
carrying one can spend it once, usually early, and it does not resolve — it
raises something behind the road that is there for the rest of the fight:

| World | Special | What it does |
| ----- | ------- | ------------ |
| Dust Flats | **Dust Devil** | A wall crossing the road every 22s on a dead-even beat. 2 lives, and it empties a chamber |
| Wildgrass Prairie | **Hornet Tree** | The nest empties in one flurry every 20s. 2 lives, and it leaves you poisoned |
| Whitecrown Pass | **Hanging Cornice** | The slab comes off every 22s — all of it inside half a second. 2 lives |
| Blackwater Bayou | **Blackdamp** | The bog breathes out every 20s, slowly, still arriving when you think it is over. 2 lives, and it leaves you poisoned |
| Brimstone Basin | **Volcano** | Throws rock across an eight-second eruption every 20s. 3 lives, and the lava stays on the road |
| Galaxy | **The Rift** | **Charges** for five seconds every 20s and then fires **once**: 3 lives in a single shot, and it takes a round with it |

That clock is real time. Every other rule in this game waits for you to press
something; a volcano does not. It stands on the horizon doing nothing, the sky
goes red, it throws, and it goes quiet and starts counting again — so the
countdown on the chip above the fight is the one number in a duel worth
hurrying for. A shield is no use under any of it (it is the ground, not a shot),
the vest still stops a fatal one, and the diadem does not touch it: the diadem
blocks things aimed at you, and a mountain is not aiming.

**They do not all erupt the same way.** They used to: every special spread the
same number of hits evenly across its window, so six landmarks were one
metronome in six colours and surviving one taught you all of them. Each names a
*pattern* now — an even sweep, one flurry, the whole slab at once, a slow drip,
a barrage — and the Galaxy's is the one that changes what a special is. The Rift
throws nothing at all. It opens, and then it spends five seconds visibly drawing
the road into itself while a percentage counts up on the chip, and at the end of
that it fires a single shot worth the entire eruption. Three lives together, not
three lives eventually — so it is a countdown you have to fight around rather
than weather you sit through. Then it goes quiet and starts charging again.

Whatever the rhythm, an eruption is worth the same total it always was: the
pattern decides how the cost is spent, never how much it is.

**The Dust Devil turns.** The twister was the one landmark of the six that was
supposed to be moving and was not. It was built as a stack of ellipse outlines
with grit scattered round them, and the scatter was re-rolled from a
frame-seeded generator on every frame — so it did not spin, it BOILED: four
static fields a second, which the eye reads as a picture being redrawn rather
than as an object turning. It is built as the thing itself now. Every row of
the funnel is one slice of a rotating surface, so each pixel across it has a
real angle on the wall; that angle is shaded for the light on one side plus
three ribbons of grit going round, and the result is ordered-dithered, so the
shadowed side is see-through and the lit side is solid. The ribbons lean as
they climb and rise with the frame. Six chunks it has torn off the road orbit
the column at twice that rate and pass in front of it and behind it. There is a
wall cloud overhead with a collar turning in the mouth of it and a ring of grit
being dragged round the foot, and the eight frames loop seamlessly because
every angular term is a whole multiple of the spin. The 16 x 16 icon was redrawn
to match: one lit run per row, walking across the funnel as the eye goes down.

**And a shockwave is made of pixels.** Every wave a special throws — the ring
that leaves a landmark as it wakes up, the burst where a strike lands, the one
that crosses the whole frame when the Rift's shot arrives — used to be a
stroked ellipse: a smooth antialiased curve with a fractional line width and a
grey fringe on either side of it in colours that are not in the palette. They
are drawn on the scene's own pixel grid now, one block per source pixel, with
the cells collected before anything is filled so an additive pass never doubles
up at the poles. The fade is quantised to eighths, and past its half life the
ring drops to a checker and then to a quarter of its cells, so a wave comes
apart into grit instead of dissolving.

### What you can do back

Everything above is for sale, in the world it belongs to and nowhere else, and
what you buy is equipment rather than ammunition: you keep it for the rest of
the run and it works in every duel.

Two slots — one **basic**, one **special** — swapped in the saddlebag between
fights, never during one. Both **charge**: one point a round, and a plate above
the move buttons lights when it is full. `Q` and `E`.

Anything still working on a fighter is drawn **on the fighter**: ice holds on a
frozen man until he thaws, poison keeps him green, a mark keeps him red. The
badge on the card carries the exact count; the colour on the road says it at a
glance.

**How it is balanced.** Four rules, all of them in
`src/game/world-abilities.js`:

1. A basic is priced as a rare and a special as a legendary, so the existing
   curve puts one at about a third of what a world pays out and the other at
   most of it. Nothing new was invented for pricing.
2. Power is rationed by **time**. A duel runs six or seven rounds; a three-round
   charge is two uses, a six-round charge is one.
3. **The cost is the size of what it takes away** — turns, not damage. Anything
   that hands its caster free turns costs five. Poison and dynamite cost six.
4. It is meant to decide **bosses**, not drifters. A full charge is worth about
   a third of Big Jed and two thirds of Old Scratch by the time the basin's kit
   is affordable.

Measured over six hundred simulated duels a world, one equipped ability is worth
roughly thirteen to twenty points of win rate — a real purchase, and not a
different game.

## Story mode

There is no level select. You walk, and the road decides what you meet.

- **Auto-walk** through a side-scrolling landscape with five parallax layers over
  a floor that is itself a stack of depth bands — the traveller walks along a
  road with ground on both sides of him, and the ground near the camera crosses
  the frame faster than the ground by the verge. No progress bar, no timer — you
  only ever see your character walking.
- **Every world is a place, and every place is drawn.** The road opens in the
  **Dust Flats** and crosses the **Wildgrass Prairie**, **Whitecrown Pass**, the
  **Blackwater Bayou** and **Brimstone Basin** before the Galaxy. Six worlds,
  six biomes, no reskins: sand and saguaro, then grass and wildflowers, then a
  snow-capped pass above the treeline, then a mud causeway through black water,
  then a basalt floor with the fire still under it, and finally a shelf of
  broken violet stone hanging in open space. Each one has its own props, its own
  five depth layers, its own floor, its own weather and its own life in the air
  — circling vultures and tumbleweeds rolling past at three depths in the flats,
  a flock crossing the prairie, an aurora over the pass in green, violet or a
  rare high red, will-o'-the-wisps over the bayou, embers rising through falling
  ash in the basin, dust that falls upward in the void.
- **Guided randomness**: a world's difficulty is a number of duels, and its
  shops and inns are rolled around them. One or two shops and — separately — one
  or two inns, usually two of each, shuffled into the road with at least a
  couple of fights between any two of them. So a stretch can offer a shop, three
  duels and another shop with no bed anywhere in between, or two inns and a
  single store. Nothing is ever adjacent to anything of its own kind, and no
  building is ever stumbled into: they are always approached — and you stop at
  the door. The building is drawn so its doorway lands on the traveller at the
  moment the stop is reached, and it is still standing there behind you when
  you walk on.
- **Hunger** drains while you travel. At zero you lose a life every 12 seconds,
  so food is a real purchase, not a nicety. The gauge is notched into ten
  rations, so how much is left is something you see rather than read. Two
  things burn them faster — the horse, and harsh weather, a sandstorm half
  again as fast with snow and ashfall close behind — and the gauge says so: the
  combined multiplier rides beside the track, and the track looks scoured
  whenever the sky is the reason, so the change is never something you find out
  by dying.
- **Food that keeps up with the road.** A carrot and an apple are fine in the
  Dust Flats, where four shop rolls in five come up common — and useless by the
  Galaxy, where common is eighteen per cent of the table and the counter is
  stocked with abilities. So there is food in the rare tier and food in the
  legendary tier, and both **fill the gauge to the top** rather than handing
  over a percentage: **Trail Stew** is the meal, and the **Traveller's Feast**
  is the meal that reaches into the fights after it — the next three duels start
  with two rounds already in the cylinder, counted down on a chip in the travel
  band.
- **The Canteen** is the answer to hunger you buy instead of the answer you
  carry. Bought once and kept, like the map: a third off the drain for the rest
  of the run. It is the only multiplier in the game that pulls the other way,
  and the gauge's badge goes cool instead of hot to say so.
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
  A shop is a **stall**, not a list: a striped canvas awning with a scalloped
  valance, the store's sign hanging off it on two ropes, two posts, and a plank
  counter with the goods standing on it — inside a trading post whose shelves,
  barrels, sacks and overhead rail of pans and hats are drawn behind them.
- **Inns** sell a basic bed (heals more in later worlds) or a premium bed (heals
  everything), and **the two beds are two beds**. Both offers used to show the
  same 16 x 16 icon at 3x, so the choice was made by reading two prices under
  one picture. Each now stands in a little room of its own: a plank cot with a
  sacking mattress, the straw coming out of it and an army blanket over the
  foot, or a panelled frame with brass on the posts, two pillows, a quilt and a
  rug. The room they are in is drawn too — a stone hearth with a live fire in
  it, a window with the night behind it, a rug, a chair pulled up to the heat.
- **A real inventory**: eat, heal, throw dynamite mid-duel, or sell anything back
  for half its value.
- **The trail map** is a drawn map of the road you are on, not a list: the
  ground of the biome you are walking, the road winding through it, and every
  duel, shop, inn and boss marked on it, with your own position as a blue
  circle. Drag it, zoom it, and open it as often as you like — it is bought
  once and kept, not spent per look. It still shows no numbers.

  **The ground on it has a shape now.** Every sheet is painted off a height
  field: the elevation picks a step of the biome's own five-colour ramp and is
  dithered between steps, the slope of the land is lit by one sun in the
  north-west corner, and a contour line is drawn every few steps of height. So
  the country has high ground and hollows — water pools in the low places, scrub
  grows thickest there and thins out on the tops, and the rock comes through
  where the soil has gone. On top of that each world gets what only it has: dry
  washes cut through the Dust Flats, a creek with plank bridges where it crosses
  the road on the prairie, fractured ice in the pass, a whole braided channel
  network through the bayou, fissures with the fire still in them in the basin,
  and seams of astral light under a star field out in the Galaxy. The road is
  cased like a road on a real map — a worn band with a dark line either side,
  wagon ruts and kerb stones — so it is findable at a glance on all six, and the
  sheet carries its own name on a board nailed up in the corner.
- **The Dusk Totem is the only thing in the game that refuses a game over**, and
  it is the only item with a scene. When the last life goes — to a rider's
  bullet, to a rock off an erupting mountain, to an empty gauge on a road with
  nothing left to eat on it — the screen goes black instantly, with no fade,
  and stays black for three full seconds. Then the carving rises out of the dark
  and floats there with its ember coming up behind it, and one word appears at
  the bottom: **TAP**. The first tap grows it and splits it. The second opens
  the split into a fissure with light pouring out. The third breaks it into
  twenty-eight shards that carry their own share of the cracks across the frame,
  and you are standing up on half your lives with the gauge full. One use, and
  the fight you were losing is still going on underneath.
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

## Saving, and losing

Three save slots. Progress writes after every encounter, and again the moment
you leave from the road.

**Dying erases the slot.** A run that reaches zero lives — to a rider's bullet
or to an empty gauge — is over, and the file goes with it. It used to be kept:
losing a duel deliberately skipped the save, so the slot still held the state
from before the fight and "Continue" put you back on the road with the lives
you had walked in with. That is a game with no losing condition in it. Every
duel in the last four worlds was survivable by walking into it, dying, and
walking into it again — and the vest, the Dusk Totem and the bed at the inn,
three whole systems whose only job is to buy you one more mistake, were worth
nothing next to a free retry.

The other half of the bargain is that **leaving is always safe**. Quit from the
road and the run is written exactly as it stands; it is there tomorrow. What
you cannot do is leave a fight — the duel has no way back to the menu, and the
run controller refuses one — so the decision to risk the slot is taken on the
road, before the shooting, which is where a decision belongs.

The Dusk Totem still refuses the game over, and it is now the only thing that
does.

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
    logo.js               the title wordmark: hand-drawn display letterforms,
                          chiselled and extruded, on a shot-up plank
    sprites-character.js  the fighter rig: player, rider, horse, the draw and
                          the revolver that comes out of it (Block 2a)
    sprites-enemies.js    enemy archetypes — heads, torsos, legs and palettes
                          composed on the rig
    sprites-fx.js         muzzle flash, powder smoke, spent brass, impact
    sprites-abilities.js  an icon for every themed ability and world special
    sprites-casts.js      what an ability actually throws: the stick of
                          dynamite, the gourd, the rope, the rock — typed for
                          the hard things, built for fire, ice and smoke
    sprites-hazards.js    the six landmarks a special raises, built not typed
    env-kit.js            the colour key + the shared layer generators
    biomes/               one file per landscape — desert, meadow, snow, swamp,
                          inferno, void: props, layers, ground, the far band,
                          the near fringe, the litter and the ambient life
    sprites-environment.js the biome registry + sky, buildings, storm deck (2b)
    sprites-portraits.js  32 x 32 faces, for speech and for the cut-scene (2e)
    sprites-venue.js      what a shop and an inn are made of: the two beds,
                          and the crates, barrels, jars, hearth and window the
                          rooms behind them are furnished with
    sprites-items.js      item icons (Block 2c)
    sprites-ui.js         interface icons + the duel shield (Block 2d)
    map-art.js            the trail map: the height field the ground is
                          painted, shaded and contoured off, the water, the
                          cracks, the markers, the cased road and the rose
  ui/                    shared widgets, saddlebag, trail map, toasts, dialogs,
                         speech
  menu/                  title, online, profile, settings, credits
  explore/               walk engine, parallax, encounters, hunger, day/night, weather
  shops/                 shop and inn logic + screens
  duel/                  duel engine, agents, scene, screen, boss entrances,
                         the performance an ability plays when it is cast, and
                         the real-time clock a world special runs on
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

And one that had to be learned. **The router queues a navigation, it never
drops one.** `go()` used to return silently if a transition was already in
flight — a fair guard against two screens mounting on top of each other, and
the wrong way to do it, because a `go` is not always a button press. The walk
engine fires `ENCOUNTER_REACHED` from inside its own frame and the run
controller answers with a `go`; the saloon doors are open for 640 ms around
every mount and the walk is running for the second half of that, so an
encounter that came up inside the out-swing was thrown away. The engine had
already paused itself and marked the event resolved, so nothing was ever going
to fire it again — the player stood on an empty road in the walk's idle pose
with no way forward. That was the "loading a slot freezes the character" bug: a
saved position lands wherever it lands, and any save made within about twenty
pixels of the next encounter reloaded straight into the dead window. A request
that arrives during a transition is remembered now and run when that one
finishes; the last one asked for wins.

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
- `src/game/world-abilities.js` — the fourteen mechanics, the nineteen
  abilities built from them (numbers, charge cost, and the `weight` that says
  how often an enemy reaches for it) and the six specials. An ability that
  hurts too much is one number on the ability; a special is `strikes` and
  `damage`; how many enemies carry a special at all is `specialChance` in
  `worlds.js`. Player and enemy fire the same numbers — the asymmetry is the
  turn rule, not the tuning.
- `src/game/progression.js` — every curve: exp and the level ladder (tuned
  together to hit ~1.4 levels per world), gold, prices, inn healing, hunger
  drain, walking speed, the horse discount.
- `src/game/items.js` — the item catalogue. Adding an entry is enough; shops,
  inventory, selling and the duel item bar pick it up. The twenty-four ability
  entries are generated into it from the catalogue above rather than written
  out, so an ability is an ordinary thing in the saddlebag. Three fields there
  are worth knowing: `food` is hunger restored (`100` fills the gauge), `boon`
  leaves something on the player for the next few *duels* rather than for right
  now, and `stack: 1` plus `context: 'passive'` is how a bought-once-and-kept
  item like the Canteen or the Dusk Totem is written.

## Adding a biome

A biome is a landscape; a world is a difficulty curve with a name. They are
separate on purpose, so several worlds can share one landscape and retheming a
world never rebalances it.

1. Write `src/art/biomes/<id>.js` exporting the same shape the six existing
   ones do: `props` (pixel strings), `buildLayers()`, `manifest`, `scatter`,
   `groundFill`, `dust`, and optionally `scatterCell`, `structureGround` and an
   `ambient` factory.

   A landscape is built out of **six tiled layers and five bands of props**,
   and the difference between a biome that reads as a place and one that reads
   as a painted wall is almost entirely in the bands:

   | | what it is | where it goes |
   |---|---|---|
   | `backdrop` | hazed silhouettes — trees, spires, buttes | behind the layer the manifest marks `near: true`, so the rise buries their feet |
   | `verge` | the same scatter table, a pixel step smaller | thirteen rows behind the walk line, at that row's own scroll speed |
   | `scatter` | the roadside props | on the walk line |
   | `clutter` | litter on a tight `clutterCell` — pebbles, twigs, chips | a few rows in front of the walk line, drawn over the props |
   | `near` | a thin, sparse lane of the same litter | between the traveller and the camera, drawn **after** he is |
   | `fringe` | a tiled strip of near ground, `front: true` + `anchor: 'bottom'`, running faster than any of them | in front of everything, along the bottom edge |

   The three roadside bands are declared by the renderer rather than by the
   biome: a biome supplies `scatter` and `clutter` and gets all five lanes. Each
   lane scrolls at `planeSpeed` of the floor row it stands on, which is what
   makes the lift read as distance instead of as hovering.

   **The floor is a plane, not a strip.** The walk line sits `PLANE_RISE` rows
   *into* the ground layer rather than along its top edge, so there is ground on
   both sides of the traveller, and the renderer slices the layer into depth
   bands and scrolls each at its own speed — the grain at his boots crosses the
   frame nearly twice as fast as the grain up by the verge. That imposes exactly
   one rule on a ground layer's art: **no mark with a top and a bottom may cross
   a band boundary**, because the two halves would slide apart forever. Place
   anything taller than a pixel with `bandFit`, clamp anything that wanders with
   `bandRange`, and use `planeGrain` / `planePebble` for texture that grows
   towards the camera. Rows are free — a colour constant along x, or a dithered
   or randomly speckled one, looks the same wherever it is cut, which is why the
   six roads have straight edges broken up with band-local litter rather than
   the wandering edges they used to have. See the long note over `PLANE_RISE` in
   `src/art/env-kit.js`.

   **Landmarks** are the escape hatch from tiling. A biome may declare
   `landmarks: [{ name, after, speed, spacing, jitter, y, gap, flip }]` and a
   `buildLandmarks()` that bakes one canvas per name; each is drawn once every
   `spacing` source pixels on its own world grid, straight after the layer named
   by `after`. Anything the player is meant to *recognise* belongs here rather
   than in a layer tile — the basin's volcano and the prairie's barn both came
   out of layers for this reason, because a mountain that returns every 320
   pixels is wallpaper however well it is drawn.

   `backdrop` takes `{ cell, y, gap, haze, hazeA, shrink, scatter }`. The haze
   is baked into a tinted copy of each prop at load time and should be the
   biome's *own* far colour, never a neutral grey — distance drains a landscape
   towards its own sky. `shrink: true` draws the band a whole pixel step down,
   which only works where the props are tall enough to still clear the ridge.

   Any scatter entry may carry `flip: false`. Everything else is mirrored at
   random, which doubles the apparent size of the prop set for free; opt out
   for anything with writing on it or a shape the eye knows one way round.
2. Give any new colours a home in `src/art/palette.js` and a character of their
   own in `KEY` in `src/art/env-kit.js`. One character means one colour
   *everywhere in the game* — which is why the last four biomes are drawn in
   digits and punctuation, the letters having run out.
3. Register it in `BIOME_ART` in `src/art/sprites-environment.js`, and give it a
   `TERRAIN` entry in `src/art/map-art.js` so the trail map knows what its
   ground looks like from above. That entry is all data: a five-colour `ramp`
   light to dark, `base`/`spread`/`relief` for where the flat ground sits on it
   and how broken the country is, and then whichever detail passes the place
   earns — `ripples` or `blades`, `contour`, `veins` (one branching-crack
   routine that is a dry wash, an ice fracture, a magma fissure or a seam of
   light depending only on the colours handed to it), `ponds`, `river`,
   `outcrops`, `craters`, `mist`, `embers`, `stars`. Leave one out and that pass
   does not run.
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

An ability is a **mechanic with a coat of paint on it**, and the mechanics are
the fourteen in `EFFECTS`. The engine switches on those and nothing else, so a
new ability that reuses one is pure data:

1. Add an entry to `ABILITIES` in `src/game/world-abilities.js`: its `effect`
   (one of the fourteen), its numbers (`amount` / `turns` / `take`), its
   `charge`, the sentence that explains it, and an `fx` — the performance it
   plays when it lands. That is `props` (the objects it throws: an art id from
   `src/art/sprites-casts.js` and one of seven paths — `throw`, `fly`, `drop`,
   `rise`, `hold`, `return`, `toss`) plus a particle `motion` (`streak`,
   `swarm`, `fall`, `rise`, `burst`, `spiral`, `sweep`) and three colours. If it
   leaves something running, give it a `hold` colour for the sprite to wear
   while it does.
2. Draw its 16 x 16 icon in `src/art/sprites-abilities.js`, using the shared
   key, and any object it throws in `src/art/sprites-casts.js`. New colours need
   a home in `palette.js` first.
3. Put its id in a world's `enemy.abilities` in `src/game/worlds.js`.

A **special** is the same shape with a landmark on the end of it: an entry in
`SPECIALS` (cycle, warning, active window, strikes, damage, the `pattern` it
erupts in, the colour the sky goes, and what it throws), a builder in
`src/art/sprites-hazards.js` for the thing on the horizon, and `special` /
`specialChance` on the world. The clock, the damage and the drawing are all
generic — nothing in `duel-hazard.js`, `duel-engine.js` or `duel-scene.js` knows
what a volcano is.

A **pattern** is one entry in the table at the top of `duel-hazard.js`: given
the number of blows and the length of the window, it says when each one lands.
Six exist (`barrage`, `volley`, `sweep`, `swarm`, `lingering`, `charge`) and a
seventh is a few lines there and a name on a special. A pattern may not change
what an eruption costs — the total is always `strikes * damage`, which is what
keeps `specialDamage` honest for the shop card and the tooltip.

`charge` is the one with a second half in the art: it publishes a 0..1 fill
level the whole way up, the scene picks a frame out of the landmark's `charge`
layer by that number rather than by the clock, and the chip over the fight reads
a percentage instead of a countdown. A landmark that wants a wind-up needs
`charge` frames in its builder; one that does not, does not.

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
