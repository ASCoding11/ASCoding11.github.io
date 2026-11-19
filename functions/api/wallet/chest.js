// POST /api/wallet/chest  { n: 1 | 5 | 10, req }  (Google sign-in required)
// Opens chests: the roll is made here with crypto randomness. { ok, spent, got: { draws: [{ rarity, skin, dup }] },
// refund (48 mangos for each skin already owned), balance, state }. See functions/_wallet.js.
import { endpoint, options, walletChest } from '../../_wallet.js';

export const onRequestOptions = options;
export const onRequestPost = endpoint((env, user, body) => walletChest(env, user, body));
