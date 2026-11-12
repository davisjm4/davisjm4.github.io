// Real Chromium integration tests (not synthetic unit tests). Needs the repo served from its root:
//   python3 -m http.server 8123 --bind 127.0.0.1      (from the repository root)
//   node cs-games/student/guest/tests/browser-tests.mjs
// Env: BASE (default http://127.0.0.1:8123), PLAYWRIGHT (module path), AXE (path to axe.min.js, optional), SHOTS (screenshot dir).
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright/index.mjs');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const GUEST = BASE + '/cs-games/student/guest/';
const SHOTS = process.env.SHOTS || new URL('../screenshots/', import.meta.url).pathname;
const AXE = process.env.AXE || '/tmp/axe/node_modules/axe-core/axe.min.js';
const KEY = 'cs-games:guest:v1';
fs.mkdirSync(SHOTS, { recursive: true });

let passed = 0; const failures = [];
const check = (cond, name) => { if (cond) passed++; else { failures.push(name); console.log('  FAIL', name); } };
const section = name => console.log('\n# ' + name);
const browser = await chromium.launch({executablePath:process.env.CHROME_BIN});
const log = { errors: [], requests: [] };
async function ctxWith(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...opts });
  await ctx.addInitScript(() => {
    const url=new URL(location.href);
    if(url.pathname==='/cs-games/student/guest/'&&!url.searchParams.has('view')){
      url.searchParams.set('view','classic');
      history.replaceState(history.state,'',url);
    }
  });
  ctx.on('request', r => log.requests.push({ method: r.method(), url: r.url() }));
  return ctx;
}
async function open(ctx, url, { allowErrors = false } = {}) {
  const page = await ctx.newPage();
  page.on('pageerror', e => log.errors.push(url + ' ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text() + m.location().url)) log.errors.push(url + ' ' + m.text()); });
  await page.goto(url); await page.waitForLoadState('load');
  return page;
}
const store = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const stat = (page, label) => page.locator('.guest-stats dt', { hasText: label }).locator('xpath=following-sibling::dd[1]').first().innerText();
async function answerMath(page, n, { mode = 'modulus' } = {}) {
  for (let i = 0; i < n; i++) {
    await page.locator('button.choice').first().click();
    await page.click('#check'); await page.waitForTimeout(120);
    if (i < n - 1) { await page.click('#next'); await page.waitForTimeout(120); }
  }
}

// ---------- 1. guest access, no account, no network writes ----------
section('Guest entry (no account, no teacher)');
const A = await ctxWith();
let page = await open(A, GUEST);
check(await page.locator('h1').innerText() === 'Explore on your own', 'page opens without sign-in');
check(await page.locator('.guest-course').count() === 4, 'four courses offered');
check(await page.evaluate(k => localStorage.getItem(k), KEY) === null, 'merely visiting stores nothing in the browser');
check(!/sign in|password|email|username/i.test(await page.locator('main').innerText()), 'no sign-in, email or password prompt');
check(await page.locator('a[href="../"]', { hasText: 'Join a class' }).count() === 1, 'separate Join a class option kept');
check((await page.locator('.guest-wrap').innerText()).includes('No account needed. Practice skills and save progress in this browser.'), 'entry wording');
await page.screenshot({ path: SHOTS + 'desktop-1-first-visit.png' });

section('Learner A: first visit, AP CSP');
await page.click('[data-course="csp"]');
await page.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await page.locator('li[data-node-id]').count() === 58, 'AP CSP shows all 58 skills immediately');
check(await page.locator('li[data-node-id] .pathway-actions a').count() >= 58, 'practice links present');
check(await page.locator('.guest-pickup').count() === 1 && /good first step/i.test(await page.locator('.guest-pickup h2').innerText()), 'first-step card shown');
check(!/synced|teacher assessment|verified mastery|Suggested target/i.test(await page.locator('main').innerText()), 'no class-only wording on the guest page');
check(!/\b(null|undefined|NaN|\[object)\b/.test(await page.locator('main').innerText()), 'no stray null/undefined/NaN text rendered');
const s1 = await store(page); check(s1?.course === 'csp' && s1.tracking === true && s1.events.length === 0, 'choice saved locally');
await page.screenshot({ path: SHOTS + 'desktop-2-ap-csp.png', fullPage: false });

section('Learner B: already knows Variables, jumps to Math Lab');
await page.goto(GUEST + '?course=advanced'); await page.waitForSelector('li[data-node-id]', { state: 'attached' });
check((await page.locator('.guest-target').innerText()) === 'Trace variable state', 'starts at the first skill');
const familiar = page.locator('details[data-area-id="area:advanced:variable-lab"] .guest-area-tools button[data-mark="familiar"]');
await familiar.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
check((await page.locator('.guest-target').innerText()) === 'Modulus', 'suggestion moves straight to Math Lab (keyboard only)');
check(await page.locator('li[data-node-id^="node:advanced:variable-lab"] .chip-self', { hasText: 'Familiar (self-reported)' }).count() >= 12, 'familiar is labelled self-reported on every Variable skill');
check(await stat(page, 'Skills practiced') === '0 of 123' && await stat(page, 'Questions answered') === '0', 'self-report is not counted as practice');
check(!/meeting|exceeding|mastered|proficient/i.test(await page.locator('main').innerText()), 'never claims meeting/exceeding');
await page.reload(); await page.waitForSelector('li[data-node-id]', { state: 'attached' });
check((await page.locator('.guest-target').innerText()) === 'Modulus', 'note remembered after reload');
check(await page.locator('details[data-area-id="area:advanced:variable-lab"] .guest-area-tools button[data-mark="familiar"][aria-pressed="true"]').count() === 1, 'pressed state restored');
await page.selectOption('#jump', { label: 'Recursion Lab' }).catch(async () => { const names = await page.locator('#jump option').allInnerTexts(); await page.selectOption('#jump', { index: names.findIndex(n => /recursion/i.test(n)) }); });
check(await page.locator('details[data-area-id="area:advanced:recursion-lab"]').evaluate(d => d.open), 'jump to any later area opens it directly');
await page.screenshot({ path: SHOTS + 'desktop-3-familiar-and-jump.png' });

section('Learner C: Boolean Logic and Loops need practice');
for (const area of ['boolean-conditional-lab', 'loop-lab']) {
  const d = page.locator(`details[data-area-id="area:advanced:${area}"]`);
  if (!await d.evaluate(x => x.open)) await d.locator('summary').click(); // a learner opens the area first
  await d.locator('.guest-area-tools button[data-mark="needs-practice"]').click(); await page.waitForTimeout(100);
}
check((await page.locator('.guest-target').innerText()) === 'Follow the Branch', 'top recommendation comes from a flagged area');
check(/marked this as needing practice/.test(await page.locator('.guest-pickup').innerText()), 'reason explains the recommendation');
check(await page.locator('li[data-node-id^="node:advanced:loop-lab"] .chip-self', { hasText: 'needs practice' }).count() >= 11, 'loop skills show the learner’s note');
check(await stat(page, 'Questions answered') === '0', 'notes alone create no practice');
await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: SHOTS + 'desktop-5-needs-practice-recommendation.png' });

