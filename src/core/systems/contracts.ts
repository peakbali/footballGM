import { DIV_AVG_OVR } from '../data/pyramid';
import { marketWage, playerValue, roundMoney } from '../data/economy';
import { addMessage } from '../season';
import { clamp } from '../rng';
import { invalidateSquads, squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import type { Clauses, Player, SquadRole } from '../types';
import { bumpStat } from './stats';
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

/**
 * Contract length and wage (DESIGN 13.2m): most players (3 in 4) take a lower wage for a longer deal, for the
 * security. The other quarter prefer short deals and want more to commit for longer. Fixed per player.
 */
export function prefersLong(p: Pick<Player, 'id'>): boolean {
  return ((p.id * 2654435761) >>> 0) % 4 !== 0;
}

/** Wage multiplier for a contract of `years` (1..5) years; 3 years is the reference. */
export function lengthFactor(p: Pick<Player, 'id'>, years: number): number {
  const y = clamp(Math.round(years), 1, 5);
  return prefersLong(p) ? 1 + 0.06 * (3 - y) : 1 + 0.05 * (y - 3);
}

/**
 * The weekly wage the player asks for a deal of `years` years. For his current club (a renewal) unhappy players ask
 * more, happy ones a little less, and nobody takes a big cut from what he earns now.
 */
export function contractAsk(s: GameState, p: Player, clubId: number, years: number): number {
  let ask = askingWage(s, p, clubId);
  if (p.clubId === clubId && p.contract) {
    const moodF = p.morale < 35 ? 1.15 : p.morale > 75 ? 0.95 : 1;
    ask = Math.max(ask * moodF, p.contract.wage * 0.9);
  }
  return roundMoney(ask * lengthFactor(p, years));
}

export type Reaction = 'accept' | 'counter' | 'reject';
/** How he reacts to `wage` against his ask: within 3% he signs, under 60% he walks away, in between he counters. */
export function reactionTo(wage: number, ask: number, lastRound: boolean): Reaction {
  if (wage >= ask * 0.97) return 'accept';
  if (lastRound || wage < ask * 0.6) return 'reject';
  return 'counter';
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

/** His ask for a whole offer (length, release clause and squad role), before the round discount. */
export function askFor(s: GameState, p: Player, clubId: number, offer: Pick<ContractOffer, 'years' | 'clauses' | 'role'>): number {
  let ask = contractAsk(s, p, clubId, offer.years);
  if (offer.clauses.release) ask *= 0.95;
  const roleRank = { star: 4, starter: 3, rotation: 2, backup: 1, youth: 0 };
  if (roleRank[offer.role] < roleRank[expectedRole(s, p, clubId)]) ask *= 1.15;
  return roundMoney(ask);
}

/** One negotiation round (max 3). Used for new signings and renewals. */
export function negotiate(s: GameState, p: Player, clubId: number, offer: ContractOffer, round: number): NegotiationResult {
  const ask = roundMoney(askFor(s, p, clubId, offer) * (1 - (round - 1) * 0.03));
  if (p.clubId === clubId && p.personality < 25 && p.morale < 35) {
    return { result: 'reject', ask, message: `${p.last} is unhappy and refuses to talk about a new deal.` };
  }
  const r = reactionTo(offer.wage, ask, round >= 3);
  if (r === 'accept') return { result: 'accept', ask, message: `${p.last} accepts the terms.` };
  if (r === 'reject') return { result: 'reject', ask, message: `${p.last} rejects the offer and ends talks.` };
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
  if (p.clubId === s.userClubId) bumpStat(s, 'releases');
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
