/**
 * SHOOT! — Exploration screen (Blocks 3a & 3b).
 *
 * Renders the journey and the travelling HUD. All of the logic lives elsewhere
 * (walk engine, hunger, day/night, weather, run controller); this file only
 * draws and wires buttons.
 *
 * HUD RULES
 *  - Lives (red diamonds), gold, level and hunger are always visible.
 *  - There is deliberately NO progress bar or timer toward the next encounter.
 *    The weather/time chips are atmosphere, not information about the road.
 *  - The saddlebag button is reachable at any moment and pauses the walk while
 *    it is open, so opening it is never a risk.
 */

import { el } from '../core/dom.js';
import { setRenderer } from '../core/scene.js';
import { EVENTS, on } from '../core/events.js';
import { attachButtonSounds, playMusic } from '../core/audio.js';
import { drawSprite, frameAt } from '../art/pixel.js';
import {
  getCharacterSprites,
  CHARACTER_TIMING,
  HORSE_TIMING,
  RIDER_OFFSET,
} from '../art/sprites-character.js';
import { createParallax } from './parallax.js';
import * as weather from './weather.js';
import { getTimeState } from './daynight.js';
import { starvationProgress } from './hunger.js';
import { getEngine, quitToMenu } from '../game/run.js';
import { getState } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { HUNGER_MAX } from '../game/progression.js';
import { livesRow, updateLivesRow, bar, icon } from '../ui/widgets.js';
import { openInventory } from '../ui/inventory-panel.js';
import { peekAhead, ENCOUNTER_LABELS } from './encounters.js';
import { toast } from '../ui/toast.js';

