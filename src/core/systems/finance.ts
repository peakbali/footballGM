import { ECONOMY, roundMoney } from '../data/economy';
import { computeTable } from '../league';
import { clamp, type Rng } from '../rng';
import { CAL, type GameState } from '../state';
import { hooks, registerSystem } from '../systems';
import type { Club, FinCat, Player } from '../types';
import { INCOME_CATS, COST_CATS } from '../types';

const SEASON_WEEKS_TV = 41; // central money paid weeks 6..46

export function txn(s: GameState, cat: FinCat, amount: number) {
  const c = s.clubs[s.userClubId];
  c.cash += Math.round(amount);
  s.fin.season[cat] = (s.fin.season[cat] ?? 0) + Math.round(amount);
}

/** Weekly wage a club pays for a player (loan share applied). */
export function wageCost(p: Player, clubId: number): number {
  const c = p.contract;
  if (!c) return 0;
  if (c.type.startsWith('loan')) {
    const share = (c.wageSharePct ?? 100) / 100;
    if (p.clubId === clubId) return c.wage * share;
    if (c.parentClubId === clubId) return c.wage * (1 - share);
    return 0;
  }
  return p.clubId === clubId ? c.wage : 0;
}

export function userWageBill(s: GameState): number {
  let w = 0;
  for (const p of s.players.values()) {
    if (p.clubId === s.userClubId || p.contract?.parentClubId === s.userClubId) w += wageCost(p, s.userClubId);
  }
  return Math.round(w);
}

export function staffWageBill(s: GameState): number {
  return s.staff.reduce((a, x) => a + x.wage, 0);
}

/** Merchandise per season (scales with reputation and commercial staff). */
export function merchPerSeason(s: GameState, c: Club): number {
  const eco = ECONOMY[c.div];
  const commercial = c.user ? (s.staff.find((x) => x.role === 'commercial')?.level ?? 10) : 30;
  const shop = c.user ? ((s.ext.merchMult as number | undefined) ?? 1) : 1;
  return eco.merch * (0.6 + c.rep / 120) * (0.85 + commercial / 250) * shop;
}

/** Attendance model (DESIGN 11.3). */
export function attendance(s: GameState, home: Club, away: Club, rng: Rng): number {
  const eco = ECONOMY[home.div];
  const expectRep = 100 - home.div * 9;
  const repF = clamp(1 + (home.rep - expectRep) / 40, 0.7, 1.5);
  // big real grounds: bigger clubs draw more
  const groundF = clamp(Math.sqrt(home.capacity / eco.capacity), 0.6, 1.8);
  const recent = s.fixtures.filter((f) => f.home === home.id && f.hg != null && !f.playoff).slice(-5);
  const pts = recent.reduce((a, f) => a + (f.hg! > f.ag! ? 3 : f.hg === f.ag ? 1 : 0), 0);
  const formF = recent.length ? 0.85 + (pts / (recent.length * 3)) * 0.3 : 1;
  const priceF = Math.pow(clamp(home.ticket / eco.ticket, 0.3, 3), -0.6);
  const facF = home.user ? ((s.ext.comfort as number | undefined) ?? 1) : 1;
  const awayF = 1 + clamp((away.rep - expectRep) / 200, -0.05, 0.15);
  const att = eco.attendance * repF * groundF * formF * priceF * facF * awayF * rng.range(0.92, 1.08);
  return Math.round(clamp(att, 30, home.capacity));
}

export function ticketRange(c: Club, s?: GameState): [number, number] {
  const t = ECONOMY[c.div].ticket;
  const extra = c.user && s ? ((s.ext.ticketMax as number | undefined) ?? 0) : 0;
  return [Math.max(2, Math.round(t * 0.5)), Math.round(t * (2.2 + extra * 2))];
}

/**
 * League prize money at the end of the season (DESIGN 13.2p): the champions get about a season of a typical squad's
 * wages for that division, falling steeply down the table to a tenth of that for the bottom club.
 */
export function prizeMoney(div: number, pos: number, teams = 20): number {
  const top = ECONOMY[div].wage * 22 * 52;
  const x = Math.max(0, Math.min(1, (teams - pos) / Math.max(1, teams - 1)));
  return roundMoney(top * (0.1 + 0.9 * x ** 1.6));
}

