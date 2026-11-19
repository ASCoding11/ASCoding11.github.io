// POST /api/stripe-webhook: Stripe tells us a Checkout finished, or a payment was refunded or disputed. This, not the
// page the player lands on afterwards, is what gives them the item or the emeralds: the signature proves the message
// came from Stripe. Set up in Stripe (Developers → Webhooks) for https://ascoding11.com/api/stripe-webhook with the
// events checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded,
// charge.dispute.created and charge.dispute.closed; its signing secret is STRIPE_WEBHOOK_SECRET.
//
// Refused before anything is written: a bad or missing signature, a signature older than 5 minutes (a replay), a body
// over 512 KB. Ignored (200, so Stripe doesn't retry): events from a connected account (event.account), and events
// whose livemode doesn't match the key in Cloudflare (a test-mode event while a live key is set, or the other way
// round). A paid Checkout that our own /api/checkout didn't make (a Payment Link, or one made in the dashboard) or
// one from the other mode is written to orders/{session id} as 'unclaimed' and credits nobody.
import { json, stripeEvent, grant, readBody, SKU_RE } from '../_lib.js';
import { marketPaid } from '../_market.js';
import { CATALOG, UID_RE, creditEmeralds, recordUnclaimed, reverseEmeralds, testMode } from '../_wallet.js';

const BODY_MAX = 512 * 1024;
const PAID = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const REVERSE = ['charge.refunded', 'charge.dispute.created', 'charge.dispute.closed'];

export async function onRequestPost({ request, env }) {
  const raw = await readBody(request, BODY_MAX);
  if (raw === null) return json({ error: 'too large' }, 413);
  const ev = await stripeEvent(request, raw, env.STRIPE_WEBHOOK_SECRET);
  if (!ev || typeof ev !== 'object') return json({ error: 'bad signature' }, 400);
  const at = (Number.isSafeInteger(ev.created) ? ev.created : Math.floor(Date.now() / 1000)) * 1000;
  const paid = PAID.includes(ev.type), reverse = REVERSE.includes(ev.type);
  if (!paid && !reverse) return json({ ok: true });
  if (ev.account) return json({ ok: true, ignored: 'connected account' });
  const modeOk = ev.livemode === !testMode(env);

  if (reverse) {
    if (!modeOk) return json({ ok: true, ignored: 'mode' });
    try { return json(Object.assign({ ok: true }, await reverseEmeralds(env, ev, at))); }
    catch (e) { return json({ error: 'could not record the refund' }, 500); }   // Stripe retries
  }

  const s = ev.data && ev.data.object;
  if (!s || s.mode !== 'payment' || s.payment_status !== 'paid') return json({ ok: true });   // e.g. a bank payment still on its way
  try {
    if (!modeOk) return json(Object.assign({ ok: true }, await recordUnclaimed(env, s, at, 'mode')));
    if (s.payment_link) return json(Object.assign({ ok: true }, await recordUnclaimed(env, s, at, 'payment link')));
  } catch (e) { return json({ error: 'could not record the payment' }, 500); }
  // A Marketplace sale (functions/_market.js): marks the deal paid, which shows the buyer and seller each other's details.
  if (s.metadata && s.metadata.kind === 'market') {
    try { await marketPaid(env, s, at); }
    catch (e) { return json({ error: 'could not record the sale' }, 500); }   // Stripe retries
    return json({ ok: true });
  }
  // An emerald pack (functions/_wallet.js): credits wallets/{uid} once per Checkout session, only when the amount and
  // currency paid match the pack. A mismatch is recorded in orders/{session id} with nothing credited, and not retried.
  if (s.metadata && Object.prototype.hasOwnProperty.call(CATALOG.EMERALDS, String(s.metadata.sku || ''))) {
    let r;
    try { r = await creditEmeralds(env, s, at); }
    catch (e) { return json({ error: 'could not record the purchase' }, 500); }   // Stripe retries
    return json(Object.assign({ ok: true }, r));
  }
  // An item: the player is metadata.uid, set only by our checkout (never client_reference_id, which a Payment Link
  // takes from its own address).
  const uid = String((s.metadata && s.metadata.uid) || ''), sku = String((s.metadata && s.metadata.sku) || '');
  if (!UID_RE.test(uid) || !SKU_RE.test(sku)) {
    try { return json(Object.assign({ ok: true }, await recordUnclaimed(env, s, at, 'no player or item'))); }
    catch (e) { return json({ error: 'could not record the payment' }, 500); }
  }
  try {
    await grant(env, { uid, sku, session: s.id, amount: s.amount_total, currency: s.currency,
      email: (s.customer_details && s.customer_details.email) || s.customer_email || '', at });
  } catch (e) {
    return json({ error: 'could not record the purchase' }, 500);   // Stripe retries
  }
  return json({ ok: true });
}
