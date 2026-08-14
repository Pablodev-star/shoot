/**
 * SHOOT! — Guided-random encounter generator (Block 3a).
 *
 * The player never picks a level. They walk, and the road decides. But "fully
 * random" is bad design — a stretch with no shop and no inn is unwinnable, and
 * one with five shops in a row is boring. So each world segment is generated
 * with *guarantees*:
 *
 *   - exactly `duels` duels, which is what the world's difficulty is measured in
 *   - shops and, quite separately, inns — as many of each as the length of the
 *     road is worth (`DUELS_PER_SERVICE`), or one fewer
 *   - never two of those stops in a row: a fight always stands between them
 *   - SERVICE_GAP duels between any two of them wherever the road can pay for it
 *   - order and spacing shuffled freely inside those guarantees
 *   - the world boss always closes the segment
 *
 * A SHOP IS NOT A DOORWAY TO AN INN
 * ---------------------------------------------------------------------------
 * Shops and inns used to be generated as an inseparable `[shop, inn]` pair,
 * dropped on the road a hundred pixels apart. Every world therefore had exactly
 * as many inns as shops, they always arrived together, and the road had two
 * kinds of thing on it — "a fight" and "the services" — which made the choice
 * of what to spend gold on a single decision taken twice at the same counter.
 *
 * They are independent stops now. A world rolls its shops and its inns
 * separately (1 or 2 of each, and usually 2), shuffles them into one order, and
 * spaces them out with duels. So a stretch can offer a shop, three fights and
 * another shop with no bed anywhere in between — the trip you finish carrying
 * gold and no lives — or two inns and a single shop, which is the opposite
 * problem. Neither is a special case in here; both fall out of the roll.
 *
 * NOTHING IS EVER SHOULDER TO SHOULDER
 * ---------------------------------------------------------------------------
 * Three rules keep the stops apart, and they are deliberately different rules:
 *
 *   1. SERVICE_ADJACENT_GAP duels sit between any two of them, ALWAYS. You
 *      never step out of a shop into another shop, out of an inn into another
 *      inn, or out of a counter straight into a bed. This one is absolute: it
 *      is not weighed against anything and it is not given up when the road
 *      runs short.
 *   2. SERVICE_GAP duels sit between them when the world can afford it, which
 *      is what makes a stretch of road feel like a stretch rather than a row
 *      of doors.
 *   3. SERVICE_MIN_GAP source pixels of approach in front of each one, which is
 *      the same rule expressed in distance rather than in events: a building
 *      should come up over the horizon and be walked towards, not appear.
 *
 * Distances are in source pixels; the walk engine converts them to time using
 * the current speed (which the horse multiplies).
 *
 * YOU CAN ONLY SEE FIVE OF THEM, AND THE REST ARE STILL BEING DECIDED
 * ---------------------------------------------------------------------------
 * The road used to be dealt face up: every duel, shop, inn and forge of a
 * world was fixed the moment the segment was generated, and the trail map
 * printed the lot. That is a map of a road, and it is also the whole world's
 * difficulty settled by one roll of the dice before the player has taken a
 * step — a run that rolled its two beds into the first third and then fought
 * nine duels with nowhere to sleep had lost to the generator, not to anybody's
 * play.
 *
 * So a segment now deals REVEAL_AHEAD stops face up and holds the rest face
 * down. What is held back is only the ORDER: the multiset of what a world
 * contains — exactly `duels` duels, the shops, the inns, the forges it rolled
 * — is fixed at generation and never changes, so no run gets more shops than
 * another and none gets fewer. Every time the player clears a stop, the next
 * card is turned over, and WHICH of the remaining kinds it turns out to be is
 * chosen from the state of the run: bleeding badly and the road finds you a
 * bed, carrying a purse you have not spent and it finds you a counter.
 *
 * Two things that are deliberately NOT true of it. It never invents a stop and
 * never removes one, so the road cannot rescue a run by handing it a fourth
 * inn. And it never looks at the encounter it is placing to decide how hard
 * the fight is — a duel is as hard as its world says, always. What adapts is
 * the shape of the road, which is the thing the player was previously being
 * asked to survive by luck.
 */

import { makeRng, hashSeed } from '../core/rng.js';
import { getWorld } from '../game/worlds.js';
import { OVERRIDES } from '../admin/overrides.js';

