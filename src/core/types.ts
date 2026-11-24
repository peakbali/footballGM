import type { Position } from './data/positions';

export type DevType = 'standard' | 'early' | 'late' | 'decliner' | 'random';
export type AiType = 'buyer' | 'developer' | 'seller';
export type ContractType = 'permanent' | 'loan' | 'loan_option' | 'loan_obligation';
export type SquadRole = 'star' | 'starter' | 'rotation' | 'backup' | 'youth';
export type Familiarity = 'N' | 'A'; // natural / accomplished

export interface Clauses {
  sellOnPct?: number; // beneficiary = sellOnClub
  sellOnClub?: number;
  release?: number;
  appBonus?: number;
  goalBonus?: number;
  promoBonus?: number;
  yearlyRisePct?: number;
}

export interface Contract {
  type: ContractType;
  wage: number; // weekly, full wage
  endSeason: number; // contract ends 30 June of endSeason+1 (i.e. at rollover from endSeason)
  role: SquadRole;
  parentClubId?: number; // loans
  wageSharePct?: number; // loans: % of wage paid by loaning (parent) club
  loanEndSeason?: number;
  loanEndWeek?: number; // loan returns at this week (half season = week 27, full = 52)
  optionFee?: number;
  obligationApps?: number; // obligation triggers if apps >= this
  clauses: Clauses;
  signedSeason: number;
}

export interface SeasonStats {
  apps: number;
  mins: number;
  goals: number;
  assists: number;
  cs: number;
  yel: number;
  red: number;
  ratingSum: number;
}

export interface Player {
  id: number;
  first: string;
  last: string;
  birthYear: number; // age at season S = S - birthYear
  nat: string; // ISO alpha-3
  real: boolean;
  clubId: number | null; // null = free agent
  academy: boolean;
  foot: 'L' | 'R' | 'B';
  pos: Position; // main position
  fam: Partial<Record<Position, Familiarity>>;
  attrs: number[]; // 31 values, see ATTRS
  ovr: number;
  pot: number;
  personality: number;
  dev: DevType;
  devShift: number; // years the curve is shifted (off-curve types)
  proneness: number; // 1..100
  consistency: number; // 1..100
  morale: number;
  fitness: number;
  injury: number; // weeks out
  injuryName?: string;
  ban: number; // matches suspended
  yellowAcc: number; // accumulated yellows this season
  value: number;
  contract: Contract | null;
  stats: SeasonStats; // current season
  career: { s: number; c: number; apps: number; goals: number; ovr: number }[];
  listed?: boolean; // transfer listed by the user
  loanListed?: boolean;
  retired?: boolean;
  locked?: boolean; // user locked into XI
  joinedSeason?: number;
  minutesShare?: number; // rolling playing time share, 0..1
}

export interface Club {
  id: number;
  name: string;
  short: string;
  abbrev: string;
  colors: [string, string];
  stadium: string;
  capacity: number;
  seats: number;
  rep: number; // 1..100
  ai: AiType;
  cash: number;
  ticket: number;
  formation: string;
  div: number; // current division 1..10
  leagueKey: string; // real league the club belongs to (regional for off-chain)
  lat: number;
  lon: number;
  strength: number; // avg of best 14 OVR (all clubs)
  att: number;
  mid: number;
  def: number;
  gk: number;
  lastAttendance?: number;
  user?: boolean;
}

export interface Fixture {
  id: number;
  div: number;
  week: number;
  home: number;
  away: number;
  hg: number | null;
  ag: number | null;
  att?: number;
  full?: boolean;
  playoff?: 'semi' | 'final';
  pens?: string; // e.g. "4-3" if decided on penalties
}

export interface MatchEvent {
  m: number; // minute
  t: 'goal' | 'chance' | 'save' | 'miss' | 'yellow' | 'red' | 'injury' | 'corner' | 'foul' | 'sub' | 'ko' | 'ht' | 'ft' | 'pen';
  c: number; // club id
  p?: number; // player id
  p2?: number; // assister / other
  xg?: number;
  x?: number;
  y?: number;
}

export interface MatchStats {
  shots: [number, number];
  onTarget: [number, number];
  xg: [number, number];
  poss: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellows: [number, number];
  reds: [number, number];
}

export interface MatchReport {
  fixtureId: number;
  season: number;
  events: MatchEvent[];
  stats: MatchStats;
  lineups: [number[], number[]];
  ratings: Record<number, number>;
  motm?: number;
}

export interface TableRow {
  clubId: number;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  form: string; // last 5, newest last e.g. "WDLWW"
}

export interface ClubSeasonRecord {
  season: number;
  clubId: number;
  div: number;
  pos: number;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  outcome?: 'champion' | 'promoted' | 'playoff_winner' | 'relegated' | 'stayed';
}

export interface InboxMessage {
  id: number;
  season: number;
  week: number;
  cat: 'Transfers' | 'Squad' | 'Staff' | 'Finance' | 'Board' | 'League' | 'Club';
  title: string;
  body: string;
  read: boolean;
  /** Action the user must take; blocks Continue until resolved. */
  action?: { kind: string; ref?: number; data?: unknown };
  resolved?: boolean;
}

export interface NewsItem {
  season: number;
  week: number;
  text: string;
}
