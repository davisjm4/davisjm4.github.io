import { profilesAvailable,request } from '../../wpr-games/workplace-readiness/online/config.mjs';
import { activeProfile,device,scopedStorage,syncQueuedPractice } from '../../wpr-games/workplace-readiness/online/profile-sync.mjs';
import { createPathwayClient } from '../pathway/client.mjs';
import { renderPathway } from './pathway-view.mjs?v=learning-map-v2';

const notice=document.getElementById('student-connection');
const panel=document.getElementById('student-pathway');
if (!profilesAvailable) {
  notice.textContent='Class profiles are awaiting service setup. You can open any practice game from the CS Games hub.';
} else if (!activeProfile) {
  notice.textContent='Join using a teacher’s enrollment link, or restore your profile with your recovery credential.';
} else {
  const token=activeProfile.token;
  const storage=scopedStorage(localStorage);
  let context=activeProfile.classId ? {classId:activeProfile.classId} : null;
  let client, known, refreshing, map, mapModules;
  const classic = new URLSearchParams(location.search).get('view') === 'classic';
  const enrollmentHash = new URLSearchParams(location.hash.slice(1)).has('enroll');
  const restartRequests=new Map();
  const say=message=>{notice.textContent=message;};
  const mapInput=view=>mapModules.inputFromStudentContract(view,{mixedActivities:mapModules.mixedActivities});
  const render=view=>{
    panel.hidden=false;
    if(mapModules){
      try {
        const input=mapInput(view);
        panel.classList.remove('student-panel');
        if(map)map.update(input,{highlight:true,label:'New practice recorded'});
        else {
          const returnKey='student-map-return:'+view.classId;
          if(!enrollmentHash){
            try {
              const tabStorage=scopedStorage(sessionStorage);
              const route=tabStorage.getItem(returnKey);
              tabStorage.removeItem(returnKey);
              if(!location.hash&&route)history.replaceState(history.state,'',route);
            } catch { /* The course map still works when session storage is blocked. */ }
          }
          map=mapModules.mountStudentMap(panel,{...input,hashRouting:!enrollmentHash,adapter:{
          onPractice(){
            if(enrollmentHash)return;
            try {scopedStorage(sessionStorage).setItem(returnKey,location.hash);}
            catch { /* Back still returns to the last map URL. */ }
          },
          async restartAttempt(input){
            try {await submitRestart(input);return {ok:true};}
            catch(error){return {ok:false,message:error.message};}
          },
          async reload(){return mapInput(await refreshRestart());}
          }});
        }
        return;
      } catch {
        map?.destroy();
        map=null;
        mapModules=null;
      }
    }
    panel.classList.add('student-panel');
    const openAreas=[...panel.querySelectorAll('.pathway-area[open]')].map(area=>area.dataset.areaIndex);
    panel.replaceChildren(renderPathway(view,{onRestart:restart,openAreas}));
  };
  if(!classic){
    Promise.all([
      import('./map/ui/app.mjs?v=proficiency-v3'),
      import('./map/live-contract.mjs?v=proficiency-v3'),
      fetch('../pathway/evidence-gap-registry.json').then(response=>response.ok?response.json():null).catch(()=>null)
    ]).then(([app,contract,registry])=>{
      const mixedActivities=registry?new Set(registry.entries.filter(entry=>entry.mixedReaches===true).map(entry=>entry.game)):undefined;
      mapModules={...app,...contract,mixedActivities};
      if(client?.current)render(client.current);
    }).catch(()=>{ /* The class pathway remains available in the original list. */ });
  }
  async function submitRestart(input){
    if(!await syncQueuedPractice())throw new Error('Reconnect and sync your practice before restarting.');
    await request('/pathways/student/'+context.classId+'/restart',{token,body:input});
  }
  async function refreshRestart(){
    if(refreshing)await refreshing;
    known=null;
    const result=await refresh();
    if(!result?.online)throw new Error('Your new attempt was saved. Reconnect to update your progress.');
    return result.current;
  }
  async function restart(node,button){
    if(!confirm('Start a fresh practice attempt for '+node.title+'? Your earlier attempt and practice records stay in your history.'))return;
    button.disabled=true;
    const expectedAttemptId=node.masteryChallenge.activeAttemptId;
    const requestId=restartRequests.get(expectedAttemptId)??crypto.randomUUID();
    restartRequests.set(expectedAttemptId,requestId);
    try {
      await submitRestart({nodeId:node.id,expectedAttemptId,requestId});
      await refreshRestart();
      restartRequests.delete(expectedAttemptId);
      say('Fresh attempt started. Your earlier practice is in the attempt history.');
    }catch(error){say(error.message);}
    finally{button.disabled=false;}
  }
  function connect(classId) {
    client=createPathwayClient({storage,scope:classId,notify:say,onChange:render,load:async()=>{
      try {
        const query=known && client.current ? '?known='+encodeURIComponent(known) : '';
        const result=await request('/pathways/student/'+classId+query,{token});
        known=result.cacheKey;
        return result;
      } catch (error) {
        if (error.status===401 || error.status===403) {
          client.clear();
          map?.destroy();
          map=null;
          panel.replaceChildren();
          panel.hidden=true;
          throw new Error('Restore your profile to view this pathway.');
        }
        if (error.status===404) throw new Error('Your teacher has not published a class pathway yet.');
        throw error;
      }
    }});
    if (client.current) render(client.current);
  }
  async function refresh() {
    if(!device.isCurrent()){
      map?.destroy();
      map=null;
      panel.replaceChildren();
      panel.hidden=true;
      say('Restore your profile to view this pathway.');
      return;
    }
    if(document.hidden)return;
    if (refreshing) return refreshing;
    refreshing=(async()=>{
      try {
        context ??= await request('/profile/identity',{token});
        if (!client) connect(context.classId);
        await syncQueuedPractice();
        const previous=client.current?.revision;
        const result=await client.sync();
        if (result.online && previous===result.current?.revision) say('Class pathway is up to date.');
        else if (result.online && previous==null) say('Class pathway loaded.');
        return result;
      } catch (error) { say(error.message); }
    })().finally(()=>{refreshing=null;});
    return refreshing;
  }
  if (context) connect(context.classId);
  document.querySelector('a[href="#student-profile"]')?.addEventListener('click',event=>{
    if(!map)return;
    const profile=document.querySelector('#student-profile details');
    if(!profile)return;
    event.preventDefault();
    profile.open=true;
    profile.querySelector('summary').focus();
  });
  for (const event of ['online','focus','pageshow']) window.addEventListener(event,refresh);
  window.addEventListener('storage',()=>{if(!device.isCurrent())refresh();});
  setInterval(refresh,120000);
  refresh();
}
