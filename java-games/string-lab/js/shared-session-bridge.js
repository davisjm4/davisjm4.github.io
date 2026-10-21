/* Map String Lab's versioned events into the established Java Games session tracker. */
(function (root) {
  'use strict';
  var queue = [], tracker = null, records = Object.create(null);

  function process(evt) {
    if (!tracker || !evt) return;
    var ch = evt.challenge || {}, topic = ch.mode || 'mixed';
    var mode = root.StringLab && root.StringLab.Generator && root.StringLab.Generator.MODES.find(function (m) { return m.id === topic; });
    var title = mode ? mode.label : (topic === 'mixed' ? 'Mixed Practice' : topic);
    if (evt.type === 'challenge_presented') {
      var id = tracker.begin('string-lab', 'String Lab', topic, title, topic, title);
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

  function summary(mode) {
    if (!tracker) return null;
    var game = tracker.snapshot().games['string-lab'];
    var metrics = mode && mode !== 'mixed' ? game && game.modes && game.modes[mode] : game;
    metrics = metrics || { attempted: 0, firstTry: 0, afterRetry: 0, revealed: 0, submissions: 0 };
    var accuracy = metrics.attempted ? Math.round(100 * metrics.firstTry / metrics.attempted) + '%' : '—';
    return 'First-try accuracy: ' + accuracy + ' (' + metrics.firstTry + '/' + metrics.attempted + ')' +
      (metrics.attempted ? '' : ' · No attempts yet') + ' · Solved after retry: ' + metrics.afterRetry +
      ' · Revealed: ' + metrics.revealed + ' · Submissions: ' + metrics.submissions;
  }
  function snapshot() {
    if (!tracker) return null;
    var data = tracker.snapshot();
    return { sessionDate: data.sessionDate, game: data.games['string-lab'] || null };
  }

  root.JavaGamesSessionBridge = { record: function (evt) {
    if (!tracker) queue.push(evt); else process(evt);
  }, summary: summary, snapshot: snapshot };

  import('../../session.js?v=per-mode-daily-v1').then(function (shared) {
    tracker = shared.sessionTracker();
    shared.addSessionNavigation('../');
    queue.splice(0).forEach(process);
    root.dispatchEvent(new CustomEvent('stringlab:session-ready'));
  }).catch(function (error) {
    if (root.console && root.console.warn) root.console.warn('Shared Java Games session tracking unavailable.', error);
  });
})(typeof window !== 'undefined' ? window : this);
