import { computeTable, nextFixture } from '../../core/league';
import { CAL, userClub, weekDate } from '../../core/state';
import { ordinal } from '../../core/season';
import { Badge, Card, Form } from '../components';
import { nav, store, useStore } from '../store';
import { Stadium } from '../stadium';
import { hubExtras } from '../hubExtras';
import { sfx } from '../audio';
import { openReelIfPending } from '../features/history';

export function HubScreen() {
  const st = useStore();
  const s = st.state!;
  const club = userClub(s);
  const lg = s.leagues.find((l) => l.clubIds.includes(club.id))!;
  const table = computeTable(s, lg);
  const pos = table.findIndex((r) => r.clubId === club.id);
  const nf = nextFixture(s, club.id);
  const last = s.fixtures.filter((f) => f.hg != null && (f.home === club.id || f.away === club.id)).sort((a, b) => b.week - a.week)[0];
  const unread = s.inbox.filter((m) => !m.read).length;
  const pending = s.inbox.filter((m) => m.action && !m.resolved);
  const around = table.slice(Math.max(0, Math.min(pos - 2, table.length - 5)), Math.max(0, Math.min(pos - 2, table.length - 5)) + 5);

  const phase = s.week < CAL.firstRoundWeek ? 'Pre-season' : s.week <= CAL.firstRoundWeek + CAL.rounds - 1 ? 'League season' : s.week <= CAL.playoffFinalWeek ? 'Playoffs' : 'Off-season';

  return (
    <div>
      <div class="hub-hero">
        <Stadium />
        <div class="over between">
          <span class="px small" style={{ textShadow: '2px 2px 0 #000' }}>{club.stadium}</span>
          <span class="px small gold" style={{ textShadow: '2px 2px 0 #000' }}>{ordinal(pos + 1)}</span>
        </div>
      </div>

      {pending.length > 0 && (
        <Card title="Needs your decision">
          {pending.slice(0, 3).map((m) => (
            <div class="item" key={m.id} onClick={() => nav.push({ kind: 'inbox' })}>
              <div class="grow"><div class="name">{m.title}</div><div class="tiny dim">{m.cat}</div></div>
              <span class="gold">!</span>
            </div>
          ))}
        </Card>
      )}

      {last && (
        <Card title="Last result" action={<button class="linkbtn" onClick={() => nav.push({ kind: 'match', fixtureId: last.id })}>Report</button>}>
          <div class="bigscore" onClick={() => nav.push({ kind: 'match', fixtureId: last.id })}>
            <div class="side"><Badge club={s.clubs[last.home]} size={34} />{s.clubs[last.home].short}</div>
            <div class="score">{last.hg}-{last.ag}</div>
            <div class="side"><Badge club={s.clubs[last.away]} size={34} />{s.clubs[last.away].short}</div>
          </div>
          {last.pens && <div class="tiny dim" style={{ textAlign: 'center' }}>Penalties {last.pens}</div>}
        </Card>
      )}

      <Card title={nf ? `Next match · Wk ${nf.week}` : phase}>
        {nf ? (
          <div class="row" onClick={() => nav.push({ kind: 'club', id: nf.home === club.id ? nf.away : nf.home })}>
            <Badge club={s.clubs[nf.home === club.id ? nf.away : nf.home]} size={36} />
            <div class="grow">
              <div class="name">{s.clubs[nf.home === club.id ? nf.away : nf.home].name}</div>
              <div class="tiny dim">{nf.home === club.id ? 'Home' : 'Away'} · {weekDate(s.season, nf.week)}{nf.playoff ? ` · Playoff ${nf.playoff}` : ''}</div>
            </div>
            <span class="tiny dim">{ordinal(table.findIndex((r) => r.clubId === (nf.home === club.id ? nf.away : nf.home)) + 1)}</span>
          </div>
        ) : (
          <div class="dim small">No match scheduled. {phase === 'Off-season' ? 'The new season starts in July.' : ''}</div>
        )}
      </Card>

      <Card title={lg.short} action={<button class="linkbtn" onClick={() => nav.setTab('league')}>Table</button>}>
        <table class="tbl">
          <tbody>
            {around.map((r) => {
              const i = table.indexOf(r);
              return (
                <tr key={r.clubId} class={r.clubId === club.id ? 'me' : ''}>
                  <td class="l dim" style={{ width: 22 }}>{i + 1}</td>
                  <td class="l club">{s.clubs[r.clubId].short}</td>
                  <td><Form form={r.form} /></td>
                  <td class="dim">{r.p}</td>
                  <td><b>{r.pts}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {hubExtras(s)}

      <Card title={`Inbox${unread ? ` · ${unread} new` : ''}`} action={<button class="linkbtn" onClick={() => nav.push({ kind: 'inbox' })}>All</button>}>
        {s.inbox.length === 0 && <div class="dim small">No messages yet.</div>}
        {s.inbox.slice(-4).reverse().map((m) => (
          <div class={`item inbox-item ${m.read ? '' : 'unread'}`} key={m.id} onClick={() => nav.push({ kind: 'inbox' })}>
            <div class="grow"><div class="name">{m.title}</div><div class="tiny dim">{m.cat} · Wk {m.week}</div></div>
          </div>
        ))}
      </Card>

      <button class="btn gold continue" disabled={st.busy} onClick={async () => {
        const r = await store.continueGame();
        const f = r?.userFixture;
        if (f) {
          const mine = f.home === club.id ? f.hg! - f.ag! : f.ag! - f.hg!;
          sfx(mine > 0 ? 'win' : mine < 0 ? 'loss' : 'click');
        }
        if (r?.seasonEnded && openReelIfPending(s)) return;
        if (f) nav.push({ kind: 'match', fixtureId: f.id, after: true });
        else if (r?.messages.some((m) => m.action && !m.resolved)) nav.push({ kind: 'inbox' });
      }}>
        {st.busy ? <span class="spinner">Playing...</span> : 'Continue ›'}
      </button>
    </div>
  );
}
