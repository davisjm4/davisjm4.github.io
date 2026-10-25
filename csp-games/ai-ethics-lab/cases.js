// 100 authored families. Keys and distractors reviewed against explicit scenario scope.
export const CASES=[
  {
    "id": "past-selection",
    "mode": "issue",
    "topic": "fairness",
    "concept": "history",
    "domain": "hiring",
    "scene": "A hiring model learns who was previously promoted. The earlier process favored access to informal mentors rather than the stated job qualifications.",
    "prompt": "Which concern is directly supported by the training source?",
    "answer": "Prior selection practices may be reproduced in recommendations.",
    "wrong": [
      "Personal records may be used for an unrelated profiling purpose without review.",
      "Affected applicants lack a usable route to contest an individual outcome.",
      "The required interface excludes people using a supported assistive input method."
    ],
    "why": "The historical target can encode unequal opportunities rather than the qualification the company intends to assess.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about how earlier selection labels were produced.",
    "extraWrong": "The problem may be a missing representative test rather than the historical target the model was trained to reproduce."
  },
  {
    "id": "camera-measure",
    "mode": "issue",
    "topic": "fairness",
    "concept": "measurement",
    "domain": "face",
    "scene": "An entry system treats a poor-quality image as evidence of suspicious behavior. Camera quality differs between entrances serving otherwise comparable visitors.",
    "prompt": "Which concern most directly follows from this proxy?",
    "answer": "Image quality is being confused with the intended behavior.",
    "wrong": [
      "The recording process may retain identifiable images longer than the stated task needs.",
      "The service does not provide an understandable reason for an individual outcome.",
      "The operator and vendor have not assigned an owner for resolving reported harms."
    ],
    "why": "A camera-dependent proxy is not the same as suspicious behavior; measurement conditions can produce unequal treatment.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about what the proxy actually measures.",
    "extraWrong": "The problem may be insufficient notice about automated entry checks rather than what the suspicion proxy measures."
  },
  {
    "id": "accent-collection",
    "mode": "issue",
    "topic": "fairness",
    "concept": "representation",
    "domain": "speech",
    "scene": "A speech system was trained using a narrow recruitment process and is offered to a much wider population without a relevant evaluation.",
    "prompt": "Which concern is supported before claiming performance for everyone?",
    "answer": "The collected examples may not represent intended users.",
    "wrong": [
      "The target labels may carry unequal judgments from an earlier human decision process.",
      "Users do not have a separate choice about optional future uses of recordings.",
      "The service’s essential controls exclude people using a supported access method."
    ],
    "why": "The collection process leaves uncertainty about performance for people and conditions not represented.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the population covered by collection.",
    "extraWrong": "The observed gap may primarily concern an unusable appeal route rather than evidence about the intended user population."
  },
  {
    "id": "matched-errors",
    "mode": "issue",
    "topic": "fairness",
    "concept": "errors",
    "domain": "healthcare",
    "scene": "A fictional image-assistance pilot is audited on comparable cases. Reviewers confirm that one intended group experiences more costly false alarms.",
    "prompt": "Which concern does this controlled audit directly support?",
    "answer": "The system distributes relevant errors unevenly across groups.",
    "wrong": [
      "The labels may be based on an invalid proxy for the intended clinical quality.",
      "The service does not state who can remedy a reported incident or disputed output.",
      "The pilot lacks a practical route for correcting an individual source record."
    ],
    "why": "The observed disparity is in a specified error type on comparable cases, not just a difference in totals.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the distribution of a relevant error.",
    "extraWrong": "The relevant error disparity may primarily be a failure to provide a separate optional data-use choice to patients."
  },
  {
    "id": "notice-not-choice",
    "mode": "issue",
    "topic": "privacy",
    "concept": "consent",
    "domain": "education",
    "scene": "A tutor collects optional recordings for model development. Enrollment provides a collection notice but no usable way to decline that optional use.",
    "prompt": "What is the specific gap in the enrollment process?",
    "answer": "Disclosure has not provided a meaningful choice about optional use.",
    "wrong": [
      "The stored recordings may be accessible through an overly broad service credential.",
      "Raw recording detail is retained longer than the operational tutoring task needs.",
      "The team lacks a representative evaluation of differences in recognition performance."
    ],
    "why": "Being told about collection differs from choosing a separate optional development purpose.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about whether optional use can be declined.",
    "extraWrong": "The enrollment problem may primarily concern the accuracy of learning recommendations rather than the optional-use decision."
  },
  {
    "id": "unneeded-fields",
    "mode": "issue",
    "topic": "privacy",
    "concept": "minimization",
    "domain": "advertising",
    "scene": "A campaign tool needs daily totals to choose ad placements. It also retains identifiable raw events that have no documented role in that task.",
    "prompt": "Which concern follows from the stated operational need?",
    "answer": "Collection and retention exceed what the task requires.",
    "wrong": [
      "The task uses an invalid target label that measures a different quality than intended.",
      "The service has no accessible route for a user to correct a mistaken event record.",
      "The organization has not named who must answer for and remedy reported failures."
    ],
    "why": "Daily totals can meet the stated task without retaining the extra identifiable detail.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the amount of data the stated task needs.",
    "extraWrong": "The unnecessary fields may primarily be a model-explanation problem rather than the extent of retained personal data."
  },
  {
    "id": "new-use",
    "mode": "issue",
    "topic": "privacy",
    "concept": "privacy",
    "domain": "public",
    "scene": "A public-service assistant keeps appointment data securely. The operator proposes using those records for unrelated behavior profiling without revisiting the original purpose.",
    "prompt": "Which concern is most directly raised by the proposed change?",
    "answer": "Protected data may be used beyond their agreed service purpose.",
    "wrong": [
      "The encryption design may allow outsiders to retrieve data beyond their approved access.",
      "The service’s interface lacks a workable route for people using assistive controls.",
      "A general feature list does not let users understand a particular profiling result."
    ],
    "why": "Access protection does not decide whether an unrelated secondary use respects the original purpose.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the purpose of a new data use.",
    "extraWrong": "The secondary profiling decision may primarily concern how clearly each model score is explained rather than purpose limits."
  },
  {
    "id": "broad-tool-key",
    "mode": "issue",
    "topic": "privacy",
    "concept": "security",
    "domain": "security",
    "scene": "An AI support tool is allowed to retrieve a few approved records, but its service credential can access the whole confidential archive.",
    "prompt": "Which concern does this mismatch directly establish?",
    "answer": "The tool has excessive access beyond its authorized task.",
    "wrong": [
      "The training process may omit intended users or deployment conditions from its sample.",
      "The system gives no understandable reason for a particular retrieval recommendation.",
      "People cannot decline an unrelated optional reuse of their previously collected records."
    ],
    "why": "An overly broad credential expands the consequences of misuse or error beyond the approved retrieval boundary.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the scope of authorized access.",
    "extraWrong": "The excessive credential may primarily concern the lack of a subgroup accuracy comparison rather than its access boundary."
  },
  {
    "id": "generic-reason",
    "mode": "issue",
    "topic": "accountability",
    "concept": "explanation",
    "domain": "banking",
    "scene": "A fictional lending pilot states that automation is used and offers an appeal. Its only reason for an individual result is a general list of model features.",
    "prompt": "Which remaining concern is the question’s evidence about?",
    "answer": "The person lacks an understandable reason tied to this case.",
    "wrong": [
      "People have not been told where automation enters the lending decision process.",
      "A disputed applicant record cannot be corrected through an available review channel.",
      "The model’s training labels reflect an earlier pattern of unequal selection opportunities."
    ],
    "why": "A feature inventory does not explain which information affected a particular result.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about an understandable reason for this individual case.",
    "extraWrong": "The generic reason may primarily concern who owns incident response rather than the person’s ability to understand this case."
  },
  {
    "id": "hidden-assistant",
    "mode": "issue",
    "topic": "accountability",
    "concept": "transparency",
    "domain": "service",
    "scene": "A company presents an automated chat assistant as a human representative and omits relevant limitations at the point where customers rely on it.",
    "prompt": "Which concern is directly supported by that presentation?",
    "answer": "Customers cannot see relevant facts about the automated interaction.",
    "wrong": [
      "The assistant’s factual claim disagrees with an available authoritative source record.",
      "The tool can retrieve confidential records outside the approved support task boundary.",
      "People affected by a triage result cannot submit corrections for individual review."
    ],
    "why": "People need relevant information about the interaction and its limits to decide how to use it.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about what customers are told about the interaction.",
    "extraWrong": "The misleading presentation may primarily concern reordering an appeal queue rather than information at the point of use."
  },
  {
    "id": "owner-handoff",
    "mode": "issue",
    "topic": "accountability",
    "concept": "accountability",
    "domain": "workplace",
    "scene": "An automated scheduling error harms workers. The operator and vendor each say the other must investigate and arrange a remedy.",
    "prompt": "Which governance gap is most directly described?",
    "answer": "No accountable owner is resolving the reported harm.",
    "wrong": [
      "The scheduling measurement uses a proxy unrelated to the stated allocation goal.",
      "The team has not evaluated how scheduling errors differ between comparable groups.",
      "Workers lack an understandable reason connected to a particular scheduling result."
    ],
    "why": "Unresolved ownership obstructs investigation and remedy even if individual teams have assigned technical tasks.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about who has authority to investigate and remedy harm.",
    "extraWrong": "The complaint handoff may primarily concern the model’s accuracy across groups rather than who can arrange a remedy."
  },
  {
    "id": "rubber-stamp",
    "mode": "issue",
    "topic": "accountability",
    "concept": "oversight",
    "domain": "transport",
    "scene": "A routing assistant’s recommendations are labeled human-reviewed, but reviewers cannot inspect relevant records or stop an affected dispatch.",
    "prompt": "Which concern is supported by those review conditions?",
    "answer": "The human-review role lacks the capacity to intervene meaningfully.",
    "wrong": [
      "The training data omit an intended operating condition from the route evaluation.",
      "People cannot find a way to contest or correct their particular dispatch assignment.",
      "The operator has not given affected people notice of the automated routing use."
    ],
    "why": "A person in the workflow is not sufficient when evidence and intervention authority are missing.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about reviewers’ ability to intervene.",
    "extraWrong": "The limited sign-off may primarily concern extra personal-data retention rather than reviewers’ ability to intervene."
  },
  {
    "id": "required-control",
    "mode": "issue",
    "topic": "impacts",
    "concept": "accessibility",
    "domain": "accessibility",
    "scene": "An assistive service advertises broad availability but requires an interaction that some intended users cannot operate.",
    "prompt": "Which concern is directly established by the required step?",
    "answer": "The service places an access barrier in its essential workflow.",
    "wrong": [
      "The training sample may exclude a group needed to evaluate model performance.",
      "The operator has no owner who must investigate and remedy an incident.",
      "A model-wide feature list fails to explain a particular service recommendation."
    ],
    "why": "People cannot receive the promised service if an essential interaction is inaccessible to them.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about a required interaction barrier.",
    "extraWrong": "The required interaction may primarily concern permission for asset reuse rather than whether intended users can operate it."
  },
  {
    "id": "task-not-job",
    "mode": "issue",
    "topic": "impacts",
    "concept": "employment",
    "domain": "creative",
    "scene": "A studio’s AI tool speeds one production task. Management describes that task-time result as proof that every affected worker will benefit.",
    "prompt": "Which gap does the claim overlook?",
    "answer": "Task efficiency does not establish how whole jobs are affected.",
    "wrong": [
      "The production pilot may omit resource costs outside the individual generation request.",
      "The team has not verified permission for distributing the generated production assets.",
      "Workers do not receive a clear explanation of an individual automated job decision."
    ],
    "why": "Job effects include workload, skills, transitions and distribution of gains, not just one task’s duration.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about evidence about the whole job.",
    "extraWrong": "The task-time claim may primarily concern model-input confidentiality rather than changes to whole jobs and transitions."
  },
  {
    "id": "resource-boundary",
    "mode": "issue",
    "topic": "impacts",
    "concept": "environment",
    "domain": "environment",
    "scene": "A monitoring project reports the benefit of an AI forecast but omits resource costs outside each individual prediction.",
    "prompt": "Which concern does the assessment boundary raise?",
    "answer": "The reported benefit lacks a complete resource-cost comparison.",
    "wrong": [
      "The monitoring evaluation may exclude important conditions from its accuracy test.",
      "The model’s target labels record an unrelated proxy for the conservation goal.",
      "People affected by the monitoring action lack a usable way to contest it."
    ],
    "why": "The balance depends on measured total costs and benefits over the relevant lifecycle.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the boundary of resource accounting.",
    "extraWrong": "The assessment boundary may primarily concern individual explanation quality rather than total environmental effects."
  },
  {
    "id": "engagement-proxy",
    "mode": "issue",
    "topic": "impacts",
    "concept": "unintended",
    "domain": "social",
    "scene": "A feed optimizer raises time spent in the app, while a pilot records users delaying tasks they wanted to finish. Time spent was only a proxy for the original service goal.",
    "prompt": "Which concern is supported by those observations?",
    "answer": "Improving the proxy can produce effects outside the intended goal.",
    "wrong": [
      "The pilot may omit a relevant group from its training and evaluation sample.",
      "The service fails to explain an individual ranking in terms of information it used.",
      "The operator has not verified permission for a new secondary use of personal records."
    ],
    "why": "The proxy and the real goal need separate evaluation; their measured directions can diverge.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the mismatch between a proxy and the intended goal.",
    "extraWrong": "The engagement result may primarily concern a lack of notice rather than whether the proxy matches the intended task."
  },
  {
    "id": "one-side-metric",
    "mode": "issue",
    "topic": "decisions",
    "concept": "stakeholders",
    "domain": "recommendations",
    "scene": "A recommendation pilot reports more purchases for sellers but does not measure burdens on the people receiving recommendations.",
    "prompt": "Which limitation is most directly present in its success claim?",
    "answer": "The evaluation omits a stakeholder group bearing possible costs.",
    "wrong": [
      "The ranking target may reproduce earlier unequal labels used for model development.",
      "Recipients do not have a practical way to correct a mistaken profile record.",
      "The operator has not evaluated resource costs across the system lifecycle."
    ],
    "why": "A metric for the operator or seller is not a complete account of effects on recipients.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about whose outcomes are included.",
    "extraWrong": "The one-sided success claim may primarily concern training-set quality rather than effects on the omitted recipients."
  },
  {
    "id": "fluent-translation",
    "mode": "issue",
    "topic": "decisions",
    "concept": "misinformation",
    "domain": "translation",
    "scene": "A generated translation changes a factual qualification in a source document. Its fluent wording is offered as the reason to trust the altered meaning.",
    "prompt": "Which concern is directly supported by the comparison?",
    "answer": "Plausible language is being treated as evidence of factual fidelity.",
    "wrong": [
      "The service may use text collected for editing in an unrelated training purpose.",
      "The author has not documented permission for the intended distribution of source material.",
      "Intended users cannot operate an essential control with their supported access method."
    ],
    "why": "Meaning should be checked against the source; fluency does not establish that a factual qualification was preserved.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about a factual change in the source meaning.",
    "extraWrong": "The fluent translation may primarily concern who can operate the interface rather than preserving a factual qualification."
  },
  {
    "id": "test-to-world",
    "mode": "issue",
    "topic": "decisions",
    "concept": "evaluation",
    "domain": "science",
    "scene": "A research model performs well on a limited laboratory test. Its developers claim that this result establishes success in an untested field setting.",
    "prompt": "Which concern is about the scope of that evidence?",
    "answer": "The test does not establish performance in the proposed setting.",
    "wrong": [
      "The evaluation may omit a stakeholder group that bears the model’s operating cost.",
      "A generic description does not explain why a particular field output was produced.",
      "The team lacks a named owner responsible for remedying individual field-use incidents."
    ],
    "why": "Evidence can support the tested setting while leaving the deployment setting uncertain.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about the scope of a test claim.",
    "extraWrong": "The field-use claim may primarily concern which team answers complaints rather than the scope of its evaluation evidence."
  },
  {
    "id": "public-not-permitted",
    "mode": "issue",
    "topic": "decisions",
    "concept": "rights",
    "domain": "generative",
    "scene": "A project plans to reuse generated assets under a policy requiring permission for the intended distribution. The team offers public availability as its only permission evidence.",
    "prompt": "Which issue is directly supported by the missing record?",
    "answer": "Availability is being confused with permission for the intended use.",
    "wrong": [
      "The asset service may omit relevant user groups from its evaluation of quality.",
      "The project does not explain how a particular generated asset was recommended.",
      "The operator has not measured resource costs across actual asset-generation use."
    ],
    "why": "The team must establish the applicable permission rather than infer it from easy access.",
    "contrast": "The other choices describe distinct concerns, but this scenario supplies evidence about permission for the intended distribution.",
    "extraWrong": "The missing reuse record may primarily concern model reliability rather than permission for the proposed distribution."
  },
  {
    "id": "halt-harm",
    "mode": "response",
    "topic": "fairness",
    "concept": "errors",
    "domain": "hiring",
    "scene": "A live hiring pilot rejects equivalent applications differently after an irrelevant attribute changes. The team can temporarily route these decisions to trained reviewers.",
    "prompt": "To prevent further affected automated rejections immediately, which response best fits?",
    "answer": "Suspend the affected automation and use the available review route.",
    "wrong": [
      "Collect another month of outcomes before changing the live route.",
      "Publish the overall score while leaving rejections on the same route.",
      "Revise the review rubric but keep affected automatic rejections active during the investigation."
    ],
    "why": "The available fallback can stop additional affected automated decisions while the team investigates the controlled discrepancy.",
    "contrast": "More data may help the investigation later, but it does not meet the immediate harm-prevention objective.",
    "extraWrong": "Keep the affected automated route active while adding group outcome summaries to the next scheduled report."
  },
  {
    "id": "recruit-missing",
    "mode": "response",
    "topic": "fairness",
    "concept": "representation",
    "domain": "speech",
    "scene": "A speech pilot lacks relevant users and conditions in its sample. The project has time to revise collection before making a broad performance claim.",
    "prompt": "Which next step most directly addresses the sample gap?",
    "answer": "Recruit the missing users and evaluate relevant conditions before claiming coverage.",
    "wrong": [
      "Repeat the existing sample more often to increase its total size.",
      "Publish a single average score from the current sample as validation.",
      "Recruit more participants through the same narrow channel and use the larger count as coverage evidence."
    ],
    "why": "Increasing coverage of missing populations and conditions addresses the specific evidence gap.",
    "contrast": "Repeating the same sample grows the count without necessarily adding the missing coverage.",
    "extraWrong": "Increase the existing sample by repeating its current recruitment channel, then use the larger count to support broad coverage."
  },
  {
    "id": "repair-proxy",
    "mode": "response",
    "topic": "fairness",
    "concept": "measurement",
    "domain": "face",
    "scene": "A face-entry pilot uses camera image quality as a proxy for suspicious behavior. The stated goal is assessing behavior, and entrance conditions vary.",
    "prompt": "Which change most directly addresses this measurement problem?",
    "answer": "Reconsider the proxy and test a measure tied to the stated behavior.",
    "wrong": [
      "Collect more images labeled by the same quality-based suspicion rule.",
      "Show visitors the existing score without changing what it measures.",
      "Appoint an incident owner while retaining the same untested proxy."
    ],
    "why": "The target measurement must match the intended quality rather than repeat the same camera-dependent label.",
    "contrast": "More examples under the same faulty labeling rule can preserve the measurement mismatch.",
    "extraWrong": "Retain the proxy and improve prediction of its current labels before checking whether they represent visitor behavior."
  },
  {
    "id": "specify-fairness",
    "mode": "response",
    "topic": "fairness",
    "concept": "criteria",
    "domain": "banking",
    "scene": "A fictional loan audit finds that two teams use different definitions of fair treatment. Neither definition is stated in the approval claim.",
    "prompt": "Before declaring the pilot fair, what should the review establish?",
    "answer": "A relevant fairness goal, affected groups and appropriate error measures.",
    "wrong": [
      "A larger training file without specifying which fairness claim is tested.",
      "Equal approval totals as the sole measure regardless of eligibility.",
      "Compare only the overall prediction score while leaving the competing fairness definitions unresolved."
    ],
    "why": "A fairness claim needs an explicit criterion and evidence relevant to people affected by its errors.",
    "contrast": "More data alone does not resolve which fairness goal or error tradeoff the team intends to assess.",
    "extraWrong": "Choose whichever fairness statistic is easiest to calculate before agreeing on the relevant criterion and affected groups."
  },
  {
    "id": "bound-sensitive",
    "mode": "response",
    "topic": "privacy",
    "concept": "sensitive",
    "domain": "healthcare",
    "scene": "A fictional data-sharing pilot can infer an identifiable private trait from combined fields. Its stated purpose can be met with a less identifying summary.",
    "prompt": "Which response most directly reduces the stated disclosure risk?",
    "answer": "Limit the shared detail and test the summary for re-identification risk.",
    "wrong": [
      "Remove names while retaining the same uniquely identifying combinations.",
      "Publish a broad accuracy score instead of reviewing the shared fields.",
      "Transfer control to another vendor without changing what is shared."
    ],
    "why": "Removing unnecessary identifying detail addresses the inference path, and the summary still needs a linkage-risk check.",
    "contrast": "Names are not the only way to identify someone from a distinctive combination of fields.",
    "extraWrong": "Retain rare combinations for analytical flexibility and rely only on removal of the explicit name field."
  },
  {
    "id": "separate-choice",
    "mode": "response",
    "topic": "privacy",
    "concept": "consent",
    "domain": "education",
    "scene": "A tutor requires agreement to unrelated optional model training before providing an essential service. The service can operate without that training use.",
    "prompt": "Which change most directly supports an informed choice about optional use?",
    "answer": "Explain the optional purpose clearly and provide a usable separate choice.",
    "wrong": [
      "Put the same combined agreement in a longer enrollment document.",
      "Encrypt the recordings while retaining the same combined agreement.",
      "Ask users to confirm that they read the combined notice without allowing a separate optional-use decision."
    ],
    "why": "The optional use can be separated from the necessary service and explained at the decision point.",
    "contrast": "A longer notice does not resolve the inability to decline the unrelated optional purpose.",
    "extraWrong": "Provide a more detailed combined notice while keeping optional training inseparable from the essential tutoring service."
  },
  {
    "id": "trim-retention",
    "mode": "response",
    "topic": "privacy",
    "concept": "minimization",
    "domain": "advertising",
    "scene": "An ad-placement task requires daily totals, but identifiable raw events remain after those totals are produced. The goal is reducing unnecessary retained detail.",
    "prompt": "Which response most directly meets that goal?",
    "answer": "Remove unneeded raw detail under a documented retention and verification process.",
    "wrong": [
      "Increase storage encryption while keeping every raw event indefinitely.",
      "Display the collection notice more prominently without changing retention.",
      "Use a larger model while retaining the same unnecessary event detail."
    ],
    "why": "A purpose-based retention process reduces the extra detail that is not needed for daily placement.",
    "contrast": "Encryption can protect retained data but does not minimize how much unnecessary data is retained.",
    "extraWrong": "Keep the same raw detail but add a new access-control measure without reviewing which retained fields the task requires."
  },
  {
    "id": "stop-secondary-use",
    "mode": "response",
    "topic": "privacy",
    "concept": "privacy",
    "domain": "generative",
    "scene": "A writing assistant proposes training on identifiable drafts collected only for editing. The editing service can continue without this new use.",
    "prompt": "To respect the original purpose while the new use is reviewed, what fits best?",
    "answer": "Hold the secondary use and review purpose, permission and alternatives.",
    "wrong": [
      "Proceed because editing access already makes every future use appropriate.",
      "Publish model accuracy before asking whether drafts may be reused.",
      "Add a general training notice while proceeding before the original purpose and permissions are reviewed."
    ],
    "why": "Holding an optional new purpose protects the original boundary without stopping the necessary editing service.",
    "contrast": "Access for editing does not itself establish permission or appropriateness for unrelated training.",
    "extraWrong": "Continue the secondary training use under existing access controls while treating the editing permission as sufficient."
  },
  {
    "id": "show-case-reason",
    "mode": "response",
    "topic": "accountability",
    "concept": "explanation",
    "domain": "service",
    "scene": "A customer-service triage pilot has a notice and a human appeal route. Users still cannot understand why their particular request was prioritized.",
    "prompt": "Which addition most directly addresses the remaining explanation gap?",
    "answer": "Provide understandable case reasons that can be checked against the record.",
    "wrong": [
      "Add another automation notice without explaining individual outputs.",
      "Publish a list of development staff without connecting it to decisions.",
      "Provide a model-wide feature ranking without tying its factors to the person’s actual request."
    ],
    "why": "A reason tied to the actual record helps a person understand and challenge this result.",
    "contrast": "Another general notice improves disclosure but does not explain an individual priority.",
    "extraWrong": "Provide a more detailed model-wide feature inventory without connecting those features to the person’s actual triage result."
  },
  {
    "id": "name-remedy-owner",
    "mode": "response",
    "topic": "accountability",
    "concept": "accountability",
    "domain": "public",
    "scene": "A service error has been reported, but the vendor and operator pass the complaint between teams. Existing technical tasks do not assign remedy authority.",
    "prompt": "Which governance change most directly closes this gap?",
    "answer": "Assign a named owner with authority, escalation steps and a remedy deadline.",
    "wrong": [
      "Publish a model diagram without assigning responsibility for the complaint.",
      "Collect satisfaction ratings while leaving complaint ownership unresolved.",
      "Create a shared complaint inbox without deciding who can investigate and authorize a remedy."
    ],
    "why": "Answerability needs an owner who can investigate, escalate and arrange a remedy rather than another handoff.",
    "contrast": "A diagram may improve understanding, but it does not establish who must resolve the reported harm.",
    "extraWrong": "Assign additional technical maintenance tasks without naming who must answer the complaint and arrange a remedy."
  },
  {
    "id": "give-stop-authority",
    "mode": "response",
    "topic": "accountability",
    "concept": "oversight",
    "domain": "transport",
    "scene": "A dispatch pilot requires human approval, but staff cannot inspect a flagged case or halt its automated action. The goal is meaningful intervention.",
    "prompt": "Which change most directly supports that goal?",
    "answer": "Provide relevant evidence, review capacity and authority to stop affected actions.",
    "wrong": [
      "Add a reviewer’s name to the screen without changing review powers.",
      "Require faster approvals while leaving staff without the relevant record.",
      "Publish the number of reviews without measuring their effectiveness."
    ],
    "why": "Review capacity and intervention authority address why the current approval step cannot protect the affected action.",
    "contrast": "A visible reviewer name is not the same as the ability to inspect and intervene.",
    "extraWrong": "Add another reviewer to the sign-off list without granting relevant records, investigation time or stop authority."
  },
  {
    "id": "usable-appeal",
    "mode": "response",
    "topic": "accountability",
    "concept": "appeal",
    "domain": "workplace",
    "scene": "Workers can submit a scheduling complaint, but the service returns the same automated answer and cannot accept a correction to source records.",
    "prompt": "Which response most directly improves contestability?",
    "answer": "Offer an accessible review route that accepts evidence and corrects source data.",
    "wrong": [
      "Send the same automated answer with a more reassuring explanation.",
      "Publish a general accuracy average without opening individual review.",
      "Collect another feedback rating while leaving correction unavailable."
    ],
    "why": "A meaningful appeal must let relevant evidence reach a reviewer and correct the information that drives later decisions.",
    "contrast": "A friendlier repeated result does not create review or correction capability.",
    "extraWrong": "Improve the complaint form’s appearance while continuing to return the unchanged result without accepting source-data corrections."
  },
  {
    "id": "test-access-route",
    "mode": "response",
    "topic": "impacts",
    "concept": "accessibility",
    "domain": "accessibility",
    "scene": "An essential service has a known interaction barrier for some intended users. A supported alternative channel can be provided during repair.",
    "prompt": "What most directly preserves access during the repair period?",
    "answer": "Provide the usable alternative and test repairs with affected users.",
    "wrong": [
      "Ask affected users to wait until general satisfaction scores improve.",
      "Collect more model-training examples without changing the blocked interaction.",
      "Publish the accessibility goal while keeping the essential barrier in place."
    ],
    "why": "The alternative maintains access now, and affected-user testing checks whether the repair works.",
    "contrast": "More training data does not directly fix an inaccessible required interaction.",
    "extraWrong": "Prioritize a larger general satisfaction survey while leaving the essential access barrier and missing alternative unresolved."
  },
  {
    "id": "worker-transition",
    "mode": "response",
    "topic": "impacts",
    "concept": "employment",
    "domain": "creative",
    "scene": "A studio expects task savings from automation. It wants to evaluate worker effects and plan transitions before changing roles.",
    "prompt": "Which plan most directly meets that stated objective?",
    "answer": "Map changed tasks with workers and evaluate training and transition support.",
    "wrong": [
      "Count faster outputs and treat that count as the whole employment outcome.",
      "Announce new role titles before studying changes in actual work.",
      "Use the savings estimate to assign new roles without examining affected duties or training needs."
    ],
    "why": "Task mapping and worker input reveal workload, skill and transition effects that a speed metric omits.",
    "contrast": "Faster output is one benefit measure, not a complete assessment of workers’ job changes.",
    "extraWrong": "Plan around faster output alone and postpone worker consultation about changed duties and transition support."
  },
  {
    "id": "measure-total-use",
    "mode": "response",
    "topic": "impacts",
    "concept": "environment",
    "domain": "environment",
    "scene": "A project’s estimate covers resource use per prediction. Deployment is expected to increase usage, and the goal is comparing total environmental effects.",
    "prompt": "Which next measurement most directly supports the comparison?",
    "answer": "Estimate actual volume and lifecycle resource use alongside the measured benefit.",
    "wrong": [
      "Compare only per-prediction use and omit the expected increase in requests.",
      "Treat improved accuracy as a direct measure of all resource savings.",
      "Count model parameters without measuring the project’s actual operations."
    ],
    "why": "The comparison needs total activity and lifecycle costs as well as evidence of the monitoring benefit.",
    "contrast": "A lower per-request cost can coexist with a higher total when volume changes.",
    "extraWrong": "Compare only the cost of each prediction and leave the expected increase in requests and model lifecycle outside the estimate."
  },
  {
    "id": "consult-affected",
    "mode": "response",
    "topic": "impacts",
    "concept": "stakeholders",
    "domain": "translation",
    "scene": "A translation service benefits its operator but may burden the people whose messages are translated. The review has not included those people.",
    "prompt": "Which step most directly addresses that missing perspective?",
    "answer": "Include affected users and assess their benefits, costs and available alternatives.",
    "wrong": [
      "Ask only the purchasing team whether its efficiency target was met.",
      "Publish the operator’s savings as the complete stakeholder assessment.",
      "Increase translation volume before examining who bears the burden."
    ],
    "why": "People affected by the output can provide evidence about costs and alternatives that the buyer’s metric omits.",
    "contrast": "Purchaser feedback is relevant but does not substitute for the missing affected-user perspective.",
    "extraWrong": "Ask the purchasing organization to estimate recipients’ preferences without involving the people affected by translated outputs."
  },
  {
    "id": "verify-before-sharing",
    "mode": "response",
    "topic": "decisions",
    "concept": "misinformation",
    "domain": "social",
    "scene": "A drafted AI post makes a consequential factual claim, and its cited source cannot be located. The team can delay publishing while checking primary records.",
    "prompt": "Which response best meets the goal of avoiding an unsupported factual post?",
    "answer": "Check the claim against reliable records and withhold unsupported details.",
    "wrong": [
      "Publish with a confidence score but without checking the cited evidence.",
      "Ask the same model repeatedly and treat repetition as verification.",
      "Improve the post’s wording while leaving its factual basis unresolved."
    ],
    "why": "Checking independent records tests the factual claim; withholding unsupported detail avoids spreading it during review.",
    "contrast": "A confidence score does not supply the missing factual evidence.",
    "extraWrong": "Publish the claim with a fluent rewrite and treat agreement between repeated generated answers as independent verification."
  },
  {
    "id": "bound-objective",
    "mode": "response",
    "topic": "decisions",
    "concept": "unintended",
    "domain": "recommendations",
    "scene": "A pilot increases engagement while users report that the ranking works against their stated task. The goal is evaluating the mismatch before wider release.",
    "prompt": "Which response most directly tests the intended goal?",
    "answer": "Measure task outcomes and investigate the proxy before expanding the ranking.",
    "wrong": [
      "Optimize engagement further and use it as the only success measure.",
      "Reword the service promise without studying the recorded mismatch.",
      "Use a more precise click-count estimate as the only check of whether people completed their task."
    ],
    "why": "A separate task-outcome measure can reveal whether engagement is improving what users actually wanted.",
    "contrast": "Further optimizing the same proxy does not test whether it represents the real goal.",
    "extraWrong": "Increase the engagement objective’s weight and treat a higher click count as confirmation that the intended task improved."
  },
  {
    "id": "independent-test",
    "mode": "response",
    "topic": "decisions",
    "concept": "evaluation",
    "domain": "science",
    "scene": "A model was evaluated using cases also used during development. The team needs evidence about performance on unfamiliar, relevant cases.",
    "prompt": "Which test most directly answers that need?",
    "answer": "Use a held-out relevant comparison under the intended operating conditions.",
    "wrong": [
      "Repeat the development cases and report the largest observed score.",
      "Report only the training-set size instead of a new evaluation result.",
      "Tune the model again on the familiar development cases and use their improved score as generalization evidence."
    ],
    "why": "Held-out relevant cases reduce reuse of the evidence the model was developed around.",
    "contrast": "Repeating development cases can overstate performance on unfamiliar cases.",
    "extraWrong": "Use more familiar development cases and present a higher repeated score as evidence about unfamiliar operating conditions."
  },
  {
    "id": "contain-tool-risk",
    "mode": "response",
    "topic": "decisions",
    "concept": "deployment",
    "domain": "security",
    "scene": "An assistant can perform an action outside its approved task, and a safe read-only fallback is available. The immediate goal is containing that action risk.",
    "prompt": "Which response most directly meets the immediate goal?",
    "answer": "Restrict the affected tool actions and use the tested fallback while investigating.",
    "wrong": [
      "Collect more routine prompts while leaving the risky action enabled.",
      "Publish a general warning while retaining the same action permissions.",
      "Add another approval notice while leaving the same out-of-scope tool actions available."
    ],
    "why": "Restricting the affected action boundary contains exposure now while the team investigates the specific failure.",
    "contrast": "More routine data may support later testing but does not contain the currently enabled action.",
    "extraWrong": "Leave the affected tool actions enabled and rely on a general warning while expanding the routine prompt collection."
  },
  {
    "id": "labels-volume",
    "mode": "tradeoff",
    "topic": "fairness",
    "concept": "history",
    "domain": "hiring",
    "scene": "A hiring team can add many records from the old process or spend time reviewing what those labels mean. Its concern is reproducing that process’s inequities.",
    "prompt": "Which statement best describes the relevant tradeoff?",
    "answer": "More old records may improve pattern fit while retaining the old labeling problem.",
    "wrong": [
      "More old records trade lower storage use for easier individual explanations.",
      "Label review trades away all useful historical information regardless of findings.",
      "A larger record count establishes fair treatment without examining label meaning."
    ],
    "why": "Volume and label quality are different; fitting the old target better can preserve the problem being investigated.",
    "contrast": "The scenario identifies historical-label meaning, not a demonstrated reduction in storage use.",
    "extraWrong": "More historical records may reduce manual labeling work, so label meaning can be left outside the assessment of the stated inequity."
  },
  {
    "id": "coverage-cost",
    "mode": "tradeoff",
    "topic": "fairness",
    "concept": "representation",
    "domain": "speech",
    "scene": "A team can recruit missing user groups at additional cost or launch using its current narrow sample. It wants a claim about the intended population.",
    "prompt": "Which tradeoff follows from these options?",
    "answer": "Broader evaluation costs more now but supplies evidence the narrow sample lacks.",
    "wrong": [
      "A cheaper narrow evaluation supplies the same coverage because it runs sooner.",
      "Broader recruitment directly resolves every privacy question about the stored data.",
      "Recruitment cost measures performance more directly than a relevant evaluation does."
    ],
    "why": "Recruitment can improve coverage evidence, while costing time and resources; it does not settle every other concern.",
    "contrast": "An earlier result is not equivalent evidence for users the sample excludes.",
    "extraWrong": "A narrow sample may be cheaper to evaluate, so its larger repeat count can be treated as evidence of coverage of missing users."
  },
  {
    "id": "proxy-convenience",
    "mode": "tradeoff",
    "topic": "fairness",
    "concept": "measurement",
    "domain": "face",
    "scene": "Image quality is easy to record, but it is being used to assess visitor behavior. A behavior-relevant measure would take more effort to validate.",
    "prompt": "Which tradeoff is supported by the stated evidence?",
    "answer": "Convenient measurement may save effort while weakening the link to the intended quality.",
    "wrong": [
      "A convenient proxy is a stronger behavior measure because it is easier to collect.",
      "Validating the intended measure primarily reduces the need for visitor notices.",
      "Collection effort alone establishes which measure is ethically acceptable in every use."
    ],
    "why": "Convenience is useful, but cannot establish that a proxy measures the behavior the service claims to assess.",
    "contrast": "Ease of collection and validity for the intended quality are separate properties.",
    "extraWrong": "A convenient proxy may be consistent to record, so collecting more proxy labels can substitute for checking its relation to behavior."
  },
  {
    "id": "error-threshold",
    "mode": "tradeoff",
    "topic": "fairness",
    "concept": "criteria",
    "domain": "healthcare",
    "scene": "A fictional pilot can lower missed alerts by issuing more false alarms. Both errors have costs, and stakeholders have not yet agreed which tradeoff to prioritize.",
    "prompt": "Which statement best respects the evidence and the unresolved priority?",
    "answer": "Reducing one error can increase another, so the priority needs explicit evaluation.",
    "wrong": [
      "The option with fewer missed alerts is fair under every possible criterion.",
      "The option with fewer false alarms establishes equal treatment across all groups.",
      "The number of alerts alone decides the appropriate clinical operating rule."
    ],
    "why": "The case supplies competing error costs without selecting a single universal fairness or clinical priority.",
    "contrast": "Fewer missed alerts is a benefit, but does not by itself settle all criteria or costs.",
    "extraWrong": "A threshold can reduce one costly error, so the observed change alone can replace discussion of the competing error cost."
  },
  {
    "id": "precision-and-retention",
    "mode": "tradeoff",
    "topic": "privacy",
    "concept": "minimization",
    "domain": "education",
    "scene": "A tutor can retain raw interaction histories for detailed diagnostics or produce the summary required by its stated service and discard unneeded detail.",
    "prompt": "Which tradeoff is directly involved?",
    "answer": "Detailed diagnostics can support analysis while increasing retained personal-data exposure.",
    "wrong": [
      "Retaining raw histories automatically supplies meaningful consent for every use.",
      "Discarding unneeded detail primarily reduces the need to test learning outcomes.",
      "A summary necessarily has no possibility of identifying any student."
    ],
    "why": "Diagnostic detail may be useful, but retention increases what can be accessed, linked or reused.",
    "contrast": "A usefulness argument does not establish permission for unrelated uses.",
    "extraWrong": "More retained detail may support diagnostics, so its usefulness can be treated as establishing permission for the optional secondary use."
  },
  {
    "id": "personalization-purpose",
    "mode": "tradeoff",
    "topic": "privacy",
    "concept": "privacy",
    "domain": "advertising",
    "scene": "A pilot reports more relevant placements when it adds personal profiles. The stated comparison also includes people’s concern about secondary uses of their records.",
    "prompt": "Which description captures the stated tradeoff?",
    "answer": "Additional personalization may improve relevance while expanding personal-data use.",
    "wrong": [
      "Additional profiling primarily trades slower rendering for better source attribution.",
      "An improved relevance score establishes that all secondary uses are appropriate.",
      "Avoiding profiles would establish that every remaining placement is unbiased."
    ],
    "why": "Relevance is one benefit; the purposes and extent of personal-data use remain separate concerns.",
    "contrast": "The scenario does not identify rendering speed or attribution as the competing effects.",
    "extraWrong": "A more relevant placement score may benefit the operator, so that score alone can settle concerns about the additional profiling purpose."
  },
  {
    "id": "summary-utility",
    "mode": "tradeoff",
    "topic": "privacy",
    "concept": "sensitive",
    "domain": "public",
    "scene": "A pilot reduces identifying detail in shared records, but the resulting summary supports fewer fine-grained analyses. A linkage-risk check is still planned.",
    "prompt": "Which tradeoff is supported without claiming zero privacy risk?",
    "answer": "Less detail may reduce exposure while limiting some analyses and still needing a risk check.",
    "wrong": [
      "Fewer fields establish that no person could be identified by any combination.",
      "Fewer supported analyses show that data sharing has no possible public benefit.",
      "Keeping names private establishes permission for every use of the remaining detail."
    ],
    "why": "Data reduction can change both usefulness and exposure; linkage can still create risk.",
    "contrast": "Removing fields does not establish that all possible re-identification paths are gone.",
    "extraWrong": "A summary may omit direct names, so its analytical usefulness can be compared without checking whether combinations remain identifying."
  },
  {
    "id": "audit-versus-exposure",
    "mode": "tradeoff",
    "topic": "privacy",
    "concept": "security",
    "domain": "security",
    "scene": "A team wants outsiders to examine a tool’s limitations, but publishing operational credentials would expose confidential systems. It can share a bounded test setup.",
    "prompt": "Which response best captures the relevant tradeoff?",
    "answer": "Enable useful scrutiny through safe evidence while protecting operational access.",
    "wrong": [
      "Treat operational credentials as the most necessary proof of transparency.",
      "Keep every finding secret because external scrutiny cannot help reliability.",
      "Publish only a publicity claim and treat that as equivalent to testing access."
    ],
    "why": "A bounded setup can support scrutiny without handing out access to the production system.",
    "contrast": "Transparency can be supported by appropriate evidence without exposing live credentials.",
    "extraWrong": "External scrutiny may be useful, so providing live credentials can be treated as necessary even when a bounded test setup is available."
  },
  {
    "id": "reasons-versus-secrets",
    "mode": "tradeoff",
    "topic": "accountability",
    "concept": "explanation",
    "domain": "banking",
    "scene": "An operator can provide understandable decision factors without exposing other people’s records or private operational details. Users want reasons for their own result.",
    "prompt": "Which statement best describes this choice?",
    "answer": "Case explanations can improve understanding while respecting appropriate disclosure boundaries.",
    "wrong": [
      "Protecting others’ records requires withholding every reason for an individual result.",
      "A model’s full source code is the only usable form of explanation.",
      "A generic automation notice supplies the same case understanding as a checked reason."
    ],
    "why": "Reasons can be tied to a person’s record without indiscriminately publishing other information.",
    "contrast": "Protecting unrelated records does not require treating all useful case explanations as secret.",
    "extraWrong": "Keeping operational details private may protect a service, so a generic notice can replace any understandable case-specific reason."
  },
  {
    "id": "notice-and-correction",
    "mode": "tradeoff",
    "topic": "accountability",
    "concept": "transparency",
    "domain": "service",
    "scene": "A service can clearly announce its automated triage and known limits. It must also decide how to let users correct mistaken source records.",
    "prompt": "Which statement accurately relates these steps?",
    "answer": "Disclosure supports informed use, while correction needs an additional usable process.",
    "wrong": [
      "A clear notice resolves individual errors without a separate correction route.",
      "A correction route removes the need to describe any relevant automation limits.",
      "Publishing development dates is equivalent to both disclosure and individual review."
    ],
    "why": "Knowing automation is present and being able to correct a particular record serve distinct purposes.",
    "contrast": "Disclosure does not by itself supply the review and correction mechanism.",
    "extraWrong": "A visible automation notice may help users, so the presence of that notice can be used as evidence that individual records are correct."
  },
  {
    "id": "review-capacity",
    "mode": "tradeoff",
    "topic": "accountability",
    "concept": "oversight",
    "domain": "workplace",
    "scene": "Careful review of automated schedules requires staff time and may slow approval. The team wants to reduce harmful errors rather than add a nominal sign-off.",
    "prompt": "Which tradeoff follows from the stated goal?",
    "answer": "Review can add cost and delay, and its actual error-reduction effect must be tested.",
    "wrong": [
      "Adding any reviewer guarantees that harmful schedule errors are eliminated.",
      "Faster approvals establish more effective oversight even without access to evidence.",
      "The presence of a sign-off field measures review quality better than outcomes do."
    ],
    "why": "Review has resource costs and must provide effective capacity and authority, not merely a human label.",
    "contrast": "A person in the process does not establish that all errors have been prevented.",
    "extraWrong": "A human sign-off may cost staff time, so counting approvals alone can establish that the added step prevents the relevant harm."
  },
  {
    "id": "appeal-time",
    "mode": "tradeoff",
    "topic": "accountability",
    "concept": "appeal",
    "domain": "transport",
    "scene": "A dispatch service can reserve staff time for disputed automated assignments. That may slow some decisions but lets people submit relevant corrections.",
    "prompt": "Which description best captures the specific tradeoff?",
    "answer": "A usable review route costs time while enabling correction of affected decisions.",
    "wrong": [
      "The existence of any complaint box establishes meaningful review regardless of response.",
      "A shorter review deadline establishes that every result is accurate.",
      "Correcting one assignment proves that the whole model treats every case fairly."
    ],
    "why": "The relevant benefit is usable contestability and correction, balanced with review resources and delay.",
    "contrast": "An unresponsive complaint box is not equivalent to a route that can consider evidence and correct data.",
    "extraWrong": "A complaint route may increase message volume, so counting submissions can substitute for checking timely review and correction outcomes."
  },
  {
    "id": "access-and-errors",
    "mode": "tradeoff",
    "topic": "impacts",
    "concept": "accessibility",
    "domain": "accessibility",
    "scene": "An AI caption tool can help some users access a discussion, but its pilot contains errors. A correction channel and other access options are available.",
    "prompt": "Which statement best reflects the stated benefit and limitation?",
    "answer": "Captions may expand access while errors still require evaluation and usable alternatives.",
    "wrong": [
      "Caption errors establish that the tool cannot provide any access benefit.",
      "An access benefit establishes that every caption can be treated as a faithful record.",
      "The presence of a correction channel guarantees that no user encounters a barrier."
    ],
    "why": "Benefits and errors can coexist; the options and actual usability need evaluation.",
    "contrast": "A mistake does not erase every benefit, just as a benefit does not establish perfect fidelity.",
    "extraWrong": "An access tool may help current users, so its benefits can be assessed without examining the known errors or usable alternatives."
  },
  {
    "id": "efficiency-and-work",
    "mode": "tradeoff",
    "topic": "impacts",
    "concept": "employment",
    "domain": "creative",
    "scene": "A studio expects production savings from an AI tool, while workers face changed roles and new review tasks. The plan includes a transition period.",
    "prompt": "Which description best represents the competing effects?",
    "answer": "The operator may gain efficiency while workers face transition costs and changed work.",
    "wrong": [
      "Any productivity gain establishes improved job quality for every affected worker.",
      "Any changed role establishes that the tool provides no benefit to the organization.",
      "Training costs alone establish whether all future job effects are acceptable."
    ],
    "why": "The benefits and costs can fall on different people and may change over time.",
    "contrast": "An efficiency measure does not establish how gains or burdens are distributed across workers.",
    "extraWrong": "Faster production may benefit the studio, so task efficiency can stand in for evidence about worker workload and transition costs."
  },
  {
    "id": "net-resource-effect",
    "mode": "tradeoff",
    "topic": "impacts",
    "concept": "environment",
    "domain": "environment",
    "scene": "A monitoring model may help target conservation work, but computing and hardware also consume resources. The team has not measured the full net effect.",
    "prompt": "Which statement best describes the remaining comparison?",
    "answer": "Measure conservation benefits alongside total resource costs before claiming a net effect.",
    "wrong": [
      "A conservation purpose alone establishes an environmentally beneficial net outcome.",
      "Any computing cost establishes that the project cannot conserve resources overall.",
      "A per-request efficiency improvement alone establishes lower total resource use."
    ],
    "why": "The purpose and individual costs do not determine the balance without a relevant comparison.",
    "contrast": "A worthwhile purpose is not evidence of a particular measured net outcome.",
    "extraWrong": "Per-request computing may be more efficient, so that result can establish the total resource effect without measuring actual use volume."
  },
  {
    "id": "ranking-gains-and-burdens",
    "mode": "tradeoff",
    "topic": "impacts",
    "concept": "stakeholders",
    "domain": "social",
    "scene": "A ranking change benefits advertisers but increases unwanted interruptions for recipients. The stated goal is evaluating effects on both groups.",
    "prompt": "Which tradeoff must the evaluation include?",
    "answer": "Commercial gains must be considered alongside the recipients’ documented burden.",
    "wrong": [
      "Advertiser satisfaction is equivalent to measuring recipients’ experience.",
      "Recipient complaints establish that no person benefits from the ranking.",
      "A higher purchase count settles all stakeholder priorities by itself."
    ],
    "why": "The evaluation needs both the observed commercial gain and the cost reported by affected recipients.",
    "contrast": "One stakeholder’s satisfaction is not a substitute for evidence about another stakeholder’s experience.",
    "extraWrong": "More sales may benefit the buyer, so its revenue measure can replace evidence about the burden reported by recipients."
  },
  {
    "id": "personal-goal-proxy",
    "mode": "tradeoff",
    "topic": "decisions",
    "concept": "unintended",
    "domain": "recommendations",
    "scene": "A recommender optimizes clicks to help people find useful resources. A pilot increases clicks but records more difficulty completing the intended task.",
    "prompt": "Which interpretation best captures the observed tension?",
    "answer": "The engagement proxy improved while the task measure signaled a possible downside.",
    "wrong": [
      "More clicks establish that all users found the resources more useful.",
      "More task difficulty proves that recommendations caused every observed problem.",
      "A proxy should be kept solely because it is easier to count."
    ],
    "why": "The difference between proxy and task outcomes warrants investigation without claiming a universal causal effect.",
    "contrast": "Click counts cannot establish the intended task outcome when the direct measure points elsewhere.",
    "extraWrong": "More clicks may accompany task improvement in some uses, so the proxy can be taken as the intended task result in this pilot."
  },
  {
    "id": "speed-and-checking",
    "mode": "tradeoff",
    "topic": "decisions",
    "concept": "misinformation",
    "domain": "translation",
    "scene": "A generated summary saves drafting time but changes a source qualification. The team needs accurate meaning before distributing it.",
    "prompt": "Which tradeoff is most directly relevant?",
    "answer": "Drafting speed can be useful while source verification remains necessary for this goal.",
    "wrong": [
      "A fluent draft offers the same evidence of meaning as a checked source comparison.",
      "One altered qualification establishes that every generated sentence is unusable.",
      "Faster production itself determines whether factual checking should be skipped."
    ],
    "why": "The speed benefit does not resolve the observed fidelity problem when accurate meaning is required.",
    "contrast": "Fluency is a language property, not independent evidence that a source qualification was preserved.",
    "extraWrong": "Faster drafting may be useful, so fluent wording can stand in for checking the observed disagreement with the source qualification."
  },
  {
    "id": "model-comparison",
    "mode": "tradeoff",
    "topic": "decisions",
    "concept": "evaluation",
    "domain": "science",
    "scene": "Two research models differ in measured task accuracy, operating cost and explainability. The team has not stated which requirements a deployment must meet.",
    "prompt": "Which conclusion is justified by this comparison?",
    "answer": "The choice needs explicit task requirements rather than one universally best model.",
    "wrong": [
      "The most accurate model is best for every possible scientific deployment.",
      "The easiest model to explain necessarily has the lowest resource cost.",
      "The least expensive model establishes adequate accuracy for every research goal."
    ],
    "why": "The relevant priorities depend on the stated task; one measured strength does not settle the entire choice.",
    "contrast": "Accuracy matters, but does not by itself establish suitability for every goal and constraint.",
    "extraWrong": "A higher task score may be useful, so it can determine the deployment choice before the remaining operating requirements are stated."
  },
  {
    "id": "reuse-and-permission",
    "mode": "tradeoff",
    "topic": "decisions",
    "concept": "synthetic",
    "domain": "generative",
    "scene": "A studio can reduce production cost using a synthetic presenter. Its goal is useful demonstrations without misleading people about a real person’s endorsement.",
    "prompt": "Which tradeoff is most relevant to the stated presentation goal?",
    "answer": "Production savings must be weighed with consent, provenance and possible mistaken endorsement.",
    "wrong": [
      "A cheaper production process establishes that viewers recognize synthetic content.",
      "A visible label removes the need to consider who authorized the represented likeness.",
      "Realistic media is better evidence of endorsement than an independent authorization record."
    ],
    "why": "Synthetic presentation can be useful while realism creates a risk of mistaken identity or endorsement.",
    "contrast": "Production cost does not establish what viewers understand or what the represented person authorized.",
    "extraWrong": "A realistic synthetic presenter may reduce production cost, so visual realism can replace evidence about the represented person’s authorization."
  },
  {
    "id": "reuse-old-target",
    "mode": "consequence",
    "topic": "fairness",
    "concept": "history",
    "domain": "hiring",
    "scene": "A team increases its training data by copying decisions from the same earlier selection process without reviewing the target labels.",
    "prompt": "Which consequence is supported as a risk of that decision?",
    "answer": "Recommendations may continue reflecting the earlier selection process’s inequities.",
    "wrong": [
      "Recommendations may become independent of the earlier process after copying more of its labels.",
      "A larger sample of the same labels establishes qualification-based selection.",
      "Historical agreement alone can confirm that the previous opportunity gaps are removed."
    ],
    "why": "More examples of the same target can strengthen the pattern without correcting what the target represents.",
    "contrast": "The alternatives go beyond the evidence: more copies of the same historical target do not establish that its inequities were removed.",
    "extraWrong": "The reused labels may primarily improve the usability of individual appeals without any change to the appeal workflow."
  },
  {
    "id": "deploy-beyond-sample",
    "mode": "consequence",
    "topic": "fairness",
    "concept": "representation",
    "domain": "speech",
    "scene": "A speech model is deployed to intended users whose conditions were not included in its narrow collection or testing process.",
    "prompt": "Which consequence is plausible without assuming a specific error rate?",
    "answer": "Recognition performance may differ in the untested user conditions.",
    "wrong": [
      "The untested groups will necessarily perform worse than every previously tested group.",
      "Overall pilot accuracy establishes performance for the newly included conditions.",
      "A larger deployment supplies the missing evaluation before any outcomes are examined."
    ],
    "why": "A missing coverage area creates uncertainty about performance there; the direction and size need evaluation.",
    "contrast": "The alternatives go beyond the evidence: a wider launch alone establishes neither equal performance nor inevitable failure in an untested group.",
    "extraWrong": "The wider launch may itself supply coverage evidence equivalent to an evaluation of the previously untested users and conditions."
  },
  {
    "id": "proxy-optimization",
    "mode": "consequence",
    "topic": "fairness",
    "concept": "measurement",
    "domain": "face",
    "scene": "An entry model is optimized more strongly for its image-quality suspicion label without checking whether that label measures visitor behavior.",
    "prompt": "Which consequence follows as a plausible risk?",
    "answer": "Better label prediction may retain behavior judgments driven by camera conditions.",
    "wrong": [
      "A higher proxy score establishes a stronger connection to visitor behavior.",
      "Additional proxy examples resolve the camera-condition problem without reviewing the target.",
      "Improved prediction of existing labels demonstrates equal behavior assessment at every entrance."
    ],
    "why": "Improving fit to a proxy can preserve a mismatch between recorded labels and the intended quality.",
    "contrast": "The alternatives go beyond the evidence: better prediction of a proxy does not validate its connection to the intended behavior.",
    "extraWrong": "Better proxy prediction may itself establish that the suspicion score measures the intended behavior under each camera condition."
  },
  {
    "id": "average-only",
    "mode": "consequence",
    "topic": "fairness",
    "concept": "errors",
    "domain": "healthcare",
    "scene": "A fictional pilot reports only an overall accuracy average even though relevant errors differ across comparable groups.",
    "prompt": "What consequence is directly plausible for people interpreting the report?",
    "answer": "The report may conceal a disparity in who bears important mistakes.",
    "wrong": [
      "The combined score establishes that relevant error burdens are similar across groups.",
      "Reporting one average removes the underlying disparity without changing the model.",
      "The overall result demonstrates that the group bearing more false alarms has an adequate remedy."
    ],
    "why": "Aggregation can hide the distribution of mistakes without changing the underlying mistakes.",
    "contrast": "The alternatives go beyond the evidence: a reporting average neither changes underlying outcomes nor establishes equal error burdens.",
    "extraWrong": "The aggregate report may itself equalize the underlying error counts without changing the model or the decisions it makes."
  },
  {
    "id": "bundled-choice",
    "mode": "consequence",
    "topic": "privacy",
    "concept": "consent",
    "domain": "education",
    "scene": "An essential tutor service bundles enrollment with an unrelated optional training use, and users cannot decline that optional use separately.",
    "prompt": "Which consequence is supported by the available choice?",
    "answer": "Users may receive notice without a meaningful decision about the optional purpose.",
    "wrong": [
      "Continued enrollment establishes a separate voluntary choice about training use.",
      "Providing the collection notice alone establishes agreement to every future purpose.",
      "The optional purpose becomes operationally necessary because enrollment includes it."
    ],
    "why": "The constraint on choice can persist even if a person is aware that collection occurs.",
    "contrast": "The alternatives go beyond the evidence: enrollment and a collection notice do not establish a separate optional-use decision.",
    "extraWrong": "The bundled notice may itself create a usable opportunity to decline the optional purpose without changing the enrollment process."
  },
  {
    "id": "keep-extra-events",
    "mode": "consequence",
    "topic": "privacy",
    "concept": "minimization",
    "domain": "advertising",
    "scene": "An operator keeps identifiable raw events after producing the daily totals its service needs, without a purpose-based deletion process.",
    "prompt": "Which consequence is a plausible data risk?",
    "answer": "Unneeded retained detail remains available for exposure, linkage or later reuse.",
    "wrong": [
      "The retained records establish that a disclosure has already occurred.",
      "A daily summary makes the remaining identifiable raw events anonymous.",
      "Keeping more detail establishes that future reuse is necessary for the original task."
    ],
    "why": "Keeping extra detail expands the information that can later be exposed or repurposed, without proving that exposure occurred.",
    "contrast": "The alternatives go beyond the evidence: retention creates exposure without proving a breach or establishing a need for future reuse.",
    "extraWrong": "The extra retention may itself improve informed choice without any change to what users are told or allowed to decline."
  },
  {
    "id": "secure-secondary-profile",
    "mode": "consequence",
    "topic": "privacy",
    "concept": "privacy",
    "domain": "public",
    "scene": "Personal records remain under strong access controls, but the operator begins an unrelated profiling use without reviewing the original collection purpose.",
    "prompt": "Which consequence is consistent with those facts?",
    "answer": "A privacy-purpose conflict may occur even while access protection still works.",
    "wrong": [
      "Strong access controls settle whether the unrelated profiling purpose is appropriate.",
      "A new profiling use demonstrates that outsiders have bypassed the encryption.",
      "Original service permission alone establishes agreement to the new profiling purpose."
    ],
    "why": "Privacy concerns include appropriate uses as well as whether outsiders can access the records.",
    "contrast": "The alternatives go beyond the evidence: access protection and appropriate purpose are separate questions.",
    "extraWrong": "The new secondary use may itself demonstrate that the original access controls failed rather than raise a separate purpose concern."
  },
  {
    "id": "tool-boundary",
    "mode": "consequence",
    "topic": "privacy",
    "concept": "deployment",
    "domain": "security",
    "scene": "An assistant has an overly broad credential and can act outside its approved retrieval task. Its output is used without a boundary check.",
    "prompt": "What consequence is a plausible risk of this design?",
    "answer": "An erroneous or manipulated action may affect records outside the intended task.",
    "wrong": [
      "A credential’s technical reach establishes which record actions are appropriate.",
      "Good average retrieval accuracy establishes that tool actions stay inside the approved boundary.",
      "A larger action scope reduces the potential impact of a mistaken generated instruction."
    ],
    "why": "Broad access can increase the reach of mistakes or misuse; access capability does not establish an appropriate purpose.",
    "contrast": "The alternatives go beyond the evidence: technical access is not permission for every action, and task accuracy does not establish containment.",
    "extraWrong": "The wider credential may itself establish that all newly reachable records are appropriate inputs for the original retrieval purpose."
  },
  {
    "id": "generic-feature-list",
    "mode": "consequence",
    "topic": "accountability",
    "concept": "explanation",
    "domain": "banking",
    "scene": "A fictional decision service substitutes a model-wide feature inventory for a reason that explains the person’s own output.",
    "prompt": "Which consequence is plausible for someone checking that result?",
    "answer": "The person may be unable to connect the decision to errors in their record.",
    "wrong": [
      "A general feature inventory establishes which information caused this individual output.",
      "A longer feature list supplies the same error-checking ability as a case-linked reason.",
      "Providing the inventory corrects the underlying source record without a separate process."
    ],
    "why": "Case-specific reasons can help people identify relevant mistakes; a generic list need not provide that connection.",
    "contrast": "The alternatives go beyond the evidence: general descriptions do not establish which case facts affected this result or correct its record.",
    "extraWrong": "The general feature list may itself establish which information in this person’s record was incorrect without a case-specific connection."
  },
  {
    "id": "automation-omitted",
    "mode": "consequence",
    "topic": "accountability",
    "concept": "transparency",
    "domain": "service",
    "scene": "A company omits relevant automation and limitations from how it presents a customer-support interaction.",
    "prompt": "Which consequence is directly plausible?",
    "answer": "Customers may rely on the interaction without relevant information about its limits.",
    "wrong": [
      "Customers’ successful past use establishes that relevant limitations no longer need disclosure.",
      "A missing notice establishes that every answer is factually wrong.",
      "A useful response establishes that the presentation gave customers an informed view of its limits."
    ],
    "why": "Missing relevant disclosure can affect informed use even when individual outputs vary in usefulness or accuracy.",
    "contrast": "The alternatives go beyond the evidence: past usefulness does not settle disclosure, and missing notice does not prove every response false.",
    "extraWrong": "The omitted notice may primarily determine the fairness criterion satisfied by the triage decisions without any outcome evaluation."
  },
  {
    "id": "unowned-incident",
    "mode": "consequence",
    "topic": "accountability",
    "concept": "accountability",
    "domain": "workplace",
    "scene": "An automated scheduling problem passes between vendor and operator with no role assigned to arrange a remedy or track resolution.",
    "prompt": "Which consequence is plausible from that governance gap?",
    "answer": "Investigation and remedy may stall while responsibility is passed between teams.",
    "wrong": [
      "Dividing technical tasks alone establishes authority for resolving the reported harm.",
      "Referring the complaint to another team demonstrates that a remedy has been completed.",
      "A vendor contract establishes timely incident resolution even without a named remedy owner."
    ],
    "why": "A lack of answerability can block resolution even where teams have narrower assigned technical tasks.",
    "contrast": "The alternatives go beyond the evidence: assigned technical tasks do not by themselves establish remedy authority or a completed response.",
    "extraWrong": "The repeated handoff may itself arrange a timely remedy even though no role has authority to investigate and resolve the issue."
  },
  {
    "id": "nominal-review",
    "mode": "consequence",
    "topic": "accountability",
    "concept": "oversight",
    "domain": "transport",
    "scene": "A dispatch pilot adds a human sign-off but gives reviewers no usable evidence, time or authority for intervention.",
    "prompt": "Which consequence is plausible rather than guaranteed?",
    "answer": "The sign-off may leave important automated errors insufficiently checked.",
    "wrong": [
      "A sign-off establishes that relevant errors are caught before affected actions.",
      "Counting approvals establishes effective intervention without examining the review conditions.",
      "Adding the reviewer role removes the need to test which harmful errors it actually prevents."
    ],
    "why": "Nominal presence is not equivalent to effective review capacity, so errors can still pass through.",
    "contrast": "The alternatives go beyond the evidence: a sign-off count does not establish effective intervention.",
    "extraWrong": "The new sign-off may establish effective intervention even when reviewers cannot inspect evidence or halt the affected dispatch."
  },
  {
    "id": "close-alternative",
    "mode": "consequence",
    "topic": "impacts",
    "concept": "accessibility",
    "domain": "accessibility",
    "scene": "An essential service removes an alternative interaction channel while a known barrier remains in its required AI interface.",
    "prompt": "Which effect on access is directly plausible?",
    "answer": "Some intended users may lose a usable route to the service.",
    "wrong": [
      "The remaining channel’s high average completion rate establishes access for the blocked users.",
      "Low use of the blocked channel establishes that affected people no longer need the service.",
      "Removing the alternative demonstrates that the new interface works with all intended access methods."
    ],
    "why": "A known essential barrier plus removal of a usable alternative can restrict access for affected users.",
    "contrast": "The alternatives go beyond the evidence: an average completion rate does not establish access for people blocked by the required interaction.",
    "extraWrong": "The removed alternative may establish that affected users no longer need the service despite the remaining essential interaction barrier."
  },
  {
    "id": "one-task-promise",
    "mode": "consequence",
    "topic": "impacts",
    "concept": "employment",
    "domain": "creative",
    "scene": "A studio plans worker roles using only the time saved on one automated production task, without examining new duties or transition needs.",
    "prompt": "Which consequence is a plausible planning risk?",
    "answer": "The plan may overlook workload changes and support needs elsewhere in the job.",
    "wrong": [
      "The task-time saving establishes the size of the net employment change.",
      "A faster production step establishes improved whole-job quality for every worker.",
      "Savings on one step establish that transition support is unnecessary for changed roles."
    ],
    "why": "Job-level planning needs evidence beyond one task, including changed duties and transitions.",
    "contrast": "The alternatives go beyond the evidence: task speed alone determines neither job counts nor whole-job effects.",
    "extraWrong": "The faster task may itself establish how gains and transition costs are distributed across the workers whose roles are changing."
  },
  {
    "id": "efficient-but-more-use",
    "mode": "consequence",
    "topic": "impacts",
    "concept": "environment",
    "domain": "environment",
    "scene": "A monitoring service lowers resource use per request, but deployment also increases request volume and leaves lifecycle costs unmeasured.",
    "prompt": "Which conclusion is supported about its total footprint?",
    "answer": "Total resource use remains uncertain until volume and lifecycle costs are considered.",
    "wrong": [
      "A lower per-request cost establishes lower total use despite the unmeasured volume.",
      "More requests establish a harmful net effect without considering conservation benefits.",
      "The per-request comparison establishes a complete lifecycle estimate."
    ],
    "why": "A per-unit improvement and a total change are different quantities, so the net result needs measurement.",
    "contrast": "The alternatives go beyond the evidence: per-request use and total net impact are different comparisons.",
    "extraWrong": "The per-request improvement may itself establish a lower total footprint despite changes in use volume and omitted lifecycle costs."
  },
  {
    "id": "optimize-visible-proxy",
    "mode": "consequence",
    "topic": "impacts",
    "concept": "unintended",
    "domain": "social",
    "scene": "A ranking team optimizes a visible engagement metric while evidence about the intended user task is not included in its success check.",
    "prompt": "Which consequence is plausible?",
    "answer": "The team may reward behavior that raises the proxy without meeting the task goal.",
    "wrong": [
      "An improved engagement score establishes progress on the intended task.",
      "The unmeasured task outcome can be inferred from a more precise proxy estimate.",
      "Evidence about affected users is unnecessary once the proxy is easy to count."
    ],
    "why": "When the proxy and goal can diverge, optimizing only the proxy can miss an unintended downside.",
    "contrast": "The alternatives go beyond the evidence: a more precise proxy measure does not establish progress on an unmeasured goal.",
    "extraWrong": "The higher proxy score may itself establish improvement in the intended user task without adding a measure of that task."
  },
  {
    "id": "omit-recipients",
    "mode": "consequence",
    "topic": "decisions",
    "concept": "stakeholders",
    "domain": "recommendations",
    "scene": "A recommendation assessment includes only the buyer’s gain and omits people affected by the recommended actions.",
    "prompt": "Which consequence is plausible for the assessment?",
    "answer": "Important costs or benefits for affected recipients may remain unmeasured.",
    "wrong": [
      "A gain for the buyer establishes a gain for every affected recipient.",
      "Leaving out recipient outcomes establishes that recipients receive no benefits.",
      "A more precise buyer revenue estimate supplies evidence about the omitted recipient burden."
    ],
    "why": "A missing perspective leaves an incomplete distribution of effects, rather than proving a particular unmeasured outcome.",
    "contrast": "The alternatives go beyond the evidence: a buyer’s gain does not determine the recipients’ outcomes in either direction.",
    "extraWrong": "The buyer’s gain may itself establish the omitted recipients’ benefit despite the absence of evidence about their outcomes."
  },
  {
    "id": "unchecked-summary",
    "mode": "consequence",
    "topic": "decisions",
    "concept": "misinformation",
    "domain": "translation",
    "scene": "A generated translation with an unresolved factual qualification is distributed because its language sounds fluent.",
    "prompt": "Which consequence is a plausible risk?",
    "answer": "Readers may rely on an altered meaning that was not checked against the source.",
    "wrong": [
      "Fluency establishes that the changed qualification preserves the source meaning.",
      "One disputed qualification establishes that the entire translation has no useful content.",
      "Repeating the same generated version supplies independent confirmation of source fidelity."
    ],
    "why": "Plausible wording can spread an unsupported interpretation when factual fidelity has not been verified.",
    "contrast": "The alternatives go beyond the evidence: fluency and repeated generation do not independently verify source fidelity.",
    "extraWrong": "The fluent output may itself resolve the discrepancy with the original source without the team checking the disputed qualification."
  },
  {
    "id": "update-without-retest",
    "mode": "consequence",
    "topic": "decisions",
    "concept": "evaluation",
    "domain": "science",
    "scene": "A research model is updated after its evaluation, but the earlier score is presented as evidence for the updated model in new conditions.",
    "prompt": "Which consequence is a plausible evidence problem?",
    "answer": "The reported score may not describe the updated system’s relevant behavior.",
    "wrong": [
      "The earlier score establishes the updated model’s behavior in the new conditions.",
      "Any version change establishes worse performance on all relevant measures.",
      "A larger updated model establishes that the original test covers its expanded scope."
    ],
    "why": "A version and condition change can limit transfer of earlier evidence without proving that the new model is worse.",
    "contrast": "The alternatives go beyond the evidence: a changed version requires relevant evidence; change alone proves neither improvement nor decline.",
    "extraWrong": "The changed model version may inherit the same relevant evaluation scope without a check of its new behavior and conditions."
  },
  {
    "id": "unverified-impersonation",
    "mode": "consequence",
    "topic": "decisions",
    "concept": "synthetic",
    "domain": "generative",
    "scene": "An organization accepts a realistic generated voice as the only evidence that a person authorized a consequential request. An independent verification route is available.",
    "prompt": "Which risk is directly supported by the verification design?",
    "answer": "An apparent identity may be accepted without checking actual authorization.",
    "wrong": [
      "A realistic match establishes that the represented person approved this specific request.",
      "The possibility of synthetic media establishes that this particular request is fraudulent.",
      "A previously familiar voice removes the need to use the independent authorization route."
    ],
    "why": "Plausible media alone is weak authorization evidence when impersonation is possible.",
    "contrast": "The alternatives go beyond the evidence: realism does not establish authorization, but the possibility of impersonation does not prove this request fraudulent.",
    "extraWrong": "The realistic voice may itself establish the claimed person’s authorization without using the available independent verification route."
  },
  {
    "id": "labels-against-goal",
    "mode": "evidence",
    "topic": "fairness",
    "concept": "history",
    "domain": "hiring",
    "scene": "A hiring team claims its model is fair because it accurately predicts earlier promotion decisions. The concern is whether those decisions reflected relevant qualifications.",
    "prompt": "Which additional evidence most directly tests that concern?",
    "answer": "Compare historical labels with a reviewed qualification-relevant assessment.",
    "wrong": [
      "Measure how closely a second model reproduces the same promotion labels.",
      "Report the total number of earlier decisions without reviewing their meaning.",
      "Compare model agreement with prior promotion decisions while leaving their relation to relevant qualifications unreviewed."
    ],
    "why": "Agreement with past decisions does not establish whether those decisions represented the intended qualification.",
    "contrast": "A second model trained toward the same labels can repeat the target problem rather than test it.",
    "extraWrong": "Compare predictions with an additional set of historical promotion labels while leaving the link to relevant qualifications unchecked."
  },
  {
    "id": "accuracy-versus-fairness",
    "mode": "evidence",
    "topic": "fairness",
    "concept": "criteria",
    "domain": "speech",
    "scene": "A developer claims a speech model treats intended users fairly because its overall test accuracy is high. No fairness criterion or relevant group comparison is provided.",
    "prompt": "Which evidence would best help evaluate the fairness claim?",
    "answer": "Define the relevant criterion and compare appropriate errors across intended groups.",
    "wrong": [
      "Increase the number of repeats of the same overall accuracy calculation.",
      "Compare improvements in aggregate accuracy after adding examples without checking relevant errors for intended groups.",
      "Publish the total recorded audio length without checking user coverage."
    ],
    "why": "A broad average does not determine the distribution or cost of relevant errors.",
    "contrast": "Repeating the average can increase precision about the average while leaving the fairness question unanswered.",
    "extraWrong": "Collect a larger average accuracy estimate without defining the fairness criterion or retaining the relevant group and error distinctions."
  },
  {
    "id": "proxy-validity",
    "mode": "evidence",
    "topic": "fairness",
    "concept": "measurement",
    "domain": "face",
    "scene": "An entry system’s score predicts its camera-quality label well. The stated purpose is assessing behavior rather than camera performance.",
    "prompt": "Which evidence most directly tests whether the label fits the purpose?",
    "answer": "Compare the proxy with a relevant reviewed measure of the intended behavior.",
    "wrong": [
      "Compare two models only on their agreement with the same proxy labels.",
      "Publish a higher overall proxy score without testing the intended behavior.",
      "Evaluate consistency of image-quality labels without examining whether those labels correspond to the intended behavior."
    ],
    "why": "A proxy needs evidence connecting it to the intended quality; predicting the proxy alone does not supply that link.",
    "contrast": "Comparing fit to the same proxy does not test whether the proxy measures behavior.",
    "extraWrong": "Compare prediction consistency across camera versions using only the same suspicion proxy rather than reviewed behavior evidence."
  },
  {
    "id": "costly-errors",
    "mode": "evidence",
    "topic": "fairness",
    "concept": "errors",
    "domain": "healthcare",
    "scene": "A fictional image pilot reports high average accuracy. Reviewers need to know whether a particular intended group bears more costly false alarms.",
    "prompt": "Which evidence most directly answers that question?",
    "answer": "Report relevant false alarms for comparable cases by the affected groups.",
    "wrong": [
      "Report another overall accuracy average with all groups combined.",
      "Measure overall average performance while omitting the specific false-alarm burden for the group under review.",
      "Count the tool’s training examples without separating relevant outcomes."
    ],
    "why": "The question is about a particular error type and who bears it, so the comparison must retain both distinctions.",
    "contrast": "A combined average can conceal the error distribution being investigated.",
    "extraWrong": "Compare overall pilot accuracy before and after a model update without reporting the specified group’s costly false alarms."
  },
  {
    "id": "choice-in-practice",
    "mode": "evidence",
    "topic": "privacy",
    "concept": "consent",
    "domain": "education",
    "scene": "A tutor operator says users have an informed choice about optional model-training use. Its evidence is that a collection notice exists.",
    "prompt": "Which additional evidence most directly tests whether the choice is usable?",
    "answer": "Observe whether users understand the purpose and can separately accept or decline it.",
    "wrong": [
      "Count the notice’s paragraphs without testing the enrollment decision.",
      "Measure model accuracy without examining how optional use is chosen.",
      "Check that the notice is technically available while leaving understanding and the ability to decline untested."
    ],
    "why": "The presence of text does not establish understanding or a practical opportunity to decline the optional purpose.",
    "contrast": "Notice length is not direct evidence that the decision process provides meaningful choice.",
    "extraWrong": "Confirm that the notice was stored and delivered without testing whether optional use can be understood and declined separately."
  },
  {
    "id": "needed-fields",
    "mode": "evidence",
    "topic": "privacy",
    "concept": "minimization",
    "domain": "advertising",
    "scene": "An operator claims every retained event field is necessary for daily placement totals. It has not linked the fields or retention times to that stated task.",
    "prompt": "Which evidence most directly supports reviewing that necessity claim?",
    "answer": "Map each field and retention period to a documented operational need.",
    "wrong": [
      "Compare overall model accuracy without testing whether the task needs each field.",
      "Count the collected fields and assume that a larger set is more necessary.",
      "Ask the collection team which fields it would like to keep without linking retention to the stated daily task."
    ],
    "why": "A purpose-to-field inventory lets reviewers test whether detail and retention are justified by the task.",
    "contrast": "A predictive score can change with extra data without making every field necessary for the stated service.",
    "extraWrong": "Estimate how predictive each extra field might be without assessing whether the stated daily service actually needs to retain it."
  },
  {
    "id": "linkage-test",
    "mode": "evidence",
    "topic": "privacy",
    "concept": "sensitive",
    "domain": "public",
    "scene": "An operator claims a shared dataset is safe because names were removed. Rare combinations may still link records to identifiable people.",
    "prompt": "Which evidence most directly tests the remaining privacy risk?",
    "answer": "Assess re-identification through the released combinations and relevant outside records.",
    "wrong": [
      "Check only whether the column labeled name is absent from the file.",
      "Report the model’s overall task score without examining the released fields.",
      "Review only the direct identifiers while leaving linkage through rare combinations untested."
    ],
    "why": "Identification can depend on combinations and linkage, not just a name column.",
    "contrast": "Absence of a named field does not test whether a distinctive pattern can identify someone.",
    "extraWrong": "Check that direct names were deleted while leaving rare combinations and relevant outside-linkage records outside the assessment."
  },
  {
    "id": "access-test",
    "mode": "evidence",
    "topic": "privacy",
    "concept": "security",
    "domain": "security",
    "scene": "A vendor says an AI retrieval tool protects confidential records because its interface displays a security badge. Its credential scope has not been evaluated.",
    "prompt": "Which evidence most directly tests the stated access protection?",
    "answer": "Check permissions and bounded access tests against the approved retrieval task.",
    "wrong": [
      "Measure how prominently the security badge appears in the interface.",
      "Report response fluency without testing the tool’s allowed record access.",
      "Compare ordinary response accuracy while leaving the tool’s access outside its approved retrieval scope untested."
    ],
    "why": "Permission inspection and bounded tests examine whether the tool can reach records outside its task.",
    "contrast": "A badge describes a claim, not evidence that access boundaries work.",
    "extraWrong": "Compare ordinary response accuracy across models without examining whether the operational credential permits access beyond the approved task."
  },
  {
    "id": "checkable-reason",
    "mode": "evidence",
    "topic": "accountability",
    "concept": "explanation",
    "domain": "banking",
    "scene": "A fictional decision tool claims its explanation helps affected people identify wrong source information. It provides a long general description of the model.",
    "prompt": "Which evidence most directly tests the claimed benefit?",
    "answer": "Test whether people can connect case reasons to relevant mistakes in their records.",
    "wrong": [
      "Measure description length without testing whether users can check their case.",
      "Publish a list of model features without evaluating individual understanding.",
      "Evaluate a general model description with technical staff rather than checking affected users’ case understanding."
    ],
    "why": "An explanation’s intended benefit is case understanding, which can be evaluated on that task.",
    "contrast": "A longer description can still fail to connect a reason to the person’s actual record.",
    "extraWrong": "Ask technical developers whether the explanation sounds complete without testing whether affected people can check an error in their own case."
  },
  {
    "id": "notice-understood",
    "mode": "evidence",
    "topic": "accountability",
    "concept": "transparency",
    "domain": "service",
    "scene": "An operator claims customers understand where automation is used and what its limits are. The relevant notice is hard to find.",
    "prompt": "Which evidence most directly evaluates that claim?",
    "answer": "Check whether intended users find and understand the relevant point-of-use information.",
    "wrong": [
      "Count the notice’s technical words without testing understanding or access.",
      "Report the total number of generated responses without examining disclosure.",
      "Collect satisfaction ratings from current users without checking whether the relevant automation notice was understood."
    ],
    "why": "Transparency’s practical effect depends on whether relevant information reaches and is understood by affected people.",
    "contrast": "Text counts do not establish whether users can locate or understand the needed information.",
    "extraWrong": "Confirm that a notice exists in the vendor’s documentation without checking whether intended customers encounter and understand it."
  },
  {
    "id": "appeal-effective",
    "mode": "evidence",
    "topic": "accountability",
    "concept": "appeal",
    "domain": "workplace",
    "scene": "A scheduling service reports that many complaints were submitted and calls this proof of effective contestability. Review and correction outcomes are not reported.",
    "prompt": "Which evidence most directly tests whether the appeal route works?",
    "answer": "Track usable review, relevant corrections and timely outcomes for disputed cases.",
    "wrong": [
      "Count complaint submissions alone without examining what happens afterward.",
      "Publish another copy of the complaint link without reviewing response outcomes.",
      "Survey general satisfaction without checking whether an individual appeal can correct the disputed source record."
    ],
    "why": "A functioning appeal is about what people can submit and obtain, not just the number entering a queue.",
    "contrast": "Many complaints can coexist with ineffective review or no useful correction.",
    "extraWrong": "Count messages arriving at the complaint channel without examining whether disputed data can be corrected through timely review."
  },
  {
    "id": "oversight-effective",
    "mode": "evidence",
    "topic": "accountability",
    "concept": "oversight",
    "domain": "transport",
    "scene": "A dispatch tool is described as safe because every recommendation has a human sign-off. The review conditions and interventions have not been evaluated.",
    "prompt": "Which evidence most directly evaluates the oversight claim?",
    "answer": "Audit reviewer capacity, relevant evidence and successful interventions on known failures.",
    "wrong": [
      "Count approval clicks alone without examining reviewers’ ability to intervene.",
      "Measure the number of names displayed beside approvals instead of review effects.",
      "Report general satisfaction without examining the stated failure mode."
    ],
    "why": "Effective oversight needs the capacity and authority to act, plus evidence that interventions work for relevant failures.",
    "contrast": "Click counts establish that a step occurred, not that it provided meaningful review.",
    "extraWrong": "Compare numbers of approval clicks before and after deployment without checking reviewer capacity or actual interventions on known failures."
  },
  {
    "id": "access-demonstration",
    "mode": "evidence",
    "topic": "impacts",
    "concept": "accessibility",
    "domain": "accessibility",
    "scene": "A service claims broad accessibility because its developers could complete the task. Intended users with assistive input needs were not included.",
    "prompt": "Which evidence most directly tests the accessibility claim?",
    "answer": "Evaluate essential tasks with affected users and their supported access methods.",
    "wrong": [
      "Repeat the developers’ successful task run without changing the user conditions.",
      "Report training-data volume instead of testing the required interactions.",
      "Survey successful current users without testing the access methods omitted from the earlier evaluation."
    ],
    "why": "Accessibility depends on actual use under relevant access needs, not only the developers’ successful interaction.",
    "contrast": "Repeating the same developer conditions does not evaluate the missing user conditions.",
    "extraWrong": "Repeat the successful developer workflow and use its average completion time as evidence for access methods omitted from the original test."
  },
  {
    "id": "job-effects",
    "mode": "evidence",
    "topic": "impacts",
    "concept": "employment",
    "domain": "creative",
    "scene": "A studio claims automation improved all affected jobs because one production step became faster. It has not measured duties, workload or transitions.",
    "prompt": "Which evidence most directly evaluates the broader employment claim?",
    "answer": "Examine changed tasks, job quality, workload and transition outcomes with affected workers.",
    "wrong": [
      "Repeat the task-speed measurement and treat it as the whole employment outcome.",
      "Measure only model size instead of studying the changed work.",
      "Measure another production step without studying workload, transitions or distribution of gains."
    ],
    "why": "A whole-job claim needs evidence about work and distribution of effects beyond the task-time result.",
    "contrast": "Task speed is relevant to efficiency but insufficient for all job-level outcomes.",
    "extraWrong": "Collect a more precise task-speed estimate without examining changed duties, worker experiences or transition outcomes in whole jobs."
  },
  {
    "id": "net-footprint",
    "mode": "evidence",
    "topic": "impacts",
    "concept": "environment",
    "domain": "environment",
    "scene": "A monitoring project claims a lower total footprint from a per-request efficiency result. It has not measured use volume or full lifecycle costs.",
    "prompt": "Which evidence most directly evaluates the total-footprint claim?",
    "answer": "Compare total use and lifecycle costs with a relevant baseline and measured benefits.",
    "wrong": [
      "Repeat only the per-request measurement without measuring how many requests occur.",
      "Report the model’s task accuracy as a substitute for resource measurements.",
      "Compare per-request resource use with an earlier version while excluding changes in total activity and hardware costs."
    ],
    "why": "A total comparison needs actual activity and relevant costs and benefits, rather than a single per-unit measure.",
    "contrast": "Per-request efficiency does not determine the total when volume and other costs may differ.",
    "extraWrong": "Compare the resource use of a single prediction between versions without measuring actual use volume, lifecycle costs and relevant benefits."
  },
  {
    "id": "whose-benefit",
    "mode": "evidence",
    "topic": "impacts",
    "concept": "stakeholders",
    "domain": "social",
    "scene": "A ranking service claims success for everyone because the buyer’s revenue improved. The people receiving the ranked content were not included in the evaluation.",
    "prompt": "Which evidence most directly tests the missing part of that claim?",
    "answer": "Evaluate recipient outcomes, burdens and alternatives alongside the buyer’s gain.",
    "wrong": [
      "Repeat the buyer’s revenue comparison without collecting recipient outcomes.",
      "Ask only the sales team whether the buyer’s goal was met.",
      "Report output volume without distinguishing who receives benefits or costs."
    ],
    "why": "The universal stakeholder claim needs evidence from the omitted affected group.",
    "contrast": "A stronger estimate of the buyer’s gain still does not establish the recipient’s experience.",
    "extraWrong": "Ask only the purchasing team whether its revenue goal was met without evaluating outcomes for the recipients of the ranked content."
  },
  {
    "id": "causal-goal",
    "mode": "evidence",
    "topic": "decisions",
    "concept": "unintended",
    "domain": "recommendations",
    "scene": "A recommender’s users click more and also score better on a task, but users selected whether to try it. The developer claims the recommender caused the improvement.",
    "prompt": "Which additional evidence would best test the causal claim?",
    "answer": "Use an appropriate controlled comparison of the intended task outcome.",
    "wrong": [
      "Collect more voluntary-user observations while leaving the selection difference unexamined.",
      "Report clicks alone instead of the task outcome the claim concerns.",
      "Use the model’s generated explanation as confirmation that it caused the observed improvement."
    ],
    "why": "A suitable comparison can address competing explanations such as who chose to use the tool.",
    "contrast": "More of the same self-selected observations may retain the confounding rather than test causation.",
    "extraWrong": "Collect more observations only from people choosing to try the tool without addressing the selection difference or measuring a controlled comparison."
  },
  {
    "id": "source-fidelity",
    "mode": "evidence",
    "topic": "decisions",
    "concept": "misinformation",
    "domain": "translation",
    "scene": "A generated translation sounds confident but disagrees with an important qualification in its source. The goal is checking the meaning before distribution.",
    "prompt": "Which evidence best addresses the actual discrepancy?",
    "answer": "Compare the disputed meaning with the source using an appropriate qualified review.",
    "wrong": [
      "Repeat the same model’s answer and treat consistency as external confirmation.",
      "Measure how fluent readers find the wording without checking source meaning.",
      "Compare the output with other generated versions while leaving the original source qualification unchecked."
    ],
    "why": "The disputed content needs evidence tied to the original meaning rather than confidence or style.",
    "contrast": "Repeated generation is not independent verification of what the source says.",
    "extraWrong": "Ask the same model for a second fluent translation and treat its agreement as verification of the source qualification in dispute."
  },
  {
    "id": "expand-pilot",
    "mode": "evidence",
    "topic": "decisions",
    "concept": "deployment",
    "domain": "science",
    "scene": "A bounded research pilot performs acceptably in its test conditions. The team proposes wider use with consequences outside those conditions.",
    "prompt": "Which evidence best supports deciding whether to expand?",
    "answer": "Evaluate the new conditions, failure safeguards, monitoring and fallback against the stated risks.",
    "wrong": [
      "Reuse the bounded pilot’s score without checking the wider conditions.",
      "Report the proposed audience size instead of evaluating risks in that audience.",
      "Publish the deployment date before testing the changed operating boundary."
    ],
    "why": "A scope expansion needs evidence about its new exposure and how relevant failures can be handled.",
    "contrast": "A bounded pilot is useful evidence, but its score does not establish readiness outside the tested scope.",
    "extraWrong": "Repeat the bounded pilot’s evaluation and present it as evidence of readiness without checking conditions and safeguards for wider use."
  },
  {
    "id": "permission-record",
    "mode": "evidence",
    "topic": "decisions",
    "concept": "rights",
    "domain": "generative",
    "scene": "A team must document permission for the intended distribution of AI-assisted assets. Its current evidence shows where the assets were found, not the applicable reuse terms.",
    "prompt": "Which evidence most directly addresses the project’s requirement?",
    "answer": "Verify applicable permission, intended-use scope and required attribution records.",
    "wrong": [
      "Record the source URL alone without checking its applicable reuse conditions.",
      "Compare generation speed without examining permission for the intended distribution.",
      "Count how many other sites display the asset without checking their permissions."
    ],
    "why": "The explicit project rule concerns permitted use and its conditions, not mere discoverability.",
    "contrast": "A source location is helpful provenance but does not by itself establish permission for the intended use.",
    "extraWrong": "Archive the asset’s public source URL and list of other uses without verifying permission for this project’s intended distribution."
  }
];
