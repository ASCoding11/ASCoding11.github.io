// POST /api/stripe-webhook: Stripe tells us a Checkout finished. This, not the page the player lands on afterwards,
// is what gives them the item: the signature proves the message came from Stripe. Set up in Stripe (Developers →
// Webhooks) for https://ascoding11.com/api/stripe-webhook with the events checkout.session.completed and
// checkout.session.async_payment_succeeded; its signing secret is STRIPE_WEBHOOK_SECRET.
import { json, stripeEvent, grant, SKU_RE } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const ev = await stripeEvent(request, raw, env.STRIPE_WEBHOOK_SECRET);
  if (!ev) return json({ error: 'bad signature' }, 400);
  if (ev.type !== 'checkout.session.completed' && ev.type !== 'checkout.session.async_payment_succeeded') return json({ ok: true });
  const s = ev.data && ev.data.object;
  if (!s || s.mode !== 'payment' || s.payment_status !== 'paid') return json({ ok: true });   // e.g. a bank payment still on its way
  const uid = String((s.metadata && s.metadata.uid) || s.client_reference_id || ''), sku = String((s.metadata && s.metadata.sku) || '');
  if (!uid || uid.length > 128 || /[/]/.test(uid) || !SKU_RE.test(sku)) return json({ ok: true, skipped: 'no player or item' });
  try {
    await grant(env, { uid, sku, session: s.id, amount: s.amount_total, currency: s.currency,
      email: (s.customer_details && s.customer_details.email) || s.customer_email || '', at: (ev.created || Math.floor(Date.now() / 1000)) * 1000 });
  } catch (e) {
    return json({ error: 'could not record the purchase' }, 500);   // Stripe retries
  }
  return json({ ok: true });
}
