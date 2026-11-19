/* Workplace Readiness primary assessed concept attribution (version 1).
 *
 * A Workplace Readiness question usually carries two to four concept tags (composed questions carry every tag of their kit). The tags
 * support discovery, feedback and reporting. They are NOT mastery evidence: one correct answer demonstrates the one concept its reasoning
 * actually requires. This module records that single primary concept for each reasoning unit and verifies it on the server.
 *
 * Reasoning units (the grain at which the primary concept is decided):
 *   authored template  key "a:<templateId>"           e.g. a:CON-D-001
 *   composed rule      key "c:<kitId>/<rule>"          e.g. c:ise-suspicious-email/verify-sender
 * Units that appear in neither table earn NO node credit (practice, feedback and legacy class reports are unchanged). That includes
 * generic reasoning shared by many kits (hazard control, dependency ordering, defect finding, "proceed when satisfied") because those
 * assess safety, sequencing or error spotting rather than the kit's own concepts.
 *
 * Entry value: "<full concept id>|<confidence>"; H = the unit's reasoning is the concept's behaviour, M = reasonable but a second concept
 * of the same unit is defensible. Every entry was assigned by reading the unit's reasoning (template pattern, kit rule), never by tag order.
 * No educator has reviewed this table. The attribution tests assert each primary is one of the unit's own tags and that no other tag
 * is credited. Pure functions; no DOM, no storage, no network.
 */

export const ATTRIBUTION_VERSION = 1;
export const WPR_PRACTICE_ACTIVITY = "workplace-readiness";
export const WPR_COURSE = "workplace";

