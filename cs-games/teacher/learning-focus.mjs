import { el,options } from '../../wpr-games/workplace-readiness/online/dom.mjs';
import { teacherRequest } from './session.mjs';

const scopes=[['class','Whole class'],['group','Selected students'],['individual','Individual student']];
const kinds=[['skill','Skill'],['area','Learning area'],['skill-group','Skill group'],['activity','Activity']];
const courseLabel=id=>id.split('-').map(word=>word[0]?.toUpperCase()+word.slice(1)).join(' ');
const action=(text,fn)=>el('button',{type:'button',class:'btn',text,onclick:fn});
const label=(name,input)=>el('label',{},name,input);
const selected=select=>[...select.selectedOptions].map(option=>option.value);
const makeSelect=choices=>el('select',{},options(choices));
const localTime=ms=>{
  const date=new Date(ms);
  return new Date(ms-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
};

export function createTeacherFocus(classroom,roster,onRestrictions=()=>{}){
  const root=el('div',{id:'learning-focus',hidden:true});
  const restrictions=el('section',{class:'card',id:'focus-restrictions','aria-labelledby':'focus-restrictions-title',hidden:true});
  const status=el('p',{role:'status',class:'muted'});
  const path='/teacher/learning-focus/'+encodeURIComponent(classroom.id);
  const command=(action,body)=>teacherRequest(path+'/'+action,{body});
  const profiles=roster.filter(p=>p.active===1).map(p=>[p.id,p.id]);
  let state,editing=null,confirmRelease=null,refreshing;
  const scope=makeSelect(scopes);
  const recipients=makeSelect(profiles);
  const kind=makeSelect(kinds);
  const target=makeSelect([]);
  const mode=el('input',{type:'checkbox',name:'restricted'});
  const reason=el('input',{type:'text',name:'reason',maxlength:160});
  const startAt=el('input',{type:'datetime-local',name:'start'});
  const recipientField=label('Student profiles',recipients);
  const title=el('h3',{text:'Assign learning focus'});
  const previewPanel=el('div',{id:'focus-preview'});
  const preview=el('button',{type:'submit',class:'btn',text:'Preview assignment'});
  const form=el('form',{class:'card',id:'focus-form'},title,
    el('div',{class:'field-grid'},label('Assign to',scope),recipientField,label('Target type',kind),label('Target',target),
      label('Start time (optional)',startAt),label('Reason (optional, visible to selected students)',reason)),
    el('p',{class:'muted',text:'Enter a classroom instruction only. Keep student names and private details in school records.'}),
    label(' Restrict navigation',mode),el('div',{class:'actions'},preview),previewPanel);
  const list=el('section',{class:'card','aria-label':'Class assignments'});
  root.append(form,status,list);

  const nodeTitle=id=>state.pathway?.nodes.find(node=>node.id===id)?.title??'Unavailable skill';
  const targetTitle=target=>target.kind==='skill' ? nodeTitle(target.id)
    : target.kind==='area' ? state.pathway?.areas.find(area=>area.id===target.id)?.title??'Unavailable area'
    : target.kind==='activity' ? courseLabel(target.id)
    : target.nodeIds?.map(nodeTitle).join(', ') || 'Assigned group';
  const change=()=>previewPanel.replaceChildren();
  function populateTarget(){
    target.multiple=kind.value==='skill-group';
    target.size=target.multiple?5:1;
    const nodes=state.pathway?.nodes??[];
    const choices=kind.value==='area' ? (state.pathway?.areas??[]).map(x=>[x.id,x.title])
      : kind.value==='activity' ? [...new Set(nodes.flatMap(x=>x.destinations.map(item=>item.activityId)))].sort().map(id=>[id,courseLabel(id)])
      : nodes.filter(node=>node.destinations.length).map(node=>[node.id,node.title]);
    target.replaceChildren(...options(choices));
  }
  function populateScope(){
    recipientField.hidden=scope.value==='class';
    recipients.multiple=scope.value==='group';
    recipients.size=recipients.multiple?5:1;
  }
  kind.addEventListener('change',populateTarget);
  scope.addEventListener('change',populateScope);
  form.addEventListener('input',change);
  form.addEventListener('change',change);
  const reportError=error=>{status.textContent=error.message;};
  async function guarded(button,run){
    if(button.disabled)return;
    button.disabled=true;
    try{await run();}
    catch(error){reportError(error);}
    finally{button.disabled=false;}
  }
  function edit(item){
    editing={id:item.id,revision:item.revision};
    title.textContent='Edit learning focus';
    scope.value=item.scope;
    populateScope();
    for(const option of recipients.options)option.selected=item.recipientIds.includes(option.value);
    kind.value=item.target.kind;
    populateTarget();
    for(const option of target.options)option.selected=(item.target.nodeIds??[item.target.id]).includes(option.value);
    mode.checked=state.activeRestrictions.some(row=>row.grants.some(g=>g.id===item.id));
    reason.value=item.reason??'';
    startAt.value=item.startAt>Date.now()?localTime(item.startAt):'';
    change();
    scope.focus();
  }
  form.onsubmit=event=>{
    event.preventDefault();
    void guarded(preview,async()=>{
      const assignment={scope:scope.value,recipientIds:scope.value==='class'?[]:selected(recipients),
        target:kind.value==='skill-group'?{kind:kind.value,nodeIds:selected(target)}:{kind:kind.value,id:target.value},
        mode:mode.checked?'restricted':'advisory',...(reason.value?{reason:reason.value}:{}),
        ...(startAt.value?{startAt:new Date(startAt.value).valueOf(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}:{})};
      const edit=editing;
      const result=await command('preview',{...assignment,...(edit?{edit}:{})});
      const title=el('h4',{text:'Review assignment',tabindex:-1});
      const requestId=crypto.randomUUID();
      const publish=action(edit?'Publish revision':'Publish assignment',event=>void guarded(event.currentTarget,async()=>{
        await command('publish',{assignment,edit,requestId,previewAt:result.previewAt,previewSignature:result.previewSignature});
        editing=null;
        form.reset();
        populateTarget();populateScope();change();
        await refresh();
        status.textContent='Assignment published.';
        status.setAttribute('tabindex','-1');
        status.focus();
      }));
      previewPanel.replaceChildren(title,
        el('p',{text:targetTitle(result.target)+' · '+result.activeRecipientCount+' active profile(s) · '+(result.mode==='restricted'?'Restricted navigation':'Advisory')}),
        result.recipientIds.length>0&&el('p',{text:result.recipientIds.join(', ')}),
        result.mode==='restricted'&&el('p',{text:'Class navigation will allow active assigned destinations. Public independent practice remains available.'}),
        edit&&el('p',{text:'Existing grants keep their scope until released or the assignment ends.'}),
        publish);
      title.focus();
    });
  };
  function showRelease(entries){
    const targets=new Set(entries.map(e=>e.id+':'+e.revision+':'+e.profileId));
    const affected=new Set(entries.map(e=>e.profileId));
    const remaining=state.activeRestrictions.filter(item=>affected.has(item.profileId)&&item.grants.some(grant=>!targets.has(grant.id+':'+grant.revision+':'+item.profileId))).length;
    const requestId=crypto.randomUUID();
    const heading=el('h4',{text:'Review release',tabindex:-1});
    confirmRelease.replaceChildren(heading,el('p',{text:entries.length+' grant(s) will be released. '+remaining+' selected profile(s) will still have an active restriction.'}),
      action('Confirm release',event=>void guarded(event.currentTarget,async()=>{
        const {results}=await command('release',{requestId,grants:entries});
        await refresh();
        const done=results.filter(r=>r.status==='released').length;
        status.textContent='Released '+done+' of '+results.length+' grants. '+(results.length-done)+' unavailable.';
        status.setAttribute('tabindex','-1');status.focus();
      })),action('Cancel release',()=>confirmRelease.replaceChildren()));
    heading.focus();
  }
  function render(){
    root.hidden=restrictions.hidden=!state.enabled;
    if(!state.enabled)return;
    form.hidden=!state.pathway;
    const entries=state.activeRestrictions.flatMap(row=>row.grants.map(grant=>({...grant,profileId:row.profileId})));
    const checks=[];
    confirmRelease=el('div');
    restrictions.replaceChildren(el('h3',{id:'focus-restrictions-title',text:'Active Restrictions'}),
      el('p',{text:state.activeRestrictions.length+' restricted student profile(s).'}));
    if(entries.length){
      const items=entries.map(entry=>{
        const check=el('input',{type:'checkbox'});
        checks.push([check,entry]);
        return el('li',{},label(entry.profileId+' · '+targetTitle(entry.target)+' · '+scopes.find(row=>row[0]===entry.scope)[1],check),
          action('Review release for this grant',()=>showRelease([entry])));
      });
      restrictions.append(el('ul',{},items),action('Review selected releases',()=>{
        const chosen=checks.filter(([check])=>check.checked).map(([,entry])=>entry);
        if(chosen.length)showRelease(chosen);
        else confirmRelease.replaceChildren(el('p',{role:'status',text:'Select at least one restriction.'}));
      }),confirmRelease);
    }
    const serverNow=state.now;
    list.replaceChildren(el('h3',{text:'Class assignments'}),
      ...state.items.map(item=>{
        const title=targetTitle(item.target);
        const eligible=profiles.filter(([id])=>item.scope==='class'||item.recipientIds.includes(id));
        const learner=makeSelect(eligible);
        const active=item.state==='published'&&item.startAt<=serverNow;
        const itemStatus=item.state==='published'?(active?'Active':'Scheduled'):item.state;
        const report=state.progress.filter(row=>row.focus_id===item.id&&row.focus_revision===item.revision);
        return el('article',{class:'row-card','data-assignment-id':item.id},
          el('div',{},el('h4',{text:title}),el('p',{text:itemStatus+' · '+scopes.find(row=>row[0]===item.scope)[1]}),
            el('p',{text:report.filter(row=>row.state==='complete').length+' completed'}),
            active&&eligible.length>0&&el('div',{},label('Student for completion review',learner),
              action('Confirm assignment completed',event=>void guarded(event.currentTarget,async()=>{
                await command('complete',{id:item.id,revision:item.revision,profileId:learner.value});
                await refresh();status.textContent='Assignment completion recorded.';
              })))),
          item.state==='published'&&el('div',{class:'actions'},action('Edit',()=>edit(item)),action(active?'End assignment':'Cancel scheduled assignment',event=>{
            if(!confirm('End this assignment and its active restrictions?'))return;
            void guarded(event.currentTarget,async()=>{
              await command('end',{id:item.id,revision:item.revision,requestId:crypto.randomUUID()});
              await refresh();status.textContent='Assignment ended.';
            });
          })));
      }));
    onRestrictions(new Set(state.activeRestrictions.map(row=>row.profileId)));
  }
  async function refresh(){
    if(refreshing)return refreshing;
    refreshing=(async()=>{
      try{
        state=await teacherRequest(path);
        if(!root.isConnected)return;
        if(!target.options.length){populateScope();populateTarget();}
        render();
      }catch(error){
        if(error.status!==404){root.hidden=false;form.hidden=true;reportError(error);}
      }
    })().finally(()=>{refreshing=null;});
    return refreshing;
  }
  return {root,restrictions,refresh};
}
