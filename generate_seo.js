const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://vortaro.komapc.workers.dev';
const DICTIONARY_PATH = path.join(__dirname, 'dictionary.json');
const OUTPUT_DIR = path.join(__dirname, 'v');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const dictionary = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
const entries = dictionary.entries || [];

console.log(`Processing ${entries.length} entries...`);

// 1. Generate Sitemap
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc><priority>1.0</priority></url>
`;

// 2. Generate Static HTML for Top 1000 words
const topEntries = entries.slice(0, 1000);

topEntries.forEach((entry, index) => {
  const lemma = entry.lemma;
  const eoTranslations = (entry.translations || [])
    .filter(t => t.lang === 'eo')
    .map(t => t.term)
    .join(', ');
  
  const fileName = `${encodeURIComponent(lemma)}.html`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  
  const html = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <title>${lemma} - Ido to Esperanto Translation</title>
    <meta name="description" content="Translate '${lemma}' from Ido to Esperanto: ${eoTranslations}. Free online Ido-Esperanto dictionary.">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="canonical" href="${DOMAIN}/v/${fileName}">
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }
        .card { border: 1px solid #eee; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #1f3f7a; }
        .trans { font-size: 1.2em; font-weight: bold; color: #1f7a3a; }
        .back { margin-top: 20px; display: inline-block; text-decoration: none; color: #1f3f7a; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${lemma}</h1>
        <p>Ido word</p>
        <div class="trans">→ ${eoTranslations || 'Nula traduko trovita'}</div>
        <a href="${DOMAIN}/#io-eo:${lemma}" class="back">Vidar en la vortaro completa</a>
    </div>
</body>
</html>`;

  fs.writeFileSync(filePath, html);
  sitemap += `  <url><loc>${DOMAIN}/v/${fileName}</loc><priority>0.8</priority></url>\n`;
});

sitemap += '</urlset>';
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);

console.log('SEO Generation complete: sitemap.xml and /v/ directory updated.');
