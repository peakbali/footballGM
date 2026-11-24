import { DIV_AVG_OVR } from '../data/pyramid';
import { marketWage, playerValue, roundMoney } from '../data/economy';
import { addMessage } from '../season';
import { clamp } from '../rng';
import { invalidateSquads, squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import type { Clauses, Player, SquadRole } from '../types';
import { txn } from './finance';

export const SQUAD_MAX = 30;
export const SQUAD_MIN = 20;

/** Players counting toward the 30-man limit (over 18, not academy). */
export function seniorCount(s: GameState, clubId = s.userClubId): number {
  return squadOf(s, clubId).filter((p) => !p.academy && s.season - p.birthYear > 18).length;
}

export function counts(s: GameState, p: Player) {
  return !p.academy && s.season - p.birthYear > 18;
}

/** Personality: high = accepts less, low = demands more (DESIGN 7.3). */
export function personalityWageFactor(p: Player): number {
  return 1.4 - (p.personality / 100) * 0.6; // 100 -> 0.8, 0 -> 1.4
}

export function expectedRole(s: GameState, p: Player, clubId: number): SquadRole {
  const squad = squadOf(s, clubId).filter((q) => q.id !== p.id && !q.academy);
  const better = squad.filter((q) => q.ovr > p.ovr).length;
  if (s.season - p.birthYear <= 18) return better < 11 ? 'starter' : 'youth';
  return better < 2 ? 'star' : better < 11 ? 'starter' : better < 16 ? 'rotation' : 'backup';
}

/** Wage the player asks to join or stay at `clubId`. */
export function askingWage(s: GameState, p: Player, clubId: number): number {
  const c = s.clubs[clubId];
  const mkt = marketWage(p.ovr, c.div, DIV_AVG_OVR[c.div]);
  // a player from a higher division expects close to what he earns now
  const current = p.contract && p.clubId !== clubId ? p.contract.wage : 0;
  const repF = 1 + clamp((60 - c.rep) / 300, -0.1, 0.15);
  return roundMoney(Math.max(mkt, current * 0.9) * personalityWageFactor(p) * repF);
}

export interface ContractOffer {
  wage: number;
  years: number; // 1..5
  clauses: Clauses;
  role: SquadRole;
}

export interface NegotiationResult {
  result: 'accept' | 'counter' | 'reject';
  ask: number;
  message: string;
}

/** One negotiation round (max 3). Used for new signings and renewals. */
export function negotiate(s: GameState, p: Player, clubId: number, offer: ContractOffer, round: number): NegotiationResult {
  let ask = askingWage(s, p, clubId);
  // release clause and short deals make players happier; long deals for old players less so
  const age = s.season - p.birthYear;
  if (offer.clauses.release) ask *= 0.95;
  if (age >= 30 && offer.years >= 3) ask *= 0.93;
  if (age <= 23 && offer.years >= 4) ask *= 1.04;
  const exp = expectedRole(s, p, clubId);
  const roleRank = { star: 4, starter: 3, rotation: 2, backup: 1, youth: 0 };
  if (roleRank[offer.role] < roleRank[exp]) ask *= 1.15;
  ask = roundMoney(ask * (1 - (round - 1) * 0.03));
  if (p.clubId === clubId && p.personality < 25 && p.morale < 35) {
    return { result: 'reject', ask, message: `${p.last} is unhappy and refuses to talk about a new deal.` };
  }
  if (offer.wage >= ask * 0.97) return { result: 'accept', ask, message: `${p.last} accepts the terms.` };
  if (round >= 3 || offer.wage < ask * 0.6) return { result: 'reject', ask, message: `${p.last} rejects the offer and ends talks.` };
  return { result: 'counter', ask, message: `${p.last} wants ${'£' + ask.toLocaleString()} a week.` };
}

export function applyContract(s: GameState, p: Player, clubId: number, offer: ContractOffer) {
  p.contract = {
    type: 'permanent',
    wage: offer.wage,
    endSeason: s.season + offer.years - (s.week >= 47 ? 0 : 1),
    role: offer.role,
    clauses: offer.clauses,
    signedSeason: s.season,
  };
  p.value = playerValue(p.ovr, p.pot, s.season - p.birthYear, offer.years);
  if (clubId === s.userClubId) p.morale = clamp(p.morale + 8, 0, 100);
}

/** Release a player: pay half of the remaining wages as compensation. */
export function releaseCost(s: GameState, p: Player): number {
  if (!p.contract || p.contract.type !== 'permanent') return 0;
  const weeksLeft = (p.contract.endSeason - s.season) * 52 + (52 - s.week + 1);
  return Math.round(p.contract.wage * weeksLeft * 0.5);
}

export function releasePlayer(s: GameState, p: Player) {
  const cost = releaseCost(s, p);
  txn(s, 'other_out', -cost);
  s.transfers.push({ season: s.season, week: s.week, pid: p.id, name: `${p.first} ${p.last}`, from: p.clubId, to: null, fee: 0, type: 'release' });
  p.clubId = null;
  p.contract = null;
  p.listed = false;
  p.loanListed = false;
  p.locked = false;
  invalidateSquads();
}

registerSystem({
  name: 'contracts',
  weekly(s) {
    if (s.week === 30) {
      const exp = squadOf(s, s.userClubId).filter((p) => !p.academy && p.contract?.type === 'permanent' && p.contract.endSeason === s.season);
      if (exp.length)
        addMessage(s, {
          cat: 'Squad',
          title: `${exp.length} contract${exp.length > 1 ? 's' : ''} expire this summer`,
          body: `Renew from the player screen before 30 June or they leave for free:\n${exp.map((p) => `• ${p.first} ${p.last} (${p.ovr})`).join('\n')}`,
        });
    }
  },
  rollover(s) {
    // runs after the new season starts: user contracts that ended leave
    const gone: Player[] = [];
    for (const p of squadOf(s, s.userClubId)) {
      // academy players are kept on rolling youth deals
      if (p.academy && p.contract) p.contract.endSeason = Math.max(p.contract.endSeason, s.season + 1);
      if (p.contract?.type === 'permanent' && p.contract.endSeason < s.season) {
        gone.push(p);
        s.transfers.push({ season: s.season, week: 1, pid: p.id, name: `${p.first} ${p.last}`, from: s.userClubId, to: null, fee: 0, type: 'release' });
        p.clubId = null;
        p.contract = null;
        p.listed = false;
        p.locked = false;
      }
    }
    invalidateSquads();
    if (gone.length) addMessage(s, { cat: 'Squad', title: 'Contracts expired', body: `These players left on a free:\n${gone.map((p) => `• ${p.first} ${p.last}`).join('\n')}` });
  },
});
