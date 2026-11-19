// GET /api/wallet  with "Authorization: Bearer <Firebase ID token>" from a Google sign-in (the same check as the shop).
// The player's emerald wallet: { balance (whole mangos), captain, owned: [item ids], notices: [gifts not yet seen],
// recent: [[time ms, change, balance after, why, ref], ...] newest last, mangosPerEmerald, test (true while Cloudflare
// holds a Stripe test key; the key itself is never sent), public (PAYMENTS.enabled) }. See functions/_wallet.js.
import { endpoint, options, walletGet } from '../../_wallet.js';

export const onRequestOptions = options;
export const onRequestGet = endpoint(walletGet);
