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

// Generate sitemap. No lastmod on word URLs: stamping 38k URLs with every
// deploy date teaches Google to distrust lastmod site-wide.
const now = new Date().toISOString().split('T')[0];

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>
  <url><loc>${DOMAIN}/about-io.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-en.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-eo.html</loc><priority>0.7</priority></url>
`;

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
const shardKey = (lemma) => {
  const c = (lemma[0] || '_').toLowerCase();
  return /[a-z]/.test(c) ? c : '_';
};
const shards = {};
wordData.forEach(({ lemma, data }) => {
  const k = shardKey(lemma);
  (shards[k] || (shards[k] = {}))[lemma] = data;
});
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
