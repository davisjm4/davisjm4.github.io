> Historical Claude handoff report. Current reconciliation, independent validation, corrections and release evidence: [INTEGRATION_VERIFICATION.md](./INTEGRATION_VERIFICATION.md).

# Implementation report — TCP vs. UDP Decision Lab (G-114)

Base commit: `0b4270c2fa0f973f94703053e50a74ad14b8eca5` of `davisjm4/davisjm4.github.io` (cloned read-only, Oct 25 2026). Nothing has been pushed, deployed, or written to the tracker.

## 1. Repository inspection

- **`/csp-games/`.** The closest existing games are the standalone two-choice labs, *Lossless vs. Lossy Compression Lab* and *Analog vs. Digital Lab*, and the newer *Roundoff vs. Overflow Lab*. This lab follows their structure: `content.js` → engine → `app.js`, the shared `../style.css` theme, the shared `../session.js` tracker and `addSessionNavigation`, and the `?v=` cache-busting convention.
- **Lesson from repo history.** Commit `303e050` changed the Roundoff lab to create tracker records only when an answer is submitted, so that Session Summary cannot reveal the category of an unanswered round. The same commit softened its answer balancing. This lab adopts both.
- **Internet Layers & Protocol Roles Lab.** Not present in the repository, so there is no conflict. `CURRICULUM_COVERAGE.md` lists "TCP/IP distinctions" as a remaining gap.
- **Other networking games.** Packet Router and Network Breaker cover routing and fault tolerance, not transport protocols. There is no content overlap.
- **Session infrastructure.** The tracker exposes `begin`, `annotate`, `submit`, `closeIncorrect`, `snapshot`, daily local-date reset and idle-aware active time. Session Summary renders game, topic and mode tables. It has no per-protocol axis.
- **Integration points.** Taken from the Lossless lab's commit (`e859c02`): hub card in `csp-games/index.html`, hub catalog row in `csp-games/app.js`, card count in `csp-games/ui-tests.mjs`, CS Games entry in `cs-games/catalog.js` plus a cache bump in `cs-games/csp/index.html`, a `package.json` script, and a CI workflow.

## 2. Architecture

- **Requirement facts.** Each family declares structured facts. TCP-side facts mean the application relies on the transport for something: complete delivery, order, a byte stream, flow control, congestion control, connection state, segmentation of large messages, or a network that allows only connection traffic. UDP-side facts describe needs that TCP's behavior works against or cannot meet: freshness, multicast or broadcast, the application's own recovery, self-contained messages, minimal overhead, avoiding head-of-line blocking, no backpressure, roaming, stateless servers, and application rate control. A family may instead name an application protocol with a fixed transport (HTTP/1.1, HTTP/2, SSH, TLS, FTP, DNS large-answer retry, DNS zone transfer → TCP; QUIC, HTTP/3, ordinary DNS query, TFTP, NTP, DTLS, DHCP → UDP).
- **`classify()`.** Derives the answer from the facts. It rejects contradictory facts (TCP-side plus UDP-side, or TCP-side plus loss tolerance), incomplete facts (for example, freshness without loss handling), facts that decide nothing, and protocol bindings that conflict with the facts. A family whose derived answer differs from its authored answer fails to load.
- **`validateFamily()`.** Also requires:
  - every true fact is visibly stated in each situation's text (pattern check), and every named protocol appears;
  - the scenario never contains TCP, UDP, "datagram", "byte stream", "connectionless" or "connection-oriented";
  - no student-facing text matches a list of forbidden generalizations ("UDP is faster", "TCP guarantees", "all web traffic", "unreliable", "DNS only uses", TCP encrypts, and others).
