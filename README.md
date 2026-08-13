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
| **Shoot**  | −1        | vulnerable | rival vulnerable → your shot lands; rival shielded → nothing      |

Both duellists shoot in the same turn → both take a hit. First to zero lives
loses. Lives are red diamonds, and always will be — and because they are, every
damage figure in the game is a whole diamond or a half of one.

**You start on three diamonds and the trail iron takes half of one a shot, so a
rider needs six clean hits to finish you.** That number is the feel of this
game, and it is the one thing the balance harness refuses to let drift: a
version of this once shipped where it had quietly grown to *twelve* in the Dust
Flats and *fourteen* by the second world, because the player's life bar and the
rider's bullet were two numbers in two files growing at different rates.

A rider carries two diamonds more every world — that ladder is written down by
hand. Everything else is tuned around it: a bar that starts at three and grows
one life a level at about three levels every two worlds, a forge ladder worth
half a life a rung, and a rider's bullet derived from the bar so that six hits
still kill you. See `EXPECTED_POWER` in `src/game/progression.js`.

| World | You have | A rider hits for | A rider carries | So a rider is |
| --- | --- | --- | --- | --- |
| Dust Flats | 3 lives, 0.5 a shot | 0.5 | 1 | 2 shots |
| Wildgrass Prairie | 4 lives, 1.5 | 0.5 | 3 | 2 shots |
| Whitecrown Pass | 6 lives, 2.5 | 0.5 | 5 | 2 shots |
| Blackwater Bayou | 7 lives, 3.5 | 1 | 7 | 2 shots |
| Brimstone Basin | 9 lives, 3.5 | 1 | 9 | 2.6 shots |
| Galaxy | 10 lives, 3.5 | 1 | 11 | 3.2 shots |

Six to twelve hits to kill you and two to three to kill them. The headroom
grows on purpose: **the last two worlds are where the forge ladder runs out** —
the gun stops at three and a half and the riders keep climbing — so a fight out
there takes a third shot and runs half again as long, which needs a deeper bar
to cost the same third of itself. You cannot out-buy the road any more, and the
Galaxy is shorter to pay for it.

**And the road gets worse as you walk it.** From the halfway point of a world,
half the riders carry the next rung of the ladder: the Dust Flats open on
half-life bullets and close on riders who hit for half or a whole one, the
Prairie opens on one and closes on one or one and a half, and so on up. Six
hits deep becomes four. You can see it coming — the heavier bullet comes with a
heavier gun in the man's hand (`ENEMY_GUNS` in `src/game/gun-tiers.js`), so a
longbarrel on the road ahead is a warning. Your own level-up lands in the same
stretch, which is the other half of the deal: the world gets meaner and you get
bigger, once per world, six times.

A round is played out rather than announced. Both fighters go for their guns —
hand to the holster, barrel out of leather, arm up, levelled — and only then
does anyone fire: the flash blooming down the bore in four beats, burning
grains thrown after it, a tracer laying a tail along the road behind it, the
case out of the cylinder, and powder smoke left hanging. A life is lost when
the round arrives, not when the gun appears.

**Your gun is whatever you have paid for.** The flash, the tracer, the sparks
and the shockwave all come off the rung of the forge ladder you are on, so the
last world can be walked into carrying something that lights the whole road up.

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

**The opponent does not look at your gun. You look at theirs.**

It has a habit model — what you have actually done this duel — and it plays the
counter to a *sample* from it a minority of the time; the rest of the time it
plays its own game off its own cylinder. It never reads yours, which is where
"every time I reload, they fire" used to come from.

**Its own cylinder is drawn on its card, and it tells the truth.** An empty gun
reloads better than nineteen times in twenty; a stocked one fires nine times in
ten. That picture is the only real tell in the game and it is the whole of the
skill in a duel: spend their dry turns freely, and put a shield up on the turns
the chambers say a round is coming. Measured over five hundred duels, a player
who watches it takes about a fifth less damage per fight than one who does not.

**It will also notice you repeating yourself.** Three identical moves in a row
and the fourth is likely to meet an answer — not because it saw the move, but
because you told it. Vary and it never happens.

There was a version of this opponent that shielded a tenth of its turns and
never twice running, and it was so reliably open that mashing SHOOT beat playing
properly by nine points. The shield is a real move again: a quarter of its
turns, never three in a row.

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

