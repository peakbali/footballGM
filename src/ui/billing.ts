import { STORE_NAME } from '../core/edition';
/**
 * "Full game" one-time purchase (docs/PLAY_STORE.md).
 * - In the Google Play app (a Trusted Web Activity), Play Billing via the Digital Goods API + Payment Request.
 * - On the open web there is no store, so the paywall links to the Play listing instead.
 * - In `npm run dev`, a "Simulate purchase" button stands in for the store.
 * The unlock is cached on the device so it works offline; on launch Play's purchase list is the source of truth.
 */
export const PRODUCT_ID = 'full_game';
export const PACKAGE_ID = 'com.peakbali.footballgm';
export const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_ID}`;
const PLAY_BILLING = 'https://play.google.com/billing';
/**
 * Play refunds a purchase that is not acknowledged within 3 days, and only a server can acknowledge.
 * This is the URL of the small acknowledgement worker (twa/ack-worker/). Empty = not set up yet.
 */
export const ACK_URL = '';
const KEY = 'fgm.fullGame';

interface DgItem { itemId: string; title?: string; price: { currency: string; value: string } }
interface DgPurchase { itemId: string; purchaseToken: string }
interface DgService { getDetails(ids: string[]): Promise<DgItem[]>; listPurchases(): Promise<DgPurchase[]> }
type DgWindow = Window & { getDigitalGoodsService?: (url: string) => Promise<DgService> };

type Listener = () => void;

class Billing {
  unlocked = read() !== null;
  source: string | null = read();
  /** Play Billing is available (running inside the Play app) */
  store = false;
  price: string | null = null;
  busy = false;
  error: string | null = null;
  private service: DgService | null = null;
  private ls = new Set<Listener>();
  private ready: Promise<void> | null = null;

  subscribe(f: Listener) { this.ls.add(f); return () => this.ls.delete(f); }
  private bump() { for (const f of this.ls) f(); }

  init(): Promise<void> {
    this.ready ??= this.connect();
    return this.ready;
  }

  private async connect() {
    const w = window as DgWindow;
    if (!w.getDigitalGoodsService || !('PaymentRequest' in window)) return;
    try {
      this.service = await w.getDigitalGoodsService(PLAY_BILLING);
    } catch {
      return; // not installed from Play: behave like the web
    }
    if (!this.service) return;
    this.store = true;
    try {
      const [d] = await this.service.getDetails([PRODUCT_ID]);
      if (d) this.price = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: d.price.currency }).format(Number(d.price.value));
    } catch { /* price stays generic */ }
    await this.restore(true);
  }

  /** Re-reads Play's purchase list. Quiet = launch check (no error text). */
  async restore(quiet = false) {
    if (!this.service) { if (!quiet) this.error = `Purchases can be restored in ${STORE_NAME} from Google Play.`; this.bump(); return; }
    try {
      const list = await this.service.listPurchases();
      const p = list.find((x) => x.itemId === PRODUCT_ID);
      if (p) {
        this.grant('play');
        void acknowledge(p.purchaseToken); // idempotent; catches purchases made outside the app (promo codes)
      } else if (this.source === 'play') {
        this.revoke(); // refunded
      } else if (!quiet) {
        this.error = 'No Full game purchase found on this Google account.';
      }
    } catch {
      if (!quiet) this.error = 'Could not reach Google Play. Check your connection and try again.';
    }
    this.bump();
  }

  async buy() {
    if (this.busy) return;
    this.error = null;
    if (!this.store) {
      if (import.meta.env.DEV) { this.grant('dev'); this.bump(); return; }
      window.open(PLAY_URL, '_blank', 'noopener');
      return;
    }
    this.busy = true;
    this.bump();
    try {
      const req = new PaymentRequest(
        [{ supportedMethods: PLAY_BILLING, data: { sku: PRODUCT_ID } }],
        { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } }, // required by the API, ignored by Play
      );
      const res = await req.show();
      const token = (res.details as { purchaseToken?: string; token?: string }).purchaseToken ?? (res.details as { token?: string }).token;
      await res.complete('success');
      this.grant('play');
      if (token) void acknowledge(token);
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name !== 'AbortError') this.error = 'The purchase did not go through. You have not been charged.';
      // an earlier purchase may already exist (item already owned)
      await this.restore(true);
    } finally {
      this.busy = false;
      this.bump();
    }
  }

  private grant(source: string) {
    this.unlocked = true;
    this.source = source;
    try { localStorage.setItem(KEY, source); } catch { /* private mode: unlock lasts this session */ }
  }

  private revoke() {
    this.unlocked = false;
    this.source = null;
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

async function acknowledge(purchaseToken: string) {
  if (!ACK_URL) return;
  try {
    await fetch(ACK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: PRODUCT_ID, purchaseToken }) });
  } catch { /* retried on next launch via restore() */ }
}

export const billing = new Billing();
