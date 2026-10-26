# Live browser verification — G-117

October 25, 2026 (America/Los_Angeles). Published runtime commit: `3264e0dac32513ec2d4a9d338c084cf1f1e4add0`.

Verified canonical URL: https://davisjm4.github.io/csp-games/copyright-creative-commons-lab/ . Cloud Chrome used real published files; DOM simulations are separately logged.

## Student flow

- Started with zero Copyright Lab attempts and Mixed selected. Four choices were visible; feedback and source links were absent.
- Chose the misconception that credit expands a one-slideshow permission into permission for a public asset pack. Feedback specifically explained that credit does not expand permission. All four buttons locked; accuracy was 0/1.
- Used Enter on Next, then Enter on the correct research-status action for an old-looking photograph with unknown facts. Correct feedback explained why appearance alone does not establish public domain; accuracy became 1/2.
- At phone width, answered an education/fair-use case correctly by keyboard. It explicitly said the limited facts do not establish a fair/unfair verdict. Combined results became 2/3.
- Changed through all six topic filters and back to Mixed. Each produced a relevant case without changing the three-attempt score. Reference Help expanded the compact BY/SA/NC/ND/CC0, TASL and uncertainty guidance without scoring.
- Opened shared Session Summary. Copyright Lab showed exactly 3 attempted, 2 first-try correct, 3 submissions and 1 incorrect; topic, practice type and Big Idea 5 rows agreed. Opened the HTML reset confirmation and activated Cancel by keyboard; results remained. Returned to practice and verified persistence.
- Followed the new CSP homepage card to the canonical route. Followed the consolidated AP CSP link, searched Copyright and selected 5.5 Responsible Computing. Exactly one game appeared in Big Idea 5; its launch opened the canonical route. Existing games remained in the unfiltered catalog.
- Keyboard focus on the Help link visibly showed the gold outline; DOM computed style confirmed a solid 3px outline. Buttons and native select are keyboard operable; feedback is exposed as a status region and receives focus.

## Responsive rendering

The adjacent browser-check.html is a development QA frame, not a new student mode. Actual inner document scroll widths were checked, with screenshots inspected at desktop and phone sizes.

|Outer frame width|Inner client width|Scroll width|Result|
|---:|---:|---:|---|
|1366|1351|1351|No horizontal overflow|
|1024|1009|1009|No horizontal overflow|
|768|753|753|No horizontal overflow|
|390|375|375|No horizontal overflow|
|320|305|305|No horizontal overflow|

For the tested fresh fair-use case, Next’s lower edge was approximately 736.5px at both desktop and 1024-wide Chromebook frames, fitting in a 768px-high student viewport. This is measured case evidence, not a guarantee about every font scaling setting or all feedback lengths. Phone choices stacked and wrapped; observed answer heights were approximately 72–94px at the narrowest width. Phone pages require normal vertical scrolling.

No application-source console error was observed. Captured errors identified the browser extension’s metadata sender, not game code. No backend, account or progress upload was introduced.

## Limits

Responsive frames are not physical Chromebook/tablet/phone hardware certification. Native screen-reader speech, touch hardware, physical printing and classroom learning effectiveness were not verified. Daily rollover, confirmed reset, disabled storage and all 60 family interactions were executed in automated tests; live browser checks covered selected representative cases and reset cancellation. No claim of professional legal review is made.
