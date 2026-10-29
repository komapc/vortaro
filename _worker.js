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
// The homepage's static intro (#home-intro) is removed too: repeated on every
// word page it would be ~400 words of identical boilerplate.
const stripDefaultSeoTags = (html) => html
  .replace(/<title>.*?<\/title>\s*/s, '')
  .replace(/[ \t]*<meta name="description"[^>]*>\n?/, '')
  .replace(/[ \t]*<meta (?:name|property)="(?:og|twitter):(?:title|description|url)"[^>]*>\n?/g, '')
  .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/, '')
  .replace(/[ \t]*<!-- home-intro:[\s\S]*?<!-- \/home-intro -->\n?/, '')

// Small standalone page for unknown top-level paths (real 404, not the SPA shell).
const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="io">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagino ne trovita (404) — Ido-Esperanto Vortaro</title>
    <meta name="robots" content="noindex">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
    <link rel="stylesheet" href="/subpage.css">
</head>
<body>
    <h1>Pagino ne trovita (404)</h1>
    <p>Ca pagino ne existas. / This page does not exist.</p>
    <p><a href="/">« Ido-Esperanto Vortaro</a> · <a href="/browse/">Indexo di vorti</a></p>
</body>
</html>
`;
// Present only in index.html (the SPA shell), never in about/browse pages.
const SHELL_MARKER = 'id="searchInput"';
const notFound = () => new Response(NOT_FOUND_HTML, {
  status: 404,
  headers: { 'content-type': 'text/html;charset=UTF-8' },
});

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
// Esperanto headword -> shard letter: diacritics stripped (ĉ -> c). MUST match
// eoShardKey in generate_seo.js.
const eoShardKeyOf = (word) => {
  const c = ((word.normalize('NFD')[0]) || '_').toLowerCase();
  return /[a-z]/.test(c) ? c : '_';
};
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

// --- Regular inflection tables + word family (computed from shard data) -----
// Ido inflection is fully regular, so the forms are derived from the lemma's
// paradigm instead of being stored: no extra shard bytes, and every word page
// gets unique, correct content. Single-word lemmas only (multi-word and
// proper-noun entries do not necessarily inflect on their last token).
const PARADIGM_ENDING = { o__n: 'o', a__adj: 'a', e__adv: 'e', ar__vblex: 'ar' };
function stemOf(lemma, morf) {
  for (const m of (morf || [])) {
    const end = PARADIGM_ENDING[m];
    if (end && lemma.length > end.length + 1 && lemma.endsWith(end) && !/[\s-]/.test(lemma)) {
      return { stem: lemma.slice(0, -end.length), paradigm: m };
    }
  }
  return null;
}
// [label, forms] rows; every string is escaped by the caller.
function inflectionRows(lemma, morf) {
  const st = stemOf(lemma, morf);
  if (!st || st.paradigm === 'e__adv') return [];
  const { stem, paradigm } = st;
  if (paradigm === 'o__n') {
    return [
      ['Singularo', `${stem}o`],
      ['Pluralo', `${stem}i`],
      ['Akuzativo (facultativa)', `${stem}on, ${stem}in`],
    ];
  }
  if (paradigm === 'a__adj') {
    return [
      ['Adjektivo', `${stem}a`],
      ['Adverbo', `${stem}e`],
      ['Akuzativo (facultativa)', `${stem}an`],
    ];
  }
  // ar__vblex
  return [
    ['Infinitivo', `${stem}ar (prezenta), ${stem}ir (preterita), ${stem}or (futura)`],
    ['Prezento', `${stem}as`],
    ['Preterito', `${stem}is`],
    ['Futuro', `${stem}os`],
    ['Kondicionalo', `${stem}us`],
    ['Imperativo', `${stem}ez`],
    ['Aktiva participo', `${stem}anta, ${stem}inta, ${stem}onta`],
    ['Pasiva participo', `${stem}ata, ${stem}ita, ${stem}ota`],
  ];
}
// Same-stem lemmas from the same shard (derivations and POS siblings), nearest
// first, capped. Stems under 3 chars would match half the dictionary — skipped.
const FAMILY_MAX = 12;
function wordFamily(lemma, morf, keys, shard) {
  const st = stemOf(lemma, morf);
  if (!st || st.stem.length < 3) return [];
  const { stem } = st;
  const out = [];
  for (const k of keys) {
    // Candidates must themselves be single-word regular lemmas (-o/-a/-e/-ar):
    // this drops proper names (bonny, bonner) and multi-word entries that only
    // share a prefix with the stem.
    if (k !== lemma && k.startsWith(stem) && stemOf(k, shard[k] && shard[k].m)) out.push(k);
  }
  out.sort((a, b) => (a.length - b.length) || (a < b ? -1 : a > b ? 1 : 0));
  return out.slice(0, FAMILY_MAX);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Old *.pages.dev address: permanent redirect to the canonical domain.
    if (url.hostname === 'ido-vortaro.pages.dev') {
      return Response.redirect('https://vortaro.lipu.dev' + url.pathname + url.search, 301);
    }

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
        // Malformed escapes (/io-eo/%E0) and blank words (/io-eo/%20) are
        // simply unknown words: 404 below, never a 500 or an empty-title page.
        let rawWord = '';
        try { rawWord = decodeURIComponent(word).trim(); } catch (e) { rawWord = ''; }
        const decodedWord = escapeHtml(rawWord);

        // Look up the actual translations so the page body has unique, indexable
        // content (not just a distinct <title> over the same SPA shell). Both
        // directions are shard-indexed: seo/<letter>.json (Ido) and
        // seo/eo-<letter>.json (inverted Esperanto -> Ido).
        let translations = [];
        let pos = '';
        let found = false;
        let relatedHtml = '';
        // Real lemma spelling when the URL is a case variant (/io-eo/aachen ->
        // "Aachen"): canonical must point at the lemma path, otherwise every
        // case variant is a self-canonical duplicate of the same page.
        let canonicalLemma = null;
        let formRows = [];
        let famKeys = [];
        let famShard = null;
        // Thin entry (t:1, decided in generate_seo.js): working page, noindex.
        let thin = false;
        let crossHtml = '';
        let linkedGloss = null; // io-eo: translations that have their own eo-io page
        if (direction === 'io-eo' && rawWord) {
          const letter = shardKeyOf(rawWord);
          const shard = await getShard(env, request, letter);
          // Shard keys are exact lemmas; also try lowercase and Capitalized so
          // e.g. /io-eo/aachen reaches the "Aachen" entry.
          const lemma = shard && [rawWord, rawWord.toLowerCase(),
            rawWord.charAt(0).toUpperCase() + rawWord.slice(1)].find((c) => shard[c]);
          const entry = lemma && shard[lemma];
          if (entry && Array.isArray(entry.e)) {
            found = true; translations = entry.e; pos = posLabel(entry.m);
            canonicalLemma = lemma;
            thin = entry.t === 1;
            linkedGloss = new Set(entry.r || []);
            // (Skipped when that page is already linked as a gloss.)
            if (entry.x && !linkedGloss.has(entry.x)) {
              crossHtml = `<p class="cross-link">Anke en Esperanto: <a href="/eo-io/${encodeURIComponent(entry.x)}">${escapeHtml(entry.x)}</a> (Esperanto → Ido)</p>`;
            }
            // Internal links: alphabetical neighbors + this word's exact browse
            // page. Word pages were sitemap-only orphans, which search engines
            // barely index — these links make the 38k pages a connected graph.
            const keys = sortedShardKeys(letter, shard);
            const idx = keys.indexOf(lemma);
            const neighbors = keys.slice(Math.max(0, idx - 4), idx + 5).filter((k) => k !== lemma);
            const browsePageNo = Math.floor(idx / BROWSE_PAGE_SIZE) + 1;
            famKeys = wordFamily(lemma, entry.m, keys, shard);
            famShard = shard;
            formRows = inflectionRows(lemma, entry.m);
            relatedHtml = `<nav class="related-words"><h3>Altra vorti</h3>`
              + neighbors.map((k) => `<a href="/io-eo/${encodeURIComponent(k)}">${escapeHtml(k)}</a>`).join(' · ')
              + ` · <a href="/browse/${letter}-${browsePageNo}">Plu multa vorti per "${letter === '_' ? '#' : letter.toUpperCase()}"</a>`
              + `</nav>`;
          }
        }
        if (direction === 'eo-io' && rawWord) {
          const letter = eoShardKeyOf(rawWord);
          const shardKey = `eo-${letter}`;
          const shard = await getShard(env, request, shardKey);
          const key = shard && [rawWord, rawWord.toLowerCase(),
            rawWord.charAt(0).toUpperCase() + rawWord.slice(1)].find((c) => shard[c]);
          const entry = key && shard[key];
          if (entry && Array.isArray(entry.i) && entry.i.length) {
            found = true; translations = entry.i; pos = posLabel(entry.m);
            canonicalLemma = key;
            thin = entry.t === 1;
            if (entry.x) {
              crossHtml = `<p class="cross-link">Anke en Ido: <a href="/io-eo/${encodeURIComponent(entry.x)}">${escapeHtml(entry.x)}</a> (Ido → Esperanto)</p>`;
            }
            const keys = sortedShardKeys(shardKey, shard);
            const idx = keys.indexOf(key);
            const neighbors = keys.slice(Math.max(0, idx - 4), idx + 5).filter((k) => k !== key);
            const browsePageNo = Math.floor(idx / BROWSE_PAGE_SIZE) + 1;
            relatedHtml = `<nav class="related-words"><h3>Altra vorti</h3>`
              + neighbors.map((k) => `<a href="/eo-io/${encodeURIComponent(k)}">${escapeHtml(k)}</a>`).join(' · ')
              + ` · <a href="/browse/eo-${letter}-${browsePageNo}">Plu multa vorti per "${letter === '_' ? '#' : letter.toUpperCase()}"</a>`
              + `</nav>`;
          } else {
            // Esperanto word whose only Ido counterpart is the identical string
            // is not given its own page (it would mirror /io-eo/<word>): send
            // visitors and crawlers to that page instead of a 404.
            const ioLetter = shardKeyOf(rawWord);
            const ioShard = await getShard(env, request, ioLetter);
            const ioLemma = ioShard && [rawWord, rawWord.toLowerCase(),
              rawWord.charAt(0).toUpperCase() + rawWord.slice(1)].find((c) => ioShard[c]);
            if (ioLemma) {
              return Response.redirect(`${url.origin}/io-eo/${encodeURIComponent(ioLemma)}`, 301);
            }
          }
        }
        const transStr = translations.slice(0, 5).map(escapeHtml).join(', ');

        // Richer title/description with the translation when known. Quotes
        // are typographic: a literal " would end the content="..." attribute
        // (descriptions were being cut off at `Trovez ` / `Look up `).
        const title = transStr
          ? `${decodedWord} → ${transStr} — ${direction === 'eo-io' ? 'Esperanto-Ido' : 'Ido-Esperanto'} Vortaro`
          : `${decodedWord ? `„${decodedWord}“ ne trovita — ` : ''}Ido-Esperanto Vortaro`;
        const description = transStr
          ? `${decodedWord} (${langFrom}) → ${transStr} (${langTo})${pos ? ', ' + pos : ''}. Trovez „${decodedWord}“ en la senpaga Ido-Esperanto vortaro kun morfologio-analizo.`
          : `${decodedWord ? `„${decodedWord}“ ne trovesas en la vortaro. ` : ''}Serchez altra vorto en la senpaga Ido-Esperanto vortaro (${langFrom} → ${langTo}).`;

        const canonicalUrl = canonicalLemma
          ? `${url.origin}/${direction}/${encodeURIComponent(canonicalLemma)}`
          : `${url.origin}${url.pathname}`;

        const ld = !found ? [] : [
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Vortaro", "item": "https://vortaro.lipu.dev/" },
              { "@type": "ListItem", "position": 2, "name": decodedWord, "item": canonicalUrl }
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
              "url": "https://vortaro.lipu.dev/"
            }
          });
        }

        // Unknown words (either direction) are 404s with noindex and no
        // self-canonical (the /<dir>/<anything> space is infinite). Thin
        // entries are working pages kept out of the index (noindex,follow, no
        // canonical: the two signals conflict). Others are indexable.
        const robotsTag = !found
          ? '<meta name="robots" content="noindex">'
          : thin
            ? '<meta name="robots" content="noindex,follow">'
            : `<link rel="canonical" href="${canonicalUrl}">`;
        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    ${robotsTag}
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    ${ld.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n    ')}
        `;

        html = stripDefaultSeoTags(html);
        html = html.replace('</head>', `${metaTags}\n  </head>`);

        // Server-render the definition into the #results container. app.js reads
        // the URL path on load and re-renders the same content, so this is
        // seamless for users and gives crawlers real per-word content.
        if (translations.length) {
          // The word is the page's one <h1>: the shell's generic "📖 Vortaro" h1
          // was identical on all 38k pages, so the site title is demoted to a
          // styled <p> on word pages (same look via .site-title in style.css).
          html = html.replace(
            /<h1>([\s\S]*?)<\/h1>/,
            '<p class="site-title">$1</p>'
          );
          const formsHtml = formRows.length
            ? `<section class="forms"><h2>Formi di "${decodedWord}"</h2><table><tbody>`
              + formRows.map(([label, forms]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(forms)}</td></tr>`).join('')
              + `</tbody></table></section>`
            : '';
          const familyHtml = famKeys.length
            ? `<section class="word-family"><h2>Vorti de la sama radiko</h2><ul>`
              + famKeys.map((k) => {
                const gloss = famShard && famShard[k] && famShard[k].e && famShard[k].e[0];
                return `<li><a href="/io-eo/${encodeURIComponent(k)}">${escapeHtml(k)}</a>${gloss ? ` <span class="eo">→ ${escapeHtml(gloss)}</span>` : ''}</li>`;
              }).join('')
              + `</ul></section>`
            : '';
          const bodyHtml = `<div class="result-item">`
            + `<h1 class="source-word">${decodedWord}</h1>`
            + `<div class="target-words">→ ${direction === 'eo-io'
              ? translations.slice(0, 8).map((t) => `<a href="/io-eo/${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join(', ')
              : translations.slice(0, 5).map((t) => (linkedGloss && linkedGloss.has(t)
                ? `<a href="/eo-io/${encodeURIComponent(t)}">${escapeHtml(t)}</a>`
                : escapeHtml(t))).join(', ')}</div>`
            + (pos ? `<div class="morfologio">${escapeHtml(pos)}</div>` : '')
            + crossHtml
            + formsHtml
            + familyHtml
            + `</div>`
            + relatedHtml;
          html = html.replace(
            '<div id="results" class="results"></div>',
            `<div id="results" class="results">${bodyHtml}</div>`
          );
        }

        // Unknown word (either direction): serve the working SPA page but with
        // a 404 status, so the infinite /<dir>/<anything> space doesn't become
        // soft-404s / crawl-budget waste.
        const status = !found ? 404 : 200;

        // Copy the asset headers into a Headers object so content-type is SET once
        // (spreading them next to a differently-cased 'Content-Type' sent it twice),
        // and drop the stale length of the original, unmodified document.
        const headers = new Headers(response.headers);
        headers.set('content-type', 'text/html;charset=UTF-8');
        headers.delete('content-length');
        return new Response(html, { status, headers });
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

      // Unknown extensionless path (/zz-garbage, /browse/a-99): a real 404
      // page. Whether ASSETS 404s or (Pages SPA mode) answers 200 with the
      // index.html shell, the status cannot be trusted — check the content:
      // anything but the homepage that comes back as the shell is missing.
      // Real pages (/about-en, /browse/a-1) are different documents.
      const isHome = url.pathname === '/' || url.pathname === '/index.html';
      if (!ext && !isHome) {
        if (!response.ok) return response.status === 404 ? notFound() : response;
        if ((response.headers.get('content-type') || '').includes('text/html')) {
          const body = await response.text();
          if (body.includes(SHELL_MARKER)) return notFound();
          return new Response(body, { status: response.status, headers: response.headers });
        }
      }

      return response;
    } catch (_) {
      return await env.ASSETS.fetch(new URL('/index.html', url.origin));
    }
  },
};
