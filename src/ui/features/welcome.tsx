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


type Px = [number, number, number, number, string];

/** The hero scene: a stadium at dusk dressed in the club's colours, with bunting and glowing floodlights. */
function scene(c1: string, c2: string): Px[] {
  const r: Px[] = [];
  const sky = ['#1a1440', '#2a1a55', '#47206a', '#73306f', '#b04a62', '#e07a55', '#f5ab5c'];
  sky.forEach((col, i) => r.push([0, i * 3, 96, 3, col]));
  r.push([40, 13, 16, 2, '#ffd27a'], [42, 11, 12, 2, '#ffe39b'], [45, 10, 6, 1, '#fff0bf']); // sun on the horizon
  for (const [x, y] of [[6, 2], [18, 5], [30, 1], [70, 3], [84, 6], [90, 1], [58, 2]]) r.push([x, y, 1, 1, '#fff6d8']);
  // floodlights with glow
  for (const x of [6, 86]) {
    r.push([x - 3, 1, 9, 5, 'rgba(255,240,180,0.18)'], [x - 1, 2, 5, 3, '#f6f7ff'], [x, 3, 3, 1, '#ffcc4d'], [x + 1, 5, 1, 18, '#5b6694']);
  }
  // stands: club colour blocks with a crowd of dots
  r.push([12, 12, 72, 2, '#3a4478'], [12, 14, 72, 10, '#232c5c']);
  for (let row = 0; row < 4; row++) for (let x = 13 + (row % 2); x < 83; x += 2) r.push([x, 15 + row * 2, 1, 1, (x + row * 3) % 7 < 3 ? c1 : (x + row) % 5 === 0 ? '#e8ecff' : c2]);
  r.push([12, 12, 72, 1, c1]);
  // bunting across the stand roof
  for (let x = 14; x < 82; x += 4) r.push([x, 9, 2, 2, (x / 4) % 2 ? c1 : c2], [x + 0.5, 11, 1, 1, (x / 4) % 2 ? c1 : c2]);
  r.push([12, 8, 72, 1, '#c9cff0']);
  // pitch with mown stripes and the halfway line
  r.push([0, 24, 96, 16, '#2f9e57']);
  for (let x = 0; x < 96; x += 12) r.push([x, 24, 6, 16, '#258349']);
  r.push([0, 24, 96, 1, '#e8ecff'], [47, 24, 2, 16, '#e8ecff'], [44, 27, 8, 1, '#e8ecff'], [42, 28, 2, 1, '#e8ecff'], [52, 28, 2, 1, '#e8ecff'], [41, 29, 1, 5, '#e8ecff'], [54, 29, 1, 5, '#e8ecff'], [42, 34, 2, 1, '#e8ecff'], [52, 34, 2, 1, '#e8ecff'], [44, 35, 8, 1, '#e8ecff'], [47, 30, 2, 2, '#e8ecff']);
  return r;
}

const ICONS: Record<string, Px[]> = {
  div: [[2, 1, 8, 1, '#ffcc4d'], [1, 2, 10, 5, '#ffcc4d'], [2, 7, 8, 2, '#ffcc4d'], [4, 9, 4, 2, '#ffcc4d'], [3, 3, 6, 1, '#1c2650'], [5, 4, 2, 3, '#1c2650']],
  power: [[6, 0, 3, 2, '#5aa0ff'], [4, 2, 4, 2, '#5aa0ff'], [2, 4, 8, 2, '#5aa0ff'], [5, 6, 3, 2, '#5aa0ff'], [4, 8, 3, 2, '#5aa0ff'], [3, 10, 2, 2, '#5aa0ff']],
  board: [[2, 1, 8, 10, '#e8ecff'], [1, 2, 10, 8, '#e8ecff'], [3, 4, 2, 2, '#1c2650'], [7, 4, 2, 2, '#1c2650'], [3, 7, 6, 1, '#1c2650'], [4, 8, 4, 1, '#1c2650']],
  match: [[3, 1, 6, 10, '#e8ecff'], [1, 3, 10, 6, '#e8ecff'], [2, 2, 8, 8, '#e8ecff'], [5, 4, 2, 2, '#1c2650'], [3, 7, 2, 1, '#1c2650'], [7, 7, 2, 1, '#1c2650'], [5, 1, 2, 1, '#1c2650']],
};
const Ico = ({ k }: { k: string }) => (
  <svg class="wel-ico" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">{ICONS[k].map(([x, y, w, h, c], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={c} />)}</svg>
);

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
  const mood = approvalLabel(b.approval);
  return (
    <div class="overlay welcome-bg" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="welcome">
        <div class="wel-hero">
          <svg viewBox="0 0 96 40" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true">
            {scene(club.colors[0], club.colors[1]).map(([x, y, w, h, c], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={c} />)}
          </svg>
          <div class="wel-ribbon">SEASON {s.season}/{String(s.season + 1).slice(2)}</div>
          <div class="wel-crest"><Badge club={club} size={64} /></div>
        </div>
        <div class="wel-body">
          <div class="wel-hi">WELCOME{seasons(s).length ? ' BACK' : ''},<br /><span class="gold">{shown.toUpperCase()}!</span></div>
          <div class="wel-club">{club.name}</div>
          <div class="tiny dim wel-center">{lg.name}{last ? ` · last season ${ord(last.pos)}${last.outcome && OUTCOME[last.outcome] ? `, ${OUTCOME[last.outcome]}` : ''}` : ''}</div>
          <label class="wel-name">
            <span>MANAGER</span>
            <input value={name} maxLength={24} placeholder="Type your name" onInput={(e) => { const v = (e.target as HTMLInputElement).value; setName(v); s.ext.manager = v.trim(); }} />
          </label>
          <div class="wel-tiles">
            <div class="wel-tile"><Ico k="div" /><b>DIV {club.div}</b><span>of 10</span></div>
            <div class="wel-tile"><Ico k="power" /><b>{ord(rank)}</b><span>squad strength</span></div>
            <div class="wel-tile"><Ico k="board" /><b>{mood.toUpperCase()}</b><span>board mood</span></div>
            <div class="wel-tile"><Ico k="match" /><b>{s.week <= CAL.firstRoundWeek ? `WK ${CAL.firstRoundWeek}` : 'ON!'}</b><span>{s.week <= CAL.firstRoundWeek ? 'first match' : 'season under way'}</span></div>
          </div>
          {b.goals.length > 0 && (
            <div class="wel-board">
              <div class="wel-label">BOARD GOALS</div>
              {b.goals.map((g) => <div class="wel-goal" key={g.text}><i />{g.text}</div>)}
            </div>
          )}
          <div class="wel-tips">
            <div class="wel-label">HOW TO PLAY</div>
            {[
              <>Tap <b>Continue</b> on the Hub to play the weeks until something needs you.</>,
              <><b>Squad</b>: pick your formation and XI, renew contracts.</>,
              <><b>Transfers</b>: scout, buy, sell and loan while a window is open{s.week <= CAL.summerWindowEnd ? ` (open until week ${CAL.summerWindowEnd})` : ''}.</>,
              <><b>Club</b>: upgrade facilities, hire staff, read the history and Hall of Fame.</>,
              <>Finish high enough to go up a division. Reach division 1 to win the title.</>,
              <>Tap <b>?</b> at the top any time to see this again.</>,
            ].map((t, i) => <div class="wel-tip" key={i}><span class="wel-n">{i + 1}</span><span>{t}</span></div>)}
          </div>
          <button class="btn gold block wel-go" onClick={close}>LET'S GO ›</button>
        </div>
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
