import { useState } from 'preact/hooks';
import { squadOf, type GameState } from '../../core/state';
import type { Player } from '../../core/types';
import { BRANCHES, MAX_TRACK, TRACKS, building, canStart, costOf, effectText, effects, facState, facilityUpkeep, gradingNote, nextUpgrade, startUpgrade, trackLevel, type Track } from '../../core/systems/facilities';
import { ITEM_LABEL, PLAYER_COOLDOWN, cannotUse, labInfo, labState, learnablePositions, applyItem, type ItemKind } from '../../core/systems/lab';
import { A, ATTR_GROUPS, ATTR_LABELS } from '../../core/data/positions';
import { academyCap, ACADEMY_WEEK, answerTransferRequest, moraleReasons, promoteFromAcademy } from '../../core/systems/people';
import { releasePlayer } from '../../core/systems/contracts';
import { staffCap, staffLevel } from '../../core/systems/staff';
import { Card, Overlay } from '../components';
import { registerOverlay } from '../overlays';
import { money, nav, store, useStore } from '../store';
import { registerClubSection } from './clubSections';
import { CardArt, type ArtKey } from '../cardArt';
import { registerInboxAction } from '../inboxActions';
import { registerPlayerAction } from '../playerExtras';
import { registerSquadCard } from '../squadExtras';
import { SquadRow } from '../screens/Squad';
import { sfx } from '../audio';

const BRANCH_STAFF: Record<string, string> = {
  stadium: 'Staff cap: none.',
  training: 'Caps coaches, physio and doctor.',
  academy: 'Caps youth coach and scouts.',
  commercial: 'Caps the commercial manager.',
};

function Pips({ n, building }: { n: number; building: boolean }) {
  return (
    <span class="fac-pips">
      {Array.from({ length: MAX_TRACK }, (_, i) => <i key={i} class={i < n ? 'on' : building && i === n ? 'wip' : ''} />)}
    </span>
  );
}

function TrackRow({ s, t, onDone }: { s: GameState; t: Track; onDone: () => void }) {
  const lvl = trackLevel(s, t.key);
  const proj = building(s, t.key);
  const next = nextUpgrade(s, t.key);
  const err = next ? canStart(s, next) : null;
  return (
    <div class="fac-track">
      <div class="between">
        <span class="name small">{t.label}</span>
        <Pips n={lvl} building={!!proj} />
      </div>
      <div class="tiny dim">{t.desc}</div>
      {lvl > 0 && <div class="tiny green">Now: {effectText(t.per, lvl)}</div>}
      {proj ? (
        <div class="tiny amber" style={{ marginTop: 4 }}>🏗 {proj.up.name}: {proj.weeksLeft} week{proj.weeksLeft === 1 ? '' : 's'} left</div>
      ) : next ? (
        <div class="fac-next">
          <div class="grow">
            <div class="small"><b>{next.name}</b> <span class="tiny dim">level {next.level}</span></div>
            <div class="tiny gold">{effectText(t.per)}</div>
            <div class="tiny dim">{next.weeks} weeks · upkeep {money(next.upkeep)}/wk</div>
          </div>
          <button class="btn small primary" disabled={!!err} title={err ?? ''} onClick={() => { startUpgrade(s, next.id); sfx('build'); onDone(); store.bump(); void store.persist(); }}>{money(costOf(s, next))}</button>
        </div>
      ) : (
        <div class="tiny gold" style={{ marginTop: 4 }}>★ Fully upgraded</div>
      )}
    </div>
  );
}

