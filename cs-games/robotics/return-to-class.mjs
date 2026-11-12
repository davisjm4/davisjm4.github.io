import {activeProfile} from '../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';

const nav=document.querySelector('header .ecosystem-nav');
if(activeProfile&&nav){
  const link=document.createElement('a');
  link.href='/cs-games/student/';
  link.textContent='My class progress';
  nav.append(link);
}