/**
 * Spacing between encounters, in source pixels.
 *
 * A LONGER WORLD IS MORE FIGHTS, NOT MORE WALKING
 * ---------------------------------------------------------------------------
 * These were solved against a world of five or six stops. At a dozen and a
 * half they were the same numbers describing twice the journey, and the thing
 * that noticed first was the hunger gauge: a crossing is `distance / speed`
 * seconds of rations however many duels are on it, so doubling the road
 * doubled the food bill without a single shop appearing to sell more. Measured
 * before they came down, starvation went from a rare death to the commonest
 * one in the middle worlds.
 *
 * So the stretches between stops are about two thirds of what they were, and a
 * crossing costs roughly what it always did. What the player gets out of the
 * extra length is what they were promised — more of the game, rather than more
 * of the road between it.
 */
export const MIN_GAP = 220;
export const MAX_GAP = 520;
/**
 * A shop or an inn is always approached, never stumbled into. Still the better
 * part of six seconds on foot, which is what "over the horizon and walked
 * towards" costs.
 */
export const SERVICE_MIN_GAP = 330;
/** The run-up to a boss is always long — it should feel like a march. */
export const BOSS_GAP = 900;

/**
 * How many shops (and, rolled again, how many inns) a world gets: the full
 * number, or one fewer.
 *
 * The odds are lopsided rather than a coin toss because a world that rolls the
 * lean version of BOTH is noticeably harder than its neighbours for a reason
 * the player cannot see; at 50/50 that would be a quarter of all worlds.
 */
export const SERVICE_PAIR_CHANCE = 0.8;

/**
 * HOW MANY COUNTERS AND BEDS A ROAD OF A GIVEN LENGTH IS WORTH
 * ---------------------------------------------------------------------------
 * It used to be "one or two", flat, and that was fine while every world was
 * five or six fights long. It stops being fine the moment a world is a dozen:
 * a bed is worth about half a bar and a duel costs about a third of one, so
 * what a world's stops have to cover is its LENGTH, not its name. Two beds on
 * a five-duel road is a comfortable crossing; two beds on an eleven-duel road
 * is a run that dies in the last third of every world with a full purse.
 *
 * So the count is the road divided by this, rounded, and never less than two —
 * a world with one shop and one bed is the lean shape, not the standard one.
 * Four is chosen against the two numbers above: a stop every four fights is
 * roughly a bed for every bar and a half the road takes off you.
 */
export const DUELS_PER_SERVICE = 4;

/**
 * How much road the generator would LIKE between two buildings.
 *
 * THREE, AND IT IS A WISH RATHER THAN A RULE
 * ---------------------------------------------------------------------------
 * A world holding six buildings would need nineteen fights to keep them all
 * three apart and the longest road in the game is eleven, so this is never
 * fully paid — and it is not supposed to be. It is the window `revealNext`
 * measures against: a building's chance of being dealt is scaled by how much of
 * this has been walked off since the last one, so the road spreads its doors
 * out as far as the hand can afford and no further. Measured over the six
 * worlds, that comes out at about a fight and a third between buildings against
 * the old five-duel road's four fifths.
 *
 * That "about" is why the old version of this number was not enough on its own.
 * It was a hard filter — inside the window, deal a fight — which sounds
 * stricter and is weaker, because a filter that has to yield when the hand runs
 * out of riders yields at the END of the world, where all the buildings it
 * pushed back are waiting. Fifty-nine per cent of all neighbouring buildings on
 * the old road were shoulder to shoulder.
 */
export const SERVICE_GAP = 3;

/**
 * The hard floor under it: fights that MUST separate two buildings. One, and it
 * is never traded away — see the note above for why the soft number could not
 * be trusted with this job. It costs the generator nothing to guarantee: a
 * world is never given more buildings than it has duels, and every building
 * spends exactly one of them on the fight that has to follow it.
 */
export const SERVICE_ADJACENT_GAP = 1;

/**
 * How many stops down the road the player can see.
 *
 * Five, which was between a third and a half of a world when a world was five
 * duels long and is nearer a quarter of one now: enough to plan a purchase
 * around ("there is a forge before the next bed, so I bank"), and not enough to
 * plan the whole world around. It did not go up with the length, because what
 * the horizon is for is the next decision rather than the next world — and on a
 * road this long, five stops is still further ahead than a purse can usefully
 * see. The boss is exempt — it is always the
 * last thing on the road and pretending otherwise would be a lie the player
 * can count.
 */