// ---------- 2. real game events ----------
section('Real Java game event (focused) and after-practice choices');
const jump = async label => { const i = (await page.locator('#jump option').allInnerTexts()).findIndex(n => n.includes(label)); await page.selectOption('#jump', { index: i }); };
await jump('Math Lab');
await page.locator('li[data-node-id="node:advanced:math-lab:modulus"] .pathway-actions a').first().click();
await page.waitForURL(/math-lab/); await page.waitForSelector('button.choice');
check(/mode=modulus/.test(page.url()), 'focused link opened the Modulus mode of the real game');
await answerMath(page, 3);
let st = await store(page);
check(st.events.length === 3 && st.events.every(e => e.activityId === 'math-lab' && e.assessedMode === 'modulus' && e.attempt === 1 && e.courseId === 'advanced'), 'three real first attempts stored locally with assessed mode');
check(st.events.every(e => /^[\w.:/|%-]+$/.test(e.id)) && new Set(st.events.map(e => e.id)).size === 3, 'stable unique event ids');
await page.goto(GUEST); await page.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await stat(page, 'Questions answered') === '3', 'guest page shows the real answers');
check(await page.locator('li[data-node-id="node:advanced:math-lab:modulus"]').innerText().then(t => /Practice progress · \d correct out of 3 first attempts/.test(t)), 'the Modulus skill got the credit');
check(await page.locator('li[data-node-id="node:advanced:math-lab:division"]').innerText().then(t => /No practice recorded yet/.test(t)), 'unrelated skills got none');
check(!/\b(null|undefined|NaN|\[object)\b/.test(await page.locator('main').innerText()), 'no stray null/undefined text after practice');
check(await page.locator('.guest-after h2').count() === 1 && (await page.locator('.guest-after-list li').count()) >= 2 && (await page.locator('.guest-after-list a[href]').count()) >= 2, 'after-practice choices appear');
const afterLabels = await page.locator('.guest-after-list a, .guest-after-list button').allInnerTexts();
check(['Continue in this area', 'Move to the next area', 'Practice something different'].every(l => afterLabels.includes(l)), 'continue / next area / something different offered');
check((await page.locator('.guest-pickup h2').innerText()) === 'Pick up where you left off', 'resume learning offered');
await page.screenshot({ path: SHOTS + 'desktop-4-after-practice.png', fullPage: false });
await page.locator('.guest-after button', { hasText: 'Not now' }).click();

section('Real Mixed Practice credits the question shown');
await page.goto(BASE + '/java-games/math-lab/?mode=mixed'); await page.waitForSelector('button.choice');
await answerMath(page, 8);
st = await store(page); const mixedEvents = st.events.slice(3);
check(mixedEvents.length === 8 && mixedEvents.every(e => e.assessedMode && e.assessedMode !== 'mixed') && new Set(mixedEvents.map(e => e.assessedMode)).size >= 2, 'Mixed Practice stored each question’s own mode (more than one mode appeared, never "mixed")');
await page.goto(GUEST); await page.waitForSelector('li[data-node-id]', { state: 'attached' });
let perSkill = 0;
for (const id of await page.locator('li[data-node-id^="node:advanced:math-lab"]').evaluateAll(l => l.map(x => x.dataset.nodeId))) {
  const t = await page.locator(`li[data-node-id="${id}"]`).innerText(); const m = t.match(/out of (\d+) first attempts/); perSkill += m ? Number(m[1]) : 0;
}
check(perSkill === 11, 'every answer is credited to exactly one Math Lab skill (3 focused + 8 mixed = 11), got ' + perSkill);
check(await stat(page, 'Questions answered') === '11', 'total matches');

section('Real CSP game event');
const csp = await open(A, BASE + '/csp-games/boolean-gatekeeper/'); await csp.selectOption('#mode', 'evaluate'); await csp.waitForSelector('#true');
await csp.click('#true'); await csp.click('#check'); await csp.waitForTimeout(200);
st = await store(csp); const cspEvent = st.events.find(e => e.courseId === 'csp');
check(!!cspEvent && cspEvent.activityId === 'boolean-gatekeeper' && cspEvent.attempt === 1, 'a real AP CSP answer reached the local store');
await csp.close();
const g2 = await open(A, GUEST + '?course=csp'); await g2.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await stat(g2, 'Questions answered') === '1' && await g2.locator('li[data-node-id] .chip-practice:not(.chip-not-started)').count() >= 1, 'AP CSP progress credited to a mapped CSP skill');
await g2.close();

