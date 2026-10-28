# Robotics navigation integration

Robotics is a fourth peer card in the existing CS Games hub, alongside AP CSP, Advanced CS and Workplace Readiness. RACECES remains a shared practice tool. The Robotics pathway reuses cs-games/catalog.js and course-page.js with its course key and topic group. The game returns to Robotics and CS Games through the existing breadcrumb pattern; the pathway summary link targets the in-game session section.

Modified shared files: cs-games/index.html, styles.css, catalog.js, course-page.js, catalog-tests.mjs and navigation-tests.mjs. The hub grid changed from three desktop columns to two for four cards; mobile remains one column. Existing course routes, WPR skills return, RACECES subject selection, legacy routes, navigation stylesheet and storage behavior remain intact. This extends Package A's pattern without replacing it.

Catalog/navigation tests passed with 32 CSP, 24 Advanced and 1 Robotics catalog entry. Browser checks traversed hub → Robotics → game → Robotics → hub at 320/390 pixels and launched existing CSP, Advanced and WPR paths; RACECES and Teacher Tools were smoke-tested. The game was checked at 320/390/768/1024/1366 pixels with no observed new horizontal overflow. Native physical device and assistive-technology checks are pending.

Implementation: 11c2b87b598dbbb002e681fd0bacaa779bb93f24. Actual recovered navigation CI log: evidence/navigation-ci.log. Published pathway: https://davisjm4.github.io/cs-games/robotics/ .
