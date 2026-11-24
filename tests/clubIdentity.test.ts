import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { applyIdentity, draftOf, identityError } from '../src/core/clubIdentity';
import '../src/core/systems/all';

const club = clubsInLeague(startingLeagues()[3].key)[2];

describe('club identity', () => {
  it('renames and recolours the user club with a crest', () => {
    const s = newGame(31, club);
    const d = draftOf(s.clubs[s.userClubId]);
    expect(d.crest.shape).toBe(0);
    d.name = 'Pixel Rovers FC'; d.short = 'Pixel Rovers'; d.abbrev = 'pxr'; d.stadium = 'Bit Park';
    d.colors = ['#5A2D82', '#ffcc4d']; d.crest = { shape: 1, pattern: 5, icon: 2 };
    expect(applyIdentity(s, d)).toBeNull();
    const c = s.clubs[s.userClubId];
    expect([c.name, c.abbrev, c.stadium, c.colors[0], c.crest?.shape]).toEqual(['Pixel Rovers FC', 'PXR', 'Bit Park', '#5a2d82', 1]);
  });

  it('rejects bad input and names taken by another club', () => {
    const s = newGame(32, club);
    const d = draftOf(s.clubs[s.userClubId]);
    expect(identityError(s, { ...d, name: 'ab' })).toMatch(/3 letters/);
    expect(identityError(s, { ...d, abbrev: 'TOOLONG' })).toMatch(/code/);
    expect(identityError(s, { ...d, colors: ['red', '#ffffff'] })).toMatch(/colours/);
    const other = s.clubs.find((c) => c.id !== s.userClubId)!;
    expect(identityError(s, { ...d, name: other.name.toUpperCase() })).toMatch(/already/);
    expect(identityError(s, d)).toBeNull();
  });
});
