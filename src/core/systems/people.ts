import { DIV_AVG_OVR } from '../data/pyramid';
import { marketWage, playerValue } from '../data/economy';
import { LINE, type Position } from '../data/positions';
import { generatePlayer } from '../generate';
import { developPlayer, type DevContext } from '../progression';
import { addMessage } from '../season';
import { clamp, type Rng } from '../rng';
import { invalidateSquads, squadOf, type GameState } from '../state';
import { hooks, registerSystem } from '../systems';
import type { Player, SquadRole, StaffRole } from '../types';
import { dirtyPlayers } from './dirty';
import { effects, facState } from './facilities';
import { staffLevel } from './staff';

/** Stage 3: own-squad development (monthly), morale (weekly), academy intake (March), injuries/recovery hooks. */

export const ACADEMY_WEEK = 36; // early March
const MONTH = 4;

const COACH_FOR: Record<string, StaffRole> = { GK: 'coach_gk', DEF: 'coach_def', MID: 'coach_mid', ATT: 'coach_att' };

export function clubGamesPlayed(s: GameState, clubId: number): number {
  let n = 0;
  for (const f of s.fixtures) if (f.hg != null && !f.playoff && !f.cup && (f.home === clubId || f.away === clubId)) n++;
  return n;
}

/** Share of minutes this season (falls back to squad rank early in the season). */
export function playShare(s: GameState, p: Player, games: number): number {
  if (games >= 3) return clamp(p.stats.mins / (games * 90), 0, 1);
  if (p.minutesShare != null) return p.minutesShare;
  const squad = squadOf(s, p.clubId!).filter((q) => !q.academy);
  const rank = squad.filter((q) => q.ovr > p.ovr).length;
  return rank < 11 ? 0.85 : rank < 16 ? 0.4 : 0.1;
}

/** Development context for a player at the user's club. */
export function userDevContext(s: GameState, p: Player, share: number): DevContext {
  const fac = facState(s);
  const e = effects(s);
  const age = s.season - p.birthYear;
  const coach = p.academy ? staffLevel(s, 'youth_coach') : staffLevel(s, COACH_FOR[LINE[p.pos]]);
  let bonus = e.dev;
  if (age >= 21 && age <= 26) bonus += e.devPrime; // Analysis suite: 21 to 26, the stretch where most development happens
  // young players also benefit from the youth coach
  if (!p.academy && age <= 20) bonus += staffLevel(s, 'youth_coach') / 1000;
  return { playtime: p.academy ? 0.55 : share, coach: Math.max(1, coach), facility: fac.levels.training, bonus };
}

const ROLE_SHARE: Record<SquadRole, number> = { star: 0.85, starter: 0.7, rotation: 0.4, backup: 0.15, youth: 0.1 };

/** Recent results of a club as points per game (last 5). */
function recentPpg(s: GameState, clubId: number): number | null {
  const done = s.fixtures.filter((f) => f.hg != null && (f.home === clubId || f.away === clubId)).slice(-5);
  if (!done.length) return null;
  let pts = 0;
  for (const f of done) {
    const gf = f.home === clubId ? f.hg! : f.ag!;
    const ga = f.home === clubId ? f.ag! : f.hg!;
    pts += gf > ga ? 3 : gf === ga ? 1 : 0;
  }
  return pts / done.length;
}

/** Why a player's morale is where it is (for the player screen). */
export function moraleReasons(s: GameState, p: Player): string[] {
  const out: string[] = [];
  const games = clubGamesPlayed(s, s.userClubId);
  const role = p.contract?.role ?? 'rotation';
  if (!p.academy && games >= 3) {
    const share = playShare(s, p, games);
    if (share < ROLE_SHARE[role] - 0.15) out.push(`Wants more playing time (expects ${role} minutes)`);
    else if (share > ROLE_SHARE[role] + 0.1) out.push('Happy with his playing time');
  }
  const ppg = recentPpg(s, s.userClubId);
  if (ppg != null && ppg >= 2) out.push('Enjoying the team’s form');
  if (ppg != null && ppg < 0.8) out.push('Frustrated by results');
  if (p.contract && p.contract.wage < marketWage(p.ovr, s.clubs[s.userClubId].div, DIV_AVG_OVR[s.clubs[s.userClubId].div]) * 0.7) out.push('Feels underpaid');
  if (p.contract && p.contract.endSeason === s.season && s.week >= 30) out.push('Unsure about his future (contract expiring)');
  return out;
}