- **Poison** — half a life a round for three rounds. Nothing stops it.
- **Dynamite** — a life and a half at a stroke, the biggest single hit in the game,
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
| Dust Flats | **Dust Devil** | A wall crossing the road on a dead-even beat. 1 life, and it empties a chamber |
| Wildgrass Prairie | **Hornet Tree** | The nest empties in one flurry. 1 life, and it leaves you poisoned |
| Whitecrown Pass | **Hanging Cornice** | The slab comes off — all of it inside half a second. 2 lives |
| Blackwater Bayou | **Blackdamp** | The bog breathes out slowly, still arriving when you think it is over. 2 lives, and it leaves you poisoned |
| Brimstone Basin | **Volcano** | Throws rock across an eight-second eruption. 3 lives, and the lava stays on the road |
| Galaxy | **The Rift** | **Charges** for five seconds and then fires **once**: 3 lives in a single shot, and it takes a round with it |

An eruption costs about a fifth of your life bar wherever you are, which is why
the first two throw half-weight blows: two lives is a fifth of the Stranger's
road and two fifths of Big Jed's.

That clock is real time. Every other rule in this game waits for you to press
something; a volcano does not. It stands on the horizon doing nothing, the sky
goes red, it throws, and it goes quiet and starts counting again — so the
countdown on the chip above the fight is the one number in a duel worth
hurrying for. A shield is no use under any of it (it is the ground, not a shot),
the vest still eats one of them, and the diadem does not touch it: the diadem
blocks things aimed at you, and a mountain is not aiming.

**The first quiet is shorter than the ones after it, and that is what makes any
of this true.** A landmark goes up around round two and a duel is over in twenty
to thirty seconds; with a full cycle of quiet in front of the first eruption,
the volcano erupted in 0% of measured boss fights and the rift in 0% — six
landmarks, six eruption patterns, an art file each, and five of the six were
scenery. `firstCycleMs` is about a third of `cycleMs`, and the six of them now
go off in four fights out of five. It also means hiding is not defence: a shield
buys one round and costs one, and a fight dragged out four rounds longer walks
into another eruption, which nothing blocks.

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
2. Power is rationed by **time**, and the ration was halved. A rider fight runs
   four to six rounds and the cheapest charge in the game is six, so a trick is
   no longer something both sides get to use in every fight — it is something
   one of you gets to use in a LONG fight, which is the boss. That is the
   answer to the oldest complaint about this game: that abilities were the only
   thing doing real damage and the gun was decoration.
3. **The cost is the size of what it takes away** — turns, not damage, written
   as one rule rather than nineteen opinions:

   ```
   charge ≈ 2 × (3 + 1.5 × what it takes away, in lives or in turns)
   ```

   A stolen round counts as a third of a turn, a freeze as the turns it costs,
   damage as lives. That is why Meteor Strike is fourteen and Dust Snatch is
   six.
   Set by feel, two of them had come out badly wrong: measured against the
   Stranger, Meteor Strike was worth +44 points of win rate and Void Mirror +41
   against a budget of thirteen to twenty.
4. It is meant to decide **bosses**, not drifters.

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
  shops, inns and forge are rolled around them. One or two shops and —
  separately — one or two inns, usually two of each, shuffled into the road with
  fights between any two of them. Nothing is ever adjacent to anything of its
  own kind, and no building is ever stumbled into: they are always approached —
  and you stop at the door. The building is drawn so its doorway lands on the
  traveller at the moment the stop is reached, and it is still standing there
  behind you when you walk on.
- **You can see five stops ahead, and the rest of the road is still deciding.**
  The map used to print the whole world the moment you walked into it, which
  meant a run's difficulty was settled by one shuffle before you had taken a
  step: a road that dealt both its beds into its opening third and then asked
  for nine fights had been lost to the generator, not to anybody's play.

  A world now deals five stops face up and holds the rest face down — they are
  question marks on the trail map, and each one turns over as you clear an
  encounter. What is held back is only the **order**. The multiset is fixed at
  generation and never changes: no run gets a fourth inn, and none gets one
  fewer. Which of the remaining kinds a card turns out to be is read off the
  state of the run — bleeding and the road finds you a bed, carrying a purse you
  have not spent and it finds you a counter, doing fine and it finds you a
  fight.

  **A world opens with fights.** The first two stops are always riders, and the
  reason is the purse rather than the pacing: you cross a border having spent
  the last world's money on the last world's problems, so a counter in the
  opening stretch is a building you walk past. A forge dealt into slot one —
  which is what the shuffle used to do, because nothing told it otherwise — is
  the most expensive thing on the road offered at the exact moment nobody can
  afford it, and then not offered again for a world.

  Two more promises inside that. **The road never changes how hard a fight is** — a
  duel is as hard as its world says, always; only the shape of the road adapts.
  And **the last bed a world has left is saved for the door of the boss**: while
  a world still holds one inn and you are carrying any damage at all, that inn
  will not be dealt into the middle of the road. Seven deaths in ten used to be
  a boss fought at half strength. You can see the bed coming, which means the
  gold in your hand can go on the counter instead of being held back for it.
