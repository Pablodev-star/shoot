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
};

function playSynth(cue) {
  const ctx = context();
  const spec = SYNTH[cue];
  if (!ctx || !spec) return;
  const now = ctx.currentTime;
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
