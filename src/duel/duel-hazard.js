/**
 * SHOOT! — The clock a world special runs on.
 *
 * A special (src/game/world-abilities.js) is not an effect that resolves. It
 * is a thing that arrives and then STAYS, and this is the state machine that
 * says what it is doing at any given millisecond:
 *
 *   dormant   it is on the horizon and it is quiet. `cycleMs`.
 *   warning   the sky turns. `warnMs`. Nothing is thrown yet — this window
 *             exists so that being hit is never the first news of it.
 *   active    it goes off. What that MEANS is the pattern's business, below.
 *   dormant   and round again, until somebody wins.
 *
 * WHY IT IS A REAL CLOCK AND NOT A ROUND COUNTER
 * ---------------------------------------------------------------------------
 * Every other rule in this game waits for the player, and it should: a duel is
 * three buttons and as long as you like to think about them. A volcano is the
 * one thing in the game that is not having that conversation. Twenty seconds
 * is twenty seconds whether you have taken your turn or not, which is the
 * entire reason a special is worth a shop slot — it does not make the enemy
 * better at duelling, it makes the duel a place you cannot stand around in.
 *
 * SEVEN SPECIALS THAT ERUPT SEVEN DIFFERENT WAYS
 * ---------------------------------------------------------------------------
 * They used to erupt one way. Every special spread `strikes` evenly across its
 * window and took `damage` off you each time, so a volcano and a hornet tree
 * and a tear in the sky were the same metronome in three colours — and once a
 * player has learned to count "one, two, three" through an eruption they have
 * learned all six.
 *
 * So the shape of an eruption is a PATTERN now, and every special names one:
 *
 *   barrage    rock thrown out over the window, one at a time  (the volcano)
 *   volley     the whole thing at once, in one slab            (the cornice)
 *   sweep      an even beat crossing the road, no jitter       (the twister)
 *   swarm      a tight flurry at the front of the window       (the hornets)
 *   lingering  slow, evenly spaced, all the way to the end     (the blackdamp)
 *   toll       a bell, and every beat sooner than the last     (the gallows)
 *   charge     it winds up in front of you and lands ONE hit   (the rift)
 *
 * `charge` is the one that changes what a special IS. Nothing is thrown for
 * the whole active window: the thing on the horizon is visibly gathering, and
 * at the end of it a single shot arrives carrying the eruption's entire cost —
 * four lives at once out of a rift, rather than four rocks of one. Then it goes
 * quiet and starts counting again like anything else.
 *
 * THE ONE RULE EVERY PATTERN KEEPS
 * ---------------------------------------------------------------------------
 * An eruption is worth `strikes * damage` lives however it is spent. A pattern
 * decides the rhythm and the size of each blow; it never decides the total. So
 * `specialDamage` still answers the only question the shop card and the tooltip
 * ever ask, and a pattern can be changed without re-tuning a world.
 *
 * That is also why this file has no idea what a round is. It is handed `dt` in
 * milliseconds and hands back a list of events; src/duel/duel-engine.js turns
 * those into damage, and src/duel/duel-scene.js turns the same state into rock
 * and sky.
 *
 * NOTHING IN HERE DRAWS OR DECIDES DAMAGE. It is a metronome with a schedule.
 */

/** The three states, in the order they run. */
export const HAZARD_PHASES = { DORMANT: 'dormant', WARNING: 'warning', ACTIVE: 'active' };

/** How long the sky takes to let go of the colour after an eruption ends. */
const FADE_MS = 1600;

/**
 * Where in its window a `charge` special finally lets go.
 *
 * Not 1: the shot has to land inside the eruption and leave the window a beat
 * to close on the fight rather than on a life bar dropping — the same reason
 * every other pattern stops short of the end.
 */
const CHARGE_RELEASE = 0.86;

/**
 * THE SIX SHAPES AN ERUPTION CAN TAKE
 * ---------------------------------------------------------------------------
 * Each one is handed the spec, the length of the window and an RNG, and hands
 * back the blows that window contains: when each lands, and what it costs.
 * Everything after this table treats the result as an opaque list, so a new
 * pattern is a new entry here and nothing else.
 *
 * A blow is `{ at, damage, steal, poisons, mega }`. `mega` is not a number —
 * it is the flag that says "draw this one as the whole eruption arriving",
 * which is the difference between a rock and the rift firing.
 */
