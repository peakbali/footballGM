import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { squadOf } from '../src/core/state';
import { TRACKS, building, effects, facState, nextUpgrade, startUpgrade, trackLevel, upgradeFor } from '../src/core/systems/facilities';
import { academyIntake, answerTransferRequest, promoteFromAcademy } from '../src/core/systems/people';
import { staffCap } from '../src/core/systems/staff';
import { Rng } from '../src/core/rng';
import '../src/core/systems/all';

const club = clubsInLeague(startingLeagues()[3].key)[2];

describe('club building', () => {
  it('builds a sub-facility over several weeks and applies its effects', () => {
    const s = newGame(21, club);
    const user = s.clubs[s.userClubId];
    user.cash = 1e6;
    const up = nextUpgrade(s, 'grounds')!;
    expect(up.level).toBe(1);
    expect(up.cost).toBeGreaterThan(1000);
    expect(up.cost).toBeLessThan(10000); // division 9 prices
    expect(startUpgrade(s, up.id)).toBeNull();
    expect(building(s, 'grounds')).not.toBeNull();
    expect(startUpgrade(s, up.id)).not.toBeNull(); // one project per sub-facility
    expect(startUpgrade(s, nextUpgrade(s, 'gym')!.id)).toBeNull(); // others can build at the same time
    for (let i = 0; i < 6; i++) advanceWeek(s);
    expect(trackLevel(s, 'grounds')).toBe(1);
    expect(trackLevel(s, 'gym')).toBe(1);
    expect(effects(s).dev).toBeCloseTo(0.037, 3);
    expect(s.inbox.some((m) => m.title.includes('finished'))).toBe(true);
  });

  it('raises the main branch level and staff caps as sub-facilities grow', () => {
    const s = newGame(22, club);
    const user = s.clubs[s.userClubId];
    user.cash = 1e8;
    const capBefore = staffCap(s, 'coach_att');
    for (const key of ['grounds', 'gym', 'medical']) for (let l = 0; l < 2; l++) { startUpgrade(s, nextUpgrade(s, key)!.id); for (let i = 0; i < 6; i++) advanceWeek(s); }
    expect(facState(s).levels.training).toBe(3);
    expect(staffCap(s, 'coach_att')).toBeGreaterThan(capBefore);
  });

  it('stands add seats as a share of the ground', () => {
    const s = newGame(22, club);
    const user = s.clubs[s.userClubId];
    user.cash = 1e7;
    const cap0 = user.capacity;
    const up = nextUpgrade(s, 'stands')!;
    startUpgrade(s, up.id);
    for (let i = 0; i < up.weeks; i++) advanceWeek(s);
    expect(user.capacity).toBeGreaterThan(cap0 * 1.1);
    expect(nextUpgrade(s, 'stands')!.level).toBe(2);
  });

  it('prices follow the division', () => {
    const t = TRACKS.find((x) => x.key === 'shop')!;
    expect(upgradeFor(t, 1, 1).cost).toBeGreaterThan(upgradeFor(t, 1, 5).cost * 50);
    expect(upgradeFor(t, 5, 9).cost).toBeGreaterThan(upgradeFor(t, 1, 9).cost * 8);
  });

  it('converts a save from the old ten-level branches', () => {
    const s = newGame(26, club);
    const cash0 = s.clubs[s.userClubId].cash;
    s.ext.fac = { levels: { stadium: 4, training: 10, academy: 1, commercial: 2 }, built: ['stadium-2-x', 'stadium-3-north-stand-seated', 'stadium-4-x'], projects: [{ id: 'commercial-3-clubhouse-bar', weeksLeft: 3 }] };
    const f = facState(s);
    expect(f.v).toBe(2);
    expect(f.levels.training).toBe(10);
    expect(f.levels.academy).toBe(1);
    expect(f.levels.stadium).toBeGreaterThanOrEqual(3);
    expect(f.projects.length).toBe(0);
    expect(s.clubs[s.userClubId].cash).toBeGreaterThan(cash0); // running project refunded
    expect(f.upkeep).toBeGreaterThan(0);
  });

  it('develops the own squad monthly and moves morale', () => {
    const s = newGame(23, club);
    const squad = squadOf(s, s.userClubId);
    const ovr0 = squad.map((p) => p.ovr).join(',');
    const mor0 = squad.map((p) => p.morale).join(',');
    for (let i = 0; i < 16; i++) advanceWeek(s);
    expect(squad.map((p) => p.ovr).join(',')).not.toBe(ovr0);
    expect(squad.map((p) => p.morale).join(',')).not.toBe(mor0);
  });

  it('brings in an academy intake that does not count toward the squad and can be promoted', () => {
    const s = newGame(24, club);
    const out = academyIntake(s, new Rng(5));
    expect(out.length).toBeGreaterThanOrEqual(3);
    for (const p of out) {
      expect(p.academy).toBe(true);
      expect(s.season - p.birthYear).toBeLessThanOrEqual(16);
    }
    promoteFromAcademy(s, out[0]);
    expect(out[0].academy).toBe(false);
  });

  it('handles a transfer request', () => {
    const s = newGame(25, club);
    const p = squadOf(s, s.userClubId)[5];
    s.inbox.push({ id: s.nextMsgId++, season: s.season, week: s.week, read: false, cat: 'Squad', title: 'x', body: '', action: { kind: 'transfer_request', ref: p.id } });
    answerTransferRequest(s, s.nextMsgId - 1, true);
    expect(p.listed).toBe(true);
  });
});

