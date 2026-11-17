import { geometry, poseAt, validateDesign, checkDesign } from './core.mjs';

// Deterministic geometric preview. These samples animate the planned centerline,
// not robot physics. The existing independent checker owns all pass/fail outcomes.
export function previewFrames(project) {
  const errors=validateDesign(project);
  if(errors.length) throw Error(errors[0]);
  const route=geometry(project);
  if(!route.segments.length)throw Error('Add a course segment to preview robot movement.');
  const frames=[];
  const samplesPerSegment=Math.max(4,Math.min(28,Math.floor(450/route.segments.length)));
  for(const part of route.segments){
    const start=frames.length ? 1:0;
    for(let i=start;i<=samplesPerSegment;i++){
      frames.push({segment:part.index+1,pose:poseAt(part,i/samplesPerSegment),
        end:i===samplesPerSegment,progress:i/samplesPerSegment});
    }
  }
  return frames;
}
export function previewFailures(project){
 const result=checkDesign(project);
 const groups=new Map();
 for(const c of result.checks){
   if(c.status!=='Fail'||!c.segment)continue;
   if(!groups.has(c.segment))groups.set(c.segment,[]);
   groups.get(c.segment).push(c.message);
 }
 return {result,groups};
}