export const REVEAL_AHEAD = 5;

/**
 * What the road is willing to reshuffle, and what it weighs when it does.
 *
 * Each entry is a function of the run's state returning a weight for that kind
 * of stop; the revealed card is drawn from whatever kinds are still in the
 * world's hand, weighted by these. They are appetites, not rules — a road that
 * ALWAYS gave you the bed you needed would be a road with no decisions on it,
 * so a bleeding player is likely to find an inn next and not certain to.
 *
 * `duel` is deliberately never zero: the road always has fights on it, and a
 * player who is doing well should meet more of them rather than being handed a
 * shopping trip.
 */
const APPETITE = {
  /** A fight. Wanted most by a player in good shape with nothing to spend. */
  enemy: ({ health, purse, lastCall }) =>
    (1 + (1 - purse) * 0.6 + health * 0.5) * (lastCall ? 0.35 : 1),
  /**
   * A bed. Wanted in exact proportion to how hurt you are, and wanted badly
   * when the only thing left on the road is the boss.
   *
   * THE LAST STOP BEFORE A BOSS IS THE ONE THAT DECIDES THE WORLD
   * -------------------------------------------------------------------------
   * Measured over two hundred runs a skill level, a third of every death in
   * the game was a boss, and almost none of them were close: the player walked
   * up to Whiteout Kate on a third of a life bar because the road's last three
   * stops had been three duels. The fight was not lost at the fight, it was
   * lost four encounters earlier by a shuffle nobody could see.
   *
   * `lastCall` is the road noticing. It is not a guarantee of a bed — the hand
   * may not have one left, and a player who is fine gets a fight like anybody
   * else — it is the difference between a boss you walk into and a boss you
   * are pushed into.
   */
  inn: ({ health, purse, lastCall }) =>
    0.35 + Math.pow(1 - health, 1.6) * 3.4 + purse * 0.5 + (lastCall ? (1 - health) * 6 : 0),
  /**
   * A counter. Wanted when there is gold to spend — and wanted urgently when
   * there is nothing left in the bag to eat, because an empty gauge is the one
   * thing on this road that cannot be fought, only bought off.
   */
  shop: ({ purse, belly, stocked, lastCall }) =>
    0.4 + purse * 2 + (1 - belly) * 1.6 + (stocked ? 0 : 2.5) + (lastCall ? purse * 1.4 : 0),
  /** A smithy. Wanted when the purse could actually pay for the next rung. */
  forge: ({ canAffordRung, purse }) => 0.3 + (canAffordRung ? 2.2 : 0) + purse * 0.6,
};

/**
 * How many stops before the boss count as "the run-up to it". Two, so a hurt
 * player gets a bed and then one fight to spend the shape of it, rather than
 * being healed and immediately marched into the name card.
 */
const LAST_CALL = 2;

/**
 * How many fights a world opens with before it will deal a building. See the
 * note in `revealNext`.
 */
export const OPENING_FIGHTS = 2;

/** What a road this long is worth, or one fewer — weighted towards the full number. */
function rollServiceCount(rng, duels) {
  const full = Math.max(2, Math.round(duels / DUELS_PER_SERVICE));
  return rng.chance(SERVICE_PAIR_CHANCE) ? full : full - 1;
}

/**
 * Build the full event list for one world.
 * @param {number} worldId
 * @param {number|string} seed
 * @returns {{worldId:number, events:Array, totalDistance:number}}
 */
