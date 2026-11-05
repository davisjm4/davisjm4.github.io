# Workplace Readiness reporting service

The student website and Teacher Tools remain on GitHub Pages. A separate Worker handles authenticated teacher requests, frozen assignment versions, anonymous submissions, and class totals. No public Pages path needs privileged credentials.

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

Use a school-authorized Cloudflare account and Google Cloud project. This repository includes no active provider connection or production deployment.

1. Create a Google OAuth **Web application** client for Google Identity Services. Add `https://davisjm4.github.io` to authorized JavaScript origins. Configure the consent screen and permitted teacher accounts. The Worker verifies the ID token's signature, audience, issuer, expiry, verified email and exact email allowlist. A Drive connector authorization is separate from this application client.
2. Create the D1 database with Wrangler, from this directory. Copy `wrangler.example.toml` to a local configuration file and insert the returned database ID and public OAuth client ID. Keep account-specific local configuration out of commits.

   ```sh
   npx wrangler d1 create devcat-wpr
   cp wrangler.example.toml wrangler.toml
   npx wrangler d1 execute devcat-wpr --remote --file=schema.sql
   npx wrangler secret put TEACHER_EMAILS
   npx wrangler secret put SUBMISSION_SECRET
   npx wrangler deploy
   ```

   Enter a comma-separated list of authorized teacher emails for `TEACHER_EMAILS`. Use a stable random secret of at least 32 characters for `SUBMISSION_SECRET`. Rotating the submission secret invalidates retries for previously completed receipts. The cron removes expired assignments after 90 days and unfinished receipts after one day. Keep request-body logging off and confirm provider data retention settings before using real classroom data.
3. Set `productionApi` in [online/config.mjs](../online/config.mjs) to the Worker HTTPS origin with `/api/wpr` appended, without a trailing slash. Set `googleClientId` to the public OAuth client ID. Review and merge the Pages changes through the normal repository release process.
4. Verify teacher sign-in, unauthorized reporting access, a real shared student link across different devices, duplicate retries and the five-submission privacy threshold. Publish a synthetic assignment to test. Delete it when finished.

Cloudflare D1 was selected for its Worker binding, SQLite compatibility and scheduled cleanup. A managed Postgres service would also support this workflow, but would require a separate database connection or HTTP transaction interface. This service uses one write to commit a receipt and all aggregate counters together.

[Cloudflare D1 binding documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/) · [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

## Data and access

- Students receive public prompts and choices from the snapshot. Answer keys and feedback are released only as configured, through the attempt endpoints. The student URL contains the assignment ID alone. This is a formative activity. Students can share links and can repeat with a different browser profile.
- Anonymous, random browser nonces are scoped to one assignment and used to limit accidental retakes. There is no fingerprinting, student identity collection, or account lookup. Report access is scoped to the authenticated teacher who created the assignment.
- While immediate feedback is active, the server temporarily locks each answer in the in-progress receipt. Completion atomically adds only aggregate counters and clears those answers. A keyed digest supports idempotent retries. The teacher sees completed submissions, which may include retakes.
- Class breakdowns update only after each batch of five submissions. Individual score buckets and wrong-choice details below five are suppressed. The total completion count can update sooner. This limits single-submission comparisons between report refreshes. It does not provide differential privacy.
- Publication freezes the generator's validated question set, scoring and topic metadata as one immutable version. Republishing creates a new link. Quota filters select the original questions at generation time. The server validates the frozen format and independently grades submissions against its stored answer key.
- Each online question is worth one point. Ordering and document identification use the existing assessment adapter's single-choice representations. Interactive sequencing and document marking remain available in ordinary practice.
