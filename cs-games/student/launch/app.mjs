import { request } from '../../../wpr-games/workplace-readiness/online/config.mjs';
import { activeProfile } from '../../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';
import { resolvePracticeReturn } from '../practice-return.mjs';

const query=new URLSearchParams(location.search);
const status=document.getElementById('launch-status');
const retry=document.getElementById('retry');
async function open(){
  retry.hidden=true;
  if(!activeProfile){status.textContent='Restore your student profile to start class practice.';return;}
  if(!navigator.onLine){status.textContent='Reconnect to check class access before opening a new activity.';retry.hidden=false;return;}
  try{
    const href=query.get('activity');
    const original=new URL(href,location.origin);
    const back=resolvePracticeReturn(original,activeProfile);
    original.searchParams.delete('returnTo');
    const key='cs-games:focus-resume:'+activeProfile.id+':'+query.get('focus')+':'+original.pathname+original.search;
    if(query.get('focus')){
      try{
        const saved=sessionStorage.getItem(key);
        if(saved){
          const url=new URL(saved,location.origin);
          if(url.origin===location.origin&&url.searchParams.has('classLaunch')){
            const checked=await request('/profile/class-launch/'+encodeURIComponent(url.searchParams.get('classLaunch')),{token:activeProfile.token});
            const destination=new URL(checked.destination,location.origin);
            if(destination.href===original.href){
              if(back)url.searchParams.set('returnTo',back);
              else url.searchParams.delete('returnTo');
              location.replace(url);
              return;
            }
          }
        }
      }catch(error){if(error.status!==403&&error.status!==404)throw error;}
    }
    const result=await request('/profile/class-launch',{token:activeProfile.token,body:{
      classId:query.get('class'),nodeId:query.get('skill'),areaId:query.get('area'),href,assignmentId:query.get('focus'),
    }});
    const verified=new URL(result.destination,location.origin);
    if(verified.origin!==location.origin)throw new Error('The class activity is unavailable.');
    if(back)verified.searchParams.set('returnTo',back);
    verified.searchParams.set('classLaunch',result.id);
    if(query.get('focus')){try{sessionStorage.setItem(key,verified.pathname+verified.search+verified.hash);}catch{}}
    location.replace(verified);
  }catch(error){
    status.textContent=error.status ? error.message : 'Class access could not be verified. Reconnect and try again.';
    retry.hidden=false;
  }
}
retry.addEventListener('click',open);
void open();
