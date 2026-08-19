const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://ido-vortaro.pages.dev';
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
const letterNav = letters
  .map((l) => `<a href="/browse/${l}-1">${letterLabel(l)}</a>`)
  .join(' ');
const browsePage = ({ letter, pageNo, pageCount, items, prev, next }) => `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ido-vorti per "${letterLabel(letter)}" (${pageNo}/${pageCount}) — Ido-Esperanto Vortaro</title>
    <meta name="description" content="Listo di Ido-vorti komencanta per '${letterLabel(letter)}' kun Esperanto-traduki — pagino ${pageNo} de ${pageCount}. ${escapeHtml(items.slice(0, 5).map((i) => i.lemma).join(', '))}…">
    <link rel="canonical" href="${DOMAIN}/browse/${letter}-${pageNo}">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; color: #333; }
        h1 { color: #1f3f7a; font-size: 1.4em; }
        nav.letters { margin: 10px 0; line-height: 2; } nav.letters a { margin-right: 6px; text-decoration: none; color: #1f3f7a; font-weight: 600; }
        ul { list-style: none; padding: 0; column-width: 22em; column-gap: 2em; } li { margin-bottom: 2px; break-inside: avoid; }
        a { color: #1f3f7a; } .eo { color: #555; }
        .pager { margin: 16px 0; } .pager a { margin-right: 12px; }
    </style>
</head>
<body>
    <p><a href="/">« Ido-Esperanto Vortaro</a> · <a href="/browse/">Indexo</a></p>
    <nav class="letters">${letterNav}</nav>
    <h1>Ido-vorti per "${letterLabel(letter)}" — pagino ${pageNo} de ${pageCount}</h1>
    <ul>
${items.map(({ lemma, data }) => `        <li><a href="/io-eo/${encodeURIComponent(lemma)}">${escapeHtml(lemma)}</a> <span class="eo">→ ${escapeHtml(data.e.slice(0, 3).join(', '))}</span></li>`).join('\n')}
    </ul>
    <div class="pager">
        ${prev ? `<a href="/browse/${letter}-${prev}">« Antea pagino</a>` : ''}
        ${next ? `<a href="/browse/${letter}-${next}">Sequanta pagino »</a>` : ''}
    </div>
</body>
</html>
`;
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
const browseIndex = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indexo di Ido-vorti — Ido-Esperanto Vortaro</title>
    <meta name="description" content="Alfabetala indexo di ${wordData.length.toLocaleString('en-US')} Ido-vorti kun Esperanto-traduki en la senpaga Ido-Esperanto vortaro.">
    <link rel="canonical" href="${DOMAIN}/browse/">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; color: #333; }
        h1 { color: #1f3f7a; } a { color: #1f3f7a; } li { margin-bottom: 4px; }
    </style>
</head>
<body>
    <p><a href="/">« Ido-Esperanto Vortaro</a></p>
    <h1>Indexo di Ido-vorti</h1>
    <ul>
${letters.map((l) => `        <li><a href="/browse/${l}-1">${letterLabel(l)}</a> — ${Object.keys(shards[l]).length.toLocaleString('en-US')} vorti</li>`).join('\n')}
    </ul>
</body>
</html>
`;
fs.writeFileSync(path.join(browseDir, 'index.html'), browseIndex);
console.log(`✅ Browse pages: ${browseUrls.length} letter pages + index in browse/.`);

// Generate sitemap. No lastmod on word URLs: stamping 38k URLs with every
// deploy date teaches Google to distrust lastmod site-wide.
const now = new Date().toISOString().split('T')[0];

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>
  <url><loc>${DOMAIN}/about-io.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-en.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-eo.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/browse/</loc><priority>0.7</priority></url>
`;

browseUrls.forEach((u) => {
  sitemap += `  <url><loc>${DOMAIN}${u}</loc><priority>0.5</priority></url>\n`;
});

wordData.forEach(({ lemma }) => {
  sitemap += `  <url><loc>${DOMAIN}/io-eo/${encodeURIComponent(lemma)}</loc><priority>0.6</priority></url>\n`;
});

sitemap += '</urlset>';

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);
console.log(`✅ SEO Generation complete: sitemap.xml updated with ${wordData.length}/${entries.length} dynamic routes (entries with translations).`);

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
console.log(`✅ SEO shards: ${shardCount} files in seo/ (${wordData.length}/${entries.length} entries with translations) for body SSR.`);
