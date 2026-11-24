import { idbGet, idbPut } from './idb';

/** Achievements are global: one record for every save slot (id -> time unlocked). */
const KEY = 'achievements.v1';
export type Unlocked = Record<string, number>;

export async function loadUnlocked(): Promise<Unlocked> {
  try {
    return (await idbGet<Unlocked>(KEY)) ?? {};
  } catch {
    return {};
  }
}
export async function saveUnlocked(u: Unlocked): Promise<void> {
  await idbPut(KEY, u);
}
