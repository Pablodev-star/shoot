/**
 * SHOOT! — Duel screen (Block 5b).
 *
 * Owns the presentation of a duel: the three buttons, the life diamonds, the
 * bullet counter, the round-by-round animation and the battle overview that
 * closes the fight (the feature the third version was best remembered for).
 *
 * All rules live in duel-engine.js. This file never decides an outcome.
 */

import { el, clearNode, wait } from '../core/dom.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { getState, setLives, hasVest, consumeVest, isImmuneToEffects } from '../game/player.js';
import { getWorld, FINAL_WORLD } from '../game/worlds.js';
import { generateEnemy, generateBoss, nextBossPhase, ABILITY_LABELS } from '../game/enemies.js';
import { createDuel, MOVES } from './duel-engine.js';
import { createLocalAgent, createAiAgent } from './duel-ai.js';
import { createDuelScene } from './duel-scene.js';
import { getWeatherState } from '../explore/weather.js';
import { getTimeState } from '../explore/daynight.js';
import { resolveDuel } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { livesRow, updateLivesRow, icon } from '../ui/widgets.js';
import { getSettings } from '../core/settings.js';
import { toast } from '../ui/toast.js';

/** Combine weather and night into the modifier set the engine understands. */
function buildModifiers() {
  const weather = getWeatherState();
  const time = getTimeState();
  const mods = { ...(weather.duel || {}) };
  if (time.isNight) {
    mods.enemyAccuracyPenalty = (mods.enemyAccuracyPenalty || 0) + 0.1;
    mods.night = true;
  }
  mods.weatherLabel = weather.label;
  return mods;
}

