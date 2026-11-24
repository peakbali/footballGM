import { useEffect, useRef, useState } from 'preact/hooks';
import { FORMATIONS } from '../../core/data/formations';
import type { GameState } from '../../core/state';
import type { Club, Fixture, MatchEvent, MatchReport } from '../../core/types';
import { Card } from '../components';
import { nav, useStore } from '../store';
import { registerMatchExtra } from '../matchExtras';
import { registerOverlay } from '../overlays';
import { sfx } from '../audio';

/**
 * Watch mode (DESIGN 13.4): top-down pixel pitch on Canvas, highlights only (chances, goals, cards),
 * commentary ticker and live stats. Speed 1x/2x/4x and skip to the end.
 */

const W = 192, H = 124; // logical pixels, scaled up crisply
const PX = 8, PY = 8, PW = W - 16, PH = H - 16; // pitch rectangle

type Phase = { e: MatchEvent; start: number; dur: number };
const HIGHLIGHT = new Set(['goal', 'pen', 'save', 'miss', 'yellow', 'red', 'injury', 'sub']);

function kitColors(home: Club, away: Club): [string, string] {
  const h = home.colors[0];
  const a = away.colors[0].toLowerCase() === h.toLowerCase() ? away.colors[1] : away.colors[0];
  return [h, a];
}

function commentary(s: GameState, e: MatchEvent, home: Club, away: Club): string {
  const n = (id?: number) => {
    const p = id != null ? s.players.get(id) : undefined;
    return p ? p.last : 'a player';
  };
  const club = e.c === home.id ? home.short : away.short;
  const pick = (a: string[]) => a[(e.m * 7 + (e.p ?? 0)) % a.length];
  switch (e.t) {
    case 'goal':
      return pick([`GOAL! ${n(e.p)} scores for ${club}!`, `GOAL! ${n(e.p)} finds the corner!`, `GOAL! ${n(e.p)} makes no mistake!`]) + (e.p2 ? ` Set up by ${n(e.p2)}.` : '');
    case 'pen':
      return `PENALTY... and ${n(e.p)} scores!`;
    case 'save':
      return pick([`${n(e.p)} shoots, and ${e.p2 ? n(e.p2) : 'the keeper'} saves!`, `Big chance for ${n(e.p)}, but it's kept out.`, `${n(e.p)} tests the keeper.`]);
    case 'miss':
      return pick([`${n(e.p)} drags it wide.`, `${n(e.p)} blazes over the bar!`, `So close from ${n(e.p)}!`]);
    case 'yellow':
      return `Yellow card for ${n(e.p)} (${club}).`;
    case 'red':
      return `RED CARD! ${n(e.p)} is off. ${club} down to ten.`;
    case 'injury':
      return `${n(e.p)} is down injured.`;
    case 'sub':
      return `${club} change: ${n(e.p)} replaces ${n(e.p2)}.`;
    default:
      return '';
  }
}

interface Live {
  goals: [number, number];
  shots: [number, number];
  onT: [number, number];
  cards: [number, number];
}

