import { SwipePages } from '../swipe';
import { useState } from 'preact/hooks';
import { POSITIONS } from '../../core/data/positions';
import { isWindowOpen, CAL, type GameState } from '../../core/state';
import { coverage, isInterested, scoutAccuracy } from '../../core/systems/scouting';
import { staffCap } from '../../core/systems/staff';
import { askingWage } from '../../core/systems/contracts';
import type { Player } from '../../core/types';
import { Badge, Card, Hex, PosPill } from '../components';
import { money, nav, store, useStore } from '../store';
import { knowledge } from '../playerExtras';
import { setTransfersScreen } from '../tabs';
import { Stepper, niceStep } from './widgets';
import { Portrait } from '../portrait';
import { RoleTag } from './clubTab';

export function KnownRow({ s, p }: { s: GameState; p: Player }) {
  const k = knowledge(s, p);
  const club = p.clubId != null ? s.clubs[p.clubId] : null;
  return (
    <div class="item" onClick={() => nav.push({ kind: 'player', id: p.id })}>
      <Portrait p={p} />
      <div class="grow">
        <div class="name">{p.first[0]}. {p.last} {s.scouting.starred.includes(p.id) ? <span class="gold">★</span> : ''}</div>
        <div class="tiny dim row" style={{ gap: 6 }}>
          <PosPill pos={p.pos} /> {s.season - p.birthYear}y · POT {k.pot ?? '?'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }} class="tiny">
        {club ? <div class="row" style={{ gap: 4, justifyContent: 'flex-end' }}><Badge club={club} size={14} /><span class="dim">{club.country ?? `D${club.div}`}</span></div> : <div class="green">Free</div>}
        <div class="dim">{money(p.value)}</div>
      </div>
      <Hex value={k.ovr} color={k.ovr != null ? undefined : '#4a5590'} />
    </div>
  );
}

function Offers({ s }: { s: GameState }) {
  const mine = s.offers.filter((o) => o.buyer === s.userClubId && (o.status === 'countered' || o.status === 'accepted') && o.season === s.season && s.week - o.week <= 3);
  const incoming = s.inbox.filter((m) => m.action?.kind === 'offer_in' && !m.resolved);
  return (
    <>
      <Card title="Offers for your players">
        {incoming.length === 0 && <div class="empty">No pending offers. Transfer-list players to attract bids.</div>}
        {incoming.map((m) => <div class="item" key={m.id} onClick={() => nav.push({ kind: 'inbox' })}><div class="grow"><div class="name">{m.title}</div><div class="tiny dim">{m.body}</div></div><span class="gold">›</span></div>)}
      </Card>
      <Card title="Your open bids">
        {mine.length === 0 && <div class="empty">No open bids.</div>}
        {mine.map((o) => {
          const p = s.players.get(o.pid);
          if (!p) return null;
          return <div class="item" key={o.id} onClick={() => nav.push({ kind: 'custom', key: 'deal', data: p.id })}><div class="grow"><div class="name">{p.first} {p.last}</div><div class="tiny dim">{o.status === 'countered' ? `Countered at ${money(o.counterFee!)}` : 'Fee agreed, agree personal terms'}</div></div><span class="gold">›</span></div>;
        })}
      </Card>
      <Card title="Your listed players">
        {[...s.players.values()].filter((p) => p.clubId === s.userClubId && (p.listed || p.loanListed)).map((p) => <KnownRow key={p.id} s={s} p={p} />)}
      </Card>
    </>
  );
}

function Scouts({ s }: { s: GameState }) {
  const scouts = s.staff.filter((x) => x.role === 'scout');
  const cap = staffCap(s, 'scout');
  return (
    <>
      {scouts.map((st) => {
        const a = (s.scouting.assignments[st.id] ??= { pos: 'ANY', minAge: 16, maxAge: 32, maxFee: 10000, maxWage: 200 });
        const lvl = Math.min(st.level, cap);
        const acc = scoutAccuracy(lvl);
        return (
          <Card key={st.id} title={<span><RoleTag role="scout" />{`${st.first} ${st.last} · level ${lvl}${st.level > cap ? ` (capped from ${st.level})` : ''}`}</span>}>
            <div class="tiny dim" style={{ marginBottom: 8 }}>Covers your division ±{coverage(lvl)} · reads the potential of about {Math.round(acc.potChance * 100)}% of players · a shortlist every 2 weeks, only of players open to joining you</div>
            <div class="small dim">Position</div>
            <div class="chips">{['ANY', ...POSITIONS].map((pos) => <button key={pos} class={`chip ${a.pos === pos ? 'on' : ''}`} onClick={() => { a.pos = pos; store.bump(); }}>{pos}</button>)}</div>
            <div class="between" style={{ marginBottom: 6 }}><span class="small">Min age</span><Stepper value={a.minAge} onChange={(v) => { a.minAge = v; store.bump(); }} step={1} min={15} max={a.maxAge} fmt={(v) => `${v}`} /></div>
            <div class="between" style={{ marginBottom: 6 }}><span class="small">Max age</span><Stepper value={a.maxAge} onChange={(v) => { a.maxAge = v; store.bump(); }} step={1} min={a.minAge} max={40} fmt={(v) => `${v}`} /></div>
            <div class="between" style={{ marginBottom: 6 }}><span class="small">Max fee</span><Stepper value={a.maxFee} onChange={(v) => { a.maxFee = v; store.bump(); }} step={niceStep(a.maxFee || 1000)} /></div>
            <div class="between"><span class="small">Max wage</span><Stepper value={a.maxWage} onChange={(v) => { a.maxWage = v; store.bump(); }} step={niceStep(a.maxWage || 100)} /></div>
          </Card>
        );
      })}
      {scouts.length === 0 && <Card><div class="empty">You have no scouts. Hire one in the Club tab.</div></Card>}
    </>
  );
}

