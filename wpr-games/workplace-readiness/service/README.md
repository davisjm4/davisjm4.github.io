# Workplace Readiness reporting service

The student website and Teacher Tools remain on GitHub Pages. A separate Worker handles authenticated teacher requests, frozen assignment versions, anonymous submissions, class totals, and optional pseudonymous profiles. No public Pages path needs privileged credentials.

See [teacher-managed profiles](PROFILES.md) for enrollment, recovery and retention.

## Run the integrated development version

Requires Node.js 24 with `node:sqlite`. From the repository root:

```sh
export WPR_DEV_TEACHER_TOKEN="$(openssl rand -hex 24)"
node wpr-games/workplace-readiness/service/dev.mjs
```

Open http://127.0.0.1:8791/cs-games/teacher/ and use the local teacher token in the Online Diagnostic panel. This service listens on loopback and uses SQLite by default. Keep the process running while using assignment links. A browser on another computer cannot connect to the loopback development service. For persistence between runs, set a path outside the repository in `WPR_DEV_DB` and a stable random secret in `WPR_DEV_SUBMISSION_SECRET`. Leave these unset for disposable development runs.

1. Select groups and question counts. Preview and optionally regenerate before publishing.
2. Copy the student link. Open it in separate browser profiles for separate simulated participants.
3. Complete the assignment. Open Performance for the local readiness dashboard.
4. From Teacher Tools, open the assignment's class report. Breakdowns become available after five completed submissions.
5. Use **Create targeted practice** on a weak topic, then generate and publish the follow-up assignment.

## Production deployment

Follow the [CS Games deployment runbook](DEPLOYMENT.md) for dedicated Worker and D1 provisioning, Google teacher authentication, backups and synthetic smoke testing.

## Data and access

- Students receive public prompts and choices from the snapshot. Answer keys and feedback are released only as configured, through the attempt endpoints. The student URL contains the assignment ID alone. This is a formative activity. Students can share links and can repeat with a different browser profile.
- Anonymous, random browser nonces are scoped to one assignment and used to limit accidental retakes. There is no fingerprinting, student identity collection, or account lookup. Report access is scoped to the authenticated teacher who created the assignment.
- While immediate feedback is active, the server temporarily locks each answer in the in-progress receipt. Completion atomically adds only aggregate counters and clears those answers. A keyed digest supports idempotent retries. The teacher sees completed submissions, which may include retakes.
- Class breakdowns update only after each batch of five submissions. Individual score buckets and wrong-choice details below five are suppressed. The total completion count can update sooner. This limits single-submission comparisons between report refreshes. It does not provide differential privacy.
- Publication freezes the generator's validated question set, scoring and topic metadata as one immutable version. Republishing creates a new link. Quota filters select the original questions at generation time. The server validates the frozen format and independently grades submissions against its stored answer key.
- Each online question is worth one point. Ordering and document identification use the existing assessment adapter's single-choice representations. Interactive sequencing and document marking remain available in ordinary practice.
