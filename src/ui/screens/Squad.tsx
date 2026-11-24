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

const VIEWS = ['contract', 'form', 'attributes'] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABEL: Record<View, string> = { contract: 'Contract', form: 'Form', attributes: 'Attributes' };
const COLS: Record<View, [string, number][]> = {
  contract: [['Wage', 40], ['Exp', 40], ['Value', 44]],
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

function SquadList({ s }: { s: GameState }) {
  const [view, setViewState] = useState<View>(lastView);
  const setView = (v: View) => { lastView = v; setViewState(v); };
  const squad = squadOf(s, s.userClubId).filter((p) => !p.academy);
  const sorted = [...squad].sort((a, b) => ORDER[LINE[a.pos]] - ORDER[LINE[b.pos]] || b.ovr - a.ovr);
  const avg = squad.length ? Math.round(squad.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11).reduce((x, y) => x + y, 0) / Math.min(11, squad.length)) : 0;
  return (
    <Card title={`Squad · ${squad.length} players · best XI ${avg}`}>
      <div class="seg" data-seg-bar>
        {VIEWS.map((k) => <button key={k} class={view === k ? 'on' : ''} onClick={() => setView(k)}>{VIEW_LABEL[k]}</button>)}
      </div>
      <SwipePages keys={VIEWS} value={view} onChange={setView}>
        <div class="sq-head">
          <span class="grow" />
          <div class={`sq-cols ${view === 'contract' ? 'lined' : ''}`}>{COLS[view].map(([l, w]) => <span key={l} style={{ width: w }}>{l}</span>)}</div>
          <span style={{ width: 25 }}>OVR</span>
        </div>
        {sorted.map((p) => <SquadRow key={p.id} p={p} season={s.season} view={view} />)}
      </SwipePages>
    </Card>
  );
}

const groupAvg = (p: Player, names: string[]) => {
  const idx = names.map((n) => A[n as AttrName]);
  return Math.round(idx.reduce((x, i) => x + p.attrs[i], 0) / idx.length);
};

function Cell({ w, children, cls }: { w: number; children: ComponentChildren; cls?: string }) {
  return <span class={`sq-c ${cls ?? ''}`} style={{ width: w }}>{children}</span>;
}

function viewCells(p: Player, view: View, season: number) {
  const cols = COLS[view];
  const st = p.stats;
  const ct = p.contract;
  let vals: ComponentChildren[] = [];
  if (view === 'contract') {
    vals = [ct ? money(ct.wage) : '-', ct ? `Jun ${String(ct.endSeason + 1).slice(2)}` : '-', money(p.value)];
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
  void season;
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