/** One branch on its own page: level, staff cap, every sub-facility with its next upgrade. */
function BranchCard({ s, b }: { s: GameState; b: (typeof BRANCHES)[number] }) {
  const [, setV] = useState(0);
  const f = facState(s);
  const lvl = f.levels[b.key];
  const tracks = TRACKS.filter((x) => x.branch === b.key);
  const done = tracks.reduce((a, x) => a + trackLevel(s, x.key), 0);
  const lab = labInfo(s);
  const st = labState(s);
  return (
    <Card art={b.key as ArtKey} title={<span>{b.label} <span class="gold">Lv {lvl}</span></span>} action={<span class="tiny dim">{done}/{tracks.length * MAX_TRACK}</span>}>
      <div class="row" style={{ gap: 3, marginBottom: 6 }}>
        {Array.from({ length: 10 }, (_, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 1, background: i < lvl ? 'var(--gold)' : 'var(--bg)' }} />)}
      </div>
      <div class="tiny dim">{b.desc} {BRANCH_STAFF[b.key]}{b.key !== 'stadium' ? ` Cap now ${lvl * 10 + 10}.` : ''}</div>
      {b.key === 'stadium' && gradingNote(s) && <div class="tiny amber" style={{ marginTop: 6 }}>{gradingNote(s)}</div>}
      {b.key === 'training' && lab.level > 0 && (
        <div class="tiny" style={{ marginTop: 4 }}>Skills lab stock: {(['pos', 'stat', 'pers'] as const).map((k) => `${ITEM_LABEL[k]} ${st.stock[k]}/${lab.cap}`).join(' · ')}. New items every {lab.every} weeks. Use them from a player's page.</div>
      )}
      {tracks.map((x) => <TrackRow key={x.key} s={s} t={x} onDone={() => setV((v) => v + 1)} />)}
    </Card>
  );
}