export function generateSegment(worldId, seed) {
  const world = getWorld(worldId);
  const cfg = world.encounters;
  const rng = makeRng(typeof seed === 'string' ? hashSeed(seed) : seed >>> 0);
  const duels = Math.max(1, cfg.duels);

  // --- 1. What the road has on it ----------------------------------------
  const services = [
    ...Array(rollServiceCount(rng, duels)).fill('shop'),
    ...Array(rollServiceCount(rng, duels)).fill('inn'),
    /**
     * One smithy, always, in the world that has to teach you what a smithy is;
     * four worlds in five everywhere else.
     *
     * It used to be two in the Dust Flats, which was a fair way to make sure
     * nobody missed the forge and stopped being fair the moment the road had to
     * hold anything else. Six buildings cannot be kept three fights apart on
     * any road this game has, so the gap collapsed and the opening stretch came
     * out as counter, fight, bed, fight, counter — every building in the world
     * in the first half of it. The forge is unmissable at one.
     */
    ...Array(worldId === 1 ? 1 : (rng.chance(0.8) ? 1 : 0)).fill('forge'),
  ];
  rng.shuffle(services);

  // --- 2. How far apart it can afford to keep them ------------------------
  // The opening duel plus one gap per pair of stops is the minimum duel bill.
  // A world too short to pay it buys a smaller gap first, and only then gives
  // up a stop — and when it does, it gives up a duplicate, so a world can lose
  // its second shop but never its only inn.
  //
  // In practice the first branch runs all the way down on every road in the
  // game — no world can pay nineteen fights for six buildings three apart — so
  // what this loop actually establishes is that the multiset FITS: one fight
  // per building, which is the promise `SERVICE_ADJACENT_GAP` keeps in
  // `revealNext`. The spacing the player feels is the dimmer over there, not
  // the bucket layout here; the buckets only decide what the world holds.
  //
  // The second branch is the one no world reaches. It exists so that a future
  // world short enough to be crowded gives up a duplicate rather than quietly
  // producing a road with two counters side by side.
  let gap = SERVICE_GAP;
  const bill = () => 1 + gap * (services.length - 1);
  while (gap > SERVICE_ADJACENT_GAP && bill() > duels) gap--;
  while (services.length > 1 && bill() > duels) dropDuplicate(services, rng);

  // --- 3. Deal the duels out around them ----------------------------------
  // One bucket in front of every stop, plus a last one between the final stop
  // and the boss. The first is at least one duel — a world should never open at
  // a counter you cannot afford anything at — the middle ones are the gap, and
  // the last may be empty, because arriving at a bed or a store right before
  // the boss is a good thing to be offered rather than a hole in the road.
  const buckets = new Array(services.length + 1).fill(0);
  buckets[0] = 1;
  for (let i = 1; i < services.length; i++) buckets[i] = gap;
  let spare = duels - buckets.reduce((sum, n) => sum + n, 0);
  while (spare > 0) {
    buckets[rng.int(0, buckets.length - 1)] += 1;
    spare -= 1;
  }

  // --- 4. Flatten into positioned events ----------------------------------
  // The ORDER produced here is the road's opening hand, not its final shape.
  // Everything past REVEAL_AHEAD is dealt face down and its kind is drawn from
  // the leftovers when the player gets close enough to see it — see
  // `revealNext`. The multiset is what is fixed; the sequence is not.
  const order = [];
  buckets.forEach((count, i) => {
    for (let n = 0; n < count; n++) order.push('enemy');
    if (services[i]) order.push(services[i]);
  });

  const events = [];
  let distance = 0;
  order.forEach(() => {
    // Every stop is dealt face down, including the ones the player will see
    // first: the opening five are turned over by `revealToHorizon` the moment
    // the world is entered, off the state the player walked in with.
    //
    // They used to be baked here, and that was a hole in the whole idea. A
    // player crossing into a new world with an empty bag would get whatever
    // opening the shuffle had already decided — and if that opening was five
    // fights, they starved with a full purse in front of a shop they never
    // reached. The road cannot answer the run if the first third of it was
    // written before the run existed.
    //
    // A stop still face down might turn out to be a building, and a building
    // has to be walked towards rather than appear, so every slot is given a
    // building's run-up. A duel that lands on one is simply a slightly longer
    // stretch of road, which costs nothing but a few rations.
    const gapPx = rng.int(SERVICE_MIN_GAP, MAX_GAP);
    distance += gapPx;
    events.push({
      index: events.length,
      type: null,
      distance,
      gap: gapPx,
      resolved: false,
      /** True while the map still shows a question mark here. */
      hidden: true,
    });
  });

  // --- 5. Boss ------------------------------------------------------------
  distance += BOSS_GAP;
  events.push({
    index: events.length,
    type: 'boss',
    distance,
    gap: BOSS_GAP,
    resolved: false,
    hidden: false,
  });

  /**
   * How far along the world each stop is, 0 at the border and 1 at the boss's
   * door. Stamped here rather than worked out by whoever is asking, because
   * the thing that reads it is the enemy generator — a rider past the halfway
   * mark of a world can be carrying the heavier gun (`enemyGunDamageAt` in
   * src/game/progression.js) — and "halfway" has to mean the same thing on the
   * road, on the map and in the balance harness.
   */
  const last = Math.max(1, events.length - 1);
  events.forEach((e) => {
    e.progress = e.index / last;
  });

  return {
    worldId,
    seed,
    events,
    totalDistance: distance,
    /** Everything the world is holding. Nothing is face up until it is dealt. */
    hand: order,
  };
}

