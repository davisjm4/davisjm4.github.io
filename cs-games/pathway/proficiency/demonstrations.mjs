// Shared by class and independent pathways. A reviewer applies the standard's
// rubric to the work itself. These prompts never generate a score or award.
export const DEMONSTRATION_TYPES=Object.freeze({
  performance:'Performance task',
  project:'Project or portfolio',
  explanation:'Explanation or interview',
  assessment:'Objective assessment'
});

const examples={
  advanced:'Write, trace, or debug a solution. Test an edge case and explain why the result follows from your code.',
  csp:'Apply the concept in a new computing scenario. Support your decision with evidence and explain a trade-off or limitation.',
  robotics:'Use a build, program, or simulation to meet a new constraint. Measure the result and explain what you changed.',
  workplace:'Respond to a new workplace scenario. Explain your decision, then adapt it when a constraint or risk changes.'
};

export function demonstrationGuide(courseId){
  return {
    example:examples[courseId]??'Apply the skill in a new situation and explain how your work meets the learning objective.',
    approaching:'Show the main idea and use the skill correctly in a familiar situation.',
    meeting:'Apply the skill accurately and independently. Explain your reasoning and check the result against the standard.',
    exceeding:'Transfer the skill to an unfamiliar situation. Justify your choices with evidence and address an edge case, limitation, or trade-off.'
  };
}
