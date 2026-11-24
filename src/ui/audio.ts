import { store } from './store';

/**
 * Web Audio sound engine (DESIGN 13.5). Everything is synthesised in the browser, so there are no audio files,
 * it works offline and the build stays small.
 *
 * Music is a generated lo-fi jazz loop: electric piano chords (7ths, 9ths, 13ths) with a lazy swing, a soft
 * upright-style bass, soft clean percussion (no noise: kick, rim and ride are all tuned sine tones), a sparse
 * vibraphone melody, and everything through a gentle low-pass and a small, smooth room reverb, with headroom so
 * nothing clips. (An earlier version had vinyl crackle and noise drums; they were removed as too noisy.) Chords, fills and melody notes vary from bar to bar, so it does not
 * sound like a short loop. One mellow loop plays everywhere, continuously.
 *
 * Effects are short and soft, tuned to the same jazzy palette (see `Sfx`).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicIn: GainNode | null = null; // music instruments play into this: low-pass then musicGain
let lowpass: BiquadFilterNode | null = null;
let sfxGain: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let musicVerb: GainNode | null = null;
let sfxVerb: GainNode | null = null;

function settings() {
  return store.state?.settings ?? { muted: false, music: 0.6, sfx: 0.8 };
}

function impulse(c: AudioContext, secs: number) {
  const len = Math.floor(c.sampleRate * secs);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // smoothed (low-passed) noise so the tail is warm, not hissy
    let y = 0;
    for (let i = 0; i < len; i++) {
      y += 0.25 * ((Math.random() * 2 - 1) - y);
      d[i] = y * Math.pow(1 - i / len, 3);
    }
  }
  return buf;
}

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    const c = new AC();
    ctx = c;
    master = c.createGain();
    master.connect(c.destination);
    reverb = c.createConvolver();
    reverb.buffer = impulse(c, 1.8);
    reverb.connect(master);

    musicGain = c.createGain();
    musicGain.connect(master);
    lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2600;
    lowpass.Q.value = 0.5;
    lowpass.connect(musicGain);
    musicIn = c.createGain();
    musicIn.connect(lowpass);
    musicVerb = c.createGain();
    musicVerb.gain.value = 0.35;
    lowpass.connect(musicVerb).connect(reverb); // the reverb takes the filtered signal, so it adds no top end
    // a slow wobble on the filter, like a worn tape
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 0.13;
    depth.gain.value = 250;
    lfo.connect(depth).connect(lowpass.frequency);
    lfo.start();

    sfxGain = c.createGain();
    sfxGain.connect(master);
    sfxVerb = c.createGain();
    sfxVerb.gain.value = 0.2;
    sfxGain.connect(sfxVerb).connect(reverb);
  }
  applyVolumes();
  return ctx;
}

let lastMusic = -1;

export function applyVolumes() {
  if (!ctx || !master) return;
  const st = settings();
  master.gain.value = st.muted ? 0 : 0.55;
  const m = st.music * 0.8;
  if (m !== lastMusic) { // only when the setting changes, so a store update never cuts into a duck
    lastMusic = m;
    musicGain!.gain.cancelScheduledValues(ctx.currentTime);
    musicGain!.gain.setValueAtTime(m, ctx.currentTime);
  }
  musicVerb!.gain.value = st.music * 0.12;
  sfxGain!.gain.value = st.sfx * 0.6;
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Gain envelope: quick attack, exponential decay to silence at t + dur. */
function env(dest: AudioNode, t: number, vol: number, dur: number, attack = 0.006) {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
  g.connect(dest);
  return g;
}

function osc(dest: AudioNode, t: number, type: OscillatorType, freq: number, dur: number, detune = 0, slideTo?: number) {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  o.detune.value = detune;
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noiseHit(dest: AudioNode, t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 0.8, sweepTo?: number) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = env(dest, t, vol, dur, Math.min(0.01, dur / 4));
  src.connect(f).connect(g);
  const off = Math.random() * 0.5;
  src.start(t, off);
  src.stop(t + dur + 0.05);
}

// ---------- instruments

