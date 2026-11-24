import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { acceptSponsor, emptySlots, migrateSponsors, sponsorSlots } from '../src/core/systems/sponsors';
import { facState } from '../src/core/systems/facilities';
import '../src/core/systems/all';

const club = clubsInLeague(startingLeagues()[3].key)[2];

describe('sponsor slots', () => {
  it('starts with 3 slots and offers for each', () => {
    const s = newGame(21, club);
    expect(sponsorSlots(s)).toBe(3);
    const offered = s.sponsors.filter((d) => d.status === 'offered');
    expect(new Set(offered.map((d) => d.slot))).toEqual(new Set(['shirt', 'sleeve', 'training']));
  });

  it('signs one deal per slot and resolves the message when all slots are decided', () => {
    const s = newGame(22, club);
    const msg = s.inbox.find((m) => m.action?.kind === 'sponsor_choice')!;
    const shirt = s.sponsors.find((d) => d.slot === 'shirt')!;
    acceptSponsor(s, msg.id, shirt.id);
    expect(shirt.status).toBe('active');
    expect(s.sponsors.filter((d) => d.slot === 'shirt' && d.status === 'offered')).toHaveLength(0);
    expect(msg.resolved).toBeFalsy();
    acceptSponsor(s, msg.id, null, 'sleeve');
    const training = s.sponsors.find((d) => d.slot === 'training' && d.status === 'offered')!;
    acceptSponsor(s, msg.id, training.id);
    expect(msg.resolved).toBe(true);
    expect(emptySlots(s)).toEqual(['sleeve']);
    expect(s.sponsors.filter((d) => d.status === 'active')).toHaveLength(2);
  });

  it('the Sponsorship office adds slots up to 6', () => {
    const s = newGame(23, club);
    const f = facState(s);
    f.tracks.partners = 2;
    expect(sponsorSlots(s)).toBe(4);
    f.tracks.partners = 5;
    expect(sponsorSlots(s)).toBe(6);
  });

  it('old saves: slotless deals become shirt and sleeve', () => {
    const s = newGame(24, club);
    for (const d of s.sponsors) delete d.slot;
    s.sponsors[0].status = 'active';
    s.sponsors[1].status = 'active';
    s.sponsors[1].half = true;
    migrateSponsors(s);
    expect([s.sponsors[0].slot, s.sponsors[1].slot]).toEqual(['shirt', 'sleeve']);
  });
});
