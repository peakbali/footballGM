import { store } from './store';

/**
 * Web Audio sound engine (DESIGN 13.5). Everything is synthesised in the browser, so there are no audio files,
 * it works offline and the build stays small.
 *
 * Music is a generated lo-fi jazz loop: electric piano chords (7ths, 9ths, 13ths) with a lazy swing, a soft
 * upright-style bass, a soft kick and rim (tuned sine tones), a sparse vibraphone melody, all through a gentle
 * low-pass. It is generated beat by beat, so there is no audio file and no loop point to click.
 *
 * Clean by design (DESIGN 13.5a): nothing in the game uses noise. The room sound is a few filtered feedback echoes
 * (no noise-based reverb tail), there are no high cymbal tones, every voice is two sines at most, and a limiter on
 * the master keeps peaks from clipping or crackling on phones.
 *
 * Effects are short and soft, tuned to the same jazzy palette (see `Sfx`).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicIn: GainNode | null = null; // music instruments play into this: low-pass then musicGain
let lowpass: BiquadFilterNode | null = null;
let sfxGain: GainNode | null = null;
let reverb: GainNode | null = null; // input of the echo room
let musicVerb: GainNode | null = null;
let sfxVerb: GainNode | null = null;

function settings() {
  return store.state?.settings ?? { muted: false, music: 0.6, sfx: 0.8 };
}

/** A small, clean room: three filtered feedback echoes (no noise impulse, so no hiss in the tail). */
function room(c: BaseAudioContext, out: AudioNode): GainNode {
  const input = c.createGain();
  for (const [time, fb] of [[0.113, 0.32], [0.171, 0.28], [0.239, 0.24]] as const) {
    const dl = c.createDelay(1);
    dl.delayTime.value = time;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    const g = c.createGain();
    g.gain.value = fb;
    input.connect(dl);
    dl.connect(lp).connect(g).connect(dl); // feedback loop, darker on every pass
    const o = c.createGain();
    o.gain.value = 0.33;
    lp.connect(o).connect(out);
  }
  return input;
}

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) buildGraph(new AC());
  applyVolumes();
  return ctx;
}

/** Master chain: everything -> limiter -> speakers, plus the music filter and the echo room. */
function buildGraph(c: BaseAudioContext) {
  {
    ctx = c as AudioContext;
    master = c.createGain();
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter).connect(c.destination);
    reverb = room(c, master);

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

// ---------- instruments

/** Electric piano (Rhodes-like): a warm sine plus a short, soft octave on the attack. */
function epiano(dest: AudioNode, t: number, n: number, dur: number, vel = 0.12) {
  const f = midi(n);
  const g = env(dest, t, vel * 1.4, dur, 0.012);
  osc(g, t, 'sine', f, dur);
  const g2 = env(dest, t, vel * 0.22, Math.min(dur, 0.7), 0.008);
  osc(g2, t, 'sine', f * 2, Math.min(dur, 0.7));
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
/** Soft rim knock: one short, low, tuned sine (no noise, no high click). */
const rim = (dest: AudioNode, t: number, vel = 0.05) => {
  const g = env(dest, t, vel, 0.06, 0.004);
  osc(g, t, 'sine', 820, 0.06, 0, 700);
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

  // drums: lazy kick and a soft rim knock on 2 and 4 (no cymbals: high tones read as hiss on phone speakers)
  if (b === 0) kick(dest, t + h(), 0.3);
  if (b === 2 && Math.random() < 0.5 + st.busy * 0.3) kick(dest, t + h(), 0.22);
  if (b === 1 && Math.random() < st.busy * 0.4) kick(dest, off + h(), 0.16);
  if (b === 1 || b === 3) rim(dest, t + h(), 0.03);

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
  | 'reveal' | 'stamp' | 'tick' | 'sparkle' | 'rain' | 'sad' | 'rise'
  | 'cheer' | 'boo' | 'hmm';

// ---------- crowd (match results, DESIGN 13.2n): many voices, each a buzzy tone shaped by two vowel formants

/** Gain that follows [time offset, level] points (linear ramps), ending silent. */
function shape(dest: AudioNode, t: number, pts: [number, number][]) {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  for (const [dt, v] of pts) g.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + dt);
  g.connect(dest);
  return g;
}

/** One crowd voice: sawtooth at f0 (pitch follows `glide` multipliers over its length), vibrato, vowel formants. */
function crowdVoice(dest: AudioNode, t: number, f0: number, dur: number, vowel: [number, number], vol: number, glide: number[], attack: number, top = 1600) {
  const c = ctx!;
  // a low-pass after the vowel filters keeps the voices round and clear (no buzzy top end)
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = top;
  lp.Q.value = 0.5;
  lp.connect(dest);
  dest = lp;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0 * glide[0], t);
  glide.forEach((m, i) => { if (i) o.frequency.linearRampToValueAtTime(f0 * m, t + (dur * i) / (glide.length - 1)); });
  const vib = c.createOscillator();
  const vd = c.createGain();
  vib.frequency.value = rnd(4.5, 6.5);
  vd.gain.value = f0 * 0.015;
  vib.connect(vd).connect(o.frequency);
  const g = shape(dest, t, [[attack, vol], [dur * 0.7, vol * 0.8], [dur, 0]]);
  for (const [f, q, k] of [[vowel[0], 5, 1], [vowel[1], 7, 0.5]] as const) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * rnd(0.92, 1.08);
    bp.Q.value = q;
    const kg = c.createGain();
    kg.gain.value = k;
    o.connect(bp).connect(kg).connect(g);
  }
  o.start(t); vib.start(t);
  o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
}

