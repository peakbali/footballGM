import { useEffect, useState } from 'preact/hooks';
import { nav, store, useStore, money } from './store';
import { Badge, Icon } from './components';
import { StartScreen } from './screens/Start';
import { HubScreen } from './screens/Hub';
import { LeagueScreen } from './screens/League';
import { SquadScreen } from './screens/Squad';
import { PlayerScreen } from './screens/Player';
import { MatchScreen } from './screens/Match';
import { InboxScreen } from './screens/Inbox';
import { ClubViewScreen } from './screens/ClubView';
import { SettingsScreen } from './screens/Settings';
import { TransfersScreen } from './screens/Transfers';
import { ClubScreen } from './screens/Club';
import { customOverlay } from './overlays';
import { userClub } from '../core/state';
import { music } from './audio';

const TABS = [
  ['hub', 'Hub'],
  ['squad', 'Squad'],
  ['transfers', 'Transfers'],
  ['club', 'Club'],
  ['league', 'League'],
] as const;

export function App() {
  const st = useStore();
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    store.load().finally(() => setBooting(false));
  }, []);

  if (booting) return <div class="app"><div class="start"><div class="logo">FOOTBALL<br />GM</div><div class="spinner">Loading...</div></div></div>;
  if (!st.state) {
    music(null);
    return <div class="app"><StartScreen /></div>;
  }

  const s = st.state;
  const club = userClub(s);
  const top = nav.stack[nav.stack.length - 1];
  music(top?.kind === 'match' ? 'match' : 'hub');
  return (
    <div class="app">
      <div class="topbar">
        <Badge club={club} size={30} />
        <div style={{ minWidth: 0 }}>
          <div class="title">{club.short}</div>
          <div class="sub">{s.leagues.find((l) => l.clubIds.includes(club.id))!.short} · {s.season}/{String(s.season + 1).slice(2)} · Wk {s.week}</div>
        </div>
        <div class="spacer" />
        <div class={`money ${club.cash < 0 ? 'neg' : ''}`}>{money(club.cash)}</div>
        <button class="back" style={{ fontSize: 18, color: 'var(--dim)' }} onClick={() => nav.push({ kind: 'settings' })} aria-label="Settings">⚙</button>
      </div>
      <div class="content">
        {nav.tab === 'hub' && <HubScreen />}
        {nav.tab === 'squad' && <SquadScreen />}
        {nav.tab === 'transfers' && <TransfersScreen />}
        {nav.tab === 'club' && <ClubScreen />}
        {nav.tab === 'league' && <LeagueScreen />}
      </div>
      <div class="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} class={nav.tab === k ? 'on' : ''} onClick={() => nav.setTab(k)}>
            <Icon name={k} />
            {label}
          </button>
        ))}
      </div>
      {top?.kind === 'player' && <PlayerScreen id={top.id} />}
      {top?.kind === 'match' && <MatchScreen fixtureId={top.fixtureId} after={top.after} />}
      {top?.kind === 'inbox' && <InboxScreen />}
      {top?.kind === 'club' && <ClubViewScreen id={top.id} />}
      {top?.kind === 'settings' && <SettingsScreen />}
      {top?.kind === 'custom' && customOverlay(top.key, top.data)}
    </div>
  );
}
