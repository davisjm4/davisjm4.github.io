# Navigation regression report

Integration uses the existing `cs-games/catalog.js` Robotics entry and `course-page.js`, with one new relative activity route. Robotics remains the fourth peer pathway. The existing Parts Sprint catalog entry, game, summary and images are preserved. The pathway description now covers both hardware recognition and engineering design; its noscript fallback links both activities. Course Architect contains static breadcrumb and footer links to Robotics and CS Games home.

Local automated navigation tests passed: 32 CSP cards, 24 Advanced cards, two Robotics cards; all topic filters, all activity-title searches, empty-result states and valid routes. All 34 CSP and 17 Java activity/report pages retain canonical return/home navigation. WPR selection/return, RACECES subject selection, summaries, hub and legacy routes remain intact. Catalog and shared session suites pass. Existing Parts Sprint passes its full 229,558-check generator/session regression. No unrelated CSP/Java/WPR code was changed.

Browser checks exercised local Course Architect directly and its engineering workflow. The managed local preview serves cs-games as its root, so production-style `/cs-games/` absolute return links are verified on the published site instead. Final published hub → Robotics → Course Architect, both return links, existing Parts Sprint and peer/shared-tool links are recorded in RELEASE_VERIFICATION.md with the deployment SHA.

Viewport verification used same-origin browser frames at 320, 390, 768, 1024 and 1366 CSS px. Their client/scroll widths were 305/305, 375/375, 753/753, 1009/1009 and 1351/1351 (scrollbar space excluded). A diagram aspect-ratio/min-height interaction causing 320px overflow was fixed before publication. Narrow layouts stack panels and retain the accessible segment table with internal table scrolling.

Keyboard editing/undo and standard form/button interaction are supported. Every graphical function has input/button alternatives. Reduced motion disables smooth scrolling and animation through CSS. Physical touchscreen operation and native screen-reader speech were not performed and are not marked passed.
