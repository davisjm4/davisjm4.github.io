import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from './engine.js';
import {createSessionTracker} from '../session.js';
let checks=0;const ok=(x,m)=>{assert.ok(x,m);checks++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;},near=(a,b,t=1e-4)=>ok(Math.abs(a-b)<t,`${a} ≈ ${b}`);
for(let n=0;n<256;n++){
 eq(E.fromBinary(E.binary(n)),n);eq(E.fromHex(E.hexByte(n)),n);eq(E.fromHex(E.hexByte(E.fromBinary(E.binary(n)))),n);
 eq([...E.binary(n)].reduce((s,b,i)=>s+Number(b)*E.WEIGHTS[i],0),n);
 for(let i=0;i<8;i++){eq(E.toggle([n,0,0],0,i)[0],n^E.WEIGHTS[i]);eq(E.toggle(E.toggle([n,1,2],0,i),0,i),[n,1,2]);}
}
eq(E.WEIGHTS,[128,64,32,16,8,4,2,1]);eq(E.binary(0),'00000000');eq(E.binary(255),'11111111');
for(const [h,n] of [['00',0],['0F',15],['10',16],['7F',127],['80',128],['FF',255]])eq(E.fromHex(h),n);
for(let c=0;c<3;c++) for(let i=0;i<2;i++)for(const d of E.DIGITS){const rgb=E.editHex([0,0,0],c,i,d);eq(rgb[c],parseInt(d,16)*(i===0?16:1));eq(rgb.filter((_,k)=>k!==c),[0,0]);}
eq(E.hex([0,15,255]),'#000FFF');eq(E.css([1,2,3]),'rgb(1, 2, 3)');eq(E.editHex([1,2,3],1,0,'F'),[1,242,3]);
for(const invalid of [-1,256,NaN,2.5]){assert.throws(()=>E.binary(invalid));checks++;}
for(const s of ['','GG','123','0x']){assert.throws(()=>E.fromHex(s));checks++;}
for(const s of ['101','11111112','000000000']){assert.throws(()=>E.fromBinary(s));checks++;}
assert.throws(()=>E.editHex([0,0,0],0,0,'GG'));checks++;
near(E.linearSRGB(0),0);near(E.linearSRGB(255),1);near(E.linearSRGB(10),.003035269835,1e-10);near(E.linearSRGB(11),.003346535764,1e-10);
const known=[[[0,0,0],[0,0,0]],[[255,255,255],[100,0,0]],[[255,0,0],[53.2408,80.0925,67.2032]],[[0,255,0],[87.7347,-86.1827,83.1793]],[[0,0,255],[32.2970,79.1875,-107.8602]]];
for(const [rgb,lab]of known)E.lab(rgb).forEach((x,i)=>near(x,lab[i],.001));
const fixture=fs.readFileSync(new URL('./fixtures/ciede2000.txt',import.meta.url),'utf8').trim().split(/\r?\n/).map(l=>l.trim().split(/\s+/).map(Number));
eq(fixture.length,34,'All 34 Sharma/Wu/Dalal supplemental pairs');
for(const row of fixture){const [l,a,b,L,A,B,want]=row;near(E.deltaE00([l,a,b],[L,A,B]),want,.000051);near(E.deltaE00([L,A,B],[l,a,b]),want,.000051);}
for(const n of [0,1,17,128,254,255])ok(E.matches([n,n,n],[n,n,n]),'Exact always passes');
ok(E.acceptsDistance(6));ok(E.acceptsDistance(5.999999));ok(!E.acceptsDistance(6.000001));ok(!E.acceptsDistance(NaN));ok(!E.acceptsDistance(-1));
const examples=[[[255,0,0],[245,10,10],true],[[0,255,0],[10,245,10],true],[[0,0,255],[10,10,245],true],[[128,128,128],[144,144,144],true],[[128,128,128],[146,146,146],false],[[0,0,0],[255,255,255],false],[[255,0,0],[0,255,0],false],[[0,0,255],[255,0,0],false],[[34,34,34],[85,85,85],false],[[255,255,0],[255,0,255],false]];
const tolerance=examples.map(([a,b,pass])=>{eq(E.matches(a,b),pass);near(E.distance(a,b),E.distance(b,a),1e-9);return{target:a,student:b,distance:E.distance(a,b),accepted:pass};});
const bank=E.pools();eq(Object.values(bank).flat().length,4096);eq(new Set(Object.values(bank).flat().map(E.hex)).size,4096);
for(const [f,rs]of Object.entries(bank))for(const rgb of rs){eq(E.family(rgb),f);ok(/^#[0-9A-F]{6}$/.test(E.hex(rgb)));ok(rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255));ok(E.matches(rgb,rgb));}
const a=E.createGenerator({seed:123}),b=E.createGenerator({seed:123});for(let i=0;i<100;i++)eq(a.next(),b.next());
const report={rounds:0,seeds:20,exactRepeatsWithin50:0,adjacentNearDuplicates:0,consecutiveFamilies:0,fallbacks:0,minAdjacentDistance:Infinity,maximumMixedStreak:0,distribution:Object.fromEntries(E.FAMILIES.map(f=>[f,0])),modes:{binary:0,hex:0},poolSizes:Object.fromEntries(Object.entries(bank).map(([f,p])=>[f,p.length])),toleranceExamples:tolerance};
const sample=[];
for(let seed=0;seed<20;seed++){
 const gen=E.createGenerator({seed}),recent=[];let previous=null,streak=0;
 for(let i=0;i<1000;i++){
  const q=gen.next(),code=E.hex(q.rgb);report.rounds++;
  if(recent.includes(code))report.exactRepeatsWithin50++;
  if(previous){if(q.distanceFromPrevious<E.MIN_SEPARATION)report.adjacentNearDuplicates++;if(previous.family===q.family)report.consecutiveFamilies++;report.minAdjacentDistance=Math.min(report.minAdjacentDistance,q.distanceFromPrevious);}
  streak=q.mode===previous?.mode?streak+1:1;report.maximumMixedStreak=Math.max(report.maximumMixedStreak,streak);
  report.distribution[q.family]++;report.modes[q.mode]++;if(q.fallback)report.fallbacks++;
  if(seed===0&&i<256)sample.push({...q,round:i+1,hex:code,binary:q.rgb.map(E.binary)});
  recent.push(code);if(recent.length>50)recent.shift();previous=q;
 }
 ok(Math.abs(gen.history().filter(q=>q.mode==='binary').length-25)<=2,'Mixed balanced in rolling history');
}
eq(report.exactRepeatsWithin50,0);eq(report.adjacentNearDuplicates,0);eq(report.consecutiveFamilies,0);eq(report.fallbacks,0);ok(report.maximumMixedStreak<=2);
const counts=Object.values(report.distribution);ok(Math.max(...counts)-Math.min(...counts)<=40,'Balanced families per seed');
ok(sample.some(q=>q.hex==='#000000'),'black appears');ok(sample.some(q=>q.hex==='#FFFFFF'),'white appears');
// Fixed/mixed mode switches share exact target history, including after reload.
const gen=E.createGenerator({seed:5});let recent=[];for(let i=0;i<300;i++){const q=gen.next(['binary','hex','mixed'][i%3]);ok(!recent.includes(E.hex(q.rgb)));recent.push(E.hex(q.rgb));if(recent.length>50)recent.shift();}
const loaded=E.createGenerator({seed:5,history:gen.history()});ok(!recent.includes(E.hex(loaded.next().rgb)));
const tiny=E.createGenerator({seed:1,bank:{red:[[255,0,0]],grayscale:[[0,0,0]]}});tiny.next();tiny.next();assert.throws(()=>tiny.next(),RangeError);checks++;
// Shared session contract: adjustments don't submit; only first check counts.
let time='2026-10-24T12:00:00Z',id=0;const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
const tracker=createSessionTracker({storage,now:()=>time,id:()=>String(++id)}),r=tracker.begin('rgb','RGB','binary','Binary','binary','Binary');
for(let i=0;i<100;i++)tracker.interact(r);eq(tracker.snapshot().totals.attempted,0);
tracker.submit(r,false);tracker.submit(r,true);eq(tracker.snapshot().totals.attempted,1);eq(tracker.snapshot().totals.firstTry,0);eq(tracker.snapshot().totals.afterRetry,1);
tracker.addActiveSeconds(20);eq(tracker.snapshot().activeSeconds,20);
time='2026-10-25T12:00:00Z';eq(tracker.snapshot().totals.attempted,0);eq(tracker.snapshot().activeSeconds,0);eq(tracker.status(r),'expired');
fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('./reports/generator-quality.json',import.meta.url),JSON.stringify({...report,checks},null,2)+'\n');
fs.writeFileSync(new URL('./reports/sample-256.json',import.meta.url),JSON.stringify(sample,null,2)+'\n');
console.log(`RGB numerical / generator / session: ${checks} assertions passed. ${report.rounds} rounds, ${report.exactRepeatsWithin50} exact repeats, ${report.adjacentNearDuplicates} adjacent near-duplicates. Min ΔE00 ${report.minAdjacentDistance}; max Mixed streak ${report.maximumMixedStreak}.`);