function FreeAgents({ s }: { s: GameState }) {
  const [pos, setPos] = useState('ANY');
  const userDiv = s.clubs[s.userClubId].div;
  const list = [...s.players.values()]
    .filter((p) => p.clubId == null && !p.retired && (pos === 'ANY' || p.pos === pos))
    .filter((p) => askingWage(s, p, s.userClubId) < 1e9)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 40);
  return (
    <Card title="Free agents · sign any time">
      <div class="chips">{['ANY', ...POSITIONS].map((x) => <button key={x} class={`chip ${pos === x ? 'on' : ''}`} onClick={() => setPos(x)}>{x}</button>)}</div>
      {list.map((p) => <KnownRow key={p.id} s={s} p={p} />)}
      <div class="tiny dim">Showing the best 40 by your staff's judgement. Division {userDiv} wages apply.</div>
    </Card>
  );
}

function Market({ s }: { s: GameState }) {
  const list = s.transfers.filter((t) => t.season >= s.season - 1).slice(-60).reverse();
  const userDiv = s.clubs[s.userClubId].div;
  const notable = list.filter((t) => t.to === s.userClubId || t.from === s.userClubId || (t.to != null && (s.clubs[t.to].div === userDiv || s.clubs[t.to].div === 1)));
  return (
    <>
      <Card title="Transfer news">
        {notable.length === 0 && <div class="empty">Quiet so far.</div>}
        {notable.slice(0, 30).map((t, i) => (
          <div class="item" key={i} onClick={() => s.players.has(t.pid) && nav.push({ kind: 'player', id: t.pid })}>
            <div class="grow">
              <div class="name">{t.name}</div>
              <div class="tiny dim">{t.from != null ? s.clubs[t.from].short : 'Free'} → {t.to != null ? s.clubs[t.to].short : 'released'} · {t.type === 'permanent' ? money(t.fee) : t.type}</div>
            </div>
            <span class="tiny dim">wk {t.week}</span>
          </div>
        ))}
      </Card>
      <Card title="News">
        {s.news.slice(-10).reverse().map((n, i) => <div key={i} class="small" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>{n.text}</div>)}
      </Card>
    </>
  );
}

const SEGS = ['scouted', 'shortlist', 'free', 'offers', 'scouts', 'news'] as const;
function TransfersTab() {
  const s = useStore().state!;
  const [seg, setSeg] = useState<(typeof SEGS)[number]>('scouted');
  const w = isWindowOpen(s.week);
  const incoming = s.inbox.filter((m) => m.action?.kind === 'offer_in' && !m.resolved).length;
  return (
    <div>
      <div class={`card small ${w ? 'green' : 'dim'}`} style={{ padding: 8 }}>
        {w ? `${w === 'summer' ? 'Summer' : 'January'} window open${w === 'summer' && s.week <= CAL.summerWindowEnd ? ` · closes week ${CAL.summerWindowEnd}` : w === 'winter' ? ` · closes week ${CAL.winterWindow[1]}` : ''}` : 'Window closed: free agents and loans only'}
      </div>
      <div class="chips" data-seg-bar>
        {([['scouted', 'Scouted'], ['shortlist', '★ List'], ['free', 'Free agents'], ['offers', `Offers${incoming ? ` (${incoming})` : ''}`], ['scouts', 'Scouts'], ['news', 'News']] as const).map(([k, l]) => (
          <button key={k} class={`chip ${seg === k ? 'on' : ''}`} onClick={() => setSeg(k)}>{l}</button>
        ))}
      </div>
      <SwipePages keys={SEGS} value={seg} onChange={setSeg}>
      {seg === 'scouted' && (
        <Card title="Scout recommendations">
          {s.scouting.shortlist.filter((id) => s.players.has(id) && s.players.get(id)!.clubId !== s.userClubId && isInterested(s, s.players.get(id)!)).map((id) => <KnownRow key={id} s={s} p={s.players.get(id)!} />)}
          {s.scouting.shortlist.length === 0 && <div class="empty">Your scouts deliver a shortlist every two weeks. Set their targets under Scouts.</div>}
        </Card>
      )}
      {seg === 'shortlist' && (
        <Card title="Your shortlist">
          {s.scouting.starred.filter((id) => s.players.has(id)).map((id) => <KnownRow key={id} s={s} p={s.players.get(id)!} />)}
          {s.scouting.starred.length === 0 && <div class="empty">Star players to keep an eye on them.</div>}
        </Card>
      )}
      {seg === 'free' && <FreeAgents s={s} />}
      {seg === 'offers' && <Offers s={s} />}
      {seg === 'scouts' && <Scouts s={s} />}
      {seg === 'news' && <Market s={s} />}
      </SwipePages>
    </div>
  );
}

setTransfersScreen(() => <TransfersTab />);
