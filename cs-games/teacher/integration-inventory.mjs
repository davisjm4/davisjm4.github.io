// Machine-readable, URL-deduplicated inventory. Does not change course catalogs.
import './test-runtime.mjs';import fs from'node:fs';import vm from'node:vm';
const {sources,baselineSourceIds,baselineModeIds}=await import('./adapters.js?v=package-f-20261027');
const raw={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../catalog.js',import.meta.url),'utf8'),raw);
const entries=[...new Map(raw.window.CSGamesCatalog.map(g=>[new URL(g.url,'https://davisjm4.github.io/cs-games/'+(g.course==='advanced'?'advanced':'csp')+'/').pathname,g])).values()];
const mapping={'loop-lab':'loop','string-lab':'string','class-object-lab':'class-object','arraylist-lab':'arraylist','linkedlist-lab':'linkedlist','method-constructor-lab':'method-constructor','debugger-lab':'debugger','inheritance-polymorphism-lab':'inheritance','documentation-lab':'documentation','boolean-conditional-lab':'boolean','variable-lab':'variable','math-lab':'math','array-lab':'array','recursion-lab':'recursion','search-sort-lab':'search-sort'};
const exclusions={
 'algorithm-dance-lab':'Open-ended choreography, musical timing and live responses require execution and continuous feedback; no standalone scored question contract.',
 'ascii-binary-builder':'Building a character or message through live bit manipulation is the practice objective; converting it would require a separate question design.',
 'rgb-color-builder':'Continuous color matching and tolerance-based manipulation are not represented by the existing single-choice contract.',
 'network-breaker':'Constructing a minimal cut requires interactive selection and may have several valid cuts; no validated standalone response-choice set.',
 'packet-router':'Constructing and repairing a route has multiple valid paths and live graph feedback; no validated single-choice adaptation.',
 'exam-readiness':'Practice-evidence pathway and tracker, not an assessment question generator.',
 'class-builder-rearrange':'Learners construct class structure with code blocks; multiple valid arrangements require a separate validated response contract.',
 'api-project-builder':'Multi-request planning, runtime parameters, dependencies and endpoint selection require a staged structured response; a single-choice key would assess a narrower newly designed task.'
};
const limits={
 'boolean-gatekeeper':'Evaluate only; making a satisfying assignment and exploratory truth/range tools remain interactive.',
 'binary-builder':'Capacity, explicit wrap result and pixel bit-count only; direct bit construction remains interactive.',
 'binary-search-hunt':'Midpoint-inspection count only; click-by-click interval search remains practice.',
 'list-lab':'Final list after the native operations; interactive manipulation itself is not exported.',
 'compression-challenge':'Run counting in text/row-major grids; encoding and optimization controls remain practice.',
 'data-detective':'Standalone dataset-filter counts; sorting, charts and data-cleaning interactions are not exported.',
 'parallel-processing-race':'Minimum finishing time under the native queue/dependency model; scheduling construction is not exported.',
 'cybersecurity-defender':'Exactly one phishing-warning field. No safe/multiple-warning messages or password construction.',
 'simulation-lab':'Randomness, reference prediction and comparison questions; trial controls and multi-part limitations tasks remain practice.',
 'computing-impact-lab':'One explicitly named claim, evidence or reasoning step per item; not the complete three-step response or personal policy reflection.',
 'code-concepts':'Single-region identification and counts; multi-region selection is excluded.',
 'trivial-nontrivial':'Program A meaningfulness classification; Program B comparisons and paired outcomes are not exported.',
 'algorithm-architect':'Existing missing-component question only; free construction remains practice.',
 'arraylist-lab':'Choice, single-cell and insertion-gap decisions; select-every-removed-element tasks excluded.',
 'linkedlist-lab':'Traversal and Java collection decisions; reference wiring and pointer mutation excluded.',
 'method-constructor-lab':'Native choice and single-span identification; argument rearrangement excluded.',
 'inheritance-polymorphism-lab':'Native single-choice Abstract Class questions only. Hierarchies, multi-selection, tracing tuples, headers and repairs remain practice.',
 'documentation-lab':'Choice, comment-line and documentation-line interpretation. Editor, Javadoc builder, classification and call construction excluded.',
 'response-explorer':'Find Data and single-selection Understand Structure across native levels. Slot/classification/multiple-needs tasks excluded.',
 'robot-algorithms':'Prediction, loops, conditionals and methods with complete grid/sensor context. Route construction and repair tasks excluded.',
 'variable-lab':'Trace plus all 12 identification variants; declaration assembly remains practice.',
 'boolean-conditional-lab':'All ten scored modes; exploratory range tools remain unscored practice.',
 'workplace-readiness':'All four existing modes; five native zero-content skill/mode/level selections remain blocked. Ordering is sequence recognition.',
 'raceces':'Existing three modes across Writing and Mathematics; ordering is sequence recognition, not writing construction.'
};
const nativeExtras={
 'boolean-gatekeeper':['Evaluate','Make','Truth Table Tool','Range Tool'],
 'binary-builder':['Build Binary','Capacity','Overflow','Pixels'],
 'binary-search-hunt':['Click Search Trace'],
 'list-lab':['Manipulate Lists','Trace Operations'],
 'compression-challenge':['Text Encoding','Image Encoding','Optimize'],
 'data-detective':['Filter','Sort','Interpret Trend','Clean Data'],
 'cybersecurity-defender':['Phishing','Password Protection'],
 'parallel-processing-race':['Independent','Dependent'],
 'algorithm-dance-lab':['Learn','Create','Live'],
 'rgb-color-builder':['Binary','Hexadecimal','Mixed'],
 'ascii-binary-builder':['One Character','Two–Three Characters','Four–Six Characters','Custom'],
 'network-breaker':['Choose a Network Cut'], 'packet-router':['Build a Route','Repair a Route'],
 'exam-readiness':['Skills Pathway','Practice Evidence','Review'],
 'method-constructor-lab':['Identify Method Parts','Identify Constructor Parts','Match Calls','Order Arguments','Returns','Constructors','Returned Values','Fix','Access'],
 'linkedlist-lab':['Link Nodes','Insert & Remove','Trace','Collections'],
 'inheritance-polymorphism-lab':['Hierarchy','Override','Tracer','Abstract','Debug'],
 'documentation-lab':['Inspector','Editor','Javadoc Builder','Read Docs','API Detective','Response Explorer','API Project Builder'],
 'string-lab':globalThis.StringLab.Generator.MODES.map(m=>m.label),
 'robot-algorithms':['Predict','Loops','Build','Conditionals','Debug','Methods'],
 'response-explorer':['Find Data','Understand Structure','Select What the App Needs'],
 'variable-lab':['Identify','Assemble','Trace']
};
const items=entries.map(g=>{const url=new URL(g.url,'https://davisjm4.github.io/cs-games/'+(g.course==='advanced'?'advanced':'csp')+'/'),directory=url.pathname.replace(/^\//,'').replace(/\/$/,''),slug=directory.split('/').at(-1);return{activity:g.title,pathway:g.source==='java'?'Advanced CS':'AP CSP',url:url.href,directory,slug,objectives:g.skill}});
items.push({activity:'CSP Exam Readiness Pathway',pathway:'AP CSP',url:'https://davisjm4.github.io/csp-games/exam-readiness/',directory:'csp-games/exam-readiness',slug:'exam-readiness',objectives:'Plan review using practice evidence and exam skills'},
{activity:'Workplace Readiness',pathway:'WPR',url:'https://davisjm4.github.io/wpr-games/workplace-readiness/',directory:'wpr-games/workplace-readiness',slug:'workplace-readiness',objectives:'22 workplace readiness skills and professional decisions'},
{activity:'RACECES Writing & Mathematics',pathway:'RACECES',url:'https://davisjm4.github.io/wpr-games/raceces/',directory:'wpr-games/raceces',slug:'raceces',objectives:'Writing response components and mathematical explanations across 23 topics'},
{activity:'Class Builder — Rearrange',pathway:'Advanced CS',url:'https://davisjm4.github.io/java-games/class-object-lab/class-builder-rearrange/',directory:'java-games/class-object-lab/class-builder-rearrange',slug:'class-builder-rearrange',objectives:'Construct Java class structure from components'},
{activity:'API Response Explorer',pathway:'Advanced CS',url:'https://davisjm4.github.io/java-games/documentation-lab/',directory:'java-games/documentation-lab',slug:'response-explorer',objectives:'Read JSON response values, paths, relationships and structure'},
{activity:'API Project Builder',pathway:'Advanced CS',url:'https://davisjm4.github.io/java-games/documentation-lab/',directory:'java-games/documentation-lab',slug:'api-project-builder',objectives:'Plan API requests, parameters and dependencies'});
const stats=JSON.parse(fs.readFileSync(new URL('../reports/package-f/evidence/source-validation.json',import.meta.url),'utf8'));
for(const row of items){
 const id=mapping[row.slug]||row.slug,source=sources.find(s=>s.id===id),baseline=!!source&&baselineSourceIds.includes(id),newModes=source?.modes.filter(m=>!baselineModeIds[id]?.includes(m.id))||[];
 Object.assign(row,{sourceId:source?.id||'',practiceModes:nativeExtras[row.slug]||source?.modes.map(m=>m.name)||['Interactive practice'],eligibility:source?(limits[row.slug]?'C':['create-task-lab','array-lab','search-sort-lab'].includes(row.slug)?'B':'A'):'D',exportSupport:source?(limits[row.slug]?'Partial':'Full'):'None',integration:source?(baseline?(newModes.length?'Existing + expanded':'Existing'):'New'):'Deferred / practice-only',questionTypes:source?'Single-answer multiple choice (2–4 options)':'None',difficulty:source?[...new Set(source.modes.flatMap(m=>m.difficulties||['Native Mixed']))].join(', '):'Native practice settings only',supportedModes:source?.modes.map(m=>m.id)||[],baselineVariants:baseline?baselineModeIds[id].length:0,finalVariants:source?.modes.length||0,generatorReuse:source?(row.slug==='response-explorer'?'Adapter over canonical provider fixtures and existing expansion':row.eligibility==='A'?'Direct engine normalization':'Assessment adapter over native generator'):'Deferred',validation:source?(stats.find(s=>s.source===id)?.accepted+' seeded accepted items; source grader and QTI validation'||'Existing Package B regression'):'Not exported',canvasImport:'Not Verified',limitations:limits[row.slug]||exclusions[row.slug]||'No additional interaction limitation; live Canvas import not verified.',contextRequired:source?'Complete source code/scenario, input values and any source tables/diagrams preserved in text':'Interactive state or construction required',deterministic:source?'Yes, assessment-local seed':'Native tool dependent',architecture:row.directory.startsWith('wpr')?'Classic engine bundles; isolated existing adapters':'ES modules or canonical static fixtures; teacher-only adapter'});
 if(source)row.generatorReuse=row.eligibility==='A'?'Direct engine normalization':'Assessment adapter over native generator';
 if(source&&!stats.find(s=>s.source===id))row.validation='Existing Package B/C regression; baseline golden comparison';
}
const counts={activities:items.length,existingSources:baselineSourceIds.length,baselineVariants:Object.values(baselineModeIds).reduce((n,m)=>n+m.length,0),finalSources:sources.length,finalVariants:sources.reduce((n,s)=>n+s.modes.length,0),categories:Object.fromEntries(['A','B','C','D'].map(c=>[c,items.filter(r=>r.eligibility===c).length])),integration:Object.fromEntries([...new Set(items.map(r=>r.integration))].map(c=>[c,items.filter(r=>r.integration===c).length]))};
const output=new URL('../reports/package-f/',import.meta.url);fs.writeFileSync(new URL('integration-coverage.json',output),JSON.stringify({baselineCommit:'7f44b0daf4214cdb287790ce303c646007ae228c',counts,activities:items},null,2)+'\n');
const cols=['activity','pathway','url','directory','objectives','practiceModes','eligibility','integration','exportSupport','supportedModes','questionTypes','difficulty','generatorReuse','validation','canvasImport','limitations','contextRequired','deterministic','architecture','baselineVariants','finalVariants'];
fs.writeFileSync(new URL('integration-coverage.csv',output),[cols,...items.map(r=>cols.map(c=>Array.isArray(r[c])?r[c].join('; '):String(r[c]??'')))].map(row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
console.log(JSON.stringify(counts,null,2));
