// Teacher Tools uses addressable, focused views rather than long-page anchor scrolling.
// Existing #wpr-online / #quiz-settings links remain supported.
(function () {
  var views = Array.from(document.querySelectorAll('[data-view]'));
  var links = Array.from(document.querySelectorAll('[data-view-link]'));
  var NAMES = { classes:'My Classes', practice:'Practice & Assessments', pathways:'Learning Pathways' };
  var aliases = { 'wpr-online':'practice-online', 'wpr-teacher-profiles':'classes',
    'quiz-settings':'practice-canvas', 'add-class-title':'class-create' };
  var classPages = /^class-(overview|progress|students|focus|assignments|plan|assessments|manage|create|archived)$/;
  var practiceIds = new Set(['practice-online','practice-published','practice-canvas']);
  var practicePanels = {
    'practice-online': document.getElementById('practice-online'),
    'practice-published': document.getElementById('practice-published'),
    'practice-canvas': document.getElementById('practice-canvas')
  };

  function resolve(hash) {
    var id;
    try { id=decodeURIComponent((hash||'').replace(/^#/,'')); } catch { id='classes'; }
    id=aliases[id]||id;
    if (classPages.test(id)) return {view:'classes',sub:null,target:null};
    if (practiceIds.has(id)) return {view:'practice',sub:id,target:null};
    if (views.some(v=>v.dataset.view===id)) return {view:id,sub:null,target:null};
    var node=id&&document.getElementById(id);
    var owner=node&&node.closest('[data-view]');
    if (owner?.dataset.view==='practice') {
      var section=node.closest('#practice-online, #practice-published, #practice-canvas');
      return {view:'practice',sub:section?.id||null,target:section?.id===id?null:id};
    }
    return owner ? {view:owner.dataset.view,sub:null,target:id} : {view:'classes',sub:null,target:null};
  }
  function show(view,sub) {
    views.forEach(v=>{v.hidden=v.dataset.view!==view;});
    links.forEach(a=>{
      if (a.dataset.viewLink===view) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    Object.entries(practicePanels).forEach(([id,panel])=>{if(panel)panel.hidden=sub!==id;});
    ['quiz-summary','preview'].forEach(id=>{
      var element=document.getElementById(id);
      if (!element) return;
      // Keep the quiz's own hidden state when it is the active workflow.
      if (sub!=='practice-canvas') {
        if(!element.hidden)element.dataset.routeHidden='true';
        element.hidden=true;
      }
      else if (element.dataset.routeHidden==='true') { element.hidden=false; delete element.dataset.routeHidden; }
    });
    document.querySelectorAll('#practice [href^="#practice-"]').forEach(a=>{
      if (a.getAttribute('href')==='#'+sub) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    var back=document.getElementById('practice-back');
    if(back)back.hidden=!sub;
    document.title = (sub ? (practicePanels[sub]?.querySelector('h2')?.textContent||NAMES[view]) : NAMES[view])+
      ' | Teacher Tools | CS Games';
  }
  function route(initial) {
    var r=resolve(location.hash);
    show(r.view,r.sub);
    if (r.target) {
      var t=document.getElementById(r.target);
      if(t && !t.hidden) { t.scrollIntoView(); return; }
    }
    if(initial)return;
    window.scrollTo(0,0);
    var heading=r.sub ? practicePanels[r.sub]?.querySelector('h2') :
      document.querySelector('[data-view="'+r.view+'"] h2');
    if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
  }
  window.addEventListener('hashchange',()=>route(false));
  route(true);
})();
