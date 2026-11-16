'use strict';
/* Browser test harness: serves the app over HTTP (like GitHub Pages) and launches headless Chromium. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SHARED_ROOT = path.resolve(ROOT, '../../cs-games');
const WPR_ROUTE = '/wpr-games/workplace-readiness';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown' };

function serve(prefix) {
  prefix = prefix || '';
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      for (const route of [prefix, WPR_ROUTE]) {
        if (route && (p === route || p.startsWith(route + '/'))) { p = p.slice(route.length); break; }
      }
      if (p === '' || p === '/') p = '/index.html';
      if (p === '/favicon.ico') { res.writeHead(204); return res.end(); }
      const shared = p.startsWith('/cs-games/');
      const root = shared ? SHARED_ROOT : ROOT;
      const f = path.resolve(root, '.' + (shared ? p.slice('/cs-games'.length) : p));
      if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve({ srv, url: 'http://127.0.0.1:' + srv.address().port + prefix + '/' }));
  });
}

function findChrome() {
  const c = [process.env.CHROME_BIN, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome'];
  return c.find(x => x && fs.existsSync(x));
}
function puppeteer() {
  try { return require('puppeteer-core'); } catch (e) { return require('/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer-core'); }
}
async function launch() {
  return puppeteer().launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}
module.exports = { serve, launch };
