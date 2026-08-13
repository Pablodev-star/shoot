/**
 * SHOOT! — Guided-random encounter generator (Block 3a).
 *
 * The player never picks a level. They walk, and the road decides. But "fully
 * random" is bad design — a stretch with no shop and no inn is unwinnable, and
 * one with five shops in a row is boring. So each world segment is generated
 * with *guarantees*:
 *
 *   - exactly `duels` duels, which is what the world's difficulty is measured in
 *   - one or two shops and, quite separately, one or two inns
 *   - at least SERVICE_GAP duels between any two of those stops
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
 * Two rules keep the stops apart, and they are deliberately different rules:
 *
 *   1. SERVICE_GAP duels sit between any two of them, so you never step out of
 *      a shop into another shop, or out of an inn into another inn, and never
 *      walk from a counter straight to a bed either. There is always a road in
 *      between, and something on it.
 *   2. SERVICE_MIN_GAP source pixels of approach in front of each one, which is
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

/** Spacing between encounters, in source pixels. */
export const MIN_GAP = 320;
export const MAX_GAP = 780;
/** A shop or an inn is always approached, never stumbled into. */
export const SERVICE_MIN_GAP = 480;
/** The run-up to a boss is always long — it should feel like a march. */
export const BOSS_GAP = 1050;

/**
 * How many shops (and, rolled again, how many inns) a world gets. Two is the
 * normal shape of a world and one is the lean version of it, which is why the
 * odds are lopsided rather than a coin toss: at 50/50 a quarter of all worlds
 * would have a single shop *and* a single inn, and that stretch is noticeably
 * harder than its neighbours for a reason the player cannot see.
 */
export const SERVICE_PAIR_CHANCE = 0.8;

/** Duels that must sit between two service stops. Reduced only if it cannot fit. */
export const SERVICE_GAP = 2;

/**
 * How many stops down the road the player can see.
 *
 * Five, which is between a third and a half of a world: enough to plan a
 * purchase around ("there is a forge before the next bed, so I bank"), and not
 * enough to plan the whole world around. The boss is exempt — it is always the
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

/** One or two, weighted towards two. */
function rollServiceCount(rng) {
  return rng.chance(SERVICE_PAIR_CHANCE) ? 2 : 1;
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
    ...Array(rollServiceCount(rng)).fill('shop'),
    ...Array(rollServiceCount(rng)).fill('inn'),
    /**
     * One smithy, always, in the world that has to teach you what a smithy is;
     * four worlds in five everywhere else.
     *
     * It used to be two in the Dust Flats, which was a fair way to make sure
     * nobody missed the forge and stopped being fair when the worlds got
     * shorter. Six services on a road with seven duels cannot be kept two
     * fights apart, so `SERVICE_GAP` collapsed to one and the opening stretch
     * came out as counter, fight, bed, fight, counter — every building in the
     * world in the first half of it. The forge is unmissable at one.
     */
    ...Array(worldId === 1 ? 1 : (rng.chance(0.8) ? 1 : 0)).fill('forge'),
  ];
  rng.shuffle(services);

  // --- 2. How far apart it can afford to keep them ------------------------
  // The opening duel plus one gap per pair of stops is the minimum duel bill.
  // A world too short to pay it buys a smaller gap first, and only then gives
  // up a stop — and when it does, it gives up a duplicate, so a world can lose
  // its second shop but never its only inn. No world in the game is currently
  // tight enough to reach either branch; they exist so that adding one cannot
  // quietly produce a road with two counters side by side.
  let gap = SERVICE_GAP;
  const bill = () => 1 + gap * (services.length - 1);
  while (gap > 1 && bill() > duels) gap--;
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

  const rng = makeRng((segment.seed ^ (event.index * 2654435761)) >>> 0);
  const kinds = [...new Set(segment.hand)];
  /** True when the boss is close enough that this is the last chance to prepare. */
  const lastCall = segment.hand.length <= LAST_CALL;
  const reading = { ...state, lastCall };

  /**
   * The one structural rule that survives the shuffle: two counters, two beds
   * or a counter and a bed never stand shoulder to shoulder. It is checked
   * against what has actually been dealt rather than against the plan, and it
   * yields when the hand has nothing else left — the last three stops of a
   * world are allowed to be three buildings if that is all there is.
   */
  const recent = segment.events
    .slice(Math.max(0, event.index - SERVICE_GAP), event.index)
    .map((e) => e.type);
  const crowded = recent.some((type) => type && type !== 'enemy' && type !== 'boss');
  let allowed = crowded && segment.hand.includes('enemy') ? ['enemy'] : kinds;

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

  const weights = {};
  for (const kind of allowed) weights[kind] = Math.max(0.01, APPETITE[kind]?.(reading) ?? 1);
  const kind = lastBed ? 'inn' : rng.weighted(weights);

  segment.hand.splice(segment.hand.indexOf(kind), 1);
  event.type = kind;
  event.hidden = false;
  return event;
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
