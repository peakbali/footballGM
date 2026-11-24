import type { JSX } from 'preact';
import type { GameState } from '../core/state';
import type { InboxMessage } from '../core/types';

const HANDLERS = new Map<string, (s: GameState, m: InboxMessage) => JSX.Element>();
export function registerInboxAction(kind: string, fn: (s: GameState, m: InboxMessage) => JSX.Element) {
  HANDLERS.set(kind, fn);
}
export function inboxAction(s: GameState, m: InboxMessage) {
  const h = m.action ? HANDLERS.get(m.action.kind) : undefined;
  return h ? h(s, m) : null;
}
