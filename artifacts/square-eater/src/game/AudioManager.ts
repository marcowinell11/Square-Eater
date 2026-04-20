/**
 * AudioManager
 *
 * Uses the native HTMLAudioElement API instead of Phaser's audio loader
 * so missing or placeholder files fail silently and never crash the game.
 *
 * Drop your real files into  public/audio/  (filenames must match exactly):
 *   public/audio/Menu Music.mp3
 *   public/audio/Game Music.wav
 *   public/audio/Eat Sound.wav
 *   public/audio/Lose Sound.wav
 *   public/audio/Victory Sound.wav
 *
 * The game works fine without them — audio just stays silent.
 */

// ─── File Map ────────────────────────────────────────────────────────────────

// Import BASE_PATH so paths work in both dev and production (subpath deploy)
const BASE = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";

export const AUDIO_KEYS = {
  menuMusic:    "menuMusic",
  gameMusic:    "gameMusic",
  eatSound:     "eatSound",
  loseSound:    "loseSound",
  victorySound: "victorySound",
} as const;

export type AudioKey = typeof AUDIO_KEYS[keyof typeof AUDIO_KEYS];

const FILE_MAP: Record<AudioKey, string> = {
  menuMusic:    `${BASE}audio/Menu Music.mp3`,
  gameMusic:    `${BASE}audio/Game Music.wav`,
  eatSound:     `${BASE}audio/Eat Sound.wav`,
  loseSound:    `${BASE}audio/Lose Sound.wav`,
  victorySound: `${BASE}audio/Victory Sound.wav`,
};

// ─── Settings (persisted to localStorage) ────────────────────────────────────

const STORAGE_KEY = "squareEaterAudio";

interface AudioSettings { music: boolean; sfx: boolean; }

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { music: true, sfx: true, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { music: true, sfx: true };
}

function saveSettings(s: AudioSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let settings = loadSettings();

export function isMusicEnabled() { return settings.music; }
export function isSfxEnabled()   { return settings.sfx;   }

export function setMusicEnabled(on: boolean) {
  settings.music = on;
  saveSettings(settings);
  if (!on) stopMusic();
  // if turning on, caller is responsible for calling playMusic() again
}

export function setSfxEnabled(on: boolean) {
  settings.sfx = on;
  saveSettings(settings);
}

// ─── Background Music ─────────────────────────────────────────────────────────

let bgEl: HTMLAudioElement | null = null;
let bgKey: AudioKey | null = null;

export function playMusic(key: AudioKey, volume = 0.5) {
  if (!settings.music) return;
  if (bgEl && bgKey === key && !bgEl.paused) return;  // already playing
  stopMusic();

  const el = new Audio(FILE_MAP[key]);
  el.loop = true;
  el.volume = volume;
  el.play().catch(() => { /* file missing or decode error — stay silent */ });
  bgEl = el;
  bgKey = key;
}

export function stopMusic() {
  if (bgEl) {
    bgEl.pause();
    bgEl.src = "";
    bgEl = null;
    bgKey = null;
  }
}

/** Resume background music if music is enabled and a key was previously set. */
export function resumeMusic(key: AudioKey, volume = 0.5) {
  if (settings.music) playMusic(key, volume);
}

// ─── Sound Effects ────────────────────────────────────────────────────────────

export function playSfx(key: AudioKey, volume = 1) {
  if (!settings.sfx) return;
  try {
    const el = new Audio(FILE_MAP[key]);
    el.volume = volume;
    el.play().catch(() => { /* stay silent if file missing */ });
  } catch { /* ignore */ }
}
