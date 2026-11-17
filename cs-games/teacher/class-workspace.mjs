// Focused, addressable Teacher Tools class workspaces. Existing class data and APIs are unchanged.
// Hash routes remain compatible with historical #class-* links and query ?class=<id>.
import {el} from '../../wpr-games/workplace-readiness/online/dom.mjs';

export const CLASS_PAGES=Object.freeze({
  'class-overview':'Overview',
  'class-progress':'Class Progress',
  'class-students':'Student Profiles',
  'class-focus':'Learning Focus',
  'class-assignments':'Class Assignments',
  'class-plan':'Pathway & Pacing',
  'class-assessments':'Practice & Assessments',
  'class-manage':'Manage Class'
});
export function classRoute(hash=location.hash) {
  const id=hash.replace(/^#/,'');
  if(id==='add-class-title')return 'class-create';
  if(id==='class-create'||id==='class-archived'||id==='classes'||Object.hasOwn(CLASS_PAGES,id))return id;
  return 'classes';
}
export function installClassWorkspace({root,classList,panel,getSelectedId,renderList}) {
  const createPanel=root.querySelector('#add-class-title')?.closest('section');
  if(!createPanel)throw new Error('Create Class panel missing');
  createPanel.id='class-create';
  const headerActions=root.querySelector('.card-head > .actions');
  const createLink=headerActions?.querySelector('a[href="#add-class-title"]');
  if(createLink){createLink.href='#class-create';createLink.textContent='Create Class';}
  const archiveLink=el('a',{href:'#class-archived',class:'btn small',text:'Archived Classes'});
  const activeLink=el('a',{href:'#classes',class:'btn small',text:'Active Classes'});
  if(headerActions)headerActions.insertBefore(activeLink,headerActions.firstChild?.nextSibling||null);
  if(headerActions)headerActions.insertBefore(archiveLink,headerActions.lastChild);
  const caption=el('p',{class:'muted',id:'class-list-caption'});
  classList.before(caption);
  const pages=Object.entries(CLASS_PAGES);
  function nav() {
    return el('nav',{class:'class-workspace-nav','aria-label':'Class workspace'},
      el('a',{href:'#classes',class:'btn small',text:'← My Classes'}),
      ...pages.map(([id,name])=>el('a',{href:'#'+id,class:'btn quiet small',text:name})));
  }
  function display() {
    if(root.hidden)return;
    const route=classRoute();
    const hasDetail=Boolean(getSelectedId())&&Object.hasOwn(CLASS_PAGES,route);
    const listing=route==='classes'||route==='class-archived'||(Object.hasOwn(CLASS_PAGES,route)&&!hasDetail);
    classList.hidden=!listing;
    caption.hidden=!listing;
    caption.textContent=route==='class-archived'
      ? 'Archived classes are retained for review, separately from active classes.'
      : 'Active classes · Choose one to open its workspace.';
    createPanel.hidden=route!=='class-create';
    panel.hidden=!hasDetail;
    activeLink.setAttribute('aria-current',route==='classes'?'page':'false');
    archiveLink.setAttribute('aria-current',route==='class-archived'?'page':'false');
    if(!hasDetail)return;
    if(!panel.querySelector('.class-workspace-nav'))panel.prepend(nav());
    const focus=panel.querySelector('#learning-focus');
    const sectionMap={
      'class-overview':panel.querySelector('.card.accent'),
      'class-progress':panel.querySelector('#class-progress'),
      'class-students':panel.querySelector('#class-students'),
      'class-focus':focus,
      'class-assignments':focus,
      'class-plan':panel.querySelector('#class-plan'),
      'class-assessments':panel.querySelector('#class-assessments'),
      'class-manage':panel.querySelector('details.more')
    };
    const activeSection=sectionMap[route]||sectionMap['class-overview'];
    if(route==='class-manage'&&activeSection?.tagName==='DETAILS')activeSection.open=true;
    for(const section of new Set(Object.values(sectionMap))) {
      if(!section)continue;
      if(section===focus) {
        // The focus component owns availability; never reveal a server-disabled component.
        if(section.dataset.available==='true')section.hidden=section!==activeSection;
        else if(section.dataset.available!=='false' && section===activeSection) {
          // Its first refresh will decide visibility. Avoid overriding a disabled state.
        } else if(section!==activeSection) section.hidden=true;
      } else section.hidden=section!==activeSection;
    }
    if(focus&&activeSection===focus&&!focus.hidden){
      const form=focus.querySelector('#focus-form');
      const assignments=focus.querySelector('[aria-label="Class assignments"]');
      if(form&&form.dataset.enabled!=='false')form.hidden=route==='class-assignments';
      if(assignments)assignments.hidden=route==='class-focus';
    }
    panel.querySelectorAll('.class-workspace-nav a').forEach(a=>{
      if(a.hash==='#'+route)a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
  }
  function handleLocation(){renderList();display();}
  window.addEventListener('hashchange',handleLocation);
  window.addEventListener('popstate',handleLocation);
  return {display,route:classRoute};
}
