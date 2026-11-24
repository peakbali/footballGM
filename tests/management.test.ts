import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { Rng } from '../src/core/rng';
import { squadOf } from '../src/core/state';
import { askingPrice, completeDeal, submitBid } from '../src/core/systems/transfers';
import { askingWage, negotiate, seniorCount } from '../src/core/systems/contracts';
import { acceptSponsor } from '../src/core/systems/sponsors';
import { isInterested, knowledgeOf, makeReport } from '../src/core/systems/scouting';
import '../src/core/systems/all';

const club = clubsInLeague(startingLeagues()[3].key)[2];

describe('management', () => {
  it('starts with staff, sponsor offers and a scout assignment', () => {
    const s = newGame(11, club);
    expect(s.staff.length).toBe(9);
    expect(s.sponsors.filter((d) => d.status === 'offered').length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(s.scouting.assignments)).toHaveLength(1);
    const msg = s.inbox.find((m) => m.action?.kind === 'sponsor_choice')!;
    acceptSponsor(s, msg.id, s.sponsors[0].id);
    expect(s.sponsors[0].status).toBe('active');
  });

  it('scout reports show the true OVR, and POT as the true number or unknown', () => {
    const s = newGame(13, club);
    const others = [...s.players.values()].filter((p) => p.clubId != null && s.clubs[p.clubId].div !== s.clubs[s.userClubId].div).slice(0, 300);
    const seen = (level: number) => {
      s.scouting.reports = {};
      let n = 0;
      for (const p of others) {
        makeReport(s, p, level);
        const k = knowledgeOf(s, p);
        expect(k.ovr).toBe(p.ovr);
        if (k.pot != null) { expect(k.pot).toBe(p.pot); n++; }
      }
      return n;
    };
    const bad = seen(10);
    const good = seen(95);
    expect(good).toBeGreaterThan(bad * 1.8);
    s.scouting.reports = {};
    expect(knowledgeOf(s, others[0])).toEqual({ ovr: null, pot: null });
  });

  it('scouts only recommend players open to joining', () => {
    const s = newGame(14, club);
    s.scouting.assignments[s.staff.find((x) => x.role === 'scout')!.id].maxFee = 1e9;
    for (let i = 0; i < 8; i++) advanceWeek(s);
    const list = s.scouting.shortlist.map((id) => s.players.get(id)!).filter(Boolean);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(isInterested(s, p)).toBe(true);
    // and some players in range are not interested, so the filter does something
    const all = [...s.players.values()].filter((p) => p.clubId != null && p.clubId !== s.userClubId).slice(0, 500);
    expect(all.some((p) => !isInterested(s, p))).toBe(true);
  });

  it('pays wages and income weekly and keeps a ledger', () => {
    const s = newGame(12, club);
    const cash0 = s.clubs[s.userClubId].cash;
    for (let i = 0; i < 8; i++) advanceWeek(s);
    expect(s.fin.season.wages).toBeLessThan(0);
    expect(s.fin.season.gate).toBeGreaterThan(0);
    expect(s.clubs[s.userClubId].cash).not.toBe(cash0);
  });

  it('buys a player from an AI club at the asking price, then agrees terms', () => {
    const s = newGame(13, club);
    const user = s.clubs[s.userClubId];
    user.cash = 1e6;
    const lg = s.leagues[8];
    const other = lg.clubIds.find((id) => id !== s.userClubId)!;
    const target = squadOf(s, other).sort((a, b) => a.ovr - b.ovr)[10];
    const fee = askingPrice(s, target);
    const low = submitBid(s, new Rng(1), { pid: target.id, type: 'permanent', fee: Math.round(fee * 0.7) });
    expect(['countered', 'rejected']).toContain(low.status);
    const ok = submitBid(s, new Rng(1), { pid: target.id, type: 'permanent', fee });
    expect(ok.status).toBe('accepted');
    const ask = askingWage(s, target, s.userClubId);
    const r = negotiate(s, target, s.userClubId, { wage: ask, years: 2, clauses: {}, role: 'starter' }, 1);
    expect(r.result).toBe('accept');
    const before = seniorCount(s);
    expect(completeDeal(s, ok, { wage: ask, years: 2, clauses: {}, role: 'starter' })).toBeNull();
    expect(target.clubId).toBe(s.userClubId);
    expect(seniorCount(s)).toBe(before + (s.season - target.birthYear > 18 ? 1 : 0));
    expect(user.cash).toBe(1e6 - fee);
  });

  it('loans return to the parent club at the end of the loan', () => {
    const s = newGame(14, club);
    const lg = s.leagues[7];
    const other = lg.clubIds[0];
    const target = squadOf(s, other).sort((a, b) => a.ovr - b.ovr)[2];
    const o = submitBid(s, new Rng(2), { pid: target.id, type: 'loan', fee: 0, wageSharePct: 100, loanLength: 'half' });
    expect(o.status).toBe('accepted');
    completeDeal(s, o, { wage: 0, years: 1, clauses: {}, role: 'rotation' });
    expect(target.clubId).toBe(s.userClubId);
    while (s.week !== 28) advanceWeek(s);
    expect(target.clubId).toBe(other);
    expect(target.contract?.type).toBe('permanent');
  });
});
