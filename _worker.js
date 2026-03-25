// Cloudflare Pages _worker.js for Vortaro
// Handles dynamic SEO injection and serves static assets

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

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
      
      // We serve index.html, and the client-side app.js will pick up the path
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      let response = await env.ASSETS.fetch(indexRequest);
      
      if (response.status === 200) {
        let html = await response.text();
        
        // Inject SEO tags for the specific word
        const langFrom = direction === 'io-eo' ? 'Ido' : 'Esperanto';
        const langTo = direction === 'io-eo' ? 'Esperanto' : 'Ido';
        const decodedWord = escapeHtml(decodeURIComponent(word));
        const title = `${decodedWord} — Ido-Esperanto Vortaro / Dictionary`;
        const description = `Look up "${decodedWord}" in the Ido-Esperanto Dictionary (Vortaro / Vortlibro). Fast, comprehensive, and offline-ready.`;
        
        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="https://ido-vortaro.pages.dev/v/${encodeURIComponent(word)}.html">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url.href}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
        `;
        
        // Use regex for more robust title replacement
        html = html.replace(/<title>.*?<\/title>/, '');
        html = html.replace(/<link rel="canonical" href="https:\/\/ido-vortaro\.pages\.dev\/">/, '');
        html = html.replace('</head>', `${metaTags}\n  </head>`);
        
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
        
        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="https://ido-vortaro.pages.dev/v/${encodeURIComponent(q)}.html">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url.href}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
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
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return await env.ASSETS.fetch(indexRequest);
      }
      
      return response;
    } catch (_) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      return await env.ASSETS.fetch(indexRequest);
    }
  },
};
