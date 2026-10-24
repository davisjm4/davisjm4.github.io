import {blank,move,call,procedure,execute,observable,traceDifference,walk} from './engine.js';
export const COMBINATIONS=['FOOT','HAND','KNEE','ELBOW','HIP'].flatMap(part=>['RIGHT','LEFT'].map(side=>({part,side})));
export const verse=({part,side})=>['moveIn','moveOut','moveIn','shake'].map(op=>({op,part,side})).concat({op:'turnAround'});
export const choreography=(count=10)=>COMBINATIONS.slice(0,count).flatMap(verse);
export const STAGES=[
 {id:'sequence',title:'1 · Build a sequence',objective:'Watch the right foot. Build its five movements in order, then run your algorithm.',help:'Watch Target as often as you like. Add movement blocks, choose FOOT and RIGHT, and reorder with ↑ / ↓. Run is practice; Check Algorithm is your submission.',parts:1,structure:'sequence'},
 {id:'repetition',title:'2 · Spot the repetition',objective:'Build the right-foot verse followed by the left-foot verse. What changes? What stays the same?',help:'Keep the first verse and add the second. Compare your two sequences below. Only the side changes; copying the body will become hard to maintain.',parts:2,structure:'sequence'},
 {id:'parameters',title:'3 · Extract and generalize',objective:'Build dance(part, side) for the first three movements. Build hokey_pokey() for the shake and turn. Call both for each foot.',help:'Inside dance, choose parameter part and parameter side, not FOOT and RIGHT. Inside hokey_pokey, Shake active part uses the limb just moved. Outside, supply FOOT and RIGHT or LEFT as arguments. A parameter is a placeholder; an argument is the value passed by a call.',parts:2,structure:'split'},
 {id:'complete',title:'4 · Complete the Hokey Pokey',objective:'Use your two procedures for all ten verses: right then left foot, hand, knee, elbow, and hip.',help:'Keep one definition of each procedure. In Main routine, call dance with the next part and side, then call hokey_pokey. The full target is 50 movements. You can replay the target before checking.',parts:10,structure:'split'},
 {id:'improve',title:'5 · Improve and compare',objective:'Compare code reuse, complete the worksheet count comparison, and check your full routine. You may combine the helper into dance.',help:'A combined dance procedure can contain all five movements with parameters, so each verse needs just one call. Or keep the two reusable procedures. Loops are now available: try a repeating rhythm in Dance Studio after this lesson.',parts:10,structure:'generalized'}
];
// Song interface: fixed authored lessons; no generated-question or repeat-avoidance system.
export const SONGS={hokey:{title:'Hokey Pokey',supportedMovements:['moveIn','moveOut','shake','turnAround'],referenceChoreography:choreography(),stages:STAGES,learningObjectives:['Sequence instructions','Extract repeated code','Define parameters and pass arguments','Compare abstraction and code reuse'],validationRules:'Exact observable trace plus stage structure',completionCriteria:'Five stages and worksheet conceptual counts'}};
export function starter(stage,previous){
 if(stage===0)return blank();
 const p=previous?JSON.parse(JSON.stringify(previous)):blank();
 if(stage===2){const fresh=blank();fresh.procedures=[procedure('dance'),procedure('hokey_pokey',[])];return fresh;}
 if(stage===3)p.body=[];
 return p;
}
export function structureError(p,stage){
 const s=STAGES[stage];if(s.structure==='sequence'){if(p.procedures.length||p.body.some(n=>n.type!=='move'))return 'Build direct movement commands first. Procedures begin in stage 3.';return null;}
 const dance=p.procedures.find(d=>d.name==='dance');
 if(!dance||JSON.stringify(dance.params)!=='["part","side"]')return 'Define dance(part, side) with both formal parameters.';
 let partUsed=false,sideUsed=false;const all=blank();all.body=dance.body;walk(all,n=>{if(n.type==='move'){partUsed||=n.part==='$part';sideUsed||=n.side==='$side';}if(n.type==='call'){partUsed||=n.args.includes('$part');sideUsed||=n.args.includes('$side');}});
 if(!partUsed||!sideUsed)return 'Your dance definition must use both parameter part and parameter side. Fixed body-part values do not generalize.';
 const helper=p.procedures.find(d=>d.name==='hokey_pokey');
 if(s.structure==='split'){
  if(!helper||helper.params.length)return 'Define hokey_pokey() with no parameters for shake and turn.';
  let helperTrace;try{const test={version:1,procedures:p.procedures,body:[move('moveIn','FOOT','RIGHT'),call('hokey_pokey',[])]};helperTrace=observable(execute(test).trace).slice(1);}catch(e){return `Incorrect helper definition: ${e.message}`;}
  if(JSON.stringify(helperTrace)!==JSON.stringify([{op:'shake',part:'FOOT',side:'RIGHT'},{op:'turnAround'}]))return 'The hokey_pokey helper should shake the active body part and then turn around.';
 }
 // Test the abstraction for every body part/side, not only the first successful call.
 for(const combo of COMBINATIONS){let result;try{const test={version:1,procedures:p.procedures,body:[call('dance',[combo.part,combo.side])]};result=observable(execute(test).trace);}catch(e){return `Incorrect dance definition: ${e.message}`;}
  const expected=verse(combo),isThree=JSON.stringify(result)===JSON.stringify(expected.slice(0,3)),isFive=JSON.stringify(result)===JSON.stringify(expected);
  if(s.structure==='split'?!isThree:!(isThree||isFive))return s.structure==='split'?'dance(part, side) must generalize the first three movements; keep shake and turn in hokey_pokey().':'Test your dance definition with different arguments. It must produce the first three movements or the complete five-movement verse.';
 }
 // Every observable beat must come from a procedure call, excluding unused token definitions.
 const result=execute(p).trace;if(result.some(c=>!c.stack.length))return 'Use procedure calls for the choreography. An unused definition plus copied movement blocks does not demonstrate abstraction.';
 return null;
}
export function validate(p,stage,counts={}){let trace;try{trace=execute(p).trace;}catch(e){return {ok:false,kind:'execution',message:e.message};}
 const diff=traceDifference(trace,choreography(STAGES[stage].parts));if(diff){if(stage>=2&&trace.length<STAGES[stage].parts*5)diff.message+=' Check for a missing procedure call or a repeat count that is too small.';if(stage>=2&&trace.length>STAGES[stage].parts*5)diff.message+=' Check for an extra call or a repeat count that is too large.';return {ok:false,...diff};}
 const structural=structureError(p,stage);if(structural)return {ok:false,kind:'structure',message:structural};
 if(stage===4&&!(counts.expanded===50&&counts.separate===74&&counts.parameterized===29))return {ok:false,kind:'count',message:'Finish the conceptual line-count comparison below. Count definitions and calls using the stated worksheet rules.'};
 return {ok:true,kind:'correct',message:'Match! Your execution trace and required program structure both satisfy this stage.',trace};
}
export function hint(stage,attempts){const s=STAGES[stage];if(attempts<2)return 'Replay the target slowly. Step your routine and compare the first point where they differ.';if(attempts<4)return stage<2?'Each verse has five movements. Check the in/out changes before the shake and the full turn.':'Follow the values from each call into the parameter placeholders. Check where the helper is called.';return stage<2?'For each requested limb, the pattern is move in → move out → move in → shake → turn. Check both the part and side on every block.':s.help;}
