// Presentation-only curriculum groupings for student maps.
// These do not rename areas/skills, change assignments, or modify mastery/evidence.
const CATEGORIES={
  advanced:[
    ['foundations','1 · Foundations & Logic',['variable-lab','math-lab','boolean-conditional-lab','string-lab']],
    ['control','2 · Loops & Collections',['loop-lab','array-lab','arraylist-lab','linkedlist-lab']],
    ['design','3 · Object-Oriented Design',['method-constructor-lab','class-object-lab','inheritance-polymorphism-lab']],
    ['algorithms','4 · Algorithms & Development Tools',['search-sort-lab','recursion-lab','debugger-lab','documentation-lab','robot-algorithms']]
  ],
  workplace:[
    ['foundations','1 · Professional Foundations',['creativity-and-innovation','critical-thinking-and-problem-solving','initiative-and-self-direction','integrity','work-ethic']],
    ['communication','2 · Communication & Relationships',['conflict-resolution','listening-and-speaking','respect-for-diversity','customer-service-orientation','teamwork']],
    ['career','3 · Career & Productivity',['big-picture-thinking','career-and-life-management','continuous-learning-and-adaptability','efficiency-and-productivity']],
    ['technology','4 · Technical & Digital Skills',['information-literacy','information-security','information-technology','job-specific-tools-and-technologies','mathematics']],
    ['safety','5 · Safety & Literacy',['professionalism','reading-and-writing','workplace-safety']]
  ]
};
const BIG_IDEAS=[
  ['1','Big Idea 1 · Creative Development'],
  ['2','Big Idea 2 · Data'],
  ['3','Big Idea 3 · Algorithms & Programming'],
  ['4','Big Idea 4 · Computer Systems & Networks'],
  ['5','Big Idea 5 · Impact of Computing']
];
function cspIdea(stop,original){
 const votes=new Map();
 for(const node of stop.nodes){
  const refs=node.curriculumRefs?.length?node.curriculumRefs:original?.get(node.id)||[];
  for(const ref of refs){
   const first=String(ref.label||'').match(/^([1-5])\./)?.[1];
   if(first)votes.set(first,(votes.get(first)||0)+1);
  }
 }
 return [...votes].sort((a,b)=>b[1]-a[1])[0]?.[0]||'1';
}
export function groupCourseStops(model,sourceGraph){
 const sourceStandards=new Map((sourceGraph?.nodes||[]).map(n=>[n.id,n.standardRefs||[]]));
 const result=[];
 if(model.courseId==='csp'){
   for(const [id,label] of BIG_IDEAS)result.push({id:'csp-'+id,label,stops:[]});
   for(const stop of model.stops)result.find(g=>g.id==='csp-'+cspIdea(stop,sourceStandards)).stops.push(stop);
 }else{
   const config=CATEGORIES[model.courseId];
   if(!config)return [];
   for(const [id,label] of config)result.push({id: model.courseId+'-'+id,label,stops:[]});
   for(const stop of model.stops){
     const key=String(stop.areaId).split(':').at(-1);
     const matched=config.find(([,,areas])=>areas.includes(key));
     const target=matched?result.find(g=>g.id===model.courseId+'-'+matched[0]):null;
     if(target)target.stops.push(stop);
     else{
       let other=result.find(g=>g.id===model.courseId+'-additional');
       if(!other){other={id:model.courseId+'-additional',label:'Additional Skills & Review',stops:[]};result.push(other);}
       other.stops.push(stop);
     }
   }
 }
 return result.filter(g=>g.stops.length).map(g=>({...g,skills:g.stops.reduce((n,s)=>n+s.nodes.length,0)}));
}
