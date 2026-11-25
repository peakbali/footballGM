import { FORMATION_NAMES } from '../../core/data/formations';
import { autoPick, teamOvr } from '../../core/selection';
import { squadOf, userClub, type GameState } from '../../core/state';
import { seniorCount, SQUAD_MAX, SQUAD_MIN } from '../../core/systems/contracts';
import { userWageBill } from '../../core/systems/finance';
import { effectiveOvr } from '../../core/ratings';
import { Card, PosPill, ovrColor } from '../components';
import { Portrait } from '../portrait';
import { LINE } from '../../core/data/positions';
import { money, nav, store } from '../store';
import { registerSquadCard } from '../squadExtras';

const POS_FILL = { GK: '#a77d10', DEF: '#1f5fa8', MID: '#1d7a48', ATT: '#a82d3a' } as const;

/** Groups slots into rows (similar depth) and spreads the rows evenly from the keeper (bottom) to the forwards (top). */
function rowLayout(ys: number[]) {
  const sorted = [...ys].sort((a, b) => a - b);
  const rows: number[][] = [];
  for (const y of sorted) {
    const last = rows[rows.length - 1];
    if (last && y - last[last.length - 1] < 12) last.push(y);
    else rows.push([y]);
  }
  const n = rows.length;
  return {
    cy(y: number) {
      const k = rows.findIndex((r) => r.includes(y));
      const mean = rows[k].reduce((a, b) => a + b, 0) / rows[k].length;
      return 93 - k * (n > 1 ? 83 / (n - 1) : 0) - (y - mean) * 0.4; // slight stagger inside a row
    },
  };
}

let note = ''; // last "best XI" result, shown under the button for a few seconds
let noteAt = 0;

