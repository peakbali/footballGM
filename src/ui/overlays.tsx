import type { JSX } from 'preact';

/** Registry for feature overlays (keeps App small as systems are added). */
const REG = new Map<string, (data: unknown) => JSX.Element>();
export function registerOverlay(key: string, render: (data: unknown) => JSX.Element) {
  REG.set(key, render);
}
export function customOverlay(key: string, data: unknown) {
  const r = REG.get(key);
  return r ? r(data) : null;
}
