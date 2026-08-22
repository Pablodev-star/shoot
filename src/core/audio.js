/**
 * SHOOT! — Audio layer.
 *
 * No audio files ship with the repository yet. Rather than leave the game
 * silent, every cue is synthesised with the WebAudio API (short square/noise
 * blips that sit nicely under the western pixel look), and every cue is also
 * mapped to the real file that should eventually replace it.
 *
 * TO ADD REAL AUDIO
 * ---------------------------------------------------------------------------
 * Drop the files listed in AUDIO_MANIFEST into /assets/audio/ and set
 * USE_FILES = true. `play()` will then stream the file and ignore the
 * synthesiser. Nothing else in the codebase needs to change.
 */

const USE_FILES = false;

/** cue name -> file that should live at /assets/audio/<file> */
export const AUDIO_MANIFEST = {
  hover: 'ui-hover.wav',          // soft leather creak
  click: 'ui-click.wav',          // wooden button knock
  back: 'ui-back.wav',
  error: 'ui-error.wav',          // "coming soon" / not enough gold
  coin: 'coin.wav',               // purchase / gold gained
  levelUp: 'level-up.wav',
  reload: 'revolver-reload.wav',  // duel: reload
  shield: 'shield.wav',           // duel: shield
  shot: 'revolver-shot.wav',      // duel: shoot
  hit: 'hit.wav',                 // duel: life lost
  emptyGun: 'empty-gun.wav',      // duel: shoot with no bullets
  win: 'duel-win.wav',
  lose: 'duel-lose.wav',
  eat: 'eat.wav',
  horse: 'horse-neigh.wav',
  thunder: 'thunder.wav',
  wind: 'sandstorm-loop.wav',     // looping ambience
  fuse: 'fire-catch.wav',         // the hard slot going up
  type: 'speech-tick.wav',        // one character of a spoken line
  heartbeat: 'heartbeat.wav',     // the cut-scene's pulse under a held shot
  rumble: 'rumble.wav',           // something very large moving
  toll: 'bell-toll.wav',          // the beat a boss arrives on
  scare: 'scare.wav',             // the one jump scare in the game
  themeMenu: 'theme-menu.ogg',    // looping music
  themeWalk: 'theme-walk.ogg',
  themeDuel: 'theme-duel.ogg',
  themeGalaxy: 'theme-galaxy.ogg',
};

const state = {
  ctx: null,
  master: 0.6,
  muted: false,
  buffers: new Map(),
};

function context() {
  if (!state.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    state.ctx = new AC();
  }
  if (state.ctx.state === 'suspended') state.ctx.resume();
  return state.ctx;
}

/**
 * Synthesised stand-ins. Each entry describes a tiny envelope so the cue has
 * character even without a real sample.
 */
const SYNTH = {
  hover: { type: 'square', freq: 520, dur: 0.05, gain: 0.06, slide: 0 },
  click: { type: 'square', freq: 220, dur: 0.09, gain: 0.14, slide: -80 },
  back: { type: 'square', freq: 180, dur: 0.1, gain: 0.12, slide: -60 },
  error: { type: 'sawtooth', freq: 150, dur: 0.18, gain: 0.12, slide: -60 },
  coin: { type: 'square', freq: 880, dur: 0.12, gain: 0.12, slide: 420 },
  levelUp: { type: 'square', freq: 440, dur: 0.35, gain: 0.14, slide: 520 },
  reload: { type: 'square', freq: 330, dur: 0.12, gain: 0.1, slide: 160 },
  shield: { type: 'triangle', freq: 260, dur: 0.22, gain: 0.14, slide: 90 },
  shot: { noise: true, dur: 0.22, gain: 0.3, lowpass: 1800 },
  hit: { noise: true, dur: 0.3, gain: 0.24, lowpass: 700 },
  emptyGun: { type: 'square', freq: 120, dur: 0.07, gain: 0.1, slide: -40 },
  win: { type: 'square', freq: 523, dur: 0.5, gain: 0.16, slide: 400 },
  lose: { type: 'sawtooth', freq: 320, dur: 0.6, gain: 0.16, slide: -240 },
  eat: { type: 'triangle', freq: 300, dur: 0.14, gain: 0.12, slide: 120 },
  horse: { type: 'sawtooth', freq: 400, dur: 0.4, gain: 0.12, slide: -180 },
  thunder: { noise: true, dur: 0.9, gain: 0.3, lowpass: 400 },
  wind: { noise: true, dur: 0.6, gain: 0.08, lowpass: 900 },
  /**
   * Something catching light: the slot picker's hard card going up (see
   * src/ui/card-fire.js). Noise, rolled off low so it is a WHOOMPH rather than
   * a hiss, and quiet — it is the sound of a decision being made, not of a
   * building burning down.
   */
  fuse: { noise: true, dur: 0.5, gain: 0.16, lowpass: 620 },
  /**
   * Speech. Very short, very quiet, and pitched low: this fires once every
   * couple of characters, so anything with a tail on it turns a three-line
   * conversation into a fax machine.
   */
  type: { type: 'square', freq: 190, dur: 0.022, gain: 0.035, slide: -30 },
  /** The cut-scene's pulse. Two of these under a held shot is a held breath. */
  heartbeat: { type: 'sine', freq: 68, dur: 0.34, gain: 0.3, slide: -26 },
  /** Something very large moving, somewhere off screen. */
  rumble: { noise: true, dur: 1.4, gain: 0.26, lowpass: 180 },
  /** The beat a boss arrives on. */
  toll: { type: 'triangle', freq: 96, dur: 1.5, gain: 0.28, slide: -40 },

  /**
   * THE LOUDEST THING IN THE GAME, AND IT HAPPENS ONCE
   * -------------------------------------------------------------------------
   * The Hollow's scare (src/explore/scare.js). It is a STACK rather than a
   * single envelope, because everything that makes a stinger frightening is a
   * thing one oscillator cannot do at once:
   *
   *   1. a wall of unfiltered noise, at more gain than any other cue in the
   *      file. No lowpass at all — every other noise cue in this game is rolled
   *      off somewhere between 180 and 1800 Hz to sit under the art, and this
   *      one is the sound of that restraint being dropped
   *   2. a shriek: a sawtooth starting very high and falling a long way, which
   *      is the one interval the ear reads as something coming towards it
   *   3. a floor under both, so it is felt as well as heard, arriving four
   *      hundredths of a second late — the delay is what stops the three
   *      layers summing into one flat click
   *
   * Nothing else in the game is allowed near this volume, and that is the
   * point: the player has spent six worlds learning how loud this game gets.
   */
  scare: [
    { noise: true, dur: 0.55, gain: 0.62 },
    { type: 'sawtooth', freq: 1760, dur: 0.5, gain: 0.34, slide: -1500 },
    { type: 'square', freq: 70, dur: 0.9, gain: 0.4, slide: -40, delay: 0.04 },
  ],
};

