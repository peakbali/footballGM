import { SwipePages } from '../swipe';
import { useState } from 'preact/hooks';
import { computeTable } from '../../core/league';
import { autoPick, teamOvr } from '../../core/selection';
import { CAL, buildSquadIndex } from '../../core/state';
import { Badge, Card, Form } from '../components';
import { nav, useStore } from '../store';
import type { Fixture } from '../../core/types';

const SEGS = ['table', 'power', 'fixtures', 'stats', 'history'] as const;
export function LeagueScreen() {
  const st = useStore();
  const s = st.state!;
  const userDiv = s.leagues.find((l) => l.clubIds.includes(s.userClubId))!.div;
  const [div, setDiv] = useState(userDiv);
  const [seg, setSeg] = useState<(typeof SEGS)[number]>('table');
  const lg = s.leagues[div - 1];

  return (
    <div>
      <div class="chips">
        {s.leagues.map((l) => (
          <button key={l.div} class={`chip ${l.div === div ? 'on' : ''}`} onClick={() => setDiv(l.div)}>
            {l.div === userDiv ? '★ ' : ''}{l.short}
          </button>
        ))}
      </div>
      <div class="seg" data-seg-bar>
        {SEGS.map((k) => (
          <button key={k} class={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>{k}</button>
        ))}
      </div>
      <SwipePages keys={SEGS} value={seg} onChange={setSeg}>
      {seg === 'table' && <TableView div={div} />}
      {seg === 'power' && <PowerView div={div} />}
      {seg === 'fixtures' && <FixturesView div={div} />}
      {seg === 'stats' && <StatsView div={div} />}
      {seg === 'history' && <HistoryView />}
      </SwipePages>
      <div class="tiny dim" style={{ marginTop: 6 }}>{lg.name} · division {div}</div>
    </div>
  );
}

function TableView({ div }: { div: number }) {
  const s = useStore().state!;
  const lg = s.leagues[div - 1];
  const t = computeTable(s, lg);
  return (
    <Card>
      <table class="tbl">
        <thead>
          <tr><th class="l">#</th><th class="l">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
        </thead>
        <tbody>
          {t.map((r, i) => {
            const cls = [r.clubId === s.userClubId ? 'me' : '', div > 1 && i < 2 ? 'up' : div > 1 && i < 6 ? 'po' : i >= 17 ? 'dn' : div === 1 && i === 0 ? 'up' : ''].join(' ');
            return (
              <tr key={r.clubId} class={cls} onClick={() => nav.push({ kind: 'club', id: r.clubId })}>
                <td class="l dim">{i + 1}</td>
                <td class="l club">{s.clubs[r.clubId].short}</td>
                <td class="dim">{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
                <td class="dim">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td><b>{r.pts}</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div class="tiny dim" style={{ marginTop: 8 }}>
        <span class="green">▌</span>{div > 1 ? 'Promoted' : 'Champion'} {div > 1 && <><span style={{ color: 'var(--blue)' }}>▌</span>Playoffs </>}<span class="red">▌</span>{div < 10 ? 'Relegated' : 'Drop to regional pool'}
      </div>
    </Card>
  );
}

/** Power ranking (DESIGN 13.2w): every club's team OVR, the same number the Formation page shows for your XI. */
function PowerView({ div }: { div: number }) {
  const s = useStore().state!;
  const lg = s.leagues[div - 1];
  const idx = buildSquadIndex(s);
  const table = computeTable(s, lg);
  const played = table.some((r) => r.p > 0);
  const pos = new Map(table.map((r, i) => [r.clubId, played ? i + 1 : '-']));
  const rows = lg.clubIds
    .map((id) => ({ id, ovr: teamOvr(autoPick(idx.get(id) ?? [], s.clubs[id].formation, 7, id === s.userClubId)) }))
    .sort((a, b) => b.ovr - a.ovr);
  const top = rows[0]?.ovr ?? 1;
  return (
    <Card>
      <table class="tbl">
        <thead>
          <tr><th class="l">#</th><th class="l">Club</th><th class="l">Strength</th><th>OVR</th><th>Pos</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} class={r.id === s.userClubId ? 'me' : ''} onClick={() => nav.push({ kind: 'club', id: r.id })}>
              <td class="l dim">{i + 1}</td>
              <td class="l club">{s.clubs[r.id].short}</td>
              <td class="l" style={{ width: '34%' }}><div class="pw-bar"><i style={{ width: `${Math.max(4, 100 - (top - r.ovr) * 8)}%` }} /></div></td>
              <td><b>{Math.round(r.ovr)}</b></td>
              <td class="dim">{pos.get(r.id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="tiny dim" style={{ marginTop: 8 }}>Team OVR of each club's best available XI in its formation. Pos is the current league position.</div>
    </Card>
  );
}

export function FixtureRow({ f }: { f: Fixture }) {
  const s = useStore().state!;
  const h = s.clubs[f.home];
  const a = s.clubs[f.away];
  const me = f.home === s.userClubId || f.away === s.userClubId;
  return (
    <div class="item" style={me ? { background: 'rgba(255,204,77,.08)' } : {}} onClick={() => (f.hg != null && s.reports.has(f.id) ? nav.push({ kind: 'match', fixtureId: f.id }) : nav.push({ kind: 'club', id: f.home === s.userClubId ? f.away : f.home }))}>
      <div class="grow row" style={{ justifyContent: 'flex-end', gap: 6, minWidth: 0 }}><span class="name" style={{ textAlign: 'right' }}>{h.short}</span><Badge club={h} size={18} /></div>
      <div class="px" style={{ minWidth: 46, textAlign: 'center' }}>{f.hg != null ? `${f.hg}-${f.ag}` : 'v'}</div>
      <div class="grow row" style={{ gap: 6, minWidth: 0 }}><Badge club={a} size={18} /><span class="name">{a.short}</span></div>
    </div>
  );
}

function FixturesView({ div }: { div: number }) {
  const s = useStore().state!;
  const weeks = [...new Set(s.fixtures.filter((f) => f.div === div).map((f) => f.week))].sort((a, b) => a - b);
  const cur = weeks.find((w) => w >= s.week) ?? weeks[weeks.length - 1] ?? CAL.firstRoundWeek;
  const [wk, setWk] = useState(cur);
  const [mine, setMine] = useState(false);
  const list = mine ? s.fixtures.filter((f) => f.div === div && (f.home === s.userClubId || f.away === s.userClubId)) : s.fixtures.filter((f) => f.div === div && f.week === wk);
  const i = weeks.indexOf(wk);
  return (
    <Card>
      <div class="between" style={{ marginBottom: 6 }}>
        {!mine ? (
          <>
            <button class="btn small" disabled={i <= 0} onClick={() => setWk(weeks[i - 1])}>‹</button>
            <span class="px small">{list[0]?.playoff ? `Playoff ${list[0].playoff}` : `Round ${weeks.indexOf(wk) + 1}`}</span>
            <button class="btn small" disabled={i >= weeks.length - 1} onClick={() => setWk(weeks[i + 1])}>›</button>
          </>
        ) : <span class="px small">Your fixtures</span>}
        <button class="linkbtn" onClick={() => setMine(!mine)}>{mine ? 'By round' : 'Mine'}</button>
      </div>
      {list.length === 0 && <div class="empty">No fixtures.</div>}
      {list.map((f) => <FixtureRow key={f.id} f={f} />)}
    </Card>
  );
}

function StatsView({ div }: { div: number }) {
  const s = useStore().state!;
  const lg = s.leagues[div - 1];
  const idx = buildSquadIndex(s);
  const players = lg.clubIds.flatMap((id) => idx.get(id) ?? []);
  const scorers = [...players].filter((p) => p.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10);
  const assists = [...players].filter((p) => p.stats.assists > 0).sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 5);
  const rated = [...players].filter((p) => p.stats.apps >= Math.max(3, s.week / 6)).sort((a, b) => b.stats.ratingSum / b.stats.apps - a.stats.ratingSum / a.stats.apps).slice(0, 5);
  const Row = ({ p, v }: { p: (typeof players)[0]; v: string | number }) => (
    <div class="item" onClick={() => nav.push({ kind: 'player', id: p.id })}>
      <Badge club={s.clubs[p.clubId!]} size={20} />
      <div class="grow"><div class="name">{p.first[0]}. {p.last}</div><div class="tiny dim">{s.clubs[p.clubId!].short}</div></div>
      <b class="px">{v}</b>
    </div>
  );
  return (
    <>
      <Card title="Top scorers">{scorers.length ? scorers.map((p) => <Row key={p.id} p={p} v={p.stats.goals} />) : <div class="empty">No goals yet.</div>}</Card>
      <Card title="Assists">{assists.map((p) => <Row key={p.id} p={p} v={p.stats.assists} />)}</Card>
      <Card title="Best average rating">{rated.map((p) => <Row key={p.id} p={p} v={(p.stats.ratingSum / p.stats.apps).toFixed(2)} />)}</Card>
    </>
  );
}

function HistoryView() {
  const s = useStore().state!;
  const mine = s.history.filter((h) => h.clubId === s.userClubId).sort((a, b) => b.season - a.season);
  const champs = [...new Set(s.history.map((h) => h.season))].sort((a, b) => b - a);
  return (
    <>
      <Card title="Your club by season">
        {mine.length === 0 && <div class="empty">History builds up as seasons finish.</div>}
        {mine.map((h) => (
          <div class="item" key={h.season}>
            <div class="grow"><div class="name">{h.season}/{String(h.season + 1).slice(2)} · {s.leagues[h.div - 1]?.short ?? `Div ${h.div}`}</div><div class="tiny dim">{h.w}W {h.d}D {h.l}L · {h.gf}-{h.ga}</div></div>
            <div style={{ textAlign: 'right' }}><div class="px">{h.pos}</div><div class={`tiny ${h.outcome === 'relegated' ? 'red' : h.outcome === 'stayed' ? 'dim' : 'green'}`}>{h.outcome}</div></div>
          </div>
        ))}
      </Card>
      <Card title="Champions">
        {champs.map((season) => (
          <div key={season} class="small" style={{ marginBottom: 6 }}>
            <b>{season}/{String(season + 1).slice(2)}</b>{' '}
            <span class="dim">{s.history.filter((h) => h.season === season && h.pos === 1).sort((a, b) => a.div - b.div).map((h) => s.clubs[h.clubId].short).join(' · ')}</span>
          </div>
        ))}
        {champs.length === 0 && <div class="empty">No completed seasons yet.</div>}
      </Card>
    </>
  );
}

export { Form };