export const AUTHORED_PRIMARY = Object.freeze({
 "BIG-D-001": "big-picture-thinking:role-in-mission|H",
 "BIG-D-002": "big-picture-thinking:impacts-of-actions|H",
 "BIG-D-003": "big-picture-thinking:impacts-of-actions|M",
 "BIG-F-001": "big-picture-thinking:role-in-mission|H",
 "BIG-N-001": "big-picture-thinking:organization-structure|H",
 "BIG-O-001": "big-picture-thinking:impacts-of-actions|H",
 "CAR-D-001": "career-and-life-management:smart-goals|H",
 "CAR-D-002": "career-and-life-management:benefits-and-resources|H",
 "CAR-D-003": "career-and-life-management:qualifications-and-advancement|M",
 "CAR-F-001": "career-and-life-management:wellness-and-finances|M",
 "CAR-F-002": "career-and-life-management:benefits-and-resources|H",
 "CAR-N-001": "career-and-life-management:wellness-and-finances|H",
 "CAR-N-002": "career-and-life-management:qualifications-and-advancement|H",
 "CAR-O-001": "career-and-life-management:qualifications-and-advancement|H",
 "CAR-O-002": "career-and-life-management:qualifications-and-advancement|M",
 "CLA-D-001": "continuous-learning-and-adaptability:acting-on-feedback|H",
 "CLA-D-002": "continuous-learning-and-adaptability:changing-requirements|M",
 "CLA-F-001": "continuous-learning-and-adaptability:credentials|H",
 "CLA-N-001": "continuous-learning-and-adaptability:learning-resources|H",
 "CLA-O-001": "continuous-learning-and-adaptability:learning-resources|H",
 "CON-D-001": "conflict-resolution:diplomatic-negotiation|H",
 "CON-D-002": "conflict-resolution:work-style-differences|H",
 "CON-D-101": "conflict-resolution:diplomatic-negotiation|H",
 "CON-D-102": "conflict-resolution:when-to-escalate|H",
 "CON-D-103": "conflict-resolution:performance-concerns|H",
 "CON-D-104": "conflict-resolution:performance-concerns|H",
 "CON-D-105": "conflict-resolution:diplomatic-negotiation|H",
 "CON-F-001": "conflict-resolution:diplomatic-negotiation|H",
 "CON-N-001": "conflict-resolution:when-to-escalate|H",
 "CON-O-001": "conflict-resolution:diplomatic-negotiation|H",
 "CRE-D-001": "creativity-and-innovation:contribute-ideas|H",
 "CRE-D-002": "creativity-and-innovation:allocate-resources|H",
 "CRE-F-001": "creativity-and-innovation:value-of-creativity|H",
 "CRE-N-001": "creativity-and-innovation:improve-processes|H",
 "CRE-O-001": "creativity-and-innovation:improve-processes|H",
 "CTP-D-001": "critical-thinking-and-problem-solving:analyze-problems|H",
 "CTP-D-002": "critical-thinking-and-problem-solving:evaluate-solutions|H",
 "CTP-F-001": "critical-thinking-and-problem-solving:logical-decisions|H",
 "CTP-N-001": "critical-thinking-and-problem-solving:analyze-problems|H",
 "CUS-D-001": "customer-service-orientation:courteous-knowledgeable|H",
 "CUS-D-002": "customer-service-orientation:anticipate-needs|M",
 "CUS-D-003": "customer-service-orientation:courteous-knowledgeable|H",
 "CUS-F-001": "customer-service-orientation:courteous-knowledgeable|H",
 "CUS-N-001": "customer-service-orientation:internal-and-external|H",
 "CUS-N-002": "customer-service-orientation:courteous-knowledgeable|H",
 "CUS-O-001": "customer-service-orientation:courteous-knowledgeable|H",
 "DIV-D-001": "respect-for-diversity:own-bias|H",
 "DIV-D-002": "respect-for-diversity:valuing-differences|M",
 "DIV-D-003": "respect-for-diversity:collaborating|H",
 "DIV-F-001": "respect-for-diversity:individual-differences|H",
 "DIV-N-001": "respect-for-diversity:collaborating|M",
 "DIV-O-001": "respect-for-diversity:collaborating|M",
 "EFF-D-001": "efficiency-and-productivity:prioritize-tasks|M",
 "EFF-D-002": "efficiency-and-productivity:capital-resources|H",
 "EFF-D-003": "efficiency-and-productivity:natural-resources|H",
 "EFF-F-001": "efficiency-and-productivity:prioritize-tasks|H",
 "EFF-N-001": "efficiency-and-productivity:adapt-goals|H",
 "EFF-N-002": "efficiency-and-productivity:prioritize-tasks|H",
 "EFF-O-001": "efficiency-and-productivity:work-plan|M",
 "ILI-D-001": "information-literacy:evaluate-credibility|H",
 "ILI-D-002": "information-literacy:evaluate-credibility|M",
 "ILI-F-001": "information-literacy:evaluate-credibility|H",
 "ILI-N-001": "information-literacy:evaluate-credibility|H",
 "INI-D-001": "initiative-and-self-direction:identify-needs|H",
 "INI-D-002": "initiative-and-self-direction:apply-solutions|M",
 "INI-F-001": "initiative-and-self-direction:proactive-decisions|M",
 "INI-N-001": "initiative-and-self-direction:minimal-supervision|H",
 "INI-O-001": "initiative-and-self-direction:identify-needs|M",
 "INT-D-001": "integrity:honesty-and-fairness|H",
 "INT-D-002": "integrity:honesty-and-fairness|H",
 "INT-D-003": "integrity:honesty-and-fairness|H",
 "INT-F-001": "integrity:honesty-and-fairness|H",
 "INT-N-001": "integrity:honesty-and-fairness|M",
 "INT-O-001": "integrity:respect-for-property|H",
 "ISE-D-001": "information-security:acceptable-use|H",
 "ISE-D-002": "information-security:ethical-technology-use|M",
 "ISE-D-101": "information-security:security-procedures|H",
 "ISE-D-102": "information-security:security-procedures|H",
 "ISE-F-001": "information-security:cyber-threats|H",
 "ISE-F-002": "information-security:cyber-threats|H",
 "ISE-N-001": "information-security:confidentiality|M",
 "ISE-N-002": "information-security:security-procedures|H",
 "ISE-O-001": "information-security:security-procedures|M",
 "ITE-D-001": "information-technology:cloud-and-file-sharing|H",
 "ITE-D-002": "information-technology:software-and-applications|H",
 "ITE-D-003": "information-technology:emerging-technology|H",
 "ITE-D-101": "information-technology:software-and-applications|H",
 "ITE-D-102": "information-technology:software-and-applications|H",
 "ITE-D-103": "information-technology:software-and-applications|H",
 "ITE-D-104": "information-technology:software-and-applications|H",
 "ITE-D-105": "information-technology:software-and-applications|H",
 "ITE-D-106": "information-technology:software-and-applications|H",
 "ITE-D-107": "information-technology:cloud-and-file-sharing|H",
 "ITE-D-108": "information-technology:hardware-and-devices|H",
 "ITE-D-109": "information-technology:troubleshooting|H",
 "ITE-F-001": "information-technology:software-and-applications|M",
 "ITE-N-001": "information-technology:troubleshooting|H",
 "ITE-O-001": "information-technology:troubleshooting|H",
 "JST-D-001": "job-specific-tools-and-technologies:select-right-tool|H",
 "JST-D-002": "job-specific-tools-and-technologies:safe-use|M",
 "JST-D-003": "job-specific-tools-and-technologies:safe-use|M",
 "JST-F-001": "job-specific-tools-and-technologies:safe-use|H",
 "JST-N-001": "job-specific-tools-and-technologies:safe-use|H",
 "JST-O-001": "job-specific-tools-and-technologies:safe-use|H",
 "LIS-D-001": "listening-and-speaking:active-listening|H",
 "LIS-D-002": "listening-and-speaking:audience-and-setting|H",
 "LIS-D-003": "listening-and-speaking:presenting|M",
 "LIS-F-001": "listening-and-speaking:audience-and-setting|H",
 "LIS-N-001": "listening-and-speaking:nonverbal-cues|H",
 "LIS-O-001": "listening-and-speaking:presenting|H",
 "MAT-D-001": "mathematics:personal-finance|M",
 "MAT-D-002": "mathematics:job-task-math|M",
 "MAT-D-003": "mathematics:basic-calculations|M",
 "MAT-D-004": "mathematics:job-task-math|M",
 "MAT-N-001": "mathematics:personal-finance|M",
 "MAT-O-001": "mathematics:job-task-math|H",
 "PRO-D-001": "professionalism:appearance|H",
 "PRO-D-002": "professionalism:etiquette|H",
 "PRO-D-003": "professionalism:self-representation|M",
 "PRO-D-101": "professionalism:appearance|H",
 "PRO-D-102": "professionalism:appearance|H",
 "PRO-D-103": "professionalism:appearance|H",
 "PRO-D-104": "professionalism:self-representation|H",
 "PRO-D-105": "professionalism:self-representation|H",
 "PRO-F-001": "professionalism:etiquette|H",
 "PRO-N-001": "professionalism:punctuality-attendance|H",
 "PRO-O-001": "professionalism:self-representation|H",
 "RAW-D-001": "reading-and-writing:interpret-documents|H",
 "RAW-D-002": "reading-and-writing:tone-and-audience|H",
 "RAW-D-003": "reading-and-writing:interpret-documents|H",
 "RAW-D-101": "reading-and-writing:conventions|H",
 "RAW-F-001": "reading-and-writing:clarity|H",
 "RAW-F-002": "reading-and-writing:clarity|H",
 "RAW-N-001": "reading-and-writing:interpret-documents|H",
 "RAW-N-002": "reading-and-writing:interpret-documents|H",
 "RAW-O-001": "reading-and-writing:conventions|M",
 "RAW-O-002": "reading-and-writing:interpret-documents|M",
 "SAF-D-001": "workplace-safety:safety-guidelines|H",
 "SAF-D-002": "workplace-safety:ppe|H",
 "SAF-D-003": "workplace-safety:safety-data-sheets|H",
 "SAF-D-004": "workplace-safety:universal-precautions|H",
 "SAF-D-101": "workplace-safety:ppe|H",
 "SAF-D-102": "workplace-safety:ppe|H",
 "SAF-D-103": "workplace-safety:ppe|H",
 "SAF-D-104": "workplace-safety:identify-hazards|H",
 "SAF-D-105": "workplace-safety:ppe|H",
 "SAF-F-001": "workplace-safety:identify-hazards|H",
 "SAF-N-001": "workplace-safety:emergency-protocols|H",
 "SAF-N-002": "workplace-safety:identify-hazards|H",
 "SAF-O-001": "workplace-safety:identify-hazards|H",
 "SAF-O-002": "workplace-safety:emergency-protocols|H",
 "TEA-D-001": "teamwork:share-responsibility|H",
 "TEA-D-002": "teamwork:respect-contributions|H",
 "TEA-F-001": "teamwork:expectations-roles-goals|H",
 "TEA-N-001": "teamwork:team-communication|H",
 "TEA-O-001": "teamwork:expectations-roles-goals|H",
 "WET-D-001": "work-ethic:dependability|H",
 "WET-D-002": "work-ethic:accountability|H",
 "WET-F-001": "work-ethic:accountability|M",
 "WET-N-001": "work-ethic:dependability|M",
 "WET-O-001": "work-ethic:diligence|H"
});