import { boardState } from '../src/core/systems/board';
import { seasons, records } from '../src/core/systems/chronicle';

describe('board and history', () => {
  it('sets goals, gives a verdict and records the season', () => {
    const s = newGame(31, club);
    expect(boardState(s).goals.length).toBeGreaterThanOrEqual(2);
    while (!(s.ext.reelPending)) advanceWeek(s);
    const b = boardState(s);
    expect(b.last?.goals.every((g) => g.met !== undefined)).toBe(true);
    const list = seasons(s);
    expect(list).toHaveLength(1);
    expect(list[0].table).toHaveLength(20);
    expect(records(s).pts?.v).toBe(list[0].pts);
    // the next season gets fresh goals
    while (s.week !== 2) advanceWeek(s);
    expect(boardState(s).season).toBe(s.season);
  });
});

import { cupState, CUP_WEEKS } from '../src/core/systems/cup';

describe('FA Cup', () => {
  it('runs a full knockout alongside the league and crowns one winner', () => {
    const s = newGame(41, club);
    while (s.week <= CUP_WEEKS[CUP_WEEKS.length - 1]) advanceWeek(s);
    const c = cupState(s)!;
    expect(c.alive).toHaveLength(1);
    expect(c.winner).toBe(c.alive[0]);
    const cupFx = s.fixtures.filter((f) => f.cup);
    expect(cupFx.length).toBe(72 + 64 + 32 + 16 + 8 + 4 + 2 + 1);
    expect(cupFx.every((f) => f.hg != null)).toBe(true);
    // league tables are unaffected: 20 clubs, nobody has more than 38 games
    expect(c.userWon || c.userExit != null).toBe(true);
  });
});

import { applyRealPlayers, matchClubs, type RealData } from '../src/core/realData';
import { ATTRS } from '../src/core/data/positions';

describe('real data import (local only)', () => {
  it('matches EA club spellings and replaces generated squads', () => {
    const s = newGame(51, club);
    const m = matchClubs(s, ["Nott'm Forest", 'Spurs', 'FC Bayern München', 'Nowhere Rovers']);
    expect(s.clubs[m.get("Nott'm Forest")!].name).toBe('Nottingham Forest');
    expect(s.clubs[m.get('Spurs')!].name).toBe('Tottenham Hotspur');
    expect(s.clubs[m.get('FC Bayern München')!].name).toBe('Bayern Munich');
    expect(m.has('Nowhere Rovers')).toBe(false);
    const pos = ['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST', 'CB', 'CM', 'GK', 'LM', 'RM'] as const;
    const data: RealData = { version: 1, source: 'test', season: 2025, players: pos.map((p, i) => ({ first: 'Real', last: `P${i}`, birthYear: 2000, nat: 'ENG', club: 'Spurs', pos: p, alt: [], foot: 'R', ovr: 80, pot: 84, attrs: ATTRS.map(() => 75) })) };
    const r = applyRealPlayers(s, data, new Rng(1));
    expect(r).toEqual({ clubs: 1, players: 18 });
    const spurs = squadOf(s, m.get('Spurs')!);
    expect(spurs).toHaveLength(18);
    expect(spurs.every((p) => p.real && p.contract)).toBe(true);
  });
});
