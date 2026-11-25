import { APP_NAME, STORE_NAME } from '../../core/edition';
import { useEffect, useRef, useState } from 'preact/hooks';
import { START_SEASON } from '../../core/state';
import { ordinal } from '../../core/season';
import { Badge, Overlay } from '../components';
import { registerOverlay } from '../overlays';
import { billing, PLAY_URL } from '../billing';
import { nav, store, useStore } from '../store';
import { sfx } from '../audio';

/** Full game unlock (docs/PLAY_STORE.md): shown when a gated career tries to start season two. */
function useBilling() {
  const [, set] = useState(0);
  useEffect(() => billing.subscribe(() => set((v) => v + 1)), []);
  useEffect(() => { void billing.init(); }, []);
  return billing;
}

const PERKS: [string, string][] = [
  ['∞', 'Every season after this one, for every save slot'],
  ['▲', 'Climb all ten divisions to the Premier Division'],
  ['★', 'Academy stars, facilities, cup runs and 100 achievements'],
  ['✓', 'One payment. No ads, no subscriptions, no energy timers'],
];

function Paywall() {
  const st = useStore();
  const b = useBilling();
  const s = st.state;
  const club = s ? s.clubs[s.userClubId] : null;
  const rec = s?.history.find((h) => h.season === START_SEASON && h.clubId === s.userClubId);
  const lg = rec && s ? s.leagues[rec.div - 1] : null;

  const was = useRef(b.unlocked);
  useEffect(() => {
    if (b.unlocked && !was.current) sfx('achieve');
    was.current = b.unlocked;
  }, [b.unlocked]);

  if (b.unlocked)
    return (
      <Overlay title="Full game">
        <div class="paywall">
          <div class="pw-stamp">UNLOCKED</div>
          <div class="pw-title">Thanks for supporting {APP_NAME}!</div>
          <div class="dim small" style={{ textAlign: 'center' }}>Every season is open now. Good luck with the climb.</div>
          <button class="btn gold block" onClick={() => nav.pop()}>Back to the club ›</button>
        </div>
      </Overlay>
    );

  return (
    <Overlay title="Full game" sub="Season 1 complete">
      <div class="paywall">
        {club && (
          <div class="pw-club">
            <Badge club={club} size={56} />
            <div>
              <div class="pw-title">What a first season.</div>
              {rec && lg && <div class="small dim">{club.short} finished {ordinal(rec.pos)} in the {lg.name} with {rec.pts} points.</div>}
            </div>
          </div>
        )}
        <div class="pw-lead">The pyramid is waiting. Unlock the full game to keep building your club.</div>
        <div class="pw-perks">
          {PERKS.map(([i, t]) => <div class="pw-perk" key={t}><span class="pw-ic">{i}</span><span>{t}</span></div>)}
        </div>
        {b.store ? (
          <>
            <button class="btn gold block pw-buy" disabled={b.busy} onClick={() => void b.buy()}>
              {b.busy ? <span class="spinner">Opening Google Play...</span> : `Unlock full game${b.price ? ` · ${b.price}` : ''}`}
            </button>
            <button class="linkbtn pw-restore" onClick={() => void b.restore()}>Restore purchase</button>
          </>
        ) : (
          <>
            <a class="btn gold block pw-buy" href={PLAY_URL} target="_blank" rel="noopener">Get {STORE_NAME} on Google Play ›</a>
            <div class="tiny dim" style={{ textAlign: 'center' }}>The full game is a one-time purchase in the Android app. This web version plays the first season of each career for free.</div>
            {import.meta.env.DEV && <button class="btn block" onClick={() => void b.buy()}>Simulate purchase (dev build)</button>}
          </>
        )}
        {b.error && <div class="pw-err small">{b.error}</div>}
        <div class="tiny dim" style={{ textAlign: 'center' }}>Your save stays on this device. You can keep managing your squad, and play on from here once the game is unlocked.</div>
        <button class="btn block" onClick={() => { nav.pop(); store.bump(); }}>Not now</button>
      </div>
    </Overlay>
  );
}

registerOverlay('paywall', () => <Paywall />);
