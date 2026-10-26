// Run: node cs-games/catalog-tests.mjs (uses java-games' linkedom dev dependency).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../java-games/package.json',import.meta.url));
const {parseHTML}=require('linkedom');
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const origin='https://davisjm4.github.io';
const canonical='/cs-games/advanced/';
const context={window:{}};vm.runInNewContext(read('cs-games/catalog.js'),context);
const catalog=Array.from(context.window.CSGamesCatalog);
const advanced=catalog.filter(g=>g.course==='advanced');
// Infrastructure is excluded explicitly; new immediate child entry points must be cataloged.
const infrastructure=new Set(['session-summary']);
const games=fs.readdirSync(path.join(root,'java-games'),{withFileTypes:true})
  .filter(d=>d.isDirectory()&&!infrastructure.has(d.name)&&fs.existsSync(path.join(root,'java-games',d.name,'index.html')))
  .map(d=>d.name).sort();
function resolve(href,base){return new URL(href,origin+base).pathname;}
function documentAt(p){return parseHTML(read(p)).document;}
function checkEntry(g){
  assert.ok(g.title&&g.description&&g.skill&&g.topics.length,`Incomplete metadata: ${g.id}`);
  assert.ok(!g.disabled,`Disabled catalog entry: ${g.id}`);
  const url=resolve(g.url,`/cs-games/${g.course==='advanced'?'advanced':'csp'}/`);
  assert.ok(fs.existsSync(path.join(root,url,'index.html')),`Missing entry point: ${url}`);
  return url;
}
for(const course of ['advanced','csp']){
  const entries=catalog.filter(g=>g.course===course);
  assert.equal(new Set(entries.map(g=>g.id)).size,entries.length,`${course}: duplicate IDs`);
  const urls=entries.map(checkEntry);
  assert.equal(new Set(urls).size,urls.length,`${course}: duplicate URLs`);
}
for(const slug of games){
  const route=`/java-games/${slug}/`;
  assert.equal(advanced.filter(g=>resolve(g.url,canonical)===route).length,1,`Catalog missing or duplicates ${slug}`);
  const doc=documentAt(`java-games/${slug}/index.html`);
  assert.ok(doc.querySelector('script[src]'),`No playable script: ${slug}`);
  assert.ok(!doc.querySelector('meta[http-equiv="refresh"]'),`Game redirects: ${slug}`);
  const back=doc.querySelector('header .ecosystem-nav a[href="/cs-games/advanced/"]');
  assert.equal(resolve(back?.getAttribute('href'),route),canonical,`${slug}: primary return destination`);
  assert.match(back.textContent,/Advanced Computer Science/,`${slug}: return label`);
}
const legacy=read('java-games/index.html');
assert.match(legacy, /http-equiv="refresh" content="0; url=\/cs-games\/advanced\/"/);
assert.match(legacy,/location.replace\('\/cs-games\/advanced\/'\)/);
assert.equal(documentAt('java-games/index.html').querySelector('a').getAttribute('href'),canonical);
assert.doesNotMatch(legacy,/src=.*app.js|game-card/);
const summary=documentAt('java-games/session-summary/index.html');
assert.ok([...summary.querySelectorAll('a')].some(a=>resolve(a.getAttribute('href'),'/java-games/session-summary/')===canonical));
// Nested practice mode retains its valid parent-game return, not a second catalog card.
const nested='java-games/class-object-lab/class-builder-rearrange/index.html';
assert.equal(resolve(documentAt(nested).querySelector('a').getAttribute('href'),'/java-games/class-object-lab/class-builder-rearrange/'),'/java-games/class-object-lab/');
for(const page of ['cs-games/index.html','cs-games/advanced/index.html','cs-games/csp/index.html','cs-games/teacher/index.html']){
  for(const a of documentAt(page).querySelectorAll('a[href]')){
    const url=new URL(a.getAttribute('href'),origin+'/'+page);
    if(url.origin!==origin||url.hash)continue;
    const p=path.join(root,url.pathname);
    assert.ok(fs.existsSync(p),`${page}: broken relative link ${url.pathname}`);
  }
}
// Exercise real renderer: all Advanced games once; every topic and search still work.
const {window,document}=parseHTML(read('cs-games/advanced/index.html'));
window.CSGamesCatalog=catalog;
const filter=document.getElementById('topic-filter');
Object.defineProperty(filter,'value',{writable:true,value:''});
document.getElementById('game-search').value='';
const ui={window,document};vm.createContext(ui);
vm.runInContext(read('cs-games/course-page.js'),ui);
const launches=()=>[...document.querySelectorAll('a.launch')].map(a=>a.getAttribute('href'));
assert.equal(launches().length,advanced.length);
assert.equal(new Set(launches()).size,advanced.length);
for(const topic of new Set(advanced.flatMap(g=>g.topics))){
  filter.value=topic;vm.runInContext('render()',ui);
  assert.deepEqual(launches().sort(),advanced.filter(g=>g.topics.includes(topic)).map(g=>g.url).sort(),`Filter: ${topic}`);
}
filter.value='';document.getElementById('game-search').value='String Lab';vm.runInContext('render()',ui);
assert.deepEqual(launches(),advanced.filter(g=>g.id==='string-lab').map(g=>g.url));
console.log(`PASS: ${games.length} playable Java games, ${advanced.filter(g=>g.source==='java').length} Java catalog entries; catalog routes, unique cards, all topic filters, search, homepage redirect, nested routes, return links, summary, CSP/Teacher navigation.`);
// A cross-curriculum activity must actually render in the five CSP groups,
// not disappear because a descriptive tag alone matches none of the groups.
{
  const {window,document}=parseHTML(read('cs-games/csp/index.html'));window.CSGamesCatalog=catalog;
  const filter=document.getElementById('topic-filter');Object.defineProperty(filter,'value',{writable:true,value:''});
  document.getElementById('game-search').value='Vocabulary';const cspUI={window,document};vm.createContext(cspUI);vm.runInContext(read('cs-games/course-page.js'),cspUI);
  const links=()=>[...document.querySelectorAll('a.launch')].filter(a=>a.getAttribute('href')==='../../csp-games/vocabulary-fill-in-lab/');
  assert.equal(links().length,1,'Vocabulary launch must appear once while retaining all topic filters.');
  filter.value='All five Big Ideas';vm.runInContext('render()',cspUI);assert.equal(links().length,1);
  for(const topic of ['1.2 Program Purpose','2.1 Binary Representation','3.1 Program Components','4.1 Network Communication','5.1 Computing Innovations']){filter.value=topic;vm.runInContext('render()',cspUI);assert.equal(links().length,1,topic);}
  console.log('PASS: Vocabulary catalog launches once across all topic filters.');
}

