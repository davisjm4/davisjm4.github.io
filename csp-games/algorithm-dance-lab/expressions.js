// Bounded data expressions, never source evaluation. Lists use one-based indexes.
export const IDENT=/^[A-Za-z][A-Za-z0-9_]{0,31}$/;
export const validName=s=>typeof s==='string'&&IDENT.test(s)&&!['constructor','prototype','__proto__','true','false'].includes(s);
export const ref=name=>`$${name}`;
export const list=items=>({kind:'list',items});
export const input=name=>({kind:'input',name});
export const operation=(op,a,b)=>({kind:'op',op,a,...(b!==undefined?{b}:{})});
export const OPS=['+','-','*','/','MOD','=','≠','<','≤','>','≥','AND','OR','NOT','LENGTH','AT'];
export function checkExpression(x,depth=0,state={count:0}){
 if(++state.count>6000||depth>12)throw Error('Expression limit exceeded.');
 if(typeof x==='number'){if(!Number.isFinite(x)||Math.abs(x)>1000000)throw Error('Numbers must be finite and within ±1,000,000.');return;}
 if(typeof x==='boolean')return;
 if(typeof x==='string'){if(x.length>200)throw Error('Text values are limited to 200 characters.');if(x.startsWith('$')&&!validName(x.slice(1)))throw Error('Invalid variable or parameter reference.');return;}
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid expression.');
 if(x.kind==='literal'){if(!['string','number','boolean'].includes(typeof x.value))throw Error('A literal must be text, a number, or a Boolean.');if(typeof x.value==='string'){if(x.value.length>200)throw Error('Text values are limited to 200 characters.');}else checkExpression(x.value,depth+1,state);}
 else if(x.kind==='list'){if(!Array.isArray(x.items)||x.items.length>128)throw Error('Lists contain at most 128 elements.');x.items.forEach(v=>checkExpression(v,depth+1,state));}
 else if(x.kind==='input'){if(typeof x.name!=='string'||!x.name.length||x.name.length>40)throw Error('Invalid input name.');}
 else if(x.kind==='op'){if(!OPS.includes(x.op))throw Error('Unknown expression operator.');checkExpression(x.a,depth+1,state);if(!['NOT','LENGTH'].includes(x.op))checkExpression(x.b,depth+1,state);}
 else throw Error('Unknown expression type.');
}
export function expressionText(x){
 if(typeof x==='string')return x.startsWith('$')?x.slice(1):JSON.stringify(x);
 if(typeof x==='number'||typeof x==='boolean')return typeof x==='boolean'?(x?'true':'false'):String(x);
 if(x?.kind==='literal')return typeof x.value==='string'?JSON.stringify(x.value):String(x.value);
 if(x?.kind==='input')return `readInput(${JSON.stringify(x.name)})`;
 if(x?.kind==='list')return `[${x.items.map(expressionText).join(', ')}]`;
 if(x?.kind==='op'){const a=expressionText(x.a);if(x.op==='LENGTH')return `LENGTH(${a})`;if(x.op==='NOT')return `NOT (${a})`;if(x.op==='AT')return `${a}[${expressionText(x.b)}]`;return `(${a} ${x.op} ${expressionText(x.b)})`;}
 return '?';
}
export function evaluate(x,{lookup,inputs={},tick=()=>{}}){
 tick();if(typeof x==='string')return x.startsWith('$')?lookup(x.slice(1)):x;
 if(typeof x==='number'||typeof x==='boolean')return x;
 if(x.kind==='literal')return x.value;
 if(x.kind==='list')return x.items.map(v=>evaluate(v,{lookup,inputs,tick}));
 if(x.kind==='input'){if(!Object.hasOwn(inputs,x.name))throw Error(`Input "${x.name}" has no value. Configure it in Runtime inputs.`);return inputs[x.name];}
 const a=evaluate(x.a,{lookup,inputs,tick});
 const bool=v=>{if(typeof v!=='boolean')throw Error('A Boolean expression needs true or false.');return v;};
 const num=v=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('A numeric expression needs numbers.');return v;};
 if(x.op==='NOT')return !bool(a);
 if(x.op==='AND'&&!bool(a))return false;if(x.op==='OR'&&bool(a))return true;
 if(x.op==='LENGTH'){if(!Array.isArray(a))throw Error('LENGTH needs a list.');return a.length;}
 const b=evaluate(x.b,{lookup,inputs,tick});let result;
 switch(x.op){case 'AND':return bool(b);case 'OR':return bool(b);case 'AT':{if(!Array.isArray(a)||!Number.isInteger(b)||b<1||b>a.length)throw Error('List index is out of bounds. The first index is 1.');return a[b-1];}
 case '=':case '≠':if(Array.isArray(a)||Array.isArray(b))throw Error('Compare individual list elements, not whole lists.');return x.op==='='?a===b:a!==b;
 case '<':case '≤':case '>':case '≥':if(typeof a!==typeof b||!['number','string'].includes(typeof a))throw Error('Comparison values must have matching numeric or text types.');return x.op==='<'?a<b:x.op==='≤'?a<=b:x.op==='>'?a>b:a>=b;
 case '+':result=num(a)+num(b);break;case '-':result=num(a)-num(b);break;case '*':result=num(a)*num(b);break;case '/':if(num(b)===0)throw Error('Division by zero.');result=num(a)/b;break;case 'MOD':if(num(b)===0)throw Error('Remainder by zero.');result=num(a)%b;break;default:throw Error('Unknown operator.');}
 if(!Number.isFinite(result)||Math.abs(result)>1000000)throw Error('Numeric result exceeds ±1,000,000.');return result;
}
