/**
 * Recorded result sounds from Khen (DESIGN 13.5c): a police whistle for a win, a thinking "hmm"
 * for a draw and a disappointed crowd for a loss.
 * The lo-fi background track (DESIGN 13.5d) lives here too. They are third-party clips, so only the web build loads this module; the Google Play build keeps the synthesized
 * sounds until the rights are confirmed. Both are trimmed, mono, peak-normalized to -3 dBFS and played at CLIP_GAIN.
 */
import win from './sfx/win-whistle.mp3';
import draw from './sfx/draw-hmm.mp3';
import loss from './sfx/loss-crowd.mp3';

export { default as MUSIC_URL } from './music/lofi-loop.mp3';

export const CLIP_URLS = { cheer: win, hmm: draw, boo: loss } as const;
