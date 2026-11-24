import { useState } from 'preact/hooks';
import { applyIdentity, autoAbbrev, autoShort, CREST_ICONS, CREST_PATTERNS, CREST_SHAPES, draftOf, identityError, PALETTE, type IdentityDraft } from '../../core/clubIdentity';
import { squadOf, type GameState } from '../../core/state';
import { Badge, Card, Overlay } from '../components';
import { registerOverlay } from '../overlays';
import { Portrait } from '../portrait';
import { nav, store, useStore } from '../store';
import { sfx } from '../audio';

/** Edit club name, code, stadium, colours and crest, with a live preview (DESIGN 13.2k). */
function ClubEdit() {
  const s = useStore().state!;
  const club = s.clubs[s.userClubId];
  const [d, setD] = useState<IdentityDraft>(() => draftOf(club));
  const [auto, setAuto] = useState({ short: club.short === autoShort(club.name), abbrev: club.abbrev === autoAbbrev(club.name) });
  const set = (patch: Partial<IdentityDraft>) => setD({ ...d, ...patch });
  const crest = (patch: Partial<IdentityDraft['crest']>) => set({ crest: { ...d.crest, ...patch } });
  const err = identityError(s, d);
  const preview = { id: club.id, name: d.name, colors: d.colors, crest: d.crest };
  const models = squadOf(s, s.userClubId).filter((p) => !p.academy).sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  const save = () => {
    if (applyIdentity(s, d)) return;
    sfx('confirm');
    store.bump();
    void store.persist();
    nav.pop();
  };
  return (
    <Overlay title="Club identity" sub="Name, colours and crest">
      <div class="cid-preview" style={{ '--c1': d.colors[0], '--c2': d.colors[1] } as never}>
        <Badge club={preview} size={88} />
        <div class="cid-names">
          <div class="cid-name">{d.name.trim() || '…'}</div>
          <div class="tiny dim">{d.short.trim()} · <b>{d.abbrev.trim().toUpperCase()}</b> · {d.stadium.trim()}</div>
          <div class="cid-kits">{models.map((p) => <Portrait key={p.id} p={p} size={34} shirt={d.colors} />)}</div>
        </div>
      </div>

      <Card title="Name">
        <label class="cid-field"><span>Club name</span>
          <input value={d.name} maxLength={32} onInput={(e) => {
            const name = (e.target as HTMLInputElement).value;
            set({ name, ...(auto.short ? { short: autoShort(name) } : {}), ...(auto.abbrev ? { abbrev: autoAbbrev(name) } : {}) });
          }} />
        </label>
        <div class="cid-row">
          <label class="cid-field grow"><span>Short name</span>
            <input value={d.short} maxLength={16} onInput={(e) => { setAuto({ ...auto, short: false }); set({ short: (e.target as HTMLInputElement).value }); }} />
          </label>
          <label class="cid-field" style={{ width: 84 }}><span>Code</span>
            <input value={d.abbrev} maxLength={4} style={{ textTransform: 'uppercase' }} onInput={(e) => { setAuto({ ...auto, abbrev: false }); set({ abbrev: (e.target as HTMLInputElement).value }); }} />
          </label>
        </div>
        <label class="cid-field"><span>Stadium</span>
          <input value={d.stadium} maxLength={32} onInput={(e) => set({ stadium: (e.target as HTMLInputElement).value })} />
        </label>
      </Card>

      <Card title="Colours">
        {(['Main colour', 'Second colour'] as const).map((label, k) => (
          <div key={label} class="cid-colors">
            <div class="tiny dim">{label}</div>
            <div class="swatches">
              {PALETTE.map((c) => (
                <button key={c} class={`swatch ${d.colors[k] === c ? 'on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => { const cs: [string, string] = [d.colors[0], d.colors[1]]; cs[k] = c; set({ colors: cs }); }} />
              ))}
              <label class="swatch custom" title="Any colour" style={{ background: PALETTE.includes(d.colors[k]) ? undefined : d.colors[k] }}>
                <span>+</span>
                <input type="color" value={d.colors[k]} onInput={(e) => { const cs: [string, string] = [d.colors[0], d.colors[1]]; cs[k] = (e.target as HTMLInputElement).value; set({ colors: cs }); }} />
              </label>
            </div>
          </div>
        ))}
        <button class="linkbtn" onClick={() => set({ colors: [d.colors[1], d.colors[0]] })}>Swap colours</button>
      </Card>

      <Card title="Crest">
        <div class="tiny dim">Shape</div>
        <div class="cid-opts">
          {CREST_SHAPES.map((n, i) => <button key={n} class={`cid-opt ${d.crest.shape === i ? 'on' : ''}`} onClick={() => crest({ shape: i })}><Badge club={{ ...preview, crest: { ...d.crest, shape: i } }} size={36} /><span>{n}</span></button>)}
        </div>
        <div class="tiny dim">Pattern</div>
        <div class="cid-opts">
          {CREST_PATTERNS.map((n, i) => <button key={n} class={`cid-opt ${d.crest.pattern === i ? 'on' : ''}`} onClick={() => crest({ pattern: i })}><Badge club={{ ...preview, crest: { ...d.crest, pattern: i } }} size={36} /><span>{n}</span></button>)}
        </div>
        <div class="tiny dim">Emblem</div>
        <div class="cid-opts">
          {CREST_ICONS.map((n, i) => <button key={n} class={`cid-opt ${d.crest.icon === i ? 'on' : ''}`} onClick={() => crest({ icon: i })}><Badge club={{ ...preview, crest: { ...d.crest, icon: i } }} size={36} /><span>{n}</span></button>)}
        </div>
        {d.crest.icon > 0 && (
          <div class="row" style={{ gap: 6, marginTop: 4, alignItems: 'center' }}>
            <span class="tiny dim">Emblem colour</span>
            {[undefined, '#ffffff', '#ffcc4d', '#111111', d.colors[1]].map((c, i) => (
              <button key={i} class={`swatch small ${d.crest.iconColor === c ? 'on' : ''}`} style={{ background: c ?? 'transparent' }} onClick={() => crest({ iconColor: c })}>{c ? '' : 'A'}</button>
            ))}
          </div>
        )}
      </Card>

      {err && <div class="amber small" style={{ margin: '0 4px 8px' }}>{err}</div>}
      <div class="row" style={{ gap: 8, marginBottom: 24 }}>
        <button class="btn grow" onClick={() => nav.pop()}>Cancel</button>
        <button class="btn gold grow" disabled={!!err} onClick={save}>Save</button>
      </div>
    </Overlay>
  );
}
registerOverlay('clubEdit', () => <ClubEdit />);

/** Club name and crest at the top of the Club tab, with the edit button. */
export function ClubHeader({ s }: { s: GameState }) {
  const c = s.clubs[s.userClubId];
  return (
    <div class="cid-head">
      <Badge club={c} size={40} />
      <div class="grow" style={{ minWidth: 0 }}>
        <div class="cid-head-name">{c.name}</div>
        <div class="tiny dim">{c.abbrev} · {c.stadium}</div>
      </div>
      <button class="btn small" onClick={() => nav.push({ kind: 'custom', key: 'clubEdit' })}>Edit</button>
    </div>
  );
}
