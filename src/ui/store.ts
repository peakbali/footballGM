import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../core/state';
import { advanceWeek, type WeekResult } from '../core/season';
import { newGame as createWorld } from '../core/world';
import { SqliteSave } from '../storage/sqliteStore';
import { markAllDirty } from '../storage/serialize';
import type { RealData } from '../core/realData';

// Real player data exists only in local builds (npm run import:eafc); otherwise this is empty.
const REAL_FILES = import.meta.glob('../../data/private/real-players.json', { import: 'default' });
async function loadRealData(): Promise<RealData | undefined> {
  const f = Object.values(REAL_FILES)[0];
  if (!f) return undefined;
  try {
    return (await f()) as RealData;
  } catch {
    return undefined;
  }
}

type Listener = () => void;

class Store {
  state: GameState | null = null;
  save: SqliteSave | null = null;
  version = 0;
  busy = false;
  lastResult: WeekResult | null = null;
  saving: Promise<unknown> | null = null;
  private listeners = new Set<Listener>();

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  bump() {
    this.version++;
    for (const l of this.listeners) l();
  }

  async load(): Promise<boolean> {
    const r = await SqliteSave.load();
    if (!r) return false;
    this.state = r.state;
    this.save = r.store;
    this.bump();
    return true;
  }

  async newGame(clubName: string, seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
    this.busy = true;
    this.bump();
    await new Promise((r) => setTimeout(r, 30));
    const real = await loadRealData();
    const s = createWorld(seed, clubName, { real });
    await SqliteSave.wipe();
    markAllDirty();
    this.save = await SqliteSave.create();
    this.state = s;
    this.busy = false;
    await this.persist();
    this.bump();
  }

  async persist() {
    if (!this.state || !this.save) return;
    const run = async () => {
      try {
        await this.save!.save(this.state!);
      } catch (e) {
        console.error('save failed', e);
      }
    };
    this.saving = (this.saving ?? Promise.resolve()).then(run);
    await this.saving;
  }

  /** Advance week by week until something needs the user. */
  async continueGame(maxWeeks = 12): Promise<WeekResult | null> {
    if (!this.state || this.busy) return null;
    this.busy = true;
    this.bump();
    let res: WeekResult | null = null;
    try {
      for (let i = 0; i < maxWeeks; i++) {
        await new Promise((r) => setTimeout(r, 0));
        res = advanceWeek(this.state);
        if (res.stop) break;
      }
    } finally {
      this.busy = false;
      this.lastResult = res;
      this.bump();
    }
    void this.persist();
    return res;
  }

  async quit() {
    await this.saving;
    this.state = null;
    this.bump();
  }

  async deleteSave() {
    await SqliteSave.wipe();
    this.state = null;
    this.save = null;
    this.bump();
  }
}

export const store = new Store();

export function useStore(): Store {
  const [, set] = useState(0);
  useEffect(() => store.subscribe(() => set((v) => v + 1)), []);
  return store;
}

/** Simple navigation stack for overlays. */
export type Overlay =
  | { kind: 'player'; id: number }
  | { kind: 'match'; fixtureId: number }
  | { kind: 'club'; id: number }
  | { kind: 'inbox' }
  | { kind: 'settings' }
  | { kind: 'custom'; key: string; data?: unknown };

class Nav {
  tab = 'hub';
  stack: Overlay[] = [];
  push(o: Overlay) {
    this.stack.push(o);
    store.bump();
  }
  pop() {
    this.stack.pop();
    store.bump();
  }
  setTab(t: string) {
    this.tab = t;
    this.stack = [];
    store.bump();
  }
}
export const nav = new Nav();

export function money(v: number): string {
  const neg = v < 0;
  const a = Math.abs(v);
  let s: string;
  if (a >= 1e6) s = `£${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)}m`;
  else if (a >= 1e4) s = `£${Math.round(a / 1e3)}k`;
  else if (a >= 1e3) s = `£${(a / 1e3).toFixed(1)}k`;
  else s = `£${Math.round(a)}`;
  return neg ? `-${s}` : s;
}
