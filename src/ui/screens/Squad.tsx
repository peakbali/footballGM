import { useState } from 'preact/hooks';
import { LINE } from '../../core/data/positions';
import { squadOf, type GameState } from '../../core/state';
import { Card, PlayerRow, ovrColor } from '../components';
import { SwipePages } from '../swipe';
import { ATTR_GROUPS, A, type AttrName } from '../../core/data/positions';
import { money, useStore } from '../store';
import type { ComponentChildren } from 'preact';
import { renderStaffPage, squadExtras } from '../squadExtras';
import type { Player } from '../../core/types';
import { PersonalityFace } from '../personalityFace';

const ORDER = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

const VIEWS = ['contract', 'progress', 'form', 'attributes'] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABEL: Record<View, string> = { contract: 'Contract', progress: 'Progress', form: 'Form', attributes: 'Attributes' };
const COLS: Record<View, [string, number][]> = {
  contract: [['Wage', 40], ['Exp', 40], ['Value', 44]],
  progress: [['-2', 38], ['-1', 38], ['+/-', 32], ['POT', 30]],
  form: [['App', 24], ['G', 20], ['A', 20], ['Avg', 28], ['CS', 22]],
  attributes: [['TEC', 28], ['MEN', 28], ['PHY', 28], ['GK', 28], ['POT', 30]],
};

const PAGES = ['formation', 'squad', 'staff'] as const;
type Page = (typeof PAGES)[number];
const PAGE_LABEL: Record<Page, string> = { formation: 'Formation', squad: 'Squad', staff: 'Staff' };
// remembered while the game is open, so going to another tab and back keeps the sub-page
let lastPage: Page = 'formation';
let lastView: View = 'contract';

export function SquadScreen() {
  const s = useStore().state!;
  const [page, setPageState] = useState<Page>(lastPage);
  const setPage = (p: Page) => { lastPage = p; setPageState(p); };
  return (
    <div>
      <div class="seg" data-seg-bar>
        {PAGES.map((k) => <button key={k} class={page === k ? 'on' : ''} onClick={() => setPage(k)}>{PAGE_LABEL[k]}</button>)}
      </div>
      <SwipePages keys={PAGES} value={page} onChange={setPage}>
        {page === 'formation' && squadExtras(s)}
        {page === 'squad' && <SquadList s={s} />}
        {page === 'staff' && renderStaffPage(s)}
      </SwipePages>
    </div>
  );
}

type Sort = { key: string; dir: 1 | -1 }; // key: a column label, 'ovr', or 'pos' (by position, the default)
const POS_SORT: Sort = { key: 'pos', dir: 1 };
// remembered per sub-page while the game is open
const lastSort: Partial<Record<View, Sort>> = {};
/** Columns where the smallest value comes first on the first tap (contract that ends soonest). */
const ASC_FIRST = new Set(['Exp']);

function SquadList({ s }: { s: GameState }) {
  const [view, setViewState] = useState<View>(lastView);
  const setView = (v: View) => { lastView = v; setViewState(v); };
  const [, bump] = useState(0);
  const sort = lastSort[view] ?? POS_SORT;
  const pick = (key: string) => {
    lastSort[view] = sort.key === key ? { key, dir: (-sort.dir) as 1 | -1 } : { key, dir: key === 'pos' || ASC_FIRST.has(key) ? 1 : -1 };
    bump((x) => x + 1);
  };
  const squad = squadOf(s, s.userClubId).filter((p) => !p.academy);
  const byPos = (a: Player, b: Player) => ORDER[LINE[a.pos]] - ORDER[LINE[b.pos]] || b.ovr - a.ovr;
  const sorted = [...squad].sort((a, b) => {
    if (sort.key === 'pos') return byPos(a, b) * sort.dir;
    const x = sortValue(a, view, sort.key, s.season), y = sortValue(b, view, sort.key, s.season);
    if (x == null && y == null) return byPos(a, b);
    if (x == null) return 1; // no value ("-") always last
    if (y == null) return -1;
    return (x - y) * sort.dir || byPos(a, b);
  });
  const avg = squad.length ? Math.round(squad.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11).reduce((x, y) => x + y, 0) / Math.min(11, squad.length)) : 0;
  const arrow = (k: string) => (sort.key === k ? (sort.dir > 0 ? '▲' : '▼') : '');
  const btn = (k: string, label: string, cls = '') => (
    <button class={`sq-sort ${cls} ${sort.key === k ? 'on' : ''}`} onClick={() => pick(k)}>{label}<i class="sq-arrow">{arrow(k)}</i></button>
  );
  return (
    <Card title={`Squad · ${squad.length} players · best XI ${avg}`}>
      <div class="seg" data-seg-bar>
        {VIEWS.map((k) => <button key={k} class={view === k ? 'on' : ''} onClick={() => setView(k)}>{VIEW_LABEL[k]}</button>)}
      </div>
      <SwipePages keys={VIEWS} value={view} onChange={setView}>
        <div class="sq-head">
          <span class="grow" style={{ textAlign: 'left' }}>{btn('pos', 'Pos')}</span>
          <div class={`sq-cols ${view === 'contract' ? 'lined' : ''}`}>{COLS[view].map(([l, w]) => <span key={l} style={{ width: w }}>{btn(l, colLabel(l, s.season), l.startsWith('-') && l.length === 2 ? 'sq-yr' : '')}</span>)}</div>
          <span style={{ width: 25 }}>{btn('ovr', 'OVR')}</span>
        </div>
        {sorted.map((p) => <SquadRow key={p.id} p={p} season={s.season} view={view} />)}
        <div class="tiny dim" style={{ marginTop: 6 }}>Tap a column to sort, tap again to flip. Pos puts the list back in position order.</div>
      </SwipePages>
    </Card>
  );
}

