import type { Club, Crest } from './types';
import type { GameState } from './state';
import { abbrev, shortName } from './world';

/** Club identity editing (DESIGN 13.2k): name, short name, three-letter code, stadium name, colours and crest. */
export const CREST_SHAPES = ['Shield', 'Round', 'Square', 'Diamond', 'Heater'] as const;
export const CREST_PATTERNS = ['Centre stripe', 'Band', 'Halves', 'Top bar', 'Plain', 'Chevron', 'Quarters', 'Stripes', 'Hoops', 'Sash'] as const;
export const CREST_ICONS = ['None', 'Star', 'Ball', 'Crown', 'Tower', 'Cross', 'Anchor', 'Tree'] as const;

export const PALETTE = [
  '#c8102e', '#8b1a2b', '#e8803a', '#ffcc4d', '#f4e04d', '#1d7a48', '#38b26a', '#0b5d3b',
  '#1f5fa8', '#6cabdd', '#132257', '#5a2d82', '#a0a0a8', '#ffffff', '#111111', '#7a4a24',
];

export const crestOf = (c: Club): Crest => c.crest ?? { shape: 0, pattern: c.id % 4, icon: 0 };

export interface IdentityDraft {
  name: string;
  short: string;
  abbrev: string;
  stadium: string;
  colors: [string, string];
  crest: Crest;
}

export function draftOf(c: Club): IdentityDraft {
  return { name: c.name, short: c.short, abbrev: c.abbrev, stadium: c.stadium, colors: [c.colors[0], c.colors[1]], crest: { ...crestOf(c) } };
}

export const autoShort = (name: string) => shortName(name.trim());
export const autoAbbrev = (name: string) => abbrev(name.trim() || 'Club');

const HEX = /^#[0-9a-f]{6}$/i;

/** Why the draft cannot be saved, or null. */
export function identityError(s: GameState, d: IdentityDraft): string | null {
  const name = d.name.trim();
  if (name.length < 3) return 'The club name needs at least 3 letters.';
  if (name.length > 32) return 'Keep the club name to 32 characters.';
  if (s.clubs.some((c) => c.id !== s.userClubId && c.name.toLowerCase() === name.toLowerCase())) return 'Another club already has that name.';
  if (!d.short.trim() || d.short.trim().length > 16) return 'The short name needs 1 to 16 characters.';
  if (!/^[A-Za-z0-9]{2,4}$/.test(d.abbrev.trim())) return 'The code needs 2 to 4 letters or digits.';
  if (d.stadium.trim().length < 3 || d.stadium.trim().length > 32) return 'The stadium name needs 3 to 32 characters.';
  if (!HEX.test(d.colors[0]) || !HEX.test(d.colors[1])) return 'Pick two colours.';
  const cr = d.crest;
  if (!(cr.shape >= 0 && cr.shape < CREST_SHAPES.length && cr.pattern >= 0 && cr.pattern < CREST_PATTERNS.length && cr.icon >= 0 && cr.icon < CREST_ICONS.length)) return 'Pick a crest.';
  return null;
}

/** Apply the draft to the user's club. Returns an error message or null. */
export function applyIdentity(s: GameState, d: IdentityDraft): string | null {
  const err = identityError(s, d);
  if (err) return err;
  const c = s.clubs[s.userClubId];
  c.name = d.name.trim();
  c.short = d.short.trim();
  c.abbrev = d.abbrev.trim().toUpperCase();
  c.stadium = d.stadium.trim();
  c.colors = [d.colors[0].toLowerCase(), d.colors[1].toLowerCase()];
  c.crest = { shape: d.crest.shape, pattern: d.crest.pattern, icon: d.crest.icon, ...(d.crest.iconColor ? { iconColor: d.crest.iconColor } : {}) };
  return null;
}
