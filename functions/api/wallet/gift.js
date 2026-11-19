// POST /api/wallet/gift  { what: a pack id, 'item:<id>' or 'draw-1/5/10', to: uid, toName, fromName, note (≤ 60), req }
// (Google sign-in required). Charges the sender the same price, gives the recipient the item (or the opened chest's
// skins) and a notice. Refusals: recipient (no wallet yet), self, captain, owned, funds, money. See functions/_wallet.js.
import { endpoint, options, walletGift } from '../../_wallet.js';

export const onRequestOptions = options;
export const onRequestPost = endpoint((env, user, body) => walletGift(env, user, body));
