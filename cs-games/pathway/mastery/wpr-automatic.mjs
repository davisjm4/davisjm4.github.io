// Data only: which Workplace Readiness concepts earn automatic practice credit, and at which starting requirement tier.
/* Concepts whose reviewed question bank passes the activation rules in audit/wpr-mastery/coverage.mjs (at least 4 distinct reasoning units,
 * 3 of them high confidence, 2 question modes, no more than 10 required questions per unit, and no answer-length shortcut), with the requirement tier their questions
 * warrant. Only these concepts earn node credit and a starting requirement. Every other Workplace Readiness skill stays teacher-assessed.
 * The list is regenerated from the catalog; the coverage test fails when the two disagree. */
export const WPR_AUTOMATIC = Object.freeze({
 "big-picture-thinking:impacts-of-actions": "complex-reasoning",
 "career-and-life-management:benefits-and-resources": "complex-reasoning",
 "career-and-life-management:qualifications-and-advancement": "complex-reasoning",
 "career-and-life-management:wellness-and-finances": "complex-reasoning",
 "conflict-resolution:diplomatic-negotiation": "complex-reasoning",
 "conflict-resolution:when-to-escalate": "complex-reasoning",
 "continuous-learning-and-adaptability:acting-on-feedback": "complex-reasoning",
 "continuous-learning-and-adaptability:learning-resources": "complex-reasoning",
 "critical-thinking-and-problem-solving:analyze-problems": "complex-reasoning",
 "customer-service-orientation:courteous-knowledgeable": "complex-reasoning",
 "efficiency-and-productivity:prioritize-tasks": "complex-reasoning",
 "information-literacy:evaluate-credibility": "complex-reasoning",
 "information-security:cyber-threats": "complex-reasoning",
 "information-security:security-procedures": "complex-reasoning",
 "information-technology:cloud-and-file-sharing": "complex-reasoning",
 "information-technology:software-and-applications": "complex-reasoning",
 "information-technology:troubleshooting": "complex-reasoning",
 "initiative-and-self-direction:identify-needs": "complex-reasoning",
 "integrity:honesty-and-fairness": "complex-reasoning",
 "job-specific-tools-and-technologies:safe-use": "complex-reasoning",
 "listening-and-speaking:active-listening": "complex-reasoning",
 "listening-and-speaking:audience-and-setting": "complex-reasoning",
 "professionalism:etiquette": "standard-practice",
 "reading-and-writing:clarity": "complex-reasoning",
 "reading-and-writing:interpret-documents": "complex-reasoning",
 "respect-for-diversity:individual-differences": "complex-reasoning",
 "teamwork:expectations-roles-goals": "complex-reasoning",
 "teamwork:respect-contributions": "complex-reasoning",
 "teamwork:team-communication": "complex-reasoning",
 "workplace-safety:emergency-protocols": "complex-reasoning"
});
export const isAutomatic = (conceptId) => Object.hasOwn(WPR_AUTOMATIC, conceptId);

/* Concepts whose title names a performed or demonstrated behaviour (the coverage audit's judgment, pending educator confirmation).
 * Scenario questions can show knowledge of the expectation, not the behaviour, so these never become automatic. */
export const WPR_PERFORMANCE_ONLY = Object.freeze(['listening-and-speaking:presenting', 'listening-and-speaking:nonverbal-cues', 'professionalism:self-representation',
  'professionalism:appearance', 'professionalism:punctuality-attendance', 'work-ethic:diligence', 'work-ethic:dependability',
  'initiative-and-self-direction:minimal-supervision']);
