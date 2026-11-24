import { useEffect, useState } from 'preact/hooks';
import { ACHIEVEMENTS, CATS, buildCtx, byId, type Achievement, type Tier } from '../../core/achievements';
import { Card, Overlay } from '../components';
import { registerOverlay } from '../overlays';
import { Pixel } from '../senderArt';
import { money, nav, store, useStore } from '../store';
import { sfx } from '../audio';

export const TIERS: Record<Tier, { label: string; color: string }> = {
  1: { label: 'Bronze', color: '#c98a4b' },
  2: { label: 'Silver', color: '#c4cde0' },
  3: { label: 'Gold', color: '#ffcc4d' },
  4: { label: 'Platinum', color: '#7fe0ff' },
};
const ICON: Record<string, string> = Object.fromEntries(CATS.map((c) => [c.key, c.icon]));

/** Pixel medal: the category icon on a tier-coloured plate, greyed out until earned. */
export function AchBadge({ a, got, size = 44 }: { a: Achievement; got: boolean; size?: number }) {
  const t = TIERS[a.tier];
  return (
    <span class={`abadge ${got ? 'got' : 'lock'}`} style={{ '--t': t.color, width: size, height: size } as never}>
      {got || !a.hidden ? <Pixel icon={ICON[a.cat] ?? 'cup'} color={got ? t.color : '#5b6694'} size={size - 14} /> : <span class="abadge-q">?</span>}
    </span>
  );
}

function fmtVal(a: Achievement, v: number): string {
  return a.desc.includes('£') ? money(v) : Math.round(v).toLocaleString();
}

function Row({ a, v, got }: { a: Achievement; v: number; got: boolean }) {
  const secret = a.hidden && !got;
  const pct = Math.max(0, Math.min(1, v / a.goal));
  return (
    <div class={`ach ${got ? 'got' : ''}`} style={{ '--t': TIERS[a.tier].color } as never}>
      <AchBadge a={a} got={got} />
      <div class="ach-main">
        <div class="ach-name">{secret ? '???' : a.name}<span class="ach-tier">{TIERS[a.tier].label}</span></div>
        <div class="tiny dim">{secret ? 'A hidden achievement. Play on to find it.' : a.desc}</div>
        {!got && !secret && a.goal > 1 && (
          <div class="ach-prog"><i style={{ width: `${Math.round(pct * 100)}%` }} /><span>{fmtVal(a, Math.min(v, a.goal))} / {fmtVal(a, a.goal)}</span></div>
        )}
      </div>
      {got && <span class="ach-check">✓</span>}
    </div>
  );
}

function AchievementsPage() {
  const st = useStore();
  const s = st.state!;
  const [f, setF] = useState<'all' | 'got' | 'todo'>('all');
  const ctx = buildCtx(s);
  const got = ACHIEVEMENTS.filter((x) => st.unlocked[x.id]).length;
  const byTier = ([1, 2, 3, 4] as Tier[]).map((t) => [t, ACHIEVEMENTS.filter((x) => x.tier === t && st.unlocked[x.id]).length, ACHIEVEMENTS.filter((x) => x.tier === t).length] as const);
  return (
    <Overlay title="Achievements" sub={`${got} of ${ACHIEVEMENTS.length} unlocked`}>
      <Card title="Your collection" art="trophy">
        <div class="ach-total"><i style={{ width: `${(got / ACHIEVEMENTS.length) * 100}%` }} /></div>
        <div class="ach-tiers">
          {byTier.map(([t, n, tot]) => <span key={t} style={{ color: TIERS[t].color }}>● {TIERS[t].label} {n}/{tot}</span>)}
        </div>
        <div class="tiny dim" style={{ marginTop: 6 }}>Achievements belong to you, not to a club or a save slot. Progress bars show the career you are playing now.</div>
      </Card>
      <div class="chips">
        {([['all', 'All'], ['got', 'Unlocked'], ['todo', 'Locked']] as const).map(([k, l]) => <button key={k} class={`chip ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{l}</button>)}
      </div>
      {CATS.map((c) => {
        const list = ACHIEVEMENTS.filter((x) => x.cat === c.key && (f === 'all' || (f === 'got') === !!st.unlocked[x.id]));
        if (!list.length) return null;
        const n = ACHIEVEMENTS.filter((x) => x.cat === c.key && st.unlocked[x.id]).length;
        const tot = ACHIEVEMENTS.filter((x) => x.cat === c.key).length;
        return (
          <div key={c.key} class="ach-sec">
            <div class="mail-sec-title">{c.label} · {n}/{tot}</div>
            {list.map((x) => <Row key={x.id} a={x} v={x.val(ctx)} got={!!st.unlocked[x.id]} />)}
          </div>
        );
      })}
    </Overlay>
  );
}
registerOverlay('achievements', () => <AchievementsPage />);

/** Banner that slides in when something unlocks. Several at once are shown one after another; it waits while a match report is open. */
export function AchievementToast() {
  const st = useStore();
  const top = nav.stack[nav.stack.length - 1];
  const id = st.toasts[0];
  const hold = !id || st.busy || top?.kind === 'match';
  useEffect(() => {
    if (hold) return;
    sfx('achieve');
    const t = setTimeout(() => { st.toasts.shift(); store.bump(); }, 4200);
    return () => clearTimeout(t);
  }, [id, hold]);
  if (hold) return null;
  const a = byId(id!);
  if (!a) { st.toasts.shift(); return null; }
  const more = st.toasts.length - 1;
  return (
    <div class="atoast" key={id} style={{ '--t': TIERS[a.tier].color } as never} onClick={() => { st.toasts.length = 0; nav.push({ kind: 'custom', key: 'achievements' }); }}>
      <AchBadge a={a} got size={46} />
      <div class="atoast-txt">
        <div class="tiny atoast-k">Achievement unlocked · {TIERS[a.tier].label}</div>
        <div class="atoast-name">{a.name}</div>
        <div class="tiny dim">{a.desc}</div>
      </div>
      {more > 0 && <span class="atoast-more">+{more}</span>}
    </div>
  );
}
