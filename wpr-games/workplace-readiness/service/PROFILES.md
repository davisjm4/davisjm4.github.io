# Teacher-managed student profiles

Profiles extend the Workplace Readiness reporting Worker and Teacher Tools. A profile identifies a student within one class using a random UUID. Progress can be linked to a student through the teacher's separate roster, so it must be handled as pseudonymous educational performance data.

## Classroom workflow

1. Sign in to **Online Workplace Readiness assignments** in Teacher Tools. Under **Student profile classes**, create a class using a class title such as Period 5.
2. Share the enrollment link privately with the class, or use **Issue student profile ID** to provide individual credentials. Students who use the link save the random profile ID and recovery credential before continuing. Keep the link within the class and rotate it if shared outside the class.
3. Download the roster CSV. It contains a `profile_id` and an empty `student_name` column. Complete the name column only in a school-controlled file. CS Games has no roster-upload route.
4. Select a class under **Student reporting** when publishing a Workplace Readiness assignment that should appear in individual profiles. The default **Anonymous assignment** keeps the existing anonymous reporting workflow, even if a student is signed in. An assigned class profile is required to start, answer, or submit a class-linked assignment.
5. Open a class and choose **View progress** for a profile ID. Download a single profile CSV or the class progress CSV. Keep any CSV with student progress private. The IDs remain stable through credential resets.

Students can restore a session on another device with both credentials. If a recovery credential is lost, the teacher resets access and shares the replacement privately. Reset and revocation invalidate all old sessions. **Sign out on this device** clears this browser's local profile cache and leaves guest practice separate. An online sign-out revokes the current server session. An offline sign-out clears the device and the server session still expires on schedule. The teacher can revoke it immediately once connected.

An already loaded Workplace Readiness practice page can continue if the connection drops. First attempts queue on the device and sync after reconnecting. Opening the site from a fresh offline tab, teacher actions, enrollment, recovery, and online assessments require a connection. Local practice completed as a guest stays in the guest record. The local daily session, notes, and readiness checkboxes stay on the device. Synced progress contains first attempts and class-linked assessment summaries. Students can open it from **Student profile** and export a CSV.

## Data and scoring

- Version 1 records pathway, activity, evidence type, attempted and correct counts, time, and catalog IDs. Practice uses a stable UUID per first attempt and accepts only the supported catalog and activity. The server deduplicates on the profile and event IDs. Other pathways can add validated adapters to this contract. Java, AP CSP and Robotics do not currently sync.
- Practice results are produced on the device and are useful for formative feedback. Class-linked diagnostic and assigned practice scores are verified against the frozen assignment on the server. Profile history stores score totals and skill, topic, and subtopic counts, without question text or selected choices. Recent history shows up to 120 completed assessment or assigned practice attempts per profile. Comparable change uses two attempts on the same assignment with at least three items each.
- Student and individual teacher exports include activity and dimension totals, assessment totals, and per-assessment dimension rows. Class CSV includes each profile's totals and recent assessment summary rows. CSV uses stable IDs, UTC completion times, and numeric accuracy from zero to one. Keep the school roster keyed by `profile_id`; the row order can change.
- Profile IDs are never used as credentials. Class invites, recovery credentials, and session tokens use 256 random bits and are hashed in storage. Invite secrets travel in the link fragment and the enrollment request body. Session tokens are bearer credentials kept in browser storage for persistent sign-in. Use HTTPS and review the shared Pages origin's scripts and security posture before enabling the feature. There is no fingerprinting, student email, name, school ID, or application IP logging. The existing teacher sign-in uses Google authentication and an explicit allowlist.
- The service validates the teacher's class ownership and derives student identity from the session on every private request. Authorization errors do not reveal other classes or profiles. Class invite, credential recovery and syncing have bounded requests and storage. Shared-device isolation relies on per-profile keys, local cache removal, and students signing out before handing off the browser.
- Sessions expire after 30 days. Classes expire 365 days after creation. Archiving immediately closes enrollment and ends student access. Archived records remain available to the teacher for up to 30 days or the original expiry, whichever is earlier. Explicit deletion removes the affected progress and sessions from the application database. Class deletion also removes class-linked assignments and receipts. Deleting one profile leaves any counts already included in released aggregate reports. Existing anonymous assignments keep their separate retention and suppression rules. Provider backups and offline client copies follow their own retention and must be covered by the school's review.

## Local verification

Run the [development service](README.md) with a disposable database. It automatically applies the additive migration and enables profiles on loopback. Use distinct browser contexts to simulate two devices.

From the repository root with Node.js 24:

```sh
node --test cs-games/teacher/wpr-online-tests.mjs cs-games/teacher/wpr-profile-tests.mjs
npm --prefix wpr-games/workplace-readiness install --no-package-lock
CHROME_BIN=/path/to/chromium node --test cs-games/teacher/wpr-online-browser-tests.mjs
```

The service checks cover class and teacher isolation, student authorization, class-linked and anonymous scoring, credential recovery, rate limiting, deletion, and duplicate sync. The browser suite exercises enrollment, touchscreen practice while offline, reconnect, a separate-context restore, guest data isolation, teacher reporting, a class-linked diagnostic, and accessibility checks on the student report. The local tests use the same Worker routes with SQLite and a development teacher verifier. They do not exercise production Google OAuth or hosted D1.

## Production deployment gate

Obtain school or district approval and a FERPA-aware data-handling review before using real student data. Review the authorization to use the service and hosting provider, permitted uses, access and revocation, data retention and backup deletion, school roster handling, and how the school will handle student and family access or deletion requests. The U.S. Department of Education provides [guidance for online educational services](https://studentprivacy.ed.gov/resources/protecting-student-privacy-while-using-online-educational-services-requirements-and-best).

1. Provision the school-authorized Worker, D1 and Google OAuth configuration in the [service setup](README.md). If this reporting service is already provisioned, reuse it.
2. Apply `profiles.sql` after `schema.sql` using `npx wrangler d1 execute devcat-wpr --remote --file=profiles.sql` from this directory. Use a staging database first. Set `PROFILE_SCHEMA_INSTALLED = "1"` so scheduled cleanup runs even if profile access is later disabled.
3. Use a stable, server-only `SUBMISSION_SECRET`. Rotating it affects in-flight assignment receipts and per-profile retake tracking for existing assignments. Keep Worker observability and request-body logging off and restrict access to provider logs and backups.
4. After approval, set Worker `ENABLE_STUDENT_PROFILES = "1"`. Configure the public API origin and OAuth client ID in [config.mjs](../online/config.mjs), then set `profilesOnProduction` to `true`. Verify both service and Pages gates in staging before release.
5. With synthetic profiles, verify hosted enrollment, OAuth allowlist, cross-device recovery, class isolation, revoked credentials, duplicate prevention, backup/retention settings, scheduled cleanup and the existing anonymous workflow. Delete the synthetic class before use.

The repository leaves both production gates disabled. It contains the local implementation and deployment steps.
