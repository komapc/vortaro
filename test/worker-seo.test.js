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
    <link rel="canonical" href="https://ido-vortaro.pages.dev/">
  </head><body><div id="results" class="results"></div></body></html>`;

const HUNDO_SHARD = { hundo: { e: ['hundo'], m: ['o__n'] } };

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
