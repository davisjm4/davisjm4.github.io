/* String Lab — session adapter.
 *
 * String Lab does NOT invent a site-wide tracker. This module records what happens during practice and
 * publishes a small, documented event stream that the existing Java Games Session Summary can consume
 * (see SESSION_INTEGRATION.md). Publication channels, all optional and independent:
 *   1. session.on(fn)                      in-page listeners
 *   2. window 'stringlab:event' CustomEvent (event is in e.detail)
 *   3. window.JavaGamesSessionBridge.record(event)   if the host page defines it
 *   4. window.parent.postMessage(...)       only when opted in with config.postMessage = true
 *
 * One completed challenge == exactly one 'challenge_completed' event, no matter how many times the student
 * clicks. Skill categories are the bounded list in SKILLS; generated words never become topics.
 */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});

  var SCHEMA = 'java-games.string-lab.v1';
  var GAME_ID = 'string-lab';

  function emptyBucket() { return { completed: 0, attempted: 0, firstAttemptCorrect: 0, incorrect: 0, revealed: 0, afterRetry: 0, submissions: 0 }; }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function create(config) {
    config = config || {};
    var now = config.now || function () { return Date.now(); };
    var idleCapMs = config.idleCapMs || 45000;
    var version = (SL.Generator && SL.Generator.VERSION) || '1.0.0';
    var skills = (SL.Generator && SL.Generator.SKILLS) || [];
    var listeners = config.onEvent ? [config.onEvent] : [];
    var seq = 0;
    var sessionId = config.sessionId || ('sl-' + now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36));
    var startedAt = now(), sessionDate = dayKey(startedAt);

    var state = { activeMs: 0, skipped: 0, byDifficulty: {}, byMode: {}, bySkill: {}, byFamily: {}, total: emptyBucket() };
    skills.forEach(function (s) { state.bySkill[s] = emptyBucket(); });
    var current = null; // the challenge instance currently on screen
    var instanceCounter = 0;
    var lastBeat = now(), lastActivity = now(), visible = true;

    function bucket(map, key) { return map[key] || (map[key] = emptyBucket()); }

    function emit(evt) {
      evt.schema = SCHEMA; evt.game = GAME_ID; evt.gameVersion = version; evt.sessionId = sessionId;
      evt.seq = ++seq; evt.timestamp = new Date(now()).toISOString();
      listeners.slice().forEach(function (fn) { try { fn(evt); } catch (e) { /* listener errors never break practice */ } });
      try {
        if (typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') root.dispatchEvent(new root.CustomEvent('stringlab:event', { detail: evt }));
      } catch (e) { /* ignore */ }
      try {
        if (root.JavaGamesSessionBridge && typeof root.JavaGamesSessionBridge.record === 'function') root.JavaGamesSessionBridge.record(evt);
      } catch (e) { /* ignore */ }
      try {
        if (config.postMessage && root.parent && root.parent !== root) root.parent.postMessage({ source: GAME_ID, event: evt }, '*');
      } catch (e) { /* ignore */ }
      return evt;
    }

    function slug(skill) { return skill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
    function describe(ch) {
      return { id: ch.id, seed: ch.seed, mode: ch.mode, difficulty: ch.difficulty, family: ch.family, skill: ch.skill,
        topic: GAME_ID + '/' + slug(ch.skill), concepts: ch.metrics ? ch.metrics.concepts : [] };
    }

    /** Called about once a second by the UI. Counts only visible time with recent interaction. */
    function heartbeat() {
      ensureDay();
      var t = now(), dt = Math.min(Math.max(t - lastBeat, 0), 2500);
      lastBeat = t;
      if (visible && current && !current.done && t - lastActivity < idleCapMs) { current.activeMs += dt; state.activeMs += dt; }
      return state.activeMs;
    }
    function activity() { lastActivity = now(); }
    function setVisible(v) { heartbeat(); visible = !!v; lastBeat = now(); }

    function present(ch) {
      ensureDay();
      if (current && !current.done) skip(); // replaced before being answered
      activity(); lastBeat = now();
      current = { instance: ++instanceCounter, ch: ch, done: false, activeMs: 0, presentedAt: now() };
      return emit({ type: 'challenge_presented', instance: current.instance, challenge: describe(ch) });
    }

    function ensureDay() {
      var today = dayKey(now());
      if (today === sessionDate) return false;
      if (current) current.done = true;
      state = { activeMs: 0, skipped: 0, byDifficulty: {}, byMode: {}, bySkill: {}, byFamily: {}, total: emptyBucket() };
      skills.forEach(function (s) { state.bySkill[s] = emptyBucket(); });
      startedAt = now(); sessionDate = today; seq = 0;
      sessionId = 'sl-' + startedAt.toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
      return true;
    }
    function record(outcome, selectedId) {
      if (ensureDay() || !current || current.done) return null;
      heartbeat();
      current.done = true;
      var ch = current.ch, correct = outcome === 'correct';
      [state.total, bucket(state.byDifficulty, ch.difficulty), bucket(state.byMode, ch.mode), bucket(state.bySkill, ch.skill), bucket(state.byFamily, ch.family)].forEach(function (b) {
        b.completed++;
        if (correct || outcome === 'incorrect') { b.attempted++; b.submissions++; }
        if (correct) b.firstAttemptCorrect++; else if (outcome === 'incorrect') b.incorrect++; else b.revealed++;
      });
      return emit({
        type: 'challenge_completed', instance: current.instance, challenge: describe(ch),
        outcome: outcome, firstAttemptCorrect: correct, attempts: outcome === 'revealed' ? 0 : 1,
        selectedChoiceId: selectedId || null, activeMs: Math.round(current.activeMs), totals: totals()
      });
    }

    function answer(selectedIndex) {
      if (!current || current.done) return null; // repeated clicks never double count
      var ch = current.ch;
      return record(selectedIndex === ch.correctIndex ? 'correct' : 'incorrect', ch.choices[selectedIndex].id);
    }
    function reveal() {
      if (!current || current.done) return null;
      return record('revealed', null);
    }
    function skip() {
      if (ensureDay()) return null;
      if (!current || current.done) return null;
      current.done = true; state.skipped++;
      return emit({ type: 'challenge_skipped', instance: current.instance, challenge: describe(current.ch), activeMs: Math.round(current.activeMs) });
    }

    function totals() {
      var t = state.total;
      return { completed: t.completed, firstAttemptCorrect: t.firstAttemptCorrect, incorrect: t.incorrect, revealed: t.revealed, skipped: state.skipped, activeMs: Math.round(state.activeMs) };
    }
    function summary() {
      var t = state.total;
      return {
        schema: SCHEMA, sessionId: sessionId, startedAt: new Date(startedAt).toISOString(), sessionDate: sessionDate,
        completed: t.completed, firstAttemptCorrect: t.firstAttemptCorrect, incorrect: t.incorrect, revealed: t.revealed,
        attempted: t.attempted, submissions: t.submissions, afterRetry: t.afterRetry,
        skipped: state.skipped, activeMs: Math.round(state.activeMs),
        accuracy: t.attempted ? t.firstAttemptCorrect / t.attempted : null,
        byDifficulty: JSON.parse(JSON.stringify(state.byDifficulty)), byMode: JSON.parse(JSON.stringify(state.byMode)),
        bySkill: JSON.parse(JSON.stringify(state.bySkill)), byFamily: JSON.parse(JSON.stringify(state.byFamily))
      };
    }
    function end() { heartbeat(); return emit({ type: 'session_end', summary: summary() }); }

    emit({ type: 'session_start', settings: config.settings || null });

    return {
      on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
      present: present, answer: answer, reveal: reveal, skip: skip, activity: activity, heartbeat: heartbeat, setVisible: setVisible, ensureDay: ensureDay,
      summary: summary, end: end, id: sessionId, current: function () { return current; }
    };
  }

  SL.Session = { create: create, SCHEMA: SCHEMA, GAME_ID: GAME_ID };
})(typeof globalThis !== 'undefined' ? globalThis : this);
