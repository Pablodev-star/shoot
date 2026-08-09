/**
 * SHOOT! — Duel engine (Block 5b).
 *
 * THE RULES (unchanged since the very first prototype):
 *
 *   RELOAD  +1 bullet. You are VULNERABLE this turn.
 *   SHIELD  bullets unchanged. You are PROTECTED this turn.
 *   SHOOT   costs 1 bullet. You are VULNERABLE this turn.
 *             · rival vulnerable → rival loses 1 life
 *             · rival protected  → nothing happens, the bullet is spent
 *
 *   Both shoot in the same turn → both lose a life.
 *   First to zero lives loses the duel.
 *
 * AGENTS
 * ---------------------------------------------------------------------------
 * The engine never reads input and never draws. Each side is an *agent*:
 *
 *   { chooseMove(publicView): Promise<'reload'|'shield'|'shoot'> }
 *
 * The story mode passes a local UI agent and an AI agent. The future online
 * mode passes the same UI agent and a remote agent that resolves when the
 * opponent's move arrives over the network — the engine does not change.
 *
 * MODIFIERS
 * ---------------------------------------------------------------------------
 * `modifiers` comes from weather and the time of day:
 *   misfireChance          both sides may misfire (wet powder in the rain)
 *   enemyAccuracyPenalty   the AI reads you less reliably (sandstorm, night)
 *
 * ABILITIES ARE IDS, AND AN ID NAMES ONE OF FOURTEEN MECHANICS
 * ---------------------------------------------------------------------------
 * Both sides carry ability *ids* — `deepFreeze`, `poison`, `voidMirror` — and
 * `applyAbility` resolves each one to its `effect` and does that. Ten of the
 * fourteen never touch a life bar: they leave a counter on a fighter (ice, a
 * jammed gun, a shield that has stopped working) and the round resolution
 * reads it. See `blankStatus`, and src/game/world-abilities.js for the table.
 *
 * Casting is not free. An enemy that casts spends its whole turn on it, and a
 * player who casts knocks the enemy's hand to its belt — see the note on
 * `playerCastPending`, which is the rule the charge costs are paying for.
 *
 * AND THERE IS ONE THING IN HERE THAT DOES NOT WAIT FOR A ROUND
 * ---------------------------------------------------------------------------
 * A world SPECIAL — the volcano, the twister, the rift — is cast once by an
 * enemy that has one, and from then on it runs on a real clock instead of on
 * turns: see `tick` and src/duel/duel-hazard.js. It is the only thing in this
 * engine that can take a life while both duellists are standing still, which
 * is exactly what it is for.
 */

import { getAbility, getSpecial, pickWeighted, SPECIAL_TIMING } from '../game/world-abilities.js';
import { createHazard } from './duel-hazard.js';

/**
 * The three a duellist chooses, and two an ability can put them in.
 *
 * No agent ever RETURNS `ability` or `frozen` — they are what a round hands
 * back when somebody spent their turn casting or spent it standing still with
 * ice on them. They are here so the screen has one vocabulary for what a
 * fighter did, however it came about.
 */
export const MOVES = {
  RELOAD: 'reload',
  SHIELD: 'shield',
  SHOOT: 'shoot',
  ABILITY: 'ability',
  FROZEN: 'frozen',
};

/** Bullets a duellist can hold at once. */
export const MAX_BULLETS = 6;

/**
 * @param {object} config
 * @param {object} config.player   { lives, maxLives, bullets, hasVest, hasTotem,
 *                                  totemLives, immune, abilities }
 * @param {object} config.enemy    from src/game/enemies.js
 * @param {object} config.playerAgent
 * @param {object} config.enemyAgent
 * @param {object} [config.modifiers]
 * @param {(event: object) => void} [config.onEvent]
 * @param {() => number} [config.random] injectable RNG for tests
 */
