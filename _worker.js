// Cloudflare Pages _worker.js for Vortaro
// Handles dynamic SEO injection and serves static assets

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// Remove the static SEO tags that the per-word injection replaces. Leaving the
// originals in place means two <meta name="description"> / og:* sets per page,
// and OG parsers take the FIRST occurrence — so shared word links showed the
// generic homepage card. og:type/og:image/twitter:card are kept (not re-injected).
const stripDefaultSeoTags = (html) => html
  .replace(/<title>.*?<\/title>\s*/s, '')
  .replace(/[ \t]*<meta name="description"[^>]*>\n?/, '')
  .replace(/[ \t]*<meta property="(?:og|twitter):(?:title|description|url)"[^>]*>\n?/g, '')
  .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/, '')

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
// MUST match generate_seo.js: browse pages are chunks of BROWSE_PAGE_SIZE over
// the default-.sort()ed lemma list, so index -> page number maps 1:1.
const BROWSE_PAGE_SIZE = 500;
const shardKeysCache = new Map();
const sortedShardKeys = (key, shard) => {
  if (!shardKeysCache.has(key)) {
    shardKeysCache.set(key, shard ? Object.keys(shard).sort() : []);
  }
  return shardKeysCache.get(key);
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

    // Yandex Webmaster verification: must serve at this exact .html path with
    // a 200, not the 308 Cloudflare Pages issues for .html extensions by default.
    if (url.pathname === '/yandex_a4663d340339ec30.html') {
      return new Response(
        '<html>\n    <head>\n        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n    </head>\n    <body>Verification: a4663d340339ec30</body>\n</html>\n',
        { headers: { 'content-type': 'text/html; charset=UTF-8' } }
      );
    }

    // Crawlers request /favicon.ico by convention; there is no .ico file, and
    // the Pages SPA fallback would answer with index.html + 200 (Yandex flags
    // this as FAVICON_PROBLEM). Serve the PNG bytes at the .ico path.
    if (url.pathname === '/favicon.ico') {
      const png = await env.ASSETS.fetch(new URL('/favicon.png', url.origin));
      // The SPA fallback can answer a missing asset with index.html + 200 —
      // require an actual image, never relay HTML as image/png.
      if (!png.ok || !(png.headers.get('content-type') || '').startsWith('image/')) {
        return new Response(null, { status: 404 });
      }
      return new Response(png.body, {
        status: 200,
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
      });
    }

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
        let found = false;
        let relatedHtml = '';
        if (direction === 'io-eo') {
          const letter = shardKeyOf(rawWord);
          const shard = await getShard(env, request, letter);
          // Shard keys are exact lemmas; also try lowercase and Capitalized so
          // e.g. /io-eo/aachen reaches the "Aachen" entry.
          const lemma = shard && [rawWord, rawWord.toLowerCase(),
            rawWord.charAt(0).toUpperCase() + rawWord.slice(1)].find((c) => shard[c]);
          const entry = lemma && shard[lemma];
          if (entry && Array.isArray(entry.e)) {
            found = true; translations = entry.e; pos = posLabel(entry.m);
            // Internal links: alphabetical neighbors + this word's exact browse
            // page. Word pages were sitemap-only orphans, which search engines
            // barely index — these links make the 38k pages a connected graph.
            const keys = sortedShardKeys(letter, shard);
            const idx = keys.indexOf(lemma);
            const neighbors = keys.slice(Math.max(0, idx - 4), idx + 5).filter((k) => k !== lemma);
            const browsePageNo = Math.floor(idx / BROWSE_PAGE_SIZE) + 1;
            relatedHtml = `<nav class="related-words"><h3>Altra vorti</h3>`
              + neighbors.map((k) => `<a href="/io-eo/${encodeURIComponent(k)}">${escapeHtml(k)}</a>`).join(' · ')
              + ` · <a href="/browse/${letter}-${browsePageNo}">Plu multa vorti per "${letter === '_' ? '#' : letter.toUpperCase()}"</a>`
              + `</nav>`;
          }
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

        // eo-io pages have no shard data (no unique content) and are not in the
        // sitemap — noindex them instead of offering 38k thin self-canonical
        // duplicates of the io-eo pages.
        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    ${direction === 'eo-io' ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url.origin}${url.pathname}">`}
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url.href}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    ${ld.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n    ')}
        `;

        html = stripDefaultSeoTags(html);
        html = html.replace('</head>', `${metaTags}\n  </head>`);

        // Server-render the definition into the #results container. app.js reads
        // the URL path on load and re-renders the same content, so this is
        // seamless for users and gives crawlers real per-word content.
        if (translations.length) {
          const bodyHtml = `<div class="result-item">`
            + `<h2 class="source-word">${decodedWord}</h2>`
            + `<div class="target-words">→ ${transStr}</div>`
            + (pos ? `<div class="morfologio">${escapeHtml(pos)}</div>` : '')
            + `</div>`
            + relatedHtml;
          html = html.replace(
            '<div id="results" class="results"></div>',
            `<div id="results" class="results">${bodyHtml}</div>`
          );
        }

        // Unknown io-eo word: serve the working SPA page but with a 404 status,
        // so the infinite /io-eo/<anything> space doesn't become soft-404s /
        // crawl-budget waste. (eo-io can't be existence-checked — no shards —
        // and is noindexed above instead.)
        const status = direction === 'io-eo' && !found ? 404 : 200;

        return new Response(html, {
          status,
          headers: {
            ...Object.fromEntries(response.headers),
            'Content-Type': 'text/html;charset=UTF-8'
          }
        });
      }
    }
    
    // 2. Legacy ?q= lookup URLs: redirect to the canonical pretty path so
    // there is a single URL space (and a single meta-injection code path).
    if ((url.pathname === '/' || url.pathname === '/index.html') && url.searchParams.get('q')) {
      const q = url.searchParams.get('q');
      const dir = url.searchParams.get('dir') === 'eo-io' ? 'eo-io' : 'io-eo';
      return Response.redirect(`${url.origin}/${dir}/${encodeURIComponent(q)}`, 301);
    }

    // 3. Static assets via ASSETS binding
    try {
      const response = await env.ASSETS.fetch(request);

      // Pages runs in SPA mode (no 404.html), so ASSETS answers ANY missing
      // path with index.html + 200. For file-like paths (non-.html extension)
      // an HTML response can only be that fallback — return an honest 404
      // instead of an infinite soft-404 space (/anything.xyz was a 200).
      const ext = (url.pathname.match(/\.([a-z0-9]+)$/i) || [])[1];
      if (
        response.ok && ext && !/^html?$/i.test(ext)
        && (response.headers.get('content-type') || '').includes('text/html')
      ) {
        return new Response(null, { status: 404 });
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
