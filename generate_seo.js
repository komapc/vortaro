const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://vortaro.lipu.dev';
const DICTIONARY_PATH = path.join(__dirname, 'dictionary.json');
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const VERSION = PKG.version;

const dictionary = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
// Support both old array format (dictionary.entries) and new dict-keyed format
const entries = Array.isArray(dictionary.entries)
  ? dictionary.entries
  : Object.keys(dictionary).filter(k => k !== 'metadata').map(k => ({ lemma: k }));

console.log(`Generating sitemap for ${entries.length} entries...`);

// Inject version into sw.js CACHE_NAME so every deploy with a bumped package.json
// automatically invalidates the browser cache.
const swPath = path.join(__dirname, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = 'vortaro-v[^']*';/, `const CACHE_NAME = 'vortaro-v${VERSION}';`);
fs.writeFileSync(swPath, sw);
console.log(`✅ sw.js cache name set to vortaro-v${VERSION}`);

// Inject version into app.js VERSION constant.
const appPath = path.join(__dirname, 'app.js');
let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(/const VERSION = '[^']*';/, `const VERSION = '${VERSION}';`);
fs.writeFileSync(appPath, app);
console.log(`✅ app.js VERSION set to ${VERSION}`);

// Inject the real entry count into index.html and manifest.json so the
// public claims ("20,000+ Entries") can never go stale against the data.
const roundedCount = `${(Math.floor(entries.length / 1000) * 1000).toLocaleString('en-US')}`;
const indexPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml.replace(/[\d,.]+\+ (Entries|entries)/g, `${roundedCount}+ $1`);
// Exact count into the footer's wordCount span. This must be pre-rendered:
// the footer is the largest text block in the mobile viewport, and growing it
// at dictionary-load time ("..." -> "37,997") registered a new, larger LCP
// candidate at ~5.5s. With the real number in the static HTML, app.js finds
// the text already correct and never repaints it (it skips same-value writes).
indexHtml = indexHtml.replace(/(<span id="wordCount">)[^<]*(<\/span>)/, `$1${entries.length.toLocaleString('en-US')}$2`);
fs.writeFileSync(indexPath, indexHtml);
const manifestPath = path.join(__dirname, 'manifest.json');
let manifest = fs.readFileSync(manifestPath, 'utf8');
manifest = manifest.replace(/[\d,.]+\+ (Entries|entries)/g, `${roundedCount}+ $1`);
fs.writeFileSync(manifestPath, manifest);
console.log(`✅ Entry count injected into index.html + manifest.json: ${roundedCount}+`);

// --- Per-entry data (translations + paradigm) ------------------------------
// Computed once, used by BOTH the sitemap and the SEO shards so they stay
// consistent: an entry without Esperanto translations gets no shard data,
// and the worker 404s its page — so it must not be sitemapped either.
function entryData(entry) {
  // array format carries translations on the entry itself
  if (Array.isArray(dictionary.entries)) {
    return {
      e: (entry.translations || []).filter((t) => t.lang === 'eo').map((t) => t.term),
      m: entry.morphology?.paradigm ? [entry.morphology.paradigm] : [],
    };
  }
  // dict-keyed format: dictionary[lemma] = {esperanto_words, morfologio}
  const d = dictionary[entry.lemma];
  if (d) return { e: d.esperanto_words || [], m: d.morfologio || [] };
  return { e: [], m: [] };
}
const wordData = entries
  .filter((entry) => entry.lemma)
  .map((entry) => ({ lemma: entry.lemma, data: entryData(entry) }))
  .filter(({ data }) => data.e.length);

// --- Per-letter grouping (shared by shards, browse pages, sitemap) ---------
const shardKey = (lemma) => {
  const c = (lemma[0] || '_').toLowerCase();
  return /[a-z]/.test(c) ? c : '_';
};
const shards = {};
wordData.forEach(({ lemma, data }) => {
  const k = shardKey(lemma);
  (shards[k] || (shards[k] = {}))[lemma] = data;
});