/**
 * Everything the road weighs before it turns a card over, worked out and
 * handed back rather than acted on.
 *
 * IT IS SPLIT OUT SO THAT TWO THINGS CANNOT DISAGREE
 * ---------------------------------------------------------------------------
 * `revealNext` deals the card; `explainReveal` prints the odds on the admin
 * map. Those have to be the SAME arithmetic or the second one is a lie that
 * looks like documentation — the whole value of showing a tester "shop 41%,
 * inn 27%" is that the road really is about to roll those numbers. So the
 * reasoning lives here, once, and the two callers differ only in whether they
 * spend an rng on the result.
 *
 * @param {object} segment
 * @param {object} event the face-down event about to be turned over
 * @param {object} state a reading of the run — see `roadReading` below
 * @returns {{forced: string|null, allowed: string[], weights: object, flags: object, reading: object}}
 */
function planReveal(segment, event, state) {
  const kinds = [...new Set(segment.hand)];

  /**
   * THE RESERVE, WHICH IS WHAT MAKES THE ALTERNATION AFFORDABLE
   * -------------------------------------------------------------------------
   * Every building still in the hand except the first one needs a fight in
   * front of it, or the road finishes as a row of doors. So `buildingsLeft - 1`
   * riders are spoken for from the moment the world is generated, and
   * `canFight` is the question "is this rider one of the spare ones". Once it
   * goes false the rest of the road is forced — door, fight, door, fight — and
   * every stop after it deals itself.
   *
   * It is asked BEFORE the opening rule as well as after it. Two free fights at
   * the border is a pacing nicety; never two doors in a row is a promise.
   */
  const enemiesLeft = segment.hand.filter((kind) => kind === 'enemy').length;
  const buildingsLeft = segment.hand.length - enemiesLeft;
  const canFight = enemiesLeft > 0 && enemiesLeft > buildingsLeft - 1;

  /**
   * A WORLD OPENS WITH FIGHTS
   * -------------------------------------------------------------------------
   * The first two stops of every world are riders while the hand still has
   * one, and the reason is the purse rather than the pacing: you cross a
   * border having spent the last world's money on the last world's problems,
   * so a counter in the opening stretch is a building you walk past. A forge
   * dealt into slot one — which is what used to happen, because nothing in the
   * shuffle said otherwise — is the single most expensive thing on the road
   * offered at the exact moment nobody can afford it, and then not offered
   * again for a world.
   *
   * The old pre-baked order had this rule (`buckets[0] = 1`) and it was lost
   * when the road became adaptive: the buckets only fix the multiset now, and
   * the sequence is whatever `revealNext` chooses. So it lives here, where the
   * choosing happens.
   */
  const opening = event.index < OPENING_FIGHTS && canFight;

  /** True when the boss is close enough that this is the last chance to prepare. */
  const lastCall = segment.hand.length <= LAST_CALL;
  const reading = { ...state, lastCall };

  /**
   * HOW LONG IT HAS BEEN SINCE THE LAST DOOR
   * -------------------------------------------------------------------------
   * Counted in what was actually DEALT rather than in what was planned,
   * because the plan is only a multiset by the time anybody is walking on it.
   * It drives the two halves of the spacing rule:
   *
   *   `mustFight` — the stop immediately behind this one was a building, so
   *   this one is a fight, full stop. Nothing outweighs it and nothing trades
   *   it away. It cannot run the road out of riders either, because `canFight`
   *   above is what keeps a fight in reserve for every building still in hand.
   *
   *   `spacing` — the soft one, and it is a dimmer rather than a switch. A
   *   building's appetite is scaled by how much of SERVICE_GAP has been walked
   *   off since the last one: a third of it one fight later, two thirds two
   *   fights later, all of it after three. Forcing a fight outright inside the
   *   window was tried and it does the opposite of what it looks like — the
   *   riders all get spent in the first half of the world and the last four
   *   stops come out as a parade of doors, which is the exact thing the rule
   *   exists to prevent.
   */
  const isBuilding = (type) => type && type !== 'enemy' && type !== 'boss';
  let since = 0;
  for (let i = event.index - 1; i >= 0 && !isBuilding(segment.events[i].type); i--) since += 1;
  /**
   * The admin's one lever on the shape of the road rather than on its odds:
   * with the spacing waived, the adjacency floor and the dimmer both come off
   * and a tester can get five counters in a row to walk through a shop bug.
   * See src/admin/overrides.js.
   */
  const spaced = !OVERRIDES.road.ignoreSpacing;
  const mustFight = spaced && since < SERVICE_ADJACENT_GAP && segment.hand.includes('enemy');
  const spacing = spaced ? Math.min(1, since / SERVICE_GAP) : 1;

  let allowed = kinds;
  if (mustFight) allowed = ['enemy'];
  else if (!canFight) {
    // Out of slack: the rest of the road alternates, and this stop is a door.
    const doors = kinds.filter((kind) => kind !== 'enemy');
    if (doors.length) allowed = doors;
  }

  /**
   * THE LAST BED IS SAVED FOR THE DOOR OF THE BOSS
   * -------------------------------------------------------------------------
   * Seven runs in ten ended at a boss, and the fights themselves were not the
   * problem — measured at a full bar the six of them sit between two thirds
   * and nine tenths winnable. What killed the runs was arriving on half a bar,
   * because the world had spent both its inns in its opening stretch.
   *
   * So while a world still has one bed in hand and the player is carrying any
   * damage at all, that bed comes off the table: it is not dealt into the
   * middle of the road, it waits, and it is what the player walks into last.
   * A world with two beds still spends the first one wherever it is wanted.
   *
   * The player can see it coming — it turns face up five stops out like
   * everything else — and that is the point. A bed you know is there is gold
   * you can spend at the counter instead of hoarding.
   */
  const bedsInHand = segment.hand.filter((kind) => kind === 'inn').length;
  if (bedsInHand === 1 && segment.hand.length > 1 && state.health < 1) {
    const held = allowed.filter((kind) => kind !== 'inn');
    if (held.length) allowed = held;
  }

  /**
   * THE ONE PROMISE THE ROAD MAKES
   * -------------------------------------------------------------------------
   * If the world still has a bed left when the boss comes into view, and the
   * player is carrying anything less than a full bar, that bed is the next
   * building they see. Not likely — certain.
   *
   * A soft bias was tried first and it was not enough: a third of every death
   * in the game stayed a boss fought at half strength, because the appetite
   * that wanted an inn was competing with the two that wanted a fight and a
   * counter, and it lost often enough to matter. A guarantee costs the road
   * one shuffle and buys the player something they can plan around — you know
   * the bed is coming, so the gold in your hand can go on the counter instead
   * of being held back for it. That is a decision where there used to be a
   * prayer.
   *
   * It still costs money. The road puts the door in front of you; whether you
   * can afford what is behind it is your ledger's problem.
   */
  const lastBed = lastCall && state.health < 1 && allowed.includes('inn');

  /**
   * The draw, and it is a draw from a HAND rather than from a menu of kinds.
   *
   * Each kind's appetite is multiplied by how many of it are still in there,
   * which is the difference between a road that paces itself and one that
   * front-loads its fights. Without it a hand of six riders and one counter
   * weighs the counter exactly as heavily as the riders — a shop is one kind
   * out of two, never mind that it is one card out of seven — so the fights
   * come out early, the buildings pile up at the end, and the alternation rule
   * spends the whole last third of the world holding them apart.
   *
   * The second term is the spacing dimmer above; fights are never dimmed.
   */
  const weights = {};
  for (const kind of allowed) {
    const held = segment.hand.filter((k) => k === kind).length;
    const appetite = Math.max(0.01, APPETITE[kind]?.(reading) ?? 1);
    // The admin's thumb on the scale, and it is a multiplier on the APPETITE
    // rather than on the finished weight so that the hand count and the
    // spacing dimmer still mean what they mean. One is the untouched game.
    const thumb = OVERRIDES.road.appetite[kind] ?? 1;
    weights[kind] = Math.max(0.01, appetite * thumb * held * (kind === 'enemy' ? 1 : spacing));
  }

  /**
   * Everything that takes the choice away, strongest first. The admin's
   * `forceNext` outranks even the opening-fights rule — it is the tool for
   * "put a forge in front of me right now" — but it can only name a kind the
   * world is actually still holding: the road can be bent, not counterfeited.
   */
  const demanded = OVERRIDES.road.forceNext;
  const forced = demanded && segment.hand.includes(demanded)
    ? demanded
    : opening
      ? 'enemy'
      : lastBed
        ? 'inn'
        : null;

  return {
    forced,
    allowed,
    weights,
    reading,
    flags: {
      opening,
      lastCall,
      lastBed,
      mustFight,
      canFight,
      spacing,
      since,
      enemiesLeft,
      buildingsLeft,
      bedsInHand,
      admin: demanded && segment.hand.includes(demanded) ? demanded : null,
    },
  };
}

