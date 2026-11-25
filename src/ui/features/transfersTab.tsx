import { SwipePages } from '../swipe';
import { useState } from 'preact/hooks';
import { POSITIONS, type Position } from '../../core/data/positions';
import { isWindowOpen, CAL, type GameState } from '../../core/state';
import { coverage, formationPositions, isInterested, scoutAccuracy, SCOUTED_MAX } from '../../core/systems/scouting';
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
import { PlayerTable, useSort } from './playerTable';

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
  const fp = formationPositions(s);
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
            <div class="small dim">Position <span class="tiny">(only positions in your {s.clubs[s.userClubId].formation})</span></div>
            <div class="chips">{['ANY', ...formationPositions(s)].map((pos) => <button key={pos} class={`chip ${(fp.includes(a.pos as Position) ? a.pos : 'ANY') === pos ? 'on' : ''}`} onClick={() => { a.pos = pos; store.bump(); }}>{pos}</button>)}</div>
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
type Seg = (typeof SEGS)[number];
const LIST_SEGS: readonly Seg[] = ['scouted', 'shortlist', 'free'];
/** One swipe page per segment, and for the player lists one per position inside it. */
const posKeys = (seg: Seg, fp: Position[]): string[] => (seg === 'scouted' ? ['ANY', ...fp] : ['ANY', ...POSITIONS]);
const pageKey = (seg: Seg, pos: string) => (LIST_SEGS.includes(seg) ? `${seg}:${pos}` : seg);

function listFor(s: GameState, seg: Seg, fp: Position[]): Player[] {
  if (seg === 'scouted') return s.scouting.shortlist.slice(0, SCOUTED_MAX).map((id) => s.players.get(id)).filter((p): p is Player => !!p && p.clubId !== s.userClubId && isInterested(s, p) && fp.includes(p.pos));
  if (seg === 'shortlist') return s.scouting.starred.map((id) => s.players.get(id)).filter((p): p is Player => !!p);
  // only free agents who would consider joining you (same check as scout recommendations)
  return [...s.players.values()].filter((p) => p.clubId == null && !p.retired && askingWage(s, p, s.userClubId) < 1e9 && isInterested(s, p));
}
const LIST_TITLE: Record<string, string> = { scouted: 'Scout recommendations', shortlist: 'Your shortlist', free: 'Free agents open to joining you' };
const LIST_EMPTY: Record<string, string> = {
  scouted: 'Your scouts deliver a shortlist every two weeks. Set their targets under Scouts.',
  shortlist: 'Star players to keep an eye on them.',
  free: 'No free agents here want to join right now. Better facilities and a higher division attract more.',
};

function TransfersTab() {
  const s = useStore().state!;
  const fp = formationPositions(s);
  const [seg, setSeg] = useState<Seg>('scouted');
  const [pos, setPos] = useState('ANY');
  const [sort, pick] = useSort();
  const [undo, setUndo] = useState<Player | null>(null);
  const remove = (p: Player) => { s.scouting.starred = s.scouting.starred.filter((x) => x !== p.id); setUndo(p); store.bump(); };
  const restore = () => { if (undo && !s.scouting.starred.includes(undo.id)) s.scouting.starred = [undo.id, ...s.scouting.starred]; setUndo(null); store.bump(); };
  const w = isWindowOpen(s.week);
  const incoming = s.inbox.filter((m) => m.action?.kind === 'offer_in' && !m.resolved).length;
  const isList = LIST_SEGS.includes(seg);
  const positions = posKeys(seg, fp);
  const curPos = positions.includes(pos) ? pos : 'ANY';
  // flat page list so a swipe past the last position moves on to the next segment
  const keys = SEGS.flatMap((x) => (LIST_SEGS.includes(x) ? posKeys(x, fp).map((p) => pageKey(x, p)) : [x]));
  const value = pageKey(seg, curPos);
  const go = (k: string) => {
    const [sg, ps] = k.split(':') as [Seg, string | undefined];
    setSeg(sg);
    if (ps) setPos(ps);
  };
  const segBtn = (k: Seg, l: string) => <button key={k} class={`chip ${seg === k ? 'on' : ''}`} onClick={() => { setSeg(k); if (!posKeys(k, fp).includes(pos)) setPos('ANY'); }}>{l}</button>;
  let all: Player[] = [];
  if (isList) all = listFor(s, seg, fp);
  const list = all.filter((p) => curPos === 'ANY' || p.pos === curPos);
  return (
    <div>
      <div class={`card small ${w ? 'green' : 'dim'}`} style={{ padding: 8 }}>
        {w ? `${w === 'summer' ? 'Summer' : 'January'} window open${w === 'summer' && s.week <= CAL.summerWindowEnd ? ` · closes week ${CAL.summerWindowEnd}` : w === 'winter' ? ` · closes week ${CAL.winterWindow[1]}` : ''}` : 'Window closed: free agents and loans only'}
      </div>
      <div class="chips" data-seg-bar>
        {segBtn('scouted', 'Scouted')}{segBtn('shortlist', '★ List')}{segBtn('free', 'Free agents')}{segBtn('offers', `Offers${incoming ? ` (${incoming})` : ''}`)}{segBtn('scouts', 'Scouts')}{segBtn('news', 'News')}
      </div>
      {isList && (
        <div class="chips" data-seg-bar>
          {positions.map((x) => <button key={x} class={`chip ${curPos === x ? 'on' : ''}`} onClick={() => setPos(x)}>{x}{x !== 'ANY' && all.some((p) => p.pos === x) ? <span class="dim"> {all.filter((p) => p.pos === x).length}</span> : ''}</button>)}
        </div>
      )}
      <SwipePages keys={keys} value={value} onChange={go}>
        {isList && (
          <Card title={LIST_TITLE[seg]}>
            {all.length === 0 ? <div class="empty">{LIST_EMPTY[seg]}</div> : <PlayerTable s={s} players={list} sort={sort} onSort={pick} onRemove={seg === 'shortlist' ? remove : undefined} />}
            {seg === 'shortlist' && undo && <div class="between small" style={{ marginTop: 8 }}><span class="dim">Removed {undo.first[0]}. {undo.last} from your shortlist</span><button class="btn small" onClick={restore}>Undo</button></div>}
            {seg === 'scouted' && all.length > 0 && <div class="tiny dim">The {SCOUTED_MAX} newest reports are kept: new ones replace the oldest.</div>}
            {seg === 'free' && all.length > 0 && <div class="tiny dim">Only players open to joining you. Best 40 shown. Division {s.clubs[s.userClubId].div} wages apply.</div>}
          </Card>
        )}
        {seg === 'offers' && <Offers s={s} />}
        {seg === 'scouts' && <Scouts s={s} />}
        {seg === 'news' && <Market s={s} />}
      </SwipePages>
    </div>
  );
}

setTransfersScreen(() => <TransfersTab />);
