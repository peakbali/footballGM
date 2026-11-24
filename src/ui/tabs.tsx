import type { JSX } from 'preact';

let transfers: (() => JSX.Element) | null = null;
let club: (() => JSX.Element) | null = null;
export function setTransfersScreen(fn: () => JSX.Element) { transfers = fn; }
export function setClubScreen(fn: () => JSX.Element) { club = fn; }
export function transfersScreen() { return transfers ? transfers() : null; }
export function clubScreen() { return club ? club() : null; }
