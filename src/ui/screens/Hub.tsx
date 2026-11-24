import { computeTable, nextFixture } from '../../core/league';
import { CAL, userClub, weekDate } from '../../core/state';
import { ordinal } from '../../core/season';
import { projection } from '../../core/systems/finance';
import { Badge, Card, Form, Hex } from '../components';
import { autoPick, unitRatings } from '../../core/selection';
import { effectiveOvr } from '../../core/ratings';
import { squadOf } from '../../core/state';
import { nav, money, store, useStore } from '../store';
import { Stadium } from '../stadium';
import { sfx } from '../audio';
import { openReelIfPending } from '../features/history';
import { cupLine } from '../features/cupView';
import { CashChart } from '../features/clubTab';

/**
 * Hub (DESIGN 13.2): everything on one phone screen, no scrolling.
 * Top to bottom: next match over the pixel stadium, league table, money, inbox. Continue sits bottom right.
 */
export function HubScreen() {
  const st = useStore();
  const s = st.state!;
  const club = userClub(s);
  const lg = s.leagues.find((l) => l.clubIds.includes(club.id))!;
  const table = computeTable(s, lg);
  const pos = table.findIndex((r) => r.clubId === club.id);
  const nf = nextFixture(s, club.id);
  const last = s.fixtures.filter((f) => f.hg != null && (f.home === club.id || f.away === club.id)).sort((a, b) => b.week - a.week)[0];
  const pr = projection(s);
  // starting XI OVR: average effective rating of the auto-picked XI, and where it ranks in the league
  const xiAvg = (clubId: number) => {
    const c = s.clubs[clubId];
    const lu = autoPick(squadOf(s, clubId), c.formation);
    const v = lu.xi.map((p, i) => (p ? effectiveOvr(p, lu.slots[i].pos) : 0));
    return { avg: v.reduce((a, b) => a + b, 0) / (v.length || 1), lu };
  };
  const mine = xiAvg(club.id);
  const xi = Math.round(mine.avg);
  const xiRank = 1 + lg.clubIds.filter((id) => id !== club.id && xiAvg(id).avg > mine.avg).length;
  const units = unitRatings(mine.lu);
  const cup = cupLine(s);
  const from = Math.max(0, Math.min(pos - 2, table.length - 5));
  const around = table.slice(from, from + 5);
  const pendingReel = s.ext.reelPending as number | undefined;
  const reelUnseen = pendingReel != null && s.ext.reelSeen !== pendingReel;

  const phase = s.week < CAL.firstRoundWeek ? 'Pre-season' : s.week <= CAL.firstRoundWeek + CAL.rounds - 1 ? 'League season' : s.week <= CAL.playoffFinalWeek ? 'Playoffs' : 'Off-season';
  const oppId = nf ? (nf.home === club.id ? nf.away : nf.home) : null;
  const opp = oppId != null ? s.clubs[oppId] : null;
  const home = nf?.home === club.id;

  // decisions first, then newest messages; the card shows as many as fit
  const decisions = s.inbox.filter((m) => m.action && !m.resolved).reverse();
  const rest = s.inbox.filter((m) => !(m.action && !m.resolved)).reverse();
  const list = [...decisions, ...rest].slice(0, 5);
  const unread = s.inbox.filter((m) => !m.read).length;

  let lastTag: { cls: string; txt: string } | null = null;
  if (last) {
    const mine = last.home === club.id ? last.hg! - last.ag! : last.ag! - last.hg!;
    lastTag = { cls: mine > 0 ? 'W' : mine < 0 ? 'L' : 'D', txt: `${s.clubs[last.home].abbrev} ${last.hg}-${last.ag} ${s.clubs[last.away].abbrev}` };
  }

  return (
    <div class="hub">
      <div class="hub-hero" style={{ borderColor: club.colors[0] === '#ffffff' ? 'var(--gold)' : club.colors[0] }}>
        <Stadium />
        <div class="shade" />
        <div class="fix">
          <div class="xi" title="Starting XI OVR">
            <div class="px tiny gold">STARTING XI</div>
            <Hex value={xi} size={78} label={`Starting XI OVR ${xi}`} />
            <div class="px tiny dim">{ordinal(xiRank)} of {lg.clubIds.length}</div>
            <div class="units px">
              <span>A <b>{Math.round(units.att)}</b></span><span>M <b>{Math.round(units.mid)}</b></span><span>D <b>{Math.round(units.def)}</b></span><span>G <b>{Math.round(units.gk)}</b></span>
            </div>
          </div>
          <div class="nm">
            <div class="px tiny dim">{nf ? `NEXT · WK ${nf.week} · ${weekDate(s.season, nf.week)}` : phase.toUpperCase()}</div>
            {nf && opp ? (
              <div class="vs" onClick={() => nav.push({ kind: 'club', id: opp.id })}>
                <Badge club={opp} size={40} />
                <div class="oppname">{home ? 'vs' : 'at'} {opp.name}</div>
              </div>
            ) : (
              <div class="small dim" style={{ marginTop: 6 }}>No match scheduled. {phase === 'Off-season' ? 'The new season starts in July.' : ''}</div>
            )}
            <div class="chips-row">
              {nf && <span class="tag">{home ? 'HOME' : 'AWAY'}</span>}
              {nf?.playoff && <span class="tag gold">PLAYOFF {nf.playoff}</span>}
              {opp && <span class="tag">{ordinal(table.findIndex((r) => r.clubId === opp.id) + 1)}</span>}
              {lastTag && <span class={`tag last ${lastTag.cls}`} onClick={() => nav.push({ kind: 'match', fixtureId: last!.id })}>{lastTag.cls} {lastTag.txt}</span>}
            </div>
          </div>
        </div>
      </div>

      <Card title={`${lg.short} · ${ordinal(pos + 1)}`} art="scoreboard" action={<button class="linkbtn" onClick={() => nav.setTab('league')}>Full table</button>}>
        <table class="tbl compact">
          <tbody>
            {around.map((r) => {
              const i = table.indexOf(r);
              return (
                <tr key={r.clubId} class={r.clubId === club.id ? 'me' : i < 2 ? 'up' : i < 6 ? 'po' : i >= table.length - 3 ? 'dn' : ''}>
                  <td class="l dim" style={{ width: 22 }}>{i + 1}</td>
                  <td class="l club">{s.clubs[r.clubId].short}</td>
                  <td><Form form={r.form} /></td>
                  <td class="dim">{r.p}</td>
                  <td class="dim">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                  <td><b>{r.pts}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {cup && <div class="tiny dim cupline" onClick={() => nav.push({ kind: 'custom', key: 'cup' })}>🏆 FA Cup: <span class="gold">{cup}</span> ›</div>}
      </Card>

      <Card title="Money" art="money" action={<button class="linkbtn" onClick={() => nav.setTab('club')}>Details</button>}>
        <div class="money-row">
          <div><div class="tiny dim">Cash</div><b class={`px big ${club.cash < 0 ? 'red' : 'gold'}`}>{money(club.cash)}</b></div>
          <div><div class="tiny dim">By 30 June</div><b class={`px big ${pr.end < 0 ? 'red' : 'green'}`}>{money(pr.end)}</b></div>
          <div class="spark"><CashChart s={s} /></div>
        </div>
      </Card>

      <Card title={`Inbox${unread ? ` · ${unread} new` : ''}`} art="staff" action={<button class="linkbtn" onClick={() => nav.push({ kind: 'inbox' })}>All</button>}>
        <div class="inbox-list">
          {reelUnseen && (
            <button class="btn gold block reel-btn" onClick={() => nav.push({ kind: 'custom', key: 'reel', data: pendingReel })}>★ Season review</button>
          )}
          {list.length === 0 && <div class="dim small">No messages yet.</div>}
          {list.map((m) => {
            const decide = !!m.action && !m.resolved;
            return (
              <div class={`item inbox-item ${m.read && !decide ? '' : 'unread'}`} key={m.id} onClick={() => nav.push({ kind: 'inbox' })}>
                <div class="grow"><div class="name">{m.title}</div><div class="tiny dim">{m.cat} · Wk {m.week}</div></div>
                {decide && <span class="gold px">!</span>}
              </div>
            );
          })}
        </div>
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
