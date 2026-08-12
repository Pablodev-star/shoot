/**
 * SHOOT! — the balance harness.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Every number in this game lives in a data file, which makes it easy to
 * change and impossible to check. The last round of tuning was done by reading
 * the tables and it produced, among other things, a volcano that erupted in 0%
 * of measured fights, a "shoot every round and never think" policy that beat
 * proper play by nine points, and a full run that no simulated player ever
 * finished. None of that is visible in a diff. All of it is visible here.
 *
 * The harness imports the REAL modules — the duel engine, the AI, the road
 * generator, the progression curves — and reimplements nothing. If it says a
 * duel goes a certain way, that is the way the shipped game plays it. What it
 * substitutes is the person: three synthetic players, from someone mashing one
 * button to someone spending their gold correctly.
 *
 * WHAT TO RUN
 * ---------------------------------------------------------------------------
 *   node tools/sim.mjs duels     win rates per world, per skill, per gun rung
 *   node tools/sim.mjs bosses    the same for the six bosses
 *   node tools/sim.mjs specials  how often a world's landmark actually erupts
 *   node tools/sim.mjs runs      full runs, permadeath on — the headline number
 *   node tools/sim.mjs all       everything (this is what CI runs)
 *
 *   RUNS=600 node tools/sim.mjs runs      more samples, slower
 *   ROUND_MS=6000 node tools/sim.mjs all  model a slower player at the keys
 *
 * WHAT THE NUMBERS ARE SUPPOSED TO BE
 * ---------------------------------------------------------------------------
 * The design target is a skill ladder, not a difficulty. Measured over three
 * hundred runs a skill level, the road as it stands sends
 *
 *   about one novice run in ten to the Galaxy
 *   about three average runs in ten
 *   about six expert runs in ten
 *
 * — and what separates them is almost entirely the ledger rather than the
 * trigger finger. `all` prints those three against their bands and exits
 * non-zero if any has drifted out, which is what makes this a test and not a
 * report. The bands are wide on purpose: they are there to catch a change that
 * moved the game by a third, not to freeze it.
 */

import { createDuel, MOVES } from '../src/duel/duel-engine.js';
import { createAiAgent } from '../src/duel/duel-ai.js';
import { WORLDS, getWorld, FINAL_WORLD } from '../src/game/worlds.js';
import { generateSegment, revealToHorizon, roadReading } from '../src/explore/encounters.js';
import { makeRng } from '../src/core/rng.js';
import { STOCK_DEPTH } from '../src/shops/shop.js';
import * as P from '../src/game/progression.js';

/**
 * How long a round of a duel takes in the real game, animation plus a couple
 * of seconds of somebody deciding. It only matters because the landmarks run
 * on a real clock — everything else in this game waits for the player.
 */
const ROUND_MS = Number(process.env.ROUND_MS || 3800);
const RUNS = Number(process.env.RUNS || 400);
const DUELS = Number(process.env.DUELS || 400);

// ---------------------------------------------------------------------------
// The three people at the keyboard
// ---------------------------------------------------------------------------

/**
 * A policy is `(view, rng, memory) => move`. `memory` is the policy's own
 * scratch object, which is how the expert avoids repeating itself — the one
 * thing the opponent is now allowed to punish (see STREAK_TRIGGER in
 * src/duel/duel-ai.js).
 */
