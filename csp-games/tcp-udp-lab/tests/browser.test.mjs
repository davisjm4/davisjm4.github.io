// Real-browser test (Chromium via Playwright). Not part of `npm test`, because CI does
// not install browsers. Run from the repository root:
//   NODE_PATH="$(npm root -g)" PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node csp-games/tcp-udp-lab/tests/browser.test.mjs
// Optional: AXE_PATH=/path/to/axe.min.js runs an axe-core accessibility scan.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.log('SKIPPED: playwright is not installed.'); process.exit(0); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p); if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/csp-games/tcp-udp-lab/`;
const axe = process.env.AXE_PATH && fs.existsSync(process.env.AXE_PATH) ? fs.readFileSync(process.env.AXE_PATH, 'utf8') : null;
const shots = process.env.SHOT_DIR;

let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; }, eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'chromebook-1366', width: 1366, height: 768 },
  { name: 'chromebook-1280', width: 1280, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024, touch: true },
  { name: 'phone-390', width: 390, height: 844, touch: true },
  { name: 'phone-360', width: 360, height: 740, touch: true },
  { name: 'phone-320', width: 320, height: 640, touch: true },
];
const browser = await chromium.launch();
const axeResults = [];
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, isMobile: !!vp.touch, deviceScaleFactor: vp.touch ? 2 : 1 });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + '?seed=31', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('scene').textContent.length > 40);
  const s = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, buttons: [...document.querySelectorAll('.choices button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent, h: r.height, w: r.width, top: r.top, left: r.left }; }), fb: document.getElementById('feedback').hidden }));
  ok(s.scroll <= s.client, `${vp.name}: no horizontal scroll (${s.scroll} > ${s.client})`);
  eq(s.buttons.map(b => b.t), ['TCP', 'UDP'], `${vp.name}: two choices`);
  ok(s.buttons.every(b => b.h >= 44 && b.w >= 44), `${vp.name}: touch targets ≥ 44 px`);
  ok(Math.abs(s.buttons[0].top - s.buttons[1].top) < 2 && s.buttons[0].left < s.buttons[1].left, `${vp.name}: choices side by side`);
  ok(s.fb, `${vp.name}: feedback hidden before answering`);
  if (shots) await page.screenshot({ path: `${shots}/${vp.name}-question.png`, fullPage: false });

  if (vp.touch) {
    await page.tap('#tcp');
  } else {
    // Keyboard only: Tab from the page start until a choice button has focus, then press Enter.
    await page.keyboard.press('Tab'); let hops = 0;
    while (!(await page.evaluate(() => ['tcp', 'udp'].includes(document.activeElement?.id))) && hops++ < 20) await page.keyboard.press('Tab');
    ok(hops < 20, `${vp.name}: choices reachable by Tab`);
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth);
    ok(/solid 3px/.test(outline), `${vp.name}: visible focus indicator (${outline})`);
    await page.keyboard.press('Enter');
  }
  const after = await page.evaluate(() => ({ hidden: document.getElementById('feedback').hidden, text: document.getElementById('feedback').textContent, active: document.activeElement?.id, disabled: [...document.querySelectorAll('.choices button')].every(b => b.disabled), scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  ok(!after.hidden && /^(Correct|Incorrect) — /.test(after.text), `${vp.name}: immediate feedback`);
  eq(after.active, 'feedback', `${vp.name}: focus moves to feedback for screen readers`);
  ok(after.disabled, `${vp.name}: answer locked`);
  ok(after.scroll <= after.client, `${vp.name}: no horizontal scroll with feedback`);
  if (shots) await page.screenshot({ path: `${shots}/${vp.name}-feedback.png`, fullPage: true });
  const attempted = await page.evaluate(() => JSON.parse(localStorage.getItem('cspGames.session.v1')).games['tcp-udp-lab'].attempted);
  eq(attempted, 1, `${vp.name}: one attempt in shared session`);

  // Enable optional shortcuts before testing keyboard N/U.
  if (!vp.touch) { await page.check('#shortcuts'); await page.focus('#feedback'); }
  // Next question (keyboard N on desktop, tap on touch), then a second answer.
  if (vp.touch) await page.tap('#next'); else await page.keyboard.press('n');
  ok(await page.evaluate(() => document.getElementById('feedback').hidden && !document.getElementById('tcp').disabled), `${vp.name}: next question ready`);
  if (vp.touch) await page.tap('#udp'); else await page.keyboard.press('u');
  eq(await page.evaluate(() => JSON.parse(localStorage.getItem('cspGames.session.v1')).games['tcp-udp-lab'].attempted), 2);

  // Topic switch keeps the session; Learn panel opens and its table stays inside the viewport.
  await page.selectOption('#topic', 'protocols');
  eq(await page.evaluate(() => document.getElementById('topic-label').textContent), 'Protocols in Use: HTTP, QUIC and DNS');
  if (vp.touch) await page.tap('#learn > summary'); else await page.click('#learn > summary');
  const learn = await page.evaluate(() => ({ open: document.getElementById('learn').open, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, attempts: JSON.parse(localStorage.getItem('cspGames.session.v1')).games['tcp-udp-lab'].attempted }));
  ok(learn.open && learn.scroll <= learn.client, `${vp.name}: Learn panel fits`); eq(learn.attempts, 2, `${vp.name}: Learn is not an attempt`);
  if (axe && (vp.name === 'desktop-1440' || vp.name === 'phone-390')) {
    await page.addScriptTag({ content: axe });
    const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })));
    axeResults.push({ viewport: vp.name, violations: r });
    eq(r, [], `${vp.name}: axe-core WCAG 2.1 A/AA violations`);
  }
  // Session Summary shows this game.
  await page.goto(base + '../session-summary/', { waitUntil: 'networkidle' });
  ok((await page.textContent('body')).includes('TCP vs. UDP Decision Lab'), `${vp.name}: Session Summary lists the game`);
  eq(errors, [], `${vp.name}: no console or page errors`);
  await context.close();
}
await browser.close(); server.close();
console.log(`TCP/UDP Chromium: ${checks} assertions passed across ${VIEWPORTS.length} viewports (${VIEWPORTS.filter(v => !v.touch).length} keyboard play, ${VIEWPORTS.filter(v => v.touch).length} touch).${axe ? ` axe-core: ${axeResults.map(a => `${a.viewport} ${a.violations.length} violations`).join(', ')}.` : ' axe-core scan not run.'}`);
