# Analog vs. Digital Lab

Static AP CSP two-choice practice. Open index.html through HTTP; no build or backend required. Uses local content, CSP dark styling and shared session system.

- content.js: 60 authored conceptual contrasts / 120 semantic cases, five families in each of 12 topics.
- engine.js: domain-based classification, authoring validation, six prompt stems, bounded seeded sampling, feedback. Each question specifies its scene and classified representation separately.
- app.js: exactly two answer controls, one submission per round, immediate explanation, Next, open topic filters, shared assessment/daily reset/idle-aware time.
- tests.mjs and ui-tests.mjs: 75,871 new assertions, semantic boundary probes, substantial sampling and DOM interaction checks.
- reports/CONTENT_REVIEW.md: complete case/focus/evidence review corpus; GENERATOR_VALIDATION.json contains measured distribution and repetition results.

Sampling first excludes the last 50 exact question IDs, then the previous three families. A desired answer is chosen to balance the two labels. A further semantic-case exclusion improves Mixed variety where the eligible pool permits it. Family/topic usage balances coverage. Candidate lists are finite; a tiny injected bank relaxes family cooldown before exact exclusion, and only drops oldest exact constraints if no unseen candidate exists. History persists in local browser storage across topic changes/reloads during the same daily session. No text or identity is collected.

Normal pools: 720 renderings in Mixed, 60 per topic. Each topic contains ten semantic cases, so semantic repetition in topic-specific practice is expected and reported separately from exact-question repetition. Six stem variants do not increase the family or semantic-case counts.

The content distinguishes physical phenomena, analog signals, displayed measurements, logical symbols and stored codes. Sampling time and quantization amplitude are distinguished; questions about DAC reconstruction specify filtered output. Primary references and review limitations are in the implementation report and Learn panel. Automated text checks cannot certify natural-language instructional quality; teacher review remains pending.

Run from repository root:

```
npm run test:analog --prefix csp-games
TZ=America/Los_Angeles node csp-games/analog-digital-lab/ui-tests.mjs
npm test --prefix csp-games
node cs-games/catalog-tests.mjs
```

browser-harness.html embeds the actual app at 390px for responsive QA. Physical Chromebook, touchscreen and screen-reader testing are separate review tasks. Follow reports/IMPLEMENTATION_STATUS.md and tracker G-109 for deployment verification.