export const DuelScreen = {
  id: 'duel',

  mount(root, params = {}) {
    const player = getState();
    const world = getWorld(player.world);
    const isBoss = !!params.isBoss;
    const modifiers = buildModifiers();

    let enemy = isBoss
      ? generateBoss(player.world)
      : generateEnemy(player.world, (player.seed ^ ((params.encounter?.index ?? 0) * 2246822519)) >>> 0);

    playMusic(player.world === FINAL_WORLD ? 'themeGalaxy' : 'themeDuel');

    const scene = createDuelScene({
      worldId: player.world,
      tint: world.tint,
      seed: player.seed,
      enemySprites: enemy.sprites,
      shakeEnabled: getSettings().screenShake,
    });
    setRenderer(scene);

    const localAgent = createLocalAgent();
    let aiAgent = createAiAgent(enemy, modifiers, { thinkMs: 120 });

    const duel = createDuel({
      player: {
        name: 'You',
        lives: player.lives,
        maxLives: player.maxLives,
        bullets: 0,
        hasVest: hasVest(),
        immune: isImmuneToEffects(),
      },
      enemy,
      playerAgent: localAgent,
      enemyAgent: aiAgent,
      modifiers,
      onEvent: handleEngineEvent,
    });

    /** Round-by-round record shown in the battle overview. */
    const roundLog = [];
    let vestConsumed = false;
    let finished = false;

    // --- UI ----------------------------------------------------------------
    const playerLives = livesRow(player.lives, player.maxLives, { big: true });
    const enemyLives = livesRow(enemy.lives, enemy.maxLives, { big: true });
    const playerBullets = el('div.bullet-row');
    const enemyBullets = el('div.bullet-row');
    const roundLabel = el('span.chip', { text: 'Round 1' });
    const callout = el('div.duel-callout', { text: 'Make your move' });
    const enemyName = el('h2.duel-name', { text: enemy.name });

    function renderBullets(node, count) {
      clearNode(node);
      for (let i = 0; i < Math.max(count, 0); i++) node.append(icon('bullet', 1.1));
      if (count === 0) node.append(el('span.muted', { text: 'empty' }));
    }

    const buttons = {};
    const MOVE_SFX = { [MOVES.RELOAD]: 'reload', [MOVES.SHIELD]: 'shield', [MOVES.SHOOT]: 'shot' };
    function moveButton(move, label, hint, cls) {
      // `data-sfx` lets attachButtonSounds play the move's own cue instead of
      // the generic click, so pressing Shoot sounds like a revolver.
      const btn = el(`button.btn.duel-btn.${cls}`, {
        onclick: () => submit(move),
        dataset: { sfx: MOVE_SFX[move] },
      }, [el('span.duel-btn-label', { text: label }), el('span.duel-btn-hint', { text: hint })]);
      buttons[move] = btn;
      return btn;
    }

    const controls = el('div.duel-controls', {}, [
      moveButton(MOVES.RELOAD, 'Reload', '+1 bullet · vulnerable', 'duel-btn--reload'),
      moveButton(MOVES.SHIELD, 'Shield', 'protected this turn', 'duel-btn--shield'),
      moveButton(MOVES.SHOOT, 'Shoot', 'spend 1 bullet', 'duel-btn--shoot'),
    ]);

    const itemButton = el('button.btn.btn--small', {
      onclick: () =>
        openInventory({
          context: 'duel',
          canUse: (id) => ['dynamite', 'poison', 'bandage', 'potion', 'carrot', 'apple'].includes(id),
          useOpts: () => ({
            lives: duel.getSides().player.lives,
            maxLives: duel.getSides().player.maxLives,
          }),
          onUse: (id, result) => {
            if (result.effect === 'dynamite' || result.effect === 'poison') {
              duel.useItemEffect(result.effect);
              scene.fx.banner = result.effect === 'dynamite' ? 'DYNAMITE!' : 'POISONED!';
              scene.fx.bannerTimer = 900;
              syncBars();
            }
            if (result.effect === 'heal') {
              const sides = duel.getSides();
              sides.player.lives = Math.min(sides.player.maxLives, sides.player.lives + result.amount);
              syncBars();
            }
          },
        }),
    }, ['Saddlebag']);

    const screen = el('div.screen.duel-screen', {}, [
      el('div.duel-top', {}, [
        el('div.duel-fighter', {}, [
          el('span.hud-label', { text: 'You' }),
          playerLives,
          playerBullets,
        ]),
        el('div.duel-center', {}, [
          roundLabel,
          modifiers.weatherLabel && modifiers.weatherLabel !== 'Clear'
            ? el('span.chip', { text: modifiers.weatherLabel })
            : null,
          modifiers.night ? el('span.chip', { text: 'Night' }) : null,
          isBoss ? el('span.chip.chip--legendary', { text: 'BOSS' }) : null,
        ]),
        el('div.duel-fighter.is-enemy', {}, [
          enemyName,
          enemyLives,
          enemyBullets,
          enemy.abilities && enemy.abilities.length
            ? el('div.row', {}, enemy.abilities.map((a) =>
                el('span.chip.chip--rare', { text: ABILITY_LABELS[a] || a }),
              ))
            : null,
        ]),
      ]),
      callout,
      el('div.duel-bottom', {}, [controls, el('div.row', {}, [itemButton])]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    syncBars();

    function syncBars() {
      const sides = duel.getSides();
      updateLivesRow(playerLives, sides.player.lives, sides.player.maxLives);
      updateLivesRow(enemyLives, sides.enemy.lives, sides.enemy.maxLives);
      renderBullets(playerBullets, sides.player.bullets);
      renderBullets(enemyBullets, sides.enemy.bullets);
      roundLabel.textContent = `Round ${duel.getRound() + (localAgent.isWaiting() ? 1 : 0) || 1}`;
      buttons[MOVES.SHOOT].disabled = sides.player.bullets <= 0;
    }

    function setControlsEnabled(enabled) {
      for (const [move, btn] of Object.entries(buttons)) {
        btn.disabled = !enabled || (move === MOVES.SHOOT && duel.getSides().player.bullets <= 0);
      }
      itemButton.disabled = !enabled;
      controls.classList.toggle('is-waiting', !enabled);
    }

    /**
     * @param {string} move
     * @param {boolean} fromKeyboard clicks get their cue from the button's
     *   data-sfx; keyboard shortcuts bypass the button and play it here.
     */
    function submit(move, fromKeyboard = false) {
      if (!localAgent.isWaiting()) return;
      if (fromKeyboard) play(MOVE_SFX[move]);
      setControlsEnabled(false);
      localAgent.submit(move);
    }

    const onKey = (e) => {
      if (e.key === '1') submit(MOVES.RELOAD, true);
      if (e.key === '2') submit(MOVES.SHIELD, true);
      if (e.key === '3') submit(MOVES.SHOOT, true);
    };
    window.addEventListener('keydown', onKey);

    // --- engine events -----------------------------------------------------
    function handleEngineEvent(event) {
      if (event.type === 'vest' && !vestConsumed) {
        vestConsumed = true;
        consumeVest();
        toast('Your vest stopped the bullet', 'good');
        scene.fx.banner = 'VEST HOLDS!';
        scene.fx.bannerTimer = 900;
      }
      if (event.type === 'ability-blocked') {
        toast('The diadem blocked it', 'good');
      }
      if (event.type === 'phase') {
        scene.fx.banner = 'PHASE TWO';
        scene.fx.bannerTimer = 1400;
      }
    }

    // --- round animation ---------------------------------------------------
    async function animate(res) {
      const poseFor = (move) => (move === MOVES.SHOOT ? 'shoot' : move === MOVES.SHIELD ? 'shield' : 'idle');
      scene.fx.playerPose = poseFor(res.playerMove);
      scene.fx.enemyPose = poseFor(res.enemyMove);
      await wait(260);

      if (res.playerFires || res.enemyFires) {
        scene.fx.flash = 140;
        scene.fx.flashSide = res.playerFires && res.enemyFires ? 'both' : res.playerFires ? 'player' : 'enemy';
        if (res.playerFires) scene.spawnBullet('player');
        if (res.enemyFires) scene.spawnBullet('enemy');
        play('shot');
        await wait(280);
      }
      if (res.playerDry || res.enemyDry) play('emptyGun');
      if (res.playerMisfired || res.enemyMisfired) {
        toast('Wet powder — misfire!', 'bad');
      }

      if (res.hits.player) {
        scene.fx.playerPose = 'hit';
        scene.fx.shake = 320;
        play('hit');
      }
      if (res.hits.enemy) {
        scene.fx.enemyPose = 'hit';
        scene.fx.shake = 240;
        play('hit');
      }

      syncBars();
      callout.textContent = describe(res);
      await wait(res.hits.player || res.hits.enemy ? 620 : 380);
      scene.fx.playerPose = 'idle';
      scene.fx.enemyPose = 'idle';
    }

    function describe(res) {
      if (res.terminatedBy === 'item') return 'That finished it.';
      if (res.terminatedBy === 'ability') return 'Caught by their trick!';
      if (res.hits.player && res.hits.enemy) return 'Both of you go down a life!';
      if (res.hits.enemy) return 'You hit!';
      if (res.hits.player) return 'You are hit!';
      if (res.playerMove === MOVES.SHOOT && res.enemyMove === MOVES.SHIELD) return 'Blocked — bullet wasted.';
      if (res.enemyMove === MOVES.SHOOT && res.playerMove === MOVES.SHIELD) return 'You blocked it.';
      if (res.playerMove === MOVES.RELOAD && res.enemyMove === MOVES.RELOAD) return 'Both of you reload.';
      return 'Nothing doing.';
    }

    // --- main loop ---------------------------------------------------------
    async function loop() {
      while (!finished) {
        // A thrown item can finish the duel between rounds; never re-arm the
        // controls on a duel that is already decided.
        if (duel.isOver()) {
          await endDuel(duel.getResult());
          return;
        }

        setControlsEnabled(true);
        callout.textContent = 'Make your move';
        const res = await duel.playRound();
        if (finished) return;
        if (!res) {
          if (duel.isOver()) await endDuel(duel.getResult());
          return;
        }

        // Rounds cut short by an item have no moves to log or learn from.
        if (res.playerMove) {
          roundLog.push(res);
          if (aiAgent.observe) aiAgent.observe(res.playerMove);
        }
        await animate(res);

        if (duel.isOver()) {
          const result = duel.getResult();
          // Boss phase transition instead of ending the fight.
          if (result.winner === 'player' && enemy.isBoss) {
            const next = nextBossPhase(enemy);
            if (next) {
              enemy = next;
              // The new agent has to go into the engine, not just this
              // closure — otherwise phase two fights with phase one's brain.
              aiAgent = createAiAgent(enemy, modifiers, { thinkMs: 120 });
              duel.setEnemy(next, aiAgent);
              enemyName.textContent = next.name;
              syncBars();
              await wait(900);
              continue;
            }
          }
          await endDuel(result);
          return;
        }
      }
    }

    async function endDuel(result) {
      finished = true;
      setControlsEnabled(false);
      const won = result.winner === 'player';
      play(won ? 'win' : 'lose');
      scene.fx.banner = won ? 'YOU WIN' : 'YOU LOSE';
      scene.fx.bannerTimer = 1600;

      // Push the surviving life count back onto the run.
      const sides = duel.getSides();
      setLives(sides.player.lives);

      await wait(700);
      showOverview(won, sides);
    }

    /** Battle overview: the round-by-round table from version 3. */
    function showOverview(won, sides) {
      const rows = roundLog.map((r) =>
        el('tr', {}, [
          el('td', { text: String(r.round) }),
          el('td', { class: `mv mv--${r.playerMove}`, text: labelFor(r.playerMove, r.playerDry) }),
          el('td', { class: `mv mv--${r.enemyMove}`, text: labelFor(r.enemyMove, r.enemyDry) }),
          el('td', { text: outcomeFor(r) }),
        ]),
      );

      const shotsFired = roundLog.filter((r) => r.playerFires).length;
      const hits = roundLog.filter((r) => r.hits.enemy).length;
      const accuracy = shotsFired ? Math.round((hits / shotsFired) * 100) : 0;

      const overlay = el('div.modal-backdrop', {}, [
        el('div.panel.modal.overview', {}, [
          el('h2.panel-title', { text: won ? 'Duel Won' : 'Duel Lost' }),
          el('p.panel-sub', { text: `${enemy.name} · ${roundLog.length} rounds` }),
          el('div.stat-grid', {}, [
            el('div.stat-tile', {}, [el('span.k', { text: 'Shots fired' }), el('span.v', { text: String(shotsFired) })]),
            el('div.stat-tile', {}, [el('span.k', { text: 'Hits' }), el('span.v', { text: String(hits) })]),
            el('div.stat-tile', {}, [el('span.k', { text: 'Accuracy' }), el('span.v', { text: `${accuracy}%` })]),
            el('div.stat-tile', {}, [el('span.k', { text: 'Lives left' }), el('span.v', { text: String(sides.player.lives) })]),
          ]),
          el('div.overview-table-wrap', {}, [
            el('table.overview-table', {}, [
              el('thead', {}, [
                el('tr', {}, [
                  el('th', { text: '#' }),
                  el('th', { text: 'You' }),
                  el('th', { text: enemy.name }),
                  el('th', { text: 'Result' }),
                ]),
              ]),
              el('tbody', {}, rows),
            ]),
          ]),
          el('div.row', { style: { justifyContent: 'center', marginTop: '14px' } }, [
            el('button.btn.btn--primary', {
              onclick: () => {
                overlay.remove();
                resolveDuel({ won, enemy, isBoss });
              },
            }, [won ? 'Back to the road' : 'Continue']),
          ]),
        ]),
      ]);
      document.getElementById('app').append(overlay);
      attachButtonSounds(overlay);
    }

    function labelFor(move, dry) {
      if (move === MOVES.SHOOT) return dry ? 'Shoot (empty)' : 'Shoot';
      return move === MOVES.SHIELD ? 'Shield' : 'Reload';
    }

    function outcomeFor(r) {
      if (r.hits.player && r.hits.enemy) return 'Trade';
      if (r.hits.enemy) return 'You hit';
      if (r.hits.player) return 'You were hit';
      if (r.playerMisfired || r.enemyMisfired) return 'Misfire';
      return '—';
    }

    loop();

    return () => {
      finished = true;
      localAgent.cancel();
      window.removeEventListener('keydown', onKey);
    };
  },
};
