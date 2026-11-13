// /api/market/<action>: the Marketplace (marketplace/index.html). All of it lives in functions/_market.js.
//   GET   listings · listing?id= · mine · photo?id=&n=
//   POST  create · edit · remove · report · offer · respond · pay · payouts
// Everything except listings, listing and photo needs "Authorization: Bearer <Firebase ID token>" from a Google sign-in.
import { handle } from '../../_market.js';

export const onRequest = ({ request, env, params }) => handle(request, env, String(params.action || ''));
