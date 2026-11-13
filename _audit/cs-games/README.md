# CS Games full-role audit

For a GitHub checkout, see the [Claude and Gemini handoff](CLAUDE_GEMINI_HANDOFF.md). For a static review, see the [illustrated guide](STATIC_REVIEW.md).
## Launch in ChatGPT Work or Claude

Give each auditor a separate copy of the source snapshot, or run a separate process for each auditor on the same machine. Extract the ZIP, enter the directory containing `cs-games/` and `_audit/`, and run:

```sh
node --version
node _audit/cs-games/launch.mjs
```

Use Node.js 24 or newer with `node:sqlite` and a browser on the same machine or in the same sandbox as Node. The launcher works offline with the extracted ZIP and a preinstalled Node runtime and browser. Open the exact **CS Games audit start page** URL it prints. The port changes on each launch. Leave the process running while using the browser.

For Claude, the ZIP is the complete site source and fixture harness. Use Claude's terminal to launch the process and run Chromium in that same sandbox. If using a browser automation tool, use one that can reach the process's loopback interface. A separately hosted browser or the user's phone has its own loopback address. The optional verification commands below can drive Chromium from the same terminal as Node.

### Routes and roles

| Path on the printed origin | Use |
| --- | --- |
| `/audit/` | Role links, class links, and generated credentials for this instance |
| `/cs-games/student/guest/` | Independent student. Pick any of the four courses and use a fresh browser context for an account-free audit |
| `/cs-games/student/` | Restore a seeded profile with its ID and recovery credential, or start from a class's **Join as a new student** link |
| `/cs-games/teacher/` | Expand **Teacher sign-in credential for this run** on the audit page, then paste the token into **Development teacher token** in Teacher Tools and sign in |
| `/cs-games/` | Public-style hub, course catalogs, and activity navigation for a UX/UI audit |
| `/cs-games/teacher/#practice` | Diagnostic and practice builder, class diagnostic reports, and Canvas quiz export |
| `/wpr-games/workplace-readiness/` and `/wpr-games/raceces/` | Workplace Readiness and RACECES |
| `/java-games/string-lab/` | Duplicate Session Summary reproduction |

Use the same teacher tab to follow the class, pacing, and requirements links so the existing teacher session follows its normal tab-scoped behavior. Use separate browser contexts for guest, student, and teacher perspectives. To switch enrolled classes in one student context, sign out from **Student profile**, then use the next enrollment link or restore credentials. A student profile is specific to a class.

### Start with these scenarios

| Class or role | Scenario | Where to look |
| --- | --- | --- |
| Advanced Computer Science | High activity, low accuracy | Open **My Classes**, select Advanced Computer Science, match the profile ID from the audit page, and click **View progress**. Expand **Recent practice attempts** for question family and difficulty. Baseline is 10 correct of 36 |
| Advanced Computer Science | High Beginner accuracy only, Level 3, and Level 4 | Restore each profile separately. Open **Loop Lab → Choose the Loop Type → Formative proficiency**. Expect Levels 2, 3, and 4 respectively |
| Advanced Computer Science | Interrupted session | **Loop Lab → Count the Executions → Practice history**. A six-answer attempt was restarted and the current attempt contains two answers |
| Advanced Computer Science | Teacher modified the requirement | **Count the Executions** has a published 20-question, 85% first-try requirement. This profile has 18 answers. The class has shared pacing dates and an earlier revision |
| Any course | Level 4 through alternative evidence | Open the audited skill below. A synthetic **Project or portfolio** score of 4/4 is visible separately from practice. As teacher, record a new score in **View progress → Teacher assessment** |
| Any course | Completed an assigned area | Open the audited skill's area. Its required checkpoints have teacher-recorded awards |
| Workplace Readiness | Diagnostic | The audit page links to the class diagnostic. The teacher can open its **Class report**. Seven submitted results seed the aggregate. Use **Just started** for a new submission |
| Guest | Compare with an enrolled profile | Play first in the independent map, then restore a profile in the same browser to check that guest practice stays separate. Use a second context to simulate another device |

| Class | Audited skill | Practice |
| --- | --- | --- |
| AP CSP | Capacity and maximum value | Binary Builder |
| Advanced Computer Science | Choose the Loop Type | Loop Lab |
| Robotics 1 | Identify structural components | VEX Parts Sprint |
| Workplace Readiness | Contribute ideas | Creativity and Innovation, with separately tracked Workplace Readiness practice and diagnostics |

All 96 student profiles and all scores are synthetic. The scenario names appear on the local audit page as a cross-reference. They are absent from the application roster.

### Teacher workflow for the next audit

1. Open the Advanced Computer Science class and compare a zero-activity profile, the 10/36 profile, and a high-proficiency profile. Read the activity breakdown and expand recent attempts.
2. Open **Customize mastery requirements**. Set class defaults to 30 questions at 90% first-try accuracy. Save class defaults and open **Review**. Inspect affected skills, warnings, and version history. Save the draft and refresh the enrolled student before publishing to compare draft and published views.
3. Publish, refresh the student, and open **Loop Lab → Choose the Loop Type**. Confirm the new requirement. The pre-seeded Count the Executions skill override still applies to its own skill.
4. In the teacher report, record a 4/4 **Project or portfolio** demonstration for the same profile and checkpoint. Refresh the student map and confirm the assessment score. The student can read **Plan a demonstration**, complete the work separately, and bring it to the teacher.
5. Start practice from that checkpoint, answer, and use the class progress link to return. Restore the same ID in a second context to verify synced evidence. Compare the student and teacher reports, then **Export class progress CSV**.
6. Try enrollment-link generation, teacher-issued profiles, roster CSV, recovery reset, pacing changes, revision preview, and a new online diagnostic using disposable profiles or a new class.

### Reset

Stop the process with Ctrl+C and start it again. Every launch creates a fresh in-memory database, local port, teacher credential, profile IDs, invites, recovery credentials, and submission secret. Scenario conditions are recreated. Use a fresh browser context or clear site data for the old origin if you also want to discard local guest history and browser state.

Do not tunnel, forward, or proxy the audit port. The role page is intentionally available to processes on the same loopback interface so each auditor can open a disposable dataset.

### Repeat the verification

The browser dependencies are optional for interactive use. For the supplied automated checks, install the repository's pinned dependencies once where npm is available. Use a preinstalled Chromium, Chrome, or Chrome Headless Shell executable.

```sh
npm ci --prefix wpr-games/workplace-readiness
CHROME_BIN=/absolute/path/to/chromium node --test --test-concurrency=1 _audit/cs-games/isolation.test.mjs _audit/cs-games/workflows.test.mjs
```

If Chromium in a restricted sandbox fails on its process singleton socket, use the official Chrome Headless Shell binary with `CHROME_BIN`. The bundled launch procedure itself remains offline. See [VERIFICATION.md](VERIFICATION.md) for checks, limitations, and the Session Summary findings.
