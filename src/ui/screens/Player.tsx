import { ATTR_GROUPS, ATTR_LABELS, POSITION_WEIGHTS, POSITIONS } from '../../core/data/positions';
import { posOvr, familiarityMult } from '../../core/ratings';
import { Badge, Card, Hex, Overlay, PosPill, Bar } from '../components';
import { money, nav, useStore } from '../store';
import { knowledge, playerActions } from '../playerExtras';
import { PersonalityFace } from '../personalityFace';
import { Portrait } from '../portrait';

export function personalityLabel(v: number): string {
  return v < 20 ? 'Volatile' : v < 40 ? 'Demanding' : v < 65 ? 'Balanced' : v < 85 ? 'Professional' : 'Model Pro';
}

export function PlayerScreen({ id }: { id: number }) {
  const s = useStore().state!;
  const p = s.players.get(id);
  if (!p) return <Overlay title="Player"><div class="empty">Player no longer in the game.</div></Overlay>;
  const own = p.clubId === s.userClubId;
  const k = knowledge(s, p);
  const club = p.clubId != null ? s.clubs[p.clubId] : null;
  const age = s.season - p.birthYear;
  const show = (v: number) => (k.ovr != null ? v : '?');
  return (
    <Overlay title={`${p.first} ${p.last}`} sub={`${age} · ${p.nat} · ${club ? club.name : 'Free agent'}`}>
      <Card>
        <div class="row">
          <Portrait p={p} size={64} />
          <Hex value={k.ovr} size={54} />
          <div class="grow">
            <div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{POSITIONS.filter((x) => p.fam[x]).map((x) => <PosPill key={x} pos={x} />)}</div>
            <div class="small dim" style={{ marginTop: 6 }}>Potential: <b class="gold">{k.pot ?? '?'}</b></div>
            <div class="small dim">Value: <b>{money(p.value)}</b></div>
          </div>
          {club && <Badge club={club} size={36} />}
        </div>
        {own && (
          <div style={{ marginTop: 10 }} class="kv">
            <span>Morale</span><div><Bar value={p.morale} color="var(--blue)" /></div>
            <span>Personality</span><span class="row" style={{ gap: 6 }}><PersonalityFace v={p.personality} size={16} />{personalityLabel(p.personality)}</span>
            {p.injury > 0 && <><span>Injury</span><span class="red">{p.injuryName}, {p.injury} wk</span></>}
            {p.ban > 0 && <><span>Suspended</span><span class="red">{p.ban} match(es)</span></>}
          </div>
        )}
      </Card>
      {playerActions(s, p)}
      {p.contract && (
        <Card title="Contract">
          <div class="kv">
            <span>Type</span><span>{p.contract.type.replace('_', ' + ')}</span>
            <span>Wage</span><span>{money(p.contract.wage)}/wk</span>
            <span>Expires</span><span>June {p.contract.endSeason + 1}</span>
            <span>Role</span><span>{p.contract.role}</span>
            {p.contract.clauses.release != null && <><span>Release clause</span><span>{money(p.contract.clauses.release)}</span></>}
            {p.contract.clauses.sellOnPct != null && <><span>Sell-on</span><span>{p.contract.clauses.sellOnPct}% to {s.clubs[p.contract.clauses.sellOnClub!]?.short}</span></>}
          </div>
        </Card>
      )}
      <Card title="This season">
        <div class="kv">
          <span>Apps</span><span>{p.stats.apps}</span>
          <span>Goals / assists</span><span>{p.stats.goals} / {p.stats.assists}</span>
          <span>Avg rating</span><span>{p.stats.apps ? (p.stats.ratingSum / p.stats.apps).toFixed(2) : '-'}</span>
          {p.pos === 'GK' || p.pos === 'CB' ? <><span>Clean sheets</span><span>{p.stats.cs}</span></> : null}
        </div>
      </Card>
      {k.ovr != null ? (
        ATTR_GROUPS.filter((g) => (p.pos === 'GK' ? true : g.name !== 'Goalkeeping')).map((g) => (
          <Card key={g.name} title={g.name}>
            <div class="attrgrid">
              {g.attrs.map((a) => {
                const v = p.attrs[ATTR_INDEX[a]];
                // how much this attribute counts for his natural position (DESIGN 4.3 weights: 3 key, 2 important)
                const w = POSITION_WEIGHTS[p.pos][a] ?? 0;
                return <div class={`attr ${w >= 3 ? 'k3' : w === 2 ? 'k2' : ''}`} key={a}><span>{ATTR_LABELS[a]}</span><b style={{ color: v >= 70 ? 'var(--green)' : v >= 50 ? 'var(--text)' : 'var(--dim)' }}>{show(v)}</b></div>;
              })}
            </div>
          </Card>
        )).concat(<div class="tiny dim attr-legend" key="legend"><i class="k3" /> key for a {p.pos} <i class="k2" /> important</div>)
      ) : (
        <Card title="Attributes"><div class="dim small">Scout this player to see his attributes.</div></Card>
      )}
      {k.ovr != null && (
        <Card title="Positions">
          <div class="attrgrid">
            {POSITIONS.map((pos) => {
              const v = Math.round(posOvr(p.attrs, pos) * familiarityMult(p, pos));
              const f = p.fam[pos];
              return <div class={`attr ${f === 'N' ? 'pos-n' : f === 'A' ? 'pos-a' : ''}`} key={pos}><span>{pos} <span class="tiny">{f === 'N' ? 'natural' : f === 'A' ? 'accomplished' : ''}</span></span><b>{v}</b></div>;
            })}
          </div>
          <div class="tiny dim attr-legend" style={{ margin: '8px 0 0' }}><i class="pos-n" /> natural <i class="pos-a" /> accomplished <span style={{ marginLeft: 8 }}>others: unfamiliar</span></div>
        </Card>
      )}
      {p.career.length > 0 && (
        <Card title="Career">
          {[...p.career].reverse().map((c, i) => (
            <div class="between small" key={i} style={{ padding: '4px 0' }}>
              <span>{c.s}/{String(c.s + 1).slice(2)}</span>
              <span class="dim">{c.c >= 0 ? s.clubs[c.c]?.short : 'Free'}</span>
              <span>{c.apps} apps, {c.goals} gls</span>
              <span>{k.ovr != null ? c.ovr : ''}</span>
            </div>
          ))}
        </Card>
      )}
      {!own && club && <button class="btn block" onClick={() => nav.push({ kind: 'club', id: club.id })}>View {club.short}</button>}
    </Overlay>
  );
}

import { A } from '../../core/data/positions';
const ATTR_INDEX = A;
