# Choose the Loop Type

Choose the Loop Type asks students to choose one of four Java loop forms for a stated design. Choose the correct loop remains a separate mode that compares candidate Java code against a target result. The new mode uses the same activity, difficulty selector, Mixed Practice, one-attempt scoring, and Session Summary. The Advanced CS catalog continues to link to the same activity.

Each question names the part of the design that breaks the tie. For example, a sentinel may be the first value, and a prompt can require testing an already-read value before work begins. A basic `for` with empty initialization and update clauses could also pretest, so that scenario specifies a header with just the guard and no empty sections. Feedback names the deciding constraint, explains all three alternatives, and provides a transferable rule and a runnable Java example.

## Scenario families

| Difficulty | Design decision | Best fit under the stated constraint |
| --- | --- | --- |
| Beginner | Count a fixed number of repetitions and group counter operations | Basic `for` |
| Beginner | Check an initial state that may need zero repetitions | `while` |
| Beginner | Attempt first, then test its result | `do-while` |
| Beginner | Read all array values without a position or manual bound | Enhanced `for` |
| Beginner | Report zero-based positions, including for duplicate values | Basic `for` |
| Intermediate | Check an already-read sentinel before processing it | `while` |
| Intermediate | Read and validate a first value in the same body as retries | `do-while` |
| Intermediate | Revalidate a stored value without prompting when already valid | `while` |
| Intermediate | Display a menu before checking for exit and skip exit handling | `do-while` |
| Intermediate | Traverse an offset and stride, including when the offset is outside the array | Basic `for` |
| Intermediate | Filter values from an `Iterable` of unknown concrete type | Enhanced `for` |
| Intermediate | Find a matching value and stop early with `break` | Enhanced `for` |
| Advanced | Replace array slots in place | Basic `for` |
| Advanced | Mutate the object through a copied reference | Enhanced `for` |
| Advanced | Remove the current item through a provided `ArrayList` iterator | `while` |
| Advanced | Remove by index without skipping adjacent matches | Basic `for` |
| Advanced | Guarantee an initial read and combine validity with a retry cap | `do-while` |
| Advanced | Check bounds before indexing and advance by a data-dependent jump | `while` |

Difficulty changes the decisions students make. Beginner questions isolate a signature use case. Intermediate questions contrast similar forms by specifying what state is available, when to test, or how to traverse. Advanced questions combine state, termination, indexing, or mutation requirements. Seeded variants change the inputs and boundaries within each family. The 18 families are the structural count.

## Validation

- Decision checks sampled **3,240** generated questions across all families. They checked the visible constraints, answer keys, explanation coverage, and seed reproducibility.
- **6,000** session draws across all levels produced no exact repeat within the previous 50 questions and no consecutive repeat of a reasoning family in the measured sessions. Mixed Practice yielded both loop-choice modes at each level. Longer sessions will revisit the same design principles.
- OpenJDK 21 compiled and ran **100** displayed examples and focused cases. These included a first-token sentinel, empty traversal, a counted `while`, a pretest `for` with empty sections, array variable reassignment, reverse index deletion, and removal through an iterator. Snippets use `java.util` types where needed. The JVM tests verify behavior, while the independent scenario tests verify the preferred design.
- The legacy, interpreter, diversity, JVM, and Chromium suites cover the original game behavior. The browser tests include keyboard selection, touch at phone width, feedback and example visibility, and recording under the new session mode.
- Teacher Tools exports all three levels as Canvas QTI 1.2 single-answer multiple choice. The export preserves the scenario, answer key, and general text feedback, including explanations of the alternatives. The worked example and expandable comparison remain interactive game features. Code-writing responses, arbitrary student implementations, and Canvas import itself are outside this verification.

Java references: [JLS §14.12–14.14](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.12), [Iterator](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Iterator.html), and [ArrayList](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html).
