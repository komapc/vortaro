/**
 * Search ranking + page-shell asset URLs.
 *
 * app.js is a browser script with no exports, so sortByRelevance is pulled
 * out of the source (between its declaration and the END marker) and
 * evaluated on its own.
 */

const fs = require('fs');
const path = require('path');

const appSrc = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const start = appSrc.indexOf('function sortByRelevance(');
const end = appSrc.indexOf('// END sortByRelevance');
// eslint-disable-next-line no-new-func
const sortByRelevance = new Function(`${appSrc.slice(start, end)}; return sortByRelevance;`)();

const entry = (ido, ...esperanto) => ({ ido, esperanto });

describe('sortByRelevance', () => {
    test('exact match comes first even when it is late in dictionary order', () => {
        const hits = [entry('balar'), entry('kalo'), entry('lagro'), entry('la')];
        const out = sortByRelevance(hits, 'la', 'io-eo', new Set());
        expect(out[0].ido).toBe('la');
    });

    test('exact survives the 50-result cut among many substring hits', () => {
        const hits = Array.from({ length: 200 }, (_, i) => entry(`xorx${i}`));
        hits.push(entry('or'));
        const out = sortByRelevance(hits, 'or', 'io-eo', new Set()).slice(0, 50);
        expect(out.map(e => e.ido)).toContain('or');
    });

    test('tiers: exact, lemma, prefix, substring; shorter first within a tier', () => {
        const hits = [entry('xhabitas'), entry('habitasulo'), entry('habitas'), entry('habitar'), entry('yhabitasi'), entry('habitaso')];
        const out = sortByRelevance(hits, 'habitas', 'io-eo', new Set(['habitar']));
        expect(out.map(e => e.ido)).toEqual(
            ['habitas', 'habitar', 'habitaso', 'habitasulo', 'xhabitas', 'yhabitasi']);
    });

    test('eo-io ranks by the best-matching Esperanto word', () => {
        const hits = [entry('hundeto', 'hundeto'), entry('hundo', 'ĉashundo', 'hundo')];
        const out = sortByRelevance(hits, 'hundo', 'eo-io', new Set());
        expect(out[0].ido).toBe('hundo');
    });
});

describe('index.html shell', () => {
    // Per-word pages are served at /io-eo/<word>; a relative asset URL
    // resolves under /io-eo/ and 404s (unstyled page, no JS).
    test('has no relative asset URLs', () => {
        const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
        const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
        const relative = refs.filter(u => !/^(\/|https?:|mailto:|#|data:)/.test(u));
        expect(relative).toEqual([]);
        expect(html).toMatch(/serviceWorker\.register\('\/sw\.js'\)/);
    });

    test('app.js fetches the dictionary by absolute path', () => {
        expect(appSrc).toMatch(/fetch\('\/dictionary\.json'\)/);
    });
});
