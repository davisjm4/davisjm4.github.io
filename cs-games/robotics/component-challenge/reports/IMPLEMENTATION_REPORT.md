# VEX Component Challenge — Build 3

Date: October 31, 2026. Robotics 1, VEX V5. Canonical route `/cs-games/robotics/component-challenge/`. Tracker reservation G-122: searched the existing inventory for title/ID; neither existed. Published SHA and deployment verification are recorded in RELEASE_VERIFICATION.md.

## Implemented

Four distinct modes (Choose the Component, Fix the Build, Build a Solution, Tool and Fastener Match), Mixed default after onboarding, Beginner default, three levels, category filters, constrained decision scenarios, misconception feedback, multipart exact-set checking, missing/extra role feedback, corrected-answer learning credit, and reference-assisted unscored practice. No timer, accounts, dragging or leaderboard.

One source of truth: imports the existing 56-part Parts Sprint catalog and its local image assets, plus the existing Robotics session facade over the shared session engine. No catalog duplication or breaking changes to Parts Sprint. Scenarios refer to stable component IDs and explicit thread/shaft/mounting assumptions. A lightweight searchable reference shows original provenance and compared functions, hidden until feedback or an explicit unscored reveal. No correct-answer highlighting appears before a decision.

Robotics registry now launches three published activities. Static breadcrumbs/footer links return to the canonical Robotics pathway and CS Games hub. No new menu, duplicate hub, Course Architect expansion, Teacher Reporting or QTI integration.

Daily metrics use `roboticsGames.session.v1`, game ID `component-challenge`, actual mode+difficulty and category dimensions. Mixed mode metadata is retained on each record. The separate recent-family key is `roboticsGames.componentChallenge.history.v1`, with the shared local-day/session ID. Wrong then correct increments afterRetry while preserving firstTry. Early reference access uses tracker.reveal and cannot become first-attempt accuracy. Blocked storage warns and falls back to memory. Existing other games' keys/history are preserved.

## Honest content scope

75 independently authored playable cases across 66 distinct reasoning families. Nine underlying mechanisms intentionally share family IDs across modes. Choose25, Fix18, Solution20, Tools12; Beginner26, Intermediate33, Advanced16; seven hardware categories. This is below the requested 100-family/300-instance targets. No choice shuffles, synonyms, robot names or seed changes are counted as additional technical cases. See ENGINEERING_SCENARIO_CATALOG.md for per-family AI/source editorial review. Independent VEX educator review has not occurred.

## Validation and browser evidence

196,730 automated assertions including 20,000 selections, exhaustive solution-subset grading, 11 independent tool/dimension checks, local-day rollover, retries, persistence, other-game isolation and unavailable filters. Additional UI-contract, complete ecosystem catalog/navigation, shared-session and existing Parts Sprint suites passed. Narrow pools have material unavoidable repeats, disclosed in the interface and audit; neither pool size nor cooldown coverage is overstated.

Local Chromium: all four modes; wrong then corrected single/multipart answers; keyboard Space/Enter; explicit missing role; T15 match; early reference reveal/search; 56 reused reference records; reload preserved actual per-mode first-attempt/retry/reveal counts. Responsive frame CSS widths320/390/768/1024/1366 gave client/scroll305/305,375/375,753/753,1009/1009,1351/1351. Physical Chromebook/touch and native screen-reader speech are unperformed, not passed.

The managed preview initially rejected symlinked static directories; using actual static preview copies resolved the environment issue. Production uses normal repository files. Screenshots and exact run logs are packaged as evidence.