export const POLICIES = {
  /**
   * Reload when empty, shoot otherwise, think about nothing. This is what a
   * first-time player does for their first world, and against an opponent that
   * cannot punish a pattern it used to be the strongest policy in the game.
   */
  novice: (view) => (view.self.bullets <= 0 ? MOVES.RELOAD : MOVES.SHOOT),

  /** Aggressive but not blind: mostly shoots, breaks the pattern by accident. */
  average: (view, rng) => {
    if (view.self.bullets <= 0) return MOVES.RELOAD;
    const r = rng();
    if (r < 0.66) return MOVES.SHOOT;
    if (r < 0.86) return MOVES.RELOAD;
    return MOVES.SHIELD;
  },

  /**
   * Somebody who has understood the fight.
   *
   * THE SKILL IN THIS GAME IS READING THE OTHER CYLINDER
   * -------------------------------------------------------------------------
   * It is the one piece of information the duel screen hands over for free and
   * the one the first two policies throw away: the rival's chambers are drawn
   * on their card, six holes with rounds in some of them, and an empty gun
   * cannot shoot you. So a shield raised against an empty rival is a turn
   * given away, and a reload in front of a full one is a life.
   *
   * That is the whole of it, and it is symmetrical — the agent decides off its
   * own cylinder in exactly the same way (see `fallback` in
   * src/duel/duel-ai.js), so a player who watches it is not exploiting a bug,
   * they are reading an opponent who is telling them the truth.
   *
   * On top of that: never repeat a move three times running, because the agent
   * answers a streak; and never pass up a finisher.
   */
  expert: (view, rng, memory) => {
    const forced = (memory.streak || 0) >= 2 ? memory.last : null;
    const loaded = view.foe.bullets;
    /** How likely they are to fire at all this round, from their own gun. */
    const threat = loaded <= 0 ? 0 : loaded >= 3 ? 0.82 : 0.62;

    const pick = () => {
      // Their last life and a round in hand: take it, whatever they are doing.
      if (view.foe.lives <= view.self.gunDamage && view.self.bullets > 0) return MOVES.SHOOT;

      // An empty rival is a free turn. Never spend it hiding.
      if (threat === 0) return view.self.bullets > 0 ? MOVES.SHOOT : MOVES.RELOAD;

      // A hit would end the run: pay a turn to not be hit.
      if (view.self.lives <= view.foe.gunDamage) {
        return rng() < threat ? MOVES.SHIELD : MOVES.SHOOT;
      }

      // TEMPO IS DEFENCE, BECAUSE THE MOUNTAIN IS ON A CLOCK
      // ---------------------------------------------------------------------
      // The obvious way to take less damage is to shield more, and it is
      // wrong: a shield buys one round back and costs one round, and a fight
      // dragged out four rounds longer walks into another eruption — which
      // nothing blocks. So a good player hides only when a hit would finish
      // them and spends every other turn ending the fight.
      if (view.self.bullets <= 0) {
        return rng() < threat * 0.18 ? MOVES.SHIELD : MOVES.RELOAD;
      }

      const r = rng();
      if (r < 0.8) return MOVES.SHOOT;
      if (r < 0.94) return MOVES.RELOAD;
      return MOVES.SHIELD;
    };

    let move = pick();
    let guard = 6;
    while (move === forced && guard-- > 0) move = pick();
    if (move === forced) move = forced === MOVES.SHOOT ? MOVES.RELOAD : MOVES.SHOOT;
    if (move === MOVES.SHOOT && view.self.bullets <= 0) move = MOVES.RELOAD;
    return move;
  },
};

/**
 * What each of the three does with their gold.
 *
 * THIS IS WHERE THE SKILL IS
 * ---------------------------------------------------------------------------
 * The duel itself is a three-way guess with a tell in it, and a tell is worth
 * about a fifth of the damage you take — real, but not the difference between
 * finishing a run and dying in the flats. What decides a run is the ledger:
 * whether the gold went on the thing that was about to kill you.
 *
 * `reserve` is the whole model of that. It is what a player refuses to spend
 * the gun's money down past — the bed and the bandages they know they will
 * need before the next counter. Somebody who keeps no reserve buys a beautiful
 * revolver and starves behind it.
 */