// --- Esperanto -> Ido inverted shards (/eo-io/<word>) -----------------------
// Same data, other direction: every Esperanto translation becomes a headword
// whose page lists the Ido lemmas translating to it. Case variants are merged
// under one key (lowercase preferred) so they cannot become duplicate pages,
// and entries whose only Ido translation is the identical string (proper
// nouns: Aachen -> Aachen) are skipped — they would just mirror the io-eo page.
const eoShardKey = (w) => {
  const c = ((w.normalize('NFD')[0]) || '_').toLowerCase();
  return /[a-z]/.test(c) ? c : '_';
};
const EO_IDO_MAX = 10;
const eoGroups = new Map(); // lowercase -> { variants: Map(variant -> count), ido: [], m: [] }
wordData.forEach(({ lemma, data }) => {
  for (const raw of data.e) {
    const w = String(raw).trim();
    if (!w || w.length > 60 || /[/?#\\%]/.test(w)) continue;
    const lc = w.toLowerCase();
    let g = eoGroups.get(lc);
    if (!g) { g = { variants: new Map(), ido: [], m: data.m }; eoGroups.set(lc, g); }
    g.variants.set(w, (g.variants.get(w) || 0) + 1);
    if (!g.ido.includes(lemma) && g.ido.length < EO_IDO_MAX) g.ido.push(lemma);
  }
});
const eoShards = {};
let eoSkippedIdentical = 0;
for (const [lc, g] of eoGroups) {
  const variants = [...g.variants.keys()];
  const key = variants.includes(lc)
    ? lc
    : variants.sort((x, y) => (g.variants.get(y) - g.variants.get(x)) || (x < y ? -1 : 1))[0];
  if (g.ido.every((i) => i.toLowerCase() === lc)) { eoSkippedIdentical++; continue; }
  const k = eoShardKey(key);
  (eoShards[k] || (eoShards[k] = {}))[key] = { i: g.ido, m: g.m };
}
const eoLetters = Object.keys(eoShards).sort();
const eoCount = eoLetters.reduce((n, l) => n + Object.keys(eoShards[l]).length, 0);
console.log(`✅ Esperanto→Ido: ${eoCount} headwords in ${eoLetters.length} shards (${eoSkippedIdentical} identical-string entries skipped).`);

// --- Thin pages + cross-direction links (encoded in the shards) -------------
// Multi-word headwords (mostly Wikipedia titles: "AFK Ajax", "Gottlob Frege")
// and Capitalized single words whose only translation is the same string
// (Aachen -> Aachen) carry no dictionary content beyond the name itself. Their
// pages keep working but are flagged t:1: the worker marks them noindex,follow
// and they are left out of the sitemaps. Decided here ONCE so the worker never
// re-implements the heuristic.
const isThin = (headword, targets) => /\s/.test(headword)
  || (/^\p{Lu}/u.test(headword) && targets.length > 0
    && targets.every((t) => String(t).toLowerCase() === headword.toLowerCase()));
const eoKeyOf = (w) => {
  const s = eoShards[eoShardKey(w)];
  if (!s) return null;
  return [w, w.toLowerCase()].find((c) => s[c]) || null;
};
const ioKeyOf = (w) => {
  const s = shards[shardKey(w)];
  if (!s) return null;
  return [w, w.toLowerCase(), w.charAt(0).toUpperCase() + w.slice(1)].find((c) => s[c]) || null;
};
let thinIo = 0; let thinEo = 0; let pairCount = 0;
for (const shard of Object.values(shards)) {
  for (const [lemma, data] of Object.entries(shard)) {
    if (isThin(lemma, data.e)) { data.t = 1; thinIo++; }
    // r: translations that have their own /eo-io/ page (linked from the gloss).
    const r = data.e.filter((w) => eoKeyOf(String(w).trim()) === String(w).trim());
    if (r.length) data.r = r;
    // x: the same string is also an Esperanto headword (/eo-io/<x>) — a
    // different word in the other direction, cross-linked from this page.
    const x = eoKeyOf(lemma);
    if (x) { data.x = x; pairCount++; }
  }
}
for (const shard of Object.values(eoShards)) {
  for (const [key, data] of Object.entries(shard)) {
    if (isThin(key, data.i)) { data.t = 1; thinEo++; }
    const x = ioKeyOf(key);
    if (x) data.x = x;
  }
}
console.log(`✅ Thin (noindex, not sitemapped): ${thinIo} io-eo + ${thinEo} eo-io pages; ${pairCount} io-eo/eo-io same-string pairs cross-linked.`);

// --- A–Z browse pages (/browse/<letter>-<n>) --------------------------------
// The word pages were sitemap-only orphans (zero internal links), which search
// engines index reluctantly: Yandex had 1 of 38k pages searchable. These hub
// pages give every word page an inbound crawl path, and the worker links each
// word page back to its exact browse page — a fully connected graph.
// MUST match BROWSE_PAGE_SIZE and the default-.sort() key order in _worker.js:
// the worker computes "which browse page is this word on" from the same list.
const BROWSE_PAGE_SIZE = 500;
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const letterLabel = (l) => (l === '_' ? '#' : l.toUpperCase());
const letters = Object.keys(shards).sort();
// dir 'io-eo' (default, slug = letter) or 'eo-io' (slug = eo-<letter>).
const browsePage = ({ letter, pageNo, pageCount, items, prev, next, dir = 'io-eo' }) => {
const eo = dir === 'eo-io';
const slug = eo ? `eo-${letter}` : letter;
const nav = (eo ? eoLetters : letters)
  .map((l) => `<a href="/browse/${eo ? 'eo-' : ''}${l}-1">${letterLabel(l)}</a>`)
  .join(' ');
const headWords = eo ? 'Esperanto-vorti' : 'Ido-vorti';
const itemRows = items.map(({ lemma, data }) => {
  const targets = eo ? data.i : data.e;
  const targetLinks = eo
    ? targets.slice(0, 3).map((t) => `<a href="/io-eo/${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join(', ')
    : escapeHtml(targets.slice(0, 3).join(', '));
  return `        <li><a href="/${dir}/${encodeURIComponent(lemma)}">${escapeHtml(lemma)}</a> <span class="eo">→ ${targetLinks}</span></li>`;
}).join('\n');
return `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headWords} per "${letterLabel(letter)}" (${pageNo}/${pageCount}) — ${eo ? 'Esperanto-Ido' : 'Ido-Esperanto'} Vortaro</title>
    <meta name="description" content="Listo di ${headWords} komencanta per '${letterLabel(letter)}' kun ${eo ? 'Ido' : 'Esperanto'}-traduki — pagino ${pageNo} de ${pageCount}. ${escapeHtml(items.slice(0, 5).map((i) => i.lemma).join(', '))}…">
    <link rel="canonical" href="${DOMAIN}/browse/${slug}-${pageNo}">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; color: #333; }
        h1 { color: #1f3f7a; font-size: 1.4em; }
        nav.letters { margin: 10px 0; line-height: 2; } nav.letters a { margin-right: 6px; text-decoration: none; color: #1f3f7a; font-weight: 600; }
        ul { list-style: none; padding: 0; column-width: 22em; column-gap: 2em; } li { margin-bottom: 2px; break-inside: avoid; }
        a { color: #1f3f7a; } .eo { color: #555; }
        .pager { margin: 16px 0; } .pager a { margin-right: 12px; }
    </style>
    <link rel="stylesheet" href="/subpage.css">
</head>
<body>
    <p><a href="/">« Ido-Esperanto Vortaro</a> · <a href="/browse/">Indexo</a></p>
    <nav class="letters">${nav}</nav>
    <h1>${headWords} per "${letterLabel(letter)}" — pagino ${pageNo} de ${pageCount}</h1>
    <ul>
${itemRows}
    </ul>
    <div class="pager">
        ${prev ? `<a href="/browse/${slug}-${prev}">« Antea pagino</a>` : ''}
        ${next ? `<a href="/browse/${slug}-${next}">Sequanta pagino »</a>` : ''}
    </div>
    ${pageCount > 1 ? `<div class="pager pages">${Array.from({ length: pageCount }, (_, i) => i + 1)
      .map((n) => (n === pageNo ? `<strong>${n}</strong>` : `<a href="/browse/${slug}-${n}">${n}</a>`)).join(' ')}</div>` : ''}
</body>
</html>
`;
};
const browseDir = path.join(__dirname, 'browse');
fs.mkdirSync(browseDir, { recursive: true });
for (const f of fs.readdirSync(browseDir)) {
  if (f.endsWith('.html')) fs.unlinkSync(path.join(browseDir, f));
}
const browseUrls = [];
letters.forEach((letter) => {
  // Default .sort() (code-unit order), same as the worker — do not localeCompare.
  const lemmas = Object.keys(shards[letter]).sort();
  const pageCount = Math.ceil(lemmas.length / BROWSE_PAGE_SIZE);
  for (let p = 1; p <= pageCount; p++) {
    const items = lemmas
      .slice((p - 1) * BROWSE_PAGE_SIZE, p * BROWSE_PAGE_SIZE)
      .map((lemma) => ({ lemma, data: shards[letter][lemma] }));
    fs.writeFileSync(
      path.join(browseDir, `${letter}-${p}.html`),
      browsePage({ letter, pageNo: p, pageCount, items, prev: p > 1 ? p - 1 : null, next: p < pageCount ? p + 1 : null })
    );
    browseUrls.push(`/browse/${letter}-${p}`);
  }
});
eoLetters.forEach((letter) => {
  const lemmas = Object.keys(eoShards[letter]).sort(); // same default order as the worker
  const pageCount = Math.ceil(lemmas.length / BROWSE_PAGE_SIZE);
  for (let p = 1; p <= pageCount; p++) {
    const items = lemmas
      .slice((p - 1) * BROWSE_PAGE_SIZE, p * BROWSE_PAGE_SIZE)
      .map((lemma) => ({ lemma, data: eoShards[letter][lemma] }));
    fs.writeFileSync(
      path.join(browseDir, `eo-${letter}-${p}.html`),
      browsePage({ letter, pageNo: p, pageCount, items, dir: 'eo-io', prev: p > 1 ? p - 1 : null, next: p < pageCount ? p + 1 : null })
    );
    browseUrls.push(`/browse/eo-${letter}-${p}`);
  }
});
const browseIndex = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indexo di Ido-vorti — Ido-Esperanto Vortaro</title>
    <meta name="description" content="Alfabetala indexo di ${wordData.length.toLocaleString('en-US')} Ido-vorti kun Esperanto-traduki en la senpaga Ido-Esperanto vortaro.">
    <link rel="canonical" href="${DOMAIN}/browse/">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; color: #333; }
        h1 { color: #1f3f7a; } a { color: #1f3f7a; } li { margin-bottom: 4px; }
    </style>
    <link rel="stylesheet" href="/subpage.css">
</head>
<body>
    <p><a href="/">« Ido-Esperanto Vortaro</a></p>
    <h1>Indexo di Ido-vorti</h1>
    <ul>
${letters.map((l) => `        <li><a href="/browse/${l}-1">${letterLabel(l)}</a> — ${Object.keys(shards[l]).length.toLocaleString('en-US')} vorti</li>`).join('\n')}
    </ul>
    <h2>Indexo di Esperanto-vorti</h2>
    <ul>
${eoLetters.map((l) => `        <li><a href="/browse/eo-${l}-1">${letterLabel(l)}</a> — ${Object.keys(eoShards[l]).length.toLocaleString('en-US')} vorti</li>`).join('\n')}
    </ul>
</body>
</html>
`;
fs.writeFileSync(path.join(browseDir, 'index.html'), browseIndex);
console.log(`✅ Browse pages: ${browseUrls.length} letter pages + index in browse/.`);

// --- Homepage static content (index.html, between <!-- seo:* --> markers) ---
// The homepage was ~66 words of SPA chrome ("Crawled – currently not indexed").
// The prose lives in index.html; the data-dependent parts — counts, A–Z hub
// links, a core-vocabulary list — are regenerated here between markers, so
// reruns are idempotent. The worker strips the whole #home-intro block from
// word pages (it would otherwise repeat on all of them).
// No frequency data in the dictionary: hand-picked everyday words, kept only
// when they have a real page (no 404s, no identical-string 301s).
const CORE_IDO = [
  'la', 'e', 'di', 'en', 'kun', 'por', 'ne', 'yes', 'me', 'tu', 'il', 'el', 'ni', 'li',
  'esar', 'havar', 'facar', 'irar', 'venar', 'vidar', 'parolar', 'dicar', 'savar', 'povar',
  'volar', 'donar', 'manjar', 'drinkar', 'dormar', 'laborar', 'lernar', 'skribar', 'lektar', 'amar',
  'homo', 'viro', 'muliero', 'infanto', 'amiko', 'familio', 'patro', 'matro', 'domo', 'urbo',
  'lando', 'linguo', 'vorto', 'libro', 'skolo', 'aquo', 'pano', 'dio', 'nokto', 'yaro',
  'tempo', 'suno', 'arboro', 'hundo', 'kato', 'bona', 'mala', 'granda', 'mikra', 'nova',
  'bela', 'yuna', 'olda', 'multa',
];
const CORE_EO = [
  'esti', 'havi', 'fari', 'iri', 'veni', 'vidi', 'paroli', 'diri', 'scii', 'povi',
  'voli', 'doni', 'manĝi', 'trinki', 'dormi', 'labori', 'lerni', 'skribi', 'legi', 'ami',
  'virino', 'infano', 'patrino', 'lingvo', 'lernejo', 'akvo', 'tago', 'jaro', 'arbo', 'malgranda',
  'juna', 'maljuna', 'ankaŭ', 'kaj', 'sed', 'kiu',
];
const HOME_CORE_MAX = 70;
const coreIo = CORE_IDO
  .map((w) => [w, shards[shardKey(w)] && shards[shardKey(w)][w]])
  .filter(([, d]) => d && !d.t)
  .slice(0, HOME_CORE_MAX);
const coreEo = CORE_EO
  .map((w) => [w, eoShards[eoShardKey(w)] && eoShards[eoShardKey(w)][w]])
  .filter(([, d]) => d && !d.t)
  .slice(0, HOME_CORE_MAX);
const coreList = (pairs, dir) => pairs.map(([w, d]) => {
  const gloss = (dir === 'io-eo' ? d.e : d.i)[0]; // primary (most reliable) translation
  return `<li><a href="/${dir}/${encodeURIComponent(w)}">${escapeHtml(w)}</a> <span class="gloss">→ ${escapeHtml(gloss)}</span></li>`;
}).join('\n                ');
const letterLinks = (ls, prefix) => ls
  .map((l) => `<a href="/browse/${prefix}${l}-1">${letterLabel(l)}</a>`)
  .join(' ');
const homeBlocks = {
  'io-count': wordData.length.toLocaleString('en-US'),
  'eo-count': eoCount.toLocaleString('en-US'),
  'core-io': `\n                ${coreList(coreIo, 'io-eo')}\n                `,
  'core-eo': `\n                ${coreList(coreEo, 'eo-io')}\n                `,
  'letters-io': letterLinks(letters, ''),
  'letters-eo': letterLinks(eoLetters, 'eo-'),
};
let homeHtml = fs.readFileSync(indexPath, 'utf8');
for (const [name, content] of Object.entries(homeBlocks)) {
  const re = new RegExp(`(<!-- seo:${name} -->)[\\s\\S]*?(<!-- /seo:${name} -->)`);
  if (!re.test(homeHtml)) throw new Error(`index.html is missing the <!-- seo:${name} --> marker`);
  homeHtml = homeHtml.replace(re, (_, open, close) => `${open}${content}${close}`);
}
fs.writeFileSync(indexPath, homeHtml);
console.log(`✅ Homepage content: ${coreIo.length}/${CORE_IDO.length} core Ido + ${coreEo.length}/${CORE_EO.length} core Esperanto words linked.`);

// --- Sitemaps: one index + per-direction/per-letter files -------------------
// lastmod = the dictionary's build date (data version), the same value for
// every URL it covers: it moves only when the dictionary is regenerated, so
// it stays a trustworthy "content changed" signal. Per-letter files keep each
// file far below the 50k-URL / 50MB limits and give Search Console / Bing a
// coverage breakdown by section.
const buildDate = String((dictionary.metadata && dictionary.metadata.last_updated) || '').slice(0, 10)
  || new Date().toISOString().split('T')[0];
for (const f of fs.readdirSync(__dirname)) {
  if (/^sitemap.*\.xml$/.test(f)) fs.unlinkSync(path.join(__dirname, f));
}
const sitemapFiles = [];
const writeSitemap = (name, urls) => {
  if (!urls.length) return 0; // a letter with only thin entries gets no file
  const body = urls
    .map(({ loc, priority }) => `  <url><loc>${DOMAIN}${loc}</loc><lastmod>${buildDate}</lastmod><priority>${priority}</priority></url>`)
    .join('\n');
  fs.writeFileSync(
    path.join(__dirname, name),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  );
  sitemapFiles.push(name);
  return urls.length;
};
const fileLetter = (l) => (l === '_' ? 'misc' : l);

writeSitemap('sitemap-pages.xml', [
  { loc: '/', priority: '1.0' },
  { loc: '/eo-io/', priority: '0.8' },
  { loc: '/about-io', priority: '0.7' },
  { loc: '/about-en', priority: '0.7' },
  { loc: '/about-eo', priority: '0.7' },
  { loc: '/browse/', priority: '0.7' },
  ...browseUrls.map((u) => ({ loc: u, priority: '0.5' })),
]);
let ioEoUrls = 0;
letters.forEach((l) => {
  ioEoUrls += writeSitemap(
    `sitemap-io-eo-${fileLetter(l)}.xml`,
    Object.keys(shards[l]).sort().filter((lemma) => !shards[l][lemma].t)
      .map((lemma) => ({ loc: `/io-eo/${encodeURIComponent(lemma)}`, priority: '0.6' }))
  );
});
let eoIoUrls = 0;
eoLetters.forEach((l) => {
  eoIoUrls += writeSitemap(
    `sitemap-eo-io-${fileLetter(l)}.xml`,
    Object.keys(eoShards[l]).sort().filter((w) => !eoShards[l][w].t)
      .map((w) => ({ loc: `/eo-io/${encodeURIComponent(w)}`, priority: '0.5' }))
  );
});
fs.writeFileSync(
  path.join(__dirname, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + sitemapFiles.map((f) => `  <sitemap><loc>${DOMAIN}/${f}</loc><lastmod>${buildDate}</lastmod></sitemap>`).join('\n')
  + `\n</sitemapindex>\n`
);
console.log(`✅ Sitemap index: ${sitemapFiles.length} files (${ioEoUrls} io-eo + ${eoIoUrls} eo-io word URLs, ${browseUrls.length + 5} pages), lastmod ${buildDate}.`);

// --- Per-letter SEO shards for server-side rendering of word pages ---------
// The _worker.js injects each /io-eo/<word> page's actual translations into the
// HTML body so the word pages have unique, indexable content (not just a
// distinct <title> over the same SPA shell). dictionary.json is 7MB — too big
// to parse per request — so we emit compact first-letter shards {lemma:{e,m}}
// that the worker fetches (one ~200-400KB shard per request, edge-cached).
const seoDir = path.join(__dirname, 'seo');
fs.mkdirSync(seoDir, { recursive: true });
// Clear stale shards so removed letters don't linger.
for (const f of fs.readdirSync(seoDir)) {
  if (f.endsWith('.json')) fs.unlinkSync(path.join(seoDir, f));
}
let shardCount = 0;
for (const [k, obj] of Object.entries(shards)) {
  fs.writeFileSync(path.join(seoDir, `${k}.json`), JSON.stringify(obj));
  shardCount++;
}
for (const [k, obj] of Object.entries(eoShards)) {
  fs.writeFileSync(path.join(seoDir, `eo-${k}.json`), JSON.stringify(obj));
  shardCount++;
}
console.log(`✅ SEO shards: ${shardCount} files in seo/ (${wordData.length}/${entries.length} entries with translations) for body SSR.`);
