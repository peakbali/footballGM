import { useState } from 'preact/hooks';
import { LINE } from '../../core/data/positions';
import { squadOf } from '../../core/state';
import { Card, PlayerRow, Bar } from '../components';
import { useStore } from '../store';
import { squadExtras } from '../squadExtras';
import type { Player } from '../../core/types';

const ORDER = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export function SquadScreen() {
  const s = useStore().state!;
  const [sort, setSort] = useState<'pos' | 'ovr' | 'age'>('pos');
  const squad = squadOf(s, s.userClubId).filter((p) => !p.academy);
  const sorted = [...squad].sort((a, b) =>
    sort === 'ovr' ? b.ovr - a.ovr : sort === 'age' ? a.birthYear - b.birthYear : ORDER[LINE[a.pos]] - ORDER[LINE[b.pos]] || b.ovr - a.ovr,
  );
  const avg = squad.length ? Math.round(squad.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11).reduce((x, y) => x + y, 0) / Math.min(11, squad.length)) : 0;
  return (
    <div>
      {squadExtras(s)}
      <Card title={`Squad · ${squad.length} players · best XI ${avg}`}>
        <div class="seg">
          {(['pos', 'ovr', 'age'] as const).map((k) => <button key={k} class={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{k}</button>)}
        </div>
        {sorted.map((p) => <SquadRow key={p.id} p={p} season={s.season} />)}
      </Card>
    </div>
  );
}

export function SquadRow({ p, season }: { p: Player; season: number }) {
  return (
    <PlayerRow
      p={p}
      sub={<>
        {season - p.birthYear}y
        {p.injury > 0 && <span class="red"> ✚{p.injury}w</span>}
        {p.ban > 0 && <span class="red"> ■ban</span>}
        {p.listed && <span class="amber"> listed</span>}
        {p.contract?.type?.startsWith('loan') && <span class="amber"> loan</span>}
      </>}
      right={<div style={{ width: 54 }}><div class="tiny dim" style={{ textAlign: 'right' }}>{p.stats.apps}g {p.stats.goals}⚽</div><Bar value={p.fitness} /></div>}
    />
  );
}
