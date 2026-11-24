import { ECONOMY } from '../data/economy';
import { computeTable } from '../league';
import { addMessage, ordinal } from '../season';
import { clamp } from '../rng';
import { squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import { INCOME_CATS } from '../types';
import { facState } from './facilities';
import { txn } from './finance';

/** Board (DESIGN 12.1): informational approval meter, soft season goals, feedback and small rewards. No sacking. */

export type GoalKind = 'league' | 'wages' | 'youth' | 'build' | 'cash';
export interface BoardGoal {
  kind: GoalKind;
  text: string;
  target: number; // league: max finishing position (0 = promotion); wages: max ratio; youth: apps; build: n/a; cash: min cash
  met?: boolean;
}
export interface BoardState {
  approval: number;
  season: number;
  goals: BoardGoal[];
  builtAtStart: number;
  last?: { season: number; goals: BoardGoal[]; before: number; after: number; cash: number; discount: number };
}

export function boardState(s: GameState): BoardState {
  let b = s.ext.board as BoardState | undefined;
  if (!b) {
    b = { approval: 60, season: s.season, goals: [], builtAtStart: 0 };
    s.ext.board = b;
  }
  return b;
}

export function approvalLabel(v: number): string {
  return v >= 85 ? 'Delighted' : v >= 70 ? 'Pleased' : v >= 50 ? 'Satisfied' : v >= 30 ? 'Concerned' : 'Unhappy';
}

/** Where the club is expected to finish, by squad strength. */
export function predictedFinish(s: GameState, clubId = s.userClubId): number {
  const lg = s.leagues.find((l) => l.clubIds.includes(clubId))!;
  const sorted = [...lg.clubIds].sort((a, b) => s.clubs[b].strength - s.clubs[a].strength);
  return sorted.indexOf(clubId) + 1;
}

function leagueGoal(s: GameState): BoardGoal {
  const div = s.clubs[s.userClubId].div;
  const r = predictedFinish(s);
  if (div === 1) {
    if (r <= 2) return { kind: 'league', text: 'Win the league', target: 1 };
    if (r <= 6) return { kind: 'league', text: 'Finish in the top six', target: 6 };
  } else {
    if (r <= 3) return { kind: 'league', text: 'Win promotion', target: 0 };
    if (r <= 7) return { kind: 'league', text: 'Reach the playoffs (top six)', target: 6 };
  }
  if (r <= 13) return { kind: 'league', text: 'Finish in the top half', target: 10 };
  return { kind: 'league', text: 'Avoid relegation', target: 17 };
}

export function setGoals(s: GameState) {
  const b = boardState(s);
  const user = s.clubs[s.userClubId];
  const goals: BoardGoal[] = [leagueGoal(s)];
  if (user.cash < 0) goals.push({ kind: 'cash', text: 'Get the bank balance back above zero', target: 0 });
  else goals.push({ kind: 'wages', text: 'Keep wages under 70% of income', target: 0.7 });
  const young = squadOf(s, user.id).filter((p) => s.season - p.birthYear <= 21).length;
  if (young >= 2 || facState(s).levels.academy >= 2) {
    const n = 25 + 5 * Math.min(5, facState(s).levels.academy);
    goals.push({ kind: 'youth', text: `Give under-21 players ${n} league appearances`, target: n });
  }
  const f = facState(s);
  if (f.built.length < 6 && user.cash > 0) goals.push({ kind: 'build', text: 'Finish a facility upgrade', target: 1 });
  b.goals = goals;
  b.season = s.season;
  b.builtAtStart = f.built.length;
}

export function wageRatio(s: GameState): number {
  const inc = INCOME_CATS.reduce((a, k) => a + Math.max(0, s.fin.season[k] ?? 0), 0);
  const wages = -((s.fin.season.wages ?? 0) + (s.fin.season.staff ?? 0));
  return inc > 0 ? wages / inc : wages > 0 ? 9 : 0;
}

function youthApps(s: GameState): number {
  return squadOf(s, s.userClubId).filter((p) => s.season - p.birthYear <= 21).reduce((a, p) => a + p.stats.apps, 0);
}

/** Progress of a goal right now: [is on track / met, short status]. */
export function goalStatus(s: GameState, g: BoardGoal): [boolean, string] {
  const user = s.clubs[s.userClubId];
  switch (g.kind) {
    case 'league': {
      const lg = s.leagues.find((l) => l.clubIds.includes(user.id))!;
      const pos = computeTable(s, lg).findIndex((r) => r.clubId === user.id) + 1;
      const rec = s.history.find((h) => h.season === s.season && h.clubId === user.id);
      if (rec) {
        if (g.target === 0) return [rec.outcome === 'champion' || rec.outcome === 'promoted' || rec.outcome === 'playoff_winner', `Finished ${ordinal(rec.pos)}`];
        return [rec.pos <= g.target, `Finished ${ordinal(rec.pos)}`];
      }
      return [pos <= (g.target || 3), `Currently ${ordinal(pos)}`];
    }
    case 'wages': {
      const r = wageRatio(s);
      return [r <= g.target, `${Math.round(r * 100)}% of income`];
    }
    case 'cash':
      return [user.cash >= g.target, user.cash >= 0 ? 'In credit' : 'Still overdrawn'];
    case 'youth': {
      const a = youthApps(s);
      return [a >= g.target, `${a} of ${g.target}`];
    }
    case 'build': {
      const n = facState(s).built.length - boardState(s).builtAtStart;
      return [n >= 1, n >= 1 ? 'Done' : facState(s).projects.length ? 'Building' : 'Not started'];
    }
  }
}

function evaluate(s: GameState) {
  const b = boardState(s);
  const before = b.approval;
  let delta = 0;
  let met = 0;
  for (const g of b.goals) {
    g.met = goalStatus(s, g)[0];
    const w = g.kind === 'league' ? 14 : 6;
    delta += g.met ? w : -w * 0.8;
    if (g.met) met++;
  }
  const rec = s.history.find((h) => h.season === s.season && h.clubId === s.userClubId);
  if (rec?.outcome === 'champion') delta += 8;
  if (rec?.outcome === 'relegated') delta -= 8;
  b.approval = clamp(Math.round(b.approval + delta), 0, 100);
  const user = s.clubs[s.userClubId];
  const cash = met * Math.max(2000, Math.round(ECONOMY[user.div].sponsor * 0.15));
  const discount = met === b.goals.length && b.goals.length > 0 ? 0.2 : 0;
  if (cash) txn(s, 'other_in', cash);
  if (discount) s.ext.facDiscount = discount;
  b.last = { season: s.season, goals: b.goals.map((g) => ({ ...g })), before, after: b.approval, cash, discount };
  addMessage(s, {
    cat: 'Board',
    title: `Board verdict: ${approvalLabel(b.approval)}`,
    body: `${met} of ${b.goals.length} goals met. Approval ${before} → ${b.approval}.${cash ? ` The board adds a bonus of £${cash.toLocaleString()}.` : ''}${discount ? ' All goals met: your next facility build is 20% cheaper.' : ''}`,
  });
}

function feedback(s: GameState) {
  const b = boardState(s);
  const st = b.goals.map((g) => [g, goalStatus(s, g)] as const);
  const good = st.filter(([, x]) => x[0]).length;
  const nudge = good >= Math.ceil(st.length / 2) ? 3 : -3;
  b.approval = clamp(b.approval + nudge, 0, 100);
  addMessage(s, {
    cat: 'Board',
    title: nudge > 0 ? 'The board is pleased with progress' : 'The board has some concerns',
    body: st.map(([g, x]) => `${x[0] ? '✓' : '✗'} ${g.text}: ${x[1]}`).join('\n'),
  });
}

registerSystem({
  name: 'board',
  init(s) {
    boardState(s);
    setGoals(s);
    addMessage(s, { cat: 'Board', title: 'Welcome from the board', body: `Our goals for this season:\n${boardState(s).goals.map((g) => `• ${g.text}`).join('\n')}\nThe board never sacks a GM, but we will tell you what we think.` });
  },
  weekly(s) {
    if (s.week === 20 || s.week === 34) feedback(s);
  },
  seasonEnd(s) {
    evaluate(s);
  },
  rollover(s) {
    setGoals(s);
    addMessage(s, { cat: 'Board', title: 'Goals for the new season', body: boardState(s).goals.map((g) => `• ${g.text}`).join('\n') });
  },
});
