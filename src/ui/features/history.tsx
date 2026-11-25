import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../../core/state';
import { ordinal } from '../../core/season';
import { approvalLabel, boardState, goalStatus, predictedFinish } from '../../core/systems/board';
import { records, seasons, topScorerAllTime, type UserSeason } from '../../core/systems/chronicle';
import { ROUND_NAMES } from '../../core/systems/cup';
import { Badge, Card, Overlay } from '../components';
import { money, nav, store, useStore } from '../store';
import { registerClubSection } from './clubSections';
import { registerOverlay } from '../overlays';
import { sfx } from '../audio';
import { CardArt, type ArtKey } from '../cardArt';
import { Portrait } from '../portrait';
import { CUP_NAME } from '../../core/edition';

// ---------- chart: one measure per chart, all seasons, tap a point for its value

export function HistoryChart({ title, data, fmt = (v) => String(v), invert = false, color = 'var(--gold)' }: { title: string; data: { s: number; v: number }[]; fmt?: (v: number) => string; invert?: boolean; color?: string }) {
  const [sel, setSel] = useState<number | null>(null);
  if (!data.length) return null;
  const W = 300, H = 92, padL = 4, padR = 4, padT = 14, padB = 14;
  const vals = data.map((d) => d.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const x = (i: number) => (data.length === 1 ? W / 2 : padL + (i / (data.length - 1)) * (W - padL - padR));
  const y = (v: number) => {
    const t = (v - lo) / (hi - lo);
    return padT + (invert ? t : 1 - t) * (H - padT - padB);
  };
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join('');
  const cur = sel ?? data.length - 1;
  return (
    <div class="hchart">
      <div class="between tiny"><span class="dim">{title}</span><span><b>{fmt(data[cur].v)}</b> <span class="dim">{data[cur].s}/{String(data[cur].s + 1).slice(2)}</span></span></div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} onPointerLeave={() => setSel(null)}>
        {[0, 0.5, 1].map((t) => <line key={t} x1={0} x2={W} y1={padT + t * (H - padT - padB)} y2={padT + t * (H - padT - padB)} stroke="var(--line)" stroke-width="1" />)}
        <text x={2} y={padT - 3} class="axis">{fmt(invert ? lo : hi)}</text>
        <text x={2} y={H - 2} class="axis">{fmt(invert ? hi : lo)}</text>
        {data.length > 1 && <path d={path} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" />}
        {data.map((d, i) => (
          <g key={d.s} onPointerEnter={() => setSel(i)} onClick={() => setSel(i)}>
            <rect x={x(i) - 12} y={0} width={24} height={H} fill="transparent" />
            <rect x={x(i) - (i === cur ? 4 : 3)} y={y(d.v) - (i === cur ? 4 : 3)} width={i === cur ? 8 : 6} height={i === cur ? 8 : 6} fill={i === cur ? 'var(--flood)' : color} stroke="var(--panel)" stroke-width="2" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Overall pyramid rank: 1 = champions of division 1. Lower is better. */
const pyramidRank = (u: UserSeason) => (u.div - 1) * 20 + u.pos;
const fmtRank = (v: number) => `D${Math.floor((v - 1) / 20) + 1} ${ordinal(((v - 1) % 20) + 1)}`;

function Graphs({ list }: { list: UserSeason[] }) {
  return (
    <>
      <HistoryChart title="League level (pyramid position)" data={list.map((u) => ({ s: u.season, v: pyramidRank(u) }))} fmt={fmtRank} invert color="var(--gold)" />
      <HistoryChart title="Points" data={list.map((u) => ({ s: u.season, v: u.pts }))} color="var(--pitch)" />
      <HistoryChart title="Average attendance" data={list.map((u) => ({ s: u.season, v: u.avgAtt }))} fmt={(v) => Math.round(v).toLocaleString()} color="var(--blue)" />
      <HistoryChart title="Revenue" data={list.map((u) => ({ s: u.season, v: u.income }))} fmt={money} color="var(--green)" />
      <HistoryChart title="Best XI average OVR" data={list.map((u) => ({ s: u.season, v: u.avgOvr }))} fmt={(v) => v.toFixed(1)} color="var(--amber)" />
    </>
  );
}

// ---------- end-of-season reel
// Each page has its own mood (background, pixel scene, particles, reveal) so the reel feels like a show, not a list.

const OUTCOME: Record<string, [string, string]> = {
  champion: ['CHAMPIONS!', 'gold'],
  promoted: ['PROMOTED!', 'green'],
  playoff_winner: ['PROMOTED VIA PLAYOFFS!', 'green'],
  relegated: ['RELEGATED', 'red'],
  stayed: ['SEASON COMPLETE', ''],
};

/** Counts up from 0 to the target, so numbers land with a bit of drama. */
function useCount(target: number, ms = 900, delay = 0): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf = 0;
    let t0 = 0;
    const t = setTimeout(() => {
      const step = (now: number) => {
        if (!t0) t0 = now;
        const k = Math.min(1, (now - t0) / ms);
        setV(Math.round(target * (1 - (1 - k) * (1 - k))));
        if (k < 1 && target) sfx('tick'); // counter ticks (throttled in the sound engine)
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target]);
  return v;
}

const CONFETTI = ['#ffcc4d', '#e0525a', '#38b26a', '#5a78e0', '#ffffff', '#e8803a'];
/** Falling pixel particles: confetti, coins, rain, sparkles. Pure CSS, positions are fixed so it is cheap. */
function Fx({ kind, n = 22 }: { kind: 'confetti' | 'coins' | 'rain' | 'stars' | 'embers'; n?: number }) {
  return (
    <div class={`fx fx-${kind}`} aria-hidden="true">
      {Array.from({ length: n }, (_, k) => (
        <span
          key={k}
          style={{ '--x': `${(k * 37 + 11) % 100}%`, '--d': `${((k * 53) % 17) / 10 + (kind === 'rain' ? 0.5 : 1.8)}s`, '--w': `${((k * 29) % 23) / 10}s`, '--c': kind === 'confetti' ? CONFETTI[k % CONFETTI.length] : kind === 'coins' ? '#ffcc4d' : kind === 'rain' ? '#6f7fb0' : kind === 'embers' ? '#ff9640' : '#fff6c0', '--s': `${3 + (k % 3) * 2}px` } as never}
        />
      ))}
    </div>
  );
}

function Banner({ art, h = 110 }: { art: ArtKey; h?: number }) {
  return <div class="reel-banner" style={{ height: h }}><CardArt art={art} wide /></div>;
}

const MOOD = ['m-result', 'm-board', 'm-stars', 'm-money', 'm-verdict', 'm-chart', 'm-records', 'm-next'];

function Stat({ n, label, fmt = (v: number) => v.toLocaleString(), k }: { n: number; label: string; fmt?: (v: number) => string; k: number }) {
  const v = useCount(n, 900, k * 110);
  return <div class="stat" style={{ '--n': k } as never}><b>{fmt(v)}</b><span>{label}</span></div>;
}

function Bar({ label, value, max, tone, text }: { label: string; value: number; max: number; tone: string; text: string }) {
  return (
    <div class="mbar">
      <div class="between small"><span>{label}</span><b class={tone}>{text}</b></div>
      <div class="mbar-track"><i class={tone} style={{ '--w': `${Math.max(4, Math.round((value / Math.max(1, max)) * 100))}%` } as never} /></div>
    </div>
  );
}

function ReelCard({ i, s, u }: { i: number; s: GameState; u: UserSeason }) {
  const user = s.clubs[s.userClubId];
  const all = seasons(s);
  const R = records(s);
  switch (i) {
    case 0: {
      const [txt, cls] = OUTCOME[u.outcome ?? 'stayed'];
      const up = u.outcome === 'champion' || u.outcome === 'promoted' || u.outcome === 'playoff_winner';
      const me = u.table.findIndex((r) => r.id === user.id);
      const from = Math.max(0, Math.min(me - 3, u.table.length - 7));
      const rows = u.table.slice(from, from + 7);
      const pos = useCount(u.pos, 700, 500);
      const prize = useCount(u.prize ?? 0, 1400, 1300);
      return (
        <div class={`reel-body pg0 ${up ? 'up' : u.outcome === 'relegated' ? 'down' : ''}`}>
          {up && <div class="rays" aria-hidden="true" />}
          {up ? <Fx kind="confetti" n={28} /> : u.outcome === 'relegated' ? <Fx kind="rain" n={26} /> : null}
          <div class="reel-kicker">{u.league}</div>
          <div class="badge-slam"><Badge club={user} size={84} /></div>
          <div class={`reel-big slam ${cls}`}>{txt}</div>
          <div class="reel-hero">{ordinal(pos || 1)}</div>
          <div class="dim small">{u.pts} points · {u.w}W {u.d}D {u.l}L</div>
          <table class="tbl rise" style={{ marginTop: 12 }}>
            <tbody>
              {rows.map((r) => {
                const p = u.table.indexOf(r) + 1;
                return <tr key={r.id} class={r.id === user.id ? 'me' : ''}><td class="l dim">{p}</td><td class="l club">{r.short}</td><td class="dim">{r.gd > 0 ? `+${r.gd}` : r.gd}</td><td><b>{r.pts}</b></td></tr>;
              })}
            </tbody>
          </table>
          {u.prize != null && (
            <div class="prize-cheque">
              <Fx kind="coins" n={14} />
              <span class="tiny">League prize money · {ordinal(u.pos)} place</span>
              <b>+{money(prize)}</b>
            </div>
          )}
        </div>
      );
    }
    case 1:
      return (
        <div class="reel-body pg1">
          <Banner art="scoreboard" h={96} />
          <div class="reel-kicker led">By the numbers</div>
          <div class="reel-grid led-grid">
            <Stat k={0} n={u.gf} label="goals scored" />
            <Stat k={1} n={u.ga} label="conceded" />
            <Stat k={2} n={u.pts} label="points" />
            <Stat k={3} n={u.cs} label="clean sheets" />
            <Stat k={4} n={u.avgAtt} label="avg attendance" />
            <Stat k={5} n={u.bestAtt} label="best crowd" />
          </div>
          {u.bigWin && <div class="strip" style={{ '--n': 6 } as never}>⚽ Biggest win <b class="gold">{u.bigWin.text}</b></div>}
          {u.cup && <div class="strip" style={{ '--n': 7 } as never}>🏆 {CUP_NAME} <b class={u.cup.won ? 'gold' : ''}>{u.cup.text}</b></div>}
        </div>
      );
    case 2: {
      const st = u.stars;
      const row = (k: number, label: string, h: typeof st.pots, unit: string, icon: string) => {
        if (!h) return null;
        const p = s.players.get(h.id);
        return (
          <div class="star" style={{ '--n': k } as never} onClick={() => p && nav.push({ kind: 'player', id: h.id })}>
            <div class="star-pic">{p ? <Portrait p={p} size={56} /> : <span class="star-ico">{icon}</span>}</div>
            <div class="star-txt">
              <span class="star-tag">{icon} {label}</span>
              <div class="name">{h.name} <span class="tiny dim">{h.pos}</span></div>
              <div class="gold small">{unit === '+' ? `+${h.value} OVR` : `${h.value} ${unit}`}</div>
            </div>
            <span class="star-go">›</span>
          </div>
        );
      };
      return (
        <div class="reel-body pg2">
          <Fx kind="stars" n={18} />
          <div class="spot" aria-hidden="true" />
          <div class="reel-kicker gold">★ Stars of the season ★</div>
          {row(0, 'Player of the season', st.pots, 'avg rating', '👑')}
          {row(1, 'Top scorer', st.scorer, 'goals', '⚽')}
          {row(2, 'Young player', st.young, 'avg rating', '🌱')}
          {row(3, 'Breakthrough', st.breakthrough, '+', '🚀')}
          {!st.pots && !st.scorer && <div class="dim small">No standout players this year.</div>}
        </div>
      );
    }
    case 3: {
      const mx = Math.max(u.income, u.costs, 1);
      const profit = u.cashEnd - u.cashStart;
      return (
        <div class="reel-body pg3">
          <Fx kind="coins" n={16} />
          <Banner art="money" h={90} />
          <div class="reel-kicker gold">Money</div>
          <Bar label="Income" value={u.income} max={mx} tone="green" text={money(u.income)} />
          <Bar label="Costs" value={u.costs} max={mx} tone="red" text={money(u.costs)} />
          <div class="vault rise">
            <span class="tiny dim">{profit >= 0 ? 'Season profit' : 'Season loss'}</span>
            <b class={profit >= 0 ? 'green' : 'red'}>{profit >= 0 ? '+' : '−'}{money(Math.abs(profit))}</b>
            <span class="tiny dim">{money(u.cashStart)} → {money(u.cashEnd)}</span>
          </div>
          <div class="kv" style={{ marginTop: 12, textAlign: 'left' }}>
            {u.prize != null && <><span>League prize money</span><span class="gold">+{money(u.prize)}</span></>}
            <span>Biggest signing</span><span>{u.topSigning ? `${u.topSigning.name}, ${money(u.topSigning.fee)}` : 'None'}</span>
            <span>Biggest sale</span><span>{u.topSale ? `${u.topSale.name}, ${money(u.topSale.fee)}` : 'None'}</span>
          </div>
        </div>
      );
    }
    case 4: {
      const b = u.board;
      const approval = useCount(b?.after ?? 0, 1000, 300);
      const good = b ? b.after >= 45 : true;
      return (
        <div class={`reel-body pg4 ${good ? '' : 'stern'}`}>
          <Banner art="board" h={96} />
          <div class="reel-kicker">The board has spoken</div>
          {b ? (
            <>
              <div class="reel-big slam">{approvalLabel(b.after)}</div>
              <div class="dial"><b>{approval}</b><span class="tiny dim">approval</span></div>
              <Meter value={approval} />
              <div class="small dim">Was {b.before} → <b class={b.after >= b.before ? 'green' : 'red'}>{b.after >= b.before ? '▲' : '▼'} {Math.abs(b.after - b.before)}</b></div>
              <div class="goals">
                {b.goals.map((g, k) => <div class={`goal ${g.met ? 'ok' : 'no'}`} style={{ '--n': k + 2 } as never} key={g.text}><span class="stamp">{g.met ? '✓' : '✗'}</span><span class="small">{g.text}</span></div>)}
              </div>
              {(b.cash > 0 || b.discount > 0) && <div class="reward rise">🎁 {b.cash > 0 ? `${money(b.cash)} bonus` : ''}{b.cash > 0 && b.discount ? ' and ' : ''}{b.discount ? '20% off your next facility build' : ''}</div>}
            </>
          ) : <div class="dim small">The board had no goals this season.</div>}
        </div>
      );
    }
    case 5:
      return (
        <div class="reel-body pg5" style={{ textAlign: 'left' }}>
          <div class="reel-kicker cyan" style={{ textAlign: 'center' }}>History · {all.length} season{all.length === 1 ? '' : 's'}</div>
          <Graphs list={all} />
        </div>
      );
    case 6: {
      const top = topScorerAllTime(s);
      return (
        <div class="reel-body pg6">
          <Fx kind="stars" n={14} />
          <Banner art="trophy" h={110} />
          <div class="reel-kicker gold">Hall of records</div>
          {u.records.length ? u.records.map((r, k) => <div class="medal" style={{ '--n': k } as never} key={r}><span class="medal-ico">★</span>{r}</div>) : <div class="dim small">{all.length === 1 ? 'Your first season sets the benchmarks.' : 'No new club records this time.'}</div>}
          <div class="kv" style={{ marginTop: 14, textAlign: 'left' }}>
            {R.pts && <><span>Most points</span><span>{R.pts.v} ({R.pts.season})</span></>}
            {R.goals && <><span>Most goals</span><span>{R.goals.name}, {R.goals.v}</span></>}
            {top && <><span>All-time scorer</span><span>{top.name}, {top.goals}</span></>}
            {R.attendance && <><span>Best crowd</span><span>{R.attendance.v.toLocaleString()}</span></>}
            {R.signing && <><span>Record signing</span><span>{R.signing.name}, {money(R.signing.v)}</span></>}
            {R.sale && <><span>Record sale</span><span>{R.sale.name}, {money(R.sale.v)}</span></>}
            {R.cup && <><span>Best {CUP_NAME} run</span><span>{R.cup.won ? `Winners (${R.cup.season})` : `${ROUND_NAMES[R.cup.reached] ?? 'Entry'} (${R.cup.season})`}</span></>}
          </div>
        </div>
      );
    }
    default: {
      const nextDiv = u.outcome === 'champion' || u.outcome === 'promoted' || u.outcome === 'playoff_winner' ? Math.max(1, u.div - 1) : u.outcome === 'relegated' ? Math.min(10, u.div + 1) : u.div;
      const expiring = [...s.players.values()].filter((p) => p.clubId === user.id && !p.academy && p.contract?.type === 'permanent' && p.contract.endSeason === u.season);
      return (
        <div class="reel-body pg7">
          <div class="sunrise" aria-hidden="true"><i /></div>
          <Banner art="stadium" h={120} />
          <div class="reel-kicker">A new season dawns</div>
          <div class="reel-hero big">DIV {nextDiv}</div>
          <div class="small dim">{nextDiv === u.div ? u.league : nextDiv < u.div ? '▲ A step up the pyramid' : '▼ A step down. Time to rebuild.'}</div>
          <div class="kv" style={{ marginTop: 14, textAlign: 'left' }}>
            <span>Contracts expiring</span><span>{expiring.length ? expiring.slice(0, 5).map((p) => p.last).join(', ') + (expiring.length > 5 ? ` +${expiring.length - 5}` : '') : 'None'}</span>
            <span>Summer window</span><span>Opens in June</span>
            <span>Board goals</span><span>Set in July</span>
          </div>
          <button class="btn gold block reel-go" style={{ marginTop: 18 }} onClick={() => { s.ext.reelSeen = u.season; nav.pop(); void store.persist(); }}>On to next season ›</button>
        </div>
      );
    }
  }
}

const REEL_N = 8;

function Reel({ season }: { season: number }) {
  const s = useStore().state!;
  const u = seasons(s).find((x) => x.season === season);
  const [i, setI] = useState(0);
  const [tx, setTx] = useState<number | null>(null);
  useEffect(() => {
    if (!u) return;
    const up = u.outcome === 'champion' || u.outcome === 'promoted' || u.outcome === 'playoff_winner';
    const later = (fx: Parameters<typeof sfx>[0], ms: number) => setTimeout(() => sfx(fx), ms);
    const ts: ReturnType<typeof setTimeout>[] = [];
    // each page has its own sound, timed with its animation
    if (i === 0) {
      if (up) { sfx('fanfare'); ts.push(later('sparkle', 700)); }
      else if (u.outcome === 'relegated') { sfx('sad'); ts.push(later('rain', 300)); }
      else sfx('win');
      if (u.prize) ts.push(later('cash', 1250)); // the prize cheque lands
    } else if (i === 1) ts.push(later('reveal', 150));
    else if (i === 2) { ts.push(later('reveal', 100)); ts.push(later('sparkle', 500)); }
    else if (i === 3) ts.push(later('cash', 250));
    else if (i === 4) { ts.push(later('stamp', 900)); if ((u.board?.after ?? 50) < 45) ts.push(later('sad', 1100)); else ts.push(later('confirm', 1050)); }
    else if (i === 5) ts.push(later('reveal', 150));
    else if (i === 6) ts.push(later('sparkle', 200));
    else if (i === 7) ts.push(later('rise', 150));
    return () => ts.forEach(clearTimeout);
  }, [i, u?.season]);
  if (!u) return <Overlay title="Season review"><div class="empty">No review for this season.</div></Overlay>;
  const go = (d: number) => {
    const n = Math.max(0, Math.min(REEL_N - 1, i + d));
    if (n !== i) sfx('page');
    setI(n);
  };
  const tone = i === 0 ? (u.outcome === 'relegated' ? 'm-down' : u.outcome === 'stayed' ? '' : 'm-up') : '';
  return (
    <div class={`reel ${MOOD[i]} ${tone}`} onPointerDown={(e) => setTx(e.clientX)} onPointerUp={(e) => { if (tx != null && Math.abs(e.clientX - tx) > 40) go(e.clientX < tx ? 1 : -1); setTx(null); }}>
      <div class="reel-top">
        <button class="back" onClick={() => { s.ext.reelSeen = u.season; nav.pop(); }}>✕</button>
        <div class="reel-dots">{Array.from({ length: REEL_N }, (_, k) => <span key={k} class={k === i ? 'on' : k < i ? 'done' : ''} onClick={() => setI(k)} />)}</div>
        <span class="tiny dim">{u.season}/{String(u.season + 1).slice(2)}</span>
      </div>
      <div class="reel-card" key={i}>
        <ReelCard i={i} s={s} u={u} />
      </div>
      <div class="reel-nav">
        <button class="btn" disabled={i === 0} onClick={() => go(-1)}>‹ Back</button>
        {i < REEL_N - 1 && <button class="btn gold" onClick={() => go(1)}>Next ›</button>}
      </div>
    </div>
  );
}
registerOverlay('reel', (data) => <Reel season={data as number} />);

export function openReelIfPending(s: GameState) {
  const p = s.ext.reelPending as number | undefined;
  if (p != null && s.ext.reelSeen !== p) {
    nav.push({ kind: 'custom', key: 'reel', data: p });
    return true;
  }
  return false;
}

// ---------- board

function Meter({ value }: { value: number }) {
  const col = value >= 70 ? 'var(--green)' : value >= 45 ? 'var(--gold)' : value >= 25 ? 'var(--amber)' : 'var(--red)';
  return (
    <div class="meter">
      {Array.from({ length: 20 }, (_, k) => <span key={k} style={{ background: k < Math.round(value / 5) ? col : 'var(--bg)' }} />)}
    </div>
  );
}

function BoardSection({ s }: { s: GameState }) {
  const b = boardState(s);
  return (
    <div>
      <Card title={`Board · ${approvalLabel(b.approval)}`} action={<b>{b.approval}</b>} art="board">
        <Meter value={b.approval} />
        <div class="tiny dim" style={{ marginTop: 6 }}>The board never sacks you. Meeting goals earns a cash bonus, and meeting all of them makes your next facility build 20% cheaper.</div>
      </Card>
      <Card title={`Goals ${b.season}/${String(b.season + 1).slice(2)}`}>
        {b.goals.map((g) => {
          const [ok, txt] = goalStatus(s, g);
          return (
            <div class="between small" key={g.text} style={{ padding: '5px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{ok ? <span class="green">✓</span> : <span class="amber">•</span>} {g.text}</span>
              <span class="tiny dim">{txt}</span>
            </div>
          );
        })}
        <div class="tiny dim" style={{ marginTop: 6 }}>Predicted finish by squad strength: {ordinal(predictedFinish(s))}.{(s.ext.facDiscount as number | undefined) ? ' A 20% facility discount is waiting.' : ''}</div>
      </Card>
    </div>
  );
}

function HistorySection({ s }: { s: GameState }) {
  const list = seasons(s);
  const R = records(s);
  const top = topScorerAllTime(s);
  if (!list.length) return <div><button class="btn gold block hof-btn" onClick={() => nav.push({ kind: 'custom', key: 'hof' })}>🏆 Hall of Fame ›</button><Card title="History" art="trophy"><div class="empty small">Your first season is still being written. History and records appear here after the season ends.</div></Card></div>;
  return (
    <div>
      <button class="btn gold block hof-btn" onClick={() => nav.push({ kind: 'custom', key: 'hof' })}>🏆 Hall of Fame ›</button>
      <Card title="Club history"><Graphs list={list} /></Card>
      <Card title="Seasons">
        {[...list].reverse().map((u) => (
          <div class="item" key={u.season} onClick={() => nav.push({ kind: 'custom', key: 'reel', data: u.season })}>
            <div class="grow">
              <div class="name small">{u.season}/{String(u.season + 1).slice(2)} · {u.league}</div>
              <div class="tiny dim">{ordinal(u.pos)} · {u.pts} pts · {u.gf}-{u.ga}</div>
            </div>
            <span class={`tiny ${OUTCOME[u.outcome ?? 'stayed'][1]}`}>{u.outcome === 'stayed' ? '' : OUTCOME[u.outcome ?? 'stayed'][0].replace('!', '')}</span>
          </div>
        ))}
      </Card>
      <Card title="Records" art="trophy">
        <div class="kv">
          {R.bestFinish && <><span>Best finish</span><span>{ordinal(R.bestFinish.pos)} in division {R.bestFinish.div} ({R.bestFinish.season})</span></>}
          {R.pts && <><span>Most points</span><span>{R.pts.v} ({R.pts.season})</span></>}
          {R.goals && <><span>Most goals (season)</span><span>{R.goals.name}, {R.goals.v}</span></>}
          {top && <><span>All-time top scorer</span><span>{top.name}, {top.goals}</span></>}
          {R.attendance && <><span>Record attendance</span><span>{R.attendance.v.toLocaleString()}</span></>}
          {R.signing && <><span>Record signing</span><span>{R.signing.name}, {money(R.signing.v)}</span></>}
          {R.sale && <><span>Record sale</span><span>{R.sale.name}, {money(R.sale.v)}</span></>}
        </div>
      </Card>
    </div>
  );
}

registerClubSection('board', 'Board', (s) => <BoardSection s={s} />);
registerClubSection('history', 'History', (s) => <HistorySection s={s} />);

