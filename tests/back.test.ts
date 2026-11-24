import { describe, expect, it } from 'vitest';
import { createBackController, installBackNav, type WindowLike } from '../src/ui/backNav';

/**
 * A browser history that behaves like Chrome's: entries added without a user gesture are skipped
 * when the user goes back (the cause of the "blank page" on the phone), and traversal fires popstate.
 */
class FakeBrowser implements WindowLike {
  entries: { state: unknown; gesture: boolean }[] = [{ state: null, gesture: true }]; // the page itself
  idx = 0;
  gesture = false; // is a user gesture active right now
  popHandlers: ((e: { state?: unknown }) => void)[] = [];
  downHandlers: (() => void)[] = [];
  left = false; // true once the user went back out of the page's first entry (a blank page)
  history = {
    get state() { return null as unknown; },
    pushState: (state: unknown) => {
      this.entries.splice(this.idx + 1);
      this.entries.push({ state, gesture: this.gesture });
      this.idx++;
    },
    go: (d: number) => this.traverse(d, false),
  };
  constructor() {
    const self = this;
    Object.defineProperty(this.history, 'state', { get: () => self.entries[self.idx].state });
  }
  addEventListener(type: string, fn: (e: { state?: unknown }) => void) {
    if (type === 'popstate') this.popHandlers.push(fn);
    else this.downHandlers.push(fn as () => void);
  }
  /** user gesture (tap): runs fn with activation on */
  tap(fn: () => void) {
    this.gesture = true;
    this.downHandlers.forEach((f) => f());
    try { fn(); } finally { this.gesture = false; }
  }
  private traverse(d: number, user: boolean) {
    let i = this.idx;
    const step = Math.sign(d);
    for (let n = 0; n < Math.abs(d); n++) {
      i += step;
      // user back skips entries added without a gesture (but never the first entry)
      while (user && i > 0 && i < this.entries.length && !this.entries[i].gesture) i += step;
    }
    if (i < 0) { this.left = true; return; }
    if (i >= this.entries.length) return;
    this.idx = i;
    const state = this.entries[i].state;
    queueMicrotask(() => this.popHandlers.forEach((f) => f({ state })));
  }
  /** the user presses the browser/phone back button */
  async back() {
    const before = this.idx;
    this.traverse(-1, true);
    await Promise.resolve();
    await Promise.resolve();
    if (this.idx === 0 && before !== 0) this.left = true; // landed on the page's first entry from a game entry: still in-page, but the next back leaves
  }
}

// a model of the game's navigation, same rules as store.ts
function setup() {
  const b = new FakeBrowser();
  const model = { stack: [] as string[], tab: 'hub', loaded: true };
  const ctl = createBackController(b, {
    depth: () => model.stack.length + (model.tab !== 'hub' ? 1 : 0),
    closeTop: () => { if (model.stack.length) model.stack.pop(); else model.tab = 'hub'; ctl.sync(); },
    active: () => model.loaded,
  });
  // every tap first arms the controller (the pointerdown listener in installBackNav), then runs its click handler
  const tap = (fn: () => void) => b.tap(() => { ctl.arm(); fn(); });
  const ui = {
    push: (k: string) => tap(() => { model.stack.push(k); ctl.sync(); }),
    pop: () => tap(() => { model.stack.pop(); ctl.sync(); }), // the ‹ button or a Done button
    tab: (t: string) => tap(() => { model.tab = t; model.stack = []; ctl.sync(); }),
    tapOnly: () => tap(() => {}),
  };
  return { b, model, ctl, ui };
}

// every kind of screen that opens on top of a tab (see Overlay in store.ts)
const KINDS = ['player', 'match', 'club', 'inbox', 'settings', 'deal', 'cup', 'reel', 'renew', 'academy'];