- **Hunger** drains while you travel. At zero you lose **half a life a tick, and
  the tick gets faster the bigger your life bar is** — about half a minute from
  the end of the run whoever you are. It used to be a flat life every twelve
  seconds, which is a real threat at three lives and nothing at all at eleven:
  the one system whose whole job is to make food a purchase stopped being one
  exactly when food got hardest to find. Food is a real purchase now, at both
  ends of the road. The gauge is notched into ten
  rations, so how much is left is something you see rather than read. Two
  things burn them faster — the horse, and harsh weather, a sandstorm half
  again as fast with snow and ashfall close behind — and the gauge says so: the
  combined multiplier rides beside the track, and the track looks scoured
  whenever the sky is the reason, so the change is never something you find out
  by dying.
- **Three things that put lives back, in three different shapes.** A **Bandage**
  is a flat two diamonds — most of the bar on the road out of the Dust Flats, a
  ninth of it by the Galaxy, which is the right decay for the cheapest thing on
  any counter. A **Med Kit** is half of you, rounded up, wherever you are
  standing. A **Potion** is three quarters. The two rare ones are written as a
  fraction of the bar so they mean the same thing in every world, and the heal
  slot every shop guarantees offers a bandage where the world rolls common and
  one of the big two where it rolls rare — so the world where two diamonds
  stops being a rescue is the world that starts stocking the boxes.
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
- **A horse** roughly halves travel time — and the food a crossing costs with
  it. It burns rations 15% faster per second and it halves the number of
  seconds, so a mounted world costs about 44% less food than a walked one. The
  travel band can only show the per-second figure, which is the half of it that
  looks like a cost, so the card says the rest out loud.
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
  **One slot is always something that heals**, because a counter that held one
  bandage offered only if the dice felt like it made lives something you could
  be refused after playing correctly — and by the basin a shop rolls common
  less than a third of the time. Gold can always be turned into lives; how much
  of the purse goes that way instead of into the gun is the decision.
  **How many of a thing is on the shelf is rolled from its rarity** — a common
  is two most visits (one in five, three in ten), a rare is one four times in
  five, a legendary is one. The ordinary answer being two is what stops a
  single counter from solving a world, which is what five of everything used to
  do: a run's worth of supplies bought in world one at world-one prices.
  Permanent kit — the map, a vest, an ability — is one apiece, because a second
  one does nothing.

  **Food sets its own, shallower depth, and that number is load-bearing.** At
  five apiece and a stack of ninety-nine, one visit to the cheapest shop in the
  game sold 310 hunger against a world that costs about 120 to cross — so a
  single trip in the Dust Flats covered two and a half worlds and the gauge
  never had to be thought about again. A survival system you can pre-pay in its
  entirety at the first counter you meet is a loading screen. Three apiece, and
  a few days' worth in the bag.

  **And nothing you carry is worth more in the next world than it was in this
  one.** Selling used to pay half of the *local* asking price, and prices
  inflate about 42% a world on top of each world's own multiplier — so a carrot
  bought for 10 gold in the Dust Flats sold for 85 in the Galaxy and a potion
  bought for 110 sold for 765. The correct play was to buy out the first shop
  and run a caravan. A sale is a fraction of what the thing *is* now, wherever
  you are standing, which makes carrying goods forward strictly a loss.
  A shop is a **stall**, not a list: a striped canvas awning with a scalloped
  valance, the store's sign hanging off it on two ropes, two posts, and a plank
  counter with the goods standing on it — inside a trading post whose shelves,
  barrels, sacks and overhead rail of pans and hats are drawn behind them.