export function updateMorale(s: GameState, rng: Rng) {
  const user = s.clubs[s.userClubId];
  const games = clubGamesPlayed(s, user.id);
  const ppg = recentPpg(s, user.id);
  const mkt = (p: Player) => marketWage(p.ovr, user.div, DIV_AVG_OVR[user.div]);
  for (const p of squadOf(s, user.id)) {
    const pers = p.personality / 100;
    let up = 0;
    let down = 0;
    // playing time vs expectation (biggest driver)
    if (!p.academy && games >= 3) {
      const diff = playShare(s, p, games) - ROLE_SHARE[p.contract?.role ?? 'rotation'];
      if (diff < -0.1) down += Math.min(1.8, -diff * 4.5);
      else if (diff > 0.05) up += Math.min(1.5, diff * 4);
    }
    if (ppg != null) {
      const r = (ppg - 1.35) * 1.1;
      if (r > 0) up += r;
      else down += -r;
    }
    if (p.contract && p.contract.wage < mkt(p) * 0.7) down += 0.6;
    if (p.contract && p.contract.endSeason === s.season && s.week >= 30 && s.week <= 52) down += 0.4;
    // personality scales the swings: high = calm, low = volatile
    const delta = up * (0.8 + pers * 0.4) - down * (1.5 - pers) + (65 - p.morale) * 0.07 + rng.normal(0, 0.4);
    const before = p.morale;
    p.morale = clamp(Math.round((p.morale + delta) * 10) / 10, 0, 100);
    if (Math.round(before) !== Math.round(p.morale)) dirtyPlayers.add(p.id);
  }
  // other clubs in the user's league: morale follows form
  const lg = s.leagues.find((l) => l.clubIds.includes(user.id));
  if (lg && s.week % 2 === 0) {
    for (const id of lg.clubIds) {
      if (id === user.id) continue;
      const f = recentPpg(s, id);
      const target = f == null ? 65 : clamp(65 + (f - 1.4) * 12, 40, 85);
      for (const p of squadOf(s, id)) p.morale = clamp(Math.round(p.morale + (target - p.morale) * 0.3), 0, 100);
    }
  }
}

/** Unhappy, low-personality players ask to leave (once a season). */
function transferRequests(s: GameState) {
  const asked = (s.ext.requested as Record<number, number> | undefined) ?? {};
  for (const p of squadOf(s, s.userClubId)) {
    if (p.academy || p.listed || p.personality >= 35 || p.morale >= 25) continue;
    if (asked[p.id] === s.season) continue;
    if (p.contract?.type.startsWith('loan')) continue;
    asked[p.id] = s.season;
    addMessage(s, {
      cat: 'Squad',
      title: `${p.first} ${p.last} wants to leave`,
      body: `${p.last} is unhappy (${moraleReasons(s, p).join('; ').toLowerCase() || 'low morale'}) and has handed in a transfer request.`,
      action: { kind: 'transfer_request', ref: p.id },
    });
  }
  s.ext.requested = asked;
}

export function answerTransferRequest(s: GameState, msgId: number, accept: boolean) {
  const m = s.inbox.find((x) => x.id === msgId);
  if (!m || m.resolved) return;
  m.resolved = true;
  const p = s.players.get(m.action!.ref!);
  if (!p) return;
  if (accept) {
    p.listed = true;
    p.morale = clamp(p.morale + 12, 0, 100);
  } else {
    p.morale = clamp(p.morale - 15, 0, 100);
  }
  dirtyPlayers.add(p.id);
}

/** Monthly development for the user's squad and academy. */
export function developUserSquad(s: GameState, rng: Rng) {
  const games = clubGamesPlayed(s, s.userClubId);
  for (const p of squadOf(s, s.userClubId)) {
    const share = playShare(s, p, games);
    const age = s.season - p.birthYear;
    const before = p.ovr;
    developPlayer(rng, p, age, userDevContext(s, p, share), MONTH / 52);
    if (p.ovr !== before) {
      p.value = playerValue(p.ovr, p.pot, age, p.contract ? p.contract.endSeason - s.season + 1 : 0);
    }
    dirtyPlayers.add(p.id);
  }
}

/** Academy (DESIGN 9.3). */
export function academyCap(s: GameState): number {
  return 8 + facState(s).levels.academy * 2;
}

