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

// Generate sitemap
const now = new Date().toISOString().split('T')[0];

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>
  <url><loc>${DOMAIN}/about-io.html</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-en.html</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-eo.html</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>
`;

entries.forEach((entry) => {
  const lemma = entry.lemma;
  if (!lemma) return;
  const encoded = encodeURIComponent(lemma);
  sitemap += `  <url><loc>${DOMAIN}/io-eo/${encoded}</loc><lastmod>${now}</lastmod><priority>0.6</priority></url>\n`;
});

sitemap += '</urlset>';

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);
console.log(`✅ SEO Generation complete: sitemap.xml updated with ${entries.length} dynamic routes.`);
