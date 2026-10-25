# Analog vs. Digital Lab — implementation status

2026-10-24 · G-109 · Classroom/educator review pending.

## Recovery audit

Brief inspection of current CSP source, standalone routes, Data Detective, Simulation Lab, Mixed AP Practice and recent commits found no suitable existing Analog vs. Digital activity. The possible EngagedCS origin was not treated as missing work. Built a new dedicated game; no extended historical recovery search or third-party site copying.

## Architecture and experience

Pure content / generator / feedback engine separated from a small DOM controller. 60 authored contrast families span 12 topics, with two substantive cases per family: 120 semantic cases. Six question-stem renderings per case yield 720 exact-question candidates; these wording variants are not counted as new reasoning families. See CONTENT_REVIEW.md and GENERATOR_VALIDATION.json.

Exactly two equal-style answer buttons, Analog and Digital, in consistent positions. One scored answer; both buttons lock afterward, including after an incorrect answer. Feedback was absent before answering. Next Question skips unattempted rounds without adding incorrect submissions. Mixed is default; all topic filters are open. Focus box explicitly names the classified object. Learn explains general principles without reacting to the current question. Keyboard focus moves to feedback and then to the next scenario.

Shared CSP session integration records first-choice results, topic/mode accuracy, daily reset, skill tags and established idle-aware shared active time. Incorrect single-attempt rounds use the shared closeIncorrect terminal convention without crediting them as correct. No names, accounts, backend, uploads or full readiness pathway.

## Instructional safeguards

Physical temperature/time/position/light distinguished from readings and encoded data; analog inputs distinguished from ADC codes; filtered DAC output distinguished from source samples. Sampling alone is not equated with amplitude quantization. The sample-and-hold case explicitly classifies unquantized amplitude, not its sampling times. Raw DAC stair-step outputs are excluded from two-choice classification; reconstructed-output questions specify the filter. Image/print questions specify continuous-tone models or discrete coded cells, not paper as a device shortcut. Electrical logical messages distinguished from separately specified physical noise quantities.

Content is authored instructional material checked against continuous-value versus discrete-code models. Automated constraints reject missing focus/evidence, unsupported domains, generic device-only targets and author-flagged ambiguous cases. These checks and semantic boundary probes are not proof that every natural-language item is unambiguous to every learner. No independent educator certification is claimed; classroom review remains pending.

Primary technical references: Analog Devices ADC chapter https://wiki.analog.com/university/courses/electronics/text/chapter-20 and sampled-data/reconstruction chapter https://www.analog.com/media/en/technical-documentation/dsp-book/dsp_book_Ch3.pdf .

## Executed validation

- Engine/content/generator: 75,685 assertions; 22,000 rounds (10,000 Mixed + 1,000 per topic), 11,000 Analog and 11,000 Digital. Zero exact repeats within 50, zero previous-three-family violations and zero semantic-case repeats within 50 in Mixed. All 60 families / 120 cases / 720 renderings reached in Mixed. Narrow topics necessarily reuse their ten semantic cases; exact renderings still avoid the last 50. No cooldown relaxation in the normal pools.
- Additional 3,000 reload/topic-switch rounds: 1,499 Analog / 1,501 Digital; zero exact or family cooldown violations.
- DOM controller: 186 assertions, all topic filters, one attempt, post-answer feedback, skip/next, session buckets and daily/explicit reset. School-timezone rerun passed.
- New total: 75,871 assertions. Full CSP regression and consolidated catalog checks are run before publication; final CI/Pages evidence and commit are recorded in tracker G-109 and Release History after live verification.
- Local Chrome: incorrect displayed-temperature answer locked and explained; subsequent preamplifier-voltage question answered correctly using Enter. Narrow frame: 390px outer / 375px content and scroll width, two 155×64px answer buttons, pointer answer and keyboard Next worked.

## Publishing and remaining review

Target: https://davisjm4.github.io/csp-games/analog-digital-lab/

Integrated CSP home/legacy catalog, consolidated catalog and path-scoped CI. Legacy homepage count adjusted from 20 to 21. Unrelated games and production shared-session code preserved. Final published rounds, mobile frame and Session Summary are independently checked after deployment and recorded in G-109.

Remaining: teacher/classroom review, physical Chromebook/touchscreen and assistive-technology checks. Browser keyboard/viewport testing does not certify physical devices. Finite authored content with controlled prompt composition; no claim of literally unlimited semantic content. No pathway implementation or advanced electrical-engineering assessment.
