import assert from 'node:assert/strict';
export let checks=0;export const ok=(x,m)=>{assert.ok(x,m);checks++;};export const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};export const bad=f=>{assert.throws(f);checks++;};
export const now='2026-10-25T12:00:00.000Z';
export const event=(i,extra={})=>({id:'e'+i,skillId:'CSP-BOOLEAN',gameId:'boolean-gatekeeper',timestamp:`2026-10-${String(20+Math.floor(i/15)).padStart(2,'0')}T12:${String(i%60).padStart(2,'0')}:00.000Z`,sessionId:'s'+Math.floor(i/15),attempts:1,firstTryCorrect:1,quality:'direct',context:'context'+i%2,...extra});
export const memory=()=>{const m=new Map();return {m,getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
