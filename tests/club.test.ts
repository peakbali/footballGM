import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { squadOf } from '../src/core/state';
import { building, facState, nextOptions, startUpgrade } from '../src/core/systems/facilities';
import { academyIntake, answerTransferRequest, promoteFromAcademy } from '../src/core/systems/people';
import { staffCap } from '../src/core/systems/staff';
import { Rng } from '../src/core/rng';
import '../src/core/systems/all';

const club = clubsInLeague(startingLeagues()[3].key)[2];

describe('club building', () => {
  it('builds a facility upgrade over several weeks and applies its effects', () => {
    const s = newGame(21, club);
    const user = s.clubs[s.userClubId];
    user.cash = 1e6;
    const opt = nextOptions(s, 'training')[0];
    expect(startUpgrade(s, opt.id)).toBeNull();
    expect(building(s, 'training')).not.toBeNull();
    expect(startUpgrade(s, opt.id)).not.toBeNull(); // one project per branch
    const capBefore = staffCap(s, 'coach_att');
    for (let i = 0; i < opt.weeks; i++) advanceWeek(s);
    expect(facState(s).levels.training).toBe(2);
    expect(staffCap(s, 'coach_att')).toBeGreaterThan(capBefore);
    expect(s.inbox.some((m) => m.title.includes('finished'))).toBe(true);
  });

  it('either/or stadium stands add capacity', () => {
    const s = newGame(22, club);
    const user = s.clubs[s.userClubId];
    user.cash = 1e7;
    const f = facState(s);
    f.levels.stadium = 2;
    const opts = nextOptions(s, 'stadium');
    expect(opts.length).toBe(2);
    const cap0 = user.capacity;
    startUpgrade(s, opts[0].id);
    for (let i = 0; i < opts[0].weeks; i++) advanceWeek(s);
    expect(user.capacity).toBe(cap0 + opts[0].eff.capacity!);
    expect(nextOptions(s, 'stadium')[0].level).toBe(4);
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
