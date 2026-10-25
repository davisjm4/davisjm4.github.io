import {TERMS,TOPICS} from './catalog.js?v=vocab-v1';
export const FAMILIES=[];
function f(term,id,structure,tail,cases,why,distractors,topic=TERMS[term].topic){FAMILIES.push({id,term,structure,tail,cases,why,distractors:distractors.split(' '),topic,big:TOPICS[topic].big,objective:TERMS[term].objective});}
const code=(scene,source)=>({scene,code:source});
// Big Idea 1: 30 distinct purpose/development/testing relationships.
f('purpose','need-not-steps','C','The underlying goal is the program’s ____.',[
'A route app exists to help visitors reach accessible entrances.',
'A library tool was created so readers can locate available books.',
'A reminder app aims to reduce missed medication times.',
'A shelter tool aims to reunite lost animals with their owners.'
],'These statements describe the need being addressed, rather than the implementation steps.','function input output documentation');
f('function','actions-not-goal','B','These operations describe the program’s ____.',[
'A tool takes a list of scores, sorts them, then displays the highest three.',
'A scheduler compares an appointment time with the current time and sends an alert.',
'A map tool filters locations by distance and draws the remaining points.',
'A converter multiplies a stored distance by a conversion factor and displays the result.'
],'The evidence describes what the software does, not the broader reason someone wants it.','purpose input output documentation');
f('input','data-entering','F','The data entering the program are its ____.',[
'A user taps a location that a map then processes.',
'A microphone supplies a recording to a speech tool.',
'A light sensor sends a measurement into a controller.',
'Another program sends a list of orders for a service to process.'
],'The direction is into the program; a response sent out would have the opposite role.','output variable parameter return');
f('output','data-leaving','F','The data sent from the program are its ____.',[
'A navigation app sends spoken directions to a speaker.',
'A game sends a vibration pattern to a controller.',
'A report generator sends a chart to a display.',
'A controller sends a movement command to a motor device.'
],'The program is producing data for a recipient, rather than receiving it for processing.','input variable argument parameter');
f('behavior','observed-execution','G','These observed execution effects describe program ____.',[
'With an empty list, an app shows a message and does not open a chart.',
'When a valid card is scanned, a gate opens and logs the entry.',
'Changing the current score causes a game to show a new badge.',
'Pressing Cancel closes a dialog without saving the edited values.'
],'The question concerns what actually happens for inputs and state, not design intent or comments.','purpose documentation development user-experience');
f('development','whole-process','A','The overall process described is ____.',[
'A team investigates a need, designs screens, writes code and evaluates the result.',
'Creators research users, make a prototype, implement features and assess whether they work.',
'A group moves from a problem description to a tested software artifact.',
'A designer plans an app, implements its interactions and gathers feedback for improvement.'
],'This spans multiple phases; checking cases or fixing a fault is only one part of the whole process.','testing debugging documentation collaboration');
f('iterative-development','revise-from-feedback','E','The repeated build–evaluate–revise cycle is ____.',[
'Users cannot find a Save control, so the team changes it and tests the revision again.',
'A prototype is tried with readers, revised after feedback and tried again.',
'A team evaluates each small release and adjusts the next version based on results.',
'A game mechanic is played, redesigned from observations and played again.'
],'The cycle revisits decisions using evidence; it is not simply a loop running inside the finished app.','iteration testing debugging documentation');
f('collaboration','shared-contribution','B','The shared work described is ____.',[
'Two developers discuss alternatives and combine their different ideas into a design.',
'One student reviews another’s code and they agree on revisions together.',
'A remote team shares a prototype and uses members’ feedback to improve it.',
'A group divides tasks, communicates dependencies and integrates the resulting work.'
],'People exchange contributions toward a common result; sharing a file alone would not establish that.','automation testing documentation decomposition');
f('documentation','explain-for-readers','F','The explanatory material is ____.',[
'A developer writes comments explaining why a procedure handles an empty list.',
'A project includes a guide explaining how to run its program.',
'A team records each procedure’s purpose and expected inputs for future maintainers.',
'A README explains setup requirements and how another person can use the app.'
],'The material explains software to people; it does not itself execute the described operations.','algorithm call input testing');
f('user-experience','ease-in-use','H','The team is examining ____.',[
'New visitors struggle to find the checkout button despite all calculations being correct.',
'A form’s unclear labels cause people to abandon a task.',
'A teacher checks whether students can complete an app task without confusing navigation.',
'A game’s controls are technically functional, but players find the interaction frustrating.'
],'The concern is the person’s experience of using the interface, beyond whether a calculation is correct.','efficiency testing cybersecurity purpose');
f('testing','compare-expected','B','Comparing actual results with expected results is ____.',[
'A developer runs an empty-list input and checks for the required message.',
'A team enters known scores and compares the computed average with a trusted result.',
'A student tries both sides of a condition and checks which branch executes.',
'A developer runs a saved example after a change to see whether expected behavior still holds.'
],'These actions assess behavior against expectations; correcting a discovered cause is a different step.','debugging documentation development collaboration');
f('debugging','repair-a-cause','E','Locating and correcting the cause is ____.',[
'A student finds that a total is reset inside a loop, then moves the reset before it.',
'A team traces an incorrect branch to a reversed comparison and repairs it.',
'A developer finds an off-by-one position and changes the collection access.',
'A programmer traces a crash to a zero divisor and adds appropriate handling.'
],'The defining action is finding and repairing a cause, rather than merely observing a failed case.','testing documentation analysis development');
f('test-case','input-and-expectation','A','Each input together with its expected behavior is called ____.',[
'Input 0 should cause the program to display “No items.”',
'An empty name should cause a form to request a value.',
'The list [2, 4] should produce a total of 6.',
'A score equal to the passing threshold should produce “Pass.”'
],'A specific input and expected result make a check reproducible; an error category does not describe that pair.','parameter argument condition logic-error');
f('boundary-case','edge-check','C','This specifically chosen edge check is called ____.',[
'A rule accepts ages at least 13; a developer checks 12, 13 and 14.',
'A field permits up to 10 items; a developer checks lengths 9, 10 and 11.',
'A discount starts at 50 dollars; a developer checks values just below, at and above 50.',
'A game ends at zero lives; a developer tests one life, zero lives and the transition between them.'
],'The inputs target a threshold where behavior changes, rather than arbitrary ordinary values.','variable parameter condition runtime-error');
f('logic-error','valid-but-wrong','E','The fault in the intended decision is called ____.',[
'A passing score should be at least 60, but valid code checks score > 60.',
'A total should include every item, but valid code skips the last element.',
'A program executes successfully but subtracts a deposit from the balance.',
'A program executes an incorrect formula for the area and shows the wrong result.'
],'The instructions are valid and run, but their meaning does not implement the intended task.','syntax-error runtime-error overflow roundoff');
f('runtime-error','fails-during-run','E','The execution-time failure is called ____.',[
'Valid code starts, then the stated system reports an invalid list access.',
'A program begins normally, but the stated environment reports division by zero.',
'A running app cannot read a required file and the environment raises an error.',
'A running program reaches an unavailable device and the specified system reports failure.'
],'The scenario explicitly places the reported failure during execution; it does not assume all environments handle it identically.','syntax-error logic-error overflow roundoff');
f('syntax-error','grammar-violation','A','The language-rule violation is called ____.',[
'A parser rejects code because a required closing brace is missing.',
'A language rejects a malformed assignment before the program can execute.',
'The stated language requires a closing parenthesis, and the parser reports it missing.',
'A source file uses a token sequence the language grammar does not permit.'
],'The code fails language grammar rules; the problem is not a valid algorithm choosing the wrong action.','logic-error runtime-error overflow roundoff');
f('purpose','same-goal-different-implementations','H','The shared need addressed by the different implementations is their program’s ____.',[
'One route tool speaks directions and another draws them; both aim to help visitors reach an entrance.',
'One reminder uses sound and another uses text; both aim to reduce missed appointments.',
'Two differently implemented library tools both aim to help readers find available books.',
'One tool scans tags and another accepts typed codes; both aim to reunite lost animals with owners.'
],'Different operations and interfaces can address the same underlying need; the shared goal is distinct from the implementation.','function input output user-experience');
f('function','mechanism-vs-benefit','C','The mechanism, rather than the hoped-for benefit, describes ____.',[
'Helping readers is the goal; filtering titles by availability describes what the app does.',
'Reducing missed trips is the goal; comparing a departure time and sending a notice describes the operations.',
'Helping shelters is the goal; matching tag numbers to records describes the implemented task.',
'Saving energy is the goal; comparing readings and switching a relay describes the program’s actions.'
],'A hoped-for benefit is a purpose; the described operational mechanism is what the program does.','purpose input output documentation');
f('input','event-supplies-data','D','The event supplies program ____.',[
'Clicking a point sends its coordinates to a drawing tool.',
'Pressing a key sends the key identity to a game.',
'Moving a control sends its new setting to a sound program.',
'Starting a timer sends a start event to the scheduling code.'
],'The event provides data that can affect later processing; it is not the resulting sound or screen response.','output return parameter variable');
f('output','nonscreen-response','G','The response sent to the device is ____.',[
'A navigation program issues a spoken instruction instead of a visible message.',
'A game produces a tactile pulse rather than text.',
'A controller sends a command that turns on a warning light.',
'A music tool sends generated notes to an audio device.'
],'Program results need not be text on a screen; audio, tactile and device data can have this role.','input argument parameter condition');
f('iterative-development','feedback-not-program-loop','G','The development approach is ____.',[
'A designer revises the interface after each usability session; the app itself has no repeating block.',
'A team repeatedly adjusts prototypes after teacher feedback, without describing code repetition.',
'A developer evaluates successive versions and revisits earlier design decisions.',
'A group’s repeated evaluations lead to new designs rather than repeated instructions in one run.'
],'The repetition belongs to the development process, not necessarily to a loop in the software.','iteration sequencing automation testing');
f('documentation','credit-and-maintenance','B','The notes accompanying the source are ____.',[
'A maintainer explains a procedure’s assumptions next to its definition.',
'A team records which external code segments were adapted and why.',
'A guide explains what each configuration setting controls.',
'A project includes written usage instructions for future teams.'
],'These descriptions support understanding, maintenance and attribution; they are not procedure invocations.','call algorithm testing input');
f('collaboration','resolve-design-disagreement','H','Working through the alternatives together demonstrates ____.',[
'Team members compare evidence about two designs and agree on a revision.',
'A reviewer identifies a concern, and the original author discusses and improves the solution.',
'Partners ask clarifying questions and combine useful parts of their proposals.',
'A group listens to different user perspectives before jointly choosing a design.'
],'The evidence is constructive shared decision-making, not just independent work performed nearby.','documentation decomposition automation testing');
f('test-case','expected-output-specified','F','The paired input and expected result specify ____.',[
'A search should return position 2 for target 8 in [3, 8, 10].',
'A procedure should return 5 when called with 2 and 3.',
'A filter should produce an empty list when none of the supplied scores meet its rule.',
'A name validator should reject an empty string and explain the requirement.'
],'The expected outcome makes the concrete input useful for checking correctness rather than guessing what should happen.','argument parameter return condition');
f('testing','check-after-repair','E','Running the old and new checks after a repair is ____.',[
'After repairing a search, the team checks both the previous failure and successful examples.',
'After changing a form, a developer compares known valid and invalid entries with expected outcomes.',
'After a loop repair, the student runs empty, one-element and multi-element lists.',
'After revising a procedure, the team verifies that previously working calls still behave correctly.'
],'The repair has already been made; these actions check whether the resulting program works as expected.','debugging documentation development decomposition');
f('debugging','trace-first-divergence','D','Using the trace to find and fix the cause is ____.',[
'A trace shows that the accumulator first becomes wrong at the update statement; the update is repaired.',
'An instruction-by-instruction trace reveals the wrong branch condition, which the student changes.',
'A trace exposes an extra loop iteration; the stopping test is corrected.',
'A trace identifies a value overwritten too early; the statement order is repaired.'
],'The trace is used to locate and correct a cause, beyond simply identifying that an output differs.','testing documentation visualization simulation');
f('user-experience','clarity-not-speed','C','The concern is ____.',[
'The calculation is fast, but users cannot understand the labels or finish checkout.',
'The app uses few steps, yet its confusing navigation makes it difficult to use.',
'A screen responds immediately, but the user cannot tell whether a change was saved.',
'An interface works correctly, but its instructions frustrate first-time users.'
],'Fast computation alone does not ensure that the interaction is understandable or usable.','efficiency bandwidth latency purpose');
f('boundary-case','zero-one-many-transition','D','The transition-focused check is called ____.',[
'A loop is checked with an empty list and a one-element list to inspect the first transition.',
'A count-controlled loop is checked with zero, one and two repetitions.',
'A storage limit is checked with exactly the allowed count and one additional item.',
'A selection rule is checked at equality because switching > to ≥ changes that case.'
],'The tests are chosen at the edge between behaviors, not merely because the values are convenient.','parameter condition variable argument');
f('behavior','same-code-different-state','D','The difference in observed execution is program ____.',[
'The same click opens a menu when closed and closes it when already open.',
'The same Add action changes an empty list differently from a full one.',
'The same input triggers a badge only after the stored score has reached a threshold.',
'The same command moves a robot differently depending on its current heading.'
],'Observed execution depends on current values and inputs, even when the program’s overall goal stays the same.','purpose documentation development algorithm');
// Big Idea 2: representation, fidelity and extracting meaning.
f('bit','two-state-unit','A','The smallest two-state data unit described is ____.',[
'A storage cell records either 0 or 1.',
'A single switch position is encoded as one binary digit.',
'A yes/no answer is represented by one 0-or-1 value.',
'A single binary digit records whether a flag is set.'
],'One binary digit has two possible states; eight such digits form a larger unit.','byte binary hexadecimal metadata');
f('byte','eight-bit-group','A','The eight-bit group is called ____.',[
'A character code is held in a group of eight binary digits.',
'A file stores each channel value in eight adjacent bits.',
'A memory diagram groups 01000001 into one eight-bit unit.',
'A packet diagram marks an eight-bit field as one storage unit.'
],'The count of eight bits defines this unit; a single two-state digit is smaller.','bit binary decimal metadata');
f('binary','base-two-weights','D','The number system used is ____.',[
'A notation uses digits 0 and 1, with place weights 1, 2, 4 and 8.',
'An unsigned whole number is written 101 with powers of two as place values.',
'A representation advances to 10 immediately after the single digit 1.',
'A positional representation doubles each place weight when moving left.'
],'The decisive feature is base two, rather than a fixed group size or base-ten places.','decimal hexadecimal byte digital');
f('decimal','base-ten-weights','C','The place-value system is ____.',[
'A notation uses digits 0 through 9 and place values 1, 10 and 100.',
'A counter written in base ten advances from 9 to 10.',
'In the written number 305, the leftmost place has weight one hundred.',
'Each place of a positional whole-number notation is ten times the place to its right.'
],'A base-ten system is distinct from the same quantity encoded using powers of two or sixteen.','binary hexadecimal byte digital');
f('hexadecimal','base-sixteen','B','This base-sixteen notation is ____.',[
'A color code uses 0–9 and A–F as its digit symbols.',
'A memory address uses sixteen possible symbols per digit position.',
'A notation advances from F to 10 and uses powers of sixteen as place values.',
'Four binary digits are represented compactly by one base-sixteen digit.'
],'Sixteen symbols and powers of sixteen identify the notation; the choice is supporting vocabulary, not a new AP arithmetic requirement.','binary decimal byte bit');
f('representation','same-meaning-encoding','H','The chosen encoding is a form of ____.',[
'A text character is encoded as a numeric code stored with bits.',
'A pixel’s color is encoded using numerical channel values.',
'A sound recording is stored as a sequence of numerical samples.',
'A map location is stored as coordinate values instead of a drawn mark.'
],'The focus is how an item is encoded, not whether its file becomes smaller or who can read it.','compression encryption analysis metadata');
f('abstraction','retain-relevant-details','C','Leaving out unneeded detail while retaining a useful model is ____.',[
'A transit map shows station connections without drawing every street.',
'A weather display shows useful conditions without exposing every sensor voltage.',
'A city map represents buildings as simple shapes for navigation.',
'A summary record exposes needed fields while hiding irrelevant implementation detail.'
],'A useful simplified representation hides detail; splitting work into subproblems is a different action.','decomposition compression encryption visualization');
f('overflow','beyond-stated-range','E','The range limitation is ____.',[
'An unsigned 8-bit destination supports 0–255, but a result is 256.',
'An unsigned 4-bit destination supports 0–15, but a result is 16.',
'A signed destination supports -8–7, but a result is -9.',
'A numeric field supports 0–999, but a calculated value is 1000.'
],'Each exact result lies outside the stated range. No universal wrapped result is assumed.','roundoff syntax-error logic-error compression');
f('roundoff','in-range-inexact','E','The precision limitation is ____.',[
'A value of 3.14159 is within range, but the format stores only 3.14.',
'A one-third result fits the range, but finite decimal storage saves a nearby approximation.',
'A binary floating-point format stores a nearby value because the exact fraction is unavailable.',
'A format supports the magnitude 1301, but three significant digits store it as 1300.'
],'The magnitude fits; a nearby representable value is used because precision is limited. No deliberate truncation operation is specified.','overflow logic-error syntax-error lossless');
f('sampling','measure-at-times','B','Measuring the signal at selected moments is ____.',[
'A recorder measures a sound wave’s amplitude at regular time intervals.',
'A logger measures a continuously varying temperature once each second.',
'A motion system records the position of a moving object at selected times.',
'A light recorder takes numerical brightness measurements at repeated instants.'
],'The action takes measurements from a continuous signal at chosen times; it does not by itself describe compression or encryption.','compression encryption analysis visualization');
f('digital','discrete-states','A','The representation using discrete values is ____.',[
'A display represents temperature with numbers rounded to tenths of a degree.',
'A stored sound file represents measurements using numerical codes.',
'A clock display advances through separate numerical readings.',
'A stored image is represented by a grid of numerical pixel values.'
],'The specified representation has separate states or values; the physical quantity being measured may still vary continuously.','sampling encryption metadata compression');
f('compression','fewer-bits-encoding','F','The size-reducing encoding process is ____.',[
'A file encoder represents repeated runs compactly so the example needs fewer bits.',
'An image encoder uses a smaller representation for the supplied picture.',
'A transfer tool encodes a suitable document to reduce its stored size.',
'A media encoder creates a smaller encoded version for transmission.'
],'The purpose here is reducing the bit count; whether recovery is exact depends on the particular method.','encryption representation analysis sampling');
f('lossless','exact-reconstruction','C','The method that preserves exact recoverability is ____.',[
'A source-code archive must reconstruct every original character exactly.',
'A database backup must restore every saved record without any change.',
'A scientific file must be recovered bit for bit after decoding.',
'A text archive reduces size using repeated patterns and reconstructs the exact original.'
],'Exact reconstruction is required or demonstrated; an approximation would violate that requirement.','lossy encryption sampling abstraction');
f('lossy','approved-information-loss','H','The compression category is ____.',[
'A preview image permanently discards some visual detail to reduce its encoded size.',
'A stream uses an encoded recording that cannot restore all original audio information.',
'A smaller video version removes some original information with an approved quality tradeoff.',
'A thumbnail encoding discards detail that the full-resolution source contained.'
],'Discarded original information prevents guaranteed exact reconstruction, even if the change is hard to notice.','lossless encryption sampling abstraction');
f('data','recorded-before-interpretation','C','Under the raw-records versus derived-meaning distinction, these records are ____.',[
'A table contains the individual temperatures recorded each hour, before anyone draws conclusions.',
'A file lists each observed bus arrival time before delay patterns are interpreted.',
'A survey file holds individual responses before a summary is calculated.',
'A sensor log contains recorded readings before their significance is analyzed.'
],'The question explicitly classifies source records before interpretation, rather than the meaning later derived from them.','information metadata visualization analysis');
f('information','meaning-derived','C','Under the records-versus-meaning distinction, the derived finding is ____.',[
'From hourly measurements, an analyst concludes that the room warms fastest after noon.',
'From arrival records, a team identifies which route is most often delayed.',
'From survey responses, a school identifies a commonly requested service.',
'From sensor records, a scientist identifies a repeating relationship.'
],'These are interpreted relationships or findings extracted from records, not the unprocessed observations themselves.','data metadata sampling collection');
f('metadata','describes-a-file','F','The descriptive record about the main content is ____.',[
'A photograph’s separate record includes its capture time and camera settings.',
'A sound file includes a field recording its duration and sample rate.',
'A dataset includes a description of its source and column meanings.',
'A document includes separate fields for its author and creation date.'
],'These fields describe other content; they are not simply the photograph, recording or observations themselves.','data information analysis visualization');
f('analysis','process-to-answer','B','The examination aimed at answering a question is ____.',[
'A team sorts and compares arrival records to identify recurring delays.',
'An analyst filters survey responses and calculates totals to evaluate a claim.',
'A researcher compares measurements across groups to find relationships.',
'A student processes a dataset to determine which category changed most.'
],'The activity examines and processes existing records for insight; gathering them or merely encoding them has a different role.','collection sampling compression representation');
f('visualization','graph-for-relationships','B','The graphical presentation is ____.',[
'A line chart makes changes in temperature over time easier to inspect.',
'A scatterplot lets readers inspect a relationship between two measured variables.',
'A bar chart compares the counts in several categories.',
'A map uses plotted points to show where recorded events occurred.'
],'The question asks about presenting relationships graphically, rather than making an encoded file smaller.','compression sampling metadata encryption');
f('pattern','recurring-structure','A','The recurring structure is called ____.',[
'A sensor reading rises and falls in the same cycle every hour.',
'A dataset repeatedly pairs one category with a particular outcome.',
'Network use shows the same sequence of peaks every school day.',
'A record shows the same arrangement of values recurring across observations.'
],'The evidence concerns recurrence or a repeated relationship, not merely a one-direction change.','trend metadata visualization sampling');
f('trend','direction-over-time','A','The overall direction of change is called ____.',[
'Across several months, recorded use generally increases despite day-to-day variation.',
'The general direction of measured travel times is downward over the year.',
'Over many observations, average storage use steadily rises.',
'Across successive terms, the measured response rate generally decreases.'
],'The decisive feature is the overall direction across observations rather than a repeating cycle.','pattern metadata visualization sampling');
f('data-privacy','limits-on-personal-records','H','The concern about appropriate collection and use is ____.',[
'A team asks whether precise location history should be retained longer than needed.',
'A school questions whether a service should disclose personal records for an unrelated purpose.',
'A user wants limits on who can view their stored browsing history.',
'A designer asks whether collecting identifiable recordings is necessary for the stated task.'
],'The focus is appropriate use and disclosure of personal records, rather than only preventing technical intrusion.','security encryption authentication compression');
f('lossless','photo-master-exact','G','For this photograph’s stated requirement, the appropriate method is ____.',[
'A photo archive requires the exact original pixel data after decoding, not a similar preview.',
'A production image must be restored without changing any original encoded information.',
'A picture backup must reconstruct its stored source bit for bit.',
'A photographer requires exact recovery of the archival source rather than a smaller approximate copy.'
],'A photograph is not automatically an approximation case; this named copy requires exact recovery.','lossy encryption sampling abstraction');
f('lossy','not-necessarily-visible','G','The irreversible compression described is ____.',[
'Listening tests find little audible change, but some original audio information was discarded.',
'A viewer sees no obvious difference, yet the smaller image cannot reconstruct the exact source.',
'A stream looks clear even though decoding cannot restore all original recording details.',
'A preview appears acceptable, but its encoding permanently removed some source information.'
],'Imperceptible changes are still information loss; visible damage is not required for this classification.','lossless encryption sampling representation');
f('roundoff','decimal-format-matters','G','The approximation in this stated format is ____.',[
'A finite binary format approximates 0.1, although a suitable decimal format could store it exactly.',
'A binary representation supports the value’s magnitude but lacks an exact finite encoding for its fraction.',
'A number is inside the supported range but has more significant digits than the format retains.',
'A calculation’s nearby stored result differs because the available numerical precision is limited.'
],'A value’s base and available precision determine exactness; decimal notation alone does not prove an error.','overflow syntax-error logic-error compression');
f('overflow','negative-signed-limit','G','The range failure below the signed minimum is ____.',[
'A signed 4-bit integer spans -8–7, and the mathematical result is -9.',
'A signed integer format spans -128–127, and subtraction gives -129.',
'A stated integer range starts at -32, but a calculation produces -33.',
'A signed field’s minimum is -100, but the exact value to save is -101.'
],'Values below a signed integer minimum are out of range; this is not floating-point underflow or loss of fractional precision.','roundoff logic-error syntax-error sampling');
f('abstraction','detail-not-size','G','Hiding irrelevant detail to expose what matters is ____.',[
'A subway map leaves out building textures, even though its file is not made smaller.',
'A record interface exposes useful fields without showing low-level storage operations.',
'A model retains relevant system properties while leaving out unneeded physical detail.',
'A summary view suppresses irrelevant implementation detail to support a specific task.'
],'The goal is managing detail for understanding, not necessarily reducing a file’s bit count.','compression decomposition encryption metadata');
f('metadata','descriptive-not-payload','C','The field describing the content rather than being its main payload is ____.',[
'A packet record stores the destination address alongside the carried message.',
'An image record stores dimensions alongside the pixel values.',
'A dataset stores its measurement units alongside the observed readings.',
'A recording stores its encoding format alongside the recorded samples.'
],'The selected field describes or supports interpretation and delivery of other content.','data information visualization analysis');
f('sampling','interval-not-file-compression','C','The measurement-at-intervals stage is ____.',[
'Before any file encoding, a recorder reads the sound amplitude every fixed fraction of a second.',
'Before a dataset is analyzed, a system measures a continuous signal at chosen instants.',
'A sensor is read at intervals; the question concerns those measurements, not a later smaller file.',
'A controller captures positions at selected times before any storage optimization is applied.'
],'Taking time-indexed measurements is distinct from later reducing the bits needed to encode them.','compression lossless lossy encryption');
// Big Idea 3: roles and control flow, with AP CSP pseudocode where useful.
f('algorithm','finite-task-steps','A','The finite, precise method is ____.',[
'A recipe for searching specifies where to start, how to compare, how to advance and when to stop.',
'A method gives exact steps to find the largest value in a nonempty list.',
'A procedure-independent plan specifies how to calculate an average and finish.',
'A route-planning method gives unambiguous steps that end with a result.'
],'The complete task-solving method is described, rather than just the order or repetition of some of its instructions.','sequencing selection iteration simulation');
f('sequencing','order-affects-result','D','Executing these steps in the required order illustrates ____.',[
code('A value is initialized before it is increased.','count ← 0\ncount ← count + 1\nDISPLAY(count)'),
code('The input is read before its transformed value is displayed.','n ← INPUT()\nDISPLAY(n * 2)'),
code('The list is created before an item is added.','items ← []\nAPPEND(items, 4)\nDISPLAY(items)'),
code('The total is computed before it is displayed.','total ← 3 + 5\nDISPLAY(total)')
],'The focus is the order of steps; none of the displayed examples requires a branch or repeating block.','selection iteration randomness traversal');
f('selection','conditional-path','D','Choosing a branch based on the test demonstrates ____.',[
code('Only one of the two display paths executes.','IF(score ≥ 60)\n{ DISPLAY("Pass") }\nELSE\n{ DISPLAY("Try again") }'),
code('A message is displayed only for the stated case.','IF(LENGTH(items) = 0)\n{ DISPLAY("Empty") }'),
code('The program chooses whether to reduce the price.','IF(member)\n{ price ← price - 2 }'),
code('The program chooses a response using the measured value.','IF(light < 10)\n{ DISPLAY("Dark") }\nELSE\n{ DISPLAY("Bright") }')
],'A true-or-false test controls which instructions execute; no repeated execution is required.','iteration sequencing assignment traversal');
f('iteration','repeat-instructions','D','The repeated execution demonstrates ____.',[
code('The same action is executed several times.','REPEAT 3 TIMES\n{ DISPLAY("Hello") }'),
code('The body continues until its stopping test becomes true.','REPEAT UNTIL(count = 5)\n{ count ← count + 1 }'),
code('The body executes once for each listed element.','FOR EACH value IN items\n{ DISPLAY(value) }'),
code('An update instruction runs repeatedly.','REPEAT 4 TIMES\n{ total ← total + 2 }')
],'The defining feature is repetition of a body, not merely executing instructions in an order.','selection sequencing assignment condition');
f('boolean','true-or-false-value','D','The kind of expression evaluated is ____.',[
code('The comparison produces true or false.','score ≥ 60'),
code('The equality comparison has a true-or-false result.','count = 0'),
code('The logical combination has a true-or-false result.','ready AND connected'),
code('The negation has a true-or-false result.','NOT finished')
],'The expression’s result has two logical possibilities; it is not an instruction storing a value or invoking a process.','assignment argument return variable');
f('condition','test-controls-path','F','The test controlling whether the body runs is the ____.',[
code('Identify the role of score ≥ 60 in this statement.','IF(score ≥ 60)\n{ DISPLAY("Pass") }'),
code('Identify the role of count = 5 in this loop.','REPEAT UNTIL(count = 5)\n{ count ← count + 1 }'),
code('Identify the role of ready in this statement.','IF(ready)\n{ DISPLAY("Start") }'),
code('Identify the role of LENGTH(items) = 0 in the decision.','IF(LENGTH(items) = 0)\n{ DISPLAY("Empty") }')
],'The identified test controls execution; it is not the variable receiving a result or the complete repeating construct.','parameter argument assignment iteration');
f('variable','named-changeable-value','A','The named holder of a value is ____.',[
code('The name score holds a value that can change.','score ← 10\nscore ← score + 2'),
code('The name userName holds the text supplied by the user.','userName ← INPUT()'),
code('The name total holds the current calculated value.','total ← 4 + 5'),
code('The name ready holds the current logical value.','ready ← true')
],'The question identifies a named holder, rather than the statement that changes it or a position in a list.','assignment index argument return');
f('assignment','store-with-arrow','D','The storage operation indicated by ← is ____.',[
code('The result on the right is stored in score.','score ← 5'),
code('The old count is used to compute a value stored back into count.','count ← count + 1'),
code('The result is stored in total.','total ← first + second'),
code('A logical value is stored in ready.','ready ← false')
],'The arrow stores a value; it is not an equality test or a procedure invocation.','condition call selection traversal');
f('list','ordered-collection','A','The ordered collection treated as one value is ____.',[
code('The structure keeps several scores in a specified order.','scores ← [8, 5, 9]'),
code('Several names are stored together in their order.','names ← ["Ana", "Bo", "Cal"]'),
code('Several logical values are stored as one ordered collection.','flags ← [true, false, true]'),
code('Several route lengths are stored in an ordered collection.','distances ← [3, 7, 2]')
],'The collection has elements and order; a position identifies just one of those elements.','index argument parameter return');
f('index','position-not-element','F','The number selecting an element’s position is its ____.',[
code('The number 2 identifies a position, not the stored value 9.','values ← [4, 9, 6]\nDISPLAY(values[2])'),
code('The number 1 identifies the first position.','names ← ["Bo", "Ana"]\nDISPLAY(names[1])'),
code('The number 3 identifies a position in the collection.','scores ← [5, 8, 2]\nDISPLAY(scores[3])'),
code('The number 2 selects the second element.','flags ← [false, true]\nDISPLAY(flags[2])')
],'AP CSP list positions begin at 1. The position used to retrieve an element differs from that element’s stored value.','variable argument parameter list');
f('traversal','visit-collection-elements','D','Systematically accessing the collection’s elements is ____.',[
code('Every listed value is accessed to compute the total.','total ← 0\nFOR EACH value IN items\n{ total ← total + value }'),
code('Each name is accessed for display.','FOR EACH name IN names\n{ DISPLAY(name) }'),
code('Each score is accessed for comparison.','FOR EACH score IN scores\n{ IF(score ≥ 60) { passes ← passes + 1 } }'),
code('Each measurement is accessed to update a count.','FOR EACH value IN readings\n{ count ← count + 1 }')
],'The focus is systematic access to collection elements, rather than just one access at a selected position.','index selection assignment call');
f('state','current-values','F','The current collection of values describes ____.',[
'At this instant, a game has score 10, lives 2 and its menu closed.',
'A running timer currently has elapsed = 8 and running = true.',
'A program currently holds an empty queue and count = 0.',
'A robot program currently records heading = 90 and stopped = false.'
],'These are values at a particular execution instant, not the program’s general goal or an enduring plan.','purpose algorithm documentation parameter');
f('procedure','named-reusable-group','A','The named reusable group of instructions is ____.',[
'A developer defines a named group that draws a border whenever invoked.',
'A team defines a reusable named process for calculating a discount.',
'A program includes a named group of steps for checking an entry.',
'A developer defines a named set of instructions for sending an alert.'
],'The question identifies the reusable definition as a unit, not an instruction invoking it.','call parameter argument return');
f('call','invoke-named-process','D','The instruction invoking the named process is ____.',[
code('The displayed instruction invokes the already defined drawBorder process.','drawBorder(4)'),
code('The instruction invokes the existing greet process.','greet("Ana")'),
code('The instruction invokes an already defined alert process.','sendAlert("Ready")'),
code('The instruction invokes the existing resetBoard process.','resetBoard()')
],'An invocation runs an existing named process; a definition describes what that process will do.','procedure parameter argument return');
f('parameter','formal-definition-variable','D','The named input variable in the definition is ____.',[
code('Identify the role of size between the definition’s parentheses.','PROCEDURE square(size)\n{ RETURN(size * size) }'),
code('Identify the role of name in the definition.','PROCEDURE greet(name)\n{ DISPLAY(name) }'),
code('Identify the role of amount in the definition.','PROCEDURE double(amount)\n{ RETURN(amount * 2) }'),
code('Identify the role of limit in the definition.','PROCEDURE show(limit)\n{ DISPLAY(limit) }')
],'The input variable is declared in the definition; the concrete value later supplied during invocation has a different role.','argument return call procedure');
f('argument','actual-supplied-value','D','The actual value supplied to the process is ____.',[
code('Identify the role of 5 in this invocation.','square(5)'),
code('Identify the role of "Ana" in this invocation.','greet("Ana")'),
code('Identify the role of 12 in this invocation.','double(12)'),
code('Identify the role of 3 + 2 in this invocation.','show(3 + 2)')
],'The caller supplies an actual value or expression; the definition’s input variable receives it.','parameter return procedure call');
f('return','value-back-to-caller','D','The value sent back to the caller is ____.',[
code('After the invocation, the value sent back is stored in result.','PROCEDURE addOne(n)\n{ RETURN(n + 1) }\nresult ← addOne(4)'),
code('The result sent back is used in an assignment.','PROCEDURE twice(n)\n{ RETURN(2 * n) }\nvalue ← twice(3)'),
code('The caller uses the value sent back by the named process.','PROCEDURE first(items)\n{ RETURN(items[1]) }\nx ← first([7, 9])'),
code('The returned logical result is assigned to ready.','PROCEDURE positive(n)\n{ RETURN(n > 0) }\nready ← positive(2)')
],'A value sent back to the calling code differs from a value displayed to a user.','argument parameter call assignment');
f('procedural-abstraction','use-interface-hide-body','C','Using the named process without its implementation details illustrates ____.',[
'A programmer uses drawShape(size) without needing to know each drawing instruction inside it.',
'A caller uses calculateTotal(items) through its documented interface rather than copying its body.',
'A developer invokes sendNotice(text) without reasoning through every delivery step.',
'A game uses checkWinner(board) while the checking logic stays inside its reusable definition.'
],'The named interface exposes what the process does while hiding how its body accomplishes it.','decomposition assignment traversal sequencing');
f('efficiency','growth-not-current-speed','C','Comparing resource growth as input size increases examines ____.',[
'One search examines every item while another repeatedly halves a sorted search area.',
'Two sorting methods are compared by how their operation counts grow with list size.',
'A team studies whether doubling the input roughly doubles or quadruples required steps.',
'An analyst compares algorithm step counts for increasingly large collections, independent of a particular device.'
],'The question concerns resource use as a function of input size, rather than only one machine’s measured delay.','latency bandwidth scalability simulation');
f('simulation','model-a-system','B','The computational model is ____.',[
'A program models traffic to explore how changing signal timing might affect congestion.',
'A program models an epidemic under different assumptions to explore possible outcomes.',
'A program represents a virtual ecosystem to investigate interactions over time.',
'A program models a queue so a team can explore different staffing choices.'
],'The computation represents a system for investigation; its results depend on the model and its assumptions.','visualization algorithm randomness analysis');
f('randomness','variable-generated-outcomes','D','The varying generated outcome is supplied through ____.',[
code('Different calls can select different integer outcomes in the stated inclusive range.','roll ← RANDOM(1, 6)'),
code('The program generates one of the possible positions.','position ← RANDOM(1, 10)'),
code('The generated value can vary between calls.','choice ← RANDOM(0, 1)'),
code('An outcome is generated from the specified set of integer values.','value ← RANDOM(2, 5)')
],'The operation generates a possible outcome; this does not guarantee cryptographic unpredictability or make a simulation automatically accurate.','selection assignment sequencing condition');
f('decomposition','split-the-problem','B','Breaking the task into smaller subproblems is ____.',[
'A team divides a game project into input handling, scoring and drawing tasks.',
'A program-design problem is separated into reading records, validating them and producing a report.',
'A navigation problem is divided into locating stops, finding routes and presenting directions.',
'A developer splits a large application problem into smaller tasks that can be designed separately.'
],'The focus is dividing the work or problem; hiding details behind a representation is a related but different action.','abstraction procedural-abstraction sequencing collaboration');
f('parameter','same-definition-many-calls','C','The definition’s reusable input placeholder is ____.',[
code('The same named input size receives different values on different invocations.','PROCEDURE area(size)\n{ RETURN(size * size) }\narea(2)\narea(5)'),
code('The same named input message receives two texts.','PROCEDURE show(message)\n{ DISPLAY(message) }\nshow("Hi")\nshow("Bye")'),
code('The same named input value is used with different supplied numbers.','PROCEDURE triple(value)\n{ RETURN(3 * value) }\ntriple(1)\ntriple(4)'),
code('The same named input amount supports reuse.','PROCEDURE increase(amount)\n{ RETURN(amount + 1) }\nincrease(3)\nincrease(8)')
],'Changing the caller’s supplied values does not create a new formal input variable or a new definition.','argument return call procedure');
f('argument','expression-at-call-site','C','The expression supplied at the invocation site is ____.',[
code('Identify the role of score + 1 inside the invocation.','show(score + 1)'),
code('Identify the role of LENGTH(items) inside the invocation.','setCount(LENGTH(items))'),
code('Identify the role of price * 2 inside the invocation.','displayCost(price * 2)'),
code('Identify the role of first + second inside the invocation.','check(first + second)')
],'An expression can supply a value just as a literal can; the formal input variable is declared elsewhere.','parameter procedure return condition');
f('selection','choose-not-repeat','G','The branch choice, without required repetition, is ____.',[
'A program chooses one message depending on whether a score meets a threshold.',
'A controller chooses a warning only when a measurement exceeds its limit.',
'A form chooses one of two responses based on whether an entry is empty.',
'A game chooses a win or continue response from a true-or-false test.'
],'Choosing which path executes is different from repeating the same instructions, even if both may appear in one program.','iteration sequencing traversal assignment');
f('iteration','repeat-until-test','C','The repeated body, rather than the stopping test alone, demonstrates ____.',[
code('The question identifies the entire repeating construct.','REPEAT UNTIL(found)\n{ position ← position + 1 }'),
code('The question identifies the repeated execution of the body.','REPEAT UNTIL(count ≥ 4)\n{ count ← count + 1 }'),
code('The question identifies the overall repeating construct.','REPEAT UNTIL(ready)\n{ ready ← check() }'),
code('The question identifies the continuing execution of a body until completion.','REPEAT UNTIL(done)\n{ done ← advance() }')
],'The loop as a whole repeats instructions; its true-or-false test only determines when repetition ends.','condition selection sequencing assignment');
f('logic-error','wrong-loop-intent','E','The term for this valid-code mistake is ____.',[
'A valid loop is meant to process every element but stops one position too early.',
'A valid program initializes its total again for every item, so the final total is wrong.',
'A valid condition tests the opposite of the intended requirement and chooses the wrong branch.',
'A valid update subtracts where the intended algorithm requires adding, and execution gives the wrong result.'
],'Execution can proceed under the stated rules, but the instructions do not implement the intended task.','syntax-error runtime-error overflow roundoff','collections');
f('runtime-error','execution-environment-failure','E','The explicitly reported execution-time error is ____.',[
'A stated list system reports an error only when the running program accesses position 0.',
'The stated environment reports an error when a running division instruction receives divisor zero.',
'A running program reaches an instruction whose required resource is unavailable, and the system reports failure.',
'A program begins successfully but the specified runtime reports an invalid access during execution.'
],'The failure occurs during execution under the explicitly stated environment, not because the source violates grammar.','syntax-error logic-error overflow roundoff','collections');
f('traversal','access-all-not-single-index','G','Accessing the elements systematically to examine the collection is ____.',[
'A search checks list elements one by one until a match is found or the list is exhausted.',
'A program visits each score to count how many meet a rule.',
'A total is formed by systematically reading all listed measurements.',
'A filtering process examines collection elements in turn to select qualifying values.'
],'The action systematically examines elements; retrieving one known position alone would not demonstrate the same process.','index selection assignment call');
f('procedural-abstraction','reuse-versus-copy','H','Replacing copied implementations with a named reusable process is ____.',[
'Several pages use one validateEntry process rather than duplicating its checking instructions.',
'A drawing program invokes one shape process with different supplied sizes instead of copying its body.',
'A game uses one score-update process from several places rather than maintaining separate copies.',
'A reporting tool uses one formatting process across many reports while hiding the formatting steps.'
],'The reusable interface manages complexity by centralizing and hiding a process’s implementation.','decomposition collaboration sequencing traversal');
// Big Idea 4: distinct networking roles, transport choices and security applications.
f('network','connected-devices','A','The connected set of communicating devices is ____.',[
'Classroom computers exchange files with a shared printer over local connections.',
'Several computing devices exchange measurements through connected links.',
'Office computers communicate with a shared server within a building.',
'Connected game devices exchange messages with one another on a local system.'
],'A local communicating set is enough; it need not be the worldwide network of networks.','internet protocol router packet');
f('internet','network-of-networks','A','The interconnected network of networks is the ____.',[
'Independent networks around the world communicate using standardized open protocols.',
'A home network reaches a distant university network through interconnected networks.',
'Many independently operated networks interconnect to exchange packets globally.',
'A school network reaches remote services through the worldwide open-protocol network.'
],'The scope is the interconnection of networks, not just linked web pages or a single forwarding device.','dns router protocol http');
f('protocol','agreed-communication-rules','A','The term for the agreed communication rules is ____.',[
'Two devices use a shared specification for how messages are structured and interpreted.',
'A standard tells communicating systems how to format requests and responses.',
'A communication standard defines which message behaviors participants must follow.',
'Independent devices can cooperate because they follow the same agreed exchange rules.'
],'Rules govern exchange; a packet carries data and a device may implement those rules.','packet router routing ip-address');
f('packet','data-chunk-with-header','F','The transmitted chunk with its delivery information is called ____.',[
'A message segment travels with a destination address used for delivery.',
'A network unit carries part of a file plus metadata supporting reassembly.',
'A transmitted unit contains a piece of data together with information used for forwarding.',
'A data stream is divided into units that carry content and delivery information.'
],'The question identifies a transmitted data unit, not the device or process choosing its path.','router routing protocol ip-address');
f('packet-switching','divide-and-share-links','B','This shared-network transmission approach is ____.',[
'A large message is divided into independently forwarded units that share links with other traffic.',
'File pieces travel through shared connections instead of reserving a whole circuit for the entire file.',
'Parts of different messages are interleaved on the same links and forwarded toward their destinations.',
'A data stream is split into chunks for forwarding through a shared network.'
],'The focus is division and forwarding through shared links, not a promise of reliable ordered delivery.','routing tcp dns http');
f('routing','choose-the-path','F','Choosing a path through connected devices is ____.',[
'A forwarding system determines which next connection should lead toward a destination.',
'After a link fails, the network chooses another path for a message.',
'A device uses network information to decide where a data unit should go next.',
'A communication system finds a sequence of connected devices between sender and receiver.'
],'Path choice differs from resolving a name or ensuring that missing transport data are sent again.','dns authentication tcp encryption');
f('router','forwarding-device','F','The forwarding device is called ____.',[
'A device reads destination information and forwards a data unit between networks.',
'A network device sends incoming units toward suitable outgoing connections.',
'A dedicated network device connects networks and forwards traffic between them.',
'A device examines network addresses to forward data toward its destination.'
],'The question asks for the device carrying out forwarding, not the rule set or the path-selection activity.','protocol routing packet ip-address');
f('ip','address-and-forward','C','The network-layer protocol responsible for addressing and forwarding is ____.',[
'A protocol carries addressed datagrams between networks without itself guaranteeing arrival.',
'Network delivery uses addressing and forwarding rules; reliability must come from elsewhere if needed.',
'A protocol supports forwarding to an addressed destination while allowing units to be lost.',
'The specified protocol addresses network data units and supports their delivery across networks, without guaranteeing order.'
],'Addressing and best-effort forwarding are distinct from a reliable ordered transport stream or a name lookup.','tcp udp dns http');
f('ip-address','address-not-name','A','The Internet communication address is called ____.',[
'A network interface is identified for communication by an address such as 192.0.2.10.',
'A destination is specified using a numeric network address rather than a readable domain name.',
'A datagram includes an address identifying the intended network destination.',
'A network service returns a destination’s address for use in Internet communication.'
],'An address identifies a destination or interface; it is not the naming service that resolves a human-readable name.','dns protocol packet router');
f('dns','resolve-domain','F','The naming service used for that lookup is ____.',[
'A browser looks up a domain name to obtain an address it can use for communication.',
'A client resolves a human-readable server name into a network address.',
'A user enters a site name, and a naming system supplies the associated address.',
'An application queries a distributed naming system before contacting a named host.'
],'Name resolution can provide an address; it is not a mandatory separate stage that chooses every packet’s route.','routing tcp http ip');
f('tcp','reliable-ordered-stream','B','The transport protocol matching this requirement is ____.',[
'A transfer needs an ordered stream and recovery of missing data through retransmission.',
'A connection needs transport-level acknowledgments and an in-order byte stream.',
'A service needs the transport to detect missing stream data and send it again.',
'A file transfer requires reliable ordered transport rather than unacknowledged datagrams.'
],'The required reliable ordered stream is a transport role, not an addressing or domain-lookup function.','udp ip dns http');
f('udp','datagrams-without-guarantee','C','The datagram transport protocol described is ____.',[
'A transport sends independent datagrams without itself guaranteeing arrival or order.',
'An application handles loss itself rather than relying on its datagram transport to retransmit.',
'A transport provides datagrams while leaving any needed recovery to the application.',
'The chosen transport does not provide a reliable ordered byte stream.'
],'This transport lacks its own delivery and ordering guarantees; a particular application may add recovery mechanisms.','tcp ip dns http');
f('http','web-request-response','F','The application protocol for these web requests and responses is ____.',[
'A client requests a web resource and a server returns a response describing that resource.',
'A browser uses request methods and status responses to interact with web content.',
'A web service receives a resource request and sends a corresponding application response.',
'A client and web server follow application-level rules for retrieving a page resource.'
],'The focus is web resource requests and responses, not name resolution or packet forwarding.','dns tcp udp ip');
f('bandwidth','capacity-per-time','C','The data-carrying capacity per unit of time is ____.',[
'A connection can carry up to 100 million bits each second.',
'A link’s maximum supported data rate limits how much can be transferred per second.',
'A network upgrade increases the amount of data that can be carried in a fixed interval.',
'A connection is compared by its maximum bits-per-second capacity, not its response delay.'
],'Capacity over time is different from how long a particular response takes to arrive.','latency routing scalability redundancy');
f('latency','delay-not-capacity','C','The communication delay is ____.',[
'A connection has high data capacity but a long wait before a response arrives.',
'A short request takes a long time to receive its first response even though the link can carry much data.',
'The issue is the time a message takes to reach a destination, not the link’s maximum data rate.',
'A game experiences a noticeable response delay despite adequate transfer capacity.'
],'The scenario specifies delay; high carrying capacity does not by itself eliminate a long wait.','bandwidth routing redundancy scalability');
f('fault-tolerance','ability-after-failure','H','The demonstrated ability to continue after a failure is ____.',[
'A network continues carrying messages after one connection fails because an alternative path can be used.',
'A service remains available when one server fails and another takes over.',
'A system continues operating despite failure of one component.',
'A communication system still delivers messages when one of its links is unavailable.'
],'The question asks about the resulting ability to keep working; extra paths are one mechanism that can support it.','redundancy scalability bandwidth latency');
f('redundancy','extra-paths-mechanism','F','The term for the extra components themselves, rather than the ability they enable, is ____.',[
'A network includes more than one path between important locations.',
'A system has an additional server available if the primary one stops working.',
'A communication design includes spare links beyond those needed for one working path.',
'A service maintains duplicate components that can take over when needed.'
],'The question identifies the additional resources themselves, rather than the resulting ability to withstand a failure.','fault-tolerance scalability bandwidth routing');
f('scalability','grow-for-demand','H','The capacity to expand to meet increased demand is ____.',[
'A service is designed to add capacity as its user population grows.',
'A network can expand to include many more computing devices.',
'A system accommodates a larger workload by expanding its resources.',
'An application service can change in size to meet increasing numbers of requests.'
],'The focus is growth with demand, rather than only surviving a component failure.','fault-tolerance redundancy latency bandwidth');
f('cybersecurity','protect-systems','A','The overall protection of computing systems against misuse is ____.',[
'A team develops measures against unauthorized access and malicious changes to its systems.',
'A school plans technical protection against misuse of devices and data.',
'A service combines safeguards to defend its computing resources against attacks.',
'An organization works to protect its digital systems from unauthorized actions.'
],'The question concerns the overall protective field; checking identity or transforming a message is a particular safeguard.','authentication encryption certificate public-key');
f('encryption','transform-readable-data','F','The transformation that limits unauthorized reading is ____.',[
'A message is transformed into coded content that requires an appropriate key to recover.',
'A stored document is converted into a coded representation unreadable without the proper key.',
'A sender encodes readable content so an interceptor cannot readily read it.',
'A system converts data into a keyed coded form for authorized recovery.'
],'The action protects readability of content; it does not itself establish who a user is.','authentication certificate compression routing');
f('authentication','check-claimed-identity','F','The identity-verification process is ____.',[
'A service checks a password and a device-based factor before accepting a claimed identity.',
'A system verifies identity evidence before granting access.',
'A login process checks that a person can provide the expected credentials.',
'A service validates evidence that the connecting party is who it claims to be.'
],'Verifying identity is distinct from making the later message content unreadable to outsiders.','encryption certificate compression public-key');
f('certificate','trusted-key-binding','A','The credential binding ownership or identity to a public key is ____.',[
'A certificate authority issues a credential validating a site’s key ownership under a trust model.',
'A browser checks an authority-issued credential connecting a server identity to a public key.',
'A service presents a trusted credential that validates ownership of the communication key.',
'A client examines a signed credential linking an identity claim to a public key.'
],'The credential supports trust in key ownership; it is not itself the encrypted message or a shared secret.','public-key symmetric encryption authentication');
f('public-key','public-encrypt-private-decrypt','D','The encryption approach using this paired-key arrangement is ____.',[
'A sender encrypts using the recipient’s publicly available key; the recipient decrypts using a private counterpart.',
'A private decryption key need not be sent to the person encrypting a message for its owner.',
'A recipient publishes an encryption key but keeps its matching decryption key private.',
'A message encrypted for one recipient requires that recipient’s corresponding private key for recovery.'
],'A public/private key pair differs from a single shared secret used in both directions.','symmetric authentication certificate compression');
f('symmetric','same-secret-both-directions','D','The encryption approach using the same shared secret is ____.',[
'The same secret key is used to encode a message and decode it.',
'Two authorized parties share one secret used for both encryption and decryption.',
'A stored file is encoded and later decoded with the same secret key.',
'A communication arrangement relies on both parties holding the same encryption/decryption secret.'
],'The same shared secret performs both roles; a public/private pair uses distinct matching keys.','public-key authentication certificate compression');
f('tcp','ip-does-not-guarantee-stream','G','The additional reliable-stream transport protocol is ____.',[
'Addressed delivery alone can lose data; this added transport supplies recovery and ordering for the byte stream.',
'Best-effort network forwarding is combined with a transport that retransmits missing stream data.',
'A sender needs a reliable ordered byte stream beyond what network-layer addressing guarantees.',
'A service requires transport acknowledgments and reconstruction of stream order after ordinary network forwarding.'
],'Addressing does not by itself guarantee a complete ordered stream; the requested transport adds those properties.','ip udp dns http');
f('udp','late-packet-application-policy','H','The non-guaranteeing datagram transport chosen here is ____.',[
'A live update application explicitly chooses datagrams and handles any loss itself.',
'A voice application chooses a transport without built-in retransmission; its own policy handles missing updates.',
'A game update channel deliberately uses independent datagrams rather than a guaranteed byte stream.',
'A telemetry application uses a datagram transport and accepts that the transport itself may not recover lost messages.'
],'The stated transport choice, not the device or medium alone, identifies the protocol. The application can implement additional policies.','tcp ip dns http');
f('dns','lookup-not-forwarding','G','The address-lookup service, rather than the forwarding process, is ____.',[
'A client asks which address corresponds to a domain; it is not asking which next link should carry a packet.',
'A browser resolves a readable site name before using ordinary network communication.',
'A lookup returns the address associated with a server name, without choosing every packet’s route.',
'A distributed naming query obtains an address for a named resource host.'
],'Resolving a name and forwarding a packet are separate roles; the naming service is not a mandatory packet-routing layer.','routing ip tcp http');
f('fault-tolerance','ability-versus-spares','C','The resulting continued operation is ____.',[
'After an extra link takes over, messages still reach their destination despite the original link’s failure.',
'An available replacement component allows the service to keep working after a breakdown.',
'When a route fails, successful rerouting lets communication continue.',
'A backup server takes over and the system keeps serving users after the primary fails.'
],'Extra resources are the mechanism; the asked-for outcome is the ability to withstand failure and continue.','redundancy scalability latency bandwidth');
f('authentication','not-message-secrecy','C','The check of who is connecting is ____.',[
'A system verifies a login claim before any question about hiding the later message content.',
'A user presents evidence of identity; the action is not a transformation of readable data.',
'A service checks credentials to decide whether the claimed account holder is present.',
'A device checks evidence about its peer’s identity rather than encoding the conversation itself.'
],'The decisive role is identity checking, not protecting the readability of content after connection.','encryption public-key symmetric compression');
f('bandwidth','capacity-not-response-delay','G','The maximum data rate being increased is ____.',[
'An upgrade allows more bits each second even though the round-trip delay remains unchanged.',
'A link carries a larger volume per time interval without guaranteeing a faster first response.',
'The stated improvement doubles carrying capacity, not the time it takes for a signal to travel.',
'A service increases its maximum supported transfer rate while communication delay stays similar.'
],'A greater maximum rate is a capacity change; delay can remain high for other reasons.','latency routing redundancy scalability');
// Big Idea 5: factual roles and stated stakeholder effects, not moral verdicts.
f('innovation','computing-integral','A','The new or improved computer-dependent artifact is ____.',[
'A new route service uses software as an integral part of helping travelers.',
'A newly developed wearable uses computing to interpret signals for its user.',
'An improved scheduling process depends on a program to coordinate requests.',
'A new interactive museum guide depends on computation to present tailored content.'
],'Computing is an integral part of the new or improved artifact; a consequence or permission is a different concept.','benefit harm automation ip-rights');
f('benefit','specified-positive-effect','H','For the named group, this stated positive consequence is ____.',[
'A navigation tool reduces travel time for the commuters described in the scenario.',
'A reading tool enables the described users to access text they previously could not read.',
'A scheduling service reduces missed appointments for the clinic described.',
'A communication tool helps the named group maintain contact during a disruption.'
],'The positive effect is explicitly stated for a particular group; this does not claim every stakeholder benefits.','harm innovation ethical legal');
f('harm','specified-negative-effect','H','For the named group, this stated negative consequence is ____.',[
'A service change excludes the described users who cannot access its only supported device.',
'A tool exposes the named users’ private records without authorization and causes the stated harm.',
'An update disrupts the described workers’ access to a service they need.',
'A misleading automated alert causes the stated group to lose access to an essential appointment.'
],'The scenario explicitly names a negative effect; other groups could experience a different effect.','benefit innovation ethical legal');
f('bias','systematic-human-preference','B','The systematic preference before computation is ____.',[
'A team consistently chooses participants from only one favored group when gathering opinions.',
'A designer repeatedly favors one group’s needs while disregarding comparable needs of others.',
'A person’s systematic assumptions influence which examples are collected for design.',
'A review team systematically gives one group’s suggestions more weight without relevant evidence.'
],'The described imbalance exists in human choices; no automated decision process is required by this case.','digital-divide accessibility randomness consent');
f('algorithmic-bias','systematic-computational-outcome','E','The systematic skew reinforced by the computational process is ____.',[
'An automated evaluator systematically disadvantages one group because of unrepresentative training records.',
'A ranking process repeatedly produces skewed outcomes because its design embeds an unjustified preference.',
'A model trained on unbalanced examples consistently performs worse for the underrepresented group.',
'An automated screening process systematically favors a group due to a built-in scoring rule.'
],'The evidence concerns systematic computational outcomes, rather than simply lacking connectivity or making one random error.','digital-divide accessibility randomness automation');
f('digital-divide','unequal-access','A','The inequality in access to computing resources or skills is ____.',[
'Some students cannot use an online service because reliable home connectivity is unavailable.',
'Two communities have sharply different access to suitable computing devices.',
'A service assumes digital skills that some groups have not had opportunities to learn.',
'A region’s limited connectivity prevents residents from accessing the same computing services as others.'
],'The distinction is unequal access or ability to participate, rather than a model systematically scoring existing users differently.','algorithmic-bias bias privacy consent');
f('accessibility','usable-with-varied-abilities','B','Designing the product so people with varied abilities can use it is ____.',[
'A site supports screen-reader navigation and text alternatives for meaningful images.',
'A tool offers keyboard controls for users who cannot use a pointer.',
'A video service provides captions so audio is not the only way to receive essential content.',
'An interface uses readable controls and non-color cues for people with different visual abilities.'
],'The focus is inclusive product design for varied abilities, not merely whether a community has a connection.','digital-divide bandwidth consent documentation');
f('privacy','control-over-personal-information','H','The control over appropriate access to personal information is ____.',[
'A person wants limits on who may view their location history.',
'A user wants to decide whether personal activity records may be disclosed for an unrelated purpose.',
'A student wants appropriate limits on the sharing of their recorded personal details.',
'A person wants to know and control how information about them is used.'
],'Appropriate access and use are the focus; a technically protected database can still be used in privacy-intrusive ways.','security authentication encryption metadata');
f('security','protection-against-unauthorized-actions','A','The overall protection against unauthorized access or damage is ____.',[
'A service protects records against unauthorized changes and access.',
'A team uses safeguards to prevent attackers from damaging a system.',
'A school works to defend stored information against unauthorized misuse.',
'An organization protects computing resources from intrusion and malicious alteration.'
],'The question concerns protection against unauthorized actions, not whether an authorized use is appropriate.','privacy consent copyright metadata');
f('collection','gather-records','F','Gathering the observations for later use is ____.',[
'A service records each visitor’s requested page before any analysis.',
'A survey stores each response submitted by participants.',
'A system gathers daily usage records from connected devices.',
'A researcher records observations for a later investigation.'
],'The activity obtains records; interpreting those records to derive findings comes later.','analysis visualization information metadata');
f('consent','informed-voluntary-permission','F','The informed, voluntary permission for the specified use is ____.',[
'A person is clearly told why optional location records are wanted and freely agrees before collection.',
'A participant understands a proposed use of recordings and voluntarily authorizes it.',
'A user is given a genuine choice about a clearly explained optional use of personal records.',
'A person receives an understandable explanation and voluntarily permits the stated collection.'
],'The evidence is an informed voluntary choice, not simply the fact that a service can technically access data.','authentication encryption security copyright');
f('ip-rights','creative-work-rights','A','The category of creative work over which legal rights may apply is ____.',[
'A student’s original drawing is considered as a protected creative work.',
'A developer’s original code is considered as work over which legal rights may apply.',
'A composer’s original recording is considered as a creative work with associated rights.',
'A writer’s original text is considered as work over which ownership rights may apply.'
],'This names the category of creative work, rather than one particular license or protection mechanism.','copyright creative-commons open-source consent');
f('copyright','protection-of-expression','A','The legal protection governing uses of original expression is ____.',[
'A creator has legal protection over certain copying and distribution of an original illustration.',
'A writer’s original text is subject to legal rules controlling certain reuse.',
'An original recording is protected against certain unauthorized copying or distribution.',
'Original software expression is subject to legal protection governing some uses by others.'
],'The question asks for the legal protection, rather than the creative work itself or a license granting some permissions.','ip-rights creative-commons open-source consent');
f('creative-commons','creator-reuse-license','B','The creator-selected family of reuse licenses is ____.',[
'A photographer chooses a standardized license allowing reuse with attribution under its stated conditions.',
'An artist marks an illustration with a standardized Attribution–NonCommercial license specifying permitted reuse.',
'A writer selects a standardized Attribution–NonCommercial license to communicate reuse permissions and requirements.',
'A creator uses a standardized Attribution–NonCommercial license with stated conditions rather than granting unrestricted use of every kind.'
],'These licenses communicate selected permissions and conditions; the label does not mean every use is allowed without requirements.','copyright open-source ip-rights consent');
f('open-source','source-plus-license-rights','C','Software released with these source and modification rights is ____.',[
'A software license grants source access and permission to use, modify and redistribute the code.',
'A project supplies its source under a license permitting modification and redistribution.',
'A program’s license gives recipients access to source code and rights to adapt and share it.',
'A developer releases software with source and license rights allowing others to modify and distribute it.'
],'Source visibility alone is insufficient; the stated license rights are the decisive feature.','copyright creative-commons ip-rights crowdsourcing');
f('crowdsourcing','large-group-contributions','B','Obtaining contributions from many participants is ____.',[
'A project invites a large online group to contribute translations.',
'A company invites many users to propose solutions to a design problem.',
'A community platform asks a large group to submit corrections to a shared map.',
'An organization invites many online participants to contribute possible solutions.'
],'The task gathers contributions at scale; it need not be scientific research or require a machine-learned model.','collection ml automation collaboration');
f('citizen-science','public-scientific-participation','B','Public participation in this scientific research is ____.',[
'Volunteers help a scientific project classify telescope observations.',
'Members of the public record wildlife observations for a research study.',
'A scientific project invites volunteers to analyze environmental measurements.',
'Public participants collect observations under a research project’s scientific protocol.'
],'The explicit scientific research role distinguishes this from gathering contributions for a general-purpose task.','simulation automation ml collection');
f('ai','intelligent-task-techniques','A','The broad computing field for tasks associated with intelligent behavior is ____.',[
'A system uses computational techniques to reason about possible actions in a complex task.',
'A program uses computational techniques to recognize objects or make decisions traditionally associated with intelligence.',
'A system combines reasoning methods to choose actions from observations.',
'A software system uses techniques intended to perform tasks associated with intelligent problem solving.'
],'This is the broader field; the scenario does not require a particular method learned from training data.','automation simulation algorithm analysis');
f('ml','learn-from-training-data','E','Deriving the decision model from training examples is ____.',[
'A recognizer improves its model using labeled examples instead of a separate hand-written rule for every case.',
'A system derives prediction patterns from historical training records.',
'A classifier fits a model using examples, then applies the learned model to new inputs.',
'A program learns patterns from a training dataset rather than receiving every decision rule explicitly.'
],'The decisive feature is deriving a model from training data, not merely following a fixed automated rule.','automation simulation analysis algorithm');
f('automation','fixed-task-with-less-human-action','G','Having technology perform this fixed task with reduced direct human action is ____.',[
'A timer switches a light using a fixed schedule, without learning from examples.',
'A script runs the same backup steps each night without a person carrying them out.',
'A fixed rule sends a reminder at a chosen time without a staff member sending it manually.',
'A machine follows a fixed repeating process with less direct human operation and no learning component.'
],'A task can be automated without learning a model or displaying advanced intelligent behavior.','ml ai simulation crowdsourcing');
f('ethical','responsibility-beyond-legality','C','The questions about responsible and fair use beyond legal permission are ____.',[
'A team asks whether a permitted data use would treat affected people fairly.',
'A designer asks whether an allowed feature respects the users it affects.',
'A group considers possible responsibilities even after confirming that an action is legally permitted.',
'A developer asks whether a lawful design could still cause unfair or avoidable harm.'
],'Legal permission does not settle every question about responsibility or fairness; no contested policy verdict is imposed here.','legal copyright consent security');
f('legal','law-and-license-obligations','C','The questions about applicable laws and license obligations are ____.',[
'A team checks what a license legally permits before redistributing a program.',
'A developer examines whether copying an original work is permitted under applicable law.',
'A service checks which legal duties govern its handling of records.',
'A creator checks the legal conditions attached to reuse of a protected work.'
],'The question concerns legal duties and permissions, rather than whether every permitted action is ethically desirable.','ethical consent privacy security');
f('digital-divide','skills-as-well-as-devices','G','The unequal opportunity to access and use computing is ____.',[
'Devices are available, but some groups lack opportunities to develop the skills needed to use the service.',
'A community has shared computers but unreliable connectivity limits access to online resources.',
'Affordability prevents some groups from obtaining the connection needed for a service.',
'Access differs because of infrastructure and training opportunities, not simply ownership of a phone.'
],'The gap can involve skills, affordability and connectivity as well as devices; it is not restricted to one cause.','algorithmic-bias bias privacy authentication');
f('algorithmic-bias','data-and-rules-can-skew','G','The systematic skew in the automated outcomes is ____.',[
'A model’s training records underrepresent a group and its predictions consistently serve that group less accurately.',
'A scoring rule embeds an unjustified group preference and systematically affects decisions.',
'A design choice causes an automated ranking to repeatedly disadvantage the same group.',
'An automated classifier reinforces an existing imbalance from its training records.'
],'Skew can enter through data or design; using a computer does not automatically remove human-origin imbalances.','digital-divide randomness accessibility automation');
f('privacy','authorized-but-intrusive','G','The concern about appropriate personal-data use is ____.',[
'A database is technically protected, but an authorized operator shares personal records for an unrelated purpose.',
'A service uses encrypted storage yet retains identifiable histories far beyond the stated need.',
'Only authorized staff can read records, but the organization uses them for a purpose users did not expect.',
'A system prevents intrusions but collects more personal details than its stated task requires.'
],'Protection from unauthorized access does not by itself determine whether collection and use are appropriate.','security encryption authentication copyright');
f('consent','permission-before-optional-use','E','The informed voluntary authorization the service should obtain is ____.',[
'A proposed optional recording use is clearly explained, and the user is free to agree or decline.',
'A person receives a meaningful choice before an optional use of their location records.',
'A research participant understands the described recording use and freely authorizes it.',
'A service explains a new optional use and seeks a genuine agreement rather than assuming it.'
],'The scenario asks about permission for a stated use, not whether a login credential proves identity.','authentication encryption security copyright');
f('creative-commons','conditions-still-apply','G','The standardized creator-selected license family is ____.',[
'An image carries a standardized Attribution–NonCommercial license requiring attribution; reuse must follow that condition.',
'A recording’s Attribution–ShareAlike license specifies which reuse permissions the creator grants.',
'A work under an Attribution–ShareAlike license permits specified sharing subject to the chosen license conditions.',
'A creator chooses a standardized Attribution–NonCommercial license rather than asserting that every possible reuse is unrestricted.'
],'The license communicates selected permissions; requirements such as attribution can still apply.','copyright open-source ip-rights consent');
f('open-source','visible-code-not-enough','G','Code with these explicit modification and redistribution rights is ____.',[
'A repository is public and its license explicitly permits users to modify and redistribute its source.',
'A program’s source is supplied under a license granting reuse and modification rights, not merely viewing access.',
'A source release includes permission to adapt and redistribute software under stated terms.',
'A software license permits source access, modification and redistribution rather than only inspection.'
],'A public repository without suitable license permissions would not establish the same rights.','copyright creative-commons ip-rights crowdsourcing');
f('citizen-science','research-not-general-contributions','C','The specifically scientific participation is ____.',[
'Volunteers classify research images using a project’s scientific method, rather than suggesting a company slogan.',
'Public participants gather observations for a biodiversity study, rather than contribute general product reviews.',
'A research team invites public help analyzing measurements under its investigation protocol.',
'A scientific project relies on volunteer observations to investigate a research question.'
],'The purpose is scientific research participation, a more specific role than generic large-group contributions.','simulation automation ml collection');
f('benefit','stakeholder-specific-not-universal','C','For the group helped in the stated way, the consequence is ____.',[
'A new system shortens the described users’ wait, even though another group experiences different effects.',
'A tool increases the named group’s access to a service; the statement does not claim that everyone benefits.',
'A device helps the stated users accomplish a task, while the question leaves other stakeholder effects open.',
'A service makes a needed resource easier for the named community to use, without asserting a universal outcome.'
],'The positive consequence is scoped to the named group and evidence; impacts can differ among stakeholders.','harm innovation ethical legal');
f('analysis','revisit-existing-records','H','Re-examining existing records from new perspectives is ____.',[
'A team already has arrival records and compares different route groups without gathering new observations.',
'An analyst reuses a survey dataset to examine a new relationship between categories.',
'A researcher changes how existing measurements are grouped to look for another insight.',
'A student applies different filters to the same records to answer a second question.'
],'The records already exist; changing how they are examined can yield new insights without new collection or a causal claim.','collection sampling compression representation');
FAMILIES.at(-1).objective='DAT-2.E';
FAMILIES.find(f=>f.id==='resolve-design-disagreement').objective='CRD-1.C';
