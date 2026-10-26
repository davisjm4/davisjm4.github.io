// Versioned canonical map. Create preparation reuses these IDs; it never doubles evidence.
export const MAP_VERSION = 1;
export const SOURCES = {
  reviewed: '2026-10-25',
  ced: 'https://apcentral.collegeboard.org/pdf/ap-computer-science-principles-course-and-exam-description.pdf',
  task: 'https://apcentral.collegeboard.org/media/pdf/ap-csp-student-task-directions.pdf',
  exam: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam'
};
export const BIG_IDEAS = ['Creative Development','Data','Algorithms and Programming','Computer Systems and Networks','Impact of Computing'];
// ID suffix | Big Idea | topic | display name | description | CED anchor | games | limits
const rows = `
PURPOSE|1|Purpose and function|Explain program purpose|Identify the problem or goal a program addresses.|1.2 CRD-2.A|vocabulary-fill-in-lab,mixed-ap-practice|Structured explanations supplement independent writing.
FUNCTION|1|Purpose and function|Explain program function|Trace what a program does and connect its behavior to its purpose.|1.2 CRD-2.B|test-case-builder,response-builder,create-task-lab|
INPUT|1|Input and output|Identify program input|Identify instructions receiving user, device, stream or file input.|1.2 CRD-2.C|create-task-lab,vocabulary-fill-in-lab|
OUTPUT|1|Input and output|Identify program output|Identify instructions producing visual, textual, audible or tactile output.|1.2 CRD-2.D|create-task-lab,vocabulary-fill-in-lab|
DEVELOPMENT|1|Design and development|Use an iterative development process|Relate investigation, design, implementation, testing and revision.|1.3 CRD-2.E|vocabulary-fill-in-lab,mixed-ap-practice|Vocabulary and scenarios only; authentic project development is not assessed.
COLLABORATION|1|Design and development|Explain collaboration|Explain communication, shared work and responsible collaboration.|1.1 CRD-1.A|vocabulary-fill-in-lab,mixed-ap-practice|Recognition only; actual collaboration is not assessed.
DESIGN|1|Design and development|Design for a user|Connect program and interface design to a user's needs.|1.3 CRD-2.F|vocabulary-fill-in-lab|Vocabulary only; original design requires a project.
DOCUMENTATION|1|Design and development|Explain code through documentation|Describe the purpose and use of a program or code segment.|1.3 CRD-2.G|vocabulary-fill-in-lab,response-builder|Original documentation is not assessed.
TESTING|1|Errors and testing|Select test cases and expected results|Choose normal, boundary, branch and edge inputs to check correctness.|1.4 CRD-2.J|test-case-builder,response-builder|
DEBUGGING|1|Errors and testing|Find and explain errors|Distinguish intended from actual behavior and identify a correction.|1.4 CRD-2.I|test-case-builder,vocabulary-fill-in-lab|
BINARY|2|Representation|Represent numbers in binary|Use bit place values to convert unsigned binary and decimal numbers.|2.1 DAT-1.C|binary-builder|
CAPACITY|2|Representation|Reason about bits and capacity|Distinguish number of bit patterns from the largest represented value.|2.1 DAT-1.A–B|binary-builder|
RGB|2|Representation|Represent RGB colors in binary and hex|Build red, green and blue channel values with bits or hex digits.|2.1 DAT-1.A (supporting context)|rgb-color-builder|Hex color notation is a supporting representation context, not a separate required AP skill.
REPRESENTATION|2|Representation|Explain binary data representations|Explain how bits encode images, characters and other data.|2.1 DAT-1.A|binary-builder,vocabulary-fill-in-lab|
CHARACTERS|2|Representation|Explain character encoding|Connect characters, numeric codes, bytes and binary patterns.|2.1 DAT-1.A (supporting context)|ascii-binary-builder|ASCII is a supporting example; memorizing its table is not required.
ANALOG|2|Representation|Distinguish analog and digital data|Recognize continuous quantities, discrete values, sampling and conversion.|2.1 DAT-1.A|analog-digital-lab|
NUMERIC|2|Representation|Distinguish roundoff and overflow|Separate limited precision from limited numerical range.|2.1 DAT-1.B|roundoff-overflow-lab,binary-builder|
COMPRESSION|2|Compression|Choose lossless or lossy compression|Use fidelity and exact reconstruction requirements to choose a method.|2.2 DAT-1.D|lossless-lossy-lab,compression-challenge|
ANALYSIS|2|Data and information|Extract information from data|Read tables, find patterns and interpret what evidence supports.|2.3 DAT-2.A–C|data-detective|
VISUALIZATION|2|Data and information|Choose and interpret visualizations|Use appropriate graphs and understand axes, values and relationships.|2.3 DAT-2.D–E|data-detective|
TRANSFORM|2|Data and information|Transform data and recognize limitations|Explain cleaning, metadata, missing data and limits on conclusions.|2.4 DAT-2.F–H|data-detective,vocabulary-fill-in-lab|
VARIABLES|3|State and expressions|Trace variables and assignment|Distinguish assignment, values and changing program state.|3.1 AAP-1.A–C|code-concepts,algorithm-architect|
EXPRESSIONS|3|State and expressions|Evaluate expressions and strings|Evaluate arithmetic, relational and string expressions in context.|3.3–3.5 AAP-2.C–F|code-concepts,vocabulary-fill-in-lab|Broader string manipulation has limited practice.
BOOLEAN|3|Selection|Interpret Boolean expressions|Evaluate comparisons, AND, OR and NOT.|3.5 AAP-2.E–F|boolean-gatekeeper,code-concepts|
SELECTION|3|Selection|Trace conditional branches|Predict IF and IF/ELSE behavior, including nested decisions.|3.6–3.7 AAP-2.G–I|algorithm-architect,code-concepts,create-task-lab|
ITERATION|3|Iteration|Trace loops and stopping conditions|Predict repetition counts, loop effects and stopping behavior.|3.8 AAP-2.J–K|algorithm-architect,code-concepts,create-task-lab|
SEQUENCE|3|Algorithms|Sequence an algorithm|Explain how instruction order changes state and results.|3.9 AAP-2.M|algorithm-architect,algorithm-dance-lab|
ALGORITHMS|3|Algorithms|Compare and modify algorithms|Compare behavior and meaningful use of control structures.|3.9 AAP-2.L–M|trivial-nontrivial,algorithm-architect|
LISTS|3|Lists and abstraction|Use lists and list operations|Trace one-based indices, insertion, removal and traversal.|3.2, 3.10 AAP-1.D, AAP-2.N–O|list-lab,code-concepts,create-task-lab|
DATA-ABSTRACTION|3|Lists and abstraction|Explain how lists manage complexity|Explain storage and use of a collection in fulfilling a program's purpose.|3.2 AAP-1.D|response-builder,create-task-lab|Structured choices do not demonstrate original abstraction design.
SEARCH|3|Algorithms|Explain binary search|Narrow a sorted search interval and explain its precondition.|3.11 AAP-2.P|binary-search-hunt|
PROCEDURES|3|Procedures|Interpret procedure definitions and calls|Identify definitions, calls, return values and reusable behavior.|3.12–3.13 AAP-3.A–C|code-concepts,algorithm-architect,create-task-lab|
PARAMETERS|3|Procedures|Distinguish parameters and arguments|Connect declared parameters to supplied argument values and effects.|3.12–3.13 AAP-3.A–C|code-concepts,create-task-lab|
PROCEDURAL-ABSTRACTION|3|Procedures|Explain procedural abstraction|Explain how reusable procedures reduce repeated code and complexity.|3.13 AAP-3.B|response-builder,create-task-lab|
LIBRARIES|3|Procedures|Explain libraries and APIs|Recognize how existing procedures support program development.|3.14 AAP-3.D|vocabulary-fill-in-lab|Vocabulary recognition only.
RANDOM|3|Models and limits|Reason about random values|Interpret random choices and repeated trials.|3.15 AAP-3.E|simulation-lab|
SIMULATION|3|Models and limits|Explain simulations and limitations|Relate a model's assumptions, parameters and outputs to its limits.|3.16 AAP-3.F|simulation-lab|
EFFICIENCY|3|Models and limits|Compare algorithm efficiency|Compare work under a stated step model and recognize growth limits.|3.17 AAP-4.A|algorithm-race,vocabulary-fill-in-lab|Broader growth models need additional instruction.
UNDECIDABLE|3|Models and limits|Distinguish undecidable from inefficient|Explain why some decision problems have no general algorithm.|3.18 AAP-4.B|vocabulary-fill-in-lab,mixed-ap-practice|Recognition only.
SYSTEMS|4|Systems and protocols|Explain computing systems and networks|Identify devices, links, switches, routers and communication roles.|4.1 CSN-1.A|internet-layers-lab,vocabulary-fill-in-lab|
PROTOCOLS|4|Systems and protocols|Explain Internet protocol roles|Distinguish agreed communication rules and application versus transport roles.|4.1 CSN-1.B–C|internet-layers-lab|
IP|4|Systems and protocols|Explain IP addressing and routing|Explain destination addresses and best-effort forwarding.|4.1 CSN-1.C–D|internet-layers-lab,packet-router|
DNS|4|Systems and protocols|Explain DNS|Distinguish domain-name lookup from routing and delivery.|4.1 CSN-1.C|internet-layers-lab|
TRANSPORT|4|Systems and protocols|Choose TCP or UDP by requirements|Distinguish reliability, ordering and latency; account for application protocols.|4.1 CSN-1.C|tcp-udp-lab,internet-layers-lab|Some modern-protocol scenarios are enrichment.
PACKETS|4|Routing and resilience|Explain packet switching|Reason about packet paths, order and reassembly responsibilities.|4.1 CSN-1.C–D|internet-layers-lab,packet-router|
RESILIENCE|4|Routing and resilience|Analyze routing and fault tolerance|Find alternate routes and identify what failures redundancy can withstand.|4.2 CSN-1.E|network-breaker,packet-router,internet-layers-lab|
PARALLEL|4|Parallel and distributed computing|Compare parallel and sequential work|Reason about task distribution, dependencies, finishing time and speedup limits.|4.3 CSN-2.A–B|parallel-processing-race,vocabulary-fill-in-lab|Distributed communication overhead has limited practice.
SECURE-NETWORKS|4|Systems and protocols|Explain secure communication|Distinguish encryption and authenticated communication from transport delivery.|5.6 IOC-2.B (cross-cutting)|internet-layers-lab,cybersecurity-defender|Security is officially in Big Idea 5; this is a network application view.
IMPACTS|5|Computing innovations|Analyze beneficial and harmful impacts|Explain intended and unintended effects for different stakeholders.|5.1 IOC-1.A–B|ai-ethics-lab,computing-impact-lab|
DIVIDE|5|Access and equity|Analyze the digital divide|Identify meaningful-access barriers and evaluate realistic responses.|5.2 IOC-1.C|digital-divide-lab,computing-impact-lab|
BIAS|5|Access and equity|Investigate algorithmic and data bias|Use evidence about design, data and outcomes to evaluate bias claims.|5.3 IOC-1.D|ai-ethics-lab,computing-impact-lab|
CROWD|5|Computing innovations|Explain crowdsourcing|Analyze contributions, validation and limits of collective work.|5.4 IOC-1.E|computing-impact-lab,vocabulary-fill-in-lab|
RIGHTS|5|Responsible computing|Apply copyright, Creative Commons and IP concepts|Use stated permissions, attribution and license conditions when reusing work.|5.5 IOC-1.F|copyright-creative-commons-lab,computing-impact-lab,vocabulary-fill-in-lab|Dedicated scenario decisions practice permissions and uncertainty; they do not establish real-world legal clearance.
ETHICS|5|Responsible computing|Evaluate AI ethics and responsible computing|Use evidence to reason about oversight, transparency, accountability and trade-offs.|5.1, 5.3, 5.5 IOC-1.A–F|ai-ethics-lab,computing-impact-lab|AI scenarios apply broader AP concepts; they are not a separate AP Big Idea.
PRIVACY|5|Privacy and security|Evaluate privacy and consent|Reason about data collection, consent, sharing and personal information.|5.6 IOC-2.A|ai-ethics-lab,computing-impact-lab,cybersecurity-defender|
SECURITY|5|Privacy and security|Choose safe computing practices|Evaluate phishing evidence, credentials, MFA and security protections.|5.6 IOC-2.B–C|cybersecurity-defender,vocabulary-fill-in-lab|
PPR|3|Create task concepts|Select appropriate PPR evidence|Recognize procedure/call and list storage/use evidence without comments or course content.|Create student handouts|create-task-lab|Concept practice only; the student must create an individual PPR from their own program.
STUDENT-PROCEDURE|3|Create task concepts|Recognize student-developed procedure requirements|Identify a procedure with an effective parameter and sequencing, selection and iteration in its body.|Create student handouts|create-task-lab|Built-in procedures, main methods and event handlers do not satisfy the student-developed procedure requirement.
`;
const recognitionOnly=new Set(['PURPOSE','INPUT','OUTPUT','DEVELOPMENT','COLLABORATION','DESIGN','DOCUMENTATION','DATA-ABSTRACTION','PROCEDURAL-ABSTRACTION','LIBRARIES','UNDECIDABLE','CROWD','RIGHTS','PPR','STUDENT-PROCEDURE']);
export const SKILLS = rows.trim().split('\n').map(line => {
  const [key,bigIdea,topic,name,description,anchor,games,limit] = line.split('|');
  return {evidenceSupport:recognitionOnly.has(key)?'estimated':'direct',id:`CSP-${key}`,bigIdea:Number(bigIdea),topic,name,description,anchor,games:games.split(','),limit:limit||'',mappingRationale:'Games offer complementary bounded practice for this skill; only the scored question mapping contributes evidence.'};
});
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s=>[s.id,s]));
export const CREATE_SKILLS = ['PURPOSE','FUNCTION','INPUT','OUTPUT','DESIGN','DOCUMENTATION','TESTING','DEBUGGING','LISTS','DATA-ABSTRACTION','PROCEDURES','PARAMETERS','PROCEDURAL-ABSTRACTION','SEQUENCE','SELECTION','ITERATION','ALGORITHMS','STUDENT-PROCEDURE','PPR'].map(k=>'CSP-'+k);