- **Instances.** Each instance is one situation plus one of four answer-neutral network conditions: loss, reordering, 150 ms round trip, or congestion. Situations marked `local` (one building or venue) never receive the long-distance delay condition. Condition placement and phrasing vary deterministically.
- **Generator selection order.** Exact-question history of 50 → previous-3-family cooldown → soft answer choice → longest-unseen situation → avoid the same application category twice in a row → least-used family → (Mixed) least-used topic → random.
  - The exact and cooldown constraints relax only when a pool is exhausted, cooldown first. Selection filters finite arrays, so it cannot deadlock.
  - The answer choice uses a weight of 0.97^(count difference) and a streak weight of [1, 1, 1, 0.8, 0], with a hard maximum streak of 4. Stronger settings were measured and rejected because they let students beat chance by guessing patterns (§4).
- **Feedback sections.** Verdict ("Correct — X" / "Incorrect — Correct answer: X"), a scenario-specific reason with the protocol behavior, why the other protocol is less suitable, a note on the stated network condition, and, for misconception families, a "Keep in mind" note.

## 3. Instructional accuracy decisions

- **TCP.** Described as reliable while the connection works; if the connection fails, the application receives an error. No unqualified "guarantee" wording is used. TCP is stated not to preserve message boundaries (one family has the application add its own length fields) and not to encrypt (TLS and SSH families).
- **UDP.** Described as having no built-in delivery or order guarantee and no retransmission, flow control or congestion control. It is never called faster or unreliable. Families cover reliability built above UDP (custom protocols, TFTP, QUIC), security above UDP (DTLS, QUIC), and applications adapting their own rate under congestion.
- **Modern protocols.**
  - QUIC runs over UDP and provides reliability, congestion control and encryption itself; HTTP/3 runs over QUIC.
  - HTTP/1.1 and HTTP/2 run over TCP, and browsers fall back to HTTP/2 when QUIC is blocked.
  - DNS is shown with both answers: ordinary small queries commonly use UDP; truncated large answers and zone transfers use TCP.
- **Category balance.** No application category decides the answer. Games, video, voice, sensors, web, file transfer, remote terminals and multiplayer all appear with both answers. Examples:
  - recorded voice → TCP, live voice → UDP;
  - game purchases → TCP, game positions → UDP;
  - buffered streaming and live streams with a 20-second delay → TCP, sub-second live streams → UDP;
  - a tiny alarm message that must arrive → TCP, tiny loss-tolerant readings → UDP;
  - SSH → TCP, a roaming terminal session → UDP.
- **Simplification noted for review.** The DTLS family says a video-calling app "uses DTLS to secure its live audio and video." In WebRTC, DTLS performs the key exchange and SRTP encrypts the media (DTLS-SRTP). The transport answer is unaffected.

## 4. Measured results (from `reports/GENERATOR_VALIDATION.md`)

- **Content.** 60 families (30 TCP / 30 UDP), 180 situations, 360 validated instances (180 / 180). Every filter is exactly 50/50 by instance count.
- **Core simulation.** 15,000 rounds (5 seeds × 6 filters × 500): 0 exact repeats within 50, 0 previous-3-family violations, 0 relaxations, 49.9% TCP, maximum streak 4.
- **Other runs.** Filter switching: 3,000 rounds, 0 violations. Simulated reloads: 2,000 rounds, 0 violations. A 6,000-round Mixed run reached all 360 instances.
- **Answer patterns.** During development, with the earlier, stronger weighting (now removed, so this figure is not reproducible from the shipped code), guessing "whichever answer has appeared less" scored 69.5%. After tuning, the best pattern strategy over 20,000 rounds scores 54.2%. A fair coin measured the same way scores 50.3%.
- **Situation recurrence.** During development (earlier selection rule), the minimum gap in a narrow filter was 5 rounds; with the shipped rule it is 20–30. Mixed never repeats a situation within 50 rounds.
- **Shortcut audit** (student-visible scenario text only):
  - Length predicts the answer 54.2% of the time.
  - The best single word, "order", predicts 65.6%.
  - An early draft let "transport" predict TCP (58 of 60 occurrences); that was rewritten.
  - No application category with 10 or more instances exceeds a 70% majority.

## 5. Tests executed

