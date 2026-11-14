// R4: sound (conservative) interval analysis over the displayed program. A `%` whose left
// operand is provably within [0, smallest possible divisor) is the identity and only pads the
// question. Array cell values are unknown, loop-carried scalars are unknown, and array/row
// lengths are exact from the displayed literals, so a modulus that really can wrap (a value
// plus a cell, a ragged row, a loop-carried counter) is never reported.
const TOP=null;
const join=(a,b)=>a&&b?[Math.min(a[0],b[0]),Math.max(a[1],b[1])]:TOP;
const exact=n=>[n,n];
export function redundantModulus(program){
  const shapes=new Map(),findings=[];
  const note=(s)=>{if(s.op==='row-reference'&&s.row.op==='literal'&&shapes.get(s.source)?.rows?.[s.row.value]!==undefined)shapes.set(s.name,{n:shapes.get(s.source).rows[s.row.value],alias:true});if(s.op==='array'){shapes.set(s.name,s.values.every(Array.isArray)?{rows:s.values.map(r=>r.length)}:{n:s.values.length});}};
  const scan=list=>{for(const s of list){note(s);if(s.body)scan(s.body);if(s.yes)scan(s.yes);if(s.no)scan(s.no);}};scan(program.statements);
  // A name assigned by a call, allocation or re-binding no longer has a known shape.
  const unstable=new Set();
  const mark=list=>{for(const s of list){if(['allocate','returned-reference','call'].includes(s.op)||s.op==='reference'||s.op==='array'&&!s.declare)unstable.add(s.name);if(s.body)mark(s.body);if(s.yes)mark(s.yes);if(s.no)mark(s.no);}};mark(program.statements);
  const lengthOf=(e,env)=>{
    if(unstable.has(e.name))return TOP;const shape=shapes.get(e.name);if(!shape)return TOP;
    if(e.row===undefined)return shape.rows?exact(shape.rows.length):exact(shape.n);
    if(!shape.rows)return TOP;const row=interval(e.row,env);
    if(row&&row[0]===row[1]&&shape.rows[row[0]]!==undefined)return exact(shape.rows[row[0]]);
    return [Math.min(...shape.rows),Math.max(...shape.rows)];
  };
  function interval(e,env){
    if(!e||typeof e!=='object')return TOP;
    if(e.op==='literal')return typeof e.value==='number'&&Number.isInteger(e.value)?exact(e.value):TOP;
    if(e.op==='variable')return env.has(e.name)?env.get(e.name):TOP;
    if(e.op==='length')return lengthOf(e,env);
    if(e.op==='read'){interval(e.index,env);if(e.column)interval(e.column,env);return unstable.has(e.name)?TOP:env.get('#'+e.name)??TOP;}
    if(e.op!=='binary')return TOP;
    const a=interval(e.left,env),b=interval(e.right,env);
    if(e.operator==='%'){
      // Scope: re-bounding a named scalar by a 2D row length when that scalar was itself produced by a modulus (`c = c % grid[r].length`). Wrapping a literal or an
      // expression is a legitimate wrap-around demonstration and is deliberately not reported.
      if(e.left.op==='variable'&&e.right.op==='length'&&e.right.row!==undefined&&a?.viaMod&&b&&a[0]>=0&&b[0]>=1&&a[1]<b[0])findings.push({operator:'%',left:a,divisor:b});
      if(!a||!b||a[0]<0||b[0]<1)return TOP;
      return Object.assign([0,Math.min(a[1],b[1]-1)],{viaMod:true});
    }
    if(!a||!b)return TOP;
    if(e.operator==='+')return [a[0]+b[0],a[1]+b[1]];
    if(e.operator==='-')return [a[0]-b[1],a[1]-b[0]];
    if(e.operator==='*'){const p=[a[0]*b[0],a[0]*b[1],a[1]*b[0],a[1]*b[1]];return [Math.min(...p),Math.max(...p)];}
    if(e.operator==='/'&&b[0]>=1&&a[0]>=0)return [Math.trunc(a[0]/b[1]),Math.trunc(a[1]/b[0])];
    return TOP;
  }
  const assigned=(list,out=new Set())=>{for(const s of list){if((s.op==='assign'&&s.index===undefined||s.op==='declare'))out.add(s.name);if(s.op==='loop')out.add(s.name);if(s.body)assigned(s.body,out);if(s.yes)assigned(s.yes,out);if(s.no)assigned(s.no,out);}return out;};
  const writtenArrays=(list,out=new Set())=>{for(const s of list){if(s.op==='assign'&&s.index!==undefined)out.add(s.name);if(s.body)writtenArrays(s.body,out);if(s.yes)writtenArrays(s.yes,out);if(s.no)writtenArrays(s.no,out);}return out;};
  function run(list,env){
    for(const s of list){
      if(s.op==='declare'||s.op==='assign'&&s.index===undefined)env.set(s.name,interval(s.value,env));
      else if(s.op==='array'&&s.declare&&!s.defaulted){const cells=s.values.flat();env.set('#'+s.name,[Math.min(...cells),Math.max(...cells)]);}
      else if(s.op==='assign'){
        for(const key of ['index','column'])if(s[key])interval(s[key],env);
        const v=interval(s.value,env),key='#'+s.name;
        if(shapes.has(s.name)&&!unstable.has(s.name)&&!shapes.get(s.name).alias)env.set(key,v&&env.get(key)?join(env.get(key),v):TOP);
        else for(const k of [...env.keys()])if(k[0]==='#')env.set(k,TOP);   // a write through an alias may touch any array
      }
      else if(s.op==='allocate'||s.op==='row-reference'){for(const key of ['value','index','column','size','row'])if(s[key])interval(s[key],env);}
      else if(s.op==='if'){interval(s.condition,env);const a=new Map(env),b=new Map(env);run(s.yes,a);run(s.no,b);for(const key of new Set([...a.keys(),...b.keys()]))env.set(key,join(a.get(key)??TOP,b.get(key)??TOP));}
      else if(s.op==='loop'){for(const name of assigned([s]))env.set(name,TOP);for(const name of writtenArrays([s]))env.set('#'+name,TOP);interval(s.start,env);interval(s.condition,env);run(s.body,new Map(env));}
      else if(s.op==='call'){for(const name of assigned(s.body))env.set(name,TOP);}
    }
  }
  run(program.statements,new Map());interval(program.output,new Map());
  return findings;
}