export function createDuel(config) {
  const random = config.random || Math.random;
  const onEvent = config.onEvent || (() => {});
  const modifiers = config.modifiers || {};

  const sides = {
    player: {
      id: 'player',
      name: config.player.name || 'You',
      lives: config.player.lives,
      maxLives: config.player.maxLives,
      bullets: config.player.bullets || 0,
      hasVest: !!config.player.hasVest,
      /**
       * The totem, and the number of lives it hands back when it goes.
       *
       * The engine is told the number rather than working it out, for the same
       * reason it is told the vest rather than reading the bag: a duel does not
       * know what a Dusk Totem is, only that this fighter has one thing left
       * that stops a killing blow and what the fighter is standing on
       * afterwards. See `totemReviveLives` in src/game/progression.js.
       */
      hasTotem: !!config.player.hasTotem,
      totemLives: config.player.totemLives || 0,
      immune: !!config.player.immune,
      /** Every counter an ability can leave on them. See `blankStatus`. */
      status: null,
      pendingItem: null,
      agent: config.playerAgent,
    },
    enemy: {
      id: 'enemy',
      name: config.enemy.name,
      lives: config.enemy.lives,
      maxLives: config.enemy.maxLives,
      bullets: config.enemy.bullets || 0,
      hasVest: false,
      hasTotem: false,
      totemLives: 0,
      immune: false,
      status: null,
      abilities: config.enemy.abilities || [],
      abilityChanceMul: config.enemy.abilityChanceMul || 1,
      accuracy: config.enemy.accuracy ?? 0.5,
      agent: config.enemyAgent,
    },
  };

  sides.player.status = blankStatus();
  sides.enemy.status = blankStatus();

  let round = 0;
  let over = false;
  let ended = null;
  /** Set when an enemy ability damaged the player during the current round. */
  let abilityHitPlayer = false;
  /** Why the duel stopped, when it stopped somewhere other than a shot. */
  let terminationCause = null;

  /**
   * The world special this enemy is carrying, and the landmark it turns into
   * once it is spent.
   */
  let special = getSpecial(config.enemy.special);
  let specialUsed = false;

  /**
   * EVERY LANDMARK ON THE ROAD, WHOEVER RAISED IT
   * -------------------------------------------------------------------------
   * There can be two: the enemy's permanent one and the player's one-shot. So
   * a hazard is not a single field any more, it is an entry that knows who
   * owns it and who it falls on — `{ clock, owner, target }` — and `tick` does
   * not care which is which. That is the only change the player's special
   * needed on this side: the same clock, aimed the other way.
   */
  const hazards = [];

  /**
   * The player's charged abilities, one entry per equipped slot.
   *
   * `charge` counts rounds and nothing else — not damage taken, not shots
   * fired — because the one thing every duel has exactly one of per round is a
   * round. See the tuning tables in src/game/world-abilities.js.
   */
  const abilities = (config.player.abilities || []).map((spec) => ({
    spec,
    charge: 0,
    spent: false,
  }));
  /**
   * THE TURN RULE
   * -------------------------------------------------------------------------
   *   the ENEMY cast   → that IS its turn. No shot, no shield, no round loaded,
   *                      and it stands there open while it does it.
   *   the PLAYER cast  → the enemy's hand goes to its belt instead: it reloads
   *                      this round, whatever it had picked.
   *   the player       → is never restricted. Cast and still shoot, shield,
   *                      reload, or cast the other slot.
   *
   * THE TWO ARE TRACKED SEPARATELY, AND THE ENEMY'S WINS
   * -------------------------------------------------------------------------
   * They used to share one field, which had a quiet bug in it: a round in
   * which BOTH of them cast would have the player's write land last, the
   * enemy would be handed a reload instead of the turn it had actually spent,
   * and it would come out of its own cast a bullet richer. An enemy that cast
   * is casting, whatever the player also did.
   *
   * `playerCastPending` survives the gap between rounds on purpose. An ability
   * is a free action and its plate is live during the animation, so a charge
   * spent a beat early has to buy something — it lands on the next round that
   * resolves rather than being thrown away.
   */
  let playerCastPending = false;

  /** What agents are allowed to see. Both sides get the same shape. */
  function publicView(selfId) {
    const self = sides[selfId];
    const foe = sides[selfId === 'player' ? 'enemy' : 'player'];
    return {
      round,
      self: { lives: self.lives, bullets: self.bullets, status: { ...self.status } },
      foe: { lives: foe.lives, bullets: foe.bullets, status: { ...foe.status } },
      modifiers,
    };
  }

  function log(type, payload) {
    onEvent({ type, round, ...payload });
  }

  /** Apply damage, honouring shields unless the source ignores them. */
  function damage(sideId, amount, { ignoreShield = false, protectedNow = false, source = 'shot' } = {}) {
    const side = sides[sideId];
    if (!ignoreShield && protectedNow) return false;
    if (side.hasVest && side.lives - amount <= 0) {
      side.hasVest = false;
      log('vest', { side: sideId });
      return false;
    }
    /**
     * THE TOTEM, WHICH IS NOT A SECOND VEST
     * -----------------------------------------------------------------------
     * A vest eats the blow: the fight carries on as though it never landed,
     * and the lives are the lives you had. This one lets it land and then
     * refuses the consequence — the fighter goes down and comes back up on
     * `totemLives`, which can be MORE than they were standing on. So it is
     * checked second (a vest is the cheaper thing to spend and spends itself
     * first) and it does not report a hit either, because the screen has a
     * whole scene to play before the round is allowed to look normal again.
     */
    if (side.hasTotem && side.lives - amount <= 0) {
      side.hasTotem = false;
      side.lives = Math.max(1, side.totemLives || Math.ceil(side.maxLives / 2));
      log('totem', { side: sideId, lives: side.lives });
      return false;
    }
    side.lives = Math.max(0, side.lives - amount);
    log('damage', { side: sideId, amount, source, lives: side.lives });
    return true;
  }

  /**
   * The enemy's ability roll for this round, resolved before moves are locked
   * in — casting is now the enemy's whole turn, so the round has to know.
   *
   * `pickWeighted` is what keeps poison and dynamite rare in the hands that
   * have them: both carry a weight of about a third, so a bayou rider with
   * four tricks plays poison one time in ten rather than one in four.
   */
  function rollEnemyAbility() {
    const enemy = sides.enemy;
    if (!enemy.abilities || enemy.abilities.length === 0) return null;
    const chance = 0.18 * enemy.abilityChanceMul;
    if (random() >= chance) return null;
    return pickWeighted(enemy.abilities, random());
  }


  /**
   * WHAT AN ABILITY LEAVES ON A FIGHTER
   * ---------------------------------------------------------------------------
   * Ten of the fourteen mechanics do not take a life; they take a *turn*, or a
   * cylinder, or the use of a shield. All of that is counters on a side, ticked
   * down at the end of every round, and the round resolution below reads them.
   * Nothing here is special-cased per ability: an ability writes a number into
   * one of these and the rules do the rest, which is why adding the fifteenth
   * will not touch `playRound`.
   */
  function blankStatus() {
    return {
      /** Rounds of doing nothing at all. The turns belong to the other side. */
      frozen: 0,
      /** Rounds unable to shoot. Reloading and shielding still work. */
      jam: 0,
      /** Rounds in which a raised shield stops nothing. */
      panic: 0,
      /** Shots that will go wide. */
      blind: 0,
      /** Rounds taking one extra life off everything that lands. */
      mark: 0,
      /** Shots that will cost the other side one extra life. */
      doubleTap: 0,
      /** Incoming shots that go back at whoever fired them. */
      reflect: 0,
      /** Rounds of one life each, through anything. */
      venom: 0,
    };
  }

  /**
   * Effects that land on the CASTER rather than the rival. The diadem does not
   * touch these, and neither does anything else that asks "is the victim
   * immune" — there is no victim.
   */
  const SELF_EFFECTS = new Set(['doubleTap', 'reflect']);

  /**
   * Blast is queued rather than applied.
   *
   * It is the one effect a shield stops, and at the moment an ability is cast
   * nobody has committed to a move yet — so it waits for the shot phase and is
   * resolved there against what the victim actually did. That is the whole
   * design of the dynamite: the hardest thing in the game to be hit by, and the
   * easiest to be ready for.
   */
  let pendingBlasts = [];

  /**
   * Resolve one ability. The same function for both sides — `from` cast it,
   * `to` is wearing it — because there is no rule in here that knows or cares
   * which of them is the player.
   *
   * @returns {boolean} false when it was blocked outright
   */
  function applyAbility(id, from, to) {
    const a = getAbility(id);
    if (!a.effect) return false;
    const caster = sides[from];
    const victim = sides[to];
    const onSelf = SELF_EFFECTS.has(a.effect);

    if (!onSelf && victim.immune) {
      log('ability-blocked', { ability: id, side: to });
      return false;
    }

    switch (a.effect) {
      case 'steal': {
        const taken = Math.min(victim.bullets, a.amount || 1);
        victim.bullets -= taken;
        if (a.take) {
          caster.bullets = Math.min(MAX_BULLETS, caster.bullets + Math.min(taken, a.take));
        }
        break;
      }
      case 'empty': {
        const taken = victim.bullets;
        victim.bullets = 0;
        if (a.take) {
          caster.bullets = Math.min(MAX_BULLETS, caster.bullets + Math.min(taken, a.take));
        }
        break;
      }
      case 'swap': {
        const mine = caster.bullets;
        caster.bullets = victim.bullets;
        victim.bullets = mine;
        break;
      }
      case 'blast':
        // Waits for the shot phase — see `pendingBlasts` above.
        pendingBlasts.push({ from, to, amount: a.amount || 1, ability: id });
        break;
      case 'pierce':
        damage(to, a.amount || 1, { ignoreShield: true, source: 'ability' });
        break;
      case 'venom':
        victim.status.venom = Math.max(victim.status.venom, a.turns || 3);
        break;
      case 'drain': {
        const hit = damage(to, a.amount || 1, { ignoreShield: true, source: 'ability' });
        // Only what actually came off them goes on: a vest that ate the blow
        // leaves nothing to take.
        if (hit) caster.lives = Math.min(caster.maxLives, caster.lives + (a.amount || 1));
        break;
      }
      case 'freeze':
        victim.status.frozen = Math.max(victim.status.frozen, a.turns || 1);
        break;
      case 'jam':
        victim.status.jam = Math.max(victim.status.jam, a.turns || 1);
        break;
      case 'panic':
        victim.status.panic = Math.max(victim.status.panic, a.turns || 1);
        break;
      case 'blind':
        victim.status.blind = Math.max(victim.status.blind, a.turns || 1);
        break;
      case 'mark':
        victim.status.mark = Math.max(victim.status.mark, a.turns || 1);
        break;
      case 'doubleTap':
        caster.status.doubleTap = Math.max(caster.status.doubleTap, a.turns || 1);
        break;
      case 'reflect':
        caster.status.reflect = Math.max(caster.status.reflect, a.turns || 1);
        break;
      default:
        return false;
    }

    log('ability', { ability: id, effect: a.effect, side: from, target: onSelf ? from : to });
    return true;
  }

  /**
   * End of round: everything measured in ROUNDS comes down by one.
   *
   * Three of the counters are deliberately not here. `frozen` is spent by the
   * round it costs (see `normalise`), and `blind`, `doubleTap` and `reflect`
   * are counted in SHOTS rather than rounds — a blind that expired while the
   * player was reloading would be no blind at all.
   */
  function tickStatus(sideId) {
    const st = sides[sideId].status;
    for (const key of ['jam', 'panic', 'mark']) {
      if (st[key] > 0) st[key] -= 1;
    }
    // Venom bites every round it is on, then counts down — so three rounds of
    // it is three lives, which is what it says on the tin.
    if (st.venom > 0) {
      st.venom -= 1;
      damage(sideId, 1, { ignoreShield: true, source: 'venom' });
    }
  }



  // --- the world special ----------------------------------------------------

  /**
   * Ask whether the enemy spends its special now.
   *
   * The SCREEN calls this between rounds rather than the engine calling it
   * inside one, and that is deliberate: raising a volcano is an event the
   * player is owed a look at, and there is nowhere inside `playRound` to put
   * two seconds of camera without either interrupting a draw or arriving after
   * the round it changed. The decision is still the engine's — the roll, the
   * timing policy and the once-per-duel rule all live here.
   *
   * @returns {object|null} the spec that was cast, for the screen to announce
   */
  function maybeCastSpecial() {
    if (over || enemyHazard() || specialUsed || !special) return null;
    const chance = round < SPECIAL_TIMING.earlyRounds
      ? SPECIAL_TIMING.earlyChance
      : SPECIAL_TIMING.lateChance;
    if (random() >= chance) return null;
    specialUsed = true;
    raiseHazard(special, 'enemy');
    log('special', { special: special.id, spec: special, owner: 'enemy' });
    return special;
  }

  /** Put a landmark on the road. `owner` raised it; it falls on the other one. */
  function raiseHazard(spec, owner) {
    const entry = {
      clock: createHazard(spec, random),
      spec,
      owner,
      target: owner === 'enemy' ? 'player' : 'enemy',
    };
    hazards.push(entry);
    return entry;
  }

  const enemyHazard = () => hazards.find((h) => h.owner === 'enemy') || null;

  /** One strike out of an eruption: it is not a shot, so no shield stops it. */
  function applyHazardStrike(entry, ev) {
    const victim = sides[entry.target];
    const hit = damage(entry.target, ev.damage, { ignoreShield: true, source: 'hazard' });
    if (ev.steal && victim.bullets > 0) {
      victim.bullets = Math.max(0, victim.bullets - ev.steal);
    }
    /**
     * The diadem is not in this. It blocks things aimed AT you — a hex, a
     * whisper, a hand in your belt — and what is falling out of the sky was
     * not aimed at anybody. The vest still works, because the vest is a
     * physical object and `damage` honours it for free.
     */
    if (ev.poisons) victim.status.venom = Math.max(victim.status.venom, 2);
    log('hazard-strike', {
      special: entry.spec.id,
      owner: entry.owner,
      side: entry.target,
      damage: ev.damage,
      hit,
      steal: ev.steal || 0,
      lives: victim.lives,
    });
    if (checkEnd()) terminationCause = entry.owner === 'enemy' ? 'hazard' : 'ability';
  }

  /**
   * Advance the real-time half of the duel. The screen calls this once per
   * frame with the frame's own `dt`; with nothing raised it costs one branch.
   */
  function tick(dt) {
    if (over || hazards.length === 0) return;
    for (let i = hazards.length - 1; i >= 0; i--) {
      const entry = hazards[i];
      for (const ev of entry.clock.tick(dt)) {
        if (ev.type === 'strike') applyHazardStrike(entry, ev);
        else log(`hazard-${ev.type}`, { special: entry.spec.id, owner: entry.owner });
        if (over) return;
      }
      // A one-shot is done the moment it goes quiet: the mountain the player
      // called down is not part of the road, it was a favour.
      if (entry.clock.isSpent()) hazards.splice(i, 1);
    }
  }

  // --- the player's charged abilities ---------------------------------------

  /**
   * Spend a charged ability on the enemy.
   *
   * Like a thrown item, this is a FREE ACTION: it does not cost the player
   * their move, and it can be pressed while the engine is still waiting for
   * one. That is the whole shape of the feature — an ability is not a fourth
   * move competing with reload, shield and shoot, it is a thing you do *as
   * well as* one of them, which is what makes the timing interesting rather
   * than just expensive.
   *
   * @param {string} itemId the equipped item's id
   * @returns {{ok: boolean, reason?: string, spec?: object}}
   */
  function useAbility(itemId) {
    if (over) return { ok: false, reason: 'The fight is over.' };
    const slot = abilities.find((a) => a.spec.itemId === itemId);
    if (!slot) return { ok: false, reason: 'Not in hand.' };
    if (slot.spent) return { ok: false, reason: 'Already spent this duel.' };
    if (slot.charge < slot.spec.charge) return { ok: false, reason: 'Still charging.' };

    const spec = slot.spec;
    slot.charge = 0;
    if (spec.kind === 'special') {
      // Once per duel, like the enemy's — and for the same reason: a landmark
      // that can be called twice is not a landmark, it is a weapon.
      slot.spent = true;
      raiseHazard({ ...spec, id: spec.id }, 'player');
      log('player-special', { special: spec.id, spec, owner: 'player' });
      return { ok: true, spec };
    }

    applyAbility(spec.id, 'player', 'enemy');
    playerCastPending = true;
    log('player-ability', { ability: spec.id, spec, side: 'enemy' });
    checkEnd();
    return { ok: true, spec };
  }


  /** Charge state for the screen's meters. */
  function getAbilityState() {
    return abilities.map((a) => ({
      itemId: a.spec.itemId,
      spec: a.spec,
      charge: Math.min(a.charge, a.spec.charge),
      cost: a.spec.charge,
      ready: !a.spent && a.charge >= a.spec.charge,
      spent: a.spent,
    }));
  }

  /**
   * What a fighter actually does, once the ice and the rope have had their say.
   *
   * The freeze is spent HERE rather than in `tickStatus`, because it is counted
   * in turns taken away and this is the only place that knows a turn was taken
   * away. Everything else measured in rounds ticks at the end of one.
   */
  function normalise(side, move) {
    if (side.status.frozen > 0) {
      side.status.frozen -= 1;
      log('frozen', { side: side.id, left: side.status.frozen });
      return { move: MOVES.FROZEN, dry: false, jammed: false };
    }
    if (move === MOVES.SHOOT && side.status.jam > 0) {
      log('jammed', { side: side.id });
      return { move: MOVES.SHOOT, dry: true, jammed: true };
    }
    if (move === MOVES.SHOOT && side.bullets <= 0) {
      log('dryfire', { side: side.id });
      return { move: MOVES.SHOOT, dry: true, jammed: false };
    }
    return { move, dry: false, jammed: false };
  }

  function checkEnd() {
    if (sides.player.lives <= 0 || sides.enemy.lives <= 0) {
      over = true;
      const playerDead = sides.player.lives <= 0;
      const enemyDead = sides.enemy.lives <= 0;
      // Simultaneous knockout: the challenger (player) loses the tie, exactly
      // as in every previous version of the game.
      ended = { winner: playerDead ? 'enemy' : enemyDead ? 'player' : null, rounds: round };
    }
    return over;
  }

  /**
   * Every resolution the engine hands back has the same shape, including the
   * ones where the round ended early (an ability or a thrown item finished the
   * duel before moves could resolve). The UI reads these fields unconditionally,
   * so a partial object would crash the animation.
   */
  function makeResolution(extra = {}) {
    return {
      round,
      ability: null,
      playerMove: null,
      enemyMove: null,
      playerDry: false,
      enemyDry: false,
      playerMisfired: false,
      enemyMisfired: false,
      playerFires: false,
      enemyFires: false,
      hits: { player: false, enemy: false },
      lives: { player: sides.player.lives, enemy: sides.enemy.lives },
      bullets: { player: sides.player.bullets, enemy: sides.enemy.bullets },
      ended,
      /** Set when the round did not play out normally. */
      terminatedBy: null,
      ...extra,
    };
  }

  /** Play one full round. Returns the resolution for the UI to animate. */
  async function playRound() {
    if (over) return null;
    round += 1;

    const ability = rollEnemyAbility();
    abilityHitPlayer = false;

    const [rawPlayerMove, chosenEnemyMove] = await Promise.all([
      sides.player.agent.chooseMove(publicView('player')),
      sides.enemy.agent.chooseMove(publicView('enemy')),
    ]);

    /**
     * THE FIGHT CAN BE OVER BEFORE THIS ROUND STARTS
     * -----------------------------------------------------------------------
     * A charged ability or an erupting mountain can finish somebody while the
     * engine is still waiting for a move — so the FIRST thing after the await
     * is to ask whether there is still a duel, before the enemy's rolled
     * ability gets to go off.
     *
     * It has to be in that order. The other way round, a player who spent
     * Meteor Strike on the enemy's last life could still be killed by an
     * ability the corpse had rolled at the top of the round: `ended` already
     * said `player`, so the run carried on with a winner on zero lives.
     */
    if (over || checkEnd()) {
      const resolution = makeResolution({
        terminatedBy: terminationCause || 'item',
        hits: { player: abilityHitPlayer, enemy: false },
      });
      log('round', resolution);
      return resolution;
    }

    // Now the enemy's, which lands before either of them draws — so a freeze or
    // a stolen cylinder is already in force when the round resolves.
    if (ability) applyAbility(ability, 'enemy', 'player');
    if (checkEnd()) {
      const resolution = makeResolution({
        ability,
        terminatedBy: 'ability',
        hits: { player: abilityHitPlayer, enemy: false },
      });
      log('round', resolution);
      return resolution;
    }

    /**
     * THE TURN RULE, APPLIED. See the note on `playerCastPending`.
     *
     * The enemy's own cast takes precedence over the reload its rival's cast
     * would have forced: it is already busy.
     */
    const playerCast = playerCastPending;
    playerCastPending = false;
    const enemyMove = ability
      ? MOVES.ABILITY
      : playerCast
        ? MOVES.RELOAD
        : chosenEnemyMove;
    const caster = ability ? 'enemy' : playerCast ? 'player' : null;

    const p = normalise(sides.player, rawPlayerMove);
    const e = normalise(sides.enemy, enemyMove);

    // --- resolve bullets ---------------------------------------------------
    if (p.move === MOVES.RELOAD) sides.player.bullets = Math.min(MAX_BULLETS, sides.player.bullets + 1);
    if (e.move === MOVES.RELOAD) sides.enemy.bullets = Math.min(MAX_BULLETS, sides.enemy.bullets + 1);
    if (p.move === MOVES.SHOOT && !p.dry) sides.player.bullets -= 1;
    if (e.move === MOVES.SHOOT && !e.dry) sides.enemy.bullets -= 1;

    // --- misfires (rain) ---------------------------------------------------
    const misfire = modifiers.misfireChance || 0;
    const playerMisfired = p.move === MOVES.SHOOT && !p.dry && random() < misfire;
    const enemyMisfired = e.move === MOVES.SHOOT && !e.dry && random() < misfire;
    if (playerMisfired) log('misfire', { side: 'player' });
    if (enemyMisfired) log('misfire', { side: 'enemy' });

    /**
     * A shot leaves the barrel and then has to survive three questions:
     * was the shooter blinded, is the target behind a shield that still works,
     * and is the target wearing a mirror. `spendBlind` is called for every shot
     * that is actually fired, so being blind costs you shots rather than rounds.
     */
    const spendBlind = (sideId) => {
      const st = sides[sideId].status;
      if (st.blind <= 0) return false;
      st.blind -= 1;
      log('blinded', { side: sideId });
      return true;
    };

    const playerFires = p.move === MOVES.SHOOT && !p.dry && !playerMisfired;
    const enemyFires = e.move === MOVES.SHOOT && !e.dry && !enemyMisfired;
    const playerWide = playerFires && spendBlind('player');
    const enemyWide = enemyFires && spendBlind('enemy');

    // A shield that has been panicked is a shield that is not there.
    const shielded = (sideId, move) =>
      move === MOVES.SHIELD && sides[sideId].status.panic <= 0;
    const playerProtected = shielded('player', p.move);
    const enemyProtected = shielded('enemy', e.move);

    const hits = { player: false, enemy: false };
    const bounced = { player: false, enemy: false };
    if (playerFires && !playerWide) {
      const shot = landShot('player', 'enemy', enemyProtected);
      hits.enemy = shot.hit;
      if (shot.bounced) { hits.player = hits.player || shot.bouncedHit; bounced.player = true; }
    }
    if (enemyFires && !enemyWide) {
      const shot = landShot('enemy', 'player', playerProtected);
      hits.player = hits.player || shot.hit;
      if (shot.bounced) { hits.enemy = hits.enemy || shot.bouncedHit; bounced.enemy = true; }
    }

    // --- the dynamite, resolved against what they actually did --------------
    for (const blast of pendingBlasts) {
      const guarded = blast.to === 'player' ? playerProtected : enemyProtected;
      const stopped = !damage(blast.to, blast.amount, {
        protectedNow: guarded,
        source: 'blast',
      });
      log('blast', { ability: blast.ability, side: blast.to, stopped, guarded });
      if (!stopped) hits[blast.to] = true;
    }
    pendingBlasts = [];

    // --- venom, and every counter an ability left behind --------------------
    tickStatus('player');
    tickStatus('enemy');

    // A round has been fought, so everything in the player's hands is a round
    // closer to being worth using.
    for (const slot of abilities) {
      if (!slot.spent) slot.charge = Math.min(slot.spec.charge, slot.charge + 1);
    }

    checkEnd();

    const resolution = {
      round,
      ability,
      abilityBy: caster,
      playerMove: p.move,
      enemyMove: e.move,
      playerDry: p.dry,
      enemyDry: e.dry,
      playerJammed: p.jammed,
      enemyJammed: e.jammed,
      playerFrozen: p.move === MOVES.FROZEN,
      enemyFrozen: e.move === MOVES.FROZEN,
      playerWide,
      enemyWide,
      playerMisfired,
      enemyMisfired,
      playerFires: playerFires && !playerWide,
      enemyFires: enemyFires && !enemyWide,
      hits,
      bounced,
      status: { player: { ...sides.player.status }, enemy: { ...sides.enemy.status } },
      lives: { player: sides.player.lives, enemy: sides.enemy.lives },
      bullets: { player: sides.player.bullets, enemy: sides.enemy.bullets },
      ended,
    };
    log('round', resolution);
    return resolution;
  }

  /**
   * One shot arriving.
   *
   * Everything that modifies a bullet meets here: the mirror that sends it
   * back, the mark that makes it cost more, and the whisper that made it
   * heavier on the way out. It is one function because the alternative is the
   * same four conditions written twice, once per side, which is how the two
   * halves of a duel quietly stop agreeing.
   */
  function landShot(fromId, toId, targetProtected) {
    const shooter = sides[fromId];
    const target = sides[toId];

    // The mirror first: a reflected round never reaches the man it was aimed
    // at, so nothing else about him — his shield, his mark — is consulted.
    if (target.status.reflect > 0) {
      target.status.reflect -= 1;
      log('reflect', { side: toId, back: fromId });
      const back = 1 + (shooter.status.mark > 0 ? 1 : 0);
      const bouncedHit = damage(fromId, back, { ignoreShield: true, source: 'reflect' });
      return { hit: false, bounced: true, bouncedHit };
    }

    let amount = 1;
    if (shooter.status.doubleTap > 0) {
      shooter.status.doubleTap -= 1;
      amount += 1;
      log('doubleTap', { side: fromId });
    }
    if (target.status.mark > 0) amount += 1;

    const hit = damage(toId, amount, { protectedNow: targetProtected, source: 'shot' });
    return { hit, bounced: false, bouncedHit: false, amount };
  }

  /**
   * Swap the enemy in without ending the duel — used for the Galaxy boss's
   * second phase. The player's bullets and lives carry over.
   *
   * Pass `agent` to install a controller built for the new stats: without it
   * the incoming phase would keep playing with the previous phase's accuracy
   * and move history.
   */
  function setEnemy(next, agent) {
    Object.assign(sides.enemy, {
      name: next.name,
      lives: next.lives,
      maxLives: next.maxLives,
      bullets: next.bullets || 0,
      accuracy: next.accuracy,
      abilities: next.abilities || [],
      abilityChanceMul: next.abilityChanceMul || 1,
      // A new phase is a new fighter: it does not inherit the ice, the mark or
      // the mirror the last one was wearing when it went down.
      status: blankStatus(),
      agent: agent || sides.enemy.agent,
    });
    // A phase that never spent its special can still spend it. One that is
    // already up stays up: the point of a landmark is that it does not care
    // whose fight it is any more.
    special = getSpecial(next.special) || special;
    over = false;
    ended = null;
    terminationCause = null;
    log('phase', { name: next.name, lives: next.lives });
  }

  return {
    playRound,
    setEnemy,
    maybeCastSpecial,
    useAbility,
    getAbilityState,
    tick,
    getSides: () => sides,
    getRound: () => round,
    isOver: () => over,
    getResult: () => ended,
    /** Every landmark currently on the road, with the side that raised it. */
    getHazards: () => hazards,
    /** The enemy's landmark, or null — the one the countdown chip is about. */
    getHazard: () => enemyHazard()?.clock || null,
    /** The special this enemy is carrying, spent or not — the card shows it. */
    getSpecialSpec: () => special,
    MOVES,
  };
}