const SPENDING = {
  /**
   * Buys the shiniest affordable thing the moment it is affordable, keeps
   * nothing back, eats when reminded, and walks into fights on whatever lives
   * happen to be left.
   */
  novice: {
    /** Spends down to nothing on the shiny thing, every time. */
    reserve: () => 0,
    /** Eats when the gauge warns them, which is later than it should be. */
    foodTarget: 80,
    /** Buys a couple of bandages because they are cheap, then forgets. */
    healBudget: 0.25,
    /** Only when the next hit would be the last one — never as maintenance. */
    healBeforeFight: 'panic',
    /** Takes the good bed only once the bar is visibly nearly gone. */
    premiumAt: 0.6,
  },
  /** Keeps a bed's worth back and remembers to patch up. */
  average: {
    reserve: (worldId) => P.innBasicPrice(worldId),
    foodTarget: 110,
    healBudget: 0.4,
    healBeforeFight: true,
    premiumAt: 0.5,
  },
  /**
   * Knows what a life costs and buys it before it is needed: food first,
   * because starving is the one thing on the road that cannot be fought, then
   * enough bandages to cross to the next counter, and only then the gun —
   * never spending down past the price of a night's sleep.
   */
  expert: {
    reserve: (worldId) => P.innBasicPrice(worldId) + 2 * P.itemPrice({ basePrice: 40 }, worldId),
    foodTarget: 160,
    healBudget: 0.6,
    healBeforeFight: true,
    premiumAt: 0.3,
  },
};

// ---------------------------------------------------------------------------
// Fighting
// ---------------------------------------------------------------------------

function rollEnemy(worldId, rng) {
  const p = getWorld(worldId).enemy;
  const lives = Number(rng.weighted(p.lives));
  const abilities = [];
  if (rng.chance(p.abilityChance)) abilities.push(rng.pick(p.abilities));
  if (worldId >= 4 && rng.chance(p.abilityChance * 0.5)) {
    const extra = rng.pick(p.abilities);
    if (!abilities.includes(extra)) abilities.push(extra);
  }
  return {
    name: 'rider',
    lives,
    maxLives: lives,
    bullets: 0,
    accuracy: p.accuracy,
    gunDamage: P.enemyGunDamage(worldId),
    abilities,
    special: rng.chance(p.specialChance || 0) ? p.special : null,
    isBoss: false,
  };
}

function bossPhase(worldId, index = 0) {
  const b = getWorld(worldId).boss;
  const ph = b.phases ? b.phases[index] : b;
  if (!ph) return null;
  return {
    name: ph.name || b.name,
    lives: ph.lives,
    maxLives: ph.lives,
    bullets: ph.startBullets || 0,
    accuracy: ph.accuracy ?? b.accuracy,
    gunDamage: P.enemyGunDamage(worldId),
    abilities: ph.abilities || b.abilities,
    abilityChanceMul: ph.abilityChanceMul || 1,
    special: ph.special || b.special,
    isBoss: true,
  };
}

/**
 * One duel, played out by the real engine.
 * @returns {{won:boolean, rounds:number, livesLeft:number, hazardStrikes:number,
 *            hazardRaised:boolean, shotsFired:number, shotsBlocked:number}}
 */