section('Real Robotics events (Parts Sprint, Component Challenge)');
const robotGuest = await open(A, GUEST + '?course=robotics'); await robotGuest.waitForSelector('li[data-node-id]', { state: 'attached' });
const robotNodes = JSON.parse(fs.readFileSync(new URL('../../../pathway/curriculum-graph.json', import.meta.url))).nodes.filter(n => n.courseId === 'robotics');
const { TRACKED_NODE_IDS } = await import('../coverage-data.mjs');
check(await robotGuest.locator('.guest-untracked').count() === robotNodes.filter(n => !TRACKED_NODE_IDS.has(n.id)).length && robotNodes.some(n => !TRACKED_NODE_IDS.has(n.id)), 'Robotics skills that cannot report are labelled (Course Architect)');
await robotGuest.close();
const ps = await open(A, BASE + '/cs-games/robotics/parts-sprint/'); await ps.selectOption('#category', 'structure'); await ps.selectOption('#mode', { index: 1 }); await ps.click('#start'); await ps.waitForSelector('#typed');
await ps.fill('#typed', 'x'); await ps.getByRole('button', { name: 'Check answer' }).click(); await ps.waitForTimeout(250);
let rst = await store(ps); let rEv = rst.events.filter(e => e.courseId === 'robotics');
check(rEv.length === 1 && rEv[0].activityId === 'parts-sprint' && rEv[0].topic === 'structure' && rEv[0].attempt === 1, 'a real Parts Sprint answer reached the local store');
await ps.close();
const cc = await open(A, BASE + '/cs-games/robotics/component-challenge/'); await cc.click('#begin'); await cc.waitForSelector('#check');
await cc.locator('input[type=radio], input[type=checkbox]').first().check(); await cc.click('#check'); await cc.waitForTimeout(250);
rst = await store(cc); rEv = rst.events.filter(e => e.courseId === 'robotics');
check(rEv.length === 2 && rEv[1].activityId === 'component-challenge', 'a real Component Challenge answer reached the local store');
await cc.close();
const rg = await open(A, GUEST + '?course=robotics'); await rg.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await stat(rg, 'Questions answered') === '2', 'Robotics progress shows both real answers');
check(await rg.locator('li[data-node-id="node:robotics:parts-sprint:structure"]').textContent().then(t => /Practice progress · \d correct out of 1 first attempts/.test(t)), 'the matching Robotics skill received the Parts Sprint credit');
await rg.close();

