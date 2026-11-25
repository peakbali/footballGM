/**
 * Which world the build ships (DESIGN 13.2y). The web version (GitHub Pages root) uses the real English pyramid;
 * the Google Play build (`npm run build:play`, served from /play/) uses the fictional one so no real club names,
 * kits or competitions ship in the store app. Vite replaces __REAL_WORLD__ at build time so the unused data
 * is dropped from the bundle; scripts and tests read VITE_WORLD from the environment (default real).
 */
declare const __REAL_WORLD__: boolean | undefined;
const fromEnv = () => (typeof process !== 'undefined' ? process.env?.VITE_WORLD : undefined) !== 'fictional';
export const REAL_WORLD: boolean = typeof __REAL_WORLD__ !== 'undefined' ? __REAL_WORLD__ : fromEnv();

export const CUP_NAME = REAL_WORLD ? 'FA Cup' : 'National Cup';
