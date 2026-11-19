// POST /api/wallet/gift  { what: a pack id, 'item:<id>' or 'draw-1/5/10', to: uid, toName, fromName, note (≤ 60), req }
// (Google sign-in required). Charges the sender the same price, gives the recipient the item (or the opened chest's
// skins) and a notice. Refusals: recipient (no wallet yet), self, captain, owned, funds, money, note (over 60 characters,
// or hiding one of the worst words). The note, and the names shown with it, go through the server's copy of
// /namefilter.js (cleanNote / nameClean in functions/_wallet.js), so a rude word is masked even when the page is bypassed.
import { endpoint, options, walletGift } from '../../_wallet.js';

export const onRequestOptions = options;
export const onRequestPost = endpoint((env, user, body) => walletGift(env, user, body));
