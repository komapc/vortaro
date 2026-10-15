// Notify IndexNow (Bing, Yandex, ...) about URLs whose sitemap file changed.
// Runs after `wrangler pages deploy` (see package.json "deploy").
//
// Each sitemap-*.xml is hashed; only files whose URL set differs from the
// recorded hash in indexnow-state.json are submitted, so a routine deploy
// sends nothing and adding words sends just the affected letter files.
//   node scripts/indexnow.js           submit changed files
//   node scripts/indexnow.js --dry     show what would be sent
//   node scripts/indexnow.js --init    record current hashes without sending
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = 'vortaro.lipu.dev';
const KEY = 'd485a5188a78f9ba43783e4a9ea2ff1f'; // served at /<KEY>.txt
const ROOT = path.join(__dirname, '..');
const STATE = path.join(ROOT, 'indexnow-state.json');
const BATCH = 10000; // IndexNow limit per request

const args = new Set(process.argv.slice(2));
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const files = fs.readdirSync(ROOT).filter((f) => /^sitemap-.*\.xml$/.test(f)).sort();

async function submit(urls) {
  for (let i = 0; i < urls.length; i += BATCH) {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(i, i + BATCH) }),
    });
    if (!r.ok && r.status !== 202) throw new Error(`IndexNow HTTP ${r.status}`);
  }
}

(async () => {
  let sent = 0;
  const next = {};
  for (const f of files) {
    const xml = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const hash = crypto.createHash('sha1').update(urls.join('\n')).digest('hex');
    next[f] = hash;
    if (state[f] === hash || args.has('--init')) continue;
    if (args.has('--dry')) { console.log(`would send ${urls.length} URLs from ${f}`); continue; }
    try { await submit(urls); sent += urls.length; console.log(`IndexNow: ${urls.length} URLs from ${f}`); }
    catch (e) { console.warn(`IndexNow failed for ${f}: ${e.message}`); next[f] = state[f]; }
  }
  if (!args.has('--dry')) fs.writeFileSync(STATE, JSON.stringify(next, null, 2) + '\n');
  console.log(args.has('--init') ? `IndexNow state initialised (${files.length} files)` : `IndexNow done, ${sent} URLs sent`);
})();