describe('back button', () => {
  it('stays on the hub, never leaving the page', async () => {
    const { b, ui, model } = setup();
    ui.tapOnly(); // first touch arms the guard entry
    for (let i = 0; i < 4; i++) await b.back();
    expect(model.tab).toBe('hub');
    expect(b.idx).toBeGreaterThanOrEqual(1); // still on a game entry, not the page's first entry
  });

  for (const kind of KINDS) {
    it(`closes a ${kind} screen, then goes to the hub`, async () => {
      const { b, ui, model } = setup();
      ui.tapOnly();
      ui.tab('squad');
      ui.push(kind);
      expect(model.stack).toEqual([kind]);
      await b.back();
      expect(model.stack).toEqual([]);
      expect(model.tab).toBe('squad');
      await b.back();
      expect(model.tab).toBe('hub');
      await b.back();
      expect(model.tab).toBe('hub');
      expect(b.idx).toBeGreaterThanOrEqual(1);
    });

    it(`${kind} opened straight from the hub: one back returns to the hub`, async () => {
      const { b, ui, model } = setup();
      ui.push(kind); // very first tap is the one that opens it
      await b.back();
      expect(model.stack).toEqual([]);
      expect(model.tab).toBe('hub');
      await b.back();
      expect(b.idx).toBeGreaterThanOrEqual(1);
    });
  }

  it('unwinds a stack of screens one at a time', async () => {
    const { b, ui, model } = setup();
    ui.tapOnly();
    ui.push('inbox');
    ui.push('player');
    ui.push('deal');
    await b.back();
    expect(model.stack).toEqual(['inbox', 'player']);
    await b.back();
    await b.back();
    expect(model.stack).toEqual([]);
    expect(model.tab).toBe('hub');
    await b.back();
    expect(b.idx).toBeGreaterThanOrEqual(1);
  });

  it('keeps history in step when screens are closed by their own buttons', async () => {
    const { b, ui, model } = setup();
    ui.tapOnly();
    ui.push('inbox');
    ui.push('player');
    ui.pop(); // the ‹ on the player screen
    ui.pop(); // the ‹ on the inbox
    expect(b.idx).toBe(1);
    await b.back();
    expect(model.tab).toBe('hub');
    expect(b.idx).toBeGreaterThanOrEqual(1);
    // and screens still open and close normally afterwards
    ui.push('settings');
    await b.back();
    expect(model.stack).toEqual([]);
  });

  it('survives tab changes and a screen opened after a Continue', async () => {
    const { b, ui, model } = setup();
    ui.tapOnly();
    ui.tab('club');
    ui.tab('transfers');
    ui.push('match');
    ui.tab('hub'); // Continue on the report goes back to the hub
    expect(b.idx).toBe(1);
    ui.push('match');
    await b.back();
    expect(model.stack).toEqual([]);
    await b.back();
    expect(b.idx).toBeGreaterThanOrEqual(1);
  });
});

describe('history guard', () => {
  it('adds no history entry on load, only after the first tap (Chrome skips gesture-less entries)', () => {
    const { b, ui } = setup();
    expect(b.entries.length).toBe(1);
    ui.tapOnly();
    expect(b.entries.length).toBe(2);
    expect(b.entries.every((e) => e.gesture)).toBe(true);
  });
});

describe('defensive behaviour', () => {
  const MAIN_TABS = ['squad', 'transfers', 'club', 'league'];

  it('registers only activation events (never a touch pointerdown) and re-arms on page show', () => {
    const types: string[] = [];
    const doc: string[] = [];
    const win = {
      history: { state: null, pushState() {}, go() {} },
      addEventListener: (type: string) => { types.push(type); },
      document: { visibilityState: 'visible', addEventListener: (type: string) => { doc.push(type); } },
    };
    installBackNav(win as never, { depth: () => 0, closeTop() {}, active: () => true }, () => {});
    expect(types).not.toContain('pointerdown');
    expect(types).toEqual(expect.arrayContaining(['popstate', 'pointerup', 'click', 'keydown', 'pageshow']));
    expect(doc).toContain('visibilitychange');
  });

  for (const tab of MAIN_TABS) {
    it(`${tab}: back reaches the hub even when the browser skipped every guard entry`, async () => {
      const { b, ui, model, ctl } = setup();
      ui.tapOnly();
      // entries pushed outside any gesture (e.g. after an await) are skipped by Chrome
      model.tab = tab;
      ctl.sync();
      expect(b.entries.some((e) => !e.gesture)).toBe(true);
      await b.back(); // lands on the page's first entry, skipping the unguarded ones
      expect(model.tab).toBe('hub');
      expect(b.idx).toBeGreaterThanOrEqual(1); // the guard was pushed again
      await b.back();
      expect(model.tab).toBe('hub');
      expect(b.idx).toBeGreaterThanOrEqual(1);
    });

    it(`${tab}: overlay on top, skipped entries, still one level per back`, async () => {
      const { b, ui, model, ctl } = setup();
      ui.tapOnly();
      model.tab = tab; ctl.sync(); // gesture-less
      model.stack.push('player'); ctl.sync(); // gesture-less
      await b.back();
      expect(model.stack).toEqual([]);
      expect(model.tab).toBe(tab);
      await b.back();
      expect(model.tab).toBe('hub');
      expect(b.idx).toBeGreaterThanOrEqual(1);
    });
  }

  it('arming from a touch pointerdown (no activation) would be skipped; arming on pointerup is not', async () => {
    const b = new FakeBrowser();
    const model = { stack: [] as string[], tab: 'hub' };
    const ctl = createBackController(b, { depth: () => model.stack.length + (model.tab !== 'hub' ? 1 : 0), closeTop: () => { model.tab = 'hub'; ctl.sync(); }, active: () => true });
    ctl.arm(); // pointerdown on a phone: no activation yet
    expect(b.entries[1].gesture).toBe(false);
    const c2 = setup();
    c2.b.tap(() => c2.ctl.arm()); // pointerup / click
    expect(c2.b.entries[1].gesture).toBe(true);
  });

  it('resume() after bfcache or app resume restores the guard entry', async () => {
    const { b, ui, model, ctl } = setup();
    ui.tapOnly();
    ui.tab('club');
    b.idx = 0; // the browser restored the page on its first entry
    ctl.resume();
    expect(b.idx).toBeGreaterThanOrEqual(1);
    await b.back();
    expect(model.tab).toBe('hub');
  });
});
