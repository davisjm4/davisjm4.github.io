import * as E from './engine.js';
import {STAGES,starter,choreography,validate,hint} from './lessons.js';
import {createEditor,escape} from './editor.js';
import {Player} from './player.js';
import {createStage} from './renderer.js';
import {createLessonSession} from './session.js';
import {sessionTracker,startActivePractice} from '../session.js';
export function createApp({stageFactory=createStage,shared=sessionTracker(),storage,now=()=>Date.now(),raf=cb=>requestAnimationFrame(cb),cancel=id=>cancelAnimationFrame(id)}={}){
 const $=id=>document.getElementById(id);if(!storage)try{storage=localStorage;}catch{}
 let mode='lesson',stage=0,program=E.blank(),workspaces={},lastStudent=null,source='student',stageView={apply(){},dispose(){}},frame=null,lastFrame=0,destroyed=false;
 const message=text=>$('edit-status').textContent=text;
 const warning=text=>{$('file-status').textContent=text;message(text);};
 const session=createLessonSession({storage,shared,now,onWarning:warning});
 try{const saved=JSON.parse(storage?.getItem('algorithmDance.workspaces.v1')||'{}');for(const [key,p] of Object.entries(saved))if(['studio','verified',...STAGES.map((_,i)=>`lesson${i}`)].includes(key)){try{E.assertProgram(p);workspaces[key]=p;}catch{}}}catch{}
 const key=()=>mode==='studio'?'studio':`lesson${stage}`;
 const saveWorkspace=()=>{workspaces[key()]=JSON.parse(JSON.stringify(program));try{storage?.setItem('algorithmDance.workspaces.v1',JSON.stringify(workspaces));}catch{warning('Workspace autosave is unavailable. Export to keep your routine.');}};
 const settings=()=>({procedures:mode==='studio'||stage>=2,loops:mode==='studio'||stage>=4});
 let editor;
 const player=new Player({onPose:p=>stageView.apply(p),onCommand:(command,index,total)=>{
  editor?.highlight(source==='student'?command:null);$('movement').textContent=command?`${source==='target'?'Target':source==='performance'?'Verified performance':'Your run'} · ${index+1}/${total} · ${E.describe(command)}`:'Ready · your instructions control every movement.';
  $('binding').textContent=command&&Object.keys(command.environment||{}).length?`Bound parameters: ${Object.entries(command.environment).map(([k,v])=>`${k} = ${v}`).join(' · ')}`:'';
  for(const item of $('trace-list').children)item.classList.toggle('trace-current',Number(item.dataset.beat)===index);
 },onState:p=>{if(!$('run'))return;const active=['running','stepping'].includes(p.status);$('pause').disabled=!active;$('run').textContent=p.status==='paused'?`▶ Resume ${source==='target'?'target':''}`:'▶ Run';$('playback-status').textContent=p.status==='complete'?`${source==='target'?'Target':'Your routine'} finished · ${p.trace.length} movements. Run and Step are free exploration.`:active?`${source==='target'?'Watching target':'Executing your algorithm'} · ${p.trace.length} movements`:'Run and Step are free exploration. Only Check Algorithm records an attempt.';}});
 editor=createEditor({host:$('workspace'),code:$('code'),palette:$('palette'),destination:$('destination'),onMessage:message,onChange:p=>{program=p;invalidate();saveWorkspace();comparison();}});
 function stopFrame(){if(frame!==null)cancel(frame);frame=null;lastFrame=0;}
 function animate(t){frame=null;if(destroyed)return;player.advance(lastFrame?Math.min(100,t-lastFrame):16);lastFrame=t;if(['running','stepping'].includes(player.status))frame=raf(animate);else lastFrame=0;}
 function schedule(){if(frame===null&&['running','stepping'].includes(player.status))frame=raf(animate);}
 function invalidate(){stopFrame();player.load([]);lastStudent=null;source='student';$('view-label').textContent='YOUR ROBOT';$('replay').disabled=true;$('trace-list').replaceChildren();$('trace-count').textContent='0 movements';$('feedback').hidden=true;}
 function showTrace(trace){$('trace-list').replaceChildren();$('trace-count').textContent=source==='target'?'Target · watch the robot':`${trace.length} movements`;if(source==='student')for(let i=0;i<trace.length;i++){const li=document.createElement('li');li.dataset.beat=i;li.textContent=E.describe(trace[i]);$('trace-list').append(li);}}
 function prepareStudent(){try{const result=E.execute(program);if(!result.trace.length)throw Error('Your main routine has no movements. Add commands or call a procedure.');source='student';$('view-label').textContent='YOUR ROBOT';player.load(result.trace);lastStudent=result.trace;showTrace(result.trace);$('replay').disabled=false;return true;}catch(e){feedback(e.message,false);return false;}}
 function feedback(text,ok=false){$('feedback').hidden=false;$('feedback').textContent=(ok?'✓ ':'')+text;$('feedback').classList.toggle('success',ok);}
 function syncDay(){if(session.ensure()){
  stage=0;if(mode==='lesson'){program=workspaces.lesson0||E.blank();renderActivity();}message('A new daily session has started. Your saved programs remain available.');
 }}
 function summary(){const s=session.snapshot(),entries=Object.values(s.stages),completed=entries.filter(x=>x.completed).length,attempts=entries.reduce((n,x)=>n+x.attempts,0),checked=entries.filter(x=>x.attempts).length,first=entries.filter(x=>x.firstCheck).length;
  $('session-date').textContent=new Date(now()).toLocaleDateString();$('session-metrics').innerHTML=[['Stages',`${completed}/5`],['First-check success',checked?`${first}/${checked}`:'—'],['Validation attempts',attempts],['Successful algorithms',s.successes.length],['Active time',`${Math.floor(s.activeMs/60000)}m ${Math.floor(s.activeMs/1000)%60}s`]].map(([label,n])=>`<div class="metric"><strong>${n}</strong><span>${label}</span></div>`).join('');
  $('stage-progress').innerHTML=STAGES.map((x,i)=>`<span class="progress-chip ${s.stages[i]?.completed?'done':''}">${s.stages[i]?.completed?'✓':'○'} ${escape(x.title)}</span>`).join('');
 }
 function comparison(){const show=mode==='lesson'&&stage===1;$('sequence-comparison').hidden=!show;if(show){const lines=E.pseudocode({...E.blank(),body:program.body});$('sequence-comparison').innerHTML='<h3>Compare your two sequences</h3><p class="small">Look for instructions that repeat and arguments that change.</p><div class="compare-grid">'+[lines.slice(0,5),lines.slice(5,10)].map((a,i)=>`<div><h3>Sequence ${i+1}</h3><pre>${escape(a.map(x=>x.text).join('\n')||'Build five movements…')}</pre></div>`).join('')+'</div>';}}
 function renderActivity(){invalidate();$('lesson-mode').setAttribute('aria-pressed',mode==='lesson');$('studio-mode').setAttribute('aria-pressed',mode==='studio');$('stage-label').hidden=mode==='studio';
  $('stage-select').innerHTML=STAGES.map((s,i)=>`<option value="${i}" ${i===stage?'selected':''} ${i>0&&!session.stage(i-1).completed?'disabled':''}>${escape(s.title)}${session.stage(i).completed?' ✓':''}</option>`).join('');
  $('objective-title').textContent=mode==='studio'?'Dance Studio · your original choreography':STAGES[stage].title;$('objective').textContent=mode==='studio'?'Create a routine with movements, reusable procedures, parameters and loops. No target, checks or grades.':STAGES[stage].objective;
  $('help-text').textContent=mode==='studio'?'Choose an insertion destination before adding blocks. A REPEAT block creates a new destination for its body. Define a procedure, build its body, and call it from Main routine. Save locally or export your routine below.':STAGES[stage].help;$('help-text').hidden=true;$('help').setAttribute('aria-expanded','false');
  $('definition-tools').hidden=!settings().procedures;$('check').hidden=mode==='studio';$('target').hidden=mode==='studio';$('next').hidden=mode==='studio'||!session.stage(stage).completed||stage===4;$('performance').hidden=mode==='studio'||!session.stage(3).completed;$('counts-panel').hidden=mode==='studio'||stage!==4;$('studio-files').hidden=mode!=='studio';
  for(const name of ['expanded','separate','parameterized'])$('count-'+name).value=String(session.counts()[name]||'');
  editor.set(program,settings());comparison();summary();
 }
 function go(newMode,newStage=stage){saveWorkspace();const previous=program;mode=newMode;stage=newStage;program=workspaces[key()]?JSON.parse(JSON.stringify(workspaces[key()])):newMode==='studio'?E.blank():starter(stage,workspaces[`lesson${stage-1}`]||previous);renderActivity();}
 $('lesson-mode').onclick=()=>go('lesson');$('studio-mode').onclick=()=>go('studio');$('stage-select').onchange=()=>{const n=Number($('stage-select').value);if(n===0||session.stage(n-1).completed)go('lesson',n);};
 $('next').onclick=()=>{if(stage<4&&session.stage(stage).completed)go('lesson',stage+1);};
 $('run').onclick=()=>{syncDay();if(player.status==='paused'&&player.trace.length){player.run();schedule();return;}stopFrame();if(prepareStudent()){player.run();schedule();}};
 $('pause').onclick=()=>{player.pause();stopFrame();};
 $('step').onclick=()=>{syncDay();stopFrame();if(source!=='student'||!player.trace.length||player.status==='complete'){if(!prepareStudent())return;}player.step();schedule();};
 $('reset').onclick=()=>{stopFrame();player.reset();editor.highlight(null);};
 $('replay').onclick=()=>{if(!lastStudent)return;stopFrame();source='student';$('view-label').textContent='YOUR ROBOT';player.load(lastStudent);showTrace(lastStudent);player.run();schedule();};
 $('target').onclick=()=>{stopFrame();const p=E.blank();p.body=choreography(STAGES[stage].parts).map(c=>E.move(c.op,c.part,c.side));source='target';$('view-label').textContent='TARGET CHOREOGRAPHY';editor.highlight(null);player.load(E.execute(p).trace);showTrace(player.trace);player.run();schedule();};
 $('performance').onclick=()=>{if(!session.stage(3).completed||!workspaces.verified)return;stopFrame();source='performance';$('view-label').textContent='VERIFIED FULL PERFORMANCE';editor.highlight(null);player.load(E.execute(workspaces.verified).trace);showTrace(player.trace);player.run();schedule();document.body.classList.add('presenting');$('exit-present').hidden=false;};
 $('present').onclick=()=>{stopFrame();if(prepareStudent()){document.body.classList.add('presenting');$('exit-present').hidden=false;player.run();schedule();}};
 $('exit-present').onclick=()=>{document.body.classList.remove('presenting');$('exit-present').hidden=true;if(source==='performance'){player.pause();stopFrame();editor.highlight(null);}};
 $('speed').onchange=()=>{player.speed=Number($('speed').value);};$('reduced').checked=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;player.reduced=$('reduced').checked;$('reduced').onchange=()=>{player.reduced=$('reduced').checked;if(player.clip)player.clip.reduced=player.reduced;};
 $('help').onclick=()=>{const show=$('help-text').hidden;$('help-text').hidden=!show;$('help').setAttribute('aria-expanded',show);if(show&&mode==='lesson')$('help-text').textContent=STAGES[stage].help+' '+hint(stage,session.stage(stage).attempts);};
 $('add-definition').onclick=()=>editor.addDefinition($('procedure-name').value,$('procedure-params').value==='pair');
 $('clear').onclick=()=>{program=E.blank();editor.set(program,settings());invalidate();saveWorkspace();comparison();message('Workspace cleared. Reset stage only resets playback; it does not clear your code.');};
 $('check').onclick=()=>{syncDay();if(mode!=='lesson')return;const signature=JSON.stringify({program,...(stage===4?{counts:session.counts()}: {})});const result=validate(program,stage,session.counts());const s=session.check(stage,result.ok,signature);if(s.duplicate){feedback('This unchanged algorithm was already checked. Revise it or run it freely before checking again.',s.completed);return;}
  if(result.ok&&stage>=3){workspaces.verified=JSON.parse(JSON.stringify(program));saveWorkspace();}
  feedback(result.message+(result.ok?'':` ${hint(stage,s.attempts)}`),result.ok);if(stage===4&&result.kind==='count')$('count-feedback').textContent='Use the stated definition and call counts; these are conceptual worksheet lines, not the formatted pseudocode.';
  $('next').hidden=!s.completed||stage===4;$('performance').hidden=!session.stage(3).completed;const selected=$('stage-select').value;for(const opt of $('stage-select').querySelectorAll('option')){const n=Number(opt.value);opt.disabled=n>0&&!session.stage(n-1).completed;}summary();
  if(result.ok&&stage===4){$('count-feedback').textContent='✓ 50 movement lines; 50 + 10 + 4 + 10 = 74; 5 + 10 + 4 + 10 = 29. Lesson complete. Try the optional iteration experiment in Dance Studio.';}
 };
 for(const name of ['expanded','separate','parameterized'])$('count-'+name).onchange=()=>{session.counts(Object.fromEntries(['expanded','separate','parameterized'].map(k=>[k,Number($('count-'+k).value)||0])));$('feedback').hidden=true;};
 $('copy').onclick=async()=>{const text=E.pseudocode(program).map(l=>l.text).join('\n');$('copy-text').value=text;try{await navigator.clipboard.writeText(text);message('Pseudocode copied.');}catch{$('copy-text').hidden=false;$('copy-text').focus();$('copy-text').select?.();message('Select and copy the pseudocode below.');}};
 $('save').onclick=()=>{try{if(!storage)throw Error();storage.setItem('algorithmDance.savedStudio.v1',E.exportProgram(program));$('file-status').textContent='Choreography saved locally in this browser.';}catch{warning('Could not save locally. Export your routine to keep a copy.');}};
 function importText(text){try{const p=E.importProgram(text);program=p;editor.set(program,settings());invalidate();saveWorkspace();$('file-status').textContent='Program imported. Run it to see exactly what its blocks do.';}catch(e){$('file-status').textContent=e.message;}}
 $('load').onclick=()=>{try{const text=storage?.getItem('algorithmDance.savedStudio.v1');if(!text)throw Error('No saved choreography yet.');importText(text);}catch(e){$('file-status').textContent=e.message;}};
 $('export').onclick=()=>{const text=E.exportProgram(program);$('portable').value=text;$('portable').closest('details').open=true;try{const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='algorithm-dance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('file-status').textContent='Export ready. Portable JSON is also shown below.';}catch{$('file-status').textContent='Copy the portable JSON below to keep this program.';}};
 $('import-text').onclick=()=>importText($('portable').value);$('import-file').onchange=async()=>{const file=$('import-file').files?.[0];if(!file)return;if(file.size>E.LIMITS.importBytes){$('file-status').textContent='Import is too large (100 KB maximum).';return;}try{importText(await file.text());}catch{$('file-status').textContent='The file could not be read.';}$('import-file').value='';};
 const signal=()=>session.signal(),visibility=()=>{if(document.visibilityState==='hidden'){player.pause();stopFrame();}session.tick(document.visibilityState!=='hidden');summary();};
 for(const event of ['pointerdown','keydown','input','touchstart','scroll'])document.addEventListener(event,signal,{passive:true});document.addEventListener('visibilitychange',visibility);
 const timer=setInterval(()=>{syncDay();session.tick(document.visibilityState!=='hidden');summary();},5000);
 program=workspaces.lesson0||E.blank();renderActivity();
 const ready=Promise.resolve(stageFactory($('viewport'),{onStatus:text=>{$('renderer-status').textContent=text;},onLost:()=>{player.pause();stopFrame();}})).then(view=>{if(destroyed)view.dispose();else {stageView=view;stageView.apply(player.pose);}}).catch(()=>{$('renderer-status').textContent='Stage could not load. Use the execution trace to follow every movement.';});
 function destroy(){destroyed=true;stopFrame();clearInterval(timer);stageView.dispose();for(const event of ['pointerdown','keydown','input','touchstart','scroll'])document.removeEventListener(event,signal);document.removeEventListener('visibilitychange',visibility);}
 window.addEventListener('pagehide',event=>{player.pause();stopFrame();session.tick(false);if(!event.persisted)destroy();});
 return {ready,destroy,state:()=>({program,player,mode,stage,session,editor}),go,importText};
}
