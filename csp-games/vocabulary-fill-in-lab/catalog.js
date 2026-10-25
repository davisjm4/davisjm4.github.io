export const SOURCE={ced:'https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf',clarification:'https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description-clarification.pdf',reviewed:'2026-10-25',edition:'Effective Fall 2023; August 2025 clarification checked'};
export const BIG_IDEAS={1:'Creative Development',2:'Data',3:'Algorithms and Programming',4:'Computer Systems and Networks',5:'Impact of Computing'};
export const TOPICS={purpose:{big:1,label:'Purpose, function, input & output'},design:{big:1,label:'Development & collaboration'},testing:{big:1,label:'Errors & testing'},representation:{big:2,label:'Numbers & representation'},compression:{big:2,label:'Compression'},analysis:{big:2,label:'Data & information'},control:{big:3,label:'Algorithms & control flow'},collections:{big:3,label:'Variables, lists & state'},procedures:{big:3,label:'Procedures & abstraction'},algorithms:{big:3,label:'Efficiency & models'},networks:{big:4,label:'Networks & protocols'},resilience:{big:4,label:'Capacity & resilience'},protection:{big:4,label:'Network security applications'},impacts:{big:5,label:'Innovation, access & bias'},responsibility:{big:5,label:'Rights, permissions & responsibility'},participation:{big:5,label:'Data & participation'}};
// Original concise teaching definitions. Core/supporting is a curricular crosswalk,
// not a prediction that a particular word must appear on an AP exam.
const rows=`
purpose|Program purpose|purpose|CRD-2.A|core|The need or goal a program is intended to address.
function|Program function|purpose|CRD-2.B|core|What a program does and how its actions accomplish a task.
input|Input|purpose|CRD-2.C|core|Data sent into a program for processing.
output|Output|purpose|CRD-2.D|core|Data sent from a program to a device or another recipient.
behavior|Program behavior|purpose|CRD-2.B|core|What happens as a program executes for particular inputs and state.
development|Program development|design|CRD-2.E|core|The process of investigating, designing, implementing and evaluating software.
iterative-development|Iterative development|design|CRD-2.E|core|Repeated cycles of building, evaluating and revising a solution.
collaboration|Collaboration|design|CRD-1.A|core|People contributing and communicating while working toward a shared goal.
documentation|Documentation|design|CRD-2.G|core|Descriptions that explain code, its purpose or its use.
user-experience|User experience|design|CRD-2.F|supporting|How someone experiences using a product, including clarity and ease of use.
testing|Testing|testing|CRD-2.J|core|Running or evaluating cases against expected results to assess correctness.
debugging|Debugging|testing|CRD-2.I|core|Finding and correcting causes of errors in a program.
test-case|Test case|testing|CRD-2.J|core|An input and its expected result or behavior used to evaluate a program.
boundary-case|Boundary test case|testing|CRD-2.J|supporting|A test at or immediately around a limit where behavior may change.
logic-error|Logic error|testing|CRD-2.I|core|Instructions execute but produce behavior that does not match the intended logic.
runtime-error|Runtime error|testing|CRD-2.I|core|An error encountered while a program is executing.
syntax-error|Syntax error|testing|CRD-2.I|core|Code that violates the grammatical rules of its language.
bit|Bit|representation|DAT-1.A|core|A binary digit with one of two possible values, 0 or 1.
byte|Byte|representation|DAT-1.A|core|A group of eight bits.
binary|Binary|representation|DAT-1.C|core|Base-two notation, with place values that are powers of two.
decimal|Decimal|representation|DAT-1.C|core|Base-ten notation, with place values that are powers of ten.
hexadecimal|Hexadecimal|representation|DAT-1.A|supporting|Base-sixteen notation using digits 0–9 and A–F.
representation|Data representation|representation|DAT-1.A|core|An encoding used to express data, such as bits representing a character.
abstraction|Abstraction|representation|DAT-1.A|core|A useful representation that leaves out details not needed for the current purpose.
overflow|Overflow|representation|DAT-1.B|core|A result outside the range supported by the numerical representation.
roundoff|Roundoff|representation|DAT-1.B|core|Approximation caused by limited numerical precision.
sampling|Sampling|representation|DAT-1.A|core|Measuring a continuously varying signal at selected times to represent it digitally.
digital|Digital representation|representation|DAT-1.A|core|Information encoded using discrete values or states.
compression|Compression|compression|DAT-1.D|core|Encoding information with fewer bits when the data and method permit it.
lossless|Lossless compression|compression|DAT-1.D|core|Compression that permits exact reconstruction of the original information.
lossy|Lossy compression|compression|DAT-1.D|core|Compression that discards some information and does not guarantee exact reconstruction.
data|Data|analysis|DAT-2.A|core|Recorded values or symbols that can be processed to derive meaning.
information|Information|analysis|DAT-2.A|core|Meaning, relationships or patterns derived from data in a context.
metadata|Metadata|analysis|DAT-2.B|core|Data describing other data, such as a file's capture time or format.
analysis|Data analysis|analysis|DAT-2.D|core|Examining and processing data to answer questions or find relationships.
visualization|Visualization|analysis|DAT-2.E|core|A graphical presentation used to make relationships in data easier to inspect.
pattern|Pattern|analysis|DAT-2.A|core|A recurring structure or relationship found in data.
trend|Trend|analysis|DAT-2.A|core|A general direction of change across observations, often over time.
data-privacy|Data privacy|analysis|IOC-2.A|core|Control and appropriate limits over collection, use and disclosure of personal data.
algorithm|Algorithm|control|AAP-2.A|core|A finite sequence of precise steps that accomplishes a task.
sequencing|Sequencing|control|AAP-2.A|core|Executing steps in a specified order.
selection|Selection|control|AAP-2.G|core|Choosing which instructions execute based on a condition.
iteration|Iteration|control|AAP-2.J|core|Repeating a set of instructions.
boolean|Boolean expression|control|AAP-2.E|core|An expression that evaluates to true or false.
condition|Condition|control|AAP-2.H|core|A true-or-false test controlling whether a branch or repetition executes.
variable|Variable|collections|AAP-1.A|core|A named abstraction that holds a value that may change.
assignment|Assignment|collections|AAP-1.B|core|Storing the value of an expression in a variable.
list|List|collections|AAP-1.C|core|An ordered collection of elements treated as a unit.
index|Index|collections|AAP-2.N|core|A position used to identify an element in an ordered collection.
traversal|Traversal|collections|AAP-2.O|core|Accessing collection elements systematically, commonly using iteration.
state|Program state|collections|CRD-2.B|supporting|The current values and other execution information describing a running program.
procedure|Procedure|procedures|AAP-3.A|core|A named group of instructions that can be called, with optional parameters and a return value.
call|Procedure call|procedures|AAP-3.A|core|An instruction that invokes a procedure to execute it.
parameter|Parameter|procedures|AAP-3.A|core|An input variable declared in a procedure definition.
argument|Argument|procedures|AAP-3.A|core|An actual value or expression supplied in a procedure call.
return|Return value|procedures|AAP-3.A|core|A value a procedure sends back to its caller.
procedural-abstraction|Procedural abstraction|procedures|AAP-3.B|core|Using a named procedure to expose what a process does while hiding its implementation details.
efficiency|Algorithmic efficiency|algorithms|AAP-4.A|core|How an algorithm's resource use, such as step count, grows with input size.
simulation|Simulation|algorithms|AAP-3.F|core|A computational model used to explore a real or imagined system.
randomness|Randomness|algorithms|AAP-3.E|core|Unpredictable or pseudorandom variation used to generate possible outcomes.
decomposition|Decomposition|algorithms|AAP-3.B|supporting|Breaking a larger problem into smaller, more manageable parts.
network|Computer network|networks|CSN-1.A|core|Connected computing devices that exchange data.
internet|Internet|networks|CSN-1.B|core|The interconnected network of networks using open communication protocols.
protocol|Protocol|networks|CSN-1.B|core|Agreed rules for how a system communicates or behaves.
packet|Packet|networks|CSN-1.C|core|A chunk of transmitted data with metadata used for delivery and reassembly.
packet-switching|Packet switching|networks|CSN-1.C|core|Sending divided data through shared networks in packets rather than reserving one whole end-to-end circuit.
routing|Routing|networks|CSN-1.A|core|Choosing or finding a path for data to travel from sender to receiver.
router|Router|networks|CSN-1.A|core|A device that forwards packets between networks toward their destinations.
ip|Internet Protocol (IP)|networks|CSN-1.C|core|Rules for addressing and forwarding packets between interconnected networks; delivery is not guaranteed.
ip-address|IP address|networks|CSN-1.B|core|An address used to identify an interface or destination for Internet communication.
dns|DNS|networks|CSN-1.D|supporting|A distributed naming system that can resolve domain names to IP addresses.
tcp|TCP|networks|CSN-1.C|core|A transport protocol providing a reliable, ordered byte stream, using mechanisms such as acknowledgments and retransmission.
udp|UDP|networks|CSN-1.C|core|A datagram transport protocol that does not itself guarantee delivery or ordering.
http|HTTP|networks|CSN-1.D|core|An application protocol for requests and responses involving web resources.
bandwidth|Bandwidth|resilience|CSN-1.A|core|The maximum amount of data a connection can transmit per unit of time.
latency|Latency|resilience|CSN-1.A|supporting|The delay before or during communication, rather than its data-carrying capacity.
fault-tolerance|Fault tolerance|resilience|CSN-1.E|core|The ability of a system to keep operating when components fail.
redundancy|Redundancy|resilience|CSN-1.E|core|Additional components or paths that can provide alternatives when needed.
scalability|Scalability|resilience|CSN-1.B|core|The capacity of a system to grow or change to meet increased demand.
cybersecurity|Cybersecurity|protection|IOC-2.B|core|Protecting computing systems and data against misuse and unauthorized access.
encryption|Encryption|protection|IOC-2.B|core|Transforming readable data into a coded form to limit unauthorized reading.
authentication|Authentication|protection|IOC-2.B|core|Checking evidence that a person or system is who it claims to be.
certificate|Digital certificate|protection|IOC-2.B|core|A credential, issued under a trust model, that binds an identity or ownership claim to a public key.
public-key|Public-key encryption|protection|IOC-2.B|core|Encrypting with a recipient's public key so the matching private key is needed to decrypt.
symmetric|Symmetric encryption|protection|IOC-2.B|core|Using the same shared secret key for encryption and decryption.
innovation|Computing innovation|impacts|IOC-1.A|core|A new or improved artifact or process that includes a computer or program as an integral part.
benefit|Beneficial impact|impacts|IOC-1.A|core|A positive consequence for a specified person or group in a stated situation.
harm|Harmful impact|impacts|IOC-1.A|core|A negative consequence for a specified person or group in a stated situation.
bias|Bias|impacts|IOC-1.D|core|A systematic preference or imbalance that can influence design, data or interpretation.
algorithmic-bias|Algorithmic bias|impacts|IOC-1.D|core|Systematic unfair or skewed outcomes produced or reinforced by a computational process.
digital-divide|Digital divide|impacts|IOC-1.C|core|Unequal access to computing resources, connectivity or the skills to use them.
accessibility|Accessibility|impacts|IOC-1.C|supporting|Design that enables people with varied abilities to use a product or service.
privacy|Privacy|participation|IOC-2.A|core|A person's control over appropriate access to information about them.
security|Security|participation|IOC-2.B|core|Protection of systems or information against unauthorized access, damage or misuse.
collection|Data collection|participation|IOC-2.A|core|Gathering observations or records for later use or processing.
consent|Consent|participation|IOC-2.A|supporting|An informed, voluntary permission for a stated action or use.
ip-rights|Intellectual property|responsibility|IOC-1.F|core|Creative or intellectual work over which legal rights may apply.
copyright|Copyright|responsibility|IOC-1.F|core|Legal protection governing certain uses of original creative expression.
creative-commons|Creative Commons|responsibility|IOC-1.F|core|A family of licenses through which creators specify permissions and conditions for reuse.
open-source|Open source|responsibility|IOC-1.F|core|Software whose license permits access to source code and rights to use, modify and redistribute it.
crowdsourcing|Crowdsourcing|participation|IOC-1.E|core|Obtaining contributions or solutions from a large group, often through online tools.
citizen-science|Citizen science|participation|IOC-1.E|core|Public participation in scientific work such as collecting or analyzing research data.
ai|Artificial intelligence|impacts|IOC-1.B|supporting|Computing techniques for tasks associated with intelligent behavior, such as recognizing patterns or making decisions.
ml|Machine learning|impacts|IOC-1.B|core|Methods that derive a model or patterns from training data instead of requiring every decision rule to be hand-written.
automation|Automation|impacts|IOC-1.B|supporting|Using technology to perform tasks with reduced direct human intervention.
ethical|Ethical implications|responsibility|IOC-1.F|core|Questions about responsible, fair or appropriate use beyond mere legal permission.
legal|Legal implications|responsibility|IOC-1.F|core|Consequences or obligations arising under applicable laws and licenses.
`;
export const TERMS=Object.fromEntries(rows.trim().split('\n').map(line=>{const [id,term,topic,objective,tier,definition]=line.split('|');return [id,{id,term,topic,big:TOPICS[topic].big,objective,tier,definition,officialBig:({CRD:1,DAT:2,AAP:3,CSN:4,IOC:5})[objective.slice(0,3)]}];}));
