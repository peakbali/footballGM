/**
 * Browser / phone back button support.
 *
 * The game is one page, so back would normally leave it (a blank page). We keep the browser history in step
 * with the screens: one entry for the hub, one more when a tab other than the hub is open, one more for every
 * overlay on top. Back then closes the top overlay, then goes to the hub, and never leaves the game.
 *
 * Chrome skips history entries that were added without a user gesture when the user presses back, so entries
 * are only added from a click/tap (the guard entry is added on the first pointerdown, never on load) and we
 * never push from inside a popstate handler.
 */
export interface HistoryLike {
  state: unknown;
  pushState(state: unknown, title: string): void;
  go(delta: number): void;
}
export interface WindowLike {
  history: HistoryLike;
  addEventListener(type: 'popstate' | 'pointerdown', fn: (e: { state?: unknown }) => void, opts?: unknown): void;
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
    if (l === 0) {
      // went back past the hub entry: stay in the game by returning to it
      h = 1;
      ignore++;
      win.history.go(1);
      return;
    }
    h = l;
    if (!model.active()) return;
    applying = true;
    try {
      while (model.depth() + 1 > h && model.depth() > 0) model.closeTop();
    } finally {
      applying = false;
    }
    sync();
  });

  return {
    sync,
    arm() {
      if (armed) return;
      armed = true;
      push(1);
      sync();
    },
    level: () => h,
  };
}

export function installBackNav(win: Window, model: NavModel, onChange: (fn: () => void) => void): BackController | null {
  if (!win.history?.pushState) return null;
  const c = createBackController(win as unknown as WindowLike, model);
  win.addEventListener('pointerdown', () => c.arm(), { capture: true, passive: true } as AddEventListenerOptions);
  onChange(() => c.sync());
  return c;
}
