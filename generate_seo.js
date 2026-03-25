const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://ido-vortaro.pages.dev';
const DICTIONARY_PATH = path.join(__dirname, 'dictionary.json');
const OUTPUT_DIR = path.join(__dirname, 'v');
const BROWSE_DIR = path.join(__dirname, 'browse');

// Ensure directories exist
[OUTPUT_DIR, BROWSE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const dictionary = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
const entries = dictionary.entries || [];

console.log(`Processing ${entries.length} entries for SEO...`);

// 1. Group entries by first letter for "Browse" section
const groups = {};
entries.forEach(entry => {
  const lemma = entry.lemma;
  if (!lemma) return;
  const firstChar = lemma.charAt(0).toUpperCase();
  if (!groups[firstChar]) groups[firstChar] = [];
  groups[firstChar].push(entry);
});

const sortedLetters = Object.keys(groups).sort();

// 2. Generate Sitemap
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc><priority>1.0</priority></url>
  <url><loc>${DOMAIN}/about-io.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-en.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/about-eo.html</loc><priority>0.7</priority></url>
  <url><loc>${DOMAIN}/browse/index.html</loc><priority>0.9</priority></url>
`;

// 3. Generate individual word pages
entries.forEach((entry) => {
  const lemma = entry.lemma;
  const translations = (entry.translations || []).filter(t => t.lang === 'eo');
  const eoTranslations = translations.map(t => t.term).join(', ');
  
  const fileName = `${encodeURIComponent(lemma)}.html`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": lemma,
    "description": `Ido word translated to Esperanto as: ${eoTranslations}`,
    "inDefinedTermSet": DOMAIN,
    "termCode": lemma
  };

  const crossLinks = translations.map(t => {
    return `<a href="${DOMAIN}/eo-io/${encodeURIComponent(t.term)}" class="cross-link">Serchar '${t.term}' en Esperanto → Ido</a>`;
  }).join('<br>');
  
  const html = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <title>${lemma} — Ido-Esperanto Vortaro / Dictionary</title>
    <meta name="description" content="Translate '${lemma}' from Ido to Esperanto: ${eoTranslations}. Senpaga online Ido-Esperanto vortaro ed vortlibro.">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="canonical" href="${DOMAIN}/v/${fileName}">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; background-color: #f8f9fa; }
        .card { background: white; border: 1px solid #eee; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #1f3f7a; margin-top: 0; }
        .trans { font-size: 1.4em; font-weight: bold; color: #1f7a3a; margin: 20px 0; }
        .back { margin-top: 20px; display: inline-block; text-decoration: none; color: #1f3f7a; font-weight: bold; }
        .cross-links { margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.9em; }
        .cross-link { color: #666; text-decoration: none; display: block; margin-bottom: 5px; }
        .cross-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${lemma}</h1>
        <p>Vorto en Ido</p>
        <div class="trans">→ ${eoTranslations || 'Nula traduko trovita'}</div>
        <a href="${DOMAIN}/io-eo/${encodeURIComponent(lemma)}" class="back">Vidar en la vortaro completa</a>
        <div class="cross-links">
            ${crossLinks}
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(filePath, html);
  sitemap += `  <url><loc>${DOMAIN}/v/${fileName}</loc><priority>0.8</priority></url>\n`;
});

// 4. Generate Browse Index
const browseIndexHtml = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <title>Foliumar Vortaro — Browse Ido-Esperanto Dictionary</title>
    <meta name="description" content="Browse the Ido-Esperanto dictionary by letter. Foliumar la Ido-Esperanto vortaro segun litero.">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; background-color: #f8f9fa; }
        .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #1f3f7a; }
        .letters { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .letter-link { display: block; width: 40px; height: 40px; line-height: 40px; text-align: center; background: #1f3f7a; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .letter-link:hover { background: #2a5298; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Foliumar la Vortaro</h1>
        <p>Selektez litero por vidar omna vorti:</p>
        <div class="letters">
            ${sortedLetters.map(l => `<a href="${l}.html" class="letter-link">${l}</a>`).join('')}
        </div>
        <br><br>
        <a href="../">← Retro a la precipua pagino</a>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(BROWSE_DIR, 'index.html'), browseIndexHtml);

// 5. Generate individual letter browse pages
sortedLetters.forEach(letter => {
  const letterEntries = groups[letter].sort((a, b) => a.lemma.localeCompare(b.lemma));
  const fileName = `${letter}.html`;
  
  const letterHtml = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <title>Vorti komencanta per ${letter} — Ido-Esperanto Dictionary</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; background-color: #f8f9fa; }
        .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #1f3f7a; }
        .word-list { column-count: 3; column-gap: 20px; }
        @media (max-width: 600px) { .word-list { column-count: 1; } }
        .word-link { display: block; text-decoration: none; color: #333; margin-bottom: 5px; }
        .word-link:hover { color: #1f3f7a; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Vorti komencanta per "${letter}"</h1>
        <div class="word-list">
            ${letterEntries.map(e => `<a href="../v/${encodeURIComponent(e.lemma)}.html" class="word-link">${e.lemma}</a>`).join('')}
        </div>
        <br><hr><br>
        <a href="index.html">← Retro a la listo de literi</a>
    </div>
</body>
</html>`;
  fs.writeFileSync(path.join(BROWSE_DIR, fileName), letterHtml);
  sitemap += `  <url><loc>${DOMAIN}/browse/${fileName}</loc><priority>0.6</priority></url>\n`;
});

sitemap += '</urlset>';
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);

console.log(`SEO Generation complete!`);
console.log(`- ${entries.length} word pages in /v/`);
console.log(`- ${sortedLetters.length} browse pages in /browse/`);
console.log(`- sitemap.xml updated`);