/** Electric piano (Rhodes-like): two soft sines, a little detuned, plus a short bell-like tine on the attack. */
function epiano(dest: AudioNode, t: number, n: number, dur: number, vel = 0.12) {
  const f = midi(n);
  const g = env(dest, t, vel, dur, 0.008);
  osc(g, t, 'sine', f, dur, -4);
  osc(g, t, 'sine', f, dur, 5);
  const g2 = env(dest, t, vel * 0.25, Math.min(dur, 0.9), 0.005);
  osc(g2, t, 'sine', f * 2, Math.min(dur, 0.9));
  const g3 = env(dest, t, vel * 0.08, 0.18, 0.006);
  osc(g3, t, 'sine', f * 7, 0.18);
}

/** Vibraphone-ish lead: sine with a soft tremolo. */
function vibes(dest: AudioNode, t: number, n: number, dur: number, vel = 0.07) {
  const c = ctx!;
  const g = env(dest, t, vel, dur, 0.004);
  const trem = c.createGain();
  trem.gain.value = 0.75;
  const lfo = c.createOscillator();
  const d = c.createGain();
  lfo.frequency.value = 5.2;
  d.gain.value = 0.25;
  lfo.connect(d).connect(trem.gain);
  lfo.start(t);
  lfo.stop(t + dur + 0.05);
  trem.connect(g);
  osc(trem, t, 'sine', midi(n), dur);
  const g2 = env(dest, t, vel * 0.2, 0.4, 0.003);
  osc(g2, t, 'sine', midi(n) * 4, 0.4);
}

/** Upright-style bass: sine plus a filtered triangle, short pluck. */
function bass(dest: AudioNode, t: number, n: number, dur: number, vel = 0.34) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  const g = env(dest, t, vel, dur, 0.01);
  f.connect(g);
  osc(f, t, 'triangle', midi(n), dur);
  osc(g, t, 'sine', midi(n), dur);
}

function kick(dest: AudioNode, t: number, vel = 0.5) {
  const g = env(dest, t, vel, 0.22, 0.006);
  osc(g, t, 'sine', 95, 0.22, 0, 45);
}
/** Soft rim click: two short tuned sines, no noise. */
const rim = (dest: AudioNode, t: number, vel = 0.05) => {
  const g = env(dest, t, vel, 0.07, 0.003);
  osc(g, t, 'sine', 1650, 0.07, 0, 1500);
  const g2 = env(dest, t, vel * 0.6, 0.05, 0.003);
  osc(g2, t, 'triangle', 420, 0.05, 0, 380);
};
/** Ride-cymbal-like ting: two quiet inharmonic sines with a short decay. */
const ride = (dest: AudioNode, t: number, vel = 0.012) => {
  const g = env(dest, t, vel, 0.12, 0.004);
  osc(g, t, 'sine', 3150, 0.12);
  osc(g, t, 'sine', 4730, 0.12);
};

// ---------- music

interface Chord { root: number; notes: number[] }
interface Style {
  bpm: number;
  swing: number; // where the off-beat eighth falls inside the beat (0.5 straight, 0.66 triplet swing)
  progressions: Chord[][];
  scale: number[]; // melody notes
  busy: number; // 0..1 how much the drums and melody play
}

