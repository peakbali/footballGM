import type { Club, ClubSeasonRecord, Fixture, InboxMessage, MatchReport, NewsItem, Player } from './types';

export const SAVE_VERSION = 1;
export const START_SEASON = 2025;

/** Calendar (weeks 1..52, week 1 = first week of July). */
export const CAL = {
  firstRoundWeek: 6, // early August
  rounds: 38, // weeks 6..43
  playoffSemiWeek: 44,
  playoffFinalWeek: 45,
  seasonEndWeek: 46,
  winterWindow: [27, 30] as [number, number], // January
  summerWindowEnd: 9, // window open weeks 49..52 and 1..9
  summerWindowStart: 49,
  weeks: 52,
};

export interface SimLeague {
  div: number;
  key: string; // real league key (for divs 6-10, the chain league)
  name: string;
  short: string;
  clubIds: number[];
}

export interface GameState {
  version: number;
  seed: number;
  season: number;
  week: number;
  userClubId: number;
  chain: string[]; // league keys for divs 6..10
  clubs: Club[]; // index = id
  players: Map<number, Player>;
  nextPlayerId: number;
  leagues: SimLeague[]; // index = div - 1
  fixtures: Fixture[]; // current season, all simulated leagues
  nextFixtureId: number;
  reports: Map<number, MatchReport>; // own league full-sim reports, current + last season
  history: ClubSeasonRecord[];
  inbox: InboxMessage[];
  nextMsgId: number;
  news: NewsItem[];
  settings: { muted: boolean; music: number; sfx: number };
  /** Extension data for later systems, keyed by system name. */
  ext: Record<string, unknown>;
}

export function userClub(s: GameState): Club {
  return s.clubs[s.userClubId];
}

export function squadOf(s: GameState, clubId: number): Player[] {
  const out: Player[] = [];
  for (const p of s.players.values()) if (p.clubId === clubId && !p.retired) out.push(p);
  return out;
}

/** Fast club -> players index. Rebuild when squads change. */
export function buildSquadIndex(s: GameState): Map<number, Player[]> {
  const idx = new Map<number, Player[]>();
  for (const p of s.players.values()) {
    if (p.clubId == null || p.retired) continue;
    let arr = idx.get(p.clubId);
    if (!arr) idx.set(p.clubId, (arr = []));
    arr.push(p);
  }
  return idx;
}

export function leagueOfClub(s: GameState, clubId: number): SimLeague | undefined {
  return s.leagues.find((l) => l.clubIds.includes(clubId));
}

export function isWindowOpen(week: number): 'summer' | 'winter' | null {
  if (week >= CAL.summerWindowStart || week <= CAL.summerWindowEnd) return 'summer';
  if (week >= CAL.winterWindow[0] && week <= CAL.winterWindow[1]) return 'winter';
  return null;
}

/** Approximate calendar date label for a week. */
export function weekDate(season: number, week: number): string {
  const d = new Date(Date.UTC(season, 6, 1 + (week - 1) * 7));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function emptyStats() {
  return { apps: 0, mins: 0, goals: 0, assists: 0, cs: 0, yel: 0, red: 0, ratingSum: 0 };
}