/** The four branches as a 2x2 grid; a tap opens the branch page. */
function Facilities({ s }: { s: GameState }) {
  const f = facState(s);
  const cash = s.clubs[s.userClubId].cash;
  return (
    <div>
      <Card title={`Facilities · upkeep ${money(facilityUpkeep(s))}/wk`}>
        <div class="tiny dim">Cash {money(cash)}. Tap a branch to see its five sub-facilities. Each can be built on its own, one level at a time, and prices follow your division.</div>
        {gradingNote(s) && <div class="tiny amber" style={{ marginTop: 6 }}>{gradingNote(s)}</div>}
      </Card>
      <div class="fac-grid">
        {BRANCHES.map((b) => {
          const tracks = TRACKS.filter((x) => x.branch === b.key);
          const done = tracks.reduce((a, x) => a + trackLevel(s, x.key), 0);
          const busy = tracks.map((x) => building(s, x.key)).filter((x) => x);
          const cheapest = tracks.map((x) => (building(s, x.key) ? null : nextUpgrade(s, x.key))).filter((u) => u).sort((x, y) => x!.cost - y!.cost)[0];
          return (
            <button key={b.key} class="fac-box" onClick={() => nav.push({ kind: 'custom', key: 'facility', data: b.key })}>
              <div class="fac-box-art"><CardArt art={b.key as ArtKey} wide /><span class="fac-box-lv">Lv {f.levels[b.key]}</span></div>
              <div class="fac-box-body">
                <div class="fac-box-name">{b.label}</div>
                <div class="fac-box-bar"><i style={{ width: `${(done / (tracks.length * MAX_TRACK)) * 100}%` }} /></div>
                <div class="tiny dim">{done}/{tracks.length * MAX_TRACK} levels built</div>
                {busy.length > 0 ? <div class="tiny amber">🏗 {busy.length} building</div> : cheapest ? <div class="tiny gold">Next from {money(costOf(s, cheapest))}</div> : <div class="tiny gold">★ Complete</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FacilityPage({ branch }: { branch: string }) {
  const s = useStore().state!;
  const b = BRANCHES.find((x) => x.key === branch) ?? BRANCHES[0];
  const cash = s.clubs[s.userClubId].cash;
  // current cash in the top bar, so each upgrade can be judged against it
  const right = <div class="fac-cash"><span>Cash</span><b class={`money ${cash < 0 ? 'neg' : ''}`}>{money(cash)}</b></div>;
  return <Overlay title={b.label} sub={`Facilities · upkeep ${money(facilityUpkeep(s))}/wk`} right={right}><BranchCard s={s} b={b} /></Overlay>;
}
registerOverlay('facility', (data) => <FacilityPage branch={data as string} />);

function Academy({ s }: { s: GameState }) {
  const list = squadOf(s, s.userClubId).filter((p) => p.academy).sort((a, b) => b.pot - a.pot || b.ovr - a.ovr);
  const lvl = facState(s).levels.academy;
  const yc = staffLevel(s, 'youth_coach');
  const e = effects(s);
  const weeksTo = (ACADEMY_WEEK - s.week + 52) % 52;
  return (
    <div>
      <Card title={`Academy · ${list.length}/${academyCap(s)}`} art="academy">
        <div class="kv">
          <span>Facility</span><span>Level {lvl}</span>
          <span>Youth coach</span><span>{yc || 'Vacant'}{yc ? ` (cap ${staffCap(s, 'youth_coach')})` : ''}</span>
          <span>Next intake</span><span>{weeksTo === 0 ? 'This week' : `March, in ${weeksTo} weeks`}</span>
          <span>Bonuses</span><span>{effectText({ youthCount: e.youthCount, youthQuality: e.youthQuality, youthDev: e.youthDev, grad: e.grad }) || 'None yet'}</span>
        </div>
        <div class="tiny dim" style={{ marginTop: 6 }}>Academy players do not count toward the 30-man squad. They move up automatically at 19.</div>
      </Card>
      <Card title="Prospects">
        {list.length === 0 && <div class="empty small">No academy players yet. The first intake arrives in March.</div>}
        {list.map((p) => <SquadRow key={p.id} p={p} season={s.season} />)}
      </Card>
    </div>
  );
}

registerClubSection('facilities', 'Facilities', (s) => <Facilities s={s} />);
registerClubSection('academy', 'Academy', (s) => <Academy s={s} />);

// Squad tab: a link to the academy
registerSquadCard((s) => {
  const n = squadOf(s, s.userClubId).filter((p) => p.academy).length;
  if (!n) return null;
  return (
    <Card>
      <div class="between small"><span>Academy: <b>{n}</b> prospect{n === 1 ? '' : 's'}</span><button class="linkbtn" onClick={() => nav.push({ kind: 'custom', key: 'academy', data: null })}>View</button></div>
    </Card>
  );
});


// Player screen: morale reasons + academy actions
function OwnExtras({ s, p }: { s: GameState; p: Player }) {
  const [confirm, setConfirm] = useState(false);
  const reasons = moraleReasons(s, p);
  return (
    <Card title={p.academy ? 'Academy' : 'Mood'}>
      {reasons.length ? reasons.map((r) => <div class="tiny" key={r}>• {r}</div>) : <div class="tiny dim">Nothing on his mind.</div>}
      {p.academy && (
        <div class="row" style={{ marginTop: 8, gap: 8 }}>
          <button class="btn small primary" onClick={() => { promoteFromAcademy(s, p); store.bump(); void store.persist(); }}>Promote to first team</button>
          {!confirm ? <button class="btn small danger" onClick={() => setConfirm(true)}>Release</button> : <button class="btn small danger" onClick={() => { releasePlayer(s, p); nav.pop(); void store.persist(); }}>Confirm release</button>}
        </div>
      )}
    </Card>
  );
}
registerPlayerAction((s, p) => (p.clubId === s.userClubId ? <OwnExtras s={s} p={p} /> : null));

registerInboxAction('transfer_request', (s, m) => (
  <div class="row" style={{ gap: 8 }}>
    <button class="btn small primary" onClick={() => { answerTransferRequest(s, m.id, true); store.bump(); void store.persist(); }}>Put him on the list</button>
    <button class="btn small" onClick={() => { answerTransferRequest(s, m.id, false); store.bump(); void store.persist(); }}>Refuse</button>
  </div>
));

function AcademyScreen() {
  const s = useStore().state!;
  return <Overlay title="Academy"><Academy s={s} /></Overlay>;
}
registerOverlay('academy', () => <AcademyScreen />);

// Player screen: Skills lab items (Training ground)
function LabCard({ s, p }: { s: GameState; p: Player }) {
  const [open, setOpen] = useState<ItemKind | null>(null);
  const [msg, setMsg] = useState('');
  const info = labInfo(s);
  const st = labState(s);
  if (!info.level) return <Card title="Skills lab"><div class="tiny dim">Build the Skills lab on the Training ground to make training items: teach a position, boost a skill or improve personality.</div></Card>;
  const take = (kind: ItemKind, arg?: string) => {
    const r = applyItem(s, p, kind, arg);
    setMsg(r ?? '');
    setOpen(null);
    sfx('build');
    store.bump();
    void store.persist();
  };
  const groups = ATTR_GROUPS.filter((g) => (p.pos === 'GK' ? g.name !== 'Technical' : g.name !== 'Goalkeeping'));
  return (
    <Card title={`Skills lab · level ${info.level}`}>
      <div class="lab-items">
        {(['pos', 'stat', 'pers'] as ItemKind[]).map((k) => {
          const err = cannotUse(s, p, k);
          const sub = k === 'pos' ? 'New natural position' : k === 'stat' ? `+${info.stat} to one skill` : `+${info.pers} personality`;
          return (
            <button key={k} class={`lab-item ${open === k ? 'on' : ''}`} disabled={!!err && open !== k} title={err ?? ''} onClick={() => setOpen(open === k ? null : k)}>
              <b>{ITEM_LABEL[k]}</b>
              <span class="tiny dim">{sub}</span>
              <span class="tiny gold">{st.stock[k]}/{info.cap} in stock</span>
            </button>
          );
        })}
      </div>
      {(() => {
        const err = (['pos', 'stat', 'pers'] as ItemKind[]).map((k) => cannotUse(s, p, k)).find((e) => e && !e.startsWith('None'));
        return err ? <div class="tiny amber" style={{ marginTop: 6 }}>{err}</div> : null;
      })()}
      {open === 'pos' && (
        <div class="chips" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          {learnablePositions(s, p).length ? learnablePositions(s, p).map((pos) => <button key={pos} class="chip" onClick={() => take('pos', pos)}>{pos}</button>) : <span class="tiny dim">No position he can learn{info.anyPosition ? '' : ' yet (level 3 lab teaches any position)'}.</span>}
        </div>
      )}
      {open === 'stat' && (
        <div style={{ marginTop: 8 }}>
          {groups.map((g) => (
            <div key={g.name}>
              <div class="tiny dim" style={{ margin: '6px 0 4px' }}>{g.name}</div>
              <div class="lab-stats">
                {g.attrs.map((a) => <button key={a} class="lab-stat" onClick={() => take('stat', a)}><span>{ATTR_LABELS[a]}</span><b>{p.attrs[A[a]]}</b></button>)}
              </div>
            </div>
          ))}
        </div>
      )}
      {open === 'pers' && (
        <div class="row" style={{ marginTop: 8, gap: 8 }}>
          <span class="small">Personality {p.personality} → {Math.min(99, p.personality + info.pers)}</span>
          <button class="btn small primary" onClick={() => take('pers')}>Use</button>
        </div>
      )}
      {msg && <div class="small green" style={{ marginTop: 8 }}>{msg}</div>}
      <div class="tiny dim" style={{ marginTop: 6 }}>The lab makes one of each every {info.every} weeks (up to {info.cap}). A player can take one session every {PLAYER_COOLDOWN} weeks.</div>
    </Card>
  );
}
registerPlayerAction((s, p) => (p.clubId === s.userClubId ? <LabCard s={s} p={p} /> : null));