// F major: ii-V-I-vi and IV-iii-ii-V, voiced as rootless 9ths/13ths in the middle of the keyboard
const HUB: Style = {
  bpm: 74,
  swing: 0.62,
  busy: 0.45,
  progressions: [
    [{ root: 43, notes: [58, 62, 65, 69] }, { root: 36, notes: [58, 62, 64, 69] }, { root: 41, notes: [57, 60, 64, 67] }, { root: 38, notes: [53, 57, 60, 64] }],
    [{ root: 46, notes: [57, 62, 65, 69] }, { root: 45, notes: [55, 60, 64, 67] }, { root: 43, notes: [53, 58, 62, 65] }, { root: 36, notes: [58, 62, 64, 67] }],
    [{ root: 41, notes: [57, 60, 64, 67] }, { root: 39, notes: [55, 58, 62, 65] }, { root: 38, notes: [53, 57, 60, 64] }, { root: 43, notes: [53, 58, 62, 65] }],
  ],
  scale: [65, 67, 69, 72, 74, 76, 77, 79],
};
let style: Style | null = null;
let currentName: 'hub' | null = null;
let timer: number | null = null;
let beatTime = 0;
let beat = 0; // beats since start
let prog: Chord[] = [];
function scheduleBeat(t: number) {
  const st = style!;
  const dest = musicIn!;
  const b = beat % 4; // beat in the bar
  const bar = Math.floor(beat / 4);
  if (bar % 4 === 0 && b === 0) prog = pick(st.progressions);
  const chord = prog[bar % 4];
  const next = prog[(bar + 1) % 4];
  const spb = 60 / st.bpm;
  const off = t + spb * st.swing; // the swung "and"
  const h = () => rnd(-0.008, 0.008); // humanise

  // electric piano: long chord on 1, sometimes a lighter push on the "and" of 2 or 4
  if (b === 0) chord.notes.forEach((n, i) => epiano(dest, t + i * 0.012 + h(), n, spb * 3.6, rnd(0.07, 0.09)));
  if ((b === 1 || b === 3) && Math.random() < 0.35) {
    const target = b === 3 ? next : chord;
    target.notes.forEach((n, i) => epiano(dest, off + i * 0.01 + h(), n, spb * 1.4, rnd(0.04, 0.055)));
  }

  // bass: root on 1, fifth or octave on 3, an approach note into the next chord on 4
  if (b === 0) bass(dest, t + h(), chord.root, spb * 1.8);
  if (b === 2) bass(dest, t + h(), chord.root + pick([7, 7, 12, 10]), spb * 1.6, 0.28);
  if (b === 3 && Math.random() < 0.5) bass(dest, off + h(), next.root + pick([-1, 1, 2]), spb * 0.5, 0.22);

  // drums: lazy kick, rim click on 2 and 4, a quiet swung ride
  if (b === 0) kick(dest, t + h(), 0.3);
  if (b === 2 && Math.random() < 0.5 + st.busy * 0.3) kick(dest, t + h(), 0.22);
  if (b === 1 && Math.random() < st.busy * 0.4) kick(dest, off + h(), 0.16);
  if (b === 1 || b === 3) rim(dest, t + h(), st.busy > 0.6 ? 0.05 : 0.038);
  ride(dest, t + h(), b % 2 ? 0.01 : 0.013);
  if (Math.random() < 0.3 + st.busy * 0.5) ride(dest, off + h(), 0.008);

  // vibes melody: sparse notes, more on the second half of every 2 bars
  const want = (bar % 2 === 1 ? 0.45 : 0.2) * (0.6 + st.busy * 0.5);
  if (Math.random() < want) {
    const tones = st.scale.filter((n) => chord.notes.some((c) => (n - c) % 12 === 0) || Math.random() < 0.4);
    const n = pick(tones.length ? tones : st.scale);
    vibes(dest, (Math.random() < 0.5 ? t : off) + h(), n, spb * rnd(0.8, 1.6));
    if (Math.random() < 0.3) vibes(dest, off + spb * 0.5 + h(), pick(st.scale), spb * 0.8, 0.05);
  }
}

// Notes are scheduled this far ahead. Web Audio plays scheduled notes on its own thread, so the music keeps
// going while the main thread is busy (simulating a week, saving, opening a popup or the season reel).
const LOOKAHEAD = 4;

function tick() {
  if (!ctx || !style) return;
  // after a very long stall, skip the beats that were missed instead of playing them all at once
  if (beatTime < ctx.currentTime) beatTime = ctx.currentTime + 0.05;
  while (beatTime < ctx.currentTime + LOOKAHEAD) {
    scheduleBeat(beatTime);
    beatTime += 60 / style.bpm;
    beat++;
  }
}

/**
 * Start the background music ('hub') or stop it (null). The music plays continuously across screens, popups, the
 * match report and the season reel; it only pauses when the app goes to the background (and is silent when muted).
 * Calling it again with the same name does nothing, so it never restarts.
 */