/**
 * Turn the next face-down stop over, choosing its kind from how the run is
 * going. Call it once per encounter cleared; it is a no-op when there is
 * nothing left hidden.
 *
 * @param {object} segment the walk engine's segment, mutated in place
 * @param {object} state a reading of the run — see `roadReading` below
 * @returns {object|null} the event that was revealed
 */
export function revealNext(segment, state) {
  if (!segment || !segment.hand || segment.hand.length === 0) return null;
  const event = segment.events.find((e) => e.hidden);
  if (!event) return null;

  const plan = planReveal(segment, event, state);
  const rng = makeRng((segment.seed ^ (event.index * 2654435761)) >>> 0);
  const kind = plan.forced ?? rng.weighted(plan.weights);

  segment.hand.splice(segment.hand.indexOf(kind), 1);
  event.type = kind;
  event.hidden = false;
  return event;
}

/**
 * The same decision, taken apart instead of taken.
 *
 * Nothing is mutated and no card is dealt: this is what the admin map draws so
 * a tester can see WHY the road is about to do what it does — which kinds are
 * still in the hand, which of them are legal here, what each one's appetite
 * evaluates to on the run as it stands, and the probability that falls out of
 * all of it. See `planReveal`.
 *
 * @returns {object|null} null when there is nothing face down left
 */
