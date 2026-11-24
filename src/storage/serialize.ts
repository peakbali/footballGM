import type { GameState } from '../core/state';
import type { Player } from '../core/types';

/**
 * Row model of a save. Each table maps a row id to a JSON string. The SQLite store writes these
 * into real tables (with a few indexed columns); only rows whose JSON changed are rewritten.
 */
export type Rows = Map<string, string>; // id -> json
export interface Snapshot {
  meta: Rows;
  club: Rows;
  player: Rows;
  league: Rows;
  fixture: Rows;
  report: Rows;
  history: Rows;
  inbox: Rows;
  news: Rows;
}
export const TABLES: (keyof Snapshot)[] = ['meta', 'club', 'player', 'league', 'fixture', 'report', 'history', 'inbox', 'news'];

/** Players whose rows might have changed since the last save. Systems add ids here. */
export const dirtyPlayers = new Set<number>();
let fullPlayerPass = true;
export function markAllDirty() {
  fullPlayerPass = true;
}

export function snapshot(s: GameState, prev?: Snapshot): Snapshot {
  const meta: Rows = new Map();
  const { clubs, players, leagues, fixtures, reports, history, inbox, news, ...rest } = s;
  meta.set('state', JSON.stringify(rest));

  const club: Rows = new Map(clubs.map((c) => [String(c.id), JSON.stringify(c)]));
  const player: Rows = new Map();
  const simClubs = new Set(leagues.flatMap((l) => l.clubIds));
  const reuse = prev && !fullPlayerPass;
  for (const p of players.values()) {
    const id = String(p.id);
    if (reuse && p.clubId != null && !simClubs.has(p.clubId) && !dirtyPlayers.has(p.id) && prev!.player.has(id)) {
      player.set(id, prev!.player.get(id)!);
    } else player.set(id, encodePlayer(p));
  }
  dirtyPlayers.clear();
  fullPlayerPass = false;
  const league: Rows = new Map(leagues.map((l) => [String(l.div), JSON.stringify(l)]));
  const fixture: Rows = new Map(fixtures.map((f) => [String(f.id), JSON.stringify(f)]));
  const report: Rows = new Map([...reports.entries()].map(([k, v]) => [String(k), JSON.stringify(v)]));
  const hist: Rows = new Map(history.map((h) => [`${h.season}:${h.clubId}`, JSON.stringify(h)]));
  const ib: Rows = new Map(inbox.map((m) => [String(m.id), JSON.stringify(m)]));
  const nw: Rows = new Map(news.map((n, i) => [String(i), JSON.stringify(n)]));
  return { meta, club, player, league, fixture, report, history: hist, inbox: ib, news: nw };
}

function encodePlayer(p: Player): string {
  return JSON.stringify(p);
}

export function restore(snap: Snapshot): GameState {
  const rest = JSON.parse(snap.meta.get('state')!);
  const clubs = [...snap.club.values()].map((j) => JSON.parse(j)).sort((a, b) => a.id - b.id);
  const players = new Map<number, Player>();
  for (const j of snap.player.values()) {
    const p = JSON.parse(j) as Player;
    players.set(p.id, p);
  }
  const leagues = [...snap.league.values()].map((j) => JSON.parse(j)).sort((a, b) => a.div - b.div);
  const fixtures = [...snap.fixture.values()].map((j) => JSON.parse(j)).sort((a, b) => a.id - b.id);
  const reports = new Map([...snap.report.entries()].map(([k, v]) => [+k, JSON.parse(v)]));
  const history = [...snap.history.values()].map((j) => JSON.parse(j));
  history.sort((a, b) => a.season - b.season || a.div - b.div || a.pos - b.pos);
  const inbox = [...snap.inbox.values()].map((j) => JSON.parse(j)).sort((a, b) => a.id - b.id);
  const news = [...snap.news.entries()].sort((a, b) => +a[0] - +b[0]).map(([, j]) => JSON.parse(j));
  return { ...rest, clubs, players, leagues, fixtures, reports, history, inbox, news } as GameState;
}

/** Compute row-level changes between two snapshots. */
export function diff(prev: Snapshot | undefined, next: Snapshot) {
  const out: { table: keyof Snapshot; upserts: [string, string][]; deletes: string[] }[] = [];
  for (const t of TABLES) {
    const a = prev?.[t];
    const b = next[t];
    const upserts: [string, string][] = [];
    const deletes: string[] = [];
    for (const [k, v] of b) if (!a || a.get(k) !== v) upserts.push([k, v]);
    if (a) for (const k of a.keys()) if (!b.has(k)) deletes.push(k);
    if (upserts.length || deletes.length) out.push({ table: t, upserts, deletes });
  }
  return out;
}
