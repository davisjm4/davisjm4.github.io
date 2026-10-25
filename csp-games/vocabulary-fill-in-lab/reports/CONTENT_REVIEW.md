# Family and distractor review

Author implementation review, not independent educator certification. Each row represents a distinct instructional focus with four authored examples. Related focuses intentionally reuse terms and contrast them with different roles, applications or misconceptions. They are not 150 unrelated algorithms.

Near-synonyms and generic/specific pairs are excluded when they could make both choices acceptable. Nine blocked pair types are tested with deliberately invalid fixtures; this is not a claim that software proves all natural-language unambiguity.

|Family|Target|Reviewed distractor pool|Decisive distinction|
|---|---|---|---|
|need-not-steps|Program purpose|Program function; Input; Output; Documentation|These statements describe the need being addressed, rather than the implementation steps.|
|actions-not-goal|Program function|Program purpose; Input; Output; Documentation|The evidence describes what the software does, not the broader reason someone wants it.|
|data-entering|Input|Output; Variable; Parameter; Return value|The direction is into the program; a response sent out would have the opposite role.|
|data-leaving|Output|Input; Variable; Argument; Parameter|The program is producing data for a recipient, rather than receiving it for processing.|
|observed-execution|Program behavior|Program purpose; Documentation; Program development; User experience|The question concerns what actually happens for inputs and state, not design intent or comments.|
|whole-process|Program development|Testing; Debugging; Documentation; Collaboration|This spans multiple phases; checking cases or fixing a fault is only one part of the whole process.|
|revise-from-feedback|Iterative development|Iteration; Testing; Debugging; Documentation|The cycle revisits decisions using evidence; it is not simply a loop running inside the finished app.|
|shared-contribution|Collaboration|Automation; Testing; Documentation; Decomposition|People exchange contributions toward a common result; sharing a file alone would not establish that.|
|explain-for-readers|Documentation|Algorithm; Procedure call; Input; Testing|The material explains software to people; it does not itself execute the described operations.|
|ease-in-use|User experience|Algorithmic efficiency; Testing; Cybersecurity; Program purpose|The concern is the person’s experience of using the interface, beyond whether a calculation is correct.|
|compare-expected|Testing|Debugging; Documentation; Program development; Collaboration|These actions assess behavior against expectations; correcting a discovered cause is a different step.|
|repair-a-cause|Debugging|Testing; Documentation; Data analysis; Program development|The defining action is finding and repairing a cause, rather than merely observing a failed case.|
|input-and-expectation|Test case|Parameter; Argument; Condition; Logic error|A specific input and expected result make a check reproducible; an error category does not describe that pair.|
|edge-check|Boundary test case|Variable; Parameter; Condition; Runtime error|The inputs target a threshold where behavior changes, rather than arbitrary ordinary values.|
|valid-but-wrong|Logic error|Syntax error; Runtime error; Overflow; Roundoff|The instructions are valid and run, but their meaning does not implement the intended task.|
|fails-during-run|Runtime error|Syntax error; Logic error; Overflow; Roundoff|The scenario explicitly places the reported failure during execution; it does not assume all environments handle it identically.|
|grammar-violation|Syntax error|Logic error; Runtime error; Overflow; Roundoff|The code fails language grammar rules; the problem is not a valid algorithm choosing the wrong action.|
|same-goal-different-implementations|Program purpose|Program function; Input; Output; User experience|Different operations and interfaces can address the same underlying need; the shared goal is distinct from the implementation.|
|mechanism-vs-benefit|Program function|Program purpose; Input; Output; Documentation|A hoped-for benefit is a purpose; the described operational mechanism is what the program does.|
|event-supplies-data|Input|Output; Return value; Parameter; Variable|The event provides data that can affect later processing; it is not the resulting sound or screen response.|
|nonscreen-response|Output|Input; Argument; Parameter; Condition|Program results need not be text on a screen; audio, tactile and device data can have this role.|
|feedback-not-program-loop|Iterative development|Iteration; Sequencing; Automation; Testing|The repetition belongs to the development process, not necessarily to a loop in the software.|
|credit-and-maintenance|Documentation|Procedure call; Algorithm; Testing; Input|These descriptions support understanding, maintenance and attribution; they are not procedure invocations.|
|resolve-design-disagreement|Collaboration|Documentation; Decomposition; Automation; Testing|The evidence is constructive shared decision-making, not just independent work performed nearby.|
|expected-output-specified|Test case|Argument; Parameter; Return value; Condition|The expected outcome makes the concrete input useful for checking correctness rather than guessing what should happen.|
|check-after-repair|Testing|Debugging; Documentation; Program development; Decomposition|The repair has already been made; these actions check whether the resulting program works as expected.|
|trace-first-divergence|Debugging|Testing; Documentation; Visualization; Simulation|The trace is used to locate and correct a cause, beyond simply identifying that an output differs.|
|clarity-not-speed|User experience|Algorithmic efficiency; Bandwidth; Latency; Program purpose|Fast computation alone does not ensure that the interaction is understandable or usable.|
|zero-one-many-transition|Boundary test case|Parameter; Condition; Variable; Argument|The tests are chosen at the edge between behaviors, not merely because the values are convenient.|
|same-code-different-state|Program behavior|Program purpose; Documentation; Program development; Algorithm|Observed execution depends on current values and inputs, even when the program’s overall goal stays the same.|
|two-state-unit|Bit|Byte; Binary; Hexadecimal; Metadata|One binary digit has two possible states; eight such digits form a larger unit.|
|eight-bit-group|Byte|Bit; Binary; Decimal; Metadata|The count of eight bits defines this unit; a single two-state digit is smaller.|
|base-two-weights|Binary|Decimal; Hexadecimal; Byte; Digital representation|The decisive feature is base two, rather than a fixed group size or base-ten places.|
|base-ten-weights|Decimal|Binary; Hexadecimal; Byte; Digital representation|A base-ten system is distinct from the same quantity encoded using powers of two or sixteen.|
|base-sixteen|Hexadecimal|Binary; Decimal; Byte; Bit|Sixteen symbols and powers of sixteen identify the notation; the choice is supporting vocabulary, not a new AP arithmetic requirement.|
|same-meaning-encoding|Data representation|Compression; Encryption; Data analysis; Metadata|The focus is how an item is encoded, not whether its file becomes smaller or who can read it.|
|retain-relevant-details|Abstraction|Decomposition; Compression; Encryption; Visualization|A useful simplified representation hides detail; splitting work into subproblems is a different action.|
|beyond-stated-range|Overflow|Roundoff; Syntax error; Logic error; Compression|Each exact result lies outside the stated range. No universal wrapped result is assumed.|
|in-range-inexact|Roundoff|Overflow; Logic error; Syntax error; Lossless compression|The magnitude fits; a nearby representable value is used because precision is limited. No deliberate truncation operation is specified.|
|measure-at-times|Sampling|Compression; Encryption; Data analysis; Visualization|The action takes measurements from a continuous signal at chosen times; it does not by itself describe compression or encryption.|
|discrete-states|Digital representation|Sampling; Encryption; Metadata; Compression|The specified representation has separate states or values; the physical quantity being measured may still vary continuously.|
|fewer-bits-encoding|Compression|Encryption; Data representation; Data analysis; Sampling|The purpose here is reducing the bit count; whether recovery is exact depends on the particular method.|
|exact-reconstruction|Lossless compression|Lossy compression; Encryption; Sampling; Abstraction|Exact reconstruction is required or demonstrated; an approximation would violate that requirement.|
|approved-information-loss|Lossy compression|Lossless compression; Encryption; Sampling; Abstraction|Discarded original information prevents guaranteed exact reconstruction, even if the change is hard to notice.|
|recorded-before-interpretation|Data|Information; Metadata; Visualization; Data analysis|The question explicitly classifies source records before interpretation, rather than the meaning later derived from them.|
|meaning-derived|Information|Data; Metadata; Sampling; Data collection|These are interpreted relationships or findings extracted from records, not the unprocessed observations themselves.|
|describes-a-file|Metadata|Data; Information; Data analysis; Visualization|These fields describe other content; they are not simply the photograph, recording or observations themselves.|
|process-to-answer|Data analysis|Data collection; Sampling; Compression; Data representation|The activity examines and processes existing records for insight; gathering them or merely encoding them has a different role.|
|graph-for-relationships|Visualization|Compression; Sampling; Metadata; Encryption|The question asks about presenting relationships graphically, rather than making an encoded file smaller.|
|recurring-structure|Pattern|Trend; Metadata; Visualization; Sampling|The evidence concerns recurrence or a repeated relationship, not merely a one-direction change.|
|direction-over-time|Trend|Pattern; Metadata; Visualization; Sampling|The decisive feature is the overall direction across observations rather than a repeating cycle.|
|limits-on-personal-records|Data privacy|Security; Encryption; Authentication; Compression|The focus is appropriate use and disclosure of personal records, rather than only preventing technical intrusion.|
|photo-master-exact|Lossless compression|Lossy compression; Encryption; Sampling; Abstraction|A photograph is not automatically an approximation case; this named copy requires exact recovery.|
|not-necessarily-visible|Lossy compression|Lossless compression; Encryption; Sampling; Data representation|Imperceptible changes are still information loss; visible damage is not required for this classification.|
|decimal-format-matters|Roundoff|Overflow; Syntax error; Logic error; Compression|A value’s base and available precision determine exactness; decimal notation alone does not prove an error.|
|negative-signed-limit|Overflow|Roundoff; Logic error; Syntax error; Sampling|Values below a signed integer minimum are out of range; this is not floating-point underflow or loss of fractional precision.|
|detail-not-size|Abstraction|Compression; Decomposition; Encryption; Metadata|The goal is managing detail for understanding, not necessarily reducing a file’s bit count.|
|descriptive-not-payload|Metadata|Data; Information; Visualization; Data analysis|The selected field describes or supports interpretation and delivery of other content.|
|interval-not-file-compression|Sampling|Compression; Lossless compression; Lossy compression; Encryption|Taking time-indexed measurements is distinct from later reducing the bits needed to encode them.|
|finite-task-steps|Algorithm|Sequencing; Selection; Iteration; Simulation|The complete task-solving method is described, rather than just the order or repetition of some of its instructions.|
|order-affects-result|Sequencing|Selection; Iteration; Randomness; Traversal|The focus is the order of steps; none of the displayed examples requires a branch or repeating block.|
|conditional-path|Selection|Iteration; Sequencing; Assignment; Traversal|A true-or-false test controls which instructions execute; no repeated execution is required.|
|repeat-instructions|Iteration|Selection; Sequencing; Assignment; Condition|The defining feature is repetition of a body, not merely executing instructions in an order.|
|true-or-false-value|Boolean expression|Assignment; Argument; Return value; Variable|The expression’s result has two logical possibilities; it is not an instruction storing a value or invoking a process.|
|test-controls-path|Condition|Parameter; Argument; Assignment; Iteration|The identified test controls execution; it is not the variable receiving a result or the complete repeating construct.|
|named-changeable-value|Variable|Assignment; Index; Argument; Return value|The question identifies a named holder, rather than the statement that changes it or a position in a list.|
|store-with-arrow|Assignment|Condition; Procedure call; Selection; Traversal|The arrow stores a value; it is not an equality test or a procedure invocation.|
|ordered-collection|List|Index; Argument; Parameter; Return value|The collection has elements and order; a position identifies just one of those elements.|
|position-not-element|Index|Variable; Argument; Parameter; List|AP CSP list positions begin at 1. The position used to retrieve an element differs from that element’s stored value.|
|visit-collection-elements|Traversal|Index; Selection; Assignment; Procedure call|The focus is systematic access to collection elements, rather than just one access at a selected position.|
|current-values|Program state|Program purpose; Algorithm; Documentation; Parameter|These are values at a particular execution instant, not the program’s general goal or an enduring plan.|
|named-reusable-group|Procedure|Procedure call; Parameter; Argument; Return value|The question identifies the reusable definition as a unit, not an instruction invoking it.|
|invoke-named-process|Procedure call|Procedure; Parameter; Argument; Return value|An invocation runs an existing named process; a definition describes what that process will do.|
|formal-definition-variable|Parameter|Argument; Return value; Procedure call; Procedure|The input variable is declared in the definition; the concrete value later supplied during invocation has a different role.|
|actual-supplied-value|Argument|Parameter; Return value; Procedure; Procedure call|The caller supplies an actual value or expression; the definition’s input variable receives it.|
|value-back-to-caller|Return value|Argument; Parameter; Procedure call; Assignment|A value sent back to the calling code differs from a value displayed to a user.|
|use-interface-hide-body|Procedural abstraction|Decomposition; Assignment; Traversal; Sequencing|The named interface exposes what the process does while hiding how its body accomplishes it.|
|growth-not-current-speed|Algorithmic efficiency|Latency; Bandwidth; Scalability; Simulation|The question concerns resource use as a function of input size, rather than only one machine’s measured delay.|
|model-a-system|Simulation|Visualization; Algorithm; Randomness; Data analysis|The computation represents a system for investigation; its results depend on the model and its assumptions.|
|variable-generated-outcomes|Randomness|Selection; Assignment; Sequencing; Condition|The operation generates a possible outcome; this does not guarantee cryptographic unpredictability or make a simulation automatically accurate.|
|split-the-problem|Decomposition|Abstraction; Procedural abstraction; Sequencing; Collaboration|The focus is dividing the work or problem; hiding details behind a representation is a related but different action.|
|same-definition-many-calls|Parameter|Argument; Return value; Procedure call; Procedure|Changing the caller’s supplied values does not create a new formal input variable or a new definition.|
|expression-at-call-site|Argument|Parameter; Procedure; Return value; Condition|An expression can supply a value just as a literal can; the formal input variable is declared elsewhere.|
|choose-not-repeat|Selection|Iteration; Sequencing; Traversal; Assignment|Choosing which path executes is different from repeating the same instructions, even if both may appear in one program.|
|repeat-until-test|Iteration|Condition; Selection; Sequencing; Assignment|The loop as a whole repeats instructions; its true-or-false test only determines when repetition ends.|
|wrong-loop-intent|Logic error|Syntax error; Runtime error; Overflow; Roundoff|Execution can proceed under the stated rules, but the instructions do not implement the intended task.|
|execution-environment-failure|Runtime error|Syntax error; Logic error; Overflow; Roundoff|The failure occurs during execution under the explicitly stated environment, not because the source violates grammar.|
|access-all-not-single-index|Traversal|Index; Selection; Assignment; Procedure call|The action systematically examines elements; retrieving one known position alone would not demonstrate the same process.|
|reuse-versus-copy|Procedural abstraction|Decomposition; Collaboration; Sequencing; Traversal|The reusable interface manages complexity by centralizing and hiding a process’s implementation.|
|connected-devices|Computer network|Internet; Protocol; Router; Packet|A local communicating set is enough; it need not be the worldwide network of networks.|
|network-of-networks|Internet|DNS; Router; Protocol; HTTP|The scope is the interconnection of networks, not just linked web pages or a single forwarding device.|
|agreed-communication-rules|Protocol|Packet; Router; Routing; IP address|Rules govern exchange; a packet carries data and a device may implement those rules.|
|data-chunk-with-header|Packet|Router; Routing; Protocol; IP address|The question identifies a transmitted data unit, not the device or process choosing its path.|
|divide-and-share-links|Packet switching|Routing; TCP; DNS; HTTP|The focus is division and forwarding through shared links, not a promise of reliable ordered delivery.|
|choose-the-path|Routing|DNS; Authentication; TCP; Encryption|Path choice differs from resolving a name or ensuring that missing transport data are sent again.|
|forwarding-device|Router|Protocol; Routing; Packet; IP address|The question asks for the device carrying out forwarding, not the rule set or the path-selection activity.|
|address-and-forward|Internet Protocol (IP)|TCP; UDP; DNS; HTTP|Addressing and best-effort forwarding are distinct from a reliable ordered transport stream or a name lookup.|
|address-not-name|IP address|DNS; Protocol; Packet; Router|An address identifies a destination or interface; it is not the naming service that resolves a human-readable name.|
|resolve-domain|DNS|Routing; TCP; HTTP; Internet Protocol (IP)|Name resolution can provide an address; it is not a mandatory separate stage that chooses every packet’s route.|
|reliable-ordered-stream|TCP|UDP; Internet Protocol (IP); DNS; HTTP|The required reliable ordered stream is a transport role, not an addressing or domain-lookup function.|
|datagrams-without-guarantee|UDP|TCP; Internet Protocol (IP); DNS; HTTP|This transport lacks its own delivery and ordering guarantees; a particular application may add recovery mechanisms.|
|web-request-response|HTTP|DNS; TCP; UDP; Internet Protocol (IP)|The focus is web resource requests and responses, not name resolution or packet forwarding.|
|capacity-per-time|Bandwidth|Latency; Routing; Scalability; Redundancy|Capacity over time is different from how long a particular response takes to arrive.|
|delay-not-capacity|Latency|Bandwidth; Routing; Redundancy; Scalability|The scenario specifies delay; high carrying capacity does not by itself eliminate a long wait.|
|ability-after-failure|Fault tolerance|Redundancy; Scalability; Bandwidth; Latency|The question asks about the resulting ability to keep working; extra paths are one mechanism that can support it.|
|extra-paths-mechanism|Redundancy|Fault tolerance; Scalability; Bandwidth; Routing|The question identifies the additional resources themselves, rather than the resulting ability to withstand a failure.|
|grow-for-demand|Scalability|Fault tolerance; Redundancy; Latency; Bandwidth|The focus is growth with demand, rather than only surviving a component failure.|
|protect-systems|Cybersecurity|Authentication; Encryption; Digital certificate; Public-key encryption|The question concerns the overall protective field; checking identity or transforming a message is a particular safeguard.|
|transform-readable-data|Encryption|Authentication; Digital certificate; Compression; Routing|The action protects readability of content; it does not itself establish who a user is.|
|check-claimed-identity|Authentication|Encryption; Digital certificate; Compression; Public-key encryption|Verifying identity is distinct from making the later message content unreadable to outsiders.|
|trusted-key-binding|Digital certificate|Public-key encryption; Symmetric encryption; Encryption; Authentication|The credential supports trust in key ownership; it is not itself the encrypted message or a shared secret.|
|public-encrypt-private-decrypt|Public-key encryption|Symmetric encryption; Authentication; Digital certificate; Compression|A public/private key pair differs from a single shared secret used in both directions.|
|same-secret-both-directions|Symmetric encryption|Public-key encryption; Authentication; Digital certificate; Compression|The same shared secret performs both roles; a public/private pair uses distinct matching keys.|
|ip-does-not-guarantee-stream|TCP|Internet Protocol (IP); UDP; DNS; HTTP|Addressing does not by itself guarantee a complete ordered stream; the requested transport adds those properties.|
|late-packet-application-policy|UDP|TCP; Internet Protocol (IP); DNS; HTTP|The stated transport choice, not the device or medium alone, identifies the protocol. The application can implement additional policies.|
|lookup-not-forwarding|DNS|Routing; Internet Protocol (IP); TCP; HTTP|Resolving a name and forwarding a packet are separate roles; the naming service is not a mandatory packet-routing layer.|
|ability-versus-spares|Fault tolerance|Redundancy; Scalability; Latency; Bandwidth|Extra resources are the mechanism; the asked-for outcome is the ability to withstand failure and continue.|
|not-message-secrecy|Authentication|Encryption; Public-key encryption; Symmetric encryption; Compression|The decisive role is identity checking, not protecting the readability of content after connection.|
|capacity-not-response-delay|Bandwidth|Latency; Routing; Redundancy; Scalability|A greater maximum rate is a capacity change; delay can remain high for other reasons.|
|computing-integral|Computing innovation|Beneficial impact; Harmful impact; Automation; Intellectual property|Computing is an integral part of the new or improved artifact; a consequence or permission is a different concept.|
|specified-positive-effect|Beneficial impact|Harmful impact; Computing innovation; Ethical implications; Legal implications|The positive effect is explicitly stated for a particular group; this does not claim every stakeholder benefits.|
|specified-negative-effect|Harmful impact|Beneficial impact; Computing innovation; Ethical implications; Legal implications|The scenario explicitly names a negative effect; other groups could experience a different effect.|
|systematic-human-preference|Bias|Digital divide; Accessibility; Randomness; Consent|The described imbalance exists in human choices; no automated decision process is required by this case.|
|systematic-computational-outcome|Algorithmic bias|Digital divide; Accessibility; Randomness; Automation|The evidence concerns systematic computational outcomes, rather than simply lacking connectivity or making one random error.|
|unequal-access|Digital divide|Algorithmic bias; Bias; Privacy; Consent|The distinction is unequal access or ability to participate, rather than a model systematically scoring existing users differently.|
|usable-with-varied-abilities|Accessibility|Digital divide; Bandwidth; Consent; Documentation|The focus is inclusive product design for varied abilities, not merely whether a community has a connection.|
|control-over-personal-information|Privacy|Security; Authentication; Encryption; Metadata|Appropriate access and use are the focus; a technically protected database can still be used in privacy-intrusive ways.|
|protection-against-unauthorized-actions|Security|Privacy; Consent; Copyright; Metadata|The question concerns protection against unauthorized actions, not whether an authorized use is appropriate.|
|gather-records|Data collection|Data analysis; Visualization; Information; Metadata|The activity obtains records; interpreting those records to derive findings comes later.|
|informed-voluntary-permission|Consent|Authentication; Encryption; Security; Copyright|The evidence is an informed voluntary choice, not simply the fact that a service can technically access data.|
|creative-work-rights|Intellectual property|Copyright; Creative Commons; Open source; Consent|This names the category of creative work, rather than one particular license or protection mechanism.|
|protection-of-expression|Copyright|Intellectual property; Creative Commons; Open source; Consent|The question asks for the legal protection, rather than the creative work itself or a license granting some permissions.|
|creator-reuse-license|Creative Commons|Copyright; Open source; Intellectual property; Consent|These licenses communicate selected permissions and conditions; the label does not mean every use is allowed without requirements.|
|source-plus-license-rights|Open source|Copyright; Creative Commons; Intellectual property; Crowdsourcing|Source visibility alone is insufficient; the stated license rights are the decisive feature.|
|large-group-contributions|Crowdsourcing|Data collection; Machine learning; Automation; Collaboration|The task gathers contributions at scale; it need not be scientific research or require a machine-learned model.|
|public-scientific-participation|Citizen science|Simulation; Automation; Machine learning; Data collection|The explicit scientific research role distinguishes this from gathering contributions for a general-purpose task.|
|intelligent-task-techniques|Artificial intelligence|Automation; Simulation; Algorithm; Data analysis|This is the broader field; the scenario does not require a particular method learned from training data.|
|learn-from-training-data|Machine learning|Automation; Simulation; Data analysis; Algorithm|The decisive feature is deriving a model from training data, not merely following a fixed automated rule.|
|fixed-task-with-less-human-action|Automation|Machine learning; Artificial intelligence; Simulation; Crowdsourcing|A task can be automated without learning a model or displaying advanced intelligent behavior.|
|responsibility-beyond-legality|Ethical implications|Legal implications; Copyright; Consent; Security|Legal permission does not settle every question about responsibility or fairness; no contested policy verdict is imposed here.|
|law-and-license-obligations|Legal implications|Ethical implications; Consent; Privacy; Security|The question concerns legal duties and permissions, rather than whether every permitted action is ethically desirable.|
|skills-as-well-as-devices|Digital divide|Algorithmic bias; Bias; Privacy; Authentication|The gap can involve skills, affordability and connectivity as well as devices; it is not restricted to one cause.|
|data-and-rules-can-skew|Algorithmic bias|Digital divide; Randomness; Accessibility; Automation|Skew can enter through data or design; using a computer does not automatically remove human-origin imbalances.|
|authorized-but-intrusive|Privacy|Security; Encryption; Authentication; Copyright|Protection from unauthorized access does not by itself determine whether collection and use are appropriate.|
|permission-before-optional-use|Consent|Authentication; Encryption; Security; Copyright|The scenario asks about permission for a stated use, not whether a login credential proves identity.|
|conditions-still-apply|Creative Commons|Copyright; Open source; Intellectual property; Consent|The license communicates selected permissions; requirements such as attribution can still apply.|
|visible-code-not-enough|Open source|Copyright; Creative Commons; Intellectual property; Crowdsourcing|A public repository without suitable license permissions would not establish the same rights.|
|research-not-general-contributions|Citizen science|Simulation; Automation; Machine learning; Data collection|The purpose is scientific research participation, a more specific role than generic large-group contributions.|
|stakeholder-specific-not-universal|Beneficial impact|Harmful impact; Computing innovation; Ethical implications; Legal implications|The positive consequence is scoped to the named group and evidence; impacts can differ among stakeholders.|
|revisit-existing-records|Data analysis|Data collection; Sampling; Compression; Data representation|The records already exist; changing how they are examined can yield new insights without new collection or a causal claim.|

Checks enforce one blank, known terms, unique choices, hidden feedback, no article-based a/an cue, literal answer absence, allowed objective IDs and conservative ambiguity exclusions. Source-tagged catalog definitions support feedback. Case-specific roles and approved distractor pools are authored; a teacher should still review their classroom interpretation. The data/information cases explicitly state the source-records versus derived-meaning distinction. Fault-tolerance/redundancy items explicitly ask for ability versus additional resources. No networking item makes DNS a mandatory routing layer or requires TCP and UDP together.
