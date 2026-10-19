/* EXAMPLE host adapter for Java Games' Session Summary. Load BEFORE src/main.js (standalone) or pass as the
   `adapter` option to CBR.ui.mount() (embedded).

   The mode already keeps its own totals in localStorage and works without this file. The adapter only forwards
   what the mode measures to the host tracker. Edit forwardToHostTracker() once the existing tracker's API is known
   (it was not available when this package was built). */
(function () {
  'use strict';

  /* ---- EDIT THIS: map the Class Builder summary onto the Java Games tracker ----
     summary = {
       mode: 'class-builder-rearrange',
       attempted, firstAttemptCorrect, correctAfterRetries, revealed, skipped, checks, hints, activeSeconds,
       topics: { 'class-object-lab/class-builder-rearrange/<beginner|intermediate|advanced>': {attempted, firstAttemptCorrect, correctAfterRetries, revealed, skipped, checks} }
     }                                                                                                              */
  function forwardToHostTracker(summary) {
    // Example (replace with the real call): window.JavaGamesSession && window.JavaGamesSession.setModeSummary('class-object-lab', summary);
  }

  /* Optional per-challenge event: { mode, topic, difficulty, challengeId, outcome: 'first-attempt'|'after-retries'|'revealed'|'skipped', checks, hints } */
  function forwardResultToHostTracker(result) {
    // Example (replace): window.JavaGamesSession && window.JavaGamesSession.recordResult(result);
  }

  window.CBR_SESSION_ADAPTER = {
    onChange: function (summary) { forwardToHostTracker(summary); },
    onResult: function (result) { forwardResultToHostTracker(result); }
  };
})();
