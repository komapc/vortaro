/**
 * @jest-environment node
 *
 * Regression coverage for the "ASSETS.fetch(new Request(new URL(...), request))
 * returns 404" class of bug (fixed in commit 220228942 for the pretty-URL
 * handler; the same broken pattern also existed, unfixed, in the SPA-fallback
 * and catch-all branches further down in _worker.js).
 *
 * _worker.js is an ES module (`export default { fetch }`) but this repo has
 * no Babel/ESM transform configured for Jest, so we load it by rewriting the
 * one `export default` into a global assignment and evaluating it. This
 * requires real Fetch API globals (Request/Response/URL/Headers), which the
 * "node" test environment provides natively (Node >= 18) — hence the pragma
 * above overriding this project's default jsdom environment.
 */

const fs = require('fs');
const path = require('path');

function loadWorker() {
  const code = fs
    .readFileSync(path.join(__dirname, '../_worker.js'), 'utf8')
    .replace('export default', 'globalThis.__vortaroWorker =');
  // Indirect eval => runs in global scope, so the assignment above lands on
  // the real globalThis and all Node fetch-API globals are already in scope.
  (0, eval)(code);
  return globalThis.__vortaroWorker;
}

const worker = loadWorker();

const GENERIC_TITLE = '<title>Ido-Esperanto Vortaro</title>';
const INDEX_HTML = `<!doctype html><html><head>
    ${GENERIC_TITLE}
    <meta name="description" content="GENERIC DESCRIPTION">
    <meta property="og:title" content="GENERIC OG TITLE">
    <meta property="og:description" content="GENERIC OG DESCRIPTION">
    <meta property="og:url" content="https://ido-vortaro.pages.dev/">
    <meta property="og:type" content="website">
    <meta property="og:image" content="https://ido-vortaro.pages.dev/og-image.png">
    <meta property="twitter:title" content="GENERIC TW TITLE">
    <meta property="twitter:description" content="GENERIC TW DESCRIPTION">
    <link rel="canonical" href="https://ido-vortaro.pages.dev/">
  </head><body><div id="results" class="results"></div></body></html>`;

const HUNDO_SHARD = {
  hundo: { e: ['hundo'], m: ['o__n'] },
  Hamburg: { e: ['Hamburgo'], m: ['o__n'] },
};

// Minimal env.ASSETS mock. `behavior` lets each test steer what the "origin"
// static-asset fetch (first call, made with the real request) does, while
// /index.html and /seo/*.json are served from fixtures.
function makeEnv({ throwOnOrigin = false, originStatus = 404, indexStatus = 200 } = {}) {
  const fetch = jest.fn(async (input) => {
    const reqUrl = new URL(input instanceof Request ? input.url : input);

    if (reqUrl.pathname === '/index.html') {
      return indexStatus === 200
        ? new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } })
        : new Response('server error', { status: indexStatus });
    }
    if (reqUrl.pathname === '/seo/h.json') {
      return new Response(JSON.stringify(HUNDO_SHARD), { status: 200 });
    }
    if (throwOnOrigin) throw new TypeError('network error');
    return new Response('not found', { status: originStatus });
  });
  return { ASSETS: { fetch } };
}

