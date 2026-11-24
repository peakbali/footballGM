import type { GameState } from '../../core/state';
import { CUP_KEY, CUP_NAME, CUP_WEEKS, cupPrize, cupState, ROUND_NAMES } from '../../core/systems/cup';
import { Badge, Card, Overlay } from '../components';
import { money, nav, useStore } from '../store';
import { registerOverlay } from '../overlays';

export function cupLine(s: GameState): string | null {
  return cupState(s) ? status(s) : null;
}

function status(s: GameState): string {
  const c = cupState(s);
  if (!c) return '';
  if (c.userWon) return 'Winners!';
  if (c.userExit != null) return `Out in the ${ROUND_NAMES[c.userExit].toLowerCase()}`;
  const next = s.fixtures.find((f) => f.cup === CUP_KEY && f.hg == null && (f.home === s.userClubId || f.away === s.userClubId));
  if (next) return `${ROUND_NAMES[next.round!]}: ${next.home === s.userClubId ? 'v' : 'at'} ${s.clubs[next.home === s.userClubId ? next.away : next.home].short} (wk ${next.week})`;
  const r = c.round;
  if (r === 0) return c.byes.includes(s.userClubId) ? `Enter in the second round (wk ${CUP_WEEKS[1]})` : `First round draw in week ${CUP_WEEKS[0] - 1}`;
  return r < CUP_WEEKS.length ? `${ROUND_NAMES[r]} draw in week ${CUP_WEEKS[r] - 1}` : 'Waiting for the next draw';
}


function CupScreen() {
  const s = useStore().state!;
  const c = cupState(s);
  if (!c) return <Overlay title={CUP_NAME}><div class="empty">No cup this season yet.</div></Overlay>;
  const latest = Math.max(0, c.round - 1);
  const ties = s.fixtures.filter((f) => f.cup === CUP_KEY && f.round === latest).sort((a, b) => Math.min(s.clubs[a.home].div, s.clubs[a.away].div) - Math.min(s.clubs[b.home].div, s.clubs[b.away].div));
  return (
    <Overlay title={CUP_NAME} sub={`${s.season}/${String(s.season + 1).slice(2)} · ${c.alive.length} clubs left`}>
      <Card title="Your run">
        <div class="small" style={{ marginBottom: 6 }}>{status(s)}</div>
        {c.ties.filter((t) => t.h === s.userClubId || t.a === s.userClubId).map((t) => (
          <div class="between small" key={t.r} style={{ padding: '3px 0' }}>
            <span class="dim">{ROUND_NAMES[t.r]}</span>
            <span>{s.clubs[t.h].short} {t.hg}-{t.ag} {s.clubs[t.a].short}{t.pens ? ` (p ${t.pens})` : ''}</span>
          </div>
        ))}
        {c.winner != null && <div class="small gold" style={{ marginTop: 6 }}>Winners: {s.clubs[c.winner].name}</div>}
      </Card>
      <Card title="Prize money">
        {ROUND_NAMES.map((n, i) => <div class="between tiny" key={n} style={{ padding: '2px 0' }}><span class="dim">Win the {n.toLowerCase()}</span><span>{money(cupPrize(i))}</span></div>)}
      </Card>
      {ties.length > 0 && (
        <Card title={ROUND_NAMES[latest]}>
          {ties.slice(0, 40).map((f) => {
            const h = s.clubs[f.home], a = s.clubs[f.away];
            const me = f.home === s.userClubId || f.away === s.userClubId;
            return (
              <div class="between small" key={f.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--line)', fontWeight: me ? 700 : 400 }} onClick={() => f.hg != null && s.reports.has(f.id) && nav.push({ kind: 'match', fixtureId: f.id })}>
                <span class="row" style={{ gap: 4, flex: 1, minWidth: 0 }}><Badge club={h} size={14} /><span class="name">{h.short}</span><span class="tiny dim">D{h.div}</span></span>
                <b style={{ minWidth: 44, textAlign: 'center' }}>{f.hg == null ? 'v' : `${f.hg}-${f.ag}`}</b>
                <span class="row" style={{ gap: 4, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}><span class="tiny dim">D{a.div}</span><span class="name">{a.short}</span><Badge club={a} size={14} /></span>
              </div>
            );
          })}
          {ties.length > 40 && <div class="tiny dim">+{ties.length - 40} more ties</div>}
        </Card>
      )}
    </Overlay>
  );
}
registerOverlay('cup', () => <CupScreen />);
