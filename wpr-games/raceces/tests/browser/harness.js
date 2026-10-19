/* Real-browser test harness: static server + Playwright Chromium. */
const http = require('http');
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* fall through */ }
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    '/home/claude/.npm-global/lib/node_modules/playwright',
    '/usr/local/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright'
  ].filter(Boolean);
  for (const c of candidates) { try { return require(c); } catch (e) { /* next */ } }
  throw new Error('Playwright not found. Run `npm i -D playwright && npx playwright install chromium`, or set PLAYWRIGHT_MODULE.');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };

function serve(rootDir) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(rootDir, p);
      if (!f.startsWith(rootDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: 'http://127.0.0.1:' + server.address().port + '/' }));
  });
}

async function launch() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
  const pw = loadPlaywright();
  const browser = await pw.chromium.launch({ headless: true });
  return { pw, browser };
}

module.exports = { serve, launch };