describe('_worker.js fetch handler — ASSETS.fetch call sites', () => {
  test('(a) valid per-word pretty URL: injects real title/body, not the generic shell', async () => {
    const env = makeEnv();
    const request = new Request('https://ido-vortaro.pages.dev/io-eo/hundo');

    const res = await worker.fetch(request, env);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('hundo → hundo — Ido-Esperanto Vortaro');
    expect(html).toContain('<div id="results" class="results"><div class="result-item">');
    expect(html).not.toContain(GENERIC_TITLE);

    // The /index.html fetch must be a clean URL/GET, never a rehomed Request
    // carrying the original /io-eo/hundo request as init (that construction
    // is what made ASSETS 404 pre-fix).
    const indexCall = env.ASSETS.fetch.mock.calls.find(
      ([arg]) => new URL(arg instanceof Request ? arg.url : arg).pathname === '/index.html'
    );
    expect(indexCall[0]).not.toBeInstanceOf(Request);
  });

  test('(b) unmatched extensionless route falls back to a clean index.html fetch', async () => {
    const env = makeEnv({ originStatus: 404 });
    const request = new Request('https://ido-vortaro.pages.dev/some-unknown-route');

    const res = await worker.fetch(request, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(GENERIC_TITLE); // unmodified SPA shell is correct here

    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(2);
    const secondArg = env.ASSETS.fetch.mock.calls[1][0];
    expect(secondArg).not.toBeInstanceOf(Request);
    expect(new URL(secondArg).pathname).toBe('/index.html');
  });

  test('(c) exception during the static-asset fetch is caught and falls back cleanly', async () => {
    const env = makeEnv({ throwOnOrigin: true });
    const request = new Request('https://ido-vortaro.pages.dev/some-route-that-throws');

    const res = await worker.fetch(request, env);
    expect(res.status).toBe(200);

    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(2);
    const secondArg = env.ASSETS.fetch.mock.calls[1][0];
    expect(secondArg).not.toBeInstanceOf(Request);
    expect(new URL(secondArg).pathname).toBe('/index.html');
  });

  test('genuine index.html failure on the pretty-URL path is passed through, not faked as 200', async () => {
    const env = makeEnv({ indexStatus: 500 });
    const request = new Request('https://ido-vortaro.pages.dev/io-eo/hundo');

    const res = await worker.fetch(request, env);
    expect(res.status).toBe(500);
  });
});

describe('_worker.js SEO meta handling', () => {
  test('word pages strip ALL replaced static tags (description/og/twitter/canonical), keep og:type/og:image', async () => {
    const res = await worker.fetch(new Request('https://ido-vortaro.pages.dev/io-eo/hundo'), makeEnv());
    const html = await res.text();

    // No duplicates of anything the worker re-injects — OG parsers take the
    // first occurrence, so a surviving generic tag wins over the injected one.
    expect(html).not.toContain('GENERIC DESCRIPTION');
    expect(html).not.toContain('GENERIC OG TITLE');
    expect(html).not.toContain('GENERIC OG DESCRIPTION');
    expect(html).not.toContain('GENERIC TW TITLE');
    expect(html).not.toContain('GENERIC TW DESCRIPTION');
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain('href="https://ido-vortaro.pages.dev/io-eo/hundo"');
    // Tags the worker does NOT re-inject survive.
    expect(html).toContain('property="og:type"');
    expect(html).toContain('property="og:image"');
  });

  test('unknown io-eo word returns 404 (rendered SPA, honest status — no soft-404s)', async () => {
    const res = await worker.fetch(new Request('https://ido-vortaro.pages.dev/io-eo/zzznotaword'), makeEnv());
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('<div id="results" class="results">'); // page still works for humans
  });

  test('capitalized lemma is found from a lowercase URL', async () => {
    const res = await worker.fetch(new Request('https://ido-vortaro.pages.dev/io-eo/hamburg'), makeEnv());
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Hamburgo');
  });

  test('eo-io pages are noindexed (no shard data, not sitemapped) and carry no canonical', async () => {
    const res = await worker.fetch(new Request('https://ido-vortaro.pages.dev/eo-io/hundo'), makeEnv());
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('rel="canonical"');
  });

  test('word pages SSR internal links: alphabetical neighbors + exact browse page', async () => {
    const res = await worker.fetch(new Request('https://ido-vortaro.pages.dev/io-eo/hundo'), makeEnv());
    const html = await res.text();
    expect(html).toContain('class="related-words"');
    expect(html).toContain('<a href="/io-eo/Hamburg">Hamburg</a>'); // shard neighbor
    expect(html).toContain('<a href="/browse/h-1">'); // idx 1, page size 500 -> page 1
  });

  test('legacy /?q= URLs 301-redirect to the pretty path', async () => {
    const res = await worker.fetch(
      new Request('https://ido-vortaro.pages.dev/?q=hundo&dir=eo-io'),
      makeEnv()
    );
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://ido-vortaro.pages.dev/eo-io/hundo');
  });
});
