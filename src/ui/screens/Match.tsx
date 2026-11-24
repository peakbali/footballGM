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
  const scorers = (clubId: number) => {
    const by = new Map<number, number[]>();
    for (const e of rep?.events ?? []) if ((e.t === 'goal' || e.t === 'pen') && e.c === clubId && e.p != null) by.set(e.p, [...(by.get(e.p) ?? []), e.m]);
    return [...by.entries()];
  };
  const rateCls = (r?: number) => (r != null && r >= 7.5 ? 'chip-r hi' : r != null && r < 6 ? 'chip-r lo' : 'chip-r');
  const motm = rep?.motm != null ? s.players.get(rep.motm) : undefined;
  const motmClub = motm?.clubId != null ? s.clubs[motm.clubId] : undefined;
  const Side = ({ c }: { c: typeof h }) => (
    <div class="team" onClick={() => nav.push({ kind: 'club', id: c.id })}>
      <Badge club={c} size={48} />
      <div>{c.short}</div>
      <div class="scorers">
        {scorers(c.id).map(([id, mins]) => (
          <div key={id}>{name(id)} <span class="min">{mins.map((m) => `${m}'`).join(' ')}</span></div>
        ))}
      </div>
    </div>
  );
  return (
    <Overlay title={`${h.short} v ${a.short}`} sub={`Week ${f.week}${f.att ? ` · Attendance ${f.att.toLocaleString()}` : ''}`}>
      <Card art="stadium" wide>
        <div class="match-hero">
          <div class="tint" style={{ background: `linear-gradient(90deg, ${h.colors[0]}, transparent 40%, transparent 60%, ${a.colors[0] === h.colors[0] ? a.colors[1] : a.colors[0]})` }} />
          <div class="ft">{f.hg != null ? 'FULL TIME' : 'FIXTURE'}{f.cup ? ' · CUP' : ''}</div>
          <div class="teams">
            <Side c={h} />
            <div class="score">{f.hg ?? '-'}-{f.ag ?? '-'}</div>
            <Side c={a} />
          </div>
          {f.pens && <div class="small dim pens">Won {f.pens} on penalties</div>}
        </div>
      </Card>
      {matchExtras(s, f)}
      {rep && (
        <Card title="Player ratings" art="scoreboard">
          {motm && (
            <div class="motm" onClick={() => nav.push({ kind: 'player', id: motm.id })}>
              <span class="gold">★</span>
              <div class="grow">Man of the match <b>{motm.first[0]}. {motm.last}</b>{motmClub ? <span class="dim"> · {motmClub.short}</span> : null}</div>
              <b class="gold">{rep.ratings[motm.id]?.toFixed(1)}</b>
            </div>
          )}
          <div class="rate-grid">
            {[0, 1].map((side) => (
              <div key={side}>
                <div class="tiny dim" style={{ marginBottom: 4 }}>{(side ? a : h).short}</div>
                {rep.lineups[side].map((id) => (
                  <div key={id} class="rate" onClick={() => nav.push({ kind: 'player', id })}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(id)}{rep.motm === id ? ' ★' : ''}</span>
                    <span class={rateCls(rep.ratings[id])}>{rep.ratings[id]?.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
      {rep && (
        <Card title="Match events" art="whistle">
          {rep.events.filter((e) => ICON[e.t] !== undefined).map((e, i) => (
            <div class="event" key={i} style={e.t === 'goal' || e.t === 'pen' ? { background: 'rgba(47,191,113,.08)' } : {}}>
              <span class="m">{e.m}'</span>
              <span>{ICON[e.t]} {describe(e)} <span class="tiny dim">{e.t !== 'ko' && e.t !== 'ft' ? s.clubs[e.c].abbrev : ''}</span></span>
            </div>
          ))}
        </Card>
      )}
      {st && (
        <Card title="Stats" art="pitch">
          {([['Possession', st.poss, '%'], ['Shots', st.shots, ''], ['On target', st.onTarget, ''], ['xG', st.xg, ''], ['Corners', st.corners, ''], ['Fouls', st.fouls, ''], ['Yellow cards', st.yellows, '']] as [string, [number, number], string][]).map(([label, [x, y], u]) => (
            <div key={label}>
              <div class="statrow"><b>{x}{u}</b><span class="dim">{label}</span><b>{y}{u}</b></div>
              <div class="statrow" style={{ marginTop: -4 }}><span /><div class="dual"><div style={{ flex: x || 0.001, background: h.colors[0] === '#ffffff' ? 'var(--flood)' : h.colors[0] }} /><div style={{ flex: y || 0.001, background: a.colors[0] === h.colors[0] ? a.colors[1] : a.colors[0] }} /></div><span /></div>
            </div>
          ))}
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
