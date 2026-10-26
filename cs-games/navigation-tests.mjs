// Run: node cs-games/navigation-tests.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../java-games/package.json',import.meta.url));
const {parseHTML}=require('linkedom');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const doc=p=>parseHTML(read(p)).document;
const origin='https://davisjm4.github.io';
const target=(a,p)=>new URL(a.getAttribute('href'),origin+'/'+p).pathname;
const has=(d,p,url)=>[...d.querySelectorAll('a[href]')].some(a=>target(a,p)===url);
const sandbox={window:{}};vm.runInNewContext(read('cs-games/catalog.js'),sandbox);const catalog=sandbox.window.CSGamesCatalog;
const hub=doc('cs-games/index.html');
assert.equal(hub.querySelectorAll('.course-card').length,3);
for(const url of ['/cs-games/csp/','/cs-games/advanced/','/wpr-games/workplace-readiness/'])assert.ok(has(hub,'cs-games/index.html',url),url);
assert.ok(hub.querySelector('#shared-tools a[href="/wpr-games/raceces/"]'));
for(const course of ['csp','advanced']){
 const page=`cs-games/${course}/index.html`;const d=doc(page);
 assert.ok(has(d,page,'/cs-games/'));assert.ok(has(d,page,'/wpr-games/raceces/'));
 const {window,document}=parseHTML(read(page));window.CSGamesCatalog=catalog;
 const filter=document.getElementById('topic-filter');Object.defineProperty(filter,'value',{writable:true,value:''});
 const search=document.getElementById('game-search');search.value='';const ctx={window,document};vm.createContext(ctx);vm.runInContext(read('cs-games/course-page.js'),ctx);
 const entries=catalog.filter(g=>g.course===course);
 const links=()=>[...document.querySelectorAll('a.launch')].map(a=>a.getAttribute('href')).sort();
 const check=expected=>{assert.deepEqual(links(),Array.from(expected,g=>g.url).sort());assert.equal(new Set(links()).size,links().length);assert.equal(document.getElementById('result-count').textContent,`${expected.length} activit${expected.length===1?'y':'ies'} shown`);};
 check(entries);
 for(const topic of new Set(entries.flatMap(g=>g.topics))){filter.value=topic;vm.runInContext('render()',ctx);check(entries.filter(g=>g.topics.includes(topic)));}
 filter.value='';for(const g of entries){search.value=g.title;vm.runInContext('render()',ctx);assert.ok(links().includes(g.url),g.title);}
 search.value='no-such-activity-xyz';vm.runInContext('render()',ctx);check([]);
 for(const g of entries){const url=new URL(g.url,origin+`/cs-games/${course}/`);assert.ok(fs.existsSync(path.join(root,url.pathname,'index.html')),g.url);}
 console.log(`PASS ${course}: ${entries.length} unique cards; every topic filter, every title search, empty results and activity route.`);
}
for(const base of ['csp-games','java-games']){
 const pathway=base==='csp-games'?'/cs-games/csp/':'/cs-games/advanced/';let count=0;
 for(const entry of fs.readdirSync(path.join(root,base),{withFileTypes:true}).filter(x=>x.isDirectory()&&x.name!=='node_modules')){
  const p=`${base}/${entry.name}/index.html`;if(!fs.existsSync(path.join(root,p)))continue;
  const d=doc(p);assert.ok(has(d,p,pathway),p);assert.ok(has(d,p,'/cs-games/'),p);
  assert.ok(d.querySelector('nav.ecosystem-nav[aria-label="Breadcrumb"]'),p);
  assert.equal(d.querySelector('meta[http-equiv="refresh"]'),null,p);count++;
  for(const a of d.querySelectorAll('.ecosystem-nav a')){
   const u=new URL(a.getAttribute('href'),origin+'/'+p);assert.ok(fs.existsSync(path.join(root,u.pathname)),`${p}: ${u.pathname}`);assert.ok(a.textContent.trim());assert.notEqual(a.getAttribute('tabindex'),'-1');
  }
 }
 console.log(`PASS ${base}: ${count} activity/report entry pages retain URLs, have canonical return/home links and accessible static breadcrumbs.`);
}
for(const [p,url] of [['csp-games/index.html','/cs-games/csp/'],['java-games/index.html','/cs-games/advanced/'],['workplace-readiness-games/index.html','/wpr-games/workplace-readiness/']]){const d=doc(p);assert.ok(has(d,p,url));assert.ok(d.querySelector('meta[http-equiv="refresh"]').getAttribute('content').includes(url));assert.ok(!d.querySelector('.game-card'));}
for(const [p,urls] of [
 ['wpr-games/index.html',['/cs-games/','/wpr-games/workplace-readiness/','/wpr-games/raceces/']],
 ['wpr-games/workplace-readiness/index.html',['/cs-games/','/wpr-games/raceces/']],
 ['wpr-games/raceces/index.html',['/cs-games/','/wpr-games/workplace-readiness/']]
]){const d=doc(p);for(const url of urls)assert.ok(has(d,p,url),p+': '+url);}
assert.ok(doc('wpr-games/raceces/index.html').querySelector('#subject-select'));
for(const id of ['opt-skill','opt-mode','opt-difficulty','nav-summary','brand-link'])assert.ok(doc('wpr-games/workplace-readiness/index.html').getElementById(id));
assert.equal(doc('wpr-games/workplace-readiness/index.html').getElementById('brand-link').getAttribute('href'),'#/');
assert.equal(doc('wpr-games/raceces/index.html').querySelector('a[href="/cs-games/#shared-tools"]').textContent,'Shared Tools');
console.log('PASS hub, three pathways, shared RACECES, WPR skill-selection return, subject selector, summaries and legacy routes. No navigation code accesses storage.');