export function music(name: 'hub' | null) {
  if (name === currentName && (timer != null || !name)) return;
  currentName = name;
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
  style = name === 'hub' ? HUB : null;
  if (!style) return;
  const c = ensure();
  if (!c || c.state !== 'running') return; // starts on the first user gesture
  beat = 0;
  prog = pick(style.progressions);
  beatTime = c.currentTime + 0.1;
  timer = window.setInterval(tick, 60);
}

// ---------- effects

export type Sfx =
  | 'click' | 'tap' | 'confirm' | 'swipe' | 'page'
  | 'pop' | 'offer' | 'contract' | 'board' | 'achieve'
  | 'goal' | 'win' | 'loss' | 'fanfare' | 'coin' | 'cash' | 'build'
  | 'reveal' | 'stamp' | 'tick' | 'sparkle' | 'rain' | 'sad' | 'rise';

let lastTick = 0;

/** Lower the music a little under a popup or reel sound, then bring it back. Never stops it. */
function duck(c: AudioContext) {
  if (!musicGain) return;
  const g = musicGain.gain;
  const full = settings().music * 0.8;
  const now = c.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(full * 0.6, now + 0.05);
  g.setValueAtTime(full * 0.6, now + 0.6);
  g.linearRampToValueAtTime(full, now + 1.4);
}