export const ExploreScreen = {
  id: 'explore',

  mount(root, params = {}) {
    const engine = getEngine();
    const player = getState();
    const world = getWorld(player.world);
    const sprites = getCharacterSprites();
    const parallax = createParallax({ seed: (player.seed ^ (player.world * 7919)) >>> 0 });
    parallax.setTint(world.tint);

    playMusic('themeWalk');

    // --- HUD ---------------------------------------------------------------
    const lives = livesRow(player.lives, player.maxLives);
    const goldLabel = el('span', { text: String(player.gold) });
    const levelLabel = el('span', { text: `Lv ${player.level}` });
    const hungerBar = bar(player.hunger / HUNGER_MAX);
    const weatherChip = el('span.chip', { text: weather.getWeatherState().label });
    const timeChip = el('span.chip', { text: getTimeState().phase });

    const hud = el('div.hud', {}, [
      el('div.hud-left', {}, [
        el('div.hud-block', {}, [
          el('span.hud-label', { text: world.name }),
          lives,
        ]),
        el('div.hud-block', {}, [
          el('span.hud-label', {}, [icon('hunger', 0.9), ' Hunger']),
          hungerBar.node,
        ]),
      ]),
      el('div.hud-right', {}, [
        el('div.row', {}, [weatherChip, timeChip]),
        el('div.row', {}, [
          el('span.chip.chip--gold', {}, [icon('coin', 1), goldLabel]),
          el('span.chip', {}, [levelLabel]),
        ]),
        el('button.btn.btn--small.btn--ghost', { onclick: () => quitToMenu() }, ['Menu']),
      ]),
    ]);

    const bagButton = el(
      'button.bag-button',
      {
        title: 'Saddlebag (I)',
        onclick: () => openBag(),
      },
      [icon('shopTag', 1.6), el('span', { text: 'Bag' })],
    );

    let bagOpen = false;
    function openBag() {
      if (bagOpen) return;
      bagOpen = true;
      engine.pause();
      openInventory({
        context: 'walk',
        onUse: (id, result) => {
          if (result.effect === 'map') revealMap();
        },
        onClose: () => {
          bagOpen = false;
          engine.resume();
        },
      });
    }

    /** The Map item: reveals what is coming, in vague terms only. */
    function revealMap() {
      const segment = engine.getSegment();
      const ahead = peekAhead(segment, engine.nextIndex(), engine.getTravelled(), 3);
      if (ahead.length === 0) {
        toast('The road ahead is blank', 'bad');
        return;
      }
      const text = ahead.map((a) => `${ENCOUNTER_LABELS[a.type]} (${a.proximity})`).join(' · ');
      toast(text, 'gold');
    }

    const onKey = (e) => {
      if (e.key === 'i' || e.key === 'I') openBag();
    };
    window.addEventListener('keydown', onKey);

    const screen = el('div.screen.explore-screen', {}, [hud, bagButton]);
    root.append(screen);
    attachButtonSounds(screen);

    // --- live HUD bindings -------------------------------------------------
    const unsubs = [
      on(EVENTS.LIVES_CHANGED, ({ lives: l, maxLives }) => updateLivesRow(lives, l, maxLives)),
      on(EVENTS.GOLD_CHANGED, ({ gold }) => {
        goldLabel.textContent = String(gold);
      }),
      on(EVENTS.EXP_CHANGED, ({ level }) => {
        levelLabel.textContent = `Lv ${level}`;
      }),
      on(EVENTS.HUNGER_CHANGED, ({ hunger }) => hungerBar.set(hunger / HUNGER_MAX)),
      on(EVENTS.WEATHER_CHANGED, (w) => {
        weatherChip.textContent = w.label;
        if (w.id !== 'clear') toast(`${w.label} rolling in`, 'info');
      }),
      on(EVENTS.TIME_OF_DAY_CHANGED, (t) => {
        timeChip.textContent = t.phase;
      }),
    ];

    // --- canvas renderer ---------------------------------------------------
    let elapsed = 0;
    /** Last viewport seen by render() — weather particles need its bounds. */
    let lastView = null;
    const renderer = {
      onResize(view) {
        lastView = view;
      },

      update(dt) {
        elapsed += dt;
        engine.update(dt, lastView);
        parallax.setStructures(engine.visibleStructures());
      },

      render(ctx, view) {
        lastView = view;
        const s = view.scale;
        const cameraX = engine.getCameraX();
        parallax.render(ctx, view, cameraX);
        const gy = parallax.groundY(view);
        const walking = !engine.isPaused();
        const heroX = Math.round(view.w * 0.26);

        if (getState().hasHorse) {
          const horseFrames = walking ? sprites.horse.gallop : sprites.horse.idle;
          const hTiming = walking ? HORSE_TIMING.gallop : HORSE_TIMING.idle;
          const horse = horseFrames[frameAt(horseFrames, elapsed, hTiming)];
          const hy = gy - horse.height * s + 2 * s;
          drawSprite(ctx, horse, heroX, hy, s);

          const riderFrames = sprites.rider.ride;
          const rider = riderFrames[frameAt(riderFrames, elapsed, CHARACTER_TIMING.ride)];
          drawSprite(ctx, rider, heroX + RIDER_OFFSET.x * s, hy + RIDER_OFFSET.y * s, s);
        } else {
          const frames = walking ? sprites.player.walk : sprites.player.idle;
          const timing = walking ? CHARACTER_TIMING.walk : CHARACTER_TIMING.idle;
          const frame = frames[frameAt(frames, elapsed, timing)];
          drawSprite(ctx, frame, heroX, gy - frame.height * s + 2 * s, s);
        }

        // Footfall dust while travelling.
        if (walking) {
          ctx.fillStyle = 'rgba(240, 214, 154, 0.5)';
          for (let i = 0; i < 3; i++) {
            const phase = (elapsed / 260 + i * 0.33) % 1;
            const px = heroX - phase * 26 * s;
            const py = gy - phase * 6 * s;
            ctx.globalAlpha = 0.45 * (1 - phase);
            ctx.fillRect(Math.round(px), Math.round(py), s, s);
          }
          ctx.globalAlpha = 1;
        }

        weather.render(ctx, view);

        // Starving: a red pulse creeping in from the edges.
        const starve = getState().hunger <= 0 ? starvationProgress() : 0;
        if (starve > 0) {
          const vg = ctx.createRadialGradient(
            view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.2,
            view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7,
          );
          vg.addColorStop(0, 'rgba(0,0,0,0)');
          vg.addColorStop(1, `rgba(141, 26, 24, ${0.25 + starve * 0.45})`);
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, view.w, view.h);
        }
      },
    };

    setRenderer(renderer);

    // Resume or start the journey.
    if (params.resume) engine.resume();
    else engine.start();

    return () => {
      window.removeEventListener('keydown', onKey);
      unsubs.forEach((fn) => fn());
      engine.pause();
    };
  },
};
