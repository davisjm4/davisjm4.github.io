import {currentTeacher,mountTeacherAccount,observeTeacher,teacherRequest} from '../session.mjs';
import {courseLabel} from '../ui-model.mjs';
import {createRequirementsEditor} from './editor.mjs';
import {createServiceAdapter} from './adapter.mjs';

const classId=new URLSearchParams(location.search).get('class');
const context=document.getElementById('class-context');
const status=document.getElementById('class-status');
const root=document.getElementById('editor');
if(classId)document.getElementById('class-link').href='../?class='+encodeURIComponent(classId)+'#classes';
mountTeacherAccount(document.getElementById('teacher-account'));

let editor, owner;
const curriculum=()=>Promise.all(['curriculum-graph','evidence-gap-registry'].map(async name=>{
  const response=await fetch('../../pathway/'+name+'.json');
  if(!response.ok)throw new Error('The curriculum could not load.');
  return response.json();
}));

async function load(active){
  root.hidden=true;
  context.textContent='';
  if(!classId){
    status.textContent='Open My Classes and select a class to customize.';
    return;
  }
  if(!active){
    status.textContent='Sign in to customize requirements for this class.';
    return;
  }
  if(editor&&active.owner===owner){
    context.textContent=editor.classLabel;
    status.textContent='';
    root.hidden=false;
    return;
  }
  editor?.destroy();
  editor=null;
  owner=null;
  status.textContent='Loading class requirements…';
  try{
    const [classes,{pathways},[graph,registry]]=await Promise.all([
      teacherRequest('/teacher/profiles'),teacherRequest('/pathways/teacher'),curriculum()
    ]);
    if(active!==currentTeacher())return;
    const classroom=classes.classes.find(item=>item.id===classId&&!item.archived);
    const selected=pathways.find(item=>item.classId===classId);
    if(!classroom||!selected)throw new Error('Open an active class from My Classes to customize its requirements.');
    const entry=await teacherRequest('/pathways/teacher/'+selected.id);
    if(active!==currentTeacher())return;
    const adapter=createServiceAdapter({request:teacherRequest,entry});
    editor=createRequirementsEditor(root,{graph,registry,pathway:entry.draft,published:entry.published,adapter,serverTimestamps:true});
    owner=active.owner;
    editor.classLabel=classroom.title+' · '+courseLabel(classroom.course_id);
    context.textContent=editor.classLabel;
    status.textContent='';
    root.hidden=false;
  }catch(error){
    if(active===currentTeacher())status.textContent=error.message;
  }
}
observeTeacher(active=>void load(active));