const PATTERNS = {
  /**
   * The volcano. Rock thrown up and out across the window, one at a time,
   * jittered so no two eruptions have the same rhythm.
   */
  barrage: (n, ms, rng) => spread(n, ms * 0.2, ms * 0.86, rms(rng, 0.6)),

  /**
   * The cornice. A slab does not come off a mountain in instalments: the whole
   * eruption arrives inside half a second, early, and the rest of the window is
   * the snow still coming down after it.
   */
  volley: (n, ms, rng) => spread(n, ms * 0.16, ms * 0.16 + 320, rms(rng, 0.4)),

  /**
   * The twister. A wall crossing the road at a constant speed, so the beat is
   * dead even — the one pattern with no jitter in it at all, because what makes
   * it frightening is that you can hear exactly when the next one is due.
   */
  sweep: (n, ms) => spread(n, ms * 0.16, ms * 0.9, () => 0),

  /** The hornets. Everything out of the nest in one flurry, then the buzzing. */
  swarm: (n, ms, rng) => spread(n, ms * 0.14, ms * 0.56, rms(rng, 0.9)),

  /**
   * The blackdamp. Gas does not hit, it accumulates: an even, slow beat that
   * runs all the way to the end of the window, so the last of it lands while
   * the player is already sure it is over.
   */
  lingering: (n, ms, rng) => spread(n, ms * 0.24, ms * 0.96, rms(rng, 0.25)),

  /**
   * The gallows. A bell does not toll evenly for long: it is swung, and every
   * beat comes a little sooner than the one before it until the whole eruption
   * is on top of itself and stops.
   *
   * The curve is what does it. `spread` puts the blows at even fractions of the
   * window; this one eases them the other way — `1 - (1 - k)^p` — so the first
   * gap is about two and a half times the last and the eruption ends in a
   * clatter. It is the only pattern in the table whose beats accelerate, and
   * the reason it is worth having is that a player counting the rhythm of this
   * one is counting wrong on purpose.
   */
  toll: (n, ms, rng) => accelerate(n, ms * 0.14, ms * 0.9, 1.8, rms(rng, 0.2)),

  /**
   * The rift, and the reason this table exists.
   *
   * Nothing at all for the whole window — the landmark is winding up in plain
   * sight and the scene draws every millisecond of it — and then one blow
   * carrying the lot.
   */
  charge: (n, ms) => [{ at: ms * CHARGE_RELEASE, hits: n, mega: true }],
};

/**
 * Evenly spaced blows between two times, each nudged by `jitter(step)`.
 *
 * The interval is divided by `n - 1`, not by `n`, so the LAST blow lands on
 * `to` rather than a whole step short of it. Dividing by `n` was quietly
 * throwing away the end of every window: the blackdamp's second tick, asked
 * for 96% of a seven-second window, was arriving at 60% of it and leaving two
 * silent seconds on the end of a pattern whose whole character is that it is
 * still going when you think it has stopped.
 *
 * Everything is then clamped into `[from, to]` and sorted. That matters more
 * than it looks: `to` is always inside the active window by construction, and
 * a blow scheduled past the end of the window is not late, it is GONE — the
 * clock drops whatever is left in the schedule when the window closes — so a
 * clamp here is what stops a jitter roll from silently costing an eruption
 * part of its damage.
 */