- **Inns** sell a basic bed — a bit under half your bar, wherever you are — or a
  premium bed (heals everything), and **the two beds are two beds**. The cheap
  bed is written as a fraction rather than a number of lives, because as a
  number it fell behind the thing it was healing at exactly the rate the bar
  grew. Both offers used to show the
  same 16 x 16 icon at 3x, so the choice was made by reading two prices under
  one picture. Each now stands in a little room of its own: a plank cot with a
  sacking mattress, the straw coming out of it and an army blanket over the
  foot, or a panelled frame with brass on the posts, two pillows, a quilt and a
  rug. The room they are in is drawn too — a stone hearth with a live fire in
  it, a window with the night behind it, a rug, a chair pulled up to the heat.
- **The forge** sells the only thing in the game you keep forever: the gun. Six
  improvements, each worth **half a life a shot** on top of the half the trail
  iron does, and each one a **different revolver** — the trail iron you rode in with, tempered steel, a brass
  longbarrel, the silvered Ivory Hand, the Emberbore that never cooled, the
  Starfall, and the Nova, which has a nebula burning inside the frame and three
  stars in orbit around it. What you bought is visible in the fight: the shape
  in your hand, the colour of the muzzle flash, the tracer, the sparks the
  barrel sheds between rounds, and — from the Emberbore up — a shockwave off
  every shot.

  It is priced for **two rungs a world for three worlds**, and the curve is
  solved for it: 90 gold for the first and 505 for the last, against the gold
  each world actually pays out (see `gunUpgradeCost` in
  `src/game/progression.js`, and `tools/sim.mjs asymmetry`, which prints both
  columns side by side). The whole ladder is 1,520 of a full clear that pays
  about 17,000 — the forge is an **early-game** shop, finished with you by the
  Bayou, and what your gold does after that is what the later worlds are about:
  med kits, beds, and the legendaries that used to lose the argument with the
  next rung every time. It used to cost more than the road pays out at all,
  which is not an expensive decision, it is a locked door with a price painted
  on it.

  **A rung is the best gold you can spend, and that is on purpose.** It
  shortens every fight of the world, and a shorter fight is the cheapest damage
  reduction on the road — measured, the first two rungs are worth more than
  anything else on any counter. What separates a good run from a bad one is not
  whether you buy them; it is whether buying them ate the food and the bandages
  as well.

  The counter is a **smithy**, not a panel: an iron hood over a scorched bench,
  the sign on two chains, the gun turning on a plate under it and the ladder
  drawn as seven notches. Behind it is a working workshop — furnace, bellows,
  anvil, quench trough, tool wall — and buying a rung **performs** it: three
  blows on the anvil, brass poured, a quench that fills the room with steam, the
  coals blown white, a ring of cold runes, or the roof opening onto a starfield.
  One performance per rung, and no two are the same
  (`src/shops/forge-scene.js`). Out on the road the forge is the one building
  with something happening in it: the furnace burns in the doorway as you walk
  past and the chimney smokes.
- **A real inventory**: eat, heal, throw dynamite mid-duel, or sell anything back
  for half its value. The bag carries its own purse and it is live — sell three
  things and the number under your thumb is right each time, and the coins fly
  across to it.
- **Using something is something you SEE.** A bandage or a med kit washes the
  player green with a dark green plus rising out of his chest; anything eaten
  does the same in orange, with the food's own icon instead of the plus. Both
  play on the road and in the middle of a duel, because the saddlebag opens in
  both and a life quietly appearing on a card behind an animation already in
  motion is the easiest thing in the game to miss.
- **Gold travels.** Win a fight, sell a saddle, and a handful of coins crosses
  the screen to whichever purse is on it — the travel band's, the shop's, the
  saddlebag's — and the number counts up as they land rather than before they
  set off. Every counter in the game follows the purse live too: sell something
  while standing at the forge and the rung you could not afford a moment ago
  goes buyable without leaving the building.
- **The Bulletproof Vest is armour you keep.** It stops the first thing that
  hits you in a duel — a bullet, a stick of dynamite, a rock off an erupting
  mountain, a tick of venom — comes apart doing it, and you have it patched up
  again by the time the next rider is on the road. **One blow per fight, every
  fight, for as long as it is in the bag.**

  It has been wrong twice. First it was gated on the blow being FATAL, which is
  defensible on paper and indistinguishable from a broken item in the hand: you
  bought the most expensive thing on the counter, got shot, lost a life, and it
  sat in your bag doing nothing. Then it was spent — one blow and gone — which
  is a four-hundred-gold legendary that buys you one round of one fight. It is a
  permanent change to how the road works now, like the horse and the canteen.

  And you can see it: the vest is drawn on your character's chest for as long
  as you have one, riding the sprite's own breath and stagger, and when it goes
  it is torn off, tumbles end over end onto the road at your boots and fades out
  there.