section('Per-skill tracking labels (measured coverage)');
const gdata = JSON.parse(fs.readFileSync(new URL('../../../pathway/curriculum-graph.json', import.meta.url)));
for (const [course, text] of [['csp', null], ['workplace', 'Workplace Readiness activities are open for practice here']]) {
  const cp = await open(A, GUEST + '?course=' + course); await cp.waitForSelector('li[data-node-id]', { state: 'attached' });
  const nodes = gdata.nodes.filter(n => n.courseId === course), tracked = nodes.filter(n => TRACKED_NODE_IDS.has(n.id)).length;
  check(await cp.locator('.guest-untracked').count() === nodes.length - tracked, `${course}: every untracked skill says so (${nodes.length - tracked})`);
  check((await cp.locator('.guest-coverage').innerText()).includes(`${tracked} of ${nodes.length} skills`), `${course}: the course note states the measured count`);
  if (text) check((await cp.locator('.guest-coverage').innerText()).includes(text), `${course}: explains why nothing updates`);
  await cp.close();
}
await A.pages()[0]?.goto(GUEST + '?course=advanced');

// ---------- 3. daily reset, class isolation ----------
section('Learner D: Session Summary resets daily, local history stays');
await page.goto(BASE + '/java-games/math-lab/'); await page.waitForSelector('button.choice');
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('javaGames.session.v1')); s.sessionDate = '2000-01-01'; localStorage.setItem('javaGames.session.v1', JSON.stringify(s)); });
await page.reload(); await page.waitForSelector('button.choice');
const sess = await page.evaluate(() => JSON.parse(localStorage.getItem('javaGames.session.v1')));
check(sess.sessionDate !== '2000-01-01' && sess.totals.attempted === 0, 'the daily session summary was reset');
check((await store(page)).events.filter(e => e.courseId === 'advanced').length === 11, 'the independent history is untouched by the reset');
await page.goto(GUEST + '?course=advanced'); await page.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await stat(page, 'Questions answered') === '11', 'guest page still shows all earlier practice');

