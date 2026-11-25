import type { GameState } from './state';
import { squadOf } from './state';
import { seasons, type UserSeason } from './systems/chronicle';
import { facState } from './systems/facilities';
import { boardState } from './systems/board';
import { userStats, type UserStats } from './systems/stats';
import type { Player } from './types';

/**
 * 100 achievements (DESIGN 13.2h). They are about milestones that every club can reach, never about a
 * particular club, so they carry over between save slots. Each one is "value >= goal", which also
 * gives the progress bar for free.
 */
export type Tier = 1 | 2 | 3 | 4; // bronze, silver, gold, platinum
export type Cat = 'career' | 'league' | 'matches' | 'cup' | 'transfers' | 'finance' | 'club' | 'squad';

export interface Ctx {
  s: GameState;
  st: UserStats;
  se: UserSeason[];
  squad: Player[];
  xi: number;
  bestOvr: number;
  div: number;
  bestDiv: number;
  cash: number;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  tier: Tier;
  cat: Cat;
  goal: number;
  hidden?: boolean;
  val: (c: Ctx) => number;
}

export const CATS: { key: Cat; label: string; icon: string }[] = [
  { key: 'career', label: 'Career', icon: 'clip' },
  { key: 'league', label: 'League', icon: 'cup' },
  { key: 'matches', label: 'Matches', icon: 'flag' },
  { key: 'cup', label: 'National Cup', icon: 'cup' },
  { key: 'transfers', label: 'Transfers', icon: 'arrows' },
  { key: 'finance', label: 'Finance', icon: 'coin' },
  { key: 'club', label: 'Club', icon: 'house' },
  { key: 'squad', label: 'Squad', icon: 'shirt' },
];

const M = 1e6;
const promoted = (u: UserSeason) => u.div > 1 && (u.outcome === 'champion' || u.outcome === 'promoted' || u.outcome === 'playoff_winner');
const count = (se: UserSeason[], f: (u: UserSeason) => boolean) => se.filter(f).length;
const best = (se: UserSeason[], f: (u: UserSeason) => number) => se.reduce((a, u) => Math.max(a, f(u)), 0);
const profit = (u: UserSeason) => u.cashEnd - u.cashStart;
const b2b = (se: UserSeason[]) => se.some((u, i) => i > 0 && u.outcome === 'champion' && se[i - 1].outcome === 'champion' && u.season === se[i - 1].season + 1) ? 1 : 0;
const allGoals = (u: UserSeason) => !!u.board && u.board.goals.length > 0 && u.board.goals.every((g) => g.met);
const levels = (c: Ctx) => Object.values(facState(c.s).levels);
const roles = (c: Ctx) => new Set(c.s.staff.filter((x) => x.level >= 40).map((x) => x.role)).size;
const topStaff = (c: Ctx) => c.s.staff.reduce((a, x) => Math.max(a, x.level), 0);
const decisions = (c: Ctx) => c.s.inbox.filter((m) => m.pick).length;
const cupReach = (c: Ctx) => best(c.se, (u) => (u.cup ? u.cup.reached + 1 : 0));