function playSynth(cue) {
  const ctx = context();
  const spec = SYNTH[cue];
  if (!ctx || !spec) return;
  // A cue may be a STACK of envelopes rather than one — see `scare`. Each layer
  // is an ordinary spec and may carry its own `delay` in seconds.
  if (Array.isArray(spec)) {
    for (const layer of spec) playLayer(ctx, layer);
    return;
  }
  playLayer(ctx, spec);
}

function playLayer(ctx, spec) {
  const now = ctx.currentTime + (spec.delay || 0);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(spec.gain * state.master, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
  gain.connect(ctx.destination);

  if (spec.noise) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * spec.dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    if (spec.lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = spec.lowpass;
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    src.start(now);
    src.stop(now + spec.dur);
  } else {
    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.slide) {
      osc.frequency.linearRampToValueAtTime(Math.max(40, spec.freq + spec.slide), now + spec.dur);
    }
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + spec.dur);
  }
}

/** Play a cue by name. Unknown cues are ignored (never throw during play). */
export function play(cue) {
  if (state.muted || state.master <= 0) return;
  if (USE_FILES) {
    const file = AUDIO_MANIFEST[cue];
    if (!file) return;
    const audio = new Audio(`./assets/audio/${file}`);
    audio.volume = state.master;
    audio.play().catch(() => {});
    return;
  }
  playSynth(cue);
}

/**
 * Music is a no-op until real loops exist; the call sites are already in place
 * so adding the files is a one-line change.
 */
export function playMusic(themeCue) {
  if (!USE_FILES) return; // TODO: swap in /assets/audio/<theme>.ogg loops
  const file = AUDIO_MANIFEST[themeCue];
  if (!file) return;
  stopMusic();
  const audio = new Audio(`./assets/audio/${file}`);
  audio.loop = true;
  audio.volume = state.master * 0.5;
  audio.play().catch(() => {});
  state.music = audio;
}

export function stopMusic() {
  if (state.music) {
    state.music.pause();
    state.music = null;
  }
}

export function setVolume(v) {
  state.master = Math.max(0, Math.min(1, v));
  if (state.music) state.music.volume = state.master * 0.5;
}

export function getVolume() {
  return state.master;
}

export function setMuted(m) {
  state.muted = !!m;
}

/**
 * Wire hover/click cues to every button in a container. Called by each screen
 * after it renders so audio never has to be remembered per-button.
 */
export function attachButtonSounds(root = document) {
  root.querySelectorAll('button, .btn').forEach((el) => {
    if (el.dataset.sfxBound) return;
    el.dataset.sfxBound = '1';
    el.addEventListener('mouseenter', () => play('hover'));
    el.addEventListener('click', () => play(el.dataset.sfx || 'click'));
  });
}
