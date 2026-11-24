import { useState } from 'preact/hooks';
import type { GameState } from '../../core/state';
import type { Player } from '../../core/types';
import { Badge, PlayerRow } from '../components';
import { money } from '../store';
import { knowledge } from '../playerExtras';
import { personalityLabel } from '../screens/Player';

/** Spreadsheet-style player list: sortable columns Age, POT, Value, Pers, with the OVR badge on the right. */
export type SortKey = 'ovr' | 'age' | 'pot' | 'value' | 'pers';
const COLS: [SortKey, string, number][] = [['age', 'Age', 30], ['pot', 'POT', 36], ['value', 'Value', 46], ['pers', 'Pers', 40]];
const SHORT: Record<string, string> = { Volatile: 'Vol', Demanding: 'Dem', Balanced: 'Bal', Professional: 'Pro', 'Model Pro': 'Model' };

/** Personality is only known once scouts can read the player (his POT is visible), or for your own players. */
const persOf = (s: GameState, p: Player): number | null => (p.clubId === s.userClubId || knowledge(s, p).pot != null ? p.personality : null);

function valueOf(s: GameState, p: Player, k: SortKey): number | null {
  switch (k) {
    case 'ovr': return knowledge(s, p).ovr;
    case 'age': return s.season - p.birthYear;
    case 'pot': return knowledge(s, p).pot;
    case 'value': return p.value;
    case 'pers': return persOf(s, p);
  }
}

export function useSort(): [{ key: SortKey; dir: 1 | -1 }, (k: SortKey) => void] {
  const [sort, set] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'ovr', dir: -1 });
  const pick = (key: SortKey) => set((c) => (c.key === key ? { key, dir: (-c.dir) as 1 | -1 } : { key, dir: key === 'age' ? 1 : -1 }));
  return [sort, pick];
}

export function PlayerTable({ s, players, sort, onSort, limit = 40 }: { s: GameState; players: Player[]; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; limit?: number }) {
  const rows = [...players]
    .sort((a, b) => {
      const x = valueOf(s, a, sort.key), y = valueOf(s, b, sort.key);
      if (x == null && y == null) return b.ovr - a.ovr;
      if (x == null) return 1; // unknown values always last
      if (y == null) return -1;
      return (x - y) * sort.dir || b.ovr - a.ovr;
    })
    .slice(0, limit);
  const arrow = (k: SortKey) => (sort.key === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : '');
  const btn = (k: SortKey, label: string, w: number) => (
    <button key={k} class={`sq-sort ${sort.key === k ? 'on' : ''}`} style={{ width: '100%' }} onClick={() => onSort(k)}>{label}{arrow(k)}</button>
  );
  return (
    <div class="pt">
      <div class="sq-head">
        <span class="grow" />
        <div class="sq-cols lined">{COLS.map(([k, l, w]) => <span key={k} style={{ width: w }}>{btn(k, l, w)}</span>)}</div>
        <span style={{ width: 25, textAlign: 'center' }}>{btn('ovr', 'OVR', 25)}</span>
      </div>
      {rows.length === 0 && <div class="empty">Nobody here yet.</div>}
      {rows.map((p) => {
        const k = knowledge(s, p);
        const club = p.clubId != null ? s.clubs[p.clubId] : null;
        const pers = persOf(s, p);
        return (
          <PlayerRow
            key={p.id}
            p={p}
            compact
            sub={<>{club ? <Badge club={club} size={14} /> : <span class="green">Free</span>}{s.scouting.starred.includes(p.id) && <span class="gold"> ★</span>}</>}
            right={
              <div class="sq-cols lined">
                <span class="sq-c" style={{ width: 30 }}>{s.season - p.birthYear}</span>
                <span class="sq-c" style={{ width: 36 }}>{k.pot ?? '?'}</span>
                <span class="sq-c" style={{ width: 46 }}>{money(p.value)}</span>
                <span class="sq-c" style={{ width: 40, fontSize: 10 }}>{pers == null ? '?' : SHORT[personalityLabel(pers)]}</span>
              </div>
            }
          />
        );
      })}
      <div class="tiny dim" style={{ marginTop: 6 }}>Tap a column to sort, tap again to flip. Pers: Vol volatile, Dem demanding, Bal balanced, Pro professional, Model model pro. "?" until a scout can read the player.</div>
    </div>
  );
}
