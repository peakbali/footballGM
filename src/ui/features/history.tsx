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

const OUTCOME: Record<string, [string, string]> = {
  champion: ['CHAMPIONS!', 'gold'],
  promoted: ['PROMOTED!', 'green'],
  playoff_winner: ['PROMOTED VIA PLAYOFFS!', 'green'],
  relegated: ['RELEGATED', 'red'],
  stayed: ['SEASON COMPLETE', ''],
};

function ReelCard({ i, s, u }: { i: number; s: GameState; u: UserSeason }) {
  const user = s.clubs[s.userClubId];
  const all = seasons(s);
  const R = records(s);
  switch (i) {
    case 0: {
      const [txt, cls] = OUTCOME[u.outcome ?? 'stayed'];
      const me = u.table.findIndex((r) => r.id === user.id);
      const rows = u.table.slice(Math.max(0, Math.min(me - 3, u.table.length - 7)), Math.max(0, Math.min(me - 3, u.table.length - 7)) + 7);
      return (
        <div class="reel-body">
          <div class="reel-kicker">{u.league}</div>
          <Badge club={user} size={64} />
          <div class={`reel-big ${cls} ${u.outcome !== 'stayed' && u.outcome !== 'relegated' ? 'pop' : ''}`}>{txt}</div>
          <div class="reel-hero">{ordinal(u.pos)}</div>
          <div class="dim small">{u.pts} points · {u.w}W {u.d}D {u.l}L</div>
          <table class="tbl" style={{ marginTop: 12 }}>
            <tbody>
              {rows.map((r) => {
                const pos = u.table.indexOf(r) + 1;
                return <tr key={r.id} class={r.id === user.id ? 'me' : ''}><td class="l dim">{pos}</td><td class="l club">{r.short}</td><td class="dim">{r.gd > 0 ? `+${r.gd}` : r.gd}</td><td><b>{r.pts}</b></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      );
    }
    case 1:
      return (
        <div class="reel-body">
          <div class="reel-kicker">By the numbers</div>
          <div class="reel-grid">
            <div><b>{u.gf}</b><span>goals scored</span></div>
            <div><b>{u.ga}</b><span>conceded</span></div>
            <div><b>{u.pts}</b><span>points</span></div>
            <div><b>{u.cs}</b><span>clean sheets</span></div>
            <div><b>{u.avgAtt.toLocaleString()}</b><span>avg attendance</span></div>
            <div><b>{u.bestAtt.toLocaleString()}</b><span>best crowd</span></div>
          </div>
          {u.bigWin && <div class="small" style={{ marginTop: 14 }}>Biggest win: <b class="gold">{u.bigWin.text}</b></div>}
          {u.cup && <div class="small" style={{ marginTop: 6 }}>FA Cup: <b class={u.cup.won ? 'gold' : ''}>{u.cup.text}</b></div>}
        </div>
      );
    case 2: {
      const st = u.stars;
      const row = (label: string, h: typeof st.pots, unit: string) =>
        h ? (
          <div class="reel-star" onClick={() => s.players.has(h.id) && nav.push({ kind: 'player', id: h.id })}>
            <span class="tiny dim">{label}</span>
            <div class="name">{h.name} <span class="tiny dim">{h.pos}</span></div>
            <div class="gold small">{unit === '+' ? `+${h.value} OVR` : `${h.value} ${unit}`}</div>
          </div>
        ) : null;
      return (
        <div class="reel-body">
          <div class="reel-kicker">Stars of the season</div>
          {row('Player of the season', st.pots, 'avg rating')}
          {row('Top scorer', st.scorer, 'goals')}
          {row('Young player', st.young, 'avg rating')}
          {row('Breakthrough', st.breakthrough, '+')}
          {!st.pots && !st.scorer && <div class="dim small">No standout players this year.</div>}
        </div>
      );
    }
    case 3:
      return (
        <div class="reel-body">
          <div class="reel-kicker">Money</div>
          <div class="reel-grid two">
            <div><b class="green">{money(u.income)}</b><span>income</span></div>
            <div><b class="red">{money(u.costs)}</b><span>costs</span></div>
          </div>
          <div class="kv" style={{ marginTop: 14, textAlign: 'left' }}>
            <span>Balance</span><span>{money(u.cashStart)} → <b class={u.cashEnd >= u.cashStart ? 'green' : 'red'}>{money(u.cashEnd)}</b></span>
            <span>Biggest signing</span><span>{u.topSigning ? `${u.topSigning.name}, ${money(u.topSigning.fee)}` : 'None'}</span>
            <span>Biggest sale</span><span>{u.topSale ? `${u.topSale.name}, ${money(u.topSale.fee)}` : 'None'}</span>
          </div>
        </div>
      );
    case 4: {
      const b = u.board;
      return (
        <div class="reel-body">
          <div class="reel-kicker">Board verdict</div>
          {b ? (
            <>
              <div class="reel-big">{approvalLabel(b.after)}</div>
              <Meter value={b.after} />
              <div class="small dim">Approval {b.before} → <b class={b.after >= b.before ? 'green' : 'red'}>{b.after}</b></div>
              <div style={{ marginTop: 12, textAlign: 'left' }}>
                {b.goals.map((g) => <div class="small" key={g.text}>{g.met ? <span class="green">✓</span> : <span class="red">✗</span>} {g.text}</div>)}
              </div>
              {(b.cash > 0 || b.discount > 0) && <div class="small gold" style={{ marginTop: 10 }}>Reward: {b.cash > 0 ? `${money(b.cash)} bonus` : ''}{b.cash > 0 && b.discount ? ' and ' : ''}{b.discount ? '20% off your next facility build' : ''}</div>}
            </>
          ) : <div class="dim small">The board had no goals this season.</div>}
        </div>
      );
    }
    case 5:
      return (
        <div class="reel-body" style={{ textAlign: 'left' }}>
          <div class="reel-kicker" style={{ textAlign: 'center' }}>History · {all.length} season{all.length === 1 ? '' : 's'}</div>
          <Graphs list={all} />
        </div>
      );
    case 6: {
      const top = topScorerAllTime(s);
      return (
        <div class="reel-body">
          <div class="reel-kicker">Records</div>
          {u.records.length ? u.records.map((r) => <div class="reel-record pop" key={r}>★ {r}</div>) : <div class="dim small">{all.length === 1 ? 'Your first season sets the benchmarks.' : 'No new club records this time.'}</div>}
          <div class="kv" style={{ marginTop: 14, textAlign: 'left' }}>
            {R.pts && <><span>Most points</span><span>{R.pts.v} ({R.pts.season})</span></>}
            {R.goals && <><span>Most goals</span><span>{R.goals.name}, {R.goals.v}</span></>}
            {top && <><span>All-time scorer</span><span>{top.name}, {top.goals}</span></>}
            {R.attendance && <><span>Best crowd</span><span>{R.attendance.v.toLocaleString()}</span></>}
            {R.signing && <><span>Record signing</span><span>{R.signing.name}, {money(R.signing.v)}</span></>}
            {R.sale && <><span>Record sale</span><span>{R.sale.name}, {money(R.sale.v)}</span></>}
            {R.cup && <><span>Best FA Cup run</span><span>{R.cup.won ? `Winners (${R.cup.season})` : `${ROUND_NAMES[R.cup.reached] ?? 'Entry'} (${R.cup.season})`}</span></>}
          </div>
        </div>
      );
    }
    default: {
      const nextDiv = u.outcome === 'champion' || u.outcome === 'promoted' || u.outcome === 'playoff_winner' ? Math.max(1, u.div - 1) : u.outcome === 'relegated' ? Math.min(10, u.div + 1) : u.div;
      const expiring = [...s.players.values()].filter((p) => p.clubId === user.id && !p.academy && p.contract?.type === 'permanent' && p.contract.endSeason === u.season);
      return (
        <div class="reel-body">
          <div class="reel-kicker">Next season</div>
          <div class="reel-big">Division {nextDiv}</div>
          <div class="small dim">{nextDiv === u.div ? u.league : nextDiv < u.div ? 'A step up the pyramid' : 'A step down. Time to rebuild.'}</div>
          <div class="kv" style={{ marginTop: 14, textAlign: 'left' }}>
            <span>Contracts expiring</span><span>{expiring.length ? expiring.slice(0, 5).map((p) => p.last).join(', ') + (expiring.length > 5 ? ` +${expiring.length - 5}` : '') : 'None'}</span>
            <span>Summer window</span><span>Opens in June</span>
            <span>Board goals</span><span>Set in July</span>
          </div>
          <button class="btn gold block" style={{ marginTop: 18 }} onClick={() => { s.ext.reelSeen = u.season; nav.pop(); void store.persist(); }}>On to next season ›</button>
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
    if (i !== 0 || !u) return;
    const up = u.outcome === 'champion' || u.outcome === 'promoted' || u.outcome === 'playoff_winner';
    sfx(up ? 'fanfare' : u.outcome === 'relegated' ? 'loss' : 'win');
  }, [i, u?.season]);
  if (!u) return <Overlay title="Season review"><div class="empty">No review for this season.</div></Overlay>;
  const go = (d: number) => {
    const n = Math.max(0, Math.min(REEL_N - 1, i + d));
    if (n !== i) sfx('swipe');
    setI(n);
  };
  return (
    <div class="reel" onPointerDown={(e) => setTx(e.clientX)} onPointerUp={(e) => { if (tx != null && Math.abs(e.clientX - tx) > 40) go(e.clientX < tx ? 1 : -1); setTx(null); }}>
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
  if (!list.length) return <Card title="History" art="trophy"><div class="empty small">Your first season is still being written. History and records appear here after the season ends.</div></Card>;
  return (
    <div>
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

