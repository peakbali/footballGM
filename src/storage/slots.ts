import { idbGet, idbPut } from './idb';
import type { GameState } from '../core/state';

/** Save slots. The info shown on the slot cards lives in its own small record so listing never opens a database. */
export const SLOT_COUNT = 5;
export const slotKey = (n: number) => `slot${n}.sqlite`;
const META_KEY = 'slots.meta';
const LAST_KEY = 'slots.last';

export interface SlotInfo {
  club: string;
  div: number;
  league: string;
  season: number;
  week: number;
  updated: number;
}

type Meta = Record<number, SlotInfo>;

async function readMeta(): Promise<Meta> {
  return (await idbGet<Meta>(META_KEY)) ?? {};
}

export function infoOf(s: GameState): SlotInfo {
  const club = s.clubs[s.userClubId];
  return {
    club: club.name,
    div: club.div,
    league: s.leagues.find((l) => l.clubIds.includes(club.id))?.short ?? '',
    season: s.season,
    week: s.week,
    updated: Date.now(),
  };
}

export async function writeInfo(n: number, s: GameState): Promise<void> {
  const m = await readMeta();
  m[n] = infoOf(s);
  await idbPut(META_KEY, m);
  await idbPut(LAST_KEY, n);
}

export async function clearInfo(n: number): Promise<void> {
  const m = await readMeta();
  delete m[n];
  await idbPut(META_KEY, m);
  if ((await idbGet<number>(LAST_KEY)) === n) await idbPut(LAST_KEY, 0);
}

export async function lastSlot(): Promise<number> {
  return (await idbGet<number>(LAST_KEY)) ?? 0;
}

/** Slot 1..N with its info, or null when empty. A save from before slots existed (slot 1, no info) gets its info filled in by `fill`. */
export async function listSlots(fill: (n: number) => Promise<SlotInfo | null>): Promise<(SlotInfo | null)[]> {
  const m = await readMeta();
  const out: (SlotInfo | null)[] = [];
  let dirty = false;
  for (let n = 1; n <= SLOT_COUNT; n++) {
    if (m[n]) { out.push(m[n]); continue; }
    const has = !!(await idbGet(slotKey(n)));
    const info = has ? await fill(n) : null;
    if (info) { m[n] = info; dirty = true; }
    out.push(info);
  }
  if (dirty) {
    await idbPut(META_KEY, m);
    if (!(await idbGet<number>(LAST_KEY))) await idbPut(LAST_KEY, out.findIndex((x) => x) + 1);
  }
  return out;
}
