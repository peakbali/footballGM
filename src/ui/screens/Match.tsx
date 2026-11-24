import { Badge, Card, Overlay } from '../components';
import { nav, useStore } from '../store';
import { matchExtras } from '../matchExtras';
import type { MatchEvent } from '../../core/types';

const ICON: Record<string, string> = { goal: '⚽', pen: '⚽ (pen)', save: '🧤', miss: '↗', yellow: '🟨', red: '🟥', injury: '✚', sub: '⇄', ko: '', ft: '', ht: '' };

export function MatchScreen({ fixtureId, after }: { fixtureId: number; after?: boolean }) {
  const s = useStore().state!;
  const f = s.fixtures.find((x) => x.id === fixtureId);
  if (!f) return <Overlay title="Match"><div class="empty">Match not found.</div></Overlay>;
  const rep = s.reports.get(fixtureId);
  const h = s.clubs[f.home];
  const a = s.clubs[f.away];
  const name = (id?: number) => {
    if (id == null) return '';
    const p = s.players.get(id);
    return p ? `${p.first[0]}. ${p.last}` : 'Unknown';
  };
  const describe = (e: MatchEvent) => {
    switch (e.t) {
      case 'goal': return <><b>GOAL</b> {name(e.p)}{e.p2 ? <span class="dim"> (assist {name(e.p2)})</span> : ''}</>;
      case 'pen': return <><b>PENALTY GOAL</b> {name(e.p)}</>;
      case 'save': return <>{name(e.p)} forces a save{e.p2 ? <> from {name(e.p2)}</> : ''} <span class="dim tiny">xG {e.xg}</span></>;
      case 'miss': return <>{name(e.p)} shoots wide <span class="dim tiny">xG {e.xg}</span></>;
      case 'yellow': return <>Booked: {name(e.p)}</>;
      case 'red': return <><b class="red">Sent off:</b> {name(e.p)}</>;
      case 'injury': return <>{name(e.p)} is injured</>;
      case 'sub': return <>{name(e.p)} on, {name(e.p2)} off</>;
      case 'ko': return <span class="dim">Kick-off</span>;
      case 'ft': return <b>Full time</b>;
      default: return null;
    }
  };
  const st = rep?.stats;
  return (
    <Overlay title={`${h.short} v ${a.short}`} sub={`Week ${f.week}${f.att ? ` · Attendance ${f.att.toLocaleString()}` : ''}`}>
      <Card>
        <div class="bigscore">
          <div class="side" onClick={() => nav.push({ kind: 'club', id: h.id })}><Badge club={h} size={44} />{h.short}</div>
          <div class="score">{f.hg ?? '-'}-{f.ag ?? '-'}</div>
          <div class="side" onClick={() => nav.push({ kind: 'club', id: a.id })}><Badge club={a} size={44} />{a.short}</div>
        </div>
        {f.pens && <div class="small dim" style={{ textAlign: 'center' }}>Won {f.pens} on penalties</div>}
        {rep && (
          <div class="small" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>{rep.events.filter((e) => (e.t === 'goal' || e.t === 'pen') && e.c === h.id).map((e, i) => <div key={i}>{name(e.p)} {e.m}'</div>)}</div>
            <div style={{ textAlign: 'right' }}>{rep.events.filter((e) => (e.t === 'goal' || e.t === 'pen') && e.c === a.id).map((e, i) => <div key={i}>{e.m}' {name(e.p)}</div>)}</div>
          </div>
        )}
      </Card>
      {matchExtras(s, f)}
      {st && (
        <Card title="Stats">
          {([['Possession', st.poss, '%'], ['Shots', st.shots, ''], ['On target', st.onTarget, ''], ['xG', st.xg, ''], ['Corners', st.corners, ''], ['Fouls', st.fouls, ''], ['Yellow cards', st.yellows, '']] as [string, [number, number], string][]).map(([label, [x, y], u]) => (
            <div key={label}>
              <div class="statrow"><b>{x}{u}</b><span class="dim">{label}</span><b>{y}{u}</b></div>
              <div class="statrow" style={{ marginTop: -4 }}><span /><div class="dual"><div style={{ flex: x || 0.001, background: h.colors[0] === '#ffffff' ? 'var(--flood)' : h.colors[0] }} /><div style={{ flex: y || 0.001, background: a.colors[0] === h.colors[0] ? a.colors[1] : a.colors[0] }} /></div><span /></div>
            </div>
          ))}
        </Card>
      )}
      {rep && (
        <Card title="Match events">
          {rep.events.filter((e) => ICON[e.t] !== undefined).map((e, i) => (
            <div class="event" key={i} style={e.t === 'goal' || e.t === 'pen' ? { background: 'rgba(47,191,113,.08)' } : {}}>
              <span class="m">{e.m}'</span>
              <span>{ICON[e.t]} {describe(e)} <span class="tiny dim">{e.t !== 'ko' && e.t !== 'ft' ? s.clubs[e.c].abbrev : ''}</span></span>
            </div>
          ))}
        </Card>
      )}
      {rep && (
        <Card title="Player ratings">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[0, 1].map((side) => (
              <div key={side}>
                {rep.lineups[side].map((id) => (
                  <div key={id} class="between small" style={{ padding: '3px 0' }} onClick={() => nav.push({ kind: 'player', id })}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(id)}{rep.motm === id ? ' ★' : ''}</span>
                    <b style={{ color: (rep.ratings[id] ?? 6) >= 7.5 ? 'var(--green)' : (rep.ratings[id] ?? 6) < 6 ? 'var(--red)' : 'var(--text)' }}>{rep.ratings[id]?.toFixed(1)}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
      {!rep && <div class="empty">Detailed reports are kept for your own league this season.</div>}
      {after && (
        <>
          <div style={{ height: 70 }} />
          <button class="btn gold continue" onClick={() => nav.setTab('hub')}>Continue ›</button>
        </>
      )}
    </Overlay>
  );
}
