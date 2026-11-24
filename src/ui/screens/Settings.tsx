import { Card, Overlay } from '../components';
import { store, useStore } from '../store';
import { InstallApp } from '../installCard';

export function SettingsScreen() {
  const st = useStore();
  const s = st.state!;
  return (
    <Overlay title="Settings">
      <Card title="Sound">
        <label class="between" style={{ padding: '6px 0' }}>
          <span>Mute all</span>
          <input type="checkbox" checked={s.settings.muted} onChange={(e) => { s.settings.muted = (e.target as HTMLInputElement).checked; store.bump(); void store.persist(); }} />
        </label>
        <label class="between" style={{ padding: '6px 0' }}>
          <span>Music</span>
          <input type="range" min={0} max={1} step={0.1} value={s.settings.music} onInput={(e) => { s.settings.music = +(e.target as HTMLInputElement).value; store.bump(); }} />
        </label>
        <label class="between" style={{ padding: '6px 0' }}>
          <span>Effects</span>
          <input type="range" min={0} max={1} step={0.1} value={s.settings.sfx} onInput={(e) => { s.settings.sfx = +(e.target as HTMLInputElement).value; store.bump(); }} />
        </label>
      </Card>
      <Card title="Install">
        <InstallApp />
      </Card>
      <Card title="Save">
        <div class="small dim" style={{ marginBottom: 10 }}>The game autosaves every week to this device (one save slot).</div>
        <button class="btn block" onClick={() => store.quit()}>Back to title screen</button>
        <div style={{ height: 10 }} />
        <button class="btn danger block" onClick={() => { if (confirm('Delete your career? This cannot be undone.')) void store.deleteSave(); }}>Delete career</button>
      </Card>
      <Card title="Credits">
        <div class="small dim">Club names and league membership: Wikipedia (CC BY-SA 4.0). {s.ext.realData ? `Real players imported locally from ${(s.ext.realData as { source: string; players: number }).source} (${(s.ext.realData as { players: number }).players} players); everyone else is generated.` : 'All players are generated unless you import your own data locally.'} Fonts: Silkscreen and Inter (OFL).</div>
      </Card>
    </Overlay>
  );
}
