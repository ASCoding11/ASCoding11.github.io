// GET /api/owned  with "Authorization: Bearer <Firebase ID token>" from a Google sign-in.
// Returns { items: { <sku>: <time bought, ms> } }: everything this Google account has bought.
import { cors, json, googleUser, ownedItems } from '../_lib.js';

export const onRequestOptions = ({ request, env }) => new Response(null, { status: 204, headers: cors(request, env) });

export async function onRequestGet({ request, env }) {
  const h = cors(request, env);
  const user = await googleUser(request);
  if (!user) return json({ error: 'Sign in with Google to see your items.' }, 401, h);
  try { return json({ items: await ownedItems(env, user.uid) }, 200, h); }
  catch (e) { return json({ error: 'Couldn’t load your items.' }, 502, h); }
}
