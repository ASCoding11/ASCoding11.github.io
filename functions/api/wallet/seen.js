// POST /api/wallet/seen  { ids: [notice id, ...] }  (Google sign-in required): the page has shown these gift notices.
import { endpoint, options, walletSeen } from '../../_wallet.js';

export const onRequestOptions = options;
export const onRequestPost = endpoint(walletSeen);
