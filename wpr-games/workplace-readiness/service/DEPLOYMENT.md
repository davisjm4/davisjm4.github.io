# CS Games backend deployment

## Build 5 handoff

The existing Workplace Readiness reporting service now handles CS Games teacher classes, pseudonymous student sessions, private progress, and Build 4 pathway publications. The student site and Teacher Tools are served by GitHub Pages. Build 5 needs no custom domain, Google Drive scope, or school-managed Google Workspace.

| Component | Verified status |
| --- | --- |
| Repository baseline | Build 4 pathway editor from PR #16, with the profile/recovery work from PR #15 integrated into the same service |
| Worker and D1 | Cloudflare deployed `cs-games-api` at `https://cs-games-api.cs-games-davisjm4.workers.dev/api/wpr`. It binds `DB` to `cs-games-data` in ENAM. All four migrations applied remotely and the migration ledger is current. Worker version `9f2aefc2-f348-4484-bffb-506aa5dc3d70` has `SUBMISSION_SECRET` and `TEACHER_EMAILS`. |
| Teacher authentication | The production OAuth client ID and one approved teacher account are configured. Local tests exercise Google ID token signature, audience, issuer, expiry, verified email, and the allowlist with synthetic signed tokens. The first hosted teacher sign-in requires the approved account holder. |
| GitHub Pages configuration | The public integration uses the deployed Worker and Google web client in `online/config.mjs`. Student profiles are enabled. |
| Progress and pathways | The local HTTP suite exercises distinct student sessions, class isolation, replay, provisional versus verified evidence, revision publication, and rollback with retained evidence. |
| Hosted verification | Health returned HTTP 200 with schema 4, a ready database and diagnostic secret, and teacher/profile access configured. The Pages origin and authorization preflight passed. An unapproved origin returned 403 and an unauthenticated teacher request returned 401. |
| Hosted student smoke test | An isolated synthetic class in D1 exercised enrollment, recovery into a second session, cross-class denial, idempotent Loop Lab practice upload, synced history, and session revocation. The synthetic class was deleted after testing. Teacher sign-in, publication through Teacher Tools, and student receipt of a hosted published revision still require the approved teacher session. |
| Recovery rehearsal | A local D1 SQL export restored into a fresh database with all four migration entries and the synthetic assessment score and evidence counters intact. |
| Initial D1 usage | The post-deployment `wrangler d1 info cs-games-data --json` snapshot reported 188,416 bytes, 287 rows read and 79 written in the preceding 24 hours. This snapshot includes setup and health checks. Classroom usage and Worker CPU under load await activation. |
| Activity coverage | Existing Java and AP CSP session hooks, Workplace Readiness practice and diagnostics, and the scored Robotics Parts Sprint and Component Challenge use the shared profile service. Activities with incomplete metadata can record attempts without a skill or mastery estimate. Unscored activities do not produce scored evidence. |

Use fictional profiles and class titles for setup and verification. The app stores a generated profile ID and hashed recovery/session credentials. Teachers maintain any name-to-ID mapping outside CS Games. Guest practice and anonymous WPR reporting remain available.

## Provider setup

1. Sign into the existing Cloudflare account and confirm the account selection with `wrangler whoami`. Use the Workers and D1 free plans. Reuse the CS Games Worker, database, and `cs-games-davisjm4.workers.dev` subdomain provisioned for this build. Leave existing zones, custom domains, routes and deployments outside this project alone.
2. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), select or create a CS Games project. Configure Branding for CS Games and choose an **External** audience. In testing, add only the designated teacher test accounts. Create a **Web application** OAuth client. Under **Authorized JavaScript origins**, add `https://davisjm4.github.io` without a path. The app uses the Google Identity Services credential callback and needs no redirect URI for this flow. The OAuth client ID is public. This integration needs no OAuth client secret or Drive scopes. Set the intended audience and publish the consent configuration when teacher access expands beyond the test users.
3. In this directory, run these commands. The examples use Wrangler 4.160.0. Fill in the D1 database UUID and the public OAuth web client ID in the ignored `wrangler.toml`. If a CS Games database already exists, verify its account, schema and migration ledger before reusing it. The first migration creates the reporting tables idempotently for a database bootstrapped using the old `schema.sql`. A database that has already applied the additive profile column migration manually needs its ledger reconciled before running migrations.

   ```sh
   npm exec --yes --package=wrangler@4.160.0 -- wrangler login --device --scopes account:read user:read workers_scripts:write d1:write
   npm exec --yes --package=wrangler@4.160.0 -- wrangler whoami
   cp wrangler.example.toml wrangler.toml
   ```