- **The trail map** is a drawn map of the road you are on, not a list: the
  ground of the biome you are walking, the road winding through it, and every
  duel, shop, inn and boss marked on it, with your own position as a blue
  circle. Drag it, zoom it, and open it as often as you like — it is bought
  once and kept, not spent per look. It still shows no numbers.

  **It shows five stops and then a row of question marks.** The road past the
  horizon has not been decided yet — see the adaptive road above — so the map
  draws what it honestly knows: the country, the road through it, the five
  stops that are settled, the boss at the end, and a blank signpost for every
  one that is still being chosen.

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
- **Levelling is the slow reward again.** About **three levels every two
  worlds**, each worth **one life** — one more maximum and one more in the bar
  to go with it — so the whole climb is three diamonds to ten. The first one is
  deliberately cheap and lands on the very first fight, because the Dust Flats
  is the one stretch where the bar is at its shallowest exactly as the road
  starts ramping. And it **performs**: the level chip goes gold and flares, so
  the slowest reward in the game is the one thing on the band you cannot miss. It does not make you safer: a rider's bullet is a sixth of
  whatever the bar has grown to, so eighteen lives is the same six hits deep
  that three was. What the growth buys is room to absorb a bad duel, not
  immunity from one. It is not a refill: if you arrive at a level-up on your
  last life you leave it on your fourth, and the bed at the inn is still the
  only way back to the top.
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
- **Bosses hit harder than they last.** A boss is three or four shots deep with
  the revolver you should be carrying by then — long enough for its landmark to
  erupt once or twice, short enough that it is a fight rather than a siege. That
  window is narrow on purpose: measured at a full bar the six of them sit
  between two thirds and nine tenths winnable, and every point of the difference
  is whether you walked up to the door with a full life bar.

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

## Achievements

Sixty-four of them, in six sections, on the main menu where the credits used
to be. They live **outside the save slots** — next to the profile and the
settings, through the same storage driver — because a run can die and take its
file with it, and the whole point of an achievement is that it survives that.

The screen leads with one number: **the percentage of the game you have
actually seen**. Under it, the count, and then the six sections, each saying
how much of itself is done. Nothing is secret and nothing is hidden: a locked
card is drained of its colour and shows a padlock where the medal goes, but it
still says what it wants, because the list is meant to be usable as a set of
things to go and do rather than a set of surprises.

Every card carries a **reward slot**, and twenty-six of them now have clothes
on the hanger: a picture of the garment, its slot and its name, on the locked
cards as well as the earned ones. The link is written down in exactly one place
— `reward: { kind: 'clothing', slot, id }` on the achievement itself — and the
wardrobe reads the list backwards to find out what each garment is waiting for.
Move a reward from one line to another and nothing else has to be told. The
rest of the list pays in bragging rights, and says so; "coming soon" on sixty
cards was worse than an honest blank.

**What one is allowed to ask for.** Every line on the list is something an
ordinary player does by playing. There is nothing that needs a trick, a guide
or a run set up in advance. What is *not* easy is holding all of them at once:
the counting ones — a hundred duels, ten thousand gold, the boss of all six
worlds — are several honest runs, and the road kills most runs a long way short
of the last horizon (the harness puts a finished run at 3% for an average
player and 15% for an expert). Generous per line, long as a whole.

**How it is wired.** Nearly all of it listens rather than being told. The game
already announces everything worth hearing on the event bus — a level, a world,
a boon, a storm, a totem, a purse — so most of `src/game/achievements.js` is a
subscription list, and no system in the game had to learn that achievements
exist. The four or five moments the bus does not carry (a purchase, a bed, a
rung of gun, the shape of a duel that was just won) come in through `track()`,
the one function the rest of the game calls.

**The notice.** An unlock drops a card in at the top of the screen *wherever
the player is standing* — on the road, at a counter, mid-duel, over the top of
the battle overview. It is not a toast: the toast layer is the running
commentary, four at a time with the oldest thrown away, and losing an unlock
behind three gold notices would be losing the moment it exists for. So it has
its own layer above everything (`#achievement-notices`), a queue rather than a
stack so two unlocks in the same instant are read one after the other, and the
percentage on it — the notice is also the nudge towards the screen the rest of
them live on. Nothing in that layer takes a click.

