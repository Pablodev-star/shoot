/**
 * SHOOT! — Exploration screen.
 *
 * Renders the journey and the travelling HUD. All the logic lives elsewhere
 * (walk engine, hunger, day/night, weather, run controller); this file draws and
 * wires buttons.
 *
 * HUD RULES
 *  - Lives, gold and level sit in the shared status bar, in the same place as
 *    every other in-run screen.
 *  - Hunger gets a labelled meter with a number, because it is the only
 *    resource that can kill you while nothing is happening.
 *  - There is deliberately NO progress bar or timer toward the next encounter.
 *    The status line says what you are doing, never how long is left.
 *  - The saddlebag is one tap away at all times and pauses the walk while open.
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
import { getState, getInventory } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { HUNGER_MAX } from '../game/progression.js';
import { meter, icon } from '../ui/widgets.js';
import { statusBar } from '../ui/statusbar.js';
import { openInventory } from '../ui/inventory-panel.js';
import { peekAhead, ENCOUNTER_LABELS } from './encounters.js';
import { toast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm.js';
import { openHowToPlay } from '../ui/help.js';

/** Plain-language description of the current weather, for the status line. */
const WEATHER_BLURB = {
  clear: 'The road is quiet',
  cloudy: 'Clouds are gathering',
  rain: 'Rain is coming down',
  sandstorm: 'Sand whips across the road',
};

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
    const bar = statusBar({
      actions: [
        el('button.btn.btn--sm.btn--icon.btn--ghost', {
          onclick: () => openHowToPlay(),
          'aria-label': 'How to play',
          'data-tip': 'How to play',
        }, ['?']),
        el('button.btn.btn--sm.btn--ghost', { onclick: () => leave() }, ['Menu']),
      ],
    });

    const hunger = meter({
      label: 'Hunger',
      iconName: 'hunger',
      ratio: player.hunger / HUNGER_MAX,
      value: `${Math.round(player.hunger)}%`,
    });

    const weatherChip = el('span.chip', { text: weather.getWeatherState().label });
    const timeChip = el('span.chip', { text: getTimeState().phase });
    const mountChip = player.hasHorse
      ? el('span.chip.chip--gold', {}, [icon('horseToken', 1), 'Riding'])
      : null;

    const statusText = el('span', { text: 'Walking' });
    const statusLine = el('div.travel-status', {}, [
      statusText,
      el('span.walk-dots', {}, [el('i'), el('i'), el('i')]),
    ]);

    const bagCount = el('span.bag-count', { text: String(totalItems()) });
    const bagButton = el('button.btn.bag-button', {
      onclick: () => openBag(),
      'data-tip': 'Eat, use or sell your things (I)',
    }, [icon('shopTag', 1.2), el('span', { text: 'Saddlebag' }), bagCount, el('span.kbd', { text: 'I' })]);

    function totalItems() {
      return getInventory().reduce((sum, e) => sum + e.qty, 0);
    }

    let bagOpen = false;
    function openBag() {
      if (bagOpen) return;
      bagOpen = true;
      engine.pause();
      setStatus('Rummaging through your saddlebag');
      openInventory({
        context: 'walk',
        onUse: (id, result) => {
          if (result.effect === 'map') revealMap();
        },
        onClose: () => {
          bagOpen = false;
          engine.resume();
          setStatus(player.hasHorse ? 'Riding on' : 'Walking');
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
      toast(ahead.map((a) => `${ENCOUNTER_LABELS[a.type]} · ${a.proximity}`).join('   '), 'gold');
    }

    async function leave() {
      engine.pause();
      const confirmed = await confirmDialog({
        title: 'Leave the road?',
        body: 'Your run is saved at the last encounter. You can pick it up from the same slot.',
        confirmLabel: 'Back to menu',
      });
      if (confirmed) await quitToMenu();
      else engine.resume();
    }

    function setStatus(text) {
      statusText.textContent = text;
      statusLine.classList.remove('is-in');
      void statusLine.offsetWidth;
      statusLine.classList.add('is-in');
    }

    const onKey = (e) => {
      if (e.key === 'i' || e.key === 'I') openBag();
    };
    window.addEventListener('keydown', onKey);

    const screen = el('div.screen.explore-screen', {}, [
      el('div.explore-top', {}, [
        bar,
        el('div.travel-panel', {}, [
          hunger.node,
          el('div.travel-atmos', {}, [mountChip, weatherChip, timeChip].filter(Boolean)),
        ]),
      ]),

      statusLine,

      el('div.explore-actions', {}, [bagButton]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    setStatus(player.hasHorse ? 'Riding on' : 'Walking');

    // --- live bindings -----------------------------------------------------
    const unsubs = [
      on(EVENTS.HUNGER_CHANGED, ({ hunger: h }) => hunger.set(h / HUNGER_MAX, `${Math.round(h)}%`)),
      on(EVENTS.INVENTORY_CHANGED, () => {
        bagCount.textContent = String(totalItems());
      }),
      on(EVENTS.WEATHER_CHANGED, (w) => {
        weatherChip.textContent = w.label;
        weatherChip.classList.toggle('chip--danger', w.id === 'sandstorm');
        if (w.id !== 'clear') toast(WEATHER_BLURB[w.id] || w.label, 'info');
        setStatus(WEATHER_BLURB[w.id] || (player.hasHorse ? 'Riding on' : 'Walking'));
      }),
      on(EVENTS.TIME_OF_DAY_CHANGED, (t) => {
        timeChip.textContent = t.phase;
        timeChip.classList.toggle('chip--danger', t.isNight);
        if (t.phase === 'night') setStatus('Night falls on the road');
        if (t.phase === 'dawn') setStatus('The sun comes up');
      }),
      on(EVENTS.HUNGER_EMPTY, () => setStatus('Starving — eat something')),
      on(EVENTS.HORSE_ACQUIRED, () => setStatus('Riding on')),
    ];

    // --- canvas renderer ---------------------------------------------------
    let elapsed = 0;
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
            ctx.globalAlpha = 0.45 * (1 - phase);
            ctx.fillRect(Math.round(heroX - phase * 26 * s), Math.round(gy - phase * 6 * s), s, s);
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

    if (params.resume) engine.resume();
    else engine.start();

    return () => {
      window.removeEventListener('keydown', onKey);
      unsubs.forEach((fn) => fn());
      bar.dispose();
      engine.pause();
    };
  },
};