export function explainReveal(segment, state) {
  if (!segment || !segment.hand || segment.hand.length === 0) return null;
  const event = segment.events.find((e) => e.hidden);
  if (!event) return null;

  const plan = planReveal(segment, event, state);
  const total = Object.values(plan.weights).reduce((sum, w) => sum + w, 0) || 1;
  const chances = {};
  for (const [kind, weight] of Object.entries(plan.weights)) {
    chances[kind] = plan.forced ? (kind === plan.forced ? 1 : 0) : weight / total;
  }
  // A forced kind may not even be in the weight table (the opening rule can
  // name a fight the spacing had excluded), so it is added rather than assumed.
  if (plan.forced && chances[plan.forced] == null) chances[plan.forced] = 1;

  return {
    event,
    ...plan,
    chances,
    /** What each appetite function returns on its own, before the hand count. */
    appetites: Object.fromEntries(
      [...new Set(segment.hand)].map((kind) => [
        kind,
        Math.max(0.01, APPETITE[kind]?.(plan.reading) ?? 1),
      ]),
    ),
    hand: [...segment.hand],
  };
}

/**
 * Reveal everything the horizon covers. The walk engine calls this after each
 * encounter so the player always has REVEAL_AHEAD stops in front of them, and
 * on load so a restored run is not briefly blind.
 */
export function revealToHorizon(segment, state) {
  if (!segment) return [];
  const revealed = [];
  const known = () =>
    segment.events.filter((e) => !e.resolved && !e.hidden && e.type !== 'boss').length;
  let guard = segment.events.length;
  while (known() < REVEAL_AHEAD && guard-- > 0) {
    const event = revealNext(segment, state);
    if (!event) break;
    revealed.push(event);
  }
  return revealed;
}

