/*
 * Makes ascoding11.com its own main address for Google, without changing anything on ascoding11.github.io.
 *
 * Both addresses serve the same files from main, and every page's canonical link, og:url, the sitemap and
 * robots.txt name ascoding11.github.io. That is right for github.io, but on ascoding11.com it tells Google the
 * "real" page lives on github.io, so ascoding11.com looks like a copy (a problem for AdSense, which reviews
 * ascoding11.com). This Cloudflare Pages middleware rewrites those few things as pages leave ascoding11.com:
 *   - HTML pages: <link rel="canonical">, <meta property="og:url"> and <meta name="twitter:url"> that point at
 *     https://ascoding11.github.io/... now point at https://ascoding11.com/... (privacy.html becomes /privacy,
 *     the address Cloudflare serves it at). Nothing else in the page changes.
 *   - /sitemap.xml: every github.io address becomes the ascoding11.com one.
 *   - /robots.txt: the Sitemap line points at https://ascoding11.com/sitemap.xml.
 * Any other host (ascoding11.github.io never runs this; *.pages.dev previews) and anything that isn't one of
 * those three gets the response untouched, including every /api/* reply.
 *
 * GitHub Pages runs Jekyll, which skips files starting with "_", so this file and /_routes.json are never
 * published on ascoding11.github.io. /_routes.json limits which addresses run Functions at all (each run counts
 * toward Cloudflare's free daily allowance): /api/*, robots.txt, sitemap.xml and the public pages. The Back Room
 * is noindex and isn't listed. When adding a public page that's in sitemap.xml, add its path to /_routes.json too.
 */
const GH = 'https://ascoding11.github.io';
const COM = 'https://ascoding11.com';
const COM_HOST = /^(www\.)?ascoding11\.com$/;

function toCom(u) {
  if (!u || !u.startsWith(GH + '/') && u !== GH) return u;
  return COM + u.slice(GH.length).replace(/\/privacy\.html$/, '/privacy');
}

function fixAttr(name) {
  return { element(el) { const v = el.getAttribute(name); if (v) el.setAttribute(name, toCom(v)); } };
}

function textResponse(res, body) {
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}

export async function onRequest(context) {
  const res = await context.next();
  const url = new URL(context.request.url);
  if (!COM_HOST.test(url.hostname) || res.status !== 200) return res;

  const path = url.pathname;
  if (path === '/robots.txt') {
    const t = await res.text();
    return textResponse(res, t.replace(/^Sitemap:.*$/im, 'Sitemap: ' + COM + '/sitemap.xml'));
  }
  if (path === '/sitemap.xml') {
    const t = await res.text();
    return textResponse(res, t.replace(/<loc>([^<]*)<\/loc>/g, (m, u) => '<loc>' + toCom(u) + '</loc>'));
  }
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;

  return new HTMLRewriter()
    .on('link[rel="canonical"]', fixAttr('href'))
    .on('meta[property="og:url"]', fixAttr('content'))
    .on('meta[name="twitter:url"]', fixAttr('content'))
    .transform(res);
}