/** The crowd is many quiet voices: this lifts the whole crowd to sit just above the music. */
function crowdBus(c: AudioContext, d: AudioNode) {
  const g = c.createGain();
  g.gain.value = 2.6;
  g.connect(d);
  return g;
}

/** One fan whistle: a pure sine that swoops (glide = [time fraction, frequency] points), with a little vibrato. */
function whistle(d: AudioNode, t: number, pts: [number, number][], dur: number, vol: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(pts[0][1], t);
  for (const [k, f] of pts.slice(1)) o.frequency.linearRampToValueAtTime(f, t + dur * k);
  const vib = c.createOscillator();
  const vd = c.createGain();
  vib.frequency.value = rnd(5, 7);
  vd.gain.value = 18;
  vib.connect(vd).connect(o.frequency);
  const g = shape(d, t, [[0.03, vol], [dur * 0.8, vol * 0.85], [dur, 0]]);
  o.connect(g);
  o.start(t); vib.start(t);
  o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
}

/** Win (DESIGN 13.5b): fans whistling over a soft, happy murmur. Pure tones only, no noise. */
function cheer(d: AudioNode, t: number) {
  // the classic two-note "wheet-whee-oo" wolf whistle, then two shorter whistles from elsewhere in the ground
  whistle(d, t + 0.05, [[0, 1500], [0.35, 2600], [0.45, 2300], [0.55, 1400], [0.8, 2500], [1, 1900]], 0.75, 0.05);
  whistle(d, t + 0.3, [[0, 2100], [0.6, 2900], [1, 2700]], 0.4, 0.035);
  whistle(d, t + 0.62, [[0, 1800], [0.5, 2400], [1, 2200]], 0.45, 0.03);
  for (let i = 0; i < 6; i++) {
    const st = t + rnd(0, 0.25);
    crowdVoice(d, st, rnd(170, 280), rnd(0.9, 1.3), [rnd(700, 800), rnd(1100, 1250)], 0.06, [0.95, 1.08, 1.02, 0.95], 0.25, 1000);
  }
}

/** Loss: a real low boo ("booo" vowel, pitch sagging), calmer and shorter than a stadium boo. */
function boo(d: AudioNode, t: number) {
  for (let i = 0; i < 10; i++) {
    const st = t + rnd(0, 0.3);
    crowdVoice(d, st, rnd(90, 150), rnd(1.2, 1.7), [rnd(280, 330), rnd(650, 760)], 0.1, [1, 1.02, 0.95, 0.85], 0.3, 850);
  }
}

