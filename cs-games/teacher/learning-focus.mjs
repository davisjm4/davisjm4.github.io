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

export function createTeacherFocus(classroom,roster){
  const root=el('div',{id:'learning-focus',hidden:true});
  const status=el('p',{role:'status',class:'muted'});
  const path='/teacher/learning-focus/'+encodeURIComponent(classroom.id);
  const command=(action,body)=>teacherRequest(path+'/'+action,{body});
  const profiles=roster.filter(p=>p.active===1).map(p=>[p.id,p.id]);
  let state,editing=null,refreshing;
  const scope=makeSelect(scopes);
  const recipients=makeSelect(profiles);
  const kind=makeSelect(kinds);
  const target=makeSelect([]);
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
    el('div',{class:'actions'},preview),previewPanel);
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
        ...(reason.value?{reason:reason.value}:{}),
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
        el('p',{text:targetTitle(result.target)+' · '+result.activeRecipientCount+' active profile(s) · '+'Advisory'}),
        result.recipientIds.length>0&&el('p',{text:result.recipientIds.join(', ')}),
        publish);
      title.focus();
    });
  };
  function render(){
    root.hidden=!state.enabled;
    if(!state.enabled)return;
    form.hidden=!state.pathway;
    const serverNow=state.now;
    list.replaceChildren(el('h3',{text:'Class assignments'}),
      ...state.items.map(item=>{
        const title=targetTitle(item.target);
        const excused=new Set(state.exemptions.filter(row=>row.focus_id===item.id&&row.focus_revision===item.revision).map(row=>row.profile_id));
        const eligible=profiles.filter(([id])=>!excused.has(id)&&(item.scope==='class'||item.recipientIds.includes(id)));
        const learner=makeSelect(eligible);
        const active=item.state==='published'&&item.startAt<=serverNow;
        const itemStatus=item.state==='published'?(active?'Active':'Scheduled'):item.state;
        const report=state.progress.filter(row=>row.focus_id===item.id&&row.focus_revision===item.revision);
        return el('article',{class:'row-card','data-assignment-id':item.id},
          el('div',{},el('h4',{text:title}),el('p',{text:itemStatus+' · '+scopes.find(row=>row[0]===item.scope)[1]}),
            el('p',{text:report.filter(row=>row.state==='complete').length+' completed · '+excused.size+' excused'}),
            active&&eligible.length>0&&el('div',{},label('Student for assignment review',learner),
              action('Confirm assignment completed',event=>void guarded(event.currentTarget,async()=>{
                await command('complete',{id:item.id,revision:item.revision,profileId:learner.value});
                await refresh();status.textContent='Assignment completion recorded.';
              })),
              action('Excuse student from assignment',event=>{
                if(!confirm('Excuse this student? Their practice history will be kept.'))return;
                void guarded(event.currentTarget,async()=>{
                  await command('excuse',{id:item.id,revision:item.revision,profileId:learner.value});
                  await refresh();status.textContent='Student excused from this assignment.';
                });
              }))),
          item.state==='published'&&el('div',{class:'actions'},action('Edit',()=>edit(item)),action(active?'End assignment':'Cancel scheduled assignment',event=>{
            if(!confirm('End this assignment? Its recorded history will be kept.'))return;
            void guarded(event.currentTarget,async()=>{
              await command('end',{id:item.id,revision:item.revision,requestId:crypto.randomUUID()});
              await refresh();status.textContent='Assignment ended.';
            });
          })));
      }));
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
  return {root,refresh};
}
