import {PARTS,SIDES,LIMB_MOVES,NAMES,move,call,repeat,procedure,id,instruction,pseudocode} from './engine.js';
export const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const options=(values,current)=>values.map(([v,label])=>`<option value="${escape(v)}" ${v===String(current)?'selected':''}>${escape(label)}</option>`).join('');
export function createEditor({host,code,palette,destination,onChange,onMessage=()=>{}}){let program,loops=false,procedures=false,chosen='main',dragged=null;
 const containers=()=>[{key:'main',title:'Main routine',body:program.body,params:[]},...program.procedures.map(p=>({key:p.id,title:`PROCEDURE ${p.name}(${p.params.join(', ')})`,body:p.body,params:p.params})),...nestedContainers(program)];
 function nestedContainers(p){const result=[];function scan(body,params,label){for(const n of body)if(n.type==='repeat'){result.push({key:n.id,title:`Inside REPEAT ${n.count} · ${label}`,body:n.body,params});scan(n.body,params,label);}}scan(p.body,[],'Main');for(const def of p.procedures)scan(def.body,def.params,def.name);return result;}
 const field=(label,values,current,change)=>{const s=document.createElement('select');s.setAttribute('aria-label',label);s.innerHTML=options(values,current);s.onchange=()=>{change(s.value);changed();};return s;};
 const btn=(text,label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.onclick=action;return b;};
 function changed(){onChange(program);render();}
 function nodeControls(n,row,params,label=n.id){
  if(n.type==='move'&&LIMB_MOVES.includes(n.op)&&n.part!=='ACTIVE'){
   const parts=PARTS.map(x=>[x,x]);if(params.includes('part'))parts.push(['$part','parameter part']);
   row.append(field(`${label} body part`,parts,n.part,v=>{n.part=v;if(v==='HEAD')n.side='CENTER';else if(n.side==='CENTER')n.side='RIGHT';}));
   const sides=(n.part==='HEAD'?['CENTER']:SIDES.filter(v=>v!=='CENTER')).map(x=>[x,x]);if(params.includes('side'))sides.push(['$side','parameter side']);
   row.append(field(`${label} side`,sides,n.side,v=>n.side=v));
  }else if(n.type==='repeat')row.append(field(`${label} repeat count`,Array.from({length:33},(_,i)=>[String(i),String(i)]),String(n.count),v=>n.count=Number(v)));
  else if(n.type==='call'){
   row.append(field(`${label} procedure name`,NAMES.map(x=>[x,x]),n.name,v=>{n.name=v;const d=program.procedures.find(p=>p.name===v);n.args=d?.params.length===0?[]:['FOOT','RIGHT'];}));
   row.append(field(`${label} argument count`,[['0','No arguments'],['2','part, side arguments']],String(n.args.length),v=>{n.args=v==='0'?[]:['FOOT','RIGHT'];}));
   n.args.forEach((arg,i)=>{const values=(i===0?PARTS:SIDES).map(v=>[v,v]);if(params.includes(i===0?'part':'side'))values.push([i===0?'$part':'$side',i===0?'parameter part':'parameter side']);row.append(field(`${label} argument ${i+1}`,values,arg,v=>n.args[i]=v));});
  }
 }
 function renderBody(body,parent,params,containerKey){const list=document.createElement('ol');list.className='block-list';parent.append(list);
  if(!body.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Empty · choose this destination and add a block.';list.append(empty);}
  body.forEach((n,index)=>{const item=document.createElement('li');item.className=`block ${n.type}`;item.dataset.block=n.id;item.draggable=true;
   item.ondragstart=e=>{dragged={body,index};e.dataTransfer?.setData('text/plain',n.id);};item.ondragover=e=>e.preventDefault();item.ondrop=e=>{e.preventDefault();e.stopPropagation();if(dragged?.body===body){const [x]=body.splice(dragged.index,1);body.splice(index,0,x);changed();}else onMessage('Use ↑ / ↓ to reorder within this body. Choose an insertion destination to add nested blocks.');dragged=null;};
   const row=document.createElement('div');row.className='block-row';const label=document.createElement('span');label.className='block-label';label.textContent=n.type==='move'?(n.part==='ACTIVE'?'shake() · active part':n.op):n.type==='call'?'Call':'Repeat';row.append(label);nodeControls(n,row,params,`Block ${index+1} in ${containerKey}`);
   const actions=document.createElement('span');actions.className='block-actions';const up=btn('↑',`Move block ${index+1} up in ${containerKey}`,()=>{[body[index-1],body[index]]=[body[index],body[index-1]];changed();focusNode(n.id);}),down=btn('↓',`Move block ${index+1} down in ${containerKey}`,()=>{[body[index+1],body[index]]=[body[index],body[index+1]];changed();focusNode(n.id);});up.disabled=index===0;down.disabled=index===body.length-1;actions.append(up,down,btn('×',`Remove block ${index+1} in ${containerKey}`,()=>{body.splice(index,1);changed();}));row.append(actions);item.append(row);list.append(item);if(n.type==='repeat')renderBody(n.body,item,params,n.id);
  });
 }
 function focusNode(nodeId){host.querySelector(`[data-block="${nodeId}"] button:not(:disabled)`)?.focus();}
 function render(){
  host.replaceChildren();const available=containers();if(!available.some(c=>c.key===chosen))chosen='main';destination.innerHTML=options(available.map(c=>[c.key,c.title]),chosen);
  for(const def of program.procedures){const section=document.createElement('section');section.className='procedure-definition';section.dataset.definition=def.id;const heading=document.createElement('h3');heading.textContent=`PROCEDURE ${def.name}(${def.params.join(', ')})`;section.append(heading);
   const tools=document.createElement('div');tools.className='definition-tools';tools.append(field(`${def.name} formal parameters`,[['none','No parameters'],['part-side','part, side']],def.params.length?'part-side':'none',v=>{def.params=v==='none'?[]:['part','side'];}),btn('Add here',`Insert into ${def.name}`,()=>{chosen=def.id;render();palette.querySelector('button')?.focus();}),btn('Remove definition',`Remove ${def.name} definition`,()=>{program.procedures.splice(program.procedures.indexOf(def),1);chosen='main';changed();}));section.append(tools);renderBody(def.body,section,def.params,def.name);host.append(section);
  }
  const main=document.createElement('section');main.className='main-routine';main.innerHTML='<h3>Main routine</h3>';renderBody(program.body,main,[],'main');host.append(main);
  code.replaceChildren();for(const line of pseudocode(program)){const span=document.createElement('span');span.className='code-line';if(line.id)span.dataset.line=line.id;span.textContent=line.text||' ';code.append(span);}
  renderPalette();
 }
 function renderPalette(){palette.replaceChildren();for(const op of ['moveIn','moveOut','shake','turnAround','clap','bow','nod','jump','wait'])palette.append(btn(`+ ${op}`,`Add ${op} block`,()=>insert(move(op))));
  if(procedures){palette.append(btn('+ shake() · active', 'Add shake active part block',()=>insert(move('shake','ACTIVE','ACTIVE'))),btn('+ Call procedure','Add procedure call',()=>{const p=program.procedures[0];insert(call(p?.name||'dance',p?.params.length===0?[]:['FOOT','RIGHT']));}));}
  if(loops)palette.append(btn('+ REPEAT','Add repeat block',()=>insert(repeat())));
 }
 function insert(n){let count=program.procedures.length;const scan=body=>{for(const node of body){count++;if(node.type==='repeat')scan(node.body);}};scan(program.body);for(const p of program.procedures)scan(p.body);if(count>=400){onMessage('Maximum 400 blocks. Remove a block before adding another.');return;}const c=containers().find(x=>x.key===chosen)||containers()[0];if(c.params.length&&n.type==='move'&&LIMB_MOVES.includes(n.op)&&n.part!=='ACTIVE'){n.part='$part';n.side='$side';}c.body.push(n);changed();onMessage(`Added ${instruction(n)} to ${c.title}.`);}
 destination.onchange=()=>{chosen=destination.value;};
 return {set(p,settings={}){program=p;loops=!!settings.loops;procedures=!!settings.procedures;render();},addDefinition(name,parameterized=true){if(program.procedures.some(p=>p.name===name)){onMessage('That procedure is already defined.');return;}program.procedures.push(procedure(name,parameterized?['part','side']:[]));chosen=program.procedures.at(-1).id;changed();},highlight(command){for(const n of host.querySelectorAll('.executing,.calling'))n.classList.remove('executing','calling');for(const n of code.querySelectorAll('.executing,.calling'))n.classList.remove('executing','calling');if(!command)return;
   for(const key of command.stack||[])for(const el of [...host.querySelectorAll(`[data-block="${key}"]`),...code.querySelectorAll(`[data-line="${key}"]`)])el.classList.add('calling');
   for(const el of [...host.querySelectorAll(`[data-block="${command.id}"]`),...code.querySelectorAll(`[data-line="${command.id}"]`)])el.classList.add('executing');
  },render,insert,get program(){return program;}};
}