export function sfx(name: Sfx) {
  const c = ensure();
  if (!c || c.state !== 'running' || settings().muted || !sfxGain || settings().sfx <= 0) return;
  const t = c.currentTime + 0.01;
  const d = sfxGain;
  if (name !== 'tick' && name !== 'tap' && name !== 'click') duck(c);
  const ep = (notes: number[], gap: number, dur = 0.6, vel = 0.14) => notes.forEach((n, i) => epiano(d, t + i * gap, n, dur, vel));
  switch (name) {
    case 'click': { const g = env(d, t, 0.06, 0.035, 0.003); osc(g, t, 'sine', 1500, 0.035, 0, 1100); break; }
    case 'tap': { const g = env(d, t, 0.045, 0.03, 0.002); osc(g, t, 'sine', 1100, 0.03, 0, 850); break; }
    case 'confirm': ep([72, 79], 0.05, 0.4, 0.12); break;
    case 'swipe': noiseHit(d, t, 0.18, 0.05, 'bandpass', 600, 1.2, 2400); break;
    case 'page': noiseHit(d, t, 0.32, 0.07, 'bandpass', 500, 1, 3000); epiano(d, t + 0.12, pick([76, 79, 81]), 0.5, 0.06); break;
    case 'pop': ep([67, 74, 79], 0.06, 0.7, 0.12); break;
    case 'offer': ep([79, 84, 88], 0.05, 0.5, 0.11); [0, 0.07, 0.14].forEach((k) => { const g = env(d, t + 0.18 + k, 0.05, 0.12, 0.002); osc(g, t + 0.18 + k, 'sine', 2600 + k * 4000, 0.12); }); break;
    case 'contract': noiseHit(d, t, 0.09, 0.08, 'bandpass', 3200, 1.5); noiseHit(d, t + 0.1, 0.12, 0.07, 'bandpass', 2600, 1.5); ep([64, 71], 0.08, 0.6, 0.1); break;
    case 'board': ep([57, 60, 64], 0.04, 0.9, 0.1); bass(d, t, 45, 0.6, 0.2); break;
    case 'achieve': ep([72, 76, 79, 83, 86], 0.07, 1.2, 0.12); [0.35, 0.45, 0.55].forEach((k, i) => vibes(d, t + k, [91, 95, 98][i], 0.6, 0.06)); break;
    case 'coin': ep([83, 88], 0.07, 0.3, 0.1); break;
    case 'cash': for (let i = 0; i < 7; i++) { const tt = t + i * 0.055 + rnd(0, 0.02); const g = env(d, tt, 0.05, 0.15, 0.002); osc(g, tt, 'sine', rnd(2400, 4200), 0.15); } ep([72, 79, 84], 0.04, 0.8, 0.09); break;
    case 'build': kick(d, t, 0.3); noiseHit(d, t + 0.12, 0.08, 0.06, 'bandpass', 1500); kick(d, t + 0.24, 0.25); ep([60, 64, 67, 72], 0.06, 0.6, 0.1); break;
    case 'goal': ep([72, 76, 79, 84], 0.06, 0.9, 0.14); noiseHit(d, t, 1.2, 0.06, 'bandpass', 1500, 0.4); break;
    case 'win': ep([67, 72, 76, 79], 0.07, 0.9, 0.13); break;
    case 'loss': ep([69, 65, 62], 0.14, 0.9, 0.12); break;
    case 'sad': ep([57, 60, 64], 0.02, 1.6, 0.1); ep([65, 62, 59], 0.3, 1.2, 0.08); bass(d, t, 38, 1.4, 0.2); break;
    case 'fanfare': {
      // a bright horn-ish line (filtered saw) over a rising chord, with a cymbal swell
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2400;
      f.connect(d);
      [67, 72, 76, 79, 84].forEach((n, i) => { const tt = t + i * 0.11; const g = env(f, tt, 0.08, i === 4 ? 1.1 : 0.22, 0.02); osc(g, tt, 'sawtooth', midi(n), i === 4 ? 1.1 : 0.22); osc(g, tt, 'sawtooth', midi(n), i === 4 ? 1.1 : 0.22, 8); });
      ep([60, 64, 67, 71, 74], 0.015, 1.6, 0.1);
      noiseHit(d, t, 1.4, 0.05, 'highpass', 6000, 0.3);
      kick(d, t + 0.44, 0.35);
      break;
    }
    case 'reveal': noiseHit(d, t, 0.5, 0.04, 'bandpass', 800, 0.8, 4000); ep([60, 67, 71, 74], 0.03, 1.1, 0.08); break;
    case 'stamp': kick(d, t, 0.55); noiseHit(d, t, 0.09, 0.12, 'bandpass', 700, 0.8); break;
    case 'tick': {
      if (c.currentTime - lastTick < 0.065) return;
      lastTick = c.currentTime;
      const g = env(d, t, 0.025, 0.02, 0.001);
      osc(g, t, 'sine', 2200, 0.02);
      break;
    }
    case 'sparkle': for (let i = 0; i < 6; i++) vibes(d, t + i * 0.08 + rnd(0, 0.03), pick([84, 86, 88, 91, 93, 96]), 0.5, 0.045); break;
    case 'rain': noiseHit(d, t, 2.6, 0.05, 'lowpass', 1400, 0.3); for (let i = 0; i < 10; i++) { const tt = t + rnd(0, 2); const g = env(d, tt, 0.02, 0.05, 0.002); osc(g, tt, 'sine', rnd(1800, 3500), 0.05); } break;
    case 'rise': noiseHit(d, t, 0.6, 0.04, 'bandpass', 400, 0.8, 3000); ep([65, 69, 72, 76], 0.08, 1, 0.1); break;
  }
}

// elements that count as buttons for the tap sound
const TAPPABLE = 'button, a, .item, .chip, .bench-p, .slot, .sq-sort, .fac-box, .reel-dots span, label, svg g[style*="pointer"]';

/** Browsers only allow audio after a gesture: unlock on the first tap, add tap sounds, and pause when hidden. */
export function installAudio() {
  if (typeof document === 'undefined') return;
  const unlock = () => {
    const c = ensure();
    if (c && c.state !== 'running') {
      void c.resume().then(() => {
        const n = currentName;
        currentName = null;
        if (n) music(n);
      });
    }
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement | null)?.closest?.(TAPPABLE) as HTMLElement | null;
    if (!el || el.closest('[data-nosfx]') || (el as HTMLButtonElement).disabled) return;
    sfx(el.tagName === 'BUTTON' || el.classList.contains('chip') ? 'click' : 'tap');
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend();
    else void ctx.resume().then(() => { if (style) beatTime = Math.max(beatTime, ctx!.currentTime + 0.1); });
  });
  store.subscribe(applyVolumes);
}