function a(id: string, name: string, desc: string, tier: Tier, cat: Cat, goal: number, val: (c: Ctx) => number, hidden = false): Achievement {
  return { id, name, desc, tier, cat, goal, val, hidden: hidden || undefined };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---- career: seasons played
  a('seasons_1', 'Season One', 'Complete your first season.', 1, 'career', 1, (c) => c.se.length),
  a('seasons_3', 'Settling In', 'Complete 3 seasons.', 1, 'career', 3, (c) => c.se.length),
  a('seasons_5', 'Five Year Plan', 'Complete 5 seasons.', 2, 'career', 5, (c) => c.se.length),
  a('seasons_10', 'A Decade', 'Complete 10 seasons.', 2, 'career', 10, (c) => c.se.length),
  a('seasons_20', 'Lifer', 'Complete 20 seasons.', 3, 'career', 20, (c) => c.se.length),
  a('seasons_40', 'An Institution', 'Complete 40 seasons.', 4, 'career', 40, (c) => c.se.length),
  a('decisions_25', 'Decisive', 'Make 25 decisions in the inbox.', 1, 'career', 25, decisions),
  a('decisions_100', 'The Final Word', 'Make 100 decisions in the inbox.', 2, 'career', 100, decisions),
  a('records_10', 'Record Breaker', 'Set 10 club records.', 2, 'career', 10, (c) => c.se.reduce((n, u) => n + u.records.length, 0)),
  a('board_90', 'Board Favourite', 'Reach 90 board approval.', 2, 'career', 90, (c) => boardState(c.s).approval),
  a('goals_met', 'Clean Sweep', 'Meet every board goal in one season.', 2, 'career', 1, (c) => count(c.se, allGoals) ? 1 : 0),
  a('goals_met_5', 'Board Darling', 'Meet every board goal in 5 seasons.', 3, 'career', 5, (c) => count(c.se, allGoals)),

  // ---- league: climbing the pyramid
  a('promo_1', 'Going Up', 'Win promotion for the first time.', 1, 'league', 1, (c) => count(c.se, promoted)),
  a('promo_3', 'Lift Off', 'Win 3 promotions.', 2, 'league', 3, (c) => count(c.se, promoted)),
  a('promo_6', 'Express Elevator', 'Win 6 promotions.', 3, 'league', 6, (c) => count(c.se, promoted)),
  a('div_8', 'Out of the Basement', 'Reach Division 8.', 1, 'league', 1, (c) => (c.bestDiv <= 8 ? 1 : 0)),
  a('div_6', 'Halfway Up', 'Reach Division 6.', 2, 'league', 1, (c) => (c.bestDiv <= 6 ? 1 : 0)),
  a('div_4', 'Professional', 'Reach Division 4.', 3, 'league', 1, (c) => (c.bestDiv <= 4 ? 1 : 0)),
  a('div_2', 'One Step Away', 'Reach Division 2.', 4, 'league', 1, (c) => (c.bestDiv <= 2 ? 1 : 0)),
  a('div_1', 'Top of the Pyramid', 'Reach Division 1.', 4, 'league', 1, (c) => (c.bestDiv <= 1 ? 1 : 0)),
  a('title_1', 'Champions!', 'Win a league title.', 2, 'league', 1, (c) => count(c.se, (u) => u.outcome === 'champion')),
  a('title_3', 'Serial Winners', 'Win 3 league titles.', 3, 'league', 3, (c) => count(c.se, (u) => u.outcome === 'champion')),
  a('title_6', 'Dynasty', 'Win 6 league titles.', 4, 'league', 6, (c) => count(c.se, (u) => u.outcome === 'champion')),
  a('title_b2b', 'Back to Back', 'Win the title in two seasons running.', 3, 'league', 1, (c) => b2b(c.se)),
  a('playoff', 'Playoff Glory', 'Win promotion through the playoffs.', 2, 'league', 1, (c) => count(c.se, (u) => u.outcome === 'playoff_winner')),
  a('invincible', 'Invincibles', 'Finish a full season without losing a league game.', 4, 'league', 1, (c) => (count(c.se, (u) => u.l === 0 && u.p >= 30) ? 1 : 0), true),
  a('pts_90', 'Ninety Club', 'Collect 90 points in a season.', 3, 'league', 90, (c) => best(c.se, (u) => u.pts)),
  a('goals_100', 'Century of Goals', 'Score 100 league goals in a season.', 3, 'league', 100, (c) => best(c.se, (u) => u.gf)),
  a('down', 'Down We Go', 'Get relegated. It happens to everyone.', 1, 'league', 1, (c) => count(c.se, (u) => u.outcome === 'relegated'), true),
  a('scorer_30', 'Golden Boot', 'Have a player score 30 league goals in a season.', 2, 'league', 30, (c) => best(c.se, (u) => u.stars.scorer?.value ?? 0)),
  a('scorer_45', 'Goal Machine', 'Have a player score 45 league goals in a season.', 4, 'league', 45, (c) => best(c.se, (u) => u.stars.scorer?.value ?? 0)),

  // ---- matches
  a('win_1', 'Winning Feeling', 'Win a league match.', 1, 'matches', 1, (c) => c.st.w),
  a('wins_50', 'Fifty Wins', 'Win 50 league matches.', 2, 'matches', 50, (c) => c.st.w),
  a('wins_150', 'Winning Habit', 'Win 150 league matches.', 3, 'matches', 150, (c) => c.st.w),
  a('wins_400', 'Winning Machine', 'Win 400 league matches.', 4, 'matches', 400, (c) => c.st.w),
  a('streak_3', 'Hat-trick of Wins', 'Win 3 league matches in a row.', 1, 'matches', 3, (c) => c.st.bestW),
  a('streak_5', 'On a Roll', 'Win 5 league matches in a row.', 2, 'matches', 5, (c) => c.st.bestW),
  a('streak_8', 'Unstoppable', 'Win 8 league matches in a row.', 3, 'matches', 8, (c) => c.st.bestW),
  a('streak_12', 'Relentless', 'Win 12 league matches in a row.', 4, 'matches', 12, (c) => c.st.bestW),
  a('unbeaten_20', 'Twenty Unbeaten', 'Go 20 league matches without defeat.', 3, 'matches', 20, (c) => c.st.bestU),
  a('unbeaten_35', 'Untouchable', 'Go 35 league matches without defeat.', 4, 'matches', 35, (c) => c.st.bestU),
  a('thrash_4', 'Thrashing', 'Win a league match by 4 goals or more.', 2, 'matches', 4, (c) => c.st.bigWin),
  a('thrash_7', 'Demolition', 'Win a league match by 7 goals or more.', 3, 'matches', 7, (c) => c.st.bigWin),
  a('cs_10', 'Tight at the Back', 'Keep 10 league clean sheets.', 1, 'matches', 10, (c) => c.st.cs),
  a('cs_50', 'Clean Hands', 'Keep 50 league clean sheets.', 2, 'matches', 50, (c) => c.st.cs),
  a('cs_row_5', 'Brick Wall', 'Keep 5 clean sheets in a row.', 3, 'matches', 5, (c) => c.st.bestCS),
  a('gf_100', 'Goal Rush', 'Score 100 league goals in total.', 1, 'matches', 100, (c) => c.st.gf),
  a('gf_500', 'Goal Fest', 'Score 500 league goals in total.', 2, 'matches', 500, (c) => c.st.gf),
  a('lose_5', 'Rough Patch', 'Lose 5 league matches in a row.', 1, 'matches', 5, (c) => c.st.bestL, true),

  // ---- cup
  a('cup_r4', 'Cup Run', 'Reach the fourth round of the National Cup.', 1, 'cup', 4, cupReach),
  a('cup_qf', 'Last Eight', 'Reach the National Cup quarter-finals.', 2, 'cup', 6, cupReach),
  a('cup_sf', 'Semi-Final Dreams', 'Reach the National Cup semi-finals.', 3, 'cup', 7, cupReach),
  a('cup_final', 'Cup Finalists', 'Reach the National Cup final.', 3, 'cup', 8, cupReach),
  a('cup_win', 'Cup Winners', 'Win the National Cup.', 4, 'cup', 1, (c) => count(c.se, (u) => !!u.cup?.won)),

  // ---- transfers
  a('buy_1', 'First Signing', 'Buy a player for a fee.', 1, 'transfers', 1, (c) => c.st.buys),
  a('buy_10', 'Busy Window', 'Buy 10 players for a fee.', 1, 'transfers', 10, (c) => c.st.buys),
  a('buy_50', 'Shopping Spree', 'Buy 50 players for a fee.', 2, 'transfers', 50, (c) => c.st.buys),
  a('sell_1', 'First Sale', 'Sell a player for a fee.', 1, 'transfers', 1, (c) => c.st.sells),
  a('sell_10', 'Selling Club', 'Sell 10 players.', 2, 'transfers', 10, (c) => c.st.sells),
  a('sell_50', 'Market Trader', 'Sell 50 players.', 3, 'transfers', 50, (c) => c.st.sells),
  a('sale_250k', 'Nice Profit', 'Sell a player for £250k or more.', 2, 'transfers', 250e3, (c) => c.st.maxSell),
  a('sale_2m', 'Big Fish', 'Sell a player for £2m or more.', 3, 'transfers', 2 * M, (c) => c.st.maxSell),
  a('sale_20m', 'Record Business', 'Sell a player for £20m or more.', 4, 'transfers', 20 * M, (c) => c.st.maxSell),
  a('buy_250k', 'Splash the Cash', 'Pay £250k or more for one player.', 2, 'transfers', 250e3, (c) => c.st.maxBuy),
  a('buy_5m', 'Marquee Signing', 'Pay £5m or more for one player.', 3, 'transfers', 5 * M, (c) => c.st.maxBuy),
  a('buy_30m', 'Statement Signing', 'Pay £30m or more for one player.', 4, 'transfers', 30 * M, (c) => c.st.maxBuy),
  a('loan_in', 'Borrowed Time', 'Take a player on loan.', 1, 'transfers', 1, (c) => c.st.loansIn),
  a('loan_out', 'Out on Loan', 'Loan a player out.', 1, 'transfers', 1, (c) => c.st.loansOut),

  // ---- finance
  a('cash_100k', 'Rainy Day Fund', 'Hold £100k in cash.', 1, 'finance', 100e3, (c) => c.cash),
  a('cash_1m', 'Millionaires', 'Hold £1m in cash.', 2, 'finance', M, (c) => c.cash),
  a('cash_10m', 'Deep Pockets', 'Hold £10m in cash.', 3, 'finance', 10 * M, (c) => c.cash),
  a('cash_100m', 'Oil Money', 'Hold £100m in cash.', 4, 'finance', 100 * M, (c) => c.cash),
  a('profit_1', 'In the Black', 'Finish a season in profit.', 1, 'finance', 1, (c) => count(c.se, (u) => profit(u) > 0)),
  a('profit_5', 'Healthy Books', 'Finish 5 seasons in profit.', 2, 'finance', 5, (c) => count(c.se, (u) => profit(u) > 0)),
  a('profit_1m', 'Million Pound Year', 'Make £1m profit in a season.', 3, 'finance', M, (c) => best(c.se, profit)),
  a('red', 'In the Red', 'Let your cash go below zero.', 1, 'finance', 1, (c) => (c.cash < 0 ? 1 : 0), true),

  // ---- club: facilities, staff, youth
  a('build_1', 'Builders In', 'Finish a facility upgrade.', 1, 'club', 1, (c) => facState(c.s).built.length),
  a('build_10', 'Master Builder', 'Finish 10 facility upgrades.', 2, 'club', 10, (c) => facState(c.s).built.length),
  a('fac_5', 'Well Rounded', 'Take every facility branch to level 5.', 3, 'club', 5, (c) => Math.min(...levels(c))),
  a('fac_10', 'Maxed Out', 'Take one facility branch to level 10.', 3, 'club', 10, (c) => Math.max(...levels(c))),
  a('fac_all_10', 'World Class', 'Take every facility branch to level 10.', 4, 'club', 10, (c) => Math.min(...levels(c))),
  a('cap_5k', 'Bigger Ground', 'Have a stadium for 5,000 fans.', 1, 'club', 5000, (c) => c.s.clubs[c.s.userClubId].capacity),
  a('cap_20k', 'Proper Stadium', 'Have a stadium for 20,000 fans.', 2, 'club', 20000, (c) => c.s.clubs[c.s.userClubId].capacity),
  a('cap_50k', 'Cathedral', 'Have a stadium for 50,000 fans.', 3, 'club', 50000, (c) => c.s.clubs[c.s.userClubId].capacity),
  a('staff_40', 'Backroom Boost', 'Employ a staff member of level 40 or more.', 1, 'club', 40, topStaff),
  a('staff_full', 'Full House', 'Have all 9 staff roles filled by level 40 or better.', 2, 'club', 9, roles),
  a('staff_70', 'Top Coach', 'Employ a staff member of level 70 or more.', 2, 'club', 70, topStaff),
  a('staff_90', 'World-class Staff', 'Employ a staff member of level 90 or more.', 3, 'club', 90, topStaff),
  a('grad_1', 'Home Grown', 'Promote a player from the academy.', 1, 'club', 1, (c) => c.st.grads),
  a('grad_10', 'Youth Factory', 'Promote 10 players from the academy.', 2, 'club', 10, (c) => c.st.grads),
  a('grad_30', 'Conveyor Belt', 'Promote 30 players from the academy.', 3, 'club', 30, (c) => c.st.grads),
  a('star_10', 'Eye for Talent', 'Star 10 players on your scouting list.', 1, 'club', 10, (c) => c.s.scouting.starred.length),

  // ---- squad quality
  a('xi_50', 'Solid XI', 'Have a starting XI averaging 50 OVR.', 1, 'squad', 50, (c) => c.xi),
  a('xi_65', 'Quality XI', 'Have a starting XI averaging 65 OVR.', 2, 'squad', 65, (c) => c.xi),
  a('xi_80', 'Elite XI', 'Have a starting XI averaging 80 OVR.', 3, 'squad', 80, (c) => c.xi),
  a('xi_88', 'Dream Team', 'Have a starting XI averaging 88 OVR.', 4, 'squad', 88, (c) => c.xi),
  a('star_80', 'A Real Star', 'Own a player rated 80 OVR or more.', 2, 'squad', 80, (c) => c.bestOvr),
  a('star_90', 'Superstar', 'Own a player rated 90 OVR or more.', 3, 'squad', 90, (c) => c.bestOvr),
  a('star_95', 'Generational Talent', 'Own a player rated 95 OVR or more.', 4, 'squad', 95, (c) => c.bestOvr),
  a('wonder', 'Wonderkid', 'Own a player aged 20 or under rated 70 OVR or more.', 3, 'squad', 1, (c) => (c.squad.some((p) => c.s.season - p.birthYear <= 20 && p.ovr >= 70) ? 1 : 0)),
];

export function buildCtx(s: GameState): Ctx {
  const club = s.clubs[s.userClubId];
  const squad = squadOf(s, club.id);
  const top = [...squad].sort((x, y) => y.ovr - x.ovr);
  const xi = top.slice(0, 11);
  const se = seasons(s);
  return {
    s, st: userStats(s), se, squad,
    xi: xi.length === 11 ? xi.reduce((t, p) => t + p.ovr, 0) / 11 : 0,
    bestOvr: top[0]?.ovr ?? 0,
    div: club.div,
    bestDiv: Math.min(club.div, ...se.map((u) => u.div)),
    cash: club.cash,
  };
}

/** Ids of achievements that are met right now and not in `have`. */
export function newlyEarned(s: GameState, have: ReadonlySet<string>): string[] {
  const c = buildCtx(s);
  const out: string[] = [];
  for (const x of ACHIEVEMENTS) if (!have.has(x.id) && x.val(c) >= x.goal) out.push(x.id);
  return out;
}

export const byId = (id: string) => ACHIEVEMENTS.find((x) => x.id === id);
