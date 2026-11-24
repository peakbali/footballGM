import { ADJACENT, ATTRS, POSITIONS, type Position } from './data/positions';
import { playerValue } from './data/economy';
import { roleForRank, signContract } from './generate';
import { recomputeOvr } from './ratings';
import type { Rng } from './rng';
import { clamp } from './rng';
import { emptyStats, invalidateSquads, type GameState } from './state';
import type { Player } from './types';

/**
 * Real player data (DESIGN 3.4). The file is built on the user's own machine by
 * `npm run import:eafc` from a CSV they download themselves, and it never goes into git.
 * When it is absent the game is fully generated.
 */
export interface RealPlayer {
  first: string;
  last: string;
  birthYear: number;
  nat: string; // ISO alpha-3
  club: string;
  league?: string;
  pos: Position;
  alt: Position[];
  foot: 'L' | 'R' | 'B';
  ovr: number;
  pot: number;
  attrs: number[]; // 31 values in ATTRS order
}

export interface RealData {
  version: 1;
  source: string;
  season: number;
  players: RealPlayer[];
}

/** EA and SoFIFA spellings that differ from the club names used in the game. */
export const CLUB_ALIASES: Record<string, string> = {
  "nott'm forest": 'Nottingham Forest', 'spurs': 'Tottenham Hotspur', 'man utd': 'Manchester United', 'man city': 'Manchester City',
  'wolves': 'Wolverhampton Wanderers', 'brighton': 'Brighton & Hove Albion', 'bournemouth': 'AFC Bournemouth', 'west ham': 'West Ham United',
  'newcastle utd': 'Newcastle United', 'leeds': 'Leeds United', 'sheffield utd': 'Sheffield United', 'sheffield wed': 'Sheffield Wednesday',
  'qpr': 'Queens Park Rangers', 'west brom': 'West Bromwich Albion', 'mk dons': 'Milton Keynes Dons', 'wycombe': 'Wycombe Wanderers',
  'fc bayern munchen': 'Bayern Munich', 'bayern munchen': 'Bayern Munich', 'atletico de madrid': 'Atlético Madrid', 'atletico madrid': 'Atlético Madrid',
  'paris sg': 'Paris Saint-Germain', 'paris saint germain': 'Paris Saint-Germain', 'milan': 'AC Milan', 'internazionale': 'Inter', 'inter milan': 'Inter',
  'sl benfica': 'Benfica', 'fc porto': 'Porto', 'sporting': 'Sporting CP', 'psv eindhoven': 'PSV', 'az alkmaar': 'AZ', 'olympique de marseille': 'Marseille',
  'olympique lyonnais': 'Lyon', 'as monaco': 'Monaco', 'losc lille': 'Lille', 'ogc nice': 'Nice', 'rc lens': 'Lens', 'stade rennais fc': 'Rennes',
  'borussia monchengladbach': 'Borussia Mönchengladbach', 'heart of midlothian': 'Hearts', 'rc celta': 'Celta Vigo', 'real betis balompie': 'Real Betis',
};

export function normClub(n: string): string {
  return n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9' ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['fc', 'afc', 'cf', 'the', 'football', 'club'].includes(w))
    .join(' ');
}

/** Map real club names to game club ids. */
export function matchClubs(s: GameState, names: string[]): Map<string, number> {
  const byNorm = new Map<string, number>();
  for (const c of s.clubs) byNorm.set(normClub(c.name), c.id);
  const out = new Map<string, number>();
  for (const n of names) {
    const alias = CLUB_ALIASES[n.toLowerCase()] ?? CLUB_ALIASES[normClub(n)];
    const id = byNorm.get(normClub(alias ?? n));
    if (id != null) out.set(n, id);
  }
  return out;
}

/** Replace generated squads with real ones where at least 16 real players match a club. */
export function applyRealPlayers(s: GameState, data: RealData, rng: Rng): { clubs: number; players: number } {
  const byClub = new Map<string, RealPlayer[]>();
  for (const p of data.players) {
    if (!POSITIONS.includes(p.pos) || p.attrs?.length !== ATTRS.length) continue;
    (byClub.get(p.club) ?? byClub.set(p.club, []).get(p.club)!).push(p);
  }
  const matched = matchClubs(s, [...byClub.keys()]);
  const shift = s.season - data.season; // age everyone if the save starts later than the data
  let clubs = 0;
  let players = 0;
  for (const [name, clubId] of matched) {
    const list = byClub.get(name)!;
    if (list.length < 16) continue;
    const club = s.clubs[clubId];
    for (const p of [...s.players.values()]) if (p.clubId === clubId) s.players.delete(p.id);
    const made: Player[] = list.map((r) => {
      const fam: Player['fam'] = { [r.pos]: 'N' };
      for (const a of r.alt) if (a !== r.pos) fam[a] = ADJACENT[r.pos]?.includes(a) ? 'N' : 'A';
      const p: Player = {
        id: s.nextPlayerId++, first: r.first, last: r.last, birthYear: r.birthYear - shift, nat: r.nat, real: true,
        clubId: null, academy: false, foot: r.foot, pos: r.pos, fam,
        attrs: r.attrs.map((v) => clamp(Math.round(v), 1, 99)), ovr: r.ovr, pot: Math.max(r.ovr, r.pot),
        personality: clamp(Math.round(rng.normal(55, 20)), 1, 100),
        dev: 'standard', devShift: 0,
        proneness: clamp(Math.round(rng.normal(35, 18)), 1, 100), consistency: clamp(Math.round(rng.normal(55, 18)), 1, 100),
        morale: 65, injury: 0, ban: 0, yellowAcc: 0, value: 0, contract: null, stats: emptyStats(), career: [],
      };
      recomputeOvr(p);
      p.pot = Math.max(p.ovr, r.pot);
      return p;
    });
    made.sort((a, b) => b.ovr - a.ovr);
    made.forEach((p, i) => {
      s.players.set(p.id, p);
      signContract(rng, p, clubId, club.div, s.season, roleForRank(i));
      p.value = playerValue(p.ovr, p.pot, s.season - p.birthYear, p.contract!.endSeason - s.season + 1);
    });
    clubs++;
    players += made.length;
  }
  invalidateSquads();
  return { clubs, players };
}
