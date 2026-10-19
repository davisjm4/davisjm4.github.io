/* Workplace Readiness Games - session tracker.
 * Pure logic (no DOM): records one scored attempt per challenge, aggregates accuracy by
 * skill / category / mode / difficulty, finds areas needing practice, and measures ACTIVE
 * practice time. Time only accrues while the student has interacted recently: any gap
 * longer than the idle limit is excluded, so leaving the tab open does not inflate it. */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.session = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var IDLE_LIMIT_MS = 45000;      // no interaction for this long => the clock pauses
  var MAX_TICK_MS = 5000;         // a single tick can never add more than this (sleep/background guard)
  var WEAK_ACCURACY = 0.7;
  var WEAK_MIN_ATTEMPTS = 2;

  function emptyStats() {
    return { completed: 0, correct: 0, incorrect: 0, firstAttemptCorrect: 0,
             bySkill: {}, byCategory: {}, byMode: {}, byDifficulty: {}, recent: [] };
  }
  function bump(map, key, correct) {
    var e = map[key] || (map[key] = { n: 0, c: 0 });
    e.n++; if (correct) e.c++;
  }

  function create(initial, clock) {
    var now = clock || function () { return Date.now(); };
    var data = initial || { version: 1, seed: null, index: 0, filters: {}, stats: emptyStats(), activeMs: 0, startedAt: now(), updatedAt: now() };
    if (!data.stats) data.stats = emptyStats();
    var lastActivity = now(), lastTick = now();

    var api = {
      data: data,

      /* Call on any pointer/keyboard interaction. */
      touch: function () { lastActivity = now(); },

      /* Call about once a second while the page is visible. Adds time only if recently active. */
      tick: function (visible) {
        var t = now(), dt = t - lastTick; lastTick = t;
        if (visible === false) return 0;
        if (dt <= 0) return 0;
        if (t - lastActivity > IDLE_LIMIT_MS) return 0;
        var add = Math.min(dt, MAX_TICK_MS);
        data.activeMs += add;
        return add;
      },

      /* meta: { skill, category, mode, difficulty }; correct: boolean (first and only attempt) */
      record: function (meta, correct) {
        var s = data.stats;
        s.completed++;
        if (correct) { s.correct++; s.firstAttemptCorrect++; } else { s.incorrect++; }
        bump(s.bySkill, meta.skill, correct);
        bump(s.byCategory, meta.category, correct);
        bump(s.byMode, meta.mode, correct);
        bump(s.byDifficulty, meta.difficulty, correct);
        s.recent.push(correct ? 1 : 0);
        if (s.recent.length > 12) s.recent.shift();
        data.updatedAt = now();
        api.touch();
      },

      accuracy: function () { return data.stats.completed ? data.stats.correct / data.stats.completed : null; },

      /* Skills that need practice: enough attempts and below the accuracy threshold, weakest first. */
      weakSkills: function () {
        var out = [];
        Object.keys(data.stats.bySkill).forEach(function (id) {
          var e = data.stats.bySkill[id];
          if (e.n >= WEAK_MIN_ATTEMPTS && e.c / e.n < WEAK_ACCURACY) out.push({ skill: id, n: e.n, c: e.c, accuracy: e.c / e.n });
        });
        out.sort(function (a, b) { return a.accuracy - b.accuracy || b.n - a.n; });
        return out;
      },

      reset: function (seed) {
        data.seed = seed || null; data.index = 0; data.stats = emptyStats(); data.activeMs = 0;
        data.startedAt = now(); data.updatedAt = now(); lastActivity = now(); lastTick = now();
      },

      formatTime: function () { return formatDuration(data.activeMs); }
    };
    return api;
  }

  function formatDuration(ms) {
    var total = Math.round(ms / 1000), m = Math.floor(total / 60), s = total % 60;
    if (m >= 60) { var h = Math.floor(m / 60); return h + ' h ' + (m % 60) + ' min'; }
    if (m === 0) return s + ' sec';
    return m + ' min ' + (s < 10 ? '0' : '') + s + ' sec';
  }

  return { create: create, emptyStats: emptyStats, formatDuration: formatDuration,
           IDLE_LIMIT_MS: IDLE_LIMIT_MS, WEAK_ACCURACY: WEAK_ACCURACY, WEAK_MIN_ATTEMPTS: WEAK_MIN_ATTEMPTS };
}));
