const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://ido-vortaro.pages.dev';
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
  <url><loc>${DOMAIN}/about-io.html</loc><priority>0.5</priority></url>
  <url><loc>${DOMAIN}/about-en.html</loc><priority>0.5</priority></url>
  <url><loc>${DOMAIN}/about-eo.html</loc><priority>0.5</priority></url>
`;

// 2. Generate Static HTML for ALL entries
entries.forEach((entry, index) => {
  const lemma = entry.lemma;
  const translations = (entry.translations || []).filter(t => t.lang === 'eo');
  const eoTranslations = translations.map(t => t.term).join(', ');
  
  const fileName = `${encodeURIComponent(lemma)}.html`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  
  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": lemma,
    "description": `Ido word translated to Esperanto as: ${eoTranslations}`,
    "inDefinedTermSet": DOMAIN,
    "termCode": lemma
  };

  // Cross-links (Task 5)
  const crossLinks = translations.map(t => {
    return `<a href="${DOMAIN}/eo-io/${encodeURIComponent(t.term)}" class="cross-link">Serchar '${t.term}' en Esperanto → Ido</a>`;
  }).join('<br>');
  
  const html = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <title>${lemma} - Ido to Esperanto Translation</title>
    <meta name="description" content="Translate '${lemma}' from Ido to Esperanto: ${eoTranslations}. Free online Ido-Esperanto dictionary.">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="canonical" href="${DOMAIN}/v/${fileName}">
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
    </script>
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

sitemap += '</urlset>';
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);

console.log(`SEO Generation complete: sitemap.xml and /v/ directory updated with ${entries.length} entries.`);
