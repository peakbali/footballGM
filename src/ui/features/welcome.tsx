/**
 * Welcome window (DESIGN 13.3b): greets the manager at the start of a career and of every new season, with the
 * club, the division, the squad's strength in the league, the board's goals, the key dates and a short guide.
 * The manager's name is set here (per save) and the [?] button in the header reopens the window any time.
 */
import { useState } from 'preact/hooks';
import { CAL, buildSquadIndex, userClub, type GameState } from '../../core/state';
import { autoPick, teamOvr } from '../../core/selection';
import { boardState, approvalLabel } from '../../core/systems/board';
import { seasons } from '../../core/systems/chronicle';
import { Badge } from '../components';
import { nav, store, useStore } from '../store';
import { registerOverlay } from '../overlays';

export const managerName = (s: GameState): string => ((s.ext.manager as string | undefined) ?? '').trim();

const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const OUTCOME: Record<string, string> = { champion: 'champions', promoted: 'promoted', playoff_winner: 'promoted via the playoffs', relegated: 'relegated' };

/** Opens the window once per season (after the season review), when nothing else is on screen. */
export function welcomeDue(s: GameState): boolean {
  if (s.ext.welcomeSeen === s.season) return false;
  const reel = s.ext.reelPending as number | undefined;
  return reel == null || s.ext.reelSeen === reel;
}

function Welcome() {
  const s = useStore().state!;
  const club = userClub(s);
  const lg = s.leagues.find((l) => l.clubIds.includes(club.id))!;
  const [name, setName] = useState(managerName(s));
  const last = seasons(s).at(-1);
  const idx = buildSquadIndex(s);
  const ovr = new Map(lg.clubIds.map((id) => [id, teamOvr(autoPick(idx.get(id) ?? [], s.clubs[id].formation, 7, id === s.userClubId))]));
  const mine = ovr.get(club.id) ?? 0;
  const rank = 1 + lg.clubIds.filter((id) => id !== club.id && (ovr.get(id) ?? 0) > mine).length;
  const b = boardState(s);
  const close = () => {
    nav.pop();
    void store.persist();
  };
  const shown = name.trim() || 'boss';
  return (
    <div class="overlay welcome-bg" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="welcome card">
        <div class="welcome-kicker gold">Season {s.season}/{String(s.season + 1).slice(2)}</div>
        <div class="welcome-hi">Welcome{seasons(s).length ? ' back' : ''}, {shown}!</div>
        <label class="welcome-name">
          <span class="tiny dim">Your name</span>
          <input value={name} maxLength={24} placeholder="Type your name" onInput={(e) => { const v = (e.target as HTMLInputElement).value; setName(v); s.ext.manager = v.trim(); }} />
        </label>
        <div class="welcome-club">
          <Badge club={club} size={44} />
          <div style={{ minWidth: 0 }}>
            <div class="name">{club.name}</div>
            <div class="tiny dim">{lg.name} · Division {club.div} of 10</div>
            {last && <div class="tiny dim">Last season: {ord(last.pos)} in Div {last.div}{last.outcome && OUTCOME[last.outcome] ? `, ${OUTCOME[last.outcome]}` : ''}</div>}
          </div>
        </div>
        <div class="kv small">
          <span>Squad strength</span><span>{ord(rank)} of {lg.clubIds.length} (OVR {Math.round(mine)})</span>
          <span>Board mood</span><span>{approvalLabel(b.approval)}</span>
          <span>Summer window</span><span>{s.week <= CAL.summerWindowEnd ? `Open until week ${CAL.summerWindowEnd}` : 'Closed'}</span>
          <span>First match</span><span>{s.week <= CAL.firstRoundWeek ? `Week ${CAL.firstRoundWeek}` : 'Under way'}</span>
          <span>Winter window</span><span>Weeks {CAL.winterWindow[0]}–{CAL.winterWindow[1]}</span>
        </div>
        {b.goals.length > 0 && (
          <div class="welcome-sec">
            <div class="tiny gold">BOARD GOALS</div>
            {b.goals.map((g) => <div class="small" key={g.text}>• {g.text}</div>)}
          </div>
        )}
        <div class="welcome-sec">
          <div class="tiny gold">HOW TO PLAY</div>
          <div class="small">• Tap <b>Continue</b> on the Hub to play the weeks until something needs you.</div>
          <div class="small">• <b>Squad</b>: pick your formation and XI, renew contracts.</div>
          <div class="small">• <b>Transfers</b>: scout, buy, sell and loan while a window is open.</div>
          <div class="small">• <b>Club</b>: upgrade facilities, hire staff, read the history and Hall of Fame.</div>
          <div class="small">• Finish high enough to go up a division. Reach division 1 to win the title.</div>
          <div class="small">• Tap <b>?</b> at the top any time to see this again.</div>
        </div>
        <button class="btn gold block" onClick={close}>Let's go ›</button>
      </div>
    </div>
  );
}
registerOverlay('welcome', () => <Welcome />);

/** Opens the window; it counts as seen for this season straight away, so closing it any way never reopens it. */
export function openWelcome() {
  const s = store.state;
  if (s) s.ext.welcomeSeen = s.season;
  nav.push({ kind: 'custom', key: 'welcome' });
}
