/**
 * FootballGM purchase acknowledgement worker (Cloudflare Workers, free plan).
 *
 * Google Play refunds a one-time purchase that is not acknowledged within 3 days, and a
 * Trusted Web Activity cannot acknowledge on the device, so the game posts each purchase
 * token here. The worker checks the purchase with the Google Play Developer API and
 * acknowledges it. It stores nothing and only accepts the "full_game" product.
 *
 * Secrets (wrangler secret put ...): SA_EMAIL, SA_PRIVATE_KEY (from the service account JSON).
 * Vars (wrangler.toml): PACKAGE_NAME, ALLOWED_ORIGIN.
 */
const PRODUCTS = ['full_game'];
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

export default {
  async fetch(req, env) {
    const cors = { 'access-control-allow-origin': env.ALLOWED_ORIGIN, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    let body;
    try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
    const { itemId, purchaseToken } = body ?? {};
    if (!PRODUCTS.includes(itemId) || typeof purchaseToken !== 'string' || purchaseToken.length > 1000) return json({ error: 'bad request' }, 400, cors);

    const token = await accessToken(env);
    const url = `${API}/${env.PACKAGE_NAME}/purchases/products/${itemId}/tokens/${encodeURIComponent(purchaseToken)}`;
    const got = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!got.ok) return json({ error: 'not found', status: got.status }, 404, cors);
    const p = await got.json();
    // purchaseState 0 = purchased; acknowledgementState 0 = not yet acknowledged
    if (p.purchaseState === 0 && p.acknowledgementState === 0) {
      const ack = await fetch(`${url}:acknowledge`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}' });
      if (!ack.ok) return json({ error: 'ack failed', status: ack.status }, 502, cors);
    }
    return json({ ok: true, purchaseState: p.purchaseState }, 200, cors);
  },
};

function json(o, status, headers) {
  return new Response(JSON.stringify(o), { status, headers: { ...headers, 'content-type': 'application/json' } });
}

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlStr = (s) => b64url(new TextEncoder().encode(s));

/** OAuth access token for the service account (JWT bearer flow, RS256 via WebCrypto). */
async function accessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64urlStr(JSON.stringify({ iss: env.SA_EMAIL, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = env.SA_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64url(sig)}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('token failed');
  return j.access_token;
}