4. Apply any pending migrations, set the teacher allowlist, and deploy with the approved Google client ID and `ENABLE_STUDENT_PROFILES=1`. Enter the comma-separated authorized teacher emails directly at the secret prompt. The deployed Worker already has a stable random `SUBMISSION_SECRET`. The secret also protects in-progress assignment receipts, so coordinate any rotation around active assessments. Production disables Worker observability and preview URLs. The CORS allowlist is the exact GitHub Pages origin. Bearer credentials and ownership checks protect data independently of CORS.

   ```sh
   npm exec --yes --package=wrangler@4.160.0 -- wrangler d1 migrations apply cs-games-data --remote
   npm exec --yes --package=wrangler@4.160.0 -- wrangler secret put TEACHER_EMAILS
   npm exec --yes --package=wrangler@4.160.0 -- wrangler deploy
   ```

5. Request `https://cs-games-api.cs-games-davisjm4.workers.dev/api/wpr/health` with `Origin: https://davisjm4.github.io`. Check the D1 schema, CORS response and configuration flags. Repeat with a different origin and check rejection. Set `productionApi` in [online/config.mjs](../online/config.mjs) to that Worker origin plus `/api/wpr`. Set `googleClientId` to the public OAuth web client ID and `profilesOnProduction` to true. Release through the existing GitHub Pages workflow.

[Google Identity Services web client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) · [Google server-side ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) · [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)

## Hosted smoke test

Record the actual endpoint, deployment version, migration versions, Pages commit, time, and outcomes. Keep credentials and student identifiers out of the verification notes.

1. Sign in from Teacher Tools using an allowlisted test account. Check that a signed-in Google test user outside the Worker allowlist is denied. With two allowlisted teachers, check that each can access only their own classes and profiles.
2. Create two synthetic classes, issue a profile and test class-link enrollment. Inspect the roster export for generated IDs and a blank name column. Restore a session from a separate browser or device using both credentials.
3. Complete a supported game question and check the attempt in the teacher report. Repeat while offline from an already loaded practice page, then reconnect and refresh on the other device. Retry a saved submission and confirm it is counted once. Check that an incorrect first attempt followed by a correct retry does not change first-try accuracy.
4. Link the pathway editor to the synthetic class and publish. Record teacher-verified checkpoint evidence. Move a target date and publish again. Confirm the second device receives the new revision with the prior assessment and award intact. Check an open assessment can finish during publication. Roll back by publishing the earlier configuration and confirm the evidence remains.
5. Verify class-linked and anonymous WPR diagnostics separately, including anonymous report suppression under five submissions. Verify guest mode in Java, AP CSP and Robotics. Remove synthetic records after verification.
6. Check Workers **Metrics** for request count, errors and CPU, and D1 **Metrics** for rows read/written and storage. Confirm free-plan headroom with the actual traffic. Log the measurements alongside the deployment verification. Classroom usage has yet to be measured.

Published pathways are read when students visit the student hub, reconnect, return focus or reach its visible-page refresh interval. An active game or diagnostic page stays in place. Cached plans are available to the previously loaded hub, and queued practice sync resumes after connectivity returns. The first visit, recovery and online diagnostics require a connection.

## Backup and recovery

From this directory, export before migration or maintenance. Store the export in restricted, encrypted storage with a retention schedule. A backup contains pseudonymous performance data and credential hashes. Do not commit it or use it as a classroom roster.

```sh
npm exec --yes --package=wrangler@4.160.0 -- wrangler d1 export cs-games-data --remote --output=/secure/location/cs-games-data.sql
npm exec --yes --package=wrangler@4.160.0 -- wrangler d1 migrations list cs-games-data --remote
npm exec --yes --package=wrangler@4.160.0 -- wrangler d1 migrations apply cs-games-data --remote
```

For a code incident, use the Worker deployment history to roll back to a schema-compatible Worker version. Additive migrations should remain in place. For data recovery, prefer a forward correction. Rehearse snapshot restoration into an empty, isolated database using `wrangler d1 execute <recovery-database> --remote --file=<backup>`, verify contents and migration ledger, then switch the CS Games D1 binding only if a restore is required. A database restore rewinds records after the recovery point, so it is distinct from teacher pathway rollback. Teacher rollback publishes a new revision and does not rewrite progress.

Monitor the current free limits before rollout. Cloudflare documents 100,000 Worker requests/day and 10 ms CPU per invocation on Workers Free. D1 Free documents 5 million row reads/day, 100,000 row writes/day, 500 MB per database and 5 GB across the account. The existing Cloudflare account may have other usage against account-level limits.

[Workers limits](https://developers.cloudflare.com/workers/platform/limits/) · [D1 pricing and quotas](https://developers.cloudflare.com/d1/platform/pricing/) · [D1 technical limits](https://developers.cloudflare.com/d1/platform/limits/) · [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
