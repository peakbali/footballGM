import { useEffect, useState } from 'preact/hooks';
import { startingLeagues, clubsInLeague } from '../../core/world';
import { SLOT_COUNT, type SlotInfo } from '../../storage/slots';
import { store } from '../store';
import { InstallApp } from '../installCard';

function ago(t: number): string {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export function StartScreen() {
  const [step, setStep] = useState<'menu' | 'league' | 'club'>('menu');
  const [league, setLeague] = useState<string | null>(null);
  const [slot, setSlot] = useState(1);
  const [slots, setSlots] = useState<(SlotInfo | null)[] | null>(null);
  const [sure, setSure] = useState(0); // slot waiting for a second tap on Delete
  const [busy, setBusy] = useState(false);
  const refresh = () => store.slots().then(setSlots).catch(() => setSlots(Array(SLOT_COUNT).fill(null)));
  useEffect(() => { void refresh(); }, []);

  if (busy) return <div class="start"><div class="logo">FOOTBALL<br />GM</div><div class="spinner">Building the pyramid...</div><div class="dim small">Creating about 1,100 clubs and 24,000 players.</div></div>;

  if (step === 'menu')
    return (
      <div class="start">
        <div class="logo">FOOTBALL<br />GM</div>
        <div class="dim">Take a club from the ninth tier of the football pyramid to the top. You are the general manager: money, players, staff and facilities.</div>
        <div class="slots">
          {(slots ?? Array(SLOT_COUNT).fill(undefined)).map((info: SlotInfo | null | undefined, i: number) => {
            const n = i + 1;
            if (info === undefined) return <div class="slot empty" key={n}><span class="slot-n">{n}</span><span class="dim small">Loading...</span></div>;
            if (!info) {
              return (
                <button class="slot empty" key={n} onClick={() => { setSlot(n); setStep('league'); }}>
                  <span class="slot-n">{n}</span>
                  <span class="grow"><span class="name">New career</span><span class="tiny dim"> · empty slot</span></span>
                  <span class="dim">＋</span>
                </button>
              );
            }
            return (
              <div class="slot used" key={n}>
                <button class="slot-main" onClick={() => store.load(n)}>
                  <span class="slot-n">{n}</span>
                  <span class="grow">
                    <span class="name">{info.club}</span>
                    <span class="tiny dim slot-line">{info.manager ? `${info.manager} · ` : ''}Div {info.div} · {info.season}/{String(info.season + 1).slice(2)} · Wk {info.week}</span>
                    <span class="tiny dim slot-line">Played {ago(info.updated)}</span>
                  </span>
                  <span class="slot-go">Continue ›</span>
                </button>
                <button class={`slot-del ${sure === n ? 'sure' : ''}`} onClick={() => { if (sure === n) { setSure(0); void store.deleteSave(n).then(refresh); } else setSure(n); }} aria-label={`Delete slot ${n}`}>{sure === n ? 'Sure?' : '🗑'}</button>
              </div>
            );
          })}
        </div>
        <div class="tiny dim">{SLOT_COUNT} save slots on this device. Each autosaves every week. Achievements are shared by all slots.</div>
        <InstallApp compact />
      </div>
    );

  if (step === 'league')
    return (
      <div class="start">
        <div class="between"><button class="back" onClick={() => setStep('menu')}>‹</button><div class="px gold">Pick a region</div><span /></div>
        <div class="dim small">You start in division 9 of a ten-division pyramid. Your region decides the leagues above and below you.</div>
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
          <div class="item" key={name} onClick={async () => { setBusy(true); await store.newGame(name, slot); }}>
            <div class="grow"><div class="name">{name}</div></div>
            <span class="dim">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