function Lineup({ s }: { s: GameState }) {
  const club = userClub(s);
  const squad = squadOf(s, s.userClubId);
  const lu = autoPick(squad, club.formation, 7, true);
  const n = seniorCount(s);
  const ovr = teamOvr(lu);
  const locks = squad.filter((p) => p.locked);
  // the formation that gives the highest team OVR with this squad
  const bestF = FORMATION_NAMES.map((f) => ({ f, v: teamOvr(autoPick(squad, f, 7, true)) })).sort((a, b) => b.v - a.v)[0];
  const pickBest = () => {
    const before = ovr;
    for (const p of locks) p.locked = false;
    const after = teamOvr(autoPick(squad, club.formation, 7, true));
    noteAt = Date.now();
    note = `Best XI picked: team OVR ${Math.round(after)}${Math.round(after) !== Math.round(before) ? ` (was ${Math.round(before)})` : ''}${locks.length ? `, ${locks.length} lock${locks.length === 1 ? '' : 's'} cleared` : ''}.`;
    store.bump();
    void store.persist();
  };
  const rows = rowLayout(lu.slots.map((x) => x.y));
  return (
    <Card title={`Formation · ${club.formation}`} action={<span class="tiny dim">{n}/{SQUAD_MAX} senior · wages {money(userWageBill(s))}/wk</span>}>
      <div class="chips">
        {FORMATION_NAMES.map((f) => (
          <button key={f} class={`chip ${f === club.formation ? 'on' : ''}`} onClick={() => { club.formation = f; store.bump(); }}>{f}</button>
        ))}
      </div>
      <div class="xi-bar">
        <span class="small">Team OVR <b style={{ color: ovrColor(ovr) }}>{Math.round(ovr)}</b></span>
        <button class="btn small gold" onClick={pickBest}>⚡ Pick best XI</button>
      </div>
      {note && Date.now() - noteAt < 8000 && <div class="tiny green" style={{ marginBottom: 4 }}>{note}</div>}
      {bestF && bestF.f !== club.formation && Math.round(bestF.v) > Math.round(ovr) && (
        <div class="tiny dim" style={{ marginBottom: 6 }}>
          {bestF.f} would give team OVR {Math.round(bestF.v)}. <button class="linkbtn" onClick={() => { club.formation = bestF.f; note = ''; store.bump(); void store.persist(); }}>Switch to {bestF.f}</button>
        </div>
      )}
      <svg viewBox="0 0 100 112" class="pitch" style={{ width: '100%', background: '#1d7a48', borderRadius: 4, border: '2px solid var(--line)' }}>
        {[...Array(7)].map((_, i) => <rect key={i} x={0} y={i * 16} width={100} height={8} fill="#208651" />)}
        <rect x="4" y="3" width="92" height="106" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <line x1="4" y1="56" x2="96" y2="56" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <circle cx="50" cy="56" r="8" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <rect x="28" y="94" width="44" height="15" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <rect x="28" y="3" width="44" height="15" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        {lu.slots.map((slot, i) => {
          const p = lu.xi[i];
          const cx = 4 + (slot.x / 100) * 92;
          const cy = rows.cy(slot.y); // forwards near the top, keeper at the bottom
          const v = p ? Math.round(effectiveOvr(p, slot.pos)) : 0;
          const off = !!p && p.pos !== slot.pos; // playing out of his main position
          const group = LINE[slot.pos];
          return (
            <g key={i} onClick={() => p && nav.push({ kind: 'player', id: p.id })} style={{ cursor: p ? 'pointer' : 'default' }}>
              {p ? (
                <g transform={`translate(${cx - 4} ${cy - 4.5})`}>
                  <Portrait p={p} size={8} />
                  {p.locked && <rect x={-0.4} y={-0.4} width={8.8} height={9.9} fill="none" stroke="#ffcc4d" stroke-width="0.7" />}
                </g>
              ) : (
                <rect x={cx - 4} y={cy - 4.5} width={8} height={9} fill="none" stroke="#e8ecff" stroke-width="0.5" stroke-dasharray="1.5 1.5" opacity="0.6" />
              )}
              {p && (
                <g>
                  <circle cx={cx + 4.2} cy={cy - 4.4} r="2.7" fill={ovrColor(v)} stroke="#070b18" stroke-width="0.5" />
                  <text x={cx + 4.2} y={cy - 3.4} text-anchor="middle" font-size="2.8" font-family="Silkscreen" fill="#0b1020">{v}</text>
                </g>
              )}
              <text x={cx} y={cy + 7.5} text-anchor="middle" font-size="2.8" font-weight="700" fill="#fff" style={{ paintOrder: 'stroke' }} stroke="#000" stroke-width="0.6">{p ? p.last.slice(0, 9) : '-'}</text>
              <g>
                <rect x={cx - 3.9} y={cy + 8.4} width={7.8} height={3.4} rx="0.5" fill={POS_FILL[group]} stroke={off ? '#ffa62b' : '#070b18'} stroke-width={off ? 0.6 : 0.4} />
                <text x={cx} y={cy + 11} text-anchor="middle" font-size="2.4" font-family="Silkscreen" fill="#fff">{slot.pos}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div class="bench-head">Bench</div>
      <div class="bench" style={{ gridTemplateColumns: `repeat(${Math.max(lu.bench.length, 1)}, minmax(0, 1fr))` }}>
        {lu.bench.map((p) => (
          <div key={p.id} class="bench-p" onClick={() => nav.push({ kind: 'player', id: p.id })}>
            <div class="bench-img" style={p.locked ? { outline: '2px solid #ffcc4d' } : undefined}>
              <Portrait p={p} size={32} />
              <span class="bench-ovr" style={{ background: ovrColor(p.ovr) }}>{p.ovr}</span>
            </div>
            <div class="bench-name">{p.last}</div>
            <PosPill pos={p.pos} />
          </div>
        ))}
        {lu.bench.length === 0 && <span class="tiny dim">No substitutes.</span>}
      </div>
      {n < SQUAD_MIN && <div class="amber small" style={{ marginTop: 6 }}>Squad below {SQUAD_MIN}: sign players or promote academy players.</div>}
    </Card>
  );
}

registerSquadCard((s) => <Lineup s={s} />);