/* Authored multi-tag templates whose reasoning spans their tags equally (whole-process ordering, mixed arithmetic). No node credit. */
export const AUTHORED_AMBIGUOUS = Object.freeze([
 "CTP-O-001",
 "ILI-O-001",
 "MAT-F-001",
 "MAT-F-002",
 "MAT-N-002",
 "MAT-O-002"
]);

export const COMPOSED_PRIMARY = Object.freeze({
 "big-change-request": {
  "flag-wider-impact": "big-picture-thinking:impacts-of-actions|H",
  "route-to-decision-maker": "big-picture-thinking:organization-structure|H"
 },
 "big-closing-impacts": {
  "flag-wider-impact": "big-picture-thinking:impacts-of-actions|H",
  "honor-community-commitment": "big-picture-thinking:community-and-industry|H",
  "reduce-waste": "big-picture-thinking:impacts-of-actions|M"
 },
 "big-supplier-switch": {
  "full-cost": "big-picture-thinking:impacts-of-actions|H",
  "weigh-community": "big-picture-thinking:community-and-industry|H"
 },
 "car-next-step": {
  "plan-for-qualification": "career-and-life-management:qualifications-and-advancement|H",
  "protect-wellness": "career-and-life-management:wellness-and-finances|H",
  "seek-feedback": "career-and-life-management:qualifications-and-advancement|M",
  "set-smart-goal": "career-and-life-management:smart-goals|H",
  "use-available-resources": "career-and-life-management:benefits-and-resources|H"
 },
 "car-paycheck": {
  "avoid-high-cost-credit": "career-and-life-management:wellness-and-finances|H",
  "meet-benefit-deadline": "career-and-life-management:benefits-and-resources|H",
  "plan-finances": "career-and-life-management:wellness-and-finances|H",
  "protect-wellness": "career-and-life-management:wellness-and-finances|M",
  "understand-pay": "career-and-life-management:wellness-and-finances|M"
 },
 "cla-new-system": {
  "act-on-feedback": "continuous-learning-and-adaptability:acting-on-feedback|H",
  "meet-new-requirement": "continuous-learning-and-adaptability:changing-requirements|H",
  "model-adaptability": "continuous-learning-and-adaptability:changing-requirements|M",
  "plan-for-change-deadline": "continuous-learning-and-adaptability:changing-requirements|H",
  "use-learning-resources": "continuous-learning-and-adaptability:learning-resources|H"
 },
 "cla-review-feedback": {
  "act-on-feedback": "continuous-learning-and-adaptability:acting-on-feedback|H",
  "check-progress": "continuous-learning-and-adaptability:acting-on-feedback|M",
  "close-skill-gap": "continuous-learning-and-adaptability:learning-resources|M",
  "maintain-credential": "continuous-learning-and-adaptability:credentials|H",
  "understand-feedback": "continuous-learning-and-adaptability:acting-on-feedback|H"
 },
 "con-performance-concern": {
  "adapt-to-person": "conflict-resolution:personality-and-culture|H",
  "check-facts-first": "conflict-resolution:performance-concerns|M",
  "escalate-after-trying": "conflict-resolution:when-to-escalate|H",
  "talk-directly-first": "conflict-resolution:performance-concerns|M"
 },
 "con-shared-task-dispute": {
  "blend-work-styles": "conflict-resolution:work-style-differences|H",
  "escalate-aggression": "conflict-resolution:when-to-escalate|H",
  "escalate-recurring-conflict": "conflict-resolution:when-to-escalate|H",
  "move-conflict-private": "conflict-resolution:diplomatic-negotiation|M",
  "seek-to-understand": "conflict-resolution:diplomatic-negotiation|H"
 },
 "cre-process-idea": {
  "gather-missing-information": "creativity-and-innovation:improve-processes|M",
  "seek-approval-with-case": "creativity-and-innovation:improve-processes|M"
 },
 "cre-team-brainstorm": {
  "compare-alternatives": "creativity-and-innovation:contribute-ideas|M",
  "give-credit": "creativity-and-innovation:value-of-creativity|M",
  "include-every-voice": "creativity-and-innovation:contribute-ideas|M",
  "work-within-constraints": "creativity-and-innovation:allocate-resources|H"
 },
 "ctp-deadline-obstacles": {
  "approved-alternative": "critical-thinking-and-problem-solving:logical-decisions|M",
  "clarify-priorities": "critical-thinking-and-problem-solving:logical-decisions|M",
  "obtain-missing-information": "critical-thinking-and-problem-solving:analyze-problems|M",
  "stop-wrong-work": "critical-thinking-and-problem-solving:logical-decisions|M"
 },
 "ctp-recurring-errors": {
  "address-cause-not-symptom": "critical-thinking-and-problem-solving:analyze-problems|H",
  "evaluate-previous-solution": "critical-thinking-and-problem-solving:evaluate-solutions|H",
  "evidence-before-blame": "critical-thinking-and-problem-solving:analyze-problems|H",
  "follow-the-evidence": "critical-thinking-and-problem-solving:analyze-problems|M",
  "gather-evidence": "critical-thinking-and-problem-solving:analyze-problems|H"
 },
 "cus-callback": {
  "communicate-delay-early": "customer-service-orientation:prioritize-service|M",
  "follow-up-on-fix": "customer-service-orientation:prioritize-service|M",
  "route-to-right-team": "customer-service-orientation:internal-and-external|M",
  "serve-internal-customer": "customer-service-orientation:internal-and-external|H"
 },
 "cus-counter-request": {
  "acknowledge-feelings": "customer-service-orientation:courteous-knowledgeable|H",
  "anticipate-needs": "customer-service-orientation:anticipate-needs|H",
  "find-accurate-answer": "customer-service-orientation:courteous-knowledgeable|H",
  "stay-within-authority": "customer-service-orientation:courteous-knowledgeable|M"
 },
 "div-serving-everyone": {
  "adapt-communication": "respect-for-diversity:individual-differences|M",
  "address-disrespect": "respect-for-diversity:valuing-differences|M",
  "ask-dont-assume": "respect-for-diversity:own-bias|H",
  "remove-barrier": "respect-for-diversity:individual-differences|H",
  "show-courtesy": "respect-for-diversity:valuing-differences|M"
 },
 "div-team-project": {
  "address-disrespect": "respect-for-diversity:collaborating|M",
  "ask-dont-assume": "respect-for-diversity:own-bias|H",
  "check-schedule-with-team": "respect-for-diversity:individual-differences|M",
  "invite-contribution": "respect-for-diversity:collaborating|H",
  "remove-barrier": "respect-for-diversity:individual-differences|H"
 },
 "eff-morning-plan": {
  "break-down-large-task": "efficiency-and-productivity:work-plan|H",
  "group-similar-tasks": "efficiency-and-productivity:work-plan|M",
  "prioritize-deadline": "efficiency-and-productivity:prioritize-tasks|H",
  "protect-focus-time": "efficiency-and-productivity:work-plan|M",
  "reorder-around-blocker": "efficiency-and-productivity:adapt-goals|H"
 },
 "eff-resources": {
  "maintain-equipment": "efficiency-and-productivity:capital-resources|H",
  "match-tasks-to-people": "efficiency-and-productivity:human-resources|H",
  "reduce-waste": "efficiency-and-productivity:natural-resources|M",
  "use-idle-time": "efficiency-and-productivity:human-resources|M"
 },
 "ili-finding-answer": {
  "check-currency": "information-literacy:evaluate-credibility|H",
  "check-source-bias": "information-literacy:evaluate-credibility|H",
  "judge-relevance": "information-literacy:judge-relevance|H",
  "verify-unsourced-claim": "information-literacy:evaluate-credibility|H"
 },
 "ili-report-data": {
  "credit-source": "information-literacy:use-information|M",
  "investigate-gaps": "information-literacy:use-information|M",
  "report-what-data-shows": "information-literacy:use-information|H",
  "verify-data-source": "information-literacy:evaluate-credibility|H"
 },
 "ili-service-schedule": {
  "check-currency": "information-literacy:evaluate-credibility|H",
  "credit-source": "information-literacy:use-information|M",
  "judge-relevance": "information-literacy:judge-relevance|H",
  "seek-authoritative-source": "information-literacy:locate-sources|H",
  "verify-against-source": "information-literacy:evaluate-credibility|H"
 },
 "ini-finished-early": {
  "correct-own-error": "initiative-and-self-direction:proactive-decisions|M",
  "find-needed-work": "initiative-and-self-direction:identify-needs|H",
  "help-where-needed": "initiative-and-self-direction:identify-needs|H",
  "stay-within-authority": "initiative-and-self-direction:proactive-decisions|M"
 },
 "ini-new-task-solo": {
  "apply-known-solution": "initiative-and-self-direction:apply-solutions|H",
  "ask-for-help-after-trying": "initiative-and-self-direction:apply-solutions|H",
  "communicate-delay-early": "initiative-and-self-direction:minimal-supervision|M",
  "keep-supervisor-informed": "initiative-and-self-direction:minimal-supervision|H",
  "stop-and-ask-on-risk": "initiative-and-self-direction:minimal-supervision|M"
 },
 "int-closing-count": {
  "disclose-own-role": "integrity:honesty-and-fairness|M",
  "follow-procedure-check": "integrity:policies-and-procedures|H",
  "refuse-to-falsify": "integrity:honesty-and-fairness|H",
  "report-to-designated-person": "integrity:policies-and-procedures|M"
 },
 "int-everyday-requests": {
  "follow-stated-policy": "integrity:policies-and-procedures|H",
  "keep-accurate-records": "integrity:honesty-and-fairness|M",
  "respect-property": "integrity:respect-for-property|H",
  "use-records-for-work-only": "integrity:policies-and-procedures|M"
 },
 "int-shared-report": {
  "correct-own-error": "integrity:honesty-and-fairness|H",
  "credit-sources": "integrity:respect-for-property|M",
  "disclose-limits": "integrity:honesty-and-fairness|H",
  "give-credit": "integrity:respect-for-property|M",
  "refuse-to-falsify": "integrity:honesty-and-fairness|H"
 },
 "ise-data-request": {
  "keep-records": "information-security:security-procedures|M",
  "minimum-necessary": "information-security:confidentiality|H",
  "route-to-decision-maker": "information-security:confidentiality|M",
  "use-approved-channel": "information-security:security-procedures|M",
  "verify-identity": "information-security:security-procedures|H"
 },
 "ise-suspicious-email": {
  "avoid-unexpected-attachment": "information-security:cyber-threats|H",
  "contain-threat": "information-security:security-procedures|H",
  "protect-credentials": "information-security:cyber-threats|H",
  "verify-sender": "information-security:cyber-threats|H"
 },
 "ise-workstation": {
  "avoid-unknown-device": "information-security:security-procedures|M",
  "follow-acceptable-use": "information-security:acceptable-use|H",
  "protect-confidential-data": "information-security:confidentiality|H",
  "protect-credentials": "information-security:security-procedures|M",
  "report-security-mistake": "information-security:security-procedures|H"
 },
 "ite-printer-trouble": {
  "check-simple-causes": "information-technology:troubleshooting|H",
  "escalate-with-details": "information-technology:troubleshooting|H",
  "narrow-down-cause": "information-technology:troubleshooting|H",
  "read-the-error": "information-technology:troubleshooting|H"
 },
 "ite-sharing-file": {
  "choose-right-tool": "information-technology:software-and-applications|H",
  "confirm-correct-version": "information-technology:cloud-and-file-sharing|M",
  "limit-access": "information-technology:cloud-and-file-sharing|H",
  "maintain-software": "information-technology:software-and-applications|H",
  "protect-confidential-data": "information-technology:cloud-and-file-sharing|M"
 },
 "jst-equipment-use": {
  "care-for-equipment": "job-specific-tools-and-technologies:safe-use|M",
  "control-hazard-first": "job-specific-tools-and-technologies:safe-use|M",
  "read-instructions": "job-specific-tools-and-technologies:safe-use|M",
  "use-right-tool": "job-specific-tools-and-technologies:select-right-tool|H",
  "wear-required-gear": "job-specific-tools-and-technologies:safe-use|H"
 },
 "jst-pick-the-tool": {
  "use-right-tool": "job-specific-tools-and-technologies:select-right-tool|H"
 },
 "lis-group-update": {
  "fit-the-setting": "listening-and-speaking:audience-and-setting|H",
  "fit-the-time": "listening-and-speaking:presenting|H",
  "match-audience": "listening-and-speaking:audience-and-setting|H",
  "simplify-visuals": "listening-and-speaking:presenting|H",
  "verify-before-presenting": "listening-and-speaking:presenting|M"
 },
 "lis-spoken-instructions": {
  "confirm-missed-detail": "listening-and-speaking:active-listening|H",
  "confirm-safety-information": "listening-and-speaking:active-listening|H",
  "request-recap": "listening-and-speaking:active-listening|H",
  "respond-to-nonverbal-cue": "listening-and-speaking:nonverbal-cues|H",
  "summarize-back": "listening-and-speaking:active-listening|H"
 },
 "mat-check-calcs": {
  "find-calculation-error": "mathematics:basic-calculations|M"
 },
 "mat-decisions": {
  "personal-finance": "mathematics:personal-finance|H"
 },
 "pro-client-meeting": {
  "communicate-delay-early": "professionalism:punctuality-attendance|H",
  "follow-dress-code": "professionalism:appearance|H",
  "give-full-attention": "professionalism:etiquette|M",
  "prepare-in-advance": "professionalism:self-representation|M",
  "show-courtesy": "professionalism:etiquette|H"
 },
 "pro-office-etiquette": {
  "avoid-gossip": "professionalism:etiquette|M",
  "communicate-professionally": "professionalism:etiquette|M",
  "follow-dress-code": "professionalism:self-representation|M",
  "represent-workplace-well": "professionalism:self-representation|H",
  "respect-others-time": "professionalism:etiquette|H",
  "respect-shared-space": "professionalism:etiquette|H",
  "show-courtesy": "professionalism:etiquette|H"
 },
 "raw-delay-email": {
  "adjust-tone": "reading-and-writing:tone-and-audience|H",
  "organize-for-reader": "reading-and-writing:clarity|H",
  "proofread": "reading-and-writing:conventions|H",
  "verify-before-writing": "reading-and-writing:clarity|M",
  "write-for-audience": "reading-and-writing:tone-and-audience|H"
 },
 "raw-reading-procedure": {
  "check-document-currency": "reading-and-writing:interpret-documents|H",
  "clarify-unknown-term": "reading-and-writing:interpret-documents|H",
  "read-warnings-fully": "reading-and-writing:interpret-documents|H",
  "resolve-conflicting-documents": "reading-and-writing:interpret-documents|H"
 },
 "saf-chemical-task": {
  "emergency-response": "workplace-safety:emergency-protocols|H",
  "identify-before-use": "workplace-safety:safety-data-sheets|H",
  "read-safety-information": "workplace-safety:safety-data-sheets|H",
  "report-after": "workplace-safety:emergency-protocols|M",
  "wear-required-gear": "workplace-safety:ppe|H"
 },
 "saf-powered-equipment": {
  "control-hazard-first": "workplace-safety:identify-hazards|H",
  "coordinate-shared-resource": "workplace-safety:safety-guidelines|M",
  "meet-stated-requirement": "workplace-safety:safety-guidelines|H",
  "verify-before-acting": "workplace-safety:safety-guidelines|M"
 },
 "tea-short-staffed": {
  "channel-frustration": "teamwork:team-communication|M",
  "get-status-first": "teamwork:team-communication|H",
  "recognize-contribution": "teamwork:respect-contributions|H",
  "take-ownership": "teamwork:share-responsibility|H"
 },
 "tea-team-project": {
  "agree-roles": "teamwork:expectations-roles-goals|H",
  "clarify-goal": "teamwork:expectations-roles-goals|H",
  "communicate-overlap": "teamwork:team-communication|H",
  "recognize-contribution": "teamwork:respect-contributions|H",
  "support-teammate": "teamwork:respect-contributions|M"
 },
 "wet-quality-under-pressure": {
  "clarify-standard": "work-ethic:diligence|M",
  "communicate-delay-early": "work-ethic:accountability|M",
  "keep-required-step": "work-ethic:diligence|H",
  "manage-own-focus": "work-ethic:diligence|H",
  "stop-wrong-work": "work-ethic:diligence|M"
 },
 "wet-shift-commitments": {
  "accept-consequence": "work-ethic:accepting-consequences|H",
  "communicate-delay-early": "work-ethic:dependability|H",
  "follow-call-out-policy": "work-ethic:dependability|H",
  "own-mistake": "work-ethic:accountability|H",
  "renew-missed-commitment": "work-ethic:dependability|M"
 }
});


