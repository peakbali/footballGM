import { Card, Overlay } from '../components';
import { useState } from 'preact/hooks';
import { nav, store, useStore } from '../store';
import { ACHIEVEMENTS } from '../../core/achievements';
import { InstallApp } from '../installCard';
import { billing } from '../billing';
import { PrivacyLink } from '../features/privacyLink';

export function SettingsScreen() {
  const st = useStore();
  const s = st.state!;
  const [sure, setSure] = useState(false);
  const got = ACHIEVEMENTS.filter((x) => st.unlocked[x.id]).length;
  return (
    <Overlay title="Settings">
      <Card title="Sound">
        <label class="between" style={{ padding: '6px 0' }}>
          <span>Mute all</span>
          <input type="checkbox" checked={s.settings.muted} onChange={(e) => { s.settings.muted = (e.target as HTMLInputElement).checked; store.bump(); void store.persist(); }} />
        </label>
        <label class="between" style={{ padding: '6px 0' }}>
          <span>Music <span class="tiny dim">lo-fi jazz</span></span>
          <input type="range" min={0} max={1} step={0.1} value={s.settings.music} onInput={(e) => { s.settings.music = +(e.target as HTMLInputElement).value; store.bump(); }} onChange={() => void store.persist()} />
        </label>
        <label class="between" style={{ padding: '6px 0' }}>
          <span>Effects</span>
          <input type="range" min={0} max={1} step={0.1} value={s.settings.sfx} onInput={(e) => { s.settings.sfx = +(e.target as HTMLInputElement).value; store.bump(); }} onChange={() => void store.persist()} />
        </label>
      </Card>
      <Card title="Club">
        <button class="btn block" onClick={() => nav.push({ kind: 'custom', key: 'clubEdit' })}>Edit club name, colours and crest ›</button>
      </Card>
      <Card title="Install">
        <InstallApp />
      </Card>
      <Card title="Full game">
        <div class="small dim" style={{ marginBottom: 10 }}>{billing.unlocked ? 'Unlocked. Every season is open in every save slot. Thank you!' : 'The first season of every career is free. A one-time purchase unlocks every season after it. No ads.'}</div>
        {!billing.unlocked && <button class="btn gold block" onClick={() => nav.push({ kind: 'custom', key: 'paywall' })}>Unlock full game ›</button>}
        {!billing.unlocked && billing.store && <><div style={{ height: 8 }} /><button class="btn block" onClick={() => void billing.restore()}>Restore purchase</button>{billing.error && <div class="tiny amber" style={{ marginTop: 6 }}>{billing.error}</div>}</>}
      </Card>
      <Card title="Achievements" art="trophy">
        <button class="btn block" onClick={() => nav.push({ kind: 'custom', key: 'achievements' })}>Achievements · {got}/{ACHIEVEMENTS.length} ›</button>
      </Card>
      <Card title={`Save · slot ${st.save?.slot ?? 1}`}>
        <div class="small dim" style={{ marginBottom: 10 }}>The game autosaves every week into this slot. The title screen lists all of your slots, so you can run several careers side by side.</div>
        <button class="btn block" onClick={() => store.quit()}>Switch slot / title screen</button>
        <div style={{ height: 10 }} />
        <button class="btn danger block" onClick={() => { if (sure) void store.deleteSave(); else setSure(true); }}>{sure ? 'Tap again to delete this career' : 'Delete this career'}</button>
      </Card>
      <Card title="Credits">
        <div class="small dim">All clubs, leagues, stadiums and players are fictional. Fonts: Silkscreen and Inter (OFL).</div>
        <PrivacyLink />
      </Card>
    </Overlay>
  );
}
