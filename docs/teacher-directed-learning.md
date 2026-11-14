# Teacher-directed learning

**Approved classroom policy · CSG-DEC-15.** Assignments direct learning and remain advisory. Students can follow current classroom instructions, open any ordinary lab, change modes, and return to unfinished work. The diagnostic and assessment workflows retain their separate security and scoring rules.

## CSG-TDL-01 — Author and deliver a learning focus

**Roles:** owning teacher and enrolled students. Teachers can assign a published activity, focused practice mode (through its mapped skill), learning area or group of skills. They can direct a whole class, selected students or an individual, publish now or schedule a start, and add a short optional classroom instruction. Preview shows the target and affected scope. Whole-class work follows active class membership. Selected recipients are saved with the version. Edit publishes a new revision and preserves earlier history. Teachers can end work, cancel scheduled work or excuse one student without changing anyone else’s assignment.

**States/data:** scheduled, active, ended, canceled, excused. Keep revision, recipient scope, timing, actor and class references. Validate owner, target, active membership and stale revisions server-side. Preview, publish and edit are keyboard accessible. **Dependencies:** CSG-CUR-01/02 and CSG-SEC-01/03. **Acceptance:** CSG-AT-TDL-05, 08, 09 and 12.

## CSG-TDL-02 — Classwork priority, switching and resume

**Roles:** enrolled students. Show **Today's Classwork** before **Your Catch-Up Work**, regardless of which was created first. Within classwork, show the newest active lesson first. Label class-wide, group and individual work and show independent status for each. Show a shared target once with the related assignments available by origin and status.

Use **Start Assignment** and **Resume Assignment** links. A new assignment preserves the question, input and focus already on screen. A friendly reminder offers **Continue Here** and **View Assigned Work**. Dismissing it leaves the activity usable and quiet until the student chooses another assignment. Preserve submitted progress for all supported activities. Restore the unfinished question and selection in the same tab for checkpoint-enabled activities. Keep the independent pathway position separate and offer **Resume Previous Path** and **Continue From Here** when useful. Publish new work without taking over the current activity.

**States/data:** available, started and complete, with the active position and any supported unfinished input stored on the device. **Dependencies:** CSG-STU-03/04 and CSG-UX-03. **Acceptance:** CSG-AT-TDL-01–04 and 10.

## CSG-TDL-03 — Assignment progress and teacher review

**Roles:** owning teacher and enrolled students. Show completion and excused counts with the relevant assignment. Retain activity practice evidence through the normal first-attempt evaluator. An eligible attempt can complete the assignment it was started for when it matches the assignment's published target and profile. The disclosed default is one independently answered, mapped practice question. The same event remains one evidence record. Unrelated activity, a different mode, assisted attempts and legacy work with no assignment context are ordinary practice subject to existing evidence rules. Teachers can confirm completion when they can verify work independently, including a supported offline response with no original assignment context. Completion and excusal affect the assignment only. Official mastery remains in the existing teacher assessment workflow.

**States/data:** available, started, complete, excused, ended. Record completion source and actor separately from proficiency evidence. Historical practice and official scores retain their original meaning. **Dependencies:** CSG-MAS-04 and CSG-SEC-03. **Acceptance:** CSG-AT-TDL-05–08, 11 and 12.

## CSG-TDL-04 — Open practice and offline continuity

**Roles:** all learners. Normal Map, List, search, direct URLs, return links and in-game mode controls remain usable regardless of assignments. Ordinary question generation requires no online authorization. When content and assets are locally available, students may generate new questions, change modes and queue work while offline. Reconnection retries ordinary profile sync idempotently. Scope and evidence validation still apply to private writes.

Use an authenticated assignment-start receipt when available to associate subsequent qualifying practice with an assignment. A missing, stale or unrelated receipt leaves ordinary practice eligible for normal evidence processing. A client timestamp or assignment URL alone cannot establish assignment participation. Keep unsynced or rejected evidence available for recovery, and use teacher completion review when original context cannot be verified. Keep public guest practice separate from class evidence and assignments.

**Dependencies:** CSG-NAV-02/03 and CSG-SEC-01–03. **Acceptance:** CSG-AT-TDL-04, 06 and 10 and CSG-AT-09. Normal practice continues when the assignment service or network is unavailable, within locally available asset limits.
