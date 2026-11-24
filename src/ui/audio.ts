import { store } from './store';

/**
 * Tiny Web Audio chiptune engine (DESIGN 13.5): hub loop, match-day loop, goal sting,
 * promotion fanfare and UI clicks. No audio files, so the build stays small.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

function settings() {
  return store.state?.settings ?? { muted: false, music: 0.6, sfx: 0.8 };
}

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
  }
  applyVolumes();
  return ctx;
}

export function applyVolumes() {
  if (!ctx || !master) return;
  const st = settings();
  master.gain.value = st.muted ? 0 : 0.5;
  musicGain!.gain.value = st.music * 0.35;
  sfxGain!.gain.value = st.sfx * 0.6;
}

type Wave = OscillatorType | 'noise';
let noiseBuf: AudioBuffer | null = null;

function tone(dest: AudioNode, t: number, freq: number, dur: number, wave: Wave, vol = 0.3, slide?: number) {
  const c = ctx!;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  g.connect(dest);
  if (wave === 'noise') {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = freq;
    src.connect(hp).connect(g);
    src.start(t);
    src.stop(t + dur + 0.02);
    return;
  }
  const o = c.createOscillator();
  o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// ---------- music: step sequencer with lookahead scheduling

interface Track {
  bpm: number;
  steps: number; // 16th notes per loop
  lead: (number | null)[];
  bass: (number | null)[];
  hats?: boolean;
  kick?: number[];
}

// A minor / C major feel. null = rest. Patterns are 32 sixteenths (2 bars).
const HUB: Track = {
  bpm: 92,
  steps: 32,
  lead: [69, null, 72, null, 76, null, 72, null, 74, null, 71, null, 67, null, null, null, 69, null, 72, null, 76, null, 79, null, 77, null, 76, null, 72, null, null, null],
  bass: [45, null, null, null, 45, null, null, null, 43, null, null, null, 43, null, null, null, 41, null, null, null, 41, null, null, null, 40, null, null, null, 40, null, 43, null],
};
const MATCH: Track = {
  bpm: 128,
  steps: 32,
  lead: [76, null, 76, 79, null, 76, 74, null, 72, null, 74, null, 76, null, null, null, 76, null, 76, 79, null, 81, 79, null, 77, null, 76, null, 74, null, 72, null],
  bass: [45, null, 57, null, 45, null, 57, null, 48, null, 60, null, 48, null, 60, null, 41, null, 53, null, 41, null, 53, null, 43, null, 55, null, 43, null, 55, null],
  hats: true,
  kick: [0, 8, 16, 24],
};

let current: Track | null = null;
let currentName: string | null = null;
let step = 0;
let nextTime = 0;
let timer: number | null = null;

function schedule() {
  if (!ctx || !current || !musicGain) return;
  const spb = 60 / current.bpm / 4;
  while (nextTime < ctx.currentTime + 0.15) {
    const i = step % current.steps;
    const l = current.lead[i];
    const b = current.bass[i];
    if (l != null) tone(musicGain, nextTime, midi(l), spb * 1.8, 'square', 0.12);
    if (b != null) tone(musicGain, nextTime, midi(b), spb * 3.5, 'triangle', 0.3);
    if (current.hats && i % 2 === 1) tone(musicGain, nextTime, 7000, 0.04, 'noise', 0.06);
    if (current.kick?.includes(i)) tone(musicGain, nextTime, 140, 0.12, 'sine', 0.5, 45);
    nextTime += spb;
    step++;
  }
}

/** Switch the background loop ('hub', 'match' or null to stop). */
export function music(name: 'hub' | 'match' | null) {
  if (name === currentName) return;
  currentName = name;
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
  current = name === 'hub' ? HUB : name === 'match' ? MATCH : null;
  if (!current) return;
  const c = ensure();
  if (!c || c.state !== 'running') return; // starts on the first user gesture
  step = 0;
  nextTime = c.currentTime + 0.05;
  timer = window.setInterval(schedule, 50);
}

// ---------- effects

export type Sfx = 'click' | 'swipe' | 'goal' | 'win' | 'loss' | 'fanfare' | 'coin' | 'build';

export function sfx(name: Sfx) {
  const c = ensure();
  if (!c || c.state !== 'running' || settings().muted || !sfxGain) return;
  const t = c.currentTime + 0.01;
  const d = sfxGain;
  const seq = (notes: number[], len: number, wave: Wave = 'square', vol = 0.25) => notes.forEach((n, i) => tone(d, t + i * len, midi(n), len * 1.6, wave, vol));
  switch (name) {
    case 'click': tone(d, t, 1200, 0.03, 'square', 0.08); break;
    case 'swipe': tone(d, t, 500, 0.08, 'triangle', 0.15, 900); break;
    case 'coin': seq([83, 88], 0.07); break;
    case 'build': seq([60, 64, 67], 0.06, 'triangle', 0.3); break;
    case 'goal': seq([72, 76, 79, 84, 79, 84], 0.08); tone(d, t, 4000, 0.6, 'noise', 0.12); break;
    case 'win': seq([72, 76, 79, 84], 0.1); break;
    case 'loss': seq([67, 63, 60], 0.16, 'triangle', 0.3); break;
    case 'fanfare': {
      seq([67, 67, 67, 72, 76, 79, 76, 79, 84], 0.12, 'square', 0.22);
      [48, 55, 60, 64].forEach((n, i) => tone(d, t + i * 0.36, midi(n), 0.5, 'triangle', 0.3));
      break;
    }
  }
}

/** Browsers only allow audio after a gesture: unlock on the first tap and add click sounds. */
export function installAudio() {
  if (typeof document === 'undefined') return;
  const unlock = () => {
    const c = ensure();
    if (c && c.state !== 'running') {
      void c.resume().then(() => {
        const n = currentName;
        currentName = null;
        if (n) music(n as 'hub' | 'match');
      });
    }
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('click', (e) => {
    const el = e.target as HTMLElement | null;
    if (el?.closest('button')) sfx('click');
  }, { capture: true });
  store.subscribe(applyVolumes);
}