section('Learner F: later joins a class on the same browser');
const before = await page.evaluate(k => localStorage.getItem(k), KEY);
const PID = '0a1b2c3d-1111-4222-8333-444455556666';
await page.evaluate(id => localStorage.setItem('wrg.profile.active.v1', JSON.stringify({ id, token: 'c'.repeat(64), expires: Date.now() + 1e9, classId: 'class-1', courseId: 'advanced' })), PID);
await page.goto(BASE + '/java-games/math-lab/?mode=modulus'); await page.waitForSelector('button.choice');
await answerMath(page, 1);
const classKeys = await page.evaluate(id => Object.keys(localStorage).filter(k => k.startsWith('wrg.profile.' + id + '.outbox.')), PID);
check(classKeys.length === 1, 'while a class profile is active the answer goes to the class queue');
check(await page.evaluate(k => localStorage.getItem(k), KEY) === before, 'guest progress is not changed by class practice');
check(!(JSON.stringify(await store(page))).includes(PID), 'no class identifier inside guest progress');
await page.goto(GUEST + '?course=advanced'); await page.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await stat(page, 'Questions answered') === '11', 'guest numbers exclude class practice');
await page.locator('.guest-storage summary').click();
check(/class profile is active/i.test(await page.locator('.guest-storage').innerText()), 'learner is told where practice is going');
await page.locator('.guest-storage').screenshot({ path: SHOTS + 'desktop-6-class-profile-on-same-browser.png' });
await page.evaluate(id => { for (const k of Object.keys(localStorage)) if (k.startsWith('wrg.profile.')) localStorage.removeItem(k); }, PID);
await page.reload(); await page.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await stat(page, 'Questions answered') === '11', 'leaving the class restores independent progress');

// ---------- 4. backup, restore, clear ----------
section('Backup, restore, clear');
const totalEvents = (await store(page)).events.length;
await page.locator('.guest-storage summary').click();
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download a backup")')]);
const backupPath = await dl.path(); const backup = fs.readFileSync(backupPath, 'utf8');
check(JSON.parse(backup).format === 'cs-games-guest-progress' && !/name|email|password|token/i.test(backup.replace(/"note".*/, '').replace(/"familyId"/g, '')), 'backup is JSON without identity fields');
page.once('dialog', d => d.dismiss()); await page.click('button:has-text("Clear my progress")'); await page.waitForTimeout(100);
check((await store(page))?.events.length === totalEvents, 'cancelling the confirmation keeps progress (' + totalEvents + ' answers)');
page.once('dialog', d => { check(/cannot be undone/.test(d.message()), 'confirmation explains deletion'); d.accept(); }); await page.click('button:has-text("Clear my progress")'); await page.waitForTimeout(200);
check(await page.evaluate(k => localStorage.getItem(k), KEY) === null, 'progress deleted after confirmation');
check(await page.locator('.guest-course').count() === 4 && await page.locator('li[data-node-id]').count() === 0, 'back to the course chooser');
await page.locator('.guest-storage summary').click();
await page.setInputFiles('#restore-file', backupPath); await page.waitForTimeout(300);
check((await store(page)).events.length === totalEvents, 'restore brings the practice back');
const hostile = JSON.parse(backup); hostile.data.award = { nodeId: 'x' }; hostile.data.mastery = 4; hostile.data.events[0].nodeIds = ['node:advanced:everything']; hostile.data.events[0].verified = true;
const hostilePath = path.join('/tmp', 'hostile-backup.json'); fs.writeFileSync(hostilePath, JSON.stringify(hostile));
await page.setInputFiles('#restore-file', hostilePath); await page.waitForTimeout(300);
check(/Ignored unsupported fields: award, mastery/.test(await page.locator('#guest-notice').innerText()), 'hostile fields reported and ignored');
check(!JSON.stringify(await store(page)).match(/award|mastery|verified|everything/), 'nothing trusted is stored from an imported file');
fs.writeFileSync('/tmp/bad.json', '{"format":"nope"}'); await page.setInputFiles('#restore-file', '/tmp/bad.json'); await page.waitForTimeout(200);
check(/not a CS Games progress backup/.test(await page.locator('#guest-notice').innerText()), 'wrong files are refused with a clear message');

// ---------- 5. storage failures ----------
section('Local storage disabled / corrupted');
const blocked = await ctxWith();
await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); });
const bp = await open(blocked, GUEST); await bp.click('[data-course="csp"]'); await bp.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await bp.locator('li[data-node-id]').count() === 58, 'pathway works with storage blocked');
check(/not allowing saved progress/.test(await bp.locator('#guest-storage-note').innerText()), 'learner is told, visibly, that progress will not be saved');
await blocked.close();
const bad = await ctxWith(); await bad.addInitScript(k => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, '{broken'); sessionStorage.setItem('seeded', '1'); } }, KEY);
const cp = await open(bad, GUEST + '?course=advanced'); await cp.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await cp.locator('li[data-node-id]').count() === 123, 'corrupted record recovered, pathway loads');
check(/could not be read/.test(await cp.locator('#guest-storage-note').innerText()), 'recovery is explained visibly');
check(await cp.evaluate(k => localStorage.getItem(k + ':corrupt'), KEY) === '{broken', 'unreadable copy kept aside');
await bad.close();

