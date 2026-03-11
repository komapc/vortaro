// Cloudflare Pages _worker.js for Vortaro
// Handles dynamic SEO injection and serves static assets

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 1. Static assets via ASSETS binding
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
        const title = `${q} - ${langFrom} to ${langTo} Dictionary`;
        const description = `Look up "${q}" in the Ido-Esperanto Dictionary. Fast, comprehensive, and offline-ready.`;
        
        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url.href}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
        `;
        
        // Remove existing generic title if it exists and inject new tags
        html = html.replace('<title>Vortaro - Ido-Esperanto Dictionary</title>', '');
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
