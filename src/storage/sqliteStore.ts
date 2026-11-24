import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { diff, restore, snapshot, TABLES, markAllDirty, type Snapshot } from './serialize';
import type { GameState } from '../core/state';
import { idbGet, idbPut, idbDelete } from './idb';
import { clearInfo, slotKey, writeInfo } from './slots';

/**
 * Save slot backed by SQLite (sql.js). Each table has an id, a few indexed columns and the row
 * JSON. The database file is persisted to IndexedDB (works in browsers and Capacitor WebViews).
 */
let SQL: SqlJsStatic | null = null;

async function sql(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default;
  // In the single-file build the wasm is an inlined data: URI; decode it ourselves so no fetch is needed.
  const opts: Record<string, unknown> = { locateFile: () => wasmUrl };
  if (wasmUrl.startsWith('data:')) {
    const b64 = wasmUrl.slice(wasmUrl.indexOf(',') + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    opts.wasmBinary = bytes.buffer;
  }
  SQL = await initSqlJs(opts as unknown as Parameters<typeof initSqlJs>[0]);
  return SQL;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS club (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS player (id TEXT PRIMARY KEY, club_id INTEGER, ovr INTEGER, pos TEXT, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_player_club ON player(club_id);
CREATE TABLE IF NOT EXISTS league (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fixture (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS report (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inbox (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS news (id TEXT PRIMARY KEY, data TEXT NOT NULL);
`;

export class SqliteSave {
  private db: Database;
  private last?: Snapshot;
  readonly slot: number;
  private constructor(db: Database, slot: number) {
    this.slot = slot;
    this.db = db;
    db.exec(SCHEMA);
  }

  static async create(slot = 1): Promise<SqliteSave> {
    const S = await sql();
    return new SqliteSave(new S.Database(), slot);
  }

  static async load(slot = 1): Promise<{ store: SqliteSave; state: GameState } | null> {
    const bytes = await idbGet<Uint8Array>(slotKey(slot));
    if (!bytes) return null;
    const S = await sql();
    const store = new SqliteSave(new S.Database(bytes), slot);
    const snap = store.readAll();
    if (!snap.meta.get('state')) return null;
    store.last = snap;
    return { store, state: restore(snap) };
  }

  static async exists(slot = 1): Promise<boolean> {
    return !!(await idbGet<Uint8Array>(slotKey(slot)));
  }

  static async wipe(slot = 1): Promise<void> {
    await idbDelete(slotKey(slot));
    await clearInfo(slot);
    markAllDirty();
  }

  private readAll(): Snapshot {
    const snap = {} as Snapshot;
    for (const t of TABLES) {
      const rows = new Map<string, string>();
      const res = this.db.exec(`SELECT id, data FROM ${t}`);
      if (res[0]) for (const [id, data] of res[0].values) rows.set(String(id), String(data));
      snap[t] = rows;
    }
    return snap;
  }

  /** Write changed rows and persist the file. */
  async save(s: GameState): Promise<{ rows: number; bytes: number }> {
    const snap = snapshot(s, this.last);
    const changes = diff(this.last, snap);
    let rows = 0;
    this.db.exec('BEGIN');
    try {
      for (const ch of changes) {
        if (ch.table === 'player') {
          const st = this.db.prepare('INSERT OR REPLACE INTO player (id, club_id, ovr, pos, data) VALUES (?, ?, ?, ?, ?)');
          for (const [id, json] of ch.upserts) {
            const p = JSON.parse(json);
            st.run([id, p.clubId, p.ovr, p.pos, json]);
          }
          st.free();
        } else {
          const st = this.db.prepare(`INSERT OR REPLACE INTO ${ch.table} (id, data) VALUES (?, ?)`);
          for (const [id, json] of ch.upserts) st.run([id, json]);
          st.free();
        }
        if (ch.deletes.length) {
          const del = this.db.prepare(`DELETE FROM ${ch.table} WHERE id = ?`);
          for (const id of ch.deletes) del.run([id]);
          del.free();
        }
        rows += ch.upserts.length + ch.deletes.length;
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    this.last = snap;
    const bytes = this.db.export();
    await idbPut(slotKey(this.slot), bytes);
    await writeInfo(this.slot, s);
    return { rows, bytes: bytes.length };
  }
}