// ---------- 6. layout, keyboard, accessibility ----------
section('Responsive layouts, keyboard and accessibility');
for (const [name, size] of [['chromebook', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }], ['small-phone', { width: 360, height: 740 }], ['tablet', { width: 768, height: 1024 }]]) {
  const ctx = await ctxWith({ viewport: size, isMobile: size.width < 500, hasTouch: size.width < 800 });
  const p = await open(ctx, GUEST + '?course=advanced'); await p.waitForSelector('li[data-node-id]', { state: 'attached' });
  await p.locator('details.pathway-area').first().evaluate(d => d.open = true);
  const dims = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  check(dims.sw <= dims.iw + 1, `${name}: no horizontal scrolling (${dims.sw} <= ${dims.iw})`);
  const small = await p.evaluate(() => [...document.querySelectorAll('.guest-mark,.guest-course,.guest-storage-actions button,.pathway-actions a')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 43.5).length);
  check(small === 0, `${name}: every control is at least 44px tall (${small} small)`);
  await p.screenshot({ path: SHOTS + `${name}-advanced.png` });
  if (name === 'phone') {
    await p.locator('.guest-pickup').screenshot({ path: SHOTS + 'phone-pick-up-card.png' });
    await p.locator('li[data-node-id]').first().scrollIntoViewIfNeeded();
    await p.locator('li[data-node-id]').first().screenshot({ path: SHOTS + 'phone-skill-controls.png' });
  }
  await ctx.close();
}
const kb = await ctxWith(); const k = await open(kb, GUEST + '?course=advanced'); await k.waitForSelector('li[data-node-id]', { state: 'attached' });
let reached = false;
for (let i = 0; i < 120 && !reached; i++) { await k.keyboard.press('Tab'); reached = await k.evaluate(() => document.activeElement?.matches?.('.guest-pickup a.button')); }
check(reached, 'Tab reaches the Resume/Start action using only the keyboard');
await Promise.all([k.waitForURL(/\/java-games\//), k.keyboard.press('Enter')]);
check(/variable-lab/.test(k.url()), 'Enter opens the suggested practice game');
await kb.close();
const rm = await ctxWith({ reducedMotion: 'reduce' }); const r = await open(rm, GUEST + '?course=csp'); await r.waitForSelector('li[data-node-id]', { state: 'attached' });
check(await r.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.documentElement).scrollBehavior === 'auto'), 'reduced motion respected');
await rm.close();
if (fs.existsSync(AXE)) {
  for (const [label, scheme] of [['dark', 'dark'], ['light', 'light']]) {
    const ctx = await ctxWith({ colorScheme: scheme }); const p = await open(ctx, GUEST + '?course=advanced'); await p.waitForSelector('li[data-node-id]', { state: 'attached' });
    await p.locator('details.pathway-area').first().evaluate(d => d.open = true);
    await p.addScriptTag({ path: AXE });
    const res = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }));
    check(res.violations.length === 0, `axe (${label}): ${res.violations.map(v => v.id + '×' + v.nodes.length).join(', ') || 'no violations'}`);
    await ctx.close();
  }
} else console.log('  (axe-core not found; accessibility scan skipped)');

// ---------- 7. network ----------
section('Network: nothing leaves the browser');
const guestPages = log.requests.filter(r => r.url.startsWith(GUEST));
const writes = log.requests.filter(r => r.method !== 'GET' && !/\/api\/wpr\//.test(r.url));
check(writes.length === 0, 'no non-GET request other than the class-profile sync that only runs with a class profile (' + writes.length + ')');
const external = log.requests.filter(r => !r.url.startsWith(BASE) && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
check(external.length === 0, 'no request to any other host (' + external.map(r => r.url).slice(0, 3).join(', ') + ')');
const classSyncs = log.requests.filter(r => /\/api\/wpr\//.test(r.url) && r.method !== 'GET');
console.log('  class-profile sync attempts (only during the simulated class session):', classSyncs.length);
check(log.errors.length === 0, 'no page errors or console errors: ' + log.errors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\nBROWSER CHECKS: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