/** The number a column sorts by (null = no value, shown as "-" and kept last). */
function sortValue(p: Player, view: View, key: string, season: number): number | null {
  if (key === 'ovr') return p.ovr;
  const st = p.stats, ct = p.contract;
  switch (key) {
    case 'Wage': return ct ? ct.wage : null;
    case 'Exp': return ct ? ct.endSeason : null;
    case 'Value': return p.value;
    case '-2': return ovrAt(p, season - 2) ?? null;
    case '-1': return ovrAt(p, season - 1) ?? null;
    case '+/-': { const o = ovrAt(p, season - 1); return o == null ? null : p.ovr - o; }
    case 'POT': return p.pot;
    case 'App': return st.apps;
    case 'G': return st.goals;
    case 'A': return st.assists;
    case 'Avg': return st.apps ? st.ratingSum / st.apps : null;
    case 'CS': return p.pos === 'GK' || LINE[p.pos] === 'DEF' ? st.cs : null;
  }
  const g = ['TEC', 'MEN', 'PHY', 'GK'].indexOf(key);
  void view;
  return g >= 0 ? groupAvg(p, ATTR_GROUPS[g].attrs) : null;
}

const groupAvg = (p: Player, names: string[]) => {
  const idx = names.map((n) => A[n as AttrName]);
  return Math.round(idx.reduce((x, i) => x + p.attrs[i], 0) / idx.length);
};

function Cell({ w, children, cls }: { w: number; children: ComponentChildren; cls?: string }) {
  return <span class={`sq-c ${cls ?? ''}`} style={{ width: w }}>{children}</span>;
}

/** "-1" / "-2" header = that many seasons ago, written like 25/26. */
const seasonTag = (y: number) => `${String(y).slice(2)}/${String(y + 1).slice(2)}`;
const colLabel = (l: string, season: number) => (l === '-1' || l === '-2' ? seasonTag(season + Number(l)) : l);

/** OVR at the end of a past season, from the career log (last entry if he moved mid-season). */
const ovrAt = (p: Player, season: number) => {
  for (let i = p.career.length - 1; i >= 0; i--) if (p.career[i].s === season) return p.career[i].ovr;
  return undefined;
};

function viewCells(p: Player, view: View, season: number) {
  const cols = COLS[view];
  const st = p.stats;
  const ct = p.contract;
  let vals: ComponentChildren[] = [];
  if (view === 'contract') {
    vals = [ct ? money(ct.wage) : '-', ct ? `Jun ${String(ct.endSeason + 1).slice(2)}` : '-', money(p.value)];
  } else if (view === 'progress') {
    const o2 = ovrAt(p, season - 2);
    const o1 = ovrAt(p, season - 1);
    const d = o1 == null ? null : p.ovr - o1;
    vals = [
      o2 == null ? <span class="dim">-</span> : <span style={{ color: ovrColor(o2) }}>{o2}</span>,
      o1 == null ? <span class="dim">-</span> : <span style={{ color: ovrColor(o1) }}>{o1}</span>,
      d == null ? <span class="dim">-</span> : d === 0 ? <span class="dim">0</span> : <b class={`sq-delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? `▲${d}` : `▼${-d}`}</b>,
      <b class="gold">{p.pot}</b>,
    ];
  } else if (view === 'form') {
    vals = [st.apps, st.goals, st.assists, st.apps ? (st.ratingSum / st.apps).toFixed(1) : '-', p.pos === 'GK' || LINE[p.pos] === 'DEF' ? st.cs : '-'];
  } else {
    vals = ATTR_GROUPS.map((g, i) => {
      const v = groupAvg(p, g.attrs);
      const gk = i === 3;
      if (gk && p.pos !== 'GK') return <span class="dim">{v}</span>;
      return <b style={{ color: ovrColor(v) }}>{v}</b>;
    });
    vals.push(<b class="gold">{p.pot}</b>);
  }
  return cols.map(([l, w], i) => <Cell key={l} w={w}>{vals[i]}</Cell>);
}

export function SquadRow({ p, season, view }: { p: Player; season: number; view?: View }) {
  return (
    <PlayerRow
      p={p}
      compact={!!view}
      sub={<>
        {season - p.birthYear}y <PersonalityFace v={p.personality} size={12} />
        {p.injury > 0 && <span class="red"> ✚{p.injury}w</span>}
        {p.ban > 0 && <span class="red"> ■ban</span>}
        {p.listed && <span class="amber"> listed</span>}
        {p.contract?.type?.startsWith('loan') && <span class="amber"> loan</span>}
      </>}
      right={view ? <div class={`sq-cols ${view === 'contract' ? 'lined' : ''}`}>{viewCells(p, view, season)}</div> : <div class="tiny dim" style={{ textAlign: 'right', width: 54 }}>{p.stats.apps}g {p.stats.goals}⚽</div>}
    />
  );
}
