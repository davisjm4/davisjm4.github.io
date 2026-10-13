# Java Games coverage and roadmap

Initial four-game release. Classifications apply only to listed reading/interpretation/debugging modes; code-writing objectives are intentionally practiced through SkillStruck. This is not complete AP CSA or EOP coverage. The district EOP blueprint was not supplied. char is included for broader Java/EOP foundations.

Official framework: [Effective Fall 2025; current AP Central CED and clarifications reviewed](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description.pdf); [clarifications](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description-clarification.pdf). Topic titles and LO/EK identifiers reference that framework; game coverage/gaps are implementation judgments.

| Topic | Status | Current activity | Modes / remaining gap |
| --- | --- | --- | --- |
| 1.1 Introduction to Algorithms, Programming, and Compilers | Introduced | Debugger Lab / Loop Lab / Array Lab | Compiler/defect distinctions in Debugger Lab; algorithm representation not yet practiced — Gap: Algorithm diagrams, compiler/interpreter comparisons, and general program design. |
| 1.2 Variables and Data Types | Practiced | Variable Lab | Five data types; declaration/initializer/assignment components; guided declaration pieces — Gap: References vs primitive values beyond these templates; declaring original programs remains in SkillStruck. |
| 1.3 Expressions and Output | Practiced | Variable Lab / Debugger Lab | Stored values; integer division; arithmetic precedence; floating approximation — Gap: Additional arithmetic operators, expression nesting, formatted output, and Java output escaping. |
| 1.4 Assignment Statements and Input | Practiced | Variable Lab | Assignment vs declaration; stored value after reassignment — Gap: Input/Scanner and compound state transformations. |
| 1.5 Casting and Range of Variables | Practiced | Variable Lab / Debugger Lab | Widening/narrowing; truncation toward zero; range/overflow; lossy conversion — Gap: The entire set of primitive numeric conversions and boundary values. |
| 1.6 Compound Assignment Operators | Practiced | Loop Lab / Array Lab | Increasing/decreasing counters; updates; array element += operations — Gap: Updates in more varied expressions; postfix/prefix differences. |
| 1.7 Application Program Interface (API) and Libraries | Introduced | Debugger Lab / Loop Lab / Array Lab | Using documented Java collection APIs implicitly; explicit API/library identification remains planned — Gap: API documentation interpretation, library contracts, and broader interfaces. |
| 1.8 Documentation with Comments | Not covered | Future expansion | Not implemented — Gap: Comments, preconditions/postconditions, and documentation interpretation. |
| 1.9 Method Signatures | Introduced | Debugger Lab / Loop Lab / Array Lab | Method headers, required arguments, and return types in Debugger Lab — Gap: Header/name/return/parameter identification and overloading beyond repairs. |
| 1.10 Calling Class Methods | Introduced | Debugger Lab / Loop Lab / Array Lab | Static calls and argument order/count in Debugger Lab — Gap: Argument binding and broader static method call interpretation. |
| 1.11 Math Class | Introduced | Debugger Lab / Loop Lab / Array Lab | Math.abs used in a precision-check repair; broader Math methods untested — Gap: Math.random, Math.pow, Math.sqrt, abs ranges, and random-range transformations. |
| 1.12 Objects: Instances of Classes | Introduced | Debugger Lab / Loop Lab / Array Lab | String identity/content and null-reference cases in Debugger Lab — Gap: Object state, reference diagrams, aliasing, and constructors/getters/setters. |
| 1.13 Object Creation and Storage (Instantiation) | Introduced | Debugger Lab / Loop Lab / Array Lab | Constructor names/headers and String construction in Debugger Lab — Gap: New-object call interpretation, overloaded constructors, and reference storage. |
| 1.14 Calling Instance Methods | Practiced | Array Lab / Debugger Lab | Collection/String instance-method calls; null checks; method argument errors — Gap: Broader object APIs, chained calls, and mutation vs return values. |
| 1.15 String Manipulation | Practiced | Debugger Lab | String equality vs identity; substring bounds; null references — Gap: indexOf, immutability, concatenation/substring tracing, and broader String operations. |
| 2.1 Algorithms with Selection and Repetition | Practiced | Loop Lab / Array Lab / Debugger Lab | Read selection/repetition algorithms; boundary/condition defects — Gap: Design choices and broad selection/iteration algorithms beyond templates. |
| 2.2 Boolean Expressions | Practiced | Loop Lab / Debugger Lab | Comparison conditions and Boolean inputs; defect corrections — Gap: Boolean evaluation with diverse operands and complete logical operator coverage. |
| 2.3 if Statements | Practiced | Debugger Lab | Conditional punctuation and selection behavior — Gap: if/else-if chains and broader contextual branches. |
| 2.4 Nested if Statements | Practiced | Debugger Lab | Nested if / dangling else; explicit intended branches — Gap: Additional nested shapes and conversions between equivalent forms. |
| 2.5 Compound Boolean Expressions | Practiced | Array Lab / Debugger Lab | Compound search condition; tolerance checks — Gap: AND/OR/NOT combinations and short-circuit reasoning need explicit practice. |
| 2.6 Comparing Boolean Expressions | Not covered | Future expansion | Not implemented — Gap: Logical equivalence, De Morgan transformations, and evaluation truth tables. |
| 2.7 while Loops | Practiced | Loop Lab / Debugger Lab | While components/counts; initialization/updates; intentionally nonterminating loop — Gap: Changing/non-numeric stopping conditions and loops with early exits. |
| 2.8 for Loops | Practiced | Loop Lab | For components/counts; multiple comparisons and step directions; scope; last-used vs after-update — Gap: Complex updates, combined controls, and broad off-by-one analysis. |
| 2.9 Implementing Selection and Iteration Algorithms | Practiced | Loop Lab / Array Lab | Interpret count/sum/min/max/search/update algorithms — Gap: General algorithm design/writing remains in SkillStruck; other patterns need more reading practice. |
| 2.10 Implementing String Algorithms | Not covered | Future expansion | Not implemented — Gap: String traversal, counting substrings/characters, and manipulation algorithms. |
| 2.11 Nested Iteration | Practiced | Loop Lab | Outer/inner identification; rectangular/row-dependent execution grids; total counts — Gap: More complex nested bounds and output patterns. |
| 2.12 Informal Run-Time Analysis | Introduced | Debugger Lab / Loop Lab / Array Lab | Execution counts in Loop Lab; no comparative growth analysis — Gap: Growth comparisons, informal execution-time scaling, and efficiency explanations. |
| 3.1 Abstraction and Program Design | Not covered | Future expansion | Not implemented — Gap: Class design, decomposition, encapsulation decisions, and original development. |
| 3.2 Impact of Program Design | Not covered | Future expansion | Not implemented — Gap: Societal consequences of program design; CSP Impact Lab can supplement discussion but does not record Java results. |
| 3.3 Anatomy of a Class | Introduced | Debugger Lab / Loop Lab / Array Lab | Class, field, method, constructor context in debugging; no full class-component identification — Gap: Fields/constructors/getters/setters/access modifiers identification as dedicated tasks. |
| 3.4 Constructors | Introduced | Debugger Lab / Loop Lab / Array Lab | Constructor naming and punctuation; wider object-state interpretation remains planned — Gap: Initialization of instance state, constructor calls, overloading, and defaults. |
| 3.5 Methods: How to Write Them | Practiced | Debugger Lab | Missing/wrong return values; header/body punctuation; argument requirements — Gap: Getter/setter interpretation, richer return paths, and original method writing. |
| 3.6 Methods: Passing and Returning References of an Object | Not covered | Future expansion | Not implemented — Gap: Aliasing/mutation through parameters, reference returns, and object state diagrams. |
| 3.7 Class Variables and Methods | Practiced | Debugger Lab | Instance/static context defect and shared class field — Gap: Additional static/instance behaviors and calls through classes/instances. |
| 3.8 Scope and Access | Practiced | Variable Lab / Loop Lab / Debugger Lab | Local scope, redeclaration, in-scope counter after loop — Gap: Access modifiers, class/member/local shadowing, and visibility between classes. |
| 3.9 this Keyword | Not covered | Future expansion | Not implemented — Gap: this for fields, receivers, and constructor/method context. |
| 4.1 Ethical and Social Issues Around Data Collection | Not covered | Future expansion | Not implemented — Gap: Privacy, consent, security, fairness, and data collection ethics in Java-specific contexts. |
| 4.2 Introduction to Using Data Sets | Not covered | Future expansion | Not implemented — Gap: Authentic data sets and interpreting collection/data transformations. |
| 4.3 Array Creation and Access | Practiced | Array Lab / Debugger Lab | Fixed-length arrays; access/replacement; valid/invalid indices and length — Gap: New-array length changes, initialization defaults, and reference/alias diagrams. |
| 4.4 Array Traversals | Practiced | Array Lab | Select visited indices; stepped updates; for/enhanced-for traversal — Gap: More traversal boundaries and enhanced-for semantics beyond numeric templates. |
| 4.5 Implementing Array Algorithms | Practiced | Array Lab | Counts, sums, min/max, first-match search; whole final-state validation — Gap: Additional array algorithms and broader robustness cases. |
| 4.6 Using Text Files | Not covered | Future expansion | Not implemented — Gap: Reading text files, end-of-file, parsing, and data processing. |
| 4.7 Wrapper Classes | Introduced | Debugger Lab / Loop Lab / Array Lab | Integer wrapper selection for ArrayList remove overload — Gap: Autoboxing/unboxing, wrapper APIs, and null-unboxing errors. |
| 4.8 ArrayList Methods | Practiced | Array Lab / Debugger Lab | Get/set/add/insert/remove/size; dynamic length; remove overload — Gap: Additional overloads, reference/value behavior, and more element types. |
| 4.9 ArrayList Traversals | Practiced | Array Lab | Index and enhanced-for traversals of ArrayLists; updates and scalar results — Gap: Removal during traversal and skipped-element analysis. |
| 4.10 Implementing ArrayList Algorithms | Practiced | Array Lab / Debugger Lab | ArrayList count/sum/min/max/search; remove-value overload — Gap: Collection filtering, insertion algorithms, and broader transformations. |
| 4.11 2D Array Creation and Access | Practiced | Array Lab | Zero-based row/column labels; 2D grid representation and replacement — Gap: Ragged arrays, aliases, creation/defaults, and more shapes. |
| 4.12 2D Array Traversals | Practiced | Array Lab | Traverse and modify a selected row — Gap: Nested full-grid traversal, row-major/column-major, and uneven row sizes. |
| 4.13 Implementing 2D Array Algorithms | Practiced | Array Lab | Interpret bounded row-update algorithm; no general 2D algorithm construction — Gap: 2D counting, searching, aggregation, and neighbors. |
| 4.14 Searching Algorithms | Practiced | Array Lab | Linear first-match search, including absent target — Gap: Java binary search and comparison of searching approaches. |
| 4.15 Sorting Algorithms | Not covered | Future expansion | Not implemented — Gap: Selection/insertion sorting traces and comparisons. |
| 4.16 Recursion | Not covered | Future expansion | Not implemented — Gap: Base cases, recursive calls, returned values, and call-stack interpretation. |
| 4.17 Recursive Searching and Sorting | Not covered | Future expansion | Not implemented — Gap: Recursive binary search, merge sort, and efficiency analysis. |

