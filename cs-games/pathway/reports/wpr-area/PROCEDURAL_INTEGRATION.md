# WPR procedural and authored evidence integration

## Provenance and scope

Reuses PR #49 (`c8c8512`) and Claude's `cs-games-wpr-content-expansion.zip`, bundle head `eccb5a6`. The 119 authored additions are retained with their source ledgers, tests, comparison feedback and six priority concepts. The three earlier reviewed items remain unchanged. Main at reconciliation was PR64's `8d5fdc2`; the independent navigation release #65 is deployed at `50af5b2`.

Affected requirements: CSG-MAS-01/02/03, CSG-STU-01/03, CSG-SEC-01/02, CSG-SES-01/02, CSG-UX-02/03, CSG-DEV-03. Teacher-account drafts #56/#57 are excluded. All 94 canonical objective IDs, 22 areas and five units remain intact. This integration also removes the leftover 94-skill summary and objective Classic map from the student-facing WPR route.

## Procedural issuance

The Worker executes the existing `js/core/generator.js`, library, RNG, validator and grader over the canonical JSON. Generated ESM imports share that source directly; no parallel question generator or duplicated content bank is maintained. The build/check script detects missing imports. Authored content remains a complementary source rather than replacing procedural scenarios.

The new protocol binds the profile, class, credential generation, instance ID, source, seed, content revision, displayed question digest, complete evaluation digest and seven-day expiry in an HMAC permit. The server regenerates and grades the question. It refuses client correctness, forged metadata, altered content, wrong profile/class/course, stale credentials and expired permits. The evaluation digest prevents silently grading an old permit against a changed answer key. Existing v1 permits and event IDs retain their protocol and unchanged item digests.

First responses are stored through the existing scoped, unique event insertion. Replaying the same response is idempotent. Changing a response cannot replace the first answer. A fresh, varied issuance gets a fresh instance; the old family-forever ID is not reused for new procedural rounds. Existing historical responses are never rewritten.

Selection rotates semantic reasoning patterns, uses unseen sources and weak objective practice to target additional scenarios, and avoids counting new names/numbers as a new reasoning family. These are practice-selection weights, not a mastery scoring formula. Secondary tags never become independent mastery claims. Primary-objective attribution remains diagnostic and provisional unless separately certified.

The client uses the established ticket renderer and shared outbox. A signed question can be answered offline. It stays locked/pending until the service confirms it; reconnect retrieves the server feedback and retains one first response. Requests for further server-issued questions need connectivity. Ordinary local procedural practice remains available. On an older Worker, a capability check leaves the established practice path active; it does not promote local answers into server-verified mastery.

## Eligibility and area completion

No WPR automatic eligibility is activated. `WPR_AUTOMATIC` remains empty. V2 responses produce server-scored area practice and diagnostic metadata, with no node mastery dimensions. Performed workplace behaviours remain teacher-assessed. Existing class targets, official scores and historical proficiency stay unchanged.

Area rings aggregate existing reviewed completion for included objectives. A legitimate reviewed Level 3 area shows a filled check, suggests another incomplete area and offers optional extension practice. The activity displays actual available class requirement count, accuracy and objective coverage separately from its approximately eight-question practice round. Starting another practice round does not clear evidence or teacher scores. The existing PR64 mastery-attempt workflow remains intact for supported mastery evidence.

The content package identifies six concepts ready for further release review; that does not establish every objective in their areas, certify performed behaviours, or authorize broad automatic mastery. The remaining validation gap is real and is not hidden behind a passing test or a new ring.

## Validation and limits

The procedural suite generates 11,560 questions: 167 retained original template sources (157 vary text under the sampled seeds; ten retain fixed text), plus 122 authored sources. It checks all four response formats, coherent generator validation, distinct option text, correct/incorrect keys, missing placeholders, source rotation, profile/class/generation/expiry tampering and server first-response preservation. Existing numerical/parameter, authored review, 18,000-seed audit, WPR unit/compose/browser and cross-course tests are retained. Known excluded audit patterns are not served by the new procedural issuer.

Synthetic enrolled browser tests cover immediate area launch, opaque answer-free question payloads, offline synchronization and server feedback, guest isolation, an area completed through real teacher-reviewed 3s, filled completion ring, next-area guidance, optional extension and unchanged assessment rows after new rounds. These are disposable SQLite identities, not production student records. Desktop/Chromebook-sized/phone, keyboard and axe checks accompany the navigation release. Passing structural/oracle checks is not proof that every natural-language choice is uniquely defensible. Physical school devices, real screen readers and classroom comprehension remain unverified.

## Policy and recovery assessment

Eight-question rounds are manageable practice units, not replacement mastery thresholds. Class presets stay Quick 50/95%, Standard 30/90%, Complex 20/90%, with teacher overrides. Existing WPR readiness uses a recent-practice window for guidance; it is not an official mastery window. A rolling/best-N mastery window could bound recovery effort but would change which evidence determines current proficiency. It requires a separately approved policy, versioned provenance and historical replay; it is not activated here. CSG-PKG-08 remains gated.

## Deployment, rollback and blocker

No D1 migration or authentication cutover is required. The Worker dry-run bundles successfully. Production deployment credentials are unavailable: `wrangler whoami` reports unauthenticated. Hosted new-protocol verification is therefore pending. Source/Pages release can proceed with the capability fallback; this does not mean the new Worker protocol is deployed.

Before Worker activation, authenticate the existing Cloudflare account, inspect current worker bindings/vars and preserve Google client, allowlist, secrets, D1 and cron; retain a compatible rollback Worker. Deploy the tested revision to that existing Worker, verify new and returning synthetic class profiles, signed answers, replay, offline synchronization and unchanged official evidence. Do not use a replacement example configuration or activate #56/#57. Rolling back to a Worker without v2 cannot score queued v2 responses; preserve their outbox/unverified copies and restore a compatible reader before permits expire. Stored official and historical records remain untouched.