function Watch({ fixtureId }: { fixtureId: number }) {
  const s = useStore().state!;
  const f = s.fixtures.find((x) => x.id === fixtureId)!;
  const rep = s.reports.get(fixtureId) as MatchReport;
  const home = s.clubs[f.home];
  const away = s.clubs[f.away];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  speedRef.current = speed;
  const [minute, setMinute] = useState(0);
  const [lines, setLines] = useState<{ m: number; txt: string; t: string }[]>([]);
  const [live, setLive] = useState<Live>({ goals: [0, 0], shots: [0, 0], onT: [0, 0], cards: [0, 0] });
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const [hc, ac] = kitColors(home, away);
    const events = rep.events.filter((e) => HIGHLIGHT.has(e.t)).sort((a, b) => a.m - b.m);
    const slots = [FORMATIONS[home.formation] ?? FORMATIONS['4-4-2'], FORMATIONS[away.formation] ?? FORMATIONS['4-4-2']];
    // match clock: 90 minutes take 24s at 1x; highlights pause the clock for 2.2s
    const MIN_MS = 260;
    const HL_MS = 2200;
    let t = 0; // simulated ms
    let clock = 0; // minutes
    let idx = 0;
    let phase: Phase | null = null;
    let last = performance.now();
    let raf = 0;
    let flash = 0;
    let ball = { x: W / 2, y: H / 2 };
    let poss = 0; // side in possession for the idle drift
    const lv: Live = { goals: [0, 0], shots: [0, 0], onT: [0, 0], cards: [0, 0] };
    const out: { m: number; txt: string; t: string }[] = [];

    const toPx = (side: number, sx: number, sy: number, push: number) => {
      // side 0 attacks right, side 1 attacks left; sy 0 = own goal, 100 = opponent goal
      const depth = Math.min(100, sy + push);
      const x = side === 0 ? PX + (depth / 100) * PW * 0.5 + 2 : PX + PW - (depth / 100) * PW * 0.5 - 2;
      const y = PY + (sx / 100) * PH;
      return { x, y };
    };

    const apply = (e: MatchEvent) => {
      const side = e.c === home.id ? 0 : 1;
      if (e.t === 'goal' || e.t === 'pen') { lv.goals[side]++; lv.shots[side]++; lv.onT[side]++; }
      if (e.t === 'save') { lv.shots[side]++; lv.onT[side]++; }
      if (e.t === 'miss') lv.shots[side]++;
      if (e.t === 'yellow' || e.t === 'red') lv.cards[side]++;
      out.unshift({ m: e.m, txt: commentary(s, e, home, away), t: e.t });
    };

    const draw = (now: number) => {
      // background + pitch stripes
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? '#1d7a48' : '#208651';
        ctx.fillRect(PX + (i * PW) / 12, PY, PW / 12 + 1, PH);
      }
      ctx.strokeStyle = 'rgba(232,236,255,0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(PX + 0.5, PY + 0.5, PW - 1, PH - 1);
      ctx.beginPath();
      ctx.moveTo(W / 2 + 0.5, PY);
      ctx.lineTo(W / 2 + 0.5, PY + PH);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(PX + 0.5, H / 2 - 20.5, 20, 41);
      ctx.strokeRect(PX + PW - 20.5, H / 2 - 20.5, 20, 41);
      ctx.fillStyle = '#e8ecff';
      ctx.fillRect(PX - 3, H / 2 - 7, 3, 14);
      ctx.fillRect(PX + PW, H / 2 - 7, 3, 14);

      // phase progress
      let attack = -1;
      let prog = 0;
      if (phase) {
        prog = Math.min(1, (t - phase.start) / phase.dur);
        if (['goal', 'pen', 'save', 'miss'].includes(phase.e.t)) attack = phase.e.c === home.id ? 0 : 1;
      }
      // players
      const wob = now / 600;
      for (let side = 0; side < 2; side++) {
        const push = attack === side ? 18 * Math.sin(Math.min(1, prog * 1.6) * Math.PI / 2) : attack === 1 - side ? -6 : (poss === side ? 6 : -2);
        slots[side].forEach((sl, i) => {
          const p = toPx(side, sl.x, sl.y, sl.pos === 'GK' ? 0 : push);
          const dx = Math.sin(wob + i * 1.7 + side) * 1.5;
          const dy = Math.cos(wob * 0.8 + i * 2.3) * 1.5;
          const x = Math.round(p.x + dx), y = Math.round(p.y + dy);
          ctx.fillStyle = '#000';
          ctx.fillRect(x - 1, y + 2, 4, 1);
          ctx.fillStyle = sl.pos === 'GK' ? (side ? '#35c0c0' : '#9b5de5') : side ? ac : hc;
          ctx.fillRect(x - 1, y - 2, 3, 4);
          ctx.fillStyle = '#f1c27d';
          ctx.fillRect(x, y - 3, 1, 1);
        });
      }
      // ball
      let target = { x: W / 2 + Math.sin(now / 900) * 30 * (poss ? -1 : 1), y: H / 2 + Math.cos(now / 700) * 20 };
      if (phase && attack >= 0) {
        const e = phase.e;
        const gx = attack === 0 ? PX + PW + 1 : PX - 2;
        const shot = { x: attack === 0 ? PX + PW * (0.5 + ((e.y ?? 85) / 100) * 0.5) - 14 : PX + PW * (0.5 - ((e.y ?? 85) / 100) * 0.5) + 14, y: PY + ((e.x ?? 50) / 100) * PH };
        const goalY = H / 2 + ((e.x ?? 50) - 50) / 12;
        if (prog < 0.55) {
          const k = prog / 0.55;
          target = { x: W / 2 + (shot.x - W / 2) * k, y: H / 2 + (shot.y - H / 2) * k + Math.sin(k * Math.PI * 2) * 8 };
        } else {
          const k = Math.min(1, (prog - 0.55) / 0.2);
          const end = e.t === 'miss' ? { x: gx, y: goalY + (goalY > H / 2 ? 14 : -14) } : e.t === 'save' ? { x: gx + (attack === 0 ? -6 : 6), y: goalY } : { x: gx, y: goalY };
          target = { x: shot.x + (end.x - shot.x) * k, y: shot.y + (end.y - shot.y) * k };
          if (e.t === 'save' && k >= 1) target = { x: end.x + (attack === 0 ? -10 : 10) * (prog - 0.75) * 4, y: end.y + 8 * (prog - 0.75) * 4 };
        }
      }
      ball.x += (target.x - ball.x) * (phase ? 0.35 : 0.08);
      ball.y += (target.y - ball.y) * (phase ? 0.35 : 0.08);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(Math.round(ball.x), Math.round(ball.y) + 2, 2, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(ball.x), Math.round(ball.y), 2, 2);

      // goal flash
      if (flash > now) {
        ctx.fillStyle = `rgba(255,204,77,${((flash - now) / 1200) * 0.35})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffcc4d';
        ctx.font = '16px Silkscreen, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', W / 2, H / 2 - 18);
      }
      if (phase && (phase.e.t === 'yellow' || phase.e.t === 'red')) {
        ctx.fillStyle = phase.e.t === 'red' ? '#ff5a5f' : '#ffcc4d';
        ctx.fillRect(W / 2 - 4, PY + 4, 8, 11);
      }
    };

    const step = (now: number) => {
      const dt = Math.min(100, now - last) * speedRef.current;
      last = now;
      if (skipRef.current) {
        while (idx < events.length) apply(events[idx++]);
        clock = 90;
        phase = null;
      } else if (phase) {
        t += dt;
        if (t >= phase.start + phase.dur) phase = null;
      } else if (clock < 90) {
        t += dt;
        clock = Math.min(90, clock + dt / MIN_MS);
        if (Math.floor(clock) % 9 === 0) poss = Math.floor(clock / 9) % 2;
        if (idx < events.length && events[idx].m <= clock) {
          const e = events[idx++];
          const big = ['goal', 'pen', 'save', 'miss'].includes(e.t);
          phase = { e, start: t, dur: big ? HL_MS : 900 };
          apply(e);
          if (e.t === 'goal' || e.t === 'pen') {
            flash = now + 1200 / speedRef.current;
            if (e.c === s.userClubId) sfx('goal');
          }
        }
      }
      draw(now);
      setMinute(Math.floor(clock));
      setLive({ goals: [...lv.goals] as [number, number], shots: [...lv.shots] as [number, number], onT: [...lv.onT] as [number, number], cards: [...lv.cards] as [number, number] });
      setLines(out.slice(0, 40));
      if (clock >= 90 && !phase) {
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fixtureId]);

  const [hc, ac] = kitColors(home, away);
  return (
    <div class="overlay watch">
      <div class="topbar">
        <button class="back" onClick={() => nav.pop()}>‹</button>
        <div class="title" style={{ flex: 1 }}>Watch</div>
        <div class="seg" style={{ margin: 0 }}>
          {[1, 2, 4].map((k) => <button key={k} class={speed === k ? 'on' : ''} onClick={() => setSpeed(k)}>{k}×</button>)}
        </div>
        <button class="btn small" disabled={done} onClick={() => { skipRef.current = true; }}>Skip</button>
      </div>
      <div class="watch-score">
        <span class="kit" style={{ background: hc }} />
        <b>{home.abbrev}</b>
        <span class="sc">{live.goals[0]}-{live.goals[1]}</span>
        <b>{away.abbrev}</b>
        <span class="kit" style={{ background: ac }} />
        <span class="clock">{done ? 'FT' : `${minute}'`}</span>
      </div>
      <canvas ref={canvas} width={W} height={H} class="watch-canvas" />
      <div class="watch-stats tiny">
        <span>{live.shots[0]}</span><span class="dim">Shots</span><span>{live.shots[1]}</span>
        <span>{live.onT[0]}</span><span class="dim">On target</span><span>{live.onT[1]}</span>
        <span>{live.cards[0]}</span><span class="dim">Cards</span><span>{live.cards[1]}</span>
      </div>
      <div class="watch-ticker">
        {done && <div class="small"><b>Full time: {home.short} {f.hg}-{f.ag} {away.short}</b>{f.pens ? ` (pens ${f.pens})` : ''}</div>}
        {lines.length === 0 && <div class="dim small">Kick-off at {home.stadium}.</div>}
        {lines.map((l, i) => (
          <div key={lines.length - i} class={`small ${l.t === 'goal' || l.t === 'pen' ? 'gold' : l.t === 'red' ? 'red' : ''}`}><span class="dim">{l.m}'</span> {l.txt}</div>
        ))}
      </div>
    </div>
  );
}

registerOverlay('watch', (d) => <Watch fixtureId={d as number} />);

registerMatchExtra((s, f: Fixture) => {
  if (!s.reports.has(f.id) || f.hg == null) return null;
  const mine = f.home === s.userClubId || f.away === s.userClubId;
  return (
    <Card>
      <button class={`btn block ${mine ? 'gold' : ''}`} onClick={() => nav.push({ kind: 'custom', key: 'watch', data: f.id })}>▶ Watch highlights</button>
    </Card>
  );
});
