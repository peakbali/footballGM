import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

/**
 * Swipe left/right anywhere on the page area to move between the sub-pages of a screen (Transfers, Club, League...). Wraps the page
 * content only; the chip/segment bar stays outside and keeps working by tap. Vertical scrolling is left to
 * the browser (touch-action: pan-y), swipes that start inside a horizontally scrollable row are ignored,
 * and so are swipes from the very edge of the screen (the phone's own back gesture).
 * Mark the bar with `data-seg-bar` so the active chip is scrolled into view.
 * Pages can nest (Squad > Squad list > Contract/Form/Attributes): the innermost pager under the finger moves first,
 * and once it is on its first/last page the swipe goes to the pager around it.
 */
const EDGE = 24;
const hScrollable = (el: Element | null, stop: Element | null): boolean => {
  for (; el && el !== stop; el = el.parentElement) {
    const ox = getComputedStyle(el).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2) return true;
  }
  return false;
};

/** Whether the pager `me` should take a horizontal swipe in direction `dx` that started on `target`. */
function owns(me: HTMLElement, target: Element | null, dx: number): boolean {
  const inner = target?.closest?.('.swipe') as HTMLElement | null;
  if (!inner || !me.contains(inner)) return !me.parentElement?.closest('.swipe'); // outside every pager: the outermost takes it
  for (let el: HTMLElement | null = inner; el && el !== me; el = el.parentElement?.closest('.swipe') as HTMLElement | null) {
    const i = Number(el.dataset.i), n = Number(el.dataset.n);
    if (dx < 0 ? i < n - 1 : i > 0) return false; // a pager inside can still move that way
  }
  return true;
}

export function SwipePages<K extends string>({ keys, value, onChange, children }: { keys: readonly K[]; value: K; onChange: (k: K) => void; children: ComponentChildren }) {
  const root = useRef<HTMLDivElement>(null);
  const prev = useRef<K>(value);
  const dir = useRef('');
  const idx = keys.indexOf(value);
  if (prev.current !== value) {
    dir.current = keys.indexOf(prev.current) < idx ? 'from-right' : 'from-left';
    prev.current = value;
  }
  // the handlers live on the whole page area (the scrolling .content), not just on the cards, so a swipe works from anywhere
  const live = useRef({ keys, idx, onChange });
  live.current = { keys, idx, onChange };

  // keep the active chip in view
  useEffect(() => {
    root.current?.parentElement?.querySelectorAll<HTMLElement>('[data-seg-bar]').forEach((bar) => {
      const on = bar.querySelector('.on') as HTMLElement | null;
      if (on) bar.scrollTo({ left: on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
    });
  }, [value]);

  useEffect(() => {
    const area = (root.current?.closest('.content') as HTMLElement | null) ?? root.current;
    if (!area) return;
    const s = { x: 0, y: 0, t: 0, ok: false, lock: '' as '' | 'h' | 'v', target: null as Element | null };
    const pane = () => root.current?.firstElementChild as HTMLElement | null;
    const reset = () => { const p = pane(); if (p) { p.style.transition = 'transform .15s'; p.style.transform = ''; } };
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      s.x = t.clientX; s.y = t.clientY; s.t = Date.now(); s.lock = ''; s.target = e.target as Element;
      s.ok = e.touches.length === 1 && t.clientX > EDGE && t.clientX < window.innerWidth - EDGE && !hScrollable(e.target as Element, area);
    };
    const move = (e: TouchEvent) => {
      if (!s.ok) return;
      const t = e.touches[0];
      const dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (!s.lock && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) s.lock = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'h' : 'v';
      const p = pane();
      if (s.lock === 'h' && p && root.current && owns(root.current, s.target, dx)) {
        const { keys: k, idx: i } = live.current;
        const has = dx < 0 ? i < k.length - 1 : i > 0;
        p.style.transition = 'none';
        p.style.transform = `translateX(${dx * (has ? 0.35 : 0.1)}px)`;
      }
    };
    const end = (e: TouchEvent) => {
      reset();
      if (!s.ok || s.lock !== 'h') return;
      const dx = e.changedTouches[0].clientX - s.x;
      const quick = Date.now() - s.t < 250;
      if (Math.abs(dx) > (quick ? 35 : 70) && root.current && owns(root.current, s.target, dx)) {
        const { keys: k, idx: i, onChange: change } = live.current;
        const n = dx < 0 ? i + 1 : i - 1;
        if (n >= 0 && n < k.length) change(k[n]);
      }
    };
    const prevTA = area.style.touchAction;
    area.style.touchAction = 'pan-y';
    area.addEventListener('touchstart', start, { passive: true });
    area.addEventListener('touchmove', move, { passive: true });
    area.addEventListener('touchend', end, { passive: true });
    area.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      area.style.touchAction = prevTA;
      area.removeEventListener('touchstart', start);
      area.removeEventListener('touchmove', move);
      area.removeEventListener('touchend', end);
      area.removeEventListener('touchcancel', reset);
    };
  }, []);

  return (
    <div ref={root} class="swipe" data-i={idx} data-n={keys.length}>
      <div key={value} class={`swipe-pane ${dir.current}`}>{children}</div>
    </div>
  );
}
