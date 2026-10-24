// Conservative backwards dataflow for repetition identity. Unlike a concrete
// trace, this includes both possible branches and every relevant loop stage.
// Changing data, match positions, or iteration counts cannot create a new key.
export function staticSlice(program){
  const selected=new Set(),parents=new Map();
  const root=n=>{if(!parents.has(n))parents.set(n,n);if(parents.get(n)!==n)parents.set(n,root(parents.get(n)));return parents.get(n);};
  const unite=(a,b)=>parents.set(root(a),root(b));
  function aliases(list){for(const s of list){if(s.op==='reference'||s.op==='row-reference'||s.op==='returned-reference'&&!s.copy)unite(s.name,s.source);if(s.op==='call')unite('p',s.source);for(const k of ['body','yes','no'])if(s[k])aliases(s[k]);}}aliases(program.statements);
  const fresh=()=>({scalar:new Set(),array:new Set(),ref:new Set()});
  const clone=n=>Object.fromEntries(Object.entries(n).map(([k,v])=>[k,new Set(v)]));
  const merge=(to,from)=>{for(const k of ['scalar','array','ref'])for(const v of from[k])to[k].add(v);};
  const key=n=>JSON.stringify(Object.entries(n).map(([k,v])=>[k,[...v].sort()]));
  const arrayNeeded=(n,name)=>[...n.array].some(other=>root(other)===root(name));
  function expression(e,n){if(!e||typeof e!=='object')return;
    if(e.op==='variable')n.scalar.add(e.name);
    if(['read','array-result','grid-result','row-result'].includes(e.op))n.array.add(e.name);
    if(['read','length','array-result','grid-result','row-result','cell-index','cell-pair'].includes(e.op))n.ref.add(e.name);
    if(e.op==='reference-equal'){n.ref.add(e.left);n.ref.add(e.right);}
    for(const k of ['left','right','index','column','row'])if(e[k]&&typeof e[k]==='object')expression(e[k],n);
  }
  function visit(list,n,termination=false){let any=false;
    for(const s of list.slice().reverse()){
      let needed=false;
      if(s.op==='declare'||s.op==='assign'){
        needed=s.index?arrayNeeded(n,s.name):n.scalar.has(s.name);
        if(needed){if(s.index){n.ref.add(s.name);expression(s.index,n);expression(s.column,n);}else n.scalar.delete(s.name);expression(s.value,n);}
      }
      if(['array','allocate','reference','row-reference','returned-reference'].includes(s.op)){
        needed=n.ref.has(s.name)||arrayNeeded(n,s.name);
        if(needed){const data=arrayNeeded(n,s.name);n.ref.delete(s.name);n.array.delete(s.name);
          if(s.source){n.ref.add(s.source);if(data)n.array.add(s.source);expression(s.row,n);}
          if(s.op==='allocate'&&s.state==='allocated')expression(s.size,n);
        }
      }
      if(s.op==='if'){
        const yes=clone(n),no=clone(n),a=visit(s.yes,yes,termination),b=visit(s.no,no,termination);
        needed=a||b;if(needed){for(const k of ['scalar','array','ref'])n[k]=new Set([...yes[k],...no[k]]);expression(s.condition,n);}
      }
      if(s.op==='loop'){
        const state=clone(n);let bodyNeeded=false;
        for(let i=0;i<50;i++){const previous=key(state);bodyNeeded=visit(s.body,state,bodyNeeded)||bodyNeeded;if(bodyNeeded){expression(s.condition,state);expression(s.start,state);}if(key(state)===previous)break;}
        needed=bodyNeeded;if(needed){state.scalar.delete(s.name);merge(n,state);expression(s.start,n);}
      }
      if(s.op==='call'&&(arrayNeeded(n,s.source)||s.resultName&&n.scalar.has(s.resultName))){
        const local=clone(n),resultNeeded=s.resultName&&n.scalar.has(s.resultName);if(resultNeeded){n.scalar.delete(s.resultName);local.scalar.delete(s.resultName);expression(s.output,local);}if(arrayNeeded(n,s.source)){local.array.add('p');local.ref.add('p');}needed=visit(s.body,local)||resultNeeded;if(needed){local.ref.delete('p');local.array.delete('p');merge(n,local);n.ref.add(s.source);}
      }
      if(s.op==='break')needed=termination;
      if(needed){selected.add(s);any=true;}
    }
    return any;
  }
  const needs=fresh();expression(program.output,needs);visit(program.statements,needs);return selected;
}