{ const {window,document}=parseHTML(read('cs-games/csp/index.html'));window.CSGamesCatalog=catalog;const f=document.getElementById('topic-filter');Object.defineProperty(f,'value',{writable:true,value:''});document.getElementById('game-search').value='Internet Layers';const ctx={window,document};vm.createContext(ctx);vm.runInContext(read('cs-games/course-page.js'),ctx);assert.ok(document.querySelector('a.launch[href="../../csp-games/internet-layers-lab/"]'));for(const t of ['4.1 Network Communication','4.2 Routing','4.3 Fault Tolerance']){f.value=t;vm.runInContext('render()',ctx);assert.ok(document.querySelector('a.launch[href="../../csp-games/internet-layers-lab/"]'),t);}console.log('PASS: Internet lab appears in CSP catalog and all its topic filters.');}

{const {window,document}=parseHTML(read('cs-games/csp/index.html'));window.CSGamesCatalog=catalog;const f=document.getElementById('topic-filter');Object.defineProperty(f,'value',{writable:true,value:'4.1 Network Communication'});document.getElementById('game-search').value='';const ctx={window,document};vm.createContext(ctx);vm.runInContext(read('cs-games/course-page.js'),ctx);for(const slug of ['tcp-udp-lab','internet-layers-lab']){assert.equal(catalog.filter(g=>g.id===slug).length,1);assert.equal(document.querySelectorAll('a.launch[href="../../csp-games/'+slug+'/"]').length,1);}console.log('PASS: TCP/UDP and Internet Layers each launch once in networking catalog.');}
// Applied ethics remains one launch in Big Idea 5, alongside existing impact practice.
{
 const {window,document}=parseHTML(read('cs-games/csp/index.html'));window.CSGamesCatalog=catalog;
 const filter=document.getElementById('topic-filter');Object.defineProperty(filter,'value',{writable:true,value:''});
 document.getElementById('game-search').value='AI Ethics';const ui={window,document};vm.createContext(ui);vm.runInContext(read('cs-games/course-page.js'),ui);
 const links=()=>[...document.querySelectorAll('a.launch')].filter(a=>a.getAttribute('href')==='../../csp-games/ai-ethics-lab/');
 assert.equal(links().length,1);assert.ok(document.getElementById('results').textContent.includes('Impact of Computing'));
 for(const topic of catalog.find(g=>g.id==='ai-ethics-lab').topics){filter.value=topic;vm.runInContext('render()',ui);assert.equal(links().length,1,topic);}
 filter.value='4.1 Network Communication';vm.runInContext('render()',ui);assert.equal(links().length,0);
 console.log('PASS: AI Ethics renders exactly once under Big Idea 5 and each of its five topic filters.');
}
// Digital Divide adds applied access practice without replacing impact or AI labs.
{
 const {window,document}=parseHTML(read('cs-games/csp/index.html'));window.CSGamesCatalog=catalog;
 const filter=document.getElementById('topic-filter');Object.defineProperty(filter,'value',{writable:true,value:''});
 document.getElementById('game-search').value='Digital Divide';const ui={window,document};vm.createContext(ui);vm.runInContext(read('cs-games/course-page.js'),ui);
 const links=()=>[...document.querySelectorAll('a.launch')].filter(a=>a.getAttribute('href')==='../../csp-games/digital-divide-lab/');assert.equal(links().length,1);assert.ok(document.getElementById('results').textContent.includes('Impact of Computing'));
 for(const topic of catalog.find(g=>g.id==='digital-divide-lab').topics){filter.value=topic;vm.runInContext('render()',ui);assert.equal(links().length,1);}
 for(const id of ['computing-impact-lab','ai-ethics-lab','vocabulary-fill-in-lab'])assert.equal(catalog.filter(g=>g.course==='csp'&&g.id===id).length,1);
 console.log('PASS: Digital Divide launches once under Big Idea 5 and its topic filters; existing impact/AI/vocabulary entries preserved.');
}
// G-117 uses the existing catalog grouping rather than a separate index.
{
 const {window,document}=parseHTML(read('cs-games/csp/index.html'));window.CSGamesCatalog=catalog;
 const filter=document.getElementById('topic-filter');Object.defineProperty(filter,'value',{writable:true,value:''});
 document.getElementById('game-search').value='Copyright';const ui={window,document};vm.createContext(ui);vm.runInContext(read('cs-games/course-page.js'),ui);
 const links=()=>document.querySelectorAll('a.launch[href="../../csp-games/copyright-creative-commons-lab/"]');assert.equal(links().length,1);assert.ok(document.getElementById('results').textContent.includes('Impact of Computing'));
 filter.value='5.5 Responsible Computing';vm.runInContext('render()',ui);assert.equal(links().length,1);
 filter.value='4.1 Network Communication';vm.runInContext('render()',ui);assert.equal(links().length,0);
 console.log('PASS: Copyright lab launches once in Big Idea 5 and Responsible Computing, with topic filtering.');
}
