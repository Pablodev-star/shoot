/**
 * SHOOT! — Settings & local profile.
 *
 * Both live outside the save slots (they belong to the device, not to a run)
 * but still go through the storage driver, so they migrate to a remote account
 * with everything else.
 */

import { read, write } from './storage.js';
import { setVolume, setMuted } from './audio.js';

const SETTINGS_KEY = 'settings';
const PROFILE_KEY = 'profile';

const DEFAULT_SETTINGS = {
  volume: 0.6,
  muted: false,
  language: 'en',
  screenShake: true,
  showHints: true,
  /** Set once the How to Play panel has been shown automatically. */
  seenHowTo: false,
};

const DEFAULT_PROFILE = {
  name: 'STRANGER',
  createdAt: null,
  stats: { duelsWon: 0, duelsLost: 0, worldsCleared: 0, goldEarned: 0, milesWalked: 0 },
  /**
   * What the gunslinger is wearing: four garment ids, one per slot. The
   * catalogue and the lock on each piece live in `src/game/wardrobe.js` — this
   * file only keeps the four strings, and what it keeps is never trusted: an
   * outfit is validated against the achievement ledger every time it is read.
   */
  outfit: { hat: 'trail', shirt: 'serape', pants: 'trail', boots: 'trail' },
};

/** Only English is functional; the others are listed but disabled in the UI. */
export const LANGUAGES = [
  { id: 'en', label: 'English', available: true },
  { id: 'es', label: 'Español', available: false },
  { id: 'pt', label: 'Português', available: false },
  { id: 'fr', label: 'Français', available: false },
];

let settings = { ...DEFAULT_SETTINGS };
let profile = { ...DEFAULT_PROFILE, stats: { ...DEFAULT_PROFILE.stats } };

export async function loadSettings() {
  const stored = await read(SETTINGS_KEY);
  settings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
  const storedProfile = await read(PROFILE_KEY);
  profile = {
    ...DEFAULT_PROFILE,
    ...(storedProfile || {}),
    stats: { ...DEFAULT_PROFILE.stats, ...((storedProfile && storedProfile.stats) || {}) },
    outfit: { ...DEFAULT_PROFILE.outfit, ...((storedProfile && storedProfile.outfit) || {}) },
  };
  if (!profile.createdAt) profile.createdAt = Date.now();
  applyAudio();
  return settings;
}

function applyAudio() {
  setVolume(settings.volume);
  setMuted(settings.muted);
}

export function getSettings() {
  return { ...settings };
}

export async function updateSettings(patch) {
  settings = { ...settings, ...patch };
  applyAudio();
  await write(SETTINGS_KEY, settings);
  return settings;
}

export function getProfile() {
  return { ...profile, stats: { ...profile.stats }, outfit: { ...profile.outfit } };
}

export async function updateProfile(patch) {
  profile = {
    ...profile,
    ...patch,
    stats: { ...profile.stats, ...(patch.stats || {}) },
    outfit: { ...profile.outfit, ...(patch.outfit || {}) },
  };
  await write(PROFILE_KEY, profile);
  return profile;
}

/** Bump one of the lifetime counters shown on the profile screen. */
export async function bumpStat(key, amount = 1) {
  profile.stats[key] = (profile.stats[key] || 0) + amount;
  await write(PROFILE_KEY, profile);
  return profile.stats[key];
}