/**
 * Re-apply a saved run's revealed kinds on top of a freshly generated segment.
 *
 * A segment is rebuilt from its seed on load, which reproduces the hand but
 * not the order the road actually took — that was decided by how the run was
 * going, and the run is the only record of it. So the types are written down
 * in the save and laid back over the top here, with whatever they did not
 * cover left face down.
 *
 * @param {object} segment
 * @param {Array<string|null>} types one entry per event, null for still-hidden
 */
export function applyReveals(segment, types) {
  if (!segment || !Array.isArray(types)) return segment;
  const hand = [...segment.hand];
  segment.events.forEach((event, i) => {
    const type = types[i];
    if (!type || !event.hidden) return;
    // Spend it out of the hand if it is there; a save from a different build
    // may name a kind this segment never dealt, and the road survives that
    // rather than throwing the run away.
    const at = hand.indexOf(type);
    if (at !== -1) hand.splice(at, 1);
    event.type = type;
    event.hidden = false;
  });
  segment.hand = hand;
  return segment;
}

/**
 * Remove one stop of whichever kind there are two of, so trimming a road that
 * cannot hold everything never costs the player their only inn or their only
 * shop. Falls back to dropping the last one if both kinds are already single.
 */
function dropDuplicate(services, rng) {
  const counts = services.reduce((acc, type) => ({ ...acc, [type]: (acc[type] || 0) + 1 }), {});
  const doubled = services.filter((type) => counts[type] > 1);
  const victim = doubled.length ? rng.pick(doubled) : services[services.length - 1];
  services.splice(services.lastIndexOf(victim), 1);
}

/**
 * The run, reduced to the five numbers the road cares about.
 *
 * Everything is 0..1 so an appetite can be written as arithmetic rather than
 * as a pile of thresholds, and every one of them is something the player can
 * see on their own interface — this is the road reading the same dials they
 * are, which is what keeps an adaptive road from feeling like a rigged one.
 *
 * @param {object} r
 * @param {number} r.lives      lives in hand
 * @param {number} r.maxLives   the bar they came out of
 * @param {number} r.hunger     rations left
 * @param {number} r.hungerMax  a full gauge
 * @param {number} r.gold       the purse
 * @param {number} r.bedPrice   what a full night costs here — the yardstick a
 *                              purse is measured against, so "rich" means the
 *                              same thing in the flats and in the Galaxy
 * @param {number} r.gunCost    what the next rung of the revolver costs
 * @param {boolean} r.hasFood   anything edible in the bag at all
 */
export function roadReading({
  lives, maxLives, hunger, hungerMax, gold, bedPrice, gunCost, hasFood,
}) {
  const unit = (n) => Math.max(0, Math.min(1, n));
  return {
    health: unit(lives / Math.max(1, maxLives)),
    belly: unit(hunger / Math.max(1, hungerMax)),
    purse: unit(gold / Math.max(1, bedPrice * 3)),
    stocked: !!hasFood,
    canAffordRung: Number.isFinite(gunCost) && gold >= gunCost,
  };
}

/**
 * Where an encounter actually sits on the road, in travelled pixels.
 *
 * The horse does not move the encounters — it shortens the *gap* in front of
 * each one, which is a different thing and the reason this is a function rather
 * than a field. Everything that has to place an event against `travelled` (the
 * walk engine, the approaching buildings, the trail map) goes through here, so
 * a mounted player's map and a mounted player's road agree.
 *
 * @param {{distance:number, gap:number}} event
 * @param {boolean} mounted
 * @param {number} timeMul the mounted gap multiplier (HORSE_TIME_MUL)
 */
export function effectiveDistance(event, mounted, timeMul) {
  return event.distance - event.gap + event.gap * (mounted ? timeMul : 1);
}

/**
 * Human-readable label for an encounter type. Used by the trail map's markers
 * and its legend.
 *
 * There used to be a `peekAhead` here as well, which returned the next three
 * encounters with a vague distance attached ("Shop just ahead"). It existed
 * only to fill the toast the Map item printed, and the map replaced both — the
 * road drawn to scale says everything the proximity words were approximating,
 * and it still never shows a number.
 */
export const ENCOUNTER_LABELS = {
  enemy: 'Duel',
  shop: 'Shop',
  inn: 'Inn',
  forge: 'Forge',
  boss: 'Boss',
  /** Still face down. The map draws a signpost with a question mark on it. */
  unknown: 'Unknown',
};
