import { rememberAdvisoryWork, reconcileAdvisoryWork } from './advisory-practice.mjs';
import { el } from '../../wpr-games/workplace-readiness/online/dom.mjs';
import { request } from '../../wpr-games/workplace-readiness/online/config.mjs';
import { practiceLinks } from './practice-links.mjs';
import { withPracticeReturn } from './practice-return.mjs';
import { readRoute, routeHash } from './map/route.mjs';

const labels={class:'Whole class',group:'Selected group',individual:'Individual'};
const stateNames={available:'Available',started:'Started','in-progress':'In progress',complete:'Complete'};
export function createStudentFocus({root,profile,storage}) {
  const key='learning-focus-previous:'+profile.classId;
  const cache='learning-focus-cache:'+profile.classId;
  let model=null, view=null, timer, loading;
  try {const saved=JSON.parse(storage.getItem(cache));if(saved?.enabled)model={...saved,stale:true};}catch{}
  function priorPosition(){
    try {return storage.getItem(key);} catch {return null;}
  }
  function rememberPosition(){
    try {
      if(storage.getItem(key)===null)storage.setItem(key,routeHash(readRoute()));
    }catch {}
  }
  function returnAction(node){
    const url=new URL(location.href);
    url.hash=routeHash({view:'area',stopId:node.areaId,nodeId:node.id,layout:readRoute().layout});
    return url.pathname+url.search+url.hash;
  }
  function render(){
    if(!model?.enabled||!view){root.hidden=true;return;}
    reconcileAdvisoryWork(profile,[...model.classwork,...model.catchUp]);
    const nodes=new Map(view.nodes.map(node=>[node.id,node]));
    const areas=new Map(view.areas.map(area=>[area.id,area.title]));
    const title=item=>{
      const {target,destinations}=item;
      if(target.kind==='skill'){
        const node=nodes.get(target.id);
        const activity=destinations[0]?.activityId;
        const lab=activity && node && practiceLinks(node).links.find(link=>link.activityId===activity)?.label
          .replace(/^(Open|Practice in) /,'');
        return node ? (lab ? lab+' · '+node.title : node.title) : 'Assigned skill';
      }
      if(target.kind==='area')return areas.get(target.id)??'Assigned area';
      if(target.kind==='activity'){
        const node=nodes.get(destinations[0]?.nodeId);
        return node && practiceLinks(node).links.find(link=>link.activityId===target.id)?.label.replace(/^(Open|Practice in) /,'') || 'Assigned activity';
      }
      return 'Assigned skill group';
    };
    function linksFor(item){
      return item.destinations.flatMap(({nodeId,activityId})=>{
        const node=nodes.get(nodeId);
        if(!node)return [];
        const link=practiceLinks(node).links.find(link=>link.activityId===activityId);
        if(!link)return [];
        const label=item.progress==='available'?'Start Assignment':'Resume Assignment';
        const url=withPracticeReturn(link.url,{origin:location.origin,course:view.courseId,classId:view.classId,route:readRoute()});
        const destination=new URL(url,location.origin);
        if(destination.origin===location.origin){
          destination.searchParams.set('focus',item.id);
          destination.searchParams.set('focusRevision',item.revision);
        }
        return [el('li',{},el('a',{class:'btn',href:destination.href,
          text:item.destinations.length===1?label:label+' · '+node.title,onclick:()=>{
            rememberPosition();
            if(item.progress!=='complete')rememberAdvisoryWork(profile,{id:item.id,revision:item.revision,title:title(item)});
          }}))];
      });
    }
    function card(item){
      const links=linksFor(item);
      const related=model.recommendations.find(r=>r.assignments.some(a=>a.id===item.id))?.assignments??[];
      const node=nodes.get(item.destinations[0]?.nodeId);
      return el('article',{class:'student-panel','data-focus-id':item.id},
        el('h3',{text:title(item)}),
        el('p',{text:labels[item.scope]+' · '+stateNames[item.progress]}),
        item.reason&&el('p',{text:item.reason}),
        el('p',{text:'Completion is recorded separately from proficiency and teacher-reviewed mastery.'}),
        links.length?el('ul',{},links):el('p',{text:'This target is unavailable in the current pathway.'}),
        related.length>1&&el('details',{},el('summary',{text:'Related assignment statuses'}),
          el('ul',{},related.map(a=>el('li',{},el('span',{text:labels[a.scope]+' · '+stateNames[a.progress]}),
            a.id!==item.id&&el('ul',{},linksFor(a)))))),
        item.progress==='complete'&&node&&el('a',{href:returnAction(node),text:'Continue From Here'}));
    }
    const previous=priorPosition();
    const pending=Boolean(model.stale||!navigator.onLine);
    const primary=new Set(model.recommendations.map(r=>r.assignments[0]?.id));
    const group=(heading,items)=>items.length&&el('section',{},
      el('h2',{text:heading}),items.map(item=>primary.has(item.id)?card(item):
        el('p',{text:title(item)+' · '+labels[item.scope]+' · '+stateNames[item.progress]+' · See the related assignment above.'})));
    const items=[...model.classwork,...model.catchUp];
    root.hidden=!items.length&&!pending&&previous===null;
    root.replaceChildren(
      ...[pending&&el('p',{role:'status',text:'Showing saved assignments. New updates will appear when you reconnect.'}),
      group("Today's Classwork",model.classwork),group('Your Catch-Up Work',model.catchUp),
      previous!==null&&el('p',{},el('a',{href:previous||location.pathname+location.search,text:'Resume Previous Path'}))].filter(Boolean));
  }
  return {
    setPathway(next){if(view===next)return;view=next;render();},
    async refresh(){
      if(!profile||document.hidden)return;
      if(loading)return loading;
      loading=(async()=>{
        clearTimeout(timer);
        try{
          const result=await request('/profile/learning-focus',{token:profile.token});
          if(JSON.stringify(result)!==JSON.stringify(model)){
            model=result;
            try {if(result.enabled)storage.setItem(cache,JSON.stringify(result));else storage.removeItem(cache);}catch{}
            render();
          }
        }catch(error){
          if(error.status===404)return;
          if(error.status===401||error.status===403){try{storage.removeItem(cache);}catch{}model=null;root.replaceChildren();root.hidden=true;return;}
          if(model?.enabled){model={...model,stale:true};render();}
        }
        timer=setTimeout(()=>this.refresh(),30000);
      })().finally(()=>{loading=null;});
      return loading;
    },
  };
}
