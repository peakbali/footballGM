import { fixtureWinner, addMessage, addNews } from '../season';
import { Rng, hashSeed } from '../rng';
import type { GameState } from '../state';
import { registerSystem } from '../systems';
import { txn } from './finance';

/**
 * The National Cup: a knockout for every club in the simulated pyramid (200 clubs).
 * The 144 lowest-ranked clubs play the first round, the top 56 enter in round two.
 * Ties are played midweek alongside the league; draws go to penalties.
 */
export const CUP_KEY = 'fa';
export const CUP_NAME = 'National Cup';
export const CUP_WEEKS = [9, 13, 18, 22, 26, 31, 36, 41];
export const ROUND_NAMES = ['First round', 'Second round', 'Third round', 'Fourth round', 'Fifth round', 'Quarter-final', 'Semi-final', 'Final'];
const BYES = 56;

export interface CupState {
  season: number;
  alive: number[]; // clubs still in, including those with a bye
  byes: number[]; // clubs entering at round 2
  round: number; // number of rounds drawn so far
  userExit?: number; // round index the user lost in
  userWon?: boolean;
  winner?: number;
  ties: { r: number; h: number; a: number; hg: number; ag: number; pens?: string }[]; // user's ties + final
}

export function cupPrize(round: number): number {
  return Math.round(1500 * Math.pow(2.1, round));
}

export function cupState(s: GameState): CupState | null {
  const c = s.ext.cup as CupState | undefined;
  return c && c.season === s.season ? c : null;
}

function start(s: GameState) {
  const ids = s.leagues.flatMap((l) => l.clubIds);
  const ranked = [...ids].sort((a, b) => s.clubs[a].div - s.clubs[b].div || s.clubs[b].strength - s.clubs[a].strength);
  const byes = ranked.slice(0, BYES);
  s.ext.cup = { season: s.season, alive: ids, byes, round: 0, ties: [] } satisfies CupState;
}

function draw(s: GameState, c: CupState) {
  const r = c.round;
  const rng = new Rng(hashSeed(s.seed, s.season, 5000 + r));
  const pool = r === 0 ? c.alive.filter((id) => !c.byes.includes(id)) : [...c.alive];
  rng.shuffle(pool);
  const week = CUP_WEEKS[r];
  let userTie: [number, number] | null = null;
  for (let i = 0; i + 1 < pool.length; i += 2) {
    const [h, a] = [pool[i], pool[i + 1]];
    s.fixtures.push({ id: s.nextFixtureId++, div: 0, week, home: h, away: a, hg: null, ag: null, cup: CUP_KEY, round: r });
    if (h === s.userClubId || a === s.userClubId) userTie = [h, a];
  }
  if (userTie) {
    const opp = s.clubs[userTie[0] === s.userClubId ? userTie[1] : userTie[0]];
    addMessage(s, { cat: 'League', title: `${CUP_NAME} draw: ${ROUND_NAMES[r]}`, body: `${userTie[0] === s.userClubId ? 'Home' : 'Away'} to ${opp.name} (division ${opp.div}) in week ${week}. Prize for winning: £${cupPrize(r).toLocaleString()}.` });
  }
}

function settle(s: GameState, c: CupState, r: number) {
  const ties = s.fixtures.filter((f) => f.cup === CUP_KEY && f.round === r && f.hg != null);
  const losers = new Set<number>();
  for (const f of ties) {
    const w = fixtureWinner(f);
    const l = w === f.home ? f.away : f.home;
    losers.add(l);
    const prize = cupPrize(r);
    if (w === s.userClubId) txn(s, 'prize', prize);
    else s.clubs[w].cash += prize;
    if (f.home === s.userClubId || f.away === s.userClubId) {
      c.ties.push({ r, h: f.home, a: f.away, hg: f.hg!, ag: f.ag!, pens: f.pens });
      const opp = s.clubs[w === s.userClubId ? l : w];
      if (w === s.userClubId) {
        if (r === ROUND_NAMES.length - 1) {
          c.userWon = true;
          addMessage(s, { cat: 'League', title: `${CUP_NAME} WINNERS!`, body: `You beat ${opp.name} in the final. A day nobody at the club will forget.` });
        } else {
          addMessage(s, { cat: 'League', title: `${CUP_NAME}: through to the ${ROUND_NAMES[r + 1].toLowerCase()}`, body: `You beat ${opp.name} ${f.home === w ? `${f.hg}-${f.ag}` : `${f.ag}-${f.hg}`}${f.pens ? ' on penalties' : ''}. £${prize.toLocaleString()} in prize money.` });
        }
      } else {
        c.userExit = r;
        addMessage(s, { cat: 'League', title: `${CUP_NAME}: knocked out`, body: `${opp.name} won in the ${ROUND_NAMES[r].toLowerCase()}.` });
      }
    } else if (r === ROUND_NAMES.length - 1) {
      c.ties.push({ r, h: f.home, a: f.away, hg: f.hg!, ag: f.ag!, pens: f.pens });
    }
    {
      const lc = s.clubs[l];
      const wc = s.clubs[w];
      if (wc.div - lc.div >= 3 && r >= 2) addNews(s, `${CUP_NAME} shock: ${wc.name} knock out ${lc.name}.`);
      if (r === ROUND_NAMES.length - 1) addNews(s, `${wc.name} win the ${CUP_NAME}.`);
    }
  }
  c.alive = c.alive.filter((id) => !losers.has(id));
  if (r === ROUND_NAMES.length - 1) c.winner = c.alive[0];
}

registerSystem({
  name: 'cup',
  init(s) {
    start(s);
  },
  weekly(s) {
    let c = cupState(s);
    if (!c) {
      start(s);
      c = cupState(s)!;
    }
    // settle a round played this week, then draw the next one a week ahead
    const played = CUP_WEEKS.indexOf(s.week);
    if (played >= 0 && played < c.round) settle(s, c, played);
    if (c.round < CUP_WEEKS.length && CUP_WEEKS[c.round] === s.week + 1) {
      draw(s, c);
      c.round++;
    }
  },
  rollover(s) {
    start(s);
  },
});