/** Draw: a neutral, level "hmm" (closed mouth, no rise or fall). */
function hmm(d: AudioNode, t: number) {
  for (let i = 0; i < 5; i++) {
    const st = t + rnd(0, 0.2);
    crowdVoice(d, st, rnd(115, 145), rnd(0.8, 1.1), [rnd(230, 270), rnd(500, 580)], 0.1, [1, 1, 0.99], 0.15, 700);
  }
}

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
    case 'swipe': { const g = env(d, t, 0.035, 0.14, 0.01); osc(g, t, 'sine', 520, 0.14, 0, 780); break; }
    case 'page': { const g = env(d, t, 0.03, 0.2, 0.02); osc(g, t, 'sine', 440, 0.2, 0, 660); epiano(d, t + 0.1, pick([76, 79, 81]), 0.5, 0.05); break; }
    case 'pop': ep([67, 74, 79], 0.06, 0.7, 0.12); break;
    case 'offer': ep([79, 84, 88], 0.05, 0.5, 0.11); [0, 0.07, 0.14].forEach((k) => { const g = env(d, t + 0.18 + k, 0.05, 0.12, 0.002); osc(g, t + 0.18 + k, 'sine', 2600 + k * 4000, 0.12); }); break;
    case 'contract': ep([64, 71], 0.08, 0.6, 0.1); break;
    case 'board': ep([57, 60, 64], 0.04, 0.9, 0.1); bass(d, t, 45, 0.6, 0.2); break;
    case 'achieve': ep([72, 76, 79, 83, 86], 0.07, 1.2, 0.12); [0.35, 0.45, 0.55].forEach((k, i) => vibes(d, t + k, [91, 95, 98][i], 0.6, 0.06)); break;
    case 'coin': ep([83, 88], 0.07, 0.3, 0.1); break;
    case 'cash': for (let i = 0; i < 7; i++) { const tt = t + i * 0.055 + rnd(0, 0.02); const g = env(d, tt, 0.05, 0.15, 0.002); osc(g, tt, 'sine', rnd(2400, 4200), 0.15); } ep([72, 79, 84], 0.04, 0.8, 0.09); break;
    case 'build': kick(d, t, 0.25); kick(d, t + 0.24, 0.2); ep([60, 64, 67, 72], 0.06, 0.6, 0.09); break;
    case 'goal': ep([72, 76, 79, 84], 0.06, 0.9, 0.12); break;
    case 'win': ep([67, 72, 76], 0.09, 0.7, 0.12); break;
    case 'loss': ep([64, 60, 57], 0.16, 0.8, 0.11); break;
    case 'sad': ep([57, 60, 64], 0.02, 1.6, 0.1); ep([65, 62, 59], 0.3, 1.2, 0.08); bass(d, t, 38, 1.4, 0.2); break;
    case 'fanfare': {
      // a bright horn-ish line (filtered saw) over a rising chord, with a cymbal swell
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2400;
      f.connect(d);
      [67, 72, 76, 79, 84].forEach((n, i) => { const tt = t + i * 0.11; const g = env(f, tt, 0.08, i === 4 ? 1.1 : 0.22, 0.02); osc(g, tt, 'sawtooth', midi(n), i === 4 ? 1.1 : 0.22); osc(g, tt, 'sawtooth', midi(n), i === 4 ? 1.1 : 0.22, 8); });
      ep([60, 64, 67, 71, 74], 0.015, 1.6, 0.1);
      kick(d, t + 0.44, 0.35);
      break;
    }
    case 'reveal': ep([60, 67, 71, 74], 0.03, 1.1, 0.08); break;
    case 'stamp': kick(d, t, 0.4); { const g = env(d, t, 0.05, 0.08, 0.003); osc(g, t, 'sine', 300, 0.08, 0, 200); } break;
    case 'tick': {
      if (c.currentTime - lastTick < 0.065) return;
      lastTick = c.currentTime;
      const g = env(d, t, 0.025, 0.02, 0.001);
      osc(g, t, 'sine', 2200, 0.02);
      break;
    }
    case 'sparkle': for (let i = 0; i < 6; i++) vibes(d, t + i * 0.08 + rnd(0, 0.03), pick([84, 86, 88, 91, 93, 96]), 0.5, 0.045); break;
    case 'rain': for (let i = 0; i < 10; i++) { const tt = t + rnd(0, 2); const g = env(d, tt, 0.02, 0.05, 0.002); osc(g, tt, 'sine', rnd(1800, 3500), 0.05); } break;
    case 'rise': ep([65, 69, 72, 76], 0.08, 1, 0.1); break;
    case 'cheer': cheer(crowdBus(c, d), t); break;
    case 'boo': boo(crowdBus(c, d), t); break;
    case 'hmm': hmm(crowdBus(c, d), t); break;
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

/**
 * Render a few seconds of music or one effect offline, for listening tests (scripts/audio-samples.cjs).
 * It builds a separate graph on an OfflineAudioContext and puts the live one back afterwards.
 */
export async function renderPreview(what: 'music' | Sfx, secs: number, rate = 44100): Promise<AudioBuffer> {
  const saved = { ctx, master, musicGain, musicIn, lowpass, sfxGain, reverb, musicVerb, sfxVerb, style, beat, beatTime, prog, lastMusic };
  const oc = new OfflineAudioContext(2, Math.ceil(secs * rate), rate);
  buildGraph(oc);
  const st = settings();
  master!.gain.value = 0.55;
  musicGain!.gain.value = st.music * 0.8 || 0.48;
  musicVerb!.gain.value = (st.music || 0.6) * 0.12;
  sfxGain!.gain.value = (st.sfx || 0.8) * 0.6;
  if (what === 'music') {
    style = HUB; beat = 0; prog = pick(HUB.progressions); beatTime = 0.05;
    while (beatTime < secs - 0.5) { scheduleBeat(beatTime); beatTime += 60 / HUB.bpm; beat++; }
  } else {
    // sfx() only plays on a running context; an offline one reports 'suspended' until it renders
    Object.defineProperty(oc, 'state', { get: () => 'running' });
    sfx(what);
  }
  const buf = await oc.startRendering();
  ({ ctx, master, musicGain, musicIn, lowpass, sfxGain, reverb, musicVerb, sfxVerb, style, beat, beatTime, prog, lastMusic } = saved);
  return buf;
}
