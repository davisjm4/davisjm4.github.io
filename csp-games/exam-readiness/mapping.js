import {SKILL_BY_ID} from './curriculum.js';
// One canonical skill per question. Broad buckets are explicitly estimated and capped at Developing.
const hit=(key,quality='direct')=>({skillId:'CSP-'+key,quality});
const ETHICS_OBJECTIVES={"history":"IOC-1.D","representation":"IOC-1.D","measurement":"IOC-1.D","errors":"IOC-1.D","criteria":"IOC-1.D","privacy":"IOC-2.A","consent":"IOC-2.A","minimization":"IOC-2.A","security":"IOC-2.B","sensitive":"IOC-2.A","transparency":"IOC-1.F","explanation":"IOC-1.F","accountability":"IOC-1.F","oversight":"IOC-1.F","appeal":"IOC-1.F","accessibility":"IOC-1.A","employment":"IOC-1.A","environment":"IOC-1.A","stakeholders":"IOC-1.A","unintended":"IOC-1.B","misinformation":"IOC-1.F","synthetic":"IOC-1.F","rights":"IOC-1.F","evaluation":"IOC-1.A","deployment":"IOC-1.F"};
const terms={analysis:'ANALYSIS',visualization:'VISUALIZATION',pattern:'ANALYSIS',trend:'ANALYSIS','data-privacy':'PRIVACY',state:'VARIABLES',call:'PROCEDURES',return:'PROCEDURES','procedural-abstraction':'PROCEDURAL-ABSTRACTION',randomness:'RANDOM',decomposition:'ALGORITHMS',network:'SYSTEMS',internet:'SYSTEMS','packet-switching':'PACKETS',routing:'IP','ip-address':'IP',http:'PROTOCOLS',bandwidth:'SYSTEMS',latency:'SYSTEMS',scalability:'SYSTEMS',cybersecurity:'SECURITY',certificate:'SECURE-NETWORKS','public-key':'SECURE-NETWORKS',symmetric:'SECURE-NETWORKS',innovation:'IMPACTS',benefit:'IMPACTS',harm:'IMPACTS','algorithmic-bias':'BIAS',accessibility:'DIVIDE',security:'SECURITY',collection:'PRIVACY','ip-rights':'RIGHTS','open-source':'RIGHTS','citizen-science':'CROWD',ai:'ETHICS',ml:'ETHICS',automation:'IMPACTS',ethical:'ETHICS',legal:'RIGHTS',purpose:'PURPOSE',function:'FUNCTION',behavior:'FUNCTION',input:'INPUT',output:'OUTPUT',development:'DEVELOPMENT','iterative-development':'DEVELOPMENT',collaboration:'COLLABORATION',documentation:'DOCUMENTATION','user-experience':'DESIGN',testing:'TESTING','test-case':'TESTING','boundary-case':'TESTING',debugging:'DEBUGGING','logic-error':'DEBUGGING','runtime-error':'DEBUGGING','syntax-error':'DEBUGGING',binary:'BINARY',decimal:'BINARY',bit:'CAPACITY',byte:'CAPACITY',hexadecimal:'RGB',representation:'REPRESENTATION',abstraction:'REPRESENTATION',overflow:'NUMERIC',roundoff:'NUMERIC',sampling:'ANALOG',digital:'ANALOG',compression:'COMPRESSION',lossless:'COMPRESSION',lossy:'COMPRESSION',data:'ANALYSIS',information:'ANALYSIS',metadata:'TRANSFORM',variable:'VARIABLES',assignment:'VARIABLES',expression:'EXPRESSIONS',string:'EXPRESSIONS',boolean:'BOOLEAN',condition:'BOOLEAN',selection:'SELECTION',iteration:'ITERATION',loop:'ITERATION',algorithm:'ALGORITHMS',sequencing:'SEQUENCE',list:'LISTS',index:'LISTS',traversal:'LISTS',parameter:'PARAMETERS',argument:'PARAMETERS',procedure:'PROCEDURES',library:'LIBRARIES',api:'LIBRARIES',simulation:'SIMULATION',random:'RANDOM',efficiency:'EFFICIENCY',undecidable:'UNDECIDABLE',protocol:'PROTOCOLS',ip:'IP',dns:'DNS',tcp:'TRANSPORT',udp:'TRANSPORT',packet:'PACKETS',router:'IP',redundancy:'RESILIENCE','fault-tolerance':'RESILIENCE',parallel:'PARALLEL',distributed:'PARALLEL',copyright:'RIGHTS',license:'RIGHTS','creative-commons':'RIGHTS',attribution:'RIGHTS','intellectual-property':'RIGHTS',privacy:'PRIVACY',consent:'PRIVACY',bias:'BIAS','digital-divide':'DIVIDE',crowdsourcing:'CROWD',encryption:'SECURITY',phishing:'SECURITY',authentication:'SECURITY'};
export function resolveRecord(r) {
  const g=r.game,t=String(r.topic||''),d=r.details||{},m=String(r.mode||''),first=t.split(/[/. ]/)[0];
  const direct={ 'rgb-color-builder':'RGB','ascii-binary-builder':'CHARACTERS','analog-digital-lab':'ANALOG','roundoff-overflow-lab':'NUMERIC','lossless-lossy-lab':'COMPRESSION','compression-challenge':'COMPRESSION','boolean-gatekeeper':'BOOLEAN','list-lab':'LISTS','binary-search-hunt':'SEARCH','algorithm-race':'EFFICIENCY','network-breaker':'RESILIENCE','parallel-processing-race':'PARALLEL','tcp-udp-lab':'TRANSPORT','digital-divide-lab':'DIVIDE' };
  if(direct[g])return hit(direct[g]);
  if(g==='binary-builder'){const key={representation:'BINARY',capacity:'CAPACITY',overflow:'NUMERIC',pixels:'REPRESENTATION'}[first];return key?hit(key):null;}
  if(g==='packet-router')return hit(t==='rerouting'?'RESILIENCE':'IP');
  if(g==='data-detective')return hit(t.startsWith('graph')||t.startsWith('visualization')?'VISUALIZATION':['metadata','cleaning','limitations'].includes(first)?'TRANSFORM':'ANALYSIS');
  if(g==='code-concepts'){
    const [category,variant]=t.split('/');
    if(category==='procedures')return hit(['parameter','parameters','argument','arguments','match'].includes(variant)?'PARAMETERS':'PROCEDURES');
    if(category==='variables')return hit(variant?.startsWith('boolean')||variant==='comparison'?'BOOLEAN':variant==='assignment'||variant==='variable'||variant==='value'?'VARIABLES':'EXPRESSIONS');
    const k={selection:'SELECTION',iteration:'ITERATION',lists:'LISTS'}[category];return k?hit(k):null;
  }
  if(g==='algorithm-architect'){
    const k={sequence:'SEQUENCE',selection:'SELECTION','nested-selection':'SELECTION',iteration:'ITERATION',nested:'ITERATION',counter:'ITERATION',accumulator:'ITERATION',search:'ALGORITHMS',procedure:'PROCEDURES'}[t];return k?hit(k):null;
  }
  if(g==='test-case-builder')return hit(first==='quick'&&t==='quick.bugs'?'DEBUGGING':t==='quick.predict'?'FUNCTION':'TESTING');
  if(g==='response-builder'&&first==='abstraction')return null;
  if(g==='response-builder')return hit(({behavior:'FUNCTION',guided:'FUNCTION',test:'TESTING',testing:'TESTING',abstraction:'PROCEDURAL-ABSTRACTION',evidence:'FUNCTION',explanation:'FUNCTION',reasoning:'FUNCTION',reduced:'FUNCTION'})[first]||'FUNCTION','estimated');
  if(g==='create-task-lab'){
    const f=String(d.familyId||'');
    if(/algorithm-(selection|iteration)-absent/.test(f))return hit('STUDENT-PROCEDURE','estimated');
    if((t==='io'||t==='behavior')&&!d.familyId)return null;
    if(t==='io')return hit(/output/.test(f)?'OUTPUT':'INPUT','estimated');
    if(t==='behavior')return hit(/ppr/.test(f)?'PPR':/initial-state|state-change|accumulator/.test(f)?'VARIABLES':'ALGORITHMS','estimated');
    return hit(({procedures:'PROCEDURES',parameters:'PARAMETERS',selection:'SELECTION',iteration:'ITERATION',lists:'LISTS'})[t]||'PPR','estimated');
  }
  if(g==='trivial-nontrivial')return hit('ALGORITHMS');
  if(g==='computing-impact-lab')return hit(({innovation:'IMPACTS',tradeoffs:'IMPACTS',privacy:'PRIVACY',bias:'BIAS',access:'DIVIDE',crowd:'CROWD',rights:'RIGHTS'})[first]||'ETHICS','estimated');
  if(g==='cybersecurity-defender')return hit('SECURITY');
  if(g==='simulation-lab')return hit(t==='randomness'?'RANDOM':'SIMULATION');
  if(g==='internet-layers-lab'){
    const c=d.concept||t.split(':')[2];
    return hit(({dns:'DNS',ip:'IP',routing:'IP',router:'IP',tcp:'TRANSPORT',udp:'TRANSPORT',quic:'TRANSPORT',congestion:'SYSTEMS',packets:'PACKETS',packet:'PACKETS',redundancy:'RESILIENCE',https:'SECURE-NETWORKS',layers:'PROTOCOLS',http:'PROTOCOLS',switch:'SYSTEMS',link:'SYSTEMS',capacity:'SYSTEMS',endpoints:'SYSTEMS'})[c]||'PROTOCOLS',c?'direct':'estimated');
  }
  if(g==='ai-ethics-lab'){
    const c=d.ethicalConcept||t.split(':')[3]||'';
    const objective=d.learningObjective||ETHICS_OBJECTIVES[c];if(!objective)return null;return hit(objective==='IOC-1.D'?'BIAS':objective==='IOC-2.A'?'PRIVACY':objective==='IOC-2.B'?'SECURITY':['IOC-1.A','IOC-1.B'].includes(objective)?'IMPACTS':'ETHICS');
  }
  if(g==='vocabulary-fill-in-lab')return terms[d.term]?hit(terms[d.term],'estimated'):null;
  if(g==='mixed-ap-practice'){
    const k={'creative/purpose':'PURPOSE','creative/collaboration':'COLLABORATION','creative/testing':'TESTING','data/table':'ANALYSIS','data/capacity':'CAPACITY','data/compression':'COMPRESSION','algorithms/list':'LISTS','algorithms/undecidable':'UNDECIDABLE','algorithms/code':'FUNCTION','systems/protocol':'PROTOCOLS','systems/parallel':'PARALLEL','systems/fault':'RESILIENCE','impact/privacy':'PRIVACY','impact/rights':'RIGHTS','impact/bias':'BIAS'}[t];return k?hit(k,'estimated'):null;
  }
  // Dance stages combine constructs and repeated edits; no isolated skill evidence is asserted.
  return null;
}
export function mappedRecord(r){const x=resolveRecord(r);return x&&SKILL_BY_ID[x.skillId]?x:null;}