One thing it does *not* do is measure damage off the life bar. "Untouched" asks
the duel engine whether anything got through, because a bandage mid-fight or a
totem putting lives back can leave a player who was shot twice ending on more
than they started with.

The credits screen is not gone: `src/menu/credits.js` is untouched and still
registered with the router — it simply has no door on the menu for now.

## The wardrobe

Thirty garments across four slots — hat, shirt, trousers, boots — of which four
are the clothes you start in and **twenty-six are paid for by an achievement**.
The door is the avatar on the Profile screen: it is a button, with a pixel
pencil hanging off its corner, and it opens a screen with the clothes on the
left and the gunslinger himself on the right, breathing in the same idle loop
the game uses everywhere else, wearing whatever is currently selected. Nothing
is committed until Save.

**A garment is not a palette swap.** The cheap version of a wardrobe is one hat
in nine colours, and it is cheap for a reason: at sixteen pixels the silhouette
is nearly all the information a sprite carries, so nine colours of one shape is
one hat the player stops looking at after the second. Everything here changes
shape. The sombrero is wider than the man and puts his eyes in shadow; the
stovepipe is tall and narrow; the ushanka hangs flaps beside the jaw; the Basin
helm has horns off the top corners of the sprite; the kerchief comes up over the
mouth. You can tell what somebody is wearing from across the road.

**It is the same rig.** `composeFighter` in `src/art/sprites-character.js`
already builds a fighter out of a head, a torso and a set of legs — it is how
every enemy in the game is drawn — so an outfit is just another set of parts.
A hat is stamped over the bare face (all eleven rows, which is what lets one
shade the brow and another cover the mouth), a shirt owns its collar, its torso
and its own belt, and trousers and boots are a palette plus a transform over the
leg poses. The transforms are why the legs are not colour swaps either: a leg
moves between poses, so a garment cannot type pixels at fixed coordinates — the
helpers in `src/art/sprites-wardrobe.js` *find* the legs in whatever pose they
are in and hang fringe, seams, studs, cuffs and spurs off them. One description,
five poses.

**One outfit, everywhere.** Saving writes four ids to the profile — device-side,
outside the save slots, so a run dying cannot cost you a hat you beat the Basin
for — and re-bakes the player. Everything that draws a gunslinger asks the rig
for the current set, so the change reaches the profile portrait, the man waiting
at the end of the road behind the menu, the walk, the saddle and the duel
without any of them subscribing to anything. The mannequin on the wardrobe
screen is composed off to one side and never touches that cache, which is why
the road behind the screen keeps wearing the saved outfit while you try things
on in front of it.

An equipped outfit is **validated on every read**: a profile that arrives from
somewhere else claiming a Starcrown, with the ledger saying otherwise, walks out
in the hat it started in.

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
index.html              boot page: one canvas, one screen root, two overlays
package.json            no dependencies; the scripts are the server and the sim
tools/sim.mjs           the balance harness — see Tuning
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
    sprites-wardrobe.js   every garment the player can earn: hats stamped over
                          the bare face, shirts with their own collar and belt,
                          and the trouser/boot transforms that find the legs in
                          whatever pose they are in (Block 2f)
    sprites-enemies.js    enemy archetypes — heads, torsos, legs and palettes
                          composed on the rig
    sprites-fx.js         muzzle flash, powder smoke, spent brass, impact,
                          sparks — and the same set re-baked in a gun tier's
                          own colours
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
    sprites-forge.js      what a smithy is made of: the furnace and its mouth,
                          the anvil, the hammer, the bellows, the quench trough,
                          the tool wall and the finished work on the rack
    sprites-items.js      item icons (Block 2c)
    sprites-ui.js         interface icons + the duel shield (Block 2d)
    map-art.js            the trail map: the height field the ground is
                          painted, shaded and contoured off, the water, the
                          cracks, the markers, the cased road and the rose
  ui/                    shared widgets, saddlebag, trail map, toasts, dialogs,
                         speech, and the achievement notice that outranks all
                         of them
  menu/                  title, online, profile, wardrobe, settings,
                         achievements, credits
  explore/               walk engine, parallax, encounters, hunger, day/night, weather
  shops/                 shop, inn and forge logic + screens, and the workshop
                         scene the six upgrade rituals are performed in
  duel/                  duel engine, agents, scene, screen, boss entrances,
                         the performance an ability plays when it is cast, and
                         the real-time clock a world special runs on
  game/                  items, worlds, progression maths, player state,
                         enemies, world abilities, the seven-rung revolver
                         ladder, save slots, run controller, interstitials,
                         the achievement ledger, and the wardrobe the ledger
                         pays out in
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

