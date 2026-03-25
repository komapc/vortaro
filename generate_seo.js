const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://ido-vortaro.pages.dev';
const DICTIONARY_PATH = path.join(__dirname, 'dictionary.json');

const dictionary = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
const entries = dictionary.entries || [];

console.log(`Generating sitemap for ${entries.length} entries...`);

const now = new Date().toISOString().split('T')[0];

// 1. Generate Sitemap Header
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>
  <url><loc>${DOMAIN}/about-io.html</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-en.html</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-eo.html</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>
`;

// 2. Add dynamic word routes
// We point to the SPA routes which the Worker will enhance with meta tags
entries.forEach((entry) => {
  const lemma = entry.lemma;
  if (!lemma) return;
  
  const encoded = encodeURIComponent(lemma);
  sitemap += `  <url><loc>${DOMAIN}/io-eo/${encoded}</loc><priority>0.6</priority></url>\n`;
});

sitemap += '</urlset>';

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);

console.log(`✅ SEO Generation complete: sitemap.xml updated with ${entries.length} dynamic routes.`);
