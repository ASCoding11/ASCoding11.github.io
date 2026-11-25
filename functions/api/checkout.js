// POST /api/checkout  { sku, back }  with "Authorization: Bearer <Firebase ID token>" from a Google sign-in.
// Starts a Stripe-hosted Checkout for one item and returns { url } to send the player to. The item is the active
// Stripe price whose lookup key is the sku; back is the page to return to (on one of the site's own addresses).
// The six emerald packs (emeralds_7 … emeralds_4000, functions/_catalog.js) are consumables: bought as often as
// wanted, only while the wallet is open to this player (functions/_wallet.js allowed()), and only when the Stripe
// price's amount and currency match the pack exactly. The webhook credits them; the return address also carries
// the Checkout session id (session=cs_…) so the shop can tell when the emeralds have arrived.
import { cors, json, allowedOrigin, googleUser, stripe, ownedItems, SKU_RE } from '../_lib.js';
import { CATALOG, allowed } from '../_wallet.js';

// Shown on Stripe's page above the Pay button (custom_text.submit, plain text, Stripe allows up to 1,200 characters).
// All sales are final: the site never offers a refund; a refund the owners make by hand in Stripe, or a chargeback,
// takes the emeralds back (stripe-webhook.js). Players who need help use Payment help in the shop.
export const FINAL_TEXT = 'All sales are final. No refunds. Need help with a payment? Use Payment help in the Back Room shop.';

export const onRequestOptions = ({ request, env }) => new Response(null, { status: 204, headers: cors(request, env) });

export async function onRequestPost({ request, env }) {
  const h = cors(request, env);
  const user = await googleUser(request);
  if (!user) return json({ error: 'Sign in with Google to buy items.' }, 401, h);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400, h); }
  const sku = String(body.sku || '');
  if (!SKU_RE.test(sku)) return json({ error: 'Unknown item.' }, 400, h);
  let back;
  try { back = new URL(String(body.back || '')); } catch (e) { return json({ error: 'Bad return page.' }, 400, h); }
  if (!allowedOrigin(back.origin, env)) return json({ error: 'Bad return page.' }, 400, h);
  back.hash = '';

  const E = Object.prototype.hasOwnProperty.call(CATALOG.EMERALDS, sku) ? CATALOG.EMERALDS[sku] : null;
  if (E) {
    if (!allowed(user.uid)) return json({ error: 'The shop isn’t open yet.', reason: 'closed' }, 403, h);
    try {
      const prices = await stripe(env, 'GET', 'prices', { lookup_keys: [sku], active: 'true' });
      const price = prices.data && prices.data[0];
      if (!price) return json({ error: 'Unknown item.' }, 404, h);
      if (price.unit_amount !== E.cents || String(price.currency || '').toLowerCase() !== E.currency || (price.type && price.type !== 'one_time'))
        return json({ error: 'This pack isn’t set up right yet.', reason: 'price' }, 409, h);
      const ret = (k) => { const u = new URL(back); u.searchParams.set('purchase', k); u.searchParams.set('sku', sku); return u.toString() + (k === 'success' ? '&session={CHECKOUT_SESSION_ID}' : ''); };
      const session = await stripe(env, 'POST', 'checkout/sessions', {
        mode: 'payment',
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: user.uid,
        customer_email: user.email || undefined,
        metadata: { uid: user.uid, sku, kind: 'emeralds' },
        payment_intent_data: { metadata: { uid: user.uid, sku, kind: 'emeralds' } },
        custom_text: { submit: { message: FINAL_TEXT } },
        success_url: ret('success'),
        cancel_url: ret('cancel')
      });
      return json({ url: session.url }, 200, h);
    } catch (e) {
      return json({ error: 'Couldn’t start checkout. Try again in a minute.' }, 502, h);
    }
  }

  try {
    if ((await ownedItems(env, user.uid))[sku]) return json({ error: 'You already own this.', owned: true }, 409, h);
    const prices = await stripe(env, 'GET', 'prices', { lookup_keys: [sku], active: 'true' });
    const price = prices.data && prices.data[0];
    if (!price) return json({ error: 'Unknown item.' }, 404, h);
    const ret = (k) => { const u = new URL(back); u.searchParams.set('purchase', k); u.searchParams.set('sku', sku); return u.toString(); };
    const session = await stripe(env, 'POST', 'checkout/sessions', {
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: user.uid,
      customer_email: user.email || undefined,
      metadata: { uid: user.uid, sku },
      payment_intent_data: { metadata: { uid: user.uid, sku } },
      custom_text: { submit: { message: FINAL_TEXT } },
      success_url: ret('success'),
      cancel_url: ret('cancel')
    });
    return json({ url: session.url }, 200, h);
  } catch (e) {
    return json({ error: 'Couldn’t start checkout. Try again in a minute.' }, 502, h);
  }
}
