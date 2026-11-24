import { useEffect, useState } from 'preact/hooks';
import { startingLeagues, clubsInLeague } from '../../core/world';
import { SqliteSave } from '../../storage/sqliteStore';
import { store } from '../store';
import { InstallApp } from '../installCard';

export function StartScreen() {
  const [step, setStep] = useState<'menu' | 'league' | 'club'>('menu');
  const [league, setLeague] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    SqliteSave.exists().then(setHasSave).catch(() => setHasSave(false));
  }, []);

  if (busy) return <div class="start"><div class="logo">FOOTBALL<br />GM</div><div class="spinner">Building the pyramid...</div><div class="dim small">Creating about 1,100 clubs and 24,000 players.</div></div>;

  if (step === 'menu')
    return (
      <div class="start">
        <div class="logo">FOOTBALL<br />GM</div>
        <div class="dim">Take a club from the ninth tier of English football to the top. You are the general manager: money, players, staff and facilities.</div>
        {hasSave && <button class="btn primary block" onClick={() => store.load()}>Continue career</button>}
        <button class={`btn block ${hasSave ? '' : 'primary'}`} onClick={() => setStep('league')}>New career</button>
        {hasSave && <div class="tiny dim">Starting a new career replaces your saved game.</div>}
        <InstallApp compact />
      </div>
    );

  if (step === 'league')
    return (
      <div class="start">
        <div class="between"><button class="back" onClick={() => setStep('menu')}>‹</button><div class="px gold">Pick a region</div><span /></div>
        <div class="dim small">You start in division 9 (FA Step 5). Your region decides the leagues above and below you.</div>
        <div class="card list">
          {startingLeagues().map((l) => (
            <div class="item" key={l.key} onClick={() => { setLeague(l.key); setStep('club'); }}>
              <div class="grow"><div class="name">{l.name}</div><div class="tiny dim">{clubsInLeague(l.key).length} clubs</div></div>
              <span class="dim">›</span>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div class="start">
      <div class="between"><button class="back" onClick={() => setStep('league')}>‹</button><div class="px gold">Pick your club</div><span /></div>
      <div class="card list">
        {clubsInLeague(league!).sort().map((name) => (
          <div class="item" key={name} onClick={async () => { setBusy(true); await store.newGame(name); }}>
            <div class="grow"><div class="name">{name}</div></div>
            <span class="dim">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
