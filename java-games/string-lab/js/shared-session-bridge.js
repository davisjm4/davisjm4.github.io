/* Map String Lab's versioned events into the established Java Games session tracker. */
(function (root) {
  'use strict';
  var queue = [], tracker = null, records = Object.create(null);

  function process(evt) {
    if (!tracker || !evt) return;
    var ch = evt.challenge || {}, topic = ch.topic || 'string-lab/multi-step-string-tracing';
    var title = ch.skill || 'Multi-Step String Tracing';
    if (evt.type === 'challenge_presented') {
      var id = tracker.begin('string-lab', 'String Lab', topic, title);
      records[evt.instance] = id;
      tracker.annotate(id, { difficulty: ch.difficulty, mode: ch.mode, reasoningFamily: ch.family, skill: title });
    } else if (evt.type === 'challenge_completed') {
      var completedId = records[evt.instance];
      if (!completedId) return;
      if (evt.outcome === 'revealed') tracker.reveal(completedId);
      else {
        tracker.submit(completedId, evt.outcome === 'correct');
        if (evt.outcome === 'incorrect') tracker.closeIncorrect(completedId);
      }
      tracker.annotate(completedId, {
        difficulty: ch.difficulty, mode: ch.mode, reasoningFamily: ch.family,
        skill: title, activeMs: Math.max(0, Math.round(evt.activeMs || 0)),
        outcome: evt.outcome, firstAttemptCorrect: !!evt.firstAttemptCorrect
      });
      delete records[evt.instance];
    } else if (evt.type === 'challenge_skipped') {
      var skippedId = records[evt.instance];
      if (skippedId) { tracker.skip(skippedId); delete records[evt.instance]; }
    }
  }

  root.JavaGamesSessionBridge = { record: function (evt) {
    if (!tracker) queue.push(evt); else process(evt);
  }};

  import('../session.js').then(function (shared) {
    tracker = shared.sessionTracker();
    shared.addSessionNavigation('../');
    queue.splice(0).forEach(process);
  }).catch(function (error) {
    if (root.console && root.console.warn) root.console.warn('Shared Java Games session tracking unavailable.', error);
  });
})(typeof window !== 'undefined' ? window : this);