/** Projection of cash at the end of the season (30 June). */
export function projection(s: GameState): { weeklyIncome: number; weeklyCost: number; end: number; prize: number } {
  const c = s.clubs[s.userClubId];
  const eco = ECONOMY[c.div];
  const weeksLeft = CAL.weeks - s.week + 1;
  const homeLeft = s.fixtures.filter((f) => f.home === c.id && f.hg == null).length;
  const gate = homeLeft * (c.lastAttendance ?? eco.attendance) * c.ticket;
  const tvWeeks = Math.max(0, Math.min(CAL.seasonEndWeek, CAL.seasonEndWeek) - Math.max(s.week, CAL.firstRoundWeek) + 1);
  const tv = (eco.tv * 0.7 * tvWeeks) / SEASON_WEEKS_TV;
  const spons = s.sponsors.filter((d) => d.status === 'active').reduce((a, d) => a + d.base / 52, 0) * weeksLeft;
  const merch = (merchPerSeason(s, c) / 52) * weeksLeft;
  const lg = s.leagues.find((l) => l.clubIds.includes(c.id))!;
  const pos = computeTable(s, lg).findIndex((r) => r.clubId === c.id) + 1;
  const prize = s.week <= CAL.seasonEndWeek ? prizeMoney(c.div, pos, lg.clubIds.length) : 0;
  const weeklyCost = userWageBill(s) + staffWageBill(s) + upkeep(s);
  const income = gate + tv + spons + merch + prize;
  return { weeklyIncome: Math.round((income - prize) / Math.max(1, weeksLeft)), weeklyCost, prize, end: Math.round(c.cash + income - weeklyCost * weeksLeft) };
}

export function upkeep(s: GameState): number {
  return (s.ext.upkeep as number | undefined) ?? Math.round(s.clubs[s.userClubId].capacity * 0.03);
}

export function totals(rec: Partial<Record<FinCat, number>>) {
  const inc = INCOME_CATS.reduce((a, k) => a + (rec[k] ?? 0), 0);
  const cost = COST_CATS.reduce((a, k) => a + (rec[k] ?? 0), 0);
  return { inc, cost, net: inc + cost };
}

registerSystem({
  name: 'finance',
  weekly(s, rng, idx) {
    const user = s.clubs[s.userClubId];
    // user ledger
    txn(s, 'wages', -userWageBill(s));
    const sw = staffWageBill(s);
    if (sw) txn(s, 'staff', -sw);
    txn(s, 'upkeep', -upkeep(s));
    for (const home of s.fixtures.filter((f) => f.week === s.week && f.home === user.id && f.hg != null)) {
      if (!home.att) continue;
      txn(s, 'gate', home.att * user.ticket);
      user.lastAttendance = home.att;
    }
    if (s.week >= CAL.firstRoundWeek && s.week <= CAL.seasonEndWeek) txn(s, 'tv', (ECONOMY[user.div].tv * 0.7) / SEASON_WEEKS_TV);
    txn(s, 'merch', merchPerSeason(s, user) / 52);
    s.fin.cashHistory.push({ s: s.season, w: s.week, cash: user.cash });
    if (s.fin.cashHistory.length > 110) s.fin.cashHistory.splice(0, s.fin.cashHistory.length - 110);

    // AI clubs: one weekly net figure (income by division minus wages)
    for (const c of s.clubs) {
      if (c.user) continue;
      const eco = ECONOMY[c.div];
      const squad = idx.get(c.id) ?? [];
      let wages = 0;
      for (const p of squad) wages += wageCost(p, c.id);
      const income = (eco.tv * 0.85 + eco.sponsor + eco.merch + eco.attendance * eco.ticket * 19) / 52;
      c.cash += Math.round(income * 1.05 - wages);
    }
    void rng;
  },
  seasonEnd(s) {
    for (const lg of s.leagues) {
      const t = computeTable(s, lg);
      t.forEach((r, i) => {
        const prize = prizeMoney(lg.div, i + 1, t.length);
        if (r.clubId === s.userClubId) txn(s, 'prize', prize);
        else s.clubs[r.clubId].cash += prize;
      });
    }
  },
  rollover(s) {
    s.fin.last = s.fin.season;
    s.fin.season = {};
    // promotion bonus is paid through prize; AI clubs below zero get a small bail-out so markets stay alive
    for (const c of s.clubs) if (!c.user && c.cash < 0) c.cash = Math.round(ECONOMY[c.div].startCash * 0.3);
  },
});

hooks.attendance = attendance;
