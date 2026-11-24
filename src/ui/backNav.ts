/**
 * Browser / phone back button support.
 *
 * The game is one page, so back would normally leave it (a blank page). We keep the browser history in step
 * with the screens: one entry for the hub, one more when a tab other than the hub is open, one more for every
 * overlay on top. Back then closes the top overlay, then goes to the hub, and never leaves the game.
 *
 * Chrome skips history entries that were added without a user activation when the user presses back. On a phone
 * a touch `pointerdown` does NOT count as activation (only pointerup/click/keydown do), so the guard entry is
 * added on the first pointerup/click/keydown, never on load and never on pointerdown.
 *
 * It is also defensive about entries that did get skipped: every back press closes exactly one level (overlay,
 * then tab) whatever entry the browser landed on, and the guard entries are pushed again straight away, so back
 * can never leave the game for a blank page. Entries are re-checked when the page is shown again (bfcache, PWA
 * resume).
 */
export interface HistoryLike {
  state: unknown;
  pushState(state: unknown, title: string): void;
  go(delta: number): void;
}
export interface WindowLike {
  history: HistoryLike;
  addEventListener(type: 'popstate' | 'pointerup' | 'click' | 'keydown' | 'pageshow', fn: (e: { state?: unknown }) => void, opts?: unknown): void;
  document?: { visibilityState?: string; addEventListener(type: 'visibilitychange', fn: () => void): void };
}
export interface NavModel {
  /** overlays on top, plus one when a tab other than the hub is open */
  depth(): number;
  /** close the top overlay, or go to the hub tab when none is open */
  closeTop(): void;
  /** true once a game is loaded (nothing to close on the title screen) */
  active(): boolean;
}

export interface BackController {
  /** call after any navigation change */
  sync(): void;
  /** call from a user gesture */
  arm(): void;
  /** call when the page is shown again (pageshow, tab visible): re-reads the history and repairs the guard entries */
  resume(): void;
  /** current number of game entries above the page's first entry (for tests) */
  level(): number;
}

const levelOf = (st: unknown): number => (st && typeof st === 'object' && typeof (st as { fgm?: unknown }).fgm === 'number' ? (st as { fgm: number }).fgm : 0);

export function createBackController(win: WindowLike, model: NavModel): BackController {
  let h = levelOf(win.history.state); // game entries above the first page entry
  let armed = h > 0;
  let ignore = 0; // popstates we caused ourselves
  let applying = false;

  const push = (to: number) => {
    while (h < to) win.history.pushState({ fgm: ++h }, '');
  };

  const sync = () => {
    if (!armed || applying) return;
    const want = model.depth() + 1;
    if (want > h) push(want);
    else if (want < h) {
      const d = h - want;
      h = want;
      ignore++;
      win.history.go(-d);
    }
  };

  win.addEventListener('popstate', (e) => {
    if (ignore > 0) { ignore--; return; }
    const l = levelOf(e.state);
    const back = l < h;
    h = l;
    if (!model.active()) return;
    applying = true;
    try {
      // one level per back press, even if the browser skipped guard entries and landed further back
      if (back && model.depth() > 0) model.closeTop();
    } finally {
      applying = false;
    }
    if (!armed && h > 0) armed = true;
    if (armed) sync(); // pushes the guard entries again when we landed below the screen depth (e.g. on the page's first entry)
  });

  return {
    sync,
    arm() {
      if (armed) return;
      armed = true;
      push(1);
      sync();
    },
    resume() {
      h = levelOf(win.history.state);
      if (h > 0) armed = true;
      if (armed) sync();
    },
    level: () => h,
  };
}

export function installBackNav(win: Window, model: NavModel, onChange: (fn: () => void) => void): BackController | null {
  if (!win.history?.pushState) return null;
  const c = createBackController(win as unknown as WindowLike, model);
  const arm = () => c.arm();
  // events that count as a user activation (a touch pointerdown does not)
  for (const type of ['pointerup', 'click', 'keydown'] as const) win.addEventListener(type, arm, { capture: true, passive: true } as AddEventListenerOptions);
  win.addEventListener('pageshow', () => c.resume());
  win.document?.addEventListener('visibilitychange', () => { if (win.document?.visibilityState === 'visible') c.resume(); });
  onChange(() => c.sync());
  return c;
}
