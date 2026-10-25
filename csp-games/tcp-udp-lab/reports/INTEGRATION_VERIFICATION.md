# Integration verification — G-114 — 2026-10-25

## Provenance and reconciliation

Supplied ZIP: `tcp-udp-lab-claude-implementation.zip`, SHA-256 `1550a05cc7ce66cfb6ef2958fd262d09ad446366176596183d7b2f295c37d18a`.

Claude base: `0b4270c2fa0f973f94703053e50a74ad14b8eca5`. Integration parent: `8a2943f60d601e60e526b4f6091e1e1d65dbb0cc`, latest fetched main before integration. Four commits since Claude’s base added Vocabulary and Internet Layers and changed overlapping catalogs, test scripts, counts and cache tags. G-114 was absent from code/catalogs; its existing tracker row was found and will be updated, not duplicated.

Strategy: copy Claude’s complete lab directory and reconcile the smaller integration patch. Both patch options were inspected and `git apply --check` was run; no full patch was applied. The smaller patch’s workflow and activity row applied with path selection. Five stale hunks were reconciled manually against current files: CSP homepage, consolidated catalog/cache, package scripts, and hub expectations. Hub card count is 26, not the historical 24. Added a consolidated catalog renderer regression requiring exactly one TCP/UDP launch and one Internet Layers launch in the networking section. No shared session, Summary or theme runtime was replaced.

Claude’s 60 families, 180 situations, 360 instances, facts classifier, finite generator, topic filters and session adapter are retained. The supplied ZIP and its raw historical test output remain unchanged outside the repository; historical reports inside the lab are explicitly labeled.

## Targeted review changes

- Firewall case now explicitly blocks the transport carrying QUIC/HTTP3 and permits the HTTP2 transport. Handshake presence alone cannot rule out QUIC.
- Critical command and transaction cases distinguish delivery of bytes from application execution/transaction confirmation; connection-failure detection can take time.
- Conventional TLS record-stream cases explicitly exclude QUIC; feedback acknowledges QUIC’s different TLS integration.
- Small DNS query cases explicitly favor avoiding a new setup exchange. TCP remains valid for small DNS queries too.
- Nonblocking telemetry states its application queue/drop policy; UDP alone does not make sends nonblocking. Some immediate/latest-delivery wording was qualified, and multicast copies may still be lost.
- Cross-client quiz/edit ordering is identified as application coordination rather than a transport-wide ordering guarantee.
- T/U/N shortcuts are opt-in, off by default. Tab, Enter and Space remain available. Learn link opens the collapsed reference directly.
- Fixed a reporting typo: the two 1,000-round reload runs total 2,000, not 3,000. Generator behavior is unchanged.

## Curriculum and primary sources

Verified College Board CED printed pp102–104 (PDF pp108–110): CSN-1.C covers packet communication, CSN-1.C.4 identifies IP/TCP/UDP, and CSN-1.D.2 concerns HTTP. Topic4.1 shows no added protocol-mechanism memorization requirement. Detailed QUIC, TLS, DNS modes, flow/congestion control and head-of-line blocking are labeled enrichment. Mapping metadata remains compatible with the future readiness pathway; the pathway itself is not implemented.

Primary references inspected:

- https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf
- https://www.rfc-editor.org/rfc/rfc9293.html — TCP endpoint stream service and connection handling.
- https://www.rfc-editor.org/rfc/rfc768 — UDP datagrams.
- https://www.rfc-editor.org/rfc/rfc7766.html — DNS supports TCP and UDP, including valid TCP use for small queries.
- https://www.rfc-editor.org/rfc/rfc9113.html — HTTP2 over TCP; application request processing is distinct from transport delivery.
- https://www.rfc-editor.org/rfc/rfc9114.html — HTTP3 over QUIC.
- https://www.rfc-editor.org/rfc/rfc9001.html — TLS integration with QUIC.

This is implementation/source review, not independent educator or networking-expert certification.

## Independent automated evidence

Dependency setup: `npm ci --ignore-scripts --prefix csp-games` completed. The four supplied non-browser suites were rerun before and after review, then included in the complete current CSP regression run. Added 75 integration-review assertions. Final lab suite counts: 29,279 validation +15,284 generator +49 session +73 DOM +75 review = **44,760 assertions**. Daily reset, local storage corruption/failure, filter persistence, one scored selection, no-score skips/help and protocol/history lifecycle were tested with the real shared tracker. Los Angeles timezone run passed.

Generator tests execute 15,000 core +3,000 switching +2,000 reload +20,000 long-run +6,000 coverage rounds = **46,000 measured rounds**, in addition to deterministic, narrow-pool and topic-coverage checks. Core TCP/UDP: **7,482/7,518 (49.88% TCP)**. Long run: **10,003/9,997**. Zero exact50 and previous-three-family violations; all360 instances reached. Revised scenario length shortcut:54.7%; best single-word cue (“order”):65.6%; long-run answer-pattern predictor54.2%. These metrics are not proof of natural-language ambiguity absence.

Narrow filters retain30–42 underlying situations and60–84 exact instances. Measured situation gaps20–30 rounds mean a story can recur with a changed neutral network condition before50. Mixed minimum situation gap51 in the measured run. This is a disclosed finite corpus, not unlimited authored stories. No generator change was made merely to improve a metric.

## Browser evidence and limits

Independent connected Chrome checks supplement the Node/DOM tests. The supplied standalone Playwright browser harness is preserved and adjusted for opt-in shortcuts, but was **not rerun** in this integration environment; its bundled Chromium/axe results are historical Claude evidence, not new validation. No fresh axe scan, Firefox, Safari, actual touch hardware, physical Chromebook or real screen-reader test is claimed.

Local responsive frame widths320/390/768/1024/1280 showed no horizontal document overflow. Measured answer targets were at least119×68px. Native keyboard Tab moved focus from TCP to UDP with a visible solid outline; Enter answered and focused status feedback. An unenabled U shortcut did not submit. Learn opened through its reference link. Live verification, Pages/CI IDs, final commit and tracker status are recorded in G-114 after deployment.

## Remaining review

Classroom/educator review, advanced terminology reading load, physical-device and assistive-technology checks remain pending. Protocol accuracy appears inside the game; shared Session Summary retains the established game/topic/filter tables. No account/backend or readiness pathway was added. No unrelated generated report changes are included.
