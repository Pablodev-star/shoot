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
 *   active    it throws. `strikes` of them, spread across `activeMs`, each one
 *             costing `damage`.
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
 * @param {object} spec an entry from SPECIALS in src/game/world-abilities.js
 * @param {() => number} [random] injectable RNG, so a test can pin the strikes
 */
export function createHazard(spec, random = Math.random) {
  /**
   * A ONE-SHOT HAZARD STARTS AWAKE
   * -------------------------------------------------------------------------
   * The enemy's landmark is permanent and opens with twenty seconds of quiet,
   * because it was raised at a moment the player did not choose and the quiet
   * is the warning. The player's is the same machine with `cycleMs: 0` and
   * `oneShot`: it was raised by somebody pressing a button they had spent six
   * rounds charging, so it goes straight to the sky changing and it does not
   * come back. Same clock, both ends of the road.
   */
  let phase = spec.cycleMs > 0 ? HAZARD_PHASES.DORMANT : HAZARD_PHASES.WARNING;
  let t = 0;
  /** False until the first eruption, so the sky is clean when it is summoned. */
  let erupted = false;
  /** Times within the active window, in ms, at which a strike lands. */
  let schedule = [];
  let eruptions = 0;

  /**
   * Where the strikes fall inside the window.
   *
   * Never at the very start and never at the very end: the first is a beat
   * after the mountain goes off, so the player sees it coming out before it
   * arrives, and the last leaves the window enough room to close on the fight
   * rather than on a life bar dropping.
   */
  function scheduleStrikes() {
    const count = Math.max(1, spec.strikes);
    const from = spec.activeMs * 0.2;
    const to = spec.activeMs * 0.86;
    const step = (to - from) / count;
    schedule = [];
    for (let i = 0; i < count; i++) {
      schedule.push(from + step * i + random() * step * 0.6);
    }
  }

  /**
   * Advance the clock.
   * @returns {Array<{type: 'warn'|'erupt'|'strike'|'calm'}>} in the order they
   *   happened. A strike carries the whole cost of one hit so the engine does
   *   not have to reach back into the spec.
   */
  function tick(dt) {
    const events = [];
    t += dt;

    if (phase === HAZARD_PHASES.DORMANT) {
      if (t >= spec.cycleMs) {
        phase = HAZARD_PHASES.WARNING;
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
        events.push({ type: 'erupt' });
      }
      return events;
    }

    while (schedule.length && t >= schedule[0]) {
      schedule.shift();
      events.push({
        type: 'strike',
        damage: spec.damage,
        steal: spec.steal || 0,
        poisons: !!spec.poisons,
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

  return {
    id: spec.id,
    spec,
    tick,
    skyLevel,
    getPhase: () => phase,
    isActive: () => phase === HAZARD_PHASES.ACTIVE,
    /** True once a one-shot has been and gone; permanent ones never are. */
    isSpent: () => !!spec.oneShot && erupted && phase === HAZARD_PHASES.DORMANT,
    /** Seconds until the next eruption starts. For the countdown on the card. */
    secondsToNext: () =>
      phase === HAZARD_PHASES.DORMANT ? Math.max(0, Math.ceil((spec.cycleMs - t) / 1000)) : 0,
    getState: () => ({
      id: spec.id,
      phase,
      t,
      eruptions,
      sky: skyLevel(),
      /** 0..1 through the active window; -1 when it is not erupting. */
      activeK: phase === HAZARD_PHASES.ACTIVE ? Math.min(1, t / spec.activeMs) : -1,
    }),
  };
}
