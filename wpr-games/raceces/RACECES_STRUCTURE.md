# The RACECES structure

## The seven parts

| Position | Letter | Meaning | Purpose |
|---|---|---|---|
| 1 | R | Restate | Restate the question or topic as a statement |
| 2 | A | Answer | Give a clear answer or claim |
| 3 | C | Cite Evidence | Present relevant information from the source that supports the answer |
| 4 | E | Explain Evidence | Explain how that evidence supports the answer |
| 5 | C | Cite Evidence | Present a second relevant piece of evidence |
| 6 | E | Explain Evidence | Explain how the second piece of evidence supports the answer |
| 7 | S | Summarize | Conclude by reinforcing the overall answer |

Students always see the letters R, A, C, E, S. Internally the two evidence pairs have stable slot ids `C1/E1` and `C2/E2`. Those ids never appear on screen; prompts and feedback name a pair by the topic of its information ("the explanation connected to the information about rooftop installation").

## What the grader enforces

The grader evaluates roles and relationships, not a fixed answer string.

1. Restate is first.
2. Answer is second, after the question has been restated.
3. Summary is last.
4. Positions 3–4 and 5–6 are each a Cite Evidence sentence followed immediately by the Explain Evidence sentence that belongs to that same evidence.
5. The two evidence/explanation pairs may appear in either order.

Of the 5,040 possible orderings of seven sentences, exactly two are accepted: `R A C1 E1 C2 E2 S` and `R A C2 E2 C1 E1 S`. This is tested exhaustively for every writing model against an independent oracle.

No current writing model has a logical dependency that would force one pair first. If one is ever authored, the model's `dependency` field is the place to declare it; the generator does not invent ordering constraints.

## Examples of what is rejected

| Arrangement (slot ids) | Why it fails | Feedback focus |
|---|---|---|
| A R C1 E1 C2 E2 S | Answer before restatement | Begin by restating the question |
| R A C1 E2 C2 E1 S | Explanations attached to the wrong evidence | Names both topics and says each explanation must follow its own evidence |
| R A C1 C2 E1 E2 S | Two evidence sentences in a row | Each piece of evidence needs its own explanation before the next one begins |
| R A E1 C1 C2 E2 S | Explanation before its evidence | The explanation must follow the evidence, not lead it |
| R A C1 E1 S C2 E2 | Summary in the middle | The summary closes the response |
| R A C1 E1 E2 S C2 | Evidence as the ending | Finish with a summary that adds nothing new |

Feedback never says "sentence 4 belongs in position 6". It names the sentence by its information and states the principle.

## Teaching function, not formulas

Students are taught to ask what each sentence does:

- Restating a question is not answering it.
- Stating an answer is not supplying evidence.
- Citing evidence is not explaining why it matters.
- Explaining evidence is not repeating it.
- Summarizing is not introducing new information.

Phrases such as "According to the text" or "In conclusion" appear in only some sentences and are not reliable signals. Most evidence sentences have none; many summaries have none; explanations use a range of openings. Distractors are chosen to test exactly these confusions.

## Source grounding

Every evidence sentence is tied to a source fact in the excerpt. A build-time check confirms the sentence overlaps its source and uses no number that is not in the source. Explanations and summaries add interpretation only. Students never need outside knowledge.
