// Cloudflare Pages _worker.js for Vortaro
// Handles dynamic SEO injection and serves static assets

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// Per-letter SEO shards (built by generate_seo.js), cached per isolate so the
// 7MB dictionary is never parsed per request — only the ~200KB first-letter
// shard for the requested word, and only once per isolate.
const shardCache = new Map();
async function getShard(env, request, key) {
  if (shardCache.has(key)) return shardCache.get(key);
  let shard = null;
  try {
    const res = await env.ASSETS.fetch(new URL(`/seo/${encodeURIComponent(key)}.json`, request.url));
    if (res.status === 200) shard = await res.json();
  } catch (e) { /* fall through to null */ }
  shardCache.set(key, shard);
  return shard;
}
const shardKeyOf = (word) => {
  const c = (word[0] || '_').toLowerCase();
  return /[a-z]/.test(c) ? c : '_';
};
const PARADIGM_POS = {
  o__n: 'substantivo', a__adj: 'adjektivo', e__adv: 'adverbo', ar__vblex: 'verbo',
  ir__vblex: 'verbo', __prn: 'pronomo', __pr: 'prepoziciono', __det: 'artiklo',
  __cnjcoo: 'konjunciono', __cnjsub: 'konjunciono', __ij: 'interjeciono',
  num: 'nombro', np__np: 'propra nomo', __prep_art: 'prepoziciono',
};
const posLabel = (morf) => {
  for (const m of (morf || [])) if (PARADIGM_POS[m]) return PARADIGM_POS[m];
  return '';
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 0. Handle legacy /vortaro/ prefix from GitHub Pages
    if (url.pathname === '/vortaro' || url.pathname.startsWith('/vortaro/')) {
      const newUrl = new URL(request.url);
      newUrl.pathname = url.pathname.replace(/^\/vortaro/, '') || '/';
      return Response.redirect(newUrl, 301);
    }

    // 1. Handle Pretty URLs for SPA
    // Paths like /io-eo/hundo or /eo-io/hundo should serve index.html
    const prettyUrlMatch = url.pathname.match(/^\/(io-eo|eo-io)\/(.+)$/);
    if (prettyUrlMatch) {
      const direction = prettyUrlMatch[1];
      const word = prettyUrlMatch[2];
      
      // Serve index.html (clean GET — passing the original /io-eo/<word> request
      // as init made ASSETS return a non-200, so the block fell through to the
      // SPA fallback and the per-word SEO was never applied). app.js picks up the
      // path client-side.
      const response = await env.ASSETS.fetch(new URL('/index.html', url.origin));
      if (!response.ok) {
        // /index.html itself failed to load from ASSETS — don't fake a 200 by
        // injecting SEO tags into an error/empty body; pass the real failure through.
        return response;
      }
      {
        let html = await response.text();

        const langFrom = direction === 'io-eo' ? 'Ido' : 'Esperanto';
        const langTo = direction === 'io-eo' ? 'Esperanto' : 'Ido';
        const rawWord = decodeURIComponent(word);
        const decodedWord = escapeHtml(rawWord);

        // Look up the actual translations so the page body has unique, indexable
        // content (not just a distinct <title> over the same SPA shell). Only the
        // io-eo direction is shard-indexed (the sitemap only lists io-eo URLs).
        let translations = [];
        let pos = '';
        if (direction === 'io-eo') {
          const shard = await getShard(env, request, shardKeyOf(rawWord));
          const entry = shard && (shard[rawWord] || shard[rawWord.toLowerCase()]);
          if (entry && Array.isArray(entry.e)) { translations = entry.e; pos = posLabel(entry.m); }
        }
        const transStr = translations.slice(0, 5).map(escapeHtml).join(', ');

        // Richer title/description with the translation when known.
        const title = transStr
          ? `${decodedWord} → ${transStr} — Ido-Esperanto Vortaro`
          : `${decodedWord} — Ido-Esperanto Vortaro / Dictionary`;
        const description = transStr
          ? `${decodedWord} (${langFrom}) → ${transStr} (${langTo})${pos ? ', ' + pos : ''}. Trovez "${decodedWord}" en la senpaga Ido-Esperanto vortaro kun morfologio-analizo.`
          : `Look up "${decodedWord}" in the Ido-Esperanto Dictionary (Vortaro / Vortlibro). Fast, comprehensive, and offline-ready.`;

        const ld = [
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Vortaro", "item": "https://ido-vortaro.pages.dev/" },
              { "@type": "ListItem", "position": 2, "name": decodedWord, "item": url.href }
            ]
          }
        ];
        if (translations.length) {
          ld.push({
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            "name": rawWord,
            "inLanguage": direction === 'io-eo' ? 'io' : 'eo',
            "description": `${langTo}: ${translations.join(', ')}`,
            "inDefinedTermSet": {
              "@type": "DefinedTermSet",
              "name": "Ido-Esperanto Vortaro",
              "url": "https://ido-vortaro.pages.dev/"
            }
          });
        }

        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url.origin}${url.pathname}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url.href}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    ${ld.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n    ')}
        `;

        html = html.replace(/<title>.*?<\/title>/, '');
        html = html.replace(/<link rel="canonical" href="https:\/\/ido-vortaro\.pages\.dev\/">/, '');
        html = html.replace('</head>', `${metaTags}\n  </head>`);

        // Server-render the definition into the #results container. app.js reads
        // the URL path on load and re-renders the same content, so this is
        // seamless for users and gives crawlers real per-word content.
        if (translations.length) {
          const bodyHtml = `<div class="result-item">`
            + `<h2 class="source-word">${decodedWord}</h2>`
            + `<div class="target-words">→ ${transStr}</div>`
            + (pos ? `<div class="morfologio">${escapeHtml(pos)}</div>` : '')
            + `</div>`;
          html = html.replace(
            '<div id="results" class="results"></div>',
            `<div id="results" class="results">${bodyHtml}</div>`
          );
        }

        return new Response(html, {
          headers: {
            ...Object.fromEntries(response.headers),
            'Content-Type': 'text/html;charset=UTF-8'
          }
        });
      }
    }
    
    // 2. Static assets via ASSETS binding
    try {
      // Check for dictionary lookup queries (e.g., ?q=amiko)
      const q = url.searchParams.get('q');
      const dir = url.searchParams.get('dir') || 'io-eo';
      
      let response = await env.ASSETS.fetch(request);
      
      // Only inject for the index page when a query is present
      if (response.status === 200 && (url.pathname === '/' || url.pathname === '/index.html') && q) {
        let html = await response.text();
        
        const langFrom = dir === 'io-eo' ? 'Ido' : 'Esperanto';
        const langTo = dir === 'io-eo' ? 'Esperanto' : 'Ido';
        const safeQ = escapeHtml(q);
        const title = `${safeQ} — Ido-Esperanto Vortaro / Dictionary`;
        const description = `Look up "${safeQ}" in the Ido-Esperanto Dictionary (Vortaro / Vortlibro). Fast, comprehensive, and offline-ready.`;
        
        const breadcrumbData = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Vortaro", "item": "https://ido-vortaro.pages.dev/" },
            { "@type": "ListItem", "position": 2, "name": safeQ, "item": url.href }
          ]
        };

        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url.origin}${url.pathname}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url.href}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <script type="application/ld+json">${JSON.stringify(breadcrumbData)}</script>
        `;
        
        // Use regex for more robust title replacement
        html = html.replace(/<title>.*?<\/title>/, '');
        html = html.replace(/<link rel="canonical" href="https:\/\/ido-vortaro\.pages\.dev\/">/, '');
        html = html.replace('</head>', `${metaTags}\n  </head>`);
        
        return new Response(html, {
          headers: response.headers
        });
      }
      
      // Fallback to index.html for SPA-like routing (if we decide to use pretty URLs later)
      if (!response.ok && !url.pathname.includes('.')) {
        // Clean GET (see fix above) — a rehomed Request here also returns a
        // non-200 from ASSETS, which would 404 the SPA fallback itself.
        return await env.ASSETS.fetch(new URL('/index.html', url.origin));
      }

      return response;
    } catch (_) {
      return await env.ASSETS.fetch(new URL('/index.html', url.origin));
    }
  },
};
