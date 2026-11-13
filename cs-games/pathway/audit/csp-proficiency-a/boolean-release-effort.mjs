import graph from '../../curriculum-graph.json' with {type:'json'};
import {evaluateSkillProficiency} from '../../proficiency/index.mjs';
import {normalizeEvent} from '../../mastery/events.mjs';
import {booleanChallenge} from '../../../../csp-games/engine.js';
import {booleanMakeEvidence,selectBooleanMakeChallenge} from '../../../../csp-games/proficiency-metadata.js';

const node=graph.nodes.find(n=>n.id==='node:csp:boolean-gatekeeper:CSP-BOOLEAN');
const trials=300;
const modes=['original','claude','focused','mixed'];
const counts=Object.fromEntries(modes.map(mode=>[mode,{attempts:[],qualified:0,total:0}]));
const timestamp=Date.parse('2026-11-12T12:00:00Z');
for(const mode of modes){
  const result=counts[mode];
  for(let trial=0;trial<trials;trial++){
    const recent=[],events=[];
    for(let i=1;i<=240;i++){
      const make=mode!=='mixed'||Math.random()<0.5;
      const q=make&&['focused','mixed'].includes(mode)?selectBooleanMakeChallenge(booleanChallenge,recent):booleanChallenge();
      const evidence=booleanMakeEvidence(q.solutions,q.e.op);
      const familyId=mode==='original'&&evidence.needsBothInputs?'both-inputs:'+q.e.op.toLowerCase():evidence.family;
      const questionId='q'+i;
      const {event}=normalizeEvent({id:questionId+':1',questionId,sessionId:'simulation',courseId:'csp',
        activity:'boolean-gatekeeper',mode:mode==='mixed'?'mixed':'make',assessedMode:make?'make':'evaluate',
        topic:make?'make':'evaluate',familyId:make?familyId:null,attempt:1,correct:true,occurred:timestamp+i},
      {graph,scope:{profileId:'simulation'}});
      events.push(event);
      result.total++;
      if(make&&familyId)result.qualified++;
      if(i>=8&&evaluateSkillProficiency(node,events).level===3){result.attempts.push(i);break;}
    }
  }
  result.attempts.sort((a,b)=>a-b);
  const quantile=p=>result.attempts[Math.floor((result.attempts.length-1)*p)];
  console.log(JSON.stringify({mode,trials,completed:result.attempts.length,median:quantile(.5),p90:quantile(.9),
    qualifiedPercent:Math.round(result.qualified/result.total*1000)/10}));
}