### Measuring first

```bash
npm run sim          # everything, and it fails the build if a band has drifted
node tools/sim.mjs duels     # win rates and attrition per world, per skill
node tools/sim.mjs bosses    # the six bosses
node tools/sim.mjs specials  # how often a landmark actually erupts
node tools/sim.mjs runs      # full runs, permadeath on
```

`tools/sim.mjs` imports the **real** duel engine, the real opponent, the real
road generator and the real progression curves and reimplements none of them.
What it substitutes is the person: three synthetic players, from someone mashing
one button and spending their gold on the shiniest thing to someone who reads
the rival's cylinder and buys their bandages before they need them.

It exists because every number in this game lives in a data file, which makes it
easy to change and impossible to review by eye. Reading the tables had produced
a volcano that erupted in 0% of measured fights, an opponent so open that
mashing SHOOT beat playing properly by nine points, and a road that no simulated
player ever finished. None of that is visible in a diff.

The design target is a skill ladder rather than a difficulty, and the harness
fails if the game leaves it:

| | reaches the Galaxy |
| --- | --- |
| mashes one button, spends badly | ~6% |
| plays reasonably | ~19% |
| reads the cylinder, buys correctly | ~54% |

Almost all of that spread is the **ledger**, not the trigger finger. Reading the
opponent's chambers is worth about a fifth of the damage you take; buying food
before you are hungry and bandages before you are hurt is worth the run.

`node tools/sim.mjs asymmetry` is the other half of the harness and the one that
would have caught the worst bug this game has had. It puts the two sides of the
road on one page — what the progression curve *claims* the player will have,
what the economy actually delivers, what the riders carry, and how many
connected shots it takes to kill each of you — and fails the build if a rider
needs fewer than four or more than eight hits to finish the player.

### Where the numbers are

Balance lives in data, not in code:

- `src/game/worlds.js` — per-world difficulty, rarity tables, price and reward
  multipliers, how many duels the road holds, bosses, and which biome each world
  is in.
- `src/explore/encounters.js` — how the road is laid out: how many shops and
  inns a world rolls, how far apart they have to be, the spacing between
  everything on it, how far ahead the player can see (`REVEAL_AHEAD`) and the
  `APPETITE` table that decides what a face-down stop turns out to be.
- `src/game/biomes.js` — per-biome weather tables (which skies a place can have
  and how it moves between them).
- `src/game/world-abilities.js` — the fourteen mechanics, the nineteen
  abilities built from them (numbers, charge cost, and the `weight` that says
  how often an enemy reaches for it) and the six specials. An ability that
  hurts too much is one number on the ability; a special is `strikes` and
  `damage`; how many enemies carry a special at all is `specialChance` in
  `worlds.js`. Player and enemy fire the same numbers — the asymmetry is the
  turn rule, not the tuning.
- `src/game/progression.js` — every curve, and the spine of the difficulty:
  `EXPECTED_POWER` (what the player's bar and revolver look like in each world)
  plus `HITS_TO_KILL_PLAYER`, `HITS_TO_KILL_ENEMY` and `HITS_TO_KILL_BOSS`, from
  which every rider's damage and every rider's life total is **derived** rather
  than written down separately. Also exp and the level ladder, gold, prices, inn
  healing as a fraction of the bar, the gun's damage and its deliberately
  super-exponential upgrade cost, hunger drain, how fast starving ticks against
  the size of your bar, walking speed, the horse discount. Everything that hurts
  is a multiple of half a life, because half a diamond is a shape the interface
  can draw and 0.15 of one is not.
- `src/game/gun-tiers.js` — the seven revolvers: what each rung is called, which
  silhouette it is cut from, what it is made of, what it throws when it fires,
  and which ritual the forge performs to make it. Nothing in it is a mechanic —
  the damage is one line in `progression.js` — so the art can get as loud as it
  likes without the balance moving.
- `src/shops/shop.js` — what a counter holds: `STOCK_DEPTH` for anything
  stackable, and the guaranteed heal in slot zero.
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

`1` reload · `2` shield · `3` shoot · `I` saddlebag · `M` trail map.