export async function fight({ enemy, player, policy, seed }) {
  const rng = makeRng(seed >>> 0);
  const ai = createAiAgent(enemy, {}, { random: rng });
  const memory = {};
  let last = null;
  const agent = {
    isLocal: false,
    async chooseMove(view) {
      const move = POLICIES[policy](view, rng, memory);
      memory.streak = move === memory.last ? (memory.streak || 1) + 1 : 1;
      memory.last = move;
      last = move;
      return move;
    },
  };

  const stats = { hazardStrikes: 0, hazardRaised: false, shotsFired: 0, shotsBlocked: 0 };
  const duel = createDuel({
    player,
    enemy,
    playerAgent: agent,
    enemyAgent: ai,
    random: rng,
    onEvent: (e) => {
      if (e.type === 'special') stats.hazardRaised = true;
      if (e.type === 'hazard-strike' && e.side === 'player') stats.hazardStrikes += 1;
      if (e.type === 'round' && e.playerFires) {
        stats.shotsFired += 1;
        if (e.enemyMove === MOVES.SHIELD && !e.hits.enemy) stats.shotsBlocked += 1;
      }
    },
  });

  let rounds = 0;
  while (!duel.isOver() && rounds < 80) {
    duel.tick(ROUND_MS);
    if (duel.isOver()) break;
    duel.maybeCastSpecial();
    // Anything charged gets spent — nobody sits on a full plate.
    for (const slot of duel.getAbilityState()) if (slot.ready) duel.useAbility(slot.itemId);
    if (duel.isOver()) break;
    await duel.playRound();
    ai.observe(last);
    rounds += 1;
  }

  return {
    won: duel.getResult()?.winner === 'player',
    rounds,
    livesLeft: duel.getSides().player.lives,
    ...stats,
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const pct = (n, d) => +(100 * n / Math.max(1, d)).toFixed(1);

/** Where the economy model says a player stands when they reach each world. */
function powerCurve() {
  const rows = [];
  let gold = 0, exp = 0, level = 1, lives = P.STARTING_LIVES, gun = 0, spent = 0;
  for (const w of WORLDS) {
    const dist = w.enemy.lives;
    const avg = Object.entries(dist).reduce((s, [k, v]) => s + Number(k) * v, 0) /
      Object.values(dist).reduce((s, v) => s + v, 0);
    rows.push({ world: w.id, name: w.name, level, maxLives: lives, gun, gunDmg: P.gunDamageAt(gun) });
    gold += w.encounters.duels * P.goldForEnemy({ worldId: w.id, lives: avg }) +
      P.goldForEnemy({ worldId: w.id, lives: w.boss.lives, isBoss: true });
    exp += w.encounters.duels * P.expForEnemy({ worldId: w.id, lives: avg }) +
      P.expForEnemy({ worldId: w.id, lives: w.boss.lives, isBoss: true });
    while (exp >= P.expForNextLevel(level)) { exp -= P.expForNextLevel(level); level += 1; lives += P.LIVES_PER_LEVEL; }
    let budget = gold * 0.5 - spent;
    while (gun < P.GUN_MAX_LEVEL && P.gunUpgradeCost(gun) <= budget) {
      budget -= P.gunUpgradeCost(gun); spent += P.gunUpgradeCost(gun); gun += 1;
    }
  }
  return rows;
}

async function reportDuels() {
  const power = powerCurve();
  const out = [];
  for (const w of WORLDS) {
    const at = power[w.id - 1];
    for (const policy of ['novice', 'average', 'expert']) {
      let wins = 0, rounds = 0, lost = 0, fired = 0, blocked = 0;
      for (let i = 0; i < DUELS; i++) {
        const enemy = rollEnemy(w.id, makeRng(w.id * 1013 + i));
        const r = await fight({
          enemy,
          player: {
            lives: at.maxLives, maxLives: at.maxLives, bullets: 0,
            gunDamage: P.gunDamageAt(at.gun),
          },
          policy,
          seed: w.id * 7919 + i,
        });
        if (r.won) wins += 1;
        rounds += r.rounds;
        lost += at.maxLives - r.livesLeft;
        fired += r.shotsFired;
        blocked += r.shotsBlocked;
      }
      out.push({
        world: w.id, name: w.name, policy,
        lives: at.maxLives, gun: at.gun, dmg: P.gunDamageAt(at.gun),
        win: pct(wins, DUELS),
        rounds: +(rounds / DUELS).toFixed(1),
        livesLost: +(lost / DUELS).toFixed(2),
        /**
         * The number that decides runs. A win rate of 99% means nothing if
         * every win costs a third of the bar and the world holds two beds —
         * what ends a run is nine duels, not one.
         */
        barPct: pct(lost / DUELS, at.maxLives),
        blockedPct: pct(blocked, fired),
      });
    }
  }
  console.log('\n=== REGULAR DUELS ===');
  console.table(out);
  return out;
}

async function reportBosses() {
  const power = powerCurve();
  const out = [];
  for (const w of WORLDS) {
    const at = power[w.id - 1];
    // The boss is fought after the world's duels, so a rung further on.
    const gun = Math.min(P.GUN_MAX_LEVEL, at.gun + 1);
    for (const policy of ['novice', 'average', 'expert']) {
      let wins = 0, rounds = 0, erupted = 0, strikes = 0;
      for (let i = 0; i < DUELS; i++) {
        const r = await fight({
          enemy: bossPhase(w.id),
          player: {
            lives: at.maxLives, maxLives: at.maxLives, bullets: 0,
            gunDamage: P.gunDamageAt(gun),
          },
          policy,
          seed: w.id * 104729 + i,
        });
        if (r.won) wins += 1;
        rounds += r.rounds;
        if (r.hazardStrikes > 0) erupted += 1;
        strikes += r.hazardStrikes;
      }
      out.push({
        world: w.id, boss: getWorld(w.id).boss.name, policy,
        bossLives: bossPhase(w.id).lives, dmg: P.gunDamageAt(gun),
        win: pct(wins, DUELS),
        rounds: +(rounds / DUELS).toFixed(1),
        eruptedPct: pct(erupted, DUELS),
        strikesTaken: +(strikes / DUELS).toFixed(2),
      });
    }
  }
  console.log('\n=== BOSSES (phase 1) ===');
  console.table(out);
  return out;
}

async function reportSpecials() {
  const power = powerCurve();
  const out = [];
  for (const w of WORLDS) {
    const at = power[w.id - 1];
    let raised = 0, erupted = 0, strikes = 0, rounds = 0;
    for (let i = 0; i < DUELS; i++) {
      const r = await fight({
        enemy: bossPhase(w.id),
        player: {
          lives: at.maxLives, maxLives: at.maxLives, bullets: 0,
          gunDamage: P.gunDamageAt(at.gun),
        },
        policy: 'average',
        seed: w.id * 911 + i,
      });
      if (r.hazardRaised) raised += 1;
      if (r.hazardStrikes > 0) erupted += 1;
      strikes += r.hazardStrikes;
      rounds += r.rounds;
    }
    out.push({
      world: w.id, special: w.enemy.special,
      raisedPct: pct(raised, DUELS),
      eruptedPct: pct(erupted, DUELS),
      strikesPerDuel: +(strikes / DUELS).toFixed(2),
      duelSeconds: +((rounds / DUELS) * ROUND_MS / 1000).toFixed(0),
    });
  }
  console.log('\n=== WORLD SPECIALS (on a boss, which always carries one) ===');
  console.table(out);
  return out;
}

// ---------------------------------------------------------------------------
// Full runs
// ---------------------------------------------------------------------------

async function runOnce(seed, policy) {
  const rng = makeRng(seed >>> 0);
  const buy = SPENDING[policy];
  const player = {
    level: 1, exp: 0, gold: 60, gun: 0,
    maxLives: P.STARTING_LIVES, lives: P.STARTING_LIVES,
    hunger: P.HUNGER_MAX, food: 44, heals: 1, healSize: 2,
  };

  const levelUp = () => {
    while (player.exp >= P.expForNextLevel(player.level)) {
      player.exp -= P.expForNextLevel(player.level);
      player.level += 1;
      player.maxLives += P.LIVES_PER_LEVEL;
      player.lives += P.LIVES_PER_LEVEL;
    }
  };
  const reading = (worldId) => roadReading({
    lives: player.lives, maxLives: player.maxLives,
    hunger: player.hunger, hungerMax: P.HUNGER_MAX,
    gold: player.gold, bedPrice: P.innPremiumPrice(worldId),
    gunCost: player.gun >= P.GUN_MAX_LEVEL ? Infinity : P.gunUpgradeCost(player.gun),
    hasFood: player.food > 0,
  });

  for (let worldId = 1; worldId <= FINAL_WORLD; worldId++) {
    const world = getWorld(worldId);
    player.lives = player.maxLives; // beginWorld() full-heals
    const seg = generateSegment(worldId, (seed * 7919 + worldId) >>> 0);
    revealToHorizon(seg, reading(worldId));
    let travelled = 0;

    for (const ev of seg.events) {
      // --- the road between here and there --------------------------------
      const secs = (ev.distance - travelled) / P.WALK_SPEED;
      travelled = ev.distance;
      player.hunger -= P.HUNGER_DRAIN_PER_SEC * secs;
      while (player.hunger < 35 && player.food > 0) {
        const bite = Math.min(player.food, 40);
        player.food -= bite;
        player.hunger = Math.min(P.HUNGER_MAX, player.hunger + bite);
      }
      if (player.hunger < 0) {
        const starving = -player.hunger / P.HUNGER_DRAIN_PER_SEC;
        const ticks = Math.floor((starving * 1000) / P.starvationIntervalMs(player.maxLives));
        player.lives -= ticks * P.STARVATION_LIFE_PER_TICK;
        player.hunger = 0;
        if (player.lives <= 0) return { died: true, worldId, cause: 'starvation' };
      }

      ev.resolved = true;
      revealToHorizon(seg, reading(worldId));

      // --- what is standing there ------------------------------------------
      if (ev.type === 'enemy' || ev.type === 'boss') {
        // Somebody who patches up between fights heals to the top; somebody
        // who only reaches for a bandage when the bar is nearly gone does not.
        const floor = buy.healBeforeFight === 'panic'
          ? player.maxLives * 0.3
          : player.maxLives - player.healSize;
        if (buy.healBeforeFight) {
          while (player.heals > 0 && player.lives <= floor) {
            player.heals -= 1;
            player.lives = Math.min(player.maxLives, player.lives + player.healSize);
          }
        }
        const phases = ev.type === 'boss' ? (world.boss.phases ? world.boss.phases.length : 1) : 1;
        let enemy = ev.type === 'boss' ? bossPhase(worldId) : rollEnemy(worldId, rng);
        for (let phase = 0; phase < phases; phase++) {
          if (phase > 0) enemy = bossPhase(worldId, phase);
          const r = await fight({
            enemy,
            player: {
              lives: player.lives, maxLives: player.maxLives, bullets: 0,
              gunDamage: P.gunDamageAt(player.gun),
            },
            policy,
            seed: (seed * 31 + worldId * 7 + ev.index * 13 + phase) >>> 0,
          });
          if (!r.won) {
            return { died: true, worldId, cause: ev.type === 'boss' ? 'boss' : 'duel' };
          }
          player.lives = Math.max(0.5, r.livesLeft);
        }
        player.gold += P.goldForEnemy({ worldId, lives: enemy.maxLives, isBoss: enemy.isBoss });
        player.exp += P.expForEnemy({ worldId, lives: enemy.maxLives, isBoss: enemy.isBoss });
        levelUp();
      } else if (ev.type === 'forge') {
        const keep = buy.reserve(worldId);
        while (
          player.gun < P.GUN_MAX_LEVEL &&
          player.gold - P.gunUpgradeCost(player.gun) >= keep
        ) {
          player.gold -= P.gunUpgradeCost(player.gun);
          player.gun += 1;
        }
      } else if (ev.type === 'inn') {
        const prem = P.innPremiumPrice(worldId);
        const basic = P.innBasicPrice(worldId);
        const heal = P.innBasicHeal(worldId, player.maxLives);
        const missing = player.maxLives - player.lives;
        if (missing > heal && player.gold >= prem && missing / player.maxLives >= buy.premiumAt) {
          player.gold -= prem;
          player.lives = player.maxLives;
        } else if (missing >= 1 && player.gold >= basic) {
          player.gold -= basic;
          player.lives = Math.min(player.maxLives, player.lives + heal);
        }
      } else if (ev.type === 'shop') {
        // A counter holds STOCK_DEPTH of anything stackable and one of
        // everything else, so this is bounded the way the real screen is.
        const apple = P.itemPrice({ basePrice: 20 }, worldId);
        let units = STOCK_DEPTH;
        // Food first — starving is the one thing on the road you cannot fight.
        while (units > 0 && player.food < buy.foodTarget && player.gold >= apple * 2) {
          player.gold -= apple;
          player.food += 40;
          units -= 1;
        }
        // Then lives in a bottle. Slot zero of every shop is one of these.
        const bandage = P.itemPrice({ basePrice: 40 }, worldId);
        let budget = player.gold * buy.healBudget;
        let heals = STOCK_DEPTH;
        while (heals > 0 && budget >= bandage && player.heals < 16) {
          player.gold -= bandage;
          budget -= bandage;
          player.heals += 1;
          heals -= 1;
        }
      }
    }
  }
  return { died: false, worldId: FINAL_WORLD, cause: 'victory', gun: player.gun, level: player.level };
}

async function reportRuns() {
  const rows = [];
  const detail = {};
  for (const policy of ['novice', 'average', 'expert']) {
    const results = [];
    for (let i = 0; i < RUNS; i++) results.push(await runOnce(1000 + i * 13, policy));
    const wins = results.filter((r) => !r.died).length;
    const reached = {};
    for (const r of results) for (let w = 1; w <= r.worldId; w++) reached[w] = (reached[w] || 0) + 1;
    rows.push({
      policy,
      finishedPct: pct(wins, RUNS),
      reachedGalaxyPct: pct(reached[6] || 0, RUNS),
      reachedBasinPct: pct(reached[5] || 0, RUNS),
      reachedBayouPct: pct(reached[4] || 0, RUNS),
      reachedPassPct: pct(reached[3] || 0, RUNS),
      reachedPrairiePct: pct(reached[2] || 0, RUNS),
    });
    const causes = {};
    for (const r of results) {
      if (!r.died) continue;
      const key = `W${r.worldId} ${r.cause}`;
      causes[key] = (causes[key] || 0) + 1;
    }
    detail[policy] = Object.entries(causes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([where, n]) => ({ policy, where, runs: n, pct: pct(n, RUNS) }));
  }
  console.log(`\n=== FULL RUNS (${RUNS} per skill, permadeath on) ===`);
  console.table(rows);
  console.log('\nWHERE RUNS END');
  console.table(Object.values(detail).flat());
  return rows;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * What a healthy build looks like. These are the design targets, written down
 * where a machine can check them — a run of `all` fails if the game has drifted
 * out of any of them.
 */
const TARGETS = [
  { what: 'novice reaches the Galaxy', min: 4, max: 18 },
  { what: 'average reaches the Galaxy', min: 20, max: 42 },
  { what: 'expert reaches the Galaxy', min: 46, max: 72 },
];

async function reportAll() {
  const power = powerCurve();
  console.log('=== WHERE THE ECONOMY PUTS A PLAYER ===');
  console.table(power);
  await reportDuels();
  await reportBosses();
  await reportSpecials();
  const runs = await reportRuns();

  console.log('\n=== TARGETS ===');
  const checks = TARGETS.map((t, i) => {
    const value = runs[i].reachedGalaxyPct;
    return { ...t, value, ok: value >= t.min && value <= t.max };
  });
  console.table(checks);
  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`\n${failed.length} target(s) missed:`);
    for (const f of failed) console.error(`  ${f.what}: ${f.value}% (want ${f.min}–${f.max}%)`);
    process.exitCode = 1;
  } else {
    console.log('\nAll targets met.');
  }
}

const MODES = {
  duels: reportDuels,
  bosses: reportBosses,
  specials: reportSpecials,
  runs: reportRuns,
  all: reportAll,
};

const mode = process.argv[2] || 'all';
if (!MODES[mode]) {
  console.error(`Unknown mode "${mode}". One of: ${Object.keys(MODES).join(', ')}`);
  process.exit(2);
}
await MODES[mode]();
