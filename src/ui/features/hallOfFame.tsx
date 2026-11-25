import { useState } from 'preact/hooks';
import type { GameState } from '../../core/state';
import { hof, hofSync, hofTotals, hofTrophies, type HofRec } from '../../core/systems/hof';
import { Card, Overlay } from '../components';
import { money, nav, useStore } from '../store';
import { registerOverlay } from '../overlays';
import { SwipePages } from '../swipe';

/** Hall of Fame (DESIGN 13.3a): all-time rankings for everyone who has played for your club. */
interface Cat { key: string; label: string; val: (s: GameState, r: HofRec) => number; fmt: (v: number, r: HofRec) => string; min?: number }
const yrs = (n: number) => `${n} season${n === 1 ? '' : 's'}`;
const CATS: Cat[] = [
  { key: 'apps', label: 'Appearances', val: (_s, r) => hofTotals(r).apps, fmt: (v) => `${v} apps` },
  { key: 'goals', label: 'Goals', val: (_s, r) => hofTotals(r).goals, fmt: (v, r) => `${v} (${(v / Math.max(1, hofTotals(r).apps)).toFixed(2)}/g)` },
  { key: 'assists', label: 'Assists', val: (_s, r) => hofTotals(r).assists, fmt: (v) => `${v}` },
  { key: 'cs', label: 'Clean sheets', val: (_s, r) => (r.pos === 'GK' ? hofTotals(r).cs : 0), fmt: (v) => `${v}` },
  { key: 'service', label: 'Longest serving', val: (_s, r) => r.seasons.length, fmt: (v) => yrs(v) },
  { key: 'ovr', label: 'Highest OVR', val: (_s, r) => r.maxOvr, fmt: (v) => `${v} OVR` },
  { key: 'rating', label: 'Best season', val: (_s, r) => r.bestAvg?.v ?? 0, fmt: (v, r) => `${v.toFixed(2)} avg (${r.bestAvg?.season})` },
  { key: 'goalSeason', label: 'Goals in a season', val: (_s, r) => r.bestGoals?.v ?? 0, fmt: (v, r) => `${v} (${r.bestGoals?.season})` },
  { key: 'trophies', label: 'Trophies', val: (s, r) => hofTrophies(s, r), fmt: (v) => `${v} 🏆` },
  { key: 'wage', label: 'Highest wage', val: (_s, r) => r.maxWage, fmt: (v) => `${money(v)}/wk` },
  { key: 'feeIn', label: 'Record signings', val: (_s, r) => r.feeIn, fmt: (v) => money(v) },
  { key: 'feeOut', label: 'Record sales', val: (_s, r) => r.feeOut, fmt: (v) => money(v) },
];
const KEYS = CATS.map((c) => c.key);

function status(s: GameState, r: HofRec): { text: string; cls: string } {
  const p = s.players.get(r.id);
  if (p && p.clubId === s.userClubId && !p.retired) return { text: 'At the club', cls: 'green' };
  if (!p || p.retired) return { text: 'Retired', cls: 'dim' };
  if (p.clubId == null) return { text: 'Free agent', cls: 'dim' };
  return { text: `Now at ${s.clubs[p.clubId].short}`, cls: 'dim' };
}

function span(r: HofRec): string {
  if (!r.seasons.length) return '';
  const a = Math.min(...r.seasons), b = Math.max(...r.seasons);
  return a === b ? `${a}/${String(a + 1).slice(2)}` : `${a}–${String(b + 1).slice(2)}`;
}

function Ranking({ s, cat }: { s: GameState; cat: Cat }) {
  const rows = Object.values(hof(s).recs).map((r) => ({ r, v: cat.val(s, r) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 10);
  return (
    <Card title={cat.label} art="trophy">
      {!rows.length && <div class="empty small">No one yet. Records fill in as you play.</div>}
      {rows.map(({ r, v }, i) => {
        const st = status(s, r);
        const p = s.players.get(r.id);
        return (
          <div key={r.id} class={`item hof-row${i < 3 ? ` hof-top${i + 1}` : ''}`} onClick={() => p && nav.push({ kind: 'player', id: r.id })}>
            <span class="hof-rank">{i + 1}</span>
            <div class="grow">
              <div class="name">{r.name} <span class="tiny dim">{r.pos}{r.academy ? ' · academy' : ''}</span></div>
              <div class="tiny"><span class="dim">{span(r)} · </span><span class={st.cls}>{st.text}</span></div>
            </div>
            <b class="hof-val">{cat.fmt(v, r)}</b>
          </div>
        );
      })}
    </Card>
  );
}

function HallOfFame() {
  const st = useStore();
  const s = st.state!;
  hofSync(s); // include this week's numbers
  const [k, setK] = useState(KEYS[0]);
  const n = Object.keys(hof(s).recs).length;
  return (
    <Overlay title="Hall of Fame" sub={`${s.clubs[s.userClubId].short} · ${n} player${n === 1 ? '' : 's'} have worn the shirt`}>
      <div class="chips hof-chips">
        {CATS.map((c) => <button key={c.key} class={`chip ${c.key === k ? 'on' : ''}`} onClick={() => setK(c.key)}>{c.label}</button>)}
      </div>
      <SwipePages keys={KEYS} value={k} onChange={setK}>
        <Ranking s={s} cat={CATS.find((c) => c.key === k)!} />
      </SwipePages>
      <div class="tiny dim" style={{ marginTop: 6 }}>Counts every competitive game for your club, including the season in progress. Tap a player to open him; retired players stay in the records.</div>
    </Overlay>
  );
}
registerOverlay('hof', () => <HallOfFame />);
