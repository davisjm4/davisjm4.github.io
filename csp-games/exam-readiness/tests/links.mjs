import {GAMES} from '../games.js';
let failed=0;for(let i=0;i<GAMES.length;i+=5){await Promise.all(GAMES.slice(i,i+5).map(async g=>{try{const r=await fetch('https://davisjm4.github.io'+g.url,{signal:AbortSignal.timeout(20000)});console.log(`${r.status} ${g.url}`);if(!r.ok)failed++;}catch(e){console.log(`ERROR ${g.url}: ${e.message}`);failed++;}}));}if(failed)process.exitCode=1;