export function academyIntake(s: GameState, rng: Rng): Player[] {
  const user = s.clubs[s.userClubId];
  const lvl = facState(s).levels.academy;
  const e = effects(s);
  const yc = staffLevel(s, 'youth_coach');
  const current = squadOf(s, user.id).filter((p) => p.academy).length;
  const room = Math.max(0, academyCap(s) - current);
  const n = Math.min(room, clamp(2 + Math.floor(lvl / 2) + e.youthCount + rng.int(0, 2), 3, 12));
  const golden = rng.chance(0.03 + lvl * 0.003);
  const avg = DIV_AVG_OVR[user.div];
  const out: Player[] = [];
  const positions: Position[] = ['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST'];
  for (let i = 0; i < n; i++) {
    const age = rng.int(15, 16);
    const quality = (yc - 20) / 12 + e.youthQuality + (lvl - 1) * 0.6 + (golden ? 8 : 0);
    const ovr = avg - 17 + quality * 0.5 + rng.normal(0, 4);
    const p = generatePlayer(rng, s.nextPlayerId++, { ovr, pos: rng.pick(positions), age, season: s.season, div: user.div, potBoost: quality * 0.6 + (rng.chance(0.04) ? 12 : 0) });
    p.clubId = user.id;
    p.academy = true;
    p.personality = clamp(Math.round(p.personality + yc / 10 - 3), 1, 100);
    p.contract = { type: 'permanent', wage: Math.max(1, Math.round(marketWage(p.ovr, user.div, avg) * 0.15)), endSeason: s.season + 2, role: 'youth', clauses: {}, signedSeason: s.season };
    p.value = playerValue(p.ovr, p.pot, age, 3);
    s.players.set(p.id, p);
    dirtyPlayers.add(p.id);
    out.push(p);
  }
  invalidateSquads();
  const best = [...out].sort((a, b) => b.pot - a.pot)[0];
  addMessage(s, {
    cat: 'Squad',
    title: golden ? 'Golden generation!' : 'Academy intake',
    body: out.length
      ? `${out.length} new players joined the academy${golden ? ', and the coaches say this is a special group' : ''}. ${best ? `${best.first} ${best.last} (${best.pos}) looks the most promising.` : ''}`
      : 'The academy is full, so no new players joined this year. Promote or release some to make room.',
  });
  return out;
}

export function promoteFromAcademy(s: GameState, p: Player) {
  p.academy = false;
  const user = s.clubs[s.userClubId];
  if (p.contract) {
    p.contract.role = 'youth';
    p.contract.wage = Math.max(p.contract.wage, Math.round(marketWage(p.ovr, user.div, DIV_AVG_OVR[user.div]) * 0.5));
  }
  p.morale = clamp(p.morale + 10, 0, 100);
  invalidateSquads();
  dirtyPlayers.add(p.id);
}

function seasonEndMorale(s: GameState) {
  const rec = s.history.find((h) => h.season === s.season && h.clubId === s.userClubId);
  if (!rec) return;
  const bump = rec.outcome === 'champion' ? 20 : rec.outcome === 'promoted' || rec.outcome === 'playoff_winner' ? 15 : rec.outcome === 'relegated' ? -10 : 0;
  if (!bump) return;
  for (const p of squadOf(s, s.userClubId)) p.morale = clamp(p.morale + bump, 0, 100);
}

registerSystem({
  name: 'people',
  weekly(s, rng) {
    updateMorale(s, rng);
    if (s.week % MONTH === 0) developUserSquad(s, rng);
    if (s.week === ACADEMY_WEEK) academyIntake(s, rng);
    if (s.week >= 10 && s.week <= 44 && s.week % 2 === 1) transferRequests(s);
  },
  seasonEnd(s) {
    seasonEndMorale(s);
  },
  rollover(s) {
    // academy graduates: 19-year-olds must move up
    for (const p of squadOf(s, s.userClubId)) {
      if (p.academy && s.season - p.birthYear >= 19) {
        promoteFromAcademy(s, p);
        addMessage(s, { cat: 'Squad', title: `${p.first} ${p.last} graduates`, body: `${p.last} is too old for the academy and joins the first-team squad.` });
      }
    }
  },
});

// Injuries: doctor, physio and training facilities shorten them (DESIGN 6.3)
hooks.injuryMult = (s) => {
  const doc = staffLevel(s, 'doctor');
  const physio = staffLevel(s, 'physio');
  return clamp(1.15 - doc / 200 - physio / 400 + effects(s).injury, 0.4, 1.3);
};
