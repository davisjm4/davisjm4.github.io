# CS Games usability audit for Claude and Gemini

Use the [audit branch](https://github.com/davisjm4/davisjm4.github.io/tree/audit/full-role-ux-environment) in the [DevCat Studios repository](https://github.com/davisjm4/davisjm4.github.io). It contains the site, test launcher, and fixtures. The audit uses synthetic data for all teacher and student workflows.

## Start the audit

In a terminal with Git and Node.js 24 or newer:

```sh
git clone --depth 1 --single-branch --branch audit/full-role-ux-environment https://github.com/davisjm4/davisjm4.github.io.git cs-games-audit
cd cs-games-audit
node _audit/cs-games/launch.mjs
```

From an existing checkout, fetch and switch to `audit/full-role-ux-environment` before running the same Node command. Launch requires only Node and the checked-out source. Keep the terminal process running and open the printed **CS Games audit start page** URL in a browser that shares the terminal's network environment. A successful startup prints a `127.0.0.1` URL ending in `/audit/`. If the page is unreachable, request `/audit/` on that exact origin from the launch terminal with `curl -f`. A successful response contains **CS Games local audit**.

| Role | What to do |
| --- | --- |
| Independent student | Follow **Test as Independent Student**, pick a course, open a skill, practice, and return to the map. Compare map and list navigation. |
| Enrolled student | Use **Join as a new student** under any of the four courses, or use its synthetic profile ID and recovery credential in **Restore profile**. Open a skill and practice. Return to the map and restore the same profile in a second context to verify synced evidence. |
| Teacher | Expand **Teacher sign-in credential for this run**, copy the token, open Teacher Tools in the same tab, and paste it into **Development teacher token**. Open **My Classes**. Each seeded class starts with 24 profiles. |
| UX/UI reviewer | Use the live interfaces at desktop, tablet, and phone widths. Record each task, route, expected and observed behavior, impact, and reproduction steps. |

Start with the Advanced Computer Science profile labeled **High activity, low accuracy**. In the teacher view, open **View progress** and inspect **Recent practice attempts**. In **Customize mastery requirements**, try a 30-question rule at 90%, review its effects, save the draft, then publish. In a separate student context, restore the same profile and check **Loop Lab → Choose the Loop Type**. Record a teacher-reviewed 4/4 with **Project or portfolio**, verify it in the student map, and use **Export class progress CSV**. The Workplace Readiness class includes a diagnostic with seven completed synthetic submissions. [More scenarios](README.md)

Stop the process with Ctrl+C and launch it again to reset. Each process gets a fresh port, in-memory database, invites, and credentials. Use a fresh browser context for the next run. Treat the loopback URL and credentials as local to the current process. Avoid forwarding the port or putting its credentials in screenshots or reports.

## Browser testing and common setup errors

Manual browsing needs a browser on the same machine or sandbox as the launcher. To run the repository's automated Chromium checks, install the pinned test dependencies and provide a Chromium executable:

```sh
npm ci --ignore-scripts --prefix wpr-games/workplace-readiness
CHROME_BIN=/absolute/path/to/chromium node --test --test-concurrency=1 _audit/cs-games/isolation.test.mjs _audit/cs-games/workflows.test.mjs
```

| Symptom | Check |
| --- | --- |
| `node:sqlite` is missing or Node rejects a module | Run `node --version` in the launch terminal and use Node 24 or newer. |
| The launcher file is missing | Check `git branch --show-current` and your working directory. The launcher is on the audit branch. |
| The browser reports connection refused | Verify the process is still running, use the current printed URL exactly, and confirm that the browser can reach the terminal's loopback interface. |
| Teacher sign-in or student restore fails | Copy the current run's credential. Old credentials expire with that process. Use the same browser tab for teacher pages, and a separate browser context for each student. |
| Chromium fails on its process singleton socket | Use the official Chrome Headless Shell and set `CHROME_BIN` to its executable. |
| GitHub is readable but the environment lacks terminal, localhost, or Chromium access | Use the [illustrated review guide](STATIC_REVIEW.md). Report results as static design observations and label interactive steps untested. |

The local server binds to loopback and uses the real reporting handlers with disposable SQLite. Google authentication and the deployed Worker remain outside the audit path. See [verification and security checks](VERIFICATION.md).

## Prompt to paste into Claude or Gemini

> Use the [CS Games full-role audit branch](https://github.com/davisjm4/davisjm4.github.io/tree/audit/full-role-ux-environment) and follow `_audit/cs-games/CLAUDE_GEMINI_HANDOFF.md`. Audit the actual interfaces as an independent student, an enrolled student, a teacher, and a UX/UI reviewer. Exercise all four courses and the teacher publish-and-review sequence. Use only the local synthetic environment. Report reproducible findings and indicate which workflows you directly tested. If your environment cannot run the browser walkthrough, review the illustrated guide and state which tasks you could not exercise.
