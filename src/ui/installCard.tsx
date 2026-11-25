import { useState } from 'preact/hooks';
import { promptInstall, useInstall } from './pwa';

/** Install-as-app button (Chrome/Android), or Add to Home Screen steps (iPhone/iPad Safari). Hidden once installed. */
export function InstallApp({ compact }: { compact?: boolean }) {
  const { canPrompt, installed, ios } = useInstall();
  const [help, setHelp] = useState(false);
  if (installed) return compact ? null : <div class="small dim">Installed. You are playing the app.</div>;
  if (canPrompt)
    return (
      <div>
        <button class="btn gold block" onClick={() => void promptInstall()}>⬇ Install app</button>
        {!compact && <div class="tiny dim" style={{ marginTop: 6 }}>Adds FootballGM to your home screen. It plays offline and keeps your save on this device.</div>}
      </div>
    );
  if (ios)
    return (
      <div>
        <button class="btn gold block" onClick={() => setHelp(!help)}>⬇ Install app</button>
        {help && <div class="small" style={{ marginTop: 8 }}>In Safari tap <b>Share</b> (the square with an arrow), then <b>Add to Home Screen</b>. Open it from your home screen to play full screen and offline.</div>}
      </div>
    );
  if (compact) return null;
  return <div class="small dim">To install, open this page in Chrome, Edge or Safari and use the browser menu: <b>Install app</b> or <b>Add to Home Screen</b>.</div>;
}
