import { useState } from 'preact/hooks';
import { squadOf, type GameState } from '../../core/state';
import type { Player } from '../../core/types';
import { BRANCHES, building, canStart, costOf, effects, facState, facilityUpkeep, gradingNote, nextOptions, startUpgrade, upgradeById, type FacEffect, type Upgrade } from '../../core/systems/facilities';
import { academyCap, ACADEMY_WEEK, answerTransferRequest, moraleReasons, promoteFromAcademy } from '../../core/systems/people';
import { releasePlayer } from '../../core/systems/contracts';
import { staffCap, staffLevel } from '../../core/systems/staff';
import { Card, Overlay } from '../components';
import { registerOverlay } from '../overlays';
import { money, nav, store, useStore } from '../store';
import { registerClubSection } from './clubSections';
import type { ArtKey } from '../cardArt';
import { registerHubCard } from '../hubExtras';
import { registerInboxAction } from '../inboxActions';
import { registerPlayerAction } from '../playerExtras';
import { registerSquadCard } from '../squadExtras';
import { SquadRow } from '../screens/Squad';
import { sfx } from '../audio';

function effText(e: FacEffect): string {
  const parts: string[] = [];
  if (e.capacity) parts.push(`+${e.capacity.toLocaleString()} capacity`);
  if (e.comfort) parts.push(`+${Math.round(e.comfort * 100)}% attendance`);
  if (e.ticketMax) parts.push(`+${Math.round(e.ticketMax * 100)}% ticket ceiling`);
  if (e.homeMorale) parts.push('louder home crowd');
  if (e.merch) parts.push(`+${Math.round(e.merch * 100)}% merchandise`);
  if (e.matchday) parts.push('matchday spending');
  if (e.rentals) parts.push('weekly rentals');
  if (e.injury) parts.push(`${Math.round(-e.injury * 100)}% shorter injuries`);
  if (e.recovery) parts.push(`+${e.recovery} fitness recovery`);
  if (e.dev) parts.push(`+${Math.round(e.dev * 100)}% development`);
  if (e.devPrime) parts.push(`+${Math.round(e.devPrime * 100)}% development (ages 21-26)`);
  if (e.youthCount) parts.push(`+${e.youthCount} academy intake`);
  if (e.youthQuality) parts.push('better academy prospects');
  return parts.join(' · ');
}

const BRANCH_STAFF: Record<string, string> = {
  stadium: 'Bigger crowds, higher prices.',
  training: 'Caps coaches, physio and doctor.',
  academy: 'Caps youth coach and scouts.',
  commercial: 'Caps the commercial manager.',
};

function UpgradeRow({ s, u, onDone }: { s: GameState; u: Upgrade; onDone: () => void }) {
  const err = canStart(s, u);
  return (
    <div class="item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
      <div class="grow">
        <div class="name small" style={{ whiteSpace: 'normal' }}>{u.name}</div>
        <div class="tiny dim">{u.desc}</div>
        <div class="tiny green">{effText(u.eff) || 'Raises the level and staff cap'}</div>
        <div class="tiny dim">{u.weeks} weeks · upkeep {money(u.upkeep)}/wk</div>
      </div>
      <button class="btn small primary" disabled={!!err} title={err ?? ''} onClick={() => { startUpgrade(s, u.id); sfx('build'); onDone(); store.bump(); void store.persist(); }}>{money(costOf(s, u))}</button>
    </div>
  );
}

function Facilities({ s }: { s: GameState }) {
  const [open, setOpen] = useState<string | null>(null);
  const f = facState(s);
  const cash = s.clubs[s.userClubId].cash;
  const note = gradingNote(s);
  return (
    <div>
      <Card title={`Facilities · upkeep ${money(facilityUpkeep(s))}/wk`}>
        <div class="tiny dim">Cash {money(cash)}. Each branch builds one project at a time. Staff caps are level × 10 + 10.</div>
        {note && <div class="tiny amber" style={{ marginTop: 6 }}>{note}</div>}
      </Card>
      {BRANCHES.map((b) => {
        const lvl = f.levels[b.key];
        const proj = building(s, b.key);
        const opts = nextOptions(s, b.key);
        const built = f.built.map(upgradeById).filter((u) => u && u.branch === b.key) as Upgrade[];
        return (
          <Card key={b.key} art={b.key as ArtKey} title={<span>{b.label} <span class="gold">Lv {lvl}</span></span>} action={<span class="tiny dim">cap {lvl * 10 + 10}</span>}>
            <div class="row" style={{ gap: 3, marginBottom: 6 }}>
              {Array.from({ length: 10 }, (_, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 1, background: i < lvl ? 'var(--gold)' : proj && i === lvl ? 'var(--amber, #d9a400)' : 'var(--bg)', opacity: proj && i === lvl ? 0.5 : 1 }} />)}
            </div>
            <div class="tiny dim">{b.desc} {BRANCH_STAFF[b.key]}</div>
            {built.length > 0 && <div class="tiny" style={{ marginTop: 4 }}>Built: {built.map((u) => u.name).join(', ')}</div>}
            {proj && <div class="small amber" style={{ marginTop: 6 }}>🏗 {proj.up.name}: {proj.weeksLeft} week{proj.weeksLeft === 1 ? '' : 's'} left</div>}
            {!proj && opts.length > 0 && (
              open === b.key ? (
                <div style={{ marginTop: 6 }}>
                  {opts.length > 1 && <div class="tiny gold">Choose one. The other option is gone for good.</div>}
                  {opts.map((u) => <UpgradeRow key={u.id} s={s} u={u} onDone={() => setOpen(null)} />)}
                  <button class="linkbtn" onClick={() => setOpen(null)}>Close</button>
                </div>
              ) : (
                <button class="btn small" style={{ marginTop: 8 }} onClick={() => setOpen(b.key)}>Upgrade to level {lvl + 1}{opts.length > 1 ? ' (choice)' : ''}</button>
              )
            )}
            {!proj && opts.length === 0 && <div class="tiny green" style={{ marginTop: 6 }}>Fully upgraded.</div>}
          </Card>
        );
      })}
    </div>
  );
}

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
          <span>Bonuses</span><span>{effText({ youthCount: e.youthCount, youthQuality: e.youthQuality }) || 'None yet'}</span>
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

// Hub: building projects
registerHubCard((s) => {
  const f = facState(s);
  if (!f.projects.length) return null;
  return (
    <Card title="Building">
      {f.projects.map((p) => {
        const u = upgradeById(p.id)!;
        return <div class="between small" key={p.id}><span>{u.name}</span><span class="amber">{p.weeksLeft} wk</span></div>;
      })}
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
