import { foreignLeagueName } from '../../core/world';
import { LINE } from '../../core/data/positions';
import { squadOf } from '../../core/state';
import { computeTable } from '../../core/league';
import { Badge, Card, Overlay, PlayerRow } from '../components';
import { money, useStore } from '../store';
import { ordinal } from '../../core/season';
import { knowledge } from '../playerExtras';

const ORDER = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export function ClubViewScreen({ id }: { id: number }) {
  const s = useStore().state!;
  const c = s.clubs[id];
  const lg = s.leagues.find((l) => l.clubIds.includes(id));
  const pos = lg ? computeTable(s, lg).findIndex((r) => r.clubId === id) + 1 : 0;
  const squad = squadOf(s, id).sort((a, b) => ORDER[LINE[a.pos]] - ORDER[LINE[b.pos]] || b.ovr - a.ovr);
  const hist = s.history.filter((h) => h.clubId === id).sort((a, b) => b.season - a.season).slice(0, 6);
  return (
    <Overlay title={c.name} sub={lg ? `${ordinal(pos)} in ${lg.short}` : c.country ? `${foreignLeagueName(c)} · abroad (no fixtures)` : `Regional league · division ${c.div}`}>
      <Card>
        <div class="row">
          <Badge club={c} size={56} />
          <div class="kv grow">
            <span>Ground</span><span>{c.stadium} ({c.capacity.toLocaleString()})</span>
            <span>{c.country ? 'Level' : 'Division'}</span><span>{c.country ? `like division ${c.div}` : c.div}</span>
            <span>Strength</span><span>{c.strength.toFixed(1)}</span>
            <span>Approach</span><span>{c.ai}</span>
            {c.user && <><span>Cash</span><span>{money(c.cash)}</span></>}
          </div>
        </div>
      </Card>
      {hist.length > 0 && (
        <Card title="Recent seasons">
          {hist.map((h) => <div class="between small" key={h.season} style={{ padding: '3px 0' }}><span>{h.season}/{String(h.season + 1).slice(2)}</span><span class="dim">Div {h.div}</span><span>{ordinal(h.pos)}</span><span class="dim">{h.pts} pts</span></div>)}
        </Card>
      )}
      <Card title={`Squad · ${squad.length}`}>
        {squad.map((p) => {
          const k = knowledge(s, p);
          return <PlayerRow key={p.id} p={{ ...p, ovr: k.ovr as number }} sub={<>{s.season - p.birthYear}y</>} onClick={undefined} />;
        })}
      </Card>
    </Overlay>
  );
}
