import { useState } from 'preact/hooks';
import { LINE } from '../../core/data/positions';
import { squadOf } from '../../core/state';
import { Card, PlayerRow, Bar, ovrColor } from '../components';
import { SwipePages } from '../swipe';
import { ATTR_GROUPS, A, type AttrName } from '../../core/data/positions';
import { money, useStore } from '../store';
import type { ComponentChildren } from 'preact';
import { squadExtras } from '../squadExtras';
import type { Player } from '../../core/types';

const ORDER = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

const VIEWS = ['contract', 'form', 'attributes'] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABEL: Record<View, string> = { contract: 'Contract', form: 'Form', attributes: 'Attributes' };
const COLS: Record<View, [string, number][]> = {
  contract: [['Wage', 50], ['Exp', 34], ['Value', 46]],
  form: [['App', 26], ['G', 22], ['A', 22], ['Avg', 30], ['CS', 24]],
  attributes: [['TEC', 30], ['MEN', 30], ['PHY', 30], ['GK', 30]],
};

export function SquadScreen() {
  const s = useStore().state!;
  const [view, setView] = useState<View>('contract');
  const squad = squadOf(s, s.userClubId).filter((p) => !p.academy);
  const sorted = [...squad].sort((a, b) => ORDER[LINE[a.pos]] - ORDER[LINE[b.pos]] || b.ovr - a.ovr);
  const avg = squad.length ? Math.round(squad.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11).reduce((x, y) => x + y, 0) / Math.min(11, squad.length)) : 0;
  return (
    <div>
      {squadExtras(s)}
      <Card title={`Squad · ${squad.length} players · best XI ${avg}`}>
        <div class="seg" data-seg-bar>
          {VIEWS.map((k) => <button key={k} class={view === k ? 'on' : ''} onClick={() => setView(k)}>{VIEW_LABEL[k]}</button>)}
        </div>
        <SwipePages keys={VIEWS} value={view} onChange={setView}>
          <div class="sq-head">
            <span class="grow" />
            <div class="sq-cols">{COLS[view].map(([l, w]) => <span key={l} style={{ width: w }}>{l}</span>)}</div>
            <span style={{ width: 31 }}>OVR</span>
          </div>
          {sorted.map((p) => <SquadRow key={p.id} p={p} season={s.season} view={view} />)}
        </SwipePages>
      </Card>
    </div>
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
  }
  void season;
  return cols.map(([l, w], i) => <Cell key={l} w={w}>{vals[i]}</Cell>);
}

export function SquadRow({ p, season, view }: { p: Player; season: number; view?: View }) {
  return (
    <PlayerRow
      p={p}
      sub={<>
        {season - p.birthYear}y
        {p.injury > 0 && <span class="red"> ✚{p.injury}w</span>}
        {p.ban > 0 && <span class="red"> ■ban</span>}
        {p.listed && <span class="amber"> listed</span>}
        {p.contract?.type?.startsWith('loan') && <span class="amber"> loan</span>}
        {view && p.fitness < 70 && <span class="amber"> fit {Math.round(p.fitness)}%</span>}
      </>}
      right={view ? <div class="sq-cols">{viewCells(p, view, season)}</div> : <div style={{ width: 54 }}><div class="tiny dim" style={{ textAlign: 'right' }}>{p.stats.apps}g {p.stats.goals}⚽</div><Bar value={p.fitness} /></div>}
    />
  );
}
