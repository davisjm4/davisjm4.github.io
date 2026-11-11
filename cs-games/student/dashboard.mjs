import { profilesAvailable,request } from '../../wpr-games/workplace-readiness/online/config.mjs';
import { activeProfile,device,scopedStorage } from '../../wpr-games/workplace-readiness/online/profile-sync.mjs';
import { createPathwayClient } from '../pathway/client.mjs';
import { renderPathway } from './pathway-view.mjs';

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
  let client, known, refreshing;
  const say=message=>{notice.textContent=message;};
  const render=view=>{
    panel.hidden=false;
    panel.replaceChildren(renderPathway(view));
  };
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
    if (document.hidden || !device.isCurrent()) return;
    if (refreshing) return refreshing;
    refreshing=(async()=>{
      try {
        context ??= await request('/profile/identity',{token});
        if (!client) connect(context.classId);
        const previous=client.current?.revision;
        const result=await client.sync();
        if (result.online && previous===result.current?.revision) say('Class pathway is up to date.');
        else if (result.online && previous==null) say('Class pathway loaded.');
      } catch (error) { say(error.message); }
    })().finally(()=>{refreshing=null;});
    return refreshing;
  }
  if (context) connect(context.classId);
  for (const event of ['online','focus','pageshow']) window.addEventListener(event,refresh);
  setInterval(refresh,120000);
  refresh();
}