function spread(n, from, to, jitter) {
  if (n <= 1) return [{ at: from, hits: 1 }];
  const step = (to - from) / (n - 1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const at = from + step * i + jitter(step);
    out.push({ at: Math.min(to, Math.max(from, at)), hits: 1 });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * `spread`, with the beats crowding towards the end of the window.
 *
 * `power` is how hard they crowd: 1 is `spread` exactly, and 1.8 — the bell's —
 * puts the first gap at about two and a half times the last. Everything else is the same
 * machinery, including the clamp and the sort, because a pattern that produced
 * blows outside its own window would be a pattern that spends lives after the
 * eruption is over.
 */
function accelerate(n, from, to, power, jitter) {
  const span = to - from;
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 1 : i / (n - 1);
    const at = from + span * (1 - Math.pow(1 - k, power));
    out.push({ at: Math.max(from, Math.min(to, at + jitter(span / Math.max(1, n)))) });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * A jitter function worth `k` of a step, drawn from the injected RNG.
 *
 * Symmetric — it can pull a blow earlier as well as later — because the two
 * blows at the ends of the run now sit exactly on `from` and `to`, and
 * one-sided jitter on those would only ever be clamped away.
 */
const rms = (rng, k) => (step) => (rng() - 0.5) * step * k;

/**
 * @param {object} spec an entry from SPECIALS in src/game/world-abilities.js
 * @param {() => number} [random] injectable RNG, so a test can pin the strikes
 */
export function createHazard(spec, random = Math.random) {
  /**
   * A ONE-SHOT HAZARD STARTS AWAKE
   * -------------------------------------------------------------------------
   * The enemy's landmark is permanent and opens with a stretch of quiet,
   * because it was raised at a moment the player did not choose and the quiet
   * is the warning. The player's is the same machine with `cycleMs: 0` and
   * `oneShot`: it was raised by somebody pressing a button they had spent six
   * rounds charging, so it goes straight to the sky changing and it does not
   * come back. Same clock, both ends of the road.
   *
   * THE FIRST QUIET IS SHORTER THAN THE ONES AFTER IT
   * -------------------------------------------------------------------------
   * And it has to be, or the whole system is scenery. The enemy raises its
   * landmark around round two or three — about ten seconds in — and the first
   * quiet used to be a full `cycleMs` on top of that, so the first rock landed
   * somewhere past the thirty-five second mark. A duel lasts twenty to thirty
   * seconds. Measured over four hundred boss fights a world, at a normal pace:
   * the volcano erupted in 0% of them, the rift in 0%, the hornet tree in 1%.
   * Six landmarks, six eruption patterns, an art file each, and five of the
   * six were a picture on the horizon that never did anything.
   *
   * `firstCycleMs` is the fix and it is the whole fix: the opening quiet is
   * long enough to be a warning and short enough to be a threat, and every
   * cycle after it runs at the full `cycleMs`. A special is now something the
   * fight has to be finished around rather than something you outrun.
   */
  const firstCycle = spec.cycleMs > 0 ? (spec.firstCycleMs ?? spec.cycleMs) : 0;
  let phase = firstCycle > 0 ? HAZARD_PHASES.DORMANT : HAZARD_PHASES.WARNING;
  let t = 0;
  /** False until the first quiet has been served: `cycleMs` applies after it. */
  let opened = false;
  /** False until the first eruption, so the sky is clean when it is summoned. */
  let erupted = false;
  /** The blows left in the window that is currently running. */
  let schedule = [];
  let eruptions = 0;

  const pattern = PATTERNS[spec.pattern] ? spec.pattern : 'barrage';
  const isCharge = pattern === 'charge';

  /**
   * Lay out the eruption that is starting.
   *
   * The pattern says WHEN and how many blows; this says what each blow costs,
   * and it is here rather than in the table so that the invariant — an
   * eruption is worth `strikes * damage` however it is spent — is written once.
   */
  function scheduleStrikes() {
    const count = Math.max(1, spec.strikes);
    const blows = PATTERNS[pattern](count, spec.activeMs, random);
    schedule = blows.map((blow) => ({
      at: blow.at,
      damage: (blow.hits || 1) * spec.damage,
      steal: spec.steal || 0,
      poisons: !!spec.poisons,
      mega: !!blow.mega,
    }));
  }

  /**
   * Advance the clock.
   * @returns {Array<{type: 'warn'|'erupt'|'strike'|'calm'}>} in the order they
   *   happened. A strike carries the whole cost of one blow so the engine does
   *   not have to reach back into the spec.
   */
  function tick(dt) {
    const events = [];
    t += dt;

    if (phase === HAZARD_PHASES.DORMANT) {
      if (t >= (opened ? spec.cycleMs : firstCycle)) {
        phase = HAZARD_PHASES.WARNING;
        opened = true;
        t = 0;
        events.push({ type: 'warn' });
      }
      return events;
    }

    if (phase === HAZARD_PHASES.WARNING) {
      if (t >= spec.warnMs) {
        phase = HAZARD_PHASES.ACTIVE;
        t = 0;
        erupted = true;
        eruptions += 1;
        scheduleStrikes();
        events.push({ type: 'erupt', charging: isCharge });
        return events;
      }
      return events;
    }

    while (schedule.length && t >= schedule[0].at) {
      const blow = schedule.shift();
      events.push({
        type: 'strike',
        damage: blow.damage,
        steal: blow.steal,
        poisons: blow.poisons,
        mega: blow.mega,
      });
    }
    if (t >= spec.activeMs) {
      phase = HAZARD_PHASES.DORMANT;
      t = 0;
      events.push({ type: 'calm', done: !!spec.oneShot });
    }
    return events;
  }

  /**
   * How much of the hazard's colour is currently over the world, 0..1. The
   * scene reads this for the sky and for how hard the landmark is lit; it
   * ramps through the warning, holds through the eruption and lets go slowly.
   */
  function skyLevel() {
    if (phase === HAZARD_PHASES.WARNING) return Math.min(1, t / spec.warnMs);
    if (phase === HAZARD_PHASES.ACTIVE) return 1;
    if (!erupted) return 0;
    return Math.max(0, 1 - t / FADE_MS);
  }

  /**
   * HOW FULL THE THING ON THE HORIZON IS, 0..1
   * -------------------------------------------------------------------------
   * Only a `charge` special has one, and it is the whole point of that pattern:
   * the player has the entire warning and the entire active window to watch it
   * fill, so the shot that takes four lives is never a surprise — it is a thing
   * they could see coming and had to fight around. -1 for everything else.
   *
   * It starts during the WARNING rather than at the eruption, because a rift
   * that is quiet for two seconds and then suddenly full has hidden the half of
   * the wind-up the player most needed.
   *
   * And it STOPS at the shot. The active window runs on for another half second
   * after the beam lands, and clamping this at 1 through that tail left the
   * chip reading "CHARGING 100%" over the top of an impact that had already
   * happened — the one moment in the whole cycle when the player is certain
   * what just occurred, being contradicted by the interface. Once it has fired
   * there is nothing left to charge, so it goes back to -1 and the rest of the
   * window is simply the wreckage.
   */
  function chargeLevel() {
    if (!isCharge) return -1;
    if (phase === HAZARD_PHASES.WARNING) return Math.min(1, t / spec.warnMs) * 0.3;
    if (phase !== HAZARD_PHASES.ACTIVE) return -1;
    const k = t / (spec.activeMs * CHARGE_RELEASE);
    if (k >= 1) return -1;
    return 0.3 + 0.7 * k;
  }

  return {
    id: spec.id,
    spec,
    tick,
    skyLevel,
    getPhase: () => phase,
    /** Which of the six shapes this one's eruption takes. */
    getPattern: () => pattern,
    isActive: () => phase === HAZARD_PHASES.ACTIVE,
    /** True once a one-shot has been and gone; permanent ones never are. */
    isSpent: () => !!spec.oneShot && erupted && phase === HAZARD_PHASES.DORMANT,
    /**
     * Seconds until the next eruption starts. For the countdown on the card,
     * which is why it reads the quiet the hazard is ACTUALLY serving rather
     * than `cycleMs`: the first one is shorter, and a chip that counts down
     * from twenty while the sky turns at six is a chip that lies once per
     * fight, at the only moment anybody is reading it.
     */
    secondsToNext: () =>
      phase === HAZARD_PHASES.DORMANT
        ? Math.max(0, Math.ceil(((opened ? spec.cycleMs : firstCycle) - t) / 1000))
        : 0,
    getState: () => ({
      id: spec.id,
      phase,
      pattern,
      t,
      eruptions,
      sky: skyLevel(),
      /** 0..1 through the active window; -1 when it is not erupting. */
      activeK: phase === HAZARD_PHASES.ACTIVE ? Math.min(1, t / spec.activeMs) : -1,
      /** 0..1 as a charge special fills; -1 for the other five. */
      charge: chargeLevel(),
    }),
  };
}