See `reports/test-results/` for raw output from the final run against the extracted package.

| Suite | What it covers |
|---|---|
| `validation.test.mjs` | Counts, balance and coverage. The classifier and an independently written oracle agree on all families. Corruption checks: for every family, adding an opposite-side fact, stripping its decisive facts, conflicting protocol bindings, deleting the requirement sentence, and naming the answer in the scenario must all be rejected. Also: no clues before answering, explanation-to-scenario match, forbidden-claim scans of all student text including the Learn panel, QUIC/HTTP/DNS representation, local-network/delay pairing, and shortcut gates. |
| `generator.test.mjs` | 15,000 core rounds plus switching, reload, long-run and coverage runs; determinism; history restore across filters; tiny-pool deadlock and relaxation order; error handling. |
| `session.test.mjs` | Local stub tracker and the real shared tracker: one scored attempt, incorrect rounds closed, metadata fields, topic, mode and protocol accuracy, reload persistence, daily reset, corrupted or unavailable storage. |
| `ui.test.mjs` | linkedom DOM: two plain choices, nothing revealed before answering, a single scored attempt, feedback sections, skips, every filter, Learn panel not counted, keyboard shortcuts (ignored in the select and with Ctrl), persisted history, daily reset. |
| `browser.test.mjs` | Real Chromium (Playwright) at 1440, 1366, 1280, 768, 390, 360 and 320 px: keyboard-only and touch play, visible focus, focus moved to feedback, ≥44 px targets, no horizontal scroll, Learn panel, Session Summary listing, no console errors, axe-core WCAG 2.1 A/AA scan (0 violations at 1440 and 390). |
| Regression | Full `npm test` in `csp-games` (all existing suites) and `cs-games/catalog-tests.mjs`, with the integration patch applied. Lab suites also run under TZ=America/Los_Angeles, UTC and Pacific/Kiritimati. |

## 6. Known limitations

1. **Not reviewed by people.** No educator, classroom or networking-expert review has taken place. Explanations were self-checked against the TCP, UDP, QUIC, HTTP/3 and DNS-over-TCP RFCs from knowledge, not line by line. `reports/CONTENT_REVIEW.md` lists every family for review.
2. **CED alignment is unverified against the primary source.** Metadata cites learning objective CSN-1.C / EK CSN-1.C.4 (and CSN-1.D.2 for HTTP families). The official CED PDF was fetched, but text extraction stopped before Big Idea 4. The EK numbers come from a secondary syllabus and the repository's `CURRICULUM_COVERAGE.md`. Exclusion statements for Topic 4.1 were not checked. QUIC, flow control and head-of-line blocking likely go beyond what the AP exam assesses.
3. **Protocol accuracy is not in Session Summary.** It appears in the game's breakdown panel and in each record's `correctProtocol` annotation, but Session Summary has no protocol table. Adding one would mean changing shared `summary.js`, which was left untouched.
4. **Narrow filters recur situations.** A narrow filter has 30–42 situations, fewer than the 50-round window, so a situation can recur within 50 rounds with a different network condition (minimum gap 20–30). Exact questions do not recur.
5. **Variety comes from composition.** The 360 instances come from 180 authored situations × network conditions. Wording within a family follows the family's pattern.
6. **Residual cues.** The best single-word cue is 65.6% (a decisive concept word). Pattern guessing reaches 54.2% against chance at 50%.
7. **Fixed seeds share answer sequences.** With a fixed test seed, the TCP/UDP sequence is the same in every filter. Real play seeds from the clock.
8. **Browser coverage is Chromium only.** Not tested in Safari, Firefox, on a physical Chromebook, on touch hardware, or with a screen reader (axe-core is automated only). Single-letter shortcuts T/U/N could fire if a screen reader is in focus mode; in browse mode the screen reader consumes those keys.
9. **Curriculum alignment exists only as metadata.** No readiness pathway was built.
10. **The browser test is not in CI**, because CI does not install browsers.