## Proposed expansion (not implemented)

- **Object Inspector (proposed; approval needed before building)**: Select headers/fields/parameters and manipulate object/reference diagrams; inspect getters/setters, this, access, overloading, and reference passing.
- **Extend Variable Lab and Debugger Lab**: Add expression/type-promotion, Math/API contracts, comments, Boolean equivalence, and short-circuit scenarios.
- **Extend Loop Lab and Array Lab**: Add String traversals, ragged/full-grid algorithms, collection filtering, sorting, binary search, and recursion/call-stack interpretation.
- **Data and Responsibility scenarios (design needed)**: Inspect fictional file/data records and supported privacy/ethics conclusions; no typing/editor/FRQ builder.

## Testing and limitations

The production site uses prevalidated templates and deterministic client-side scoring. It does not compile arbitrary Java. Development tests use the real OpenJDK 17 compiler and JVM. Diagnostics are captured from those checks. Desktop/native drag, touch-pointer, keyboard/tap alternatives, and print/reset actions are tested through DOM simulation; real Chromebook/mobile rendering and physical PDF output still require a manual check. No official exam questions or secure AP Classroom material is copied.

## Computational thinking practices

- **Design Code**: Introduced within guided declaration tasks; original program design remains in SkillStruck/projects.
- **Develop Code**: Intentionally not a code-writing platform. Piece selection supports reading; writing objectives are not claimed.
- **Analyze Code**: Practiced in the four games through interpretation, tracing, debugging, and final-state validation.
- **Document Code and Computing Systems**: Conceptual explanations are supplied after success/reveal; independent documentation remains a gap.
- **Use Computers Responsibly**: Not directly assessed in this initial Java release; ethical/data scenarios remain on the roadmap.