const split = (entry) => { const [conceptId, confidence] = entry.split("|"); return { conceptId, confidence }; };

/* Key of the reasoning unit a displayed question belongs to, or null when it cannot be identified. */
export function attributionKey(question) {
  if (!question || typeof question !== "object") return null;
  const cx = question.cx;
  if (cx && typeof cx === "object") return typeof cx.kit === "string" && typeof cx.rule === "string" ? `c:${cx.kit}/${cx.rule}` : null;
  return typeof question.templateId === "string" ? `a:${question.templateId}` : null;
}

/* Entry for a key, or null. Unknown, ambiguous and generic units all return null. */
export function primaryForKey(key) {
  if (typeof key !== "string") return null;
  if (key.startsWith("a:")) {
    const entry = Object.hasOwn(AUTHORED_PRIMARY, key.slice(2)) ? AUTHORED_PRIMARY[key.slice(2)] : null;
    return entry ? split(entry) : null;
  }
  if (key.startsWith("c:")) {
    const slash = key.indexOf("/");
    if (slash < 0) return null;
    const kit = key.slice(2, slash), rule = key.slice(slash + 1);
    const rules = Object.hasOwn(COMPOSED_PRIMARY, kit) ? COMPOSED_PRIMARY[kit] : null;
    const entry = rules && Object.hasOwn(rules, rule) ? rules[rule] : null;
    return entry ? split(entry) : null;
  }
  return null;
}

/* The reviewed primary concept of a displayed question whether or not its node is enabled: {key, conceptId, confidence} or null.
 * The primary must be one of the question's own concept tags; a table entry that disagrees with the tags is refused. */
export function reviewedPrimary(question) {
  const key = attributionKey(question);
  const entry = primaryForKey(key);
  if (!entry) return null;
  if (Array.isArray(question.concepts) && !question.concepts.includes(entry.conceptId)) return null;
  return { key, conceptId: entry.conceptId, confidence: entry.confidence };
}
