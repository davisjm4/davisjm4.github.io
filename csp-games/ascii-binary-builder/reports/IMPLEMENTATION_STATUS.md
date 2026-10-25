# ASCII Binary Name Builder — implementation status

2026-10-24 · Tracker G-108 · Classroom review pending.

Implemented all four settings, individual byte editing for every character, immediate decimal/ASCII/full-text decoding, selected-character navigation, per-setting in-page draft preservation, exact checking with correction, first-try mode statistics, shared Session Summary and active-time integration. All 256 patterns are supported; controls and outside-ASCII values are explicitly labeled. Custom names are not included in stored assessment details. Learn and searchable 128-entry reference are freely available.

Generation pools: 94 single characters, 126 two-/three-character sequences, 299 four-/five-/six-letter words. Seeded 15,000-round mixed-setting validation observed zero exact repeats in the previous 50 rounds. Custom bypasses sampling/history.

New executed suites: 36,762 engine/generator assertions; 1,083 DOM interaction assertions (37,845 total). School-timezone UI rerun passed. Catalog tests passed. Full CSP regression is run before release; final CI/deployment status and commit are recorded in G-108 and Release History after live verification.

Local real Chrome checks completed generated target 8 (00111000/56), generated multi-character target wy, and Custom A␣!. Unsupported é produced explicit feedback. 390px responsive frame: 375px content and scroll width, eight buttons measured 71×52px, bit 128 correctly labeled Outside ASCII; searchable TAB entry showed decimal 9 / 00001001. This is viewport testing, not physical phone/Chromebook certification.

Regression fixes are test-only: legacy homepage card counts now expect 20; the preexisting 5,000-round session fixture starts at noon instead of near midnight so it tests bounded history without accidentally triggering a daily reset. Production shared session behavior is preserved.

Outstanding: classroom instructional review, physical Chromebook/touchscreen/assistive-technology checks. Workspace drafts intentionally live only in the current page; reload does not restore Custom names. Active time is shared CSP practice using the established two-minute idle convention. No AP readiness pathway implementation, student accounts, backend or data upload.

Published target: https://davisjm4.github.io/csp-games/ascii-binary-builder/
