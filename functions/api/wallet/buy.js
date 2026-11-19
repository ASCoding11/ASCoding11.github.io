// POST /api/wallet/buy  { what: a pack id or 'item:<id>', req: a random id for this click }  (Google sign-in required)
// Buys it with the wallet's mangos in one Firestore transaction: { ok, pack, spent, got, refund, balance, state }.
// Refusals: 402 funds, 409 owned / duplicate, 400 unknown / money. See functions/_wallet.js.
import { endpoint, options, walletBuy } from '../../_wallet.js';

export const onRequestOptions = options;
export const onRequestPost = endpoint((env, user, body) => walletBuy(env, user, body));
