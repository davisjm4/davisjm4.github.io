/* Session tracker for Class Builder: Rearrange.
   Counts: challenges attempted, first-attempt correct, correct after retries, revealed, skipped,
   checks, hints and active practice time. Stored locally (localStorage) and mirrored to an optional
   host adapter so Java Games' existing Session Summary can display it. No accounts, no network. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CBR = root.CBR || {}; root.CBR.session = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODE_ID = 'class-builder-rearrange';
  var TOPIC_PREFIX = 'class-object-lab/class-builder-rearrange/';   // + difficulty (bounded: 3 topics)
  var STORAGE_KEY = 'javaGames.classObjectLab.classBuilderRearrange.session.v1';

  function localDate(ms) { var d = new Date(ms); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function blank(date) {
    return { sessionDate: date || localDate(Date.now()), attempted: 0, firstAttemptCorrect: 0, correctAfterRetries: 0, revealed: 0, skipped: 0, checks: 0, hints: 0, activeMs: 0, topics: {} };
  }
  function topicBlank() { return { attempted: 0, firstAttemptCorrect: 0, correctAfterRetries: 0, revealed: 0, skipped: 0, checks: 0 }; }

  /**
   * options: { storage?: Storage-like, adapter?: {onChange(summary), onResult(result)}, now?: ()=>ms, idleMs?: number, storageKey?: string }
   */
  function Tracker(options) {
    options = options || {};
    this.storage = options.storage !== undefined ? options.storage : safeStorage();
    this.key = options.storageKey || STORAGE_KEY;
    this.adapter = options.adapter || null;
    this.now = options.now || function () { return Date.now(); };
    this.idleMs = options.idleMs || 30000;
    this.totals = this._load();
    this.cur = null;
    this.lastActive = 0;
    this.lastTick = null;
  }

  function safeStorage() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }

  Tracker.prototype._load = function () {
    var today = localDate(this.now());
    try {
      if (this.storage) {
        var raw = this.storage.getItem(this.key);
        if (raw) { var o = JSON.parse(raw); if (o.sessionDate && o.sessionDate !== today) return blank(today); var b = blank(today); for (var k in b) if (k in o && k !== 'sessionDate') b[k] = o[k]; return b; }
      }
    } catch (e) { /* ignore corrupt storage */ }
    return blank(today);
  };
  Tracker.prototype._save = function () {
    try { if (this.storage) this.storage.setItem(this.key, JSON.stringify(this.totals)); } catch (e) { /* quota/private mode */ }
    if (this.adapter && this.adapter.onChange) { try { this.adapter.onChange(this.summary()); } catch (e) { /* host errors must not break play */ } }
  };
  Tracker.prototype._topic = function () {
    var t = TOPIC_PREFIX + this.cur.difficulty;
    return this.totals.topics[t] || (this.totals.topics[t] = topicBlank());
  };
  Tracker.prototype._ensureDay = function () {
    var today = localDate(this.now());
    if (this.totals.sessionDate === today) return false;
    this.totals = blank(today);
    if (this.cur) this.cur.outcome = 'expired';
    this._save();
    return true;
  };
  Tracker.prototype._engage = function () {
    if (!this.cur.engaged) { this.cur.engaged = true; this.totals.attempted++; this._topic().attempted++; }
  };
  Tracker.prototype._finishOutcome = function (outcome) {
    this.cur.outcome = outcome;
    if (this.adapter && this.adapter.onResult) {
      try { this.adapter.onResult({ mode: MODE_ID, topic: TOPIC_PREFIX + this.cur.difficulty, difficulty: this.cur.difficulty, challengeId: this.cur.id, outcome: outcome, checks: this.cur.checks, hints: this.cur.hints }); } catch (e) { /* ignore */ }
    }
  };

  Tracker.prototype.beginChallenge = function (challenge) {
    this._ensureDay();
    this.cur = { id: challenge.id, difficulty: challenge.difficulty, engaged: false, outcome: null, checks: 0, hints: 0 };
    if (this.adapter && this.adapter.onChallengeBegin) { try { this.adapter.onChallengeBegin({ id: challenge.id, difficulty: challenge.difficulty }); } catch (e) {} }
    this.touch();
  };
  Tracker.prototype.touch = function () { this.lastActive = this.now(); };

  /** Called once a second (or on interaction): adds time only while the student is active. */
  Tracker.prototype.tick = function (visible) {
    this._ensureDay();
    var t = this.now();
    if (this.lastTick !== null && visible !== false) {
      var dt = t - this.lastTick;
      if (dt > 0 && t - this.lastActive <= this.idleMs && dt < 5000) this.totals.activeMs += dt;
    }
    this.lastTick = t;
  };

  Tracker.prototype.recordHint = function () {
    this._ensureDay();
    if (!this.cur || this.cur.outcome) return; this.cur.hints++; this.totals.hints++; if (this.adapter && this.adapter.onHint) { try { this.adapter.onHint({ id: this.cur.id, difficulty: this.cur.difficulty, hints: this.cur.hints }); } catch (e) {} } this.touch(); this._save();
  };

  /** returns 'first' | 'retry' | 'incorrect' */
  Tracker.prototype.recordCheck = function (correct) {
    this._ensureDay();
    if (!this.cur || this.cur.outcome) return null;
    this._engage();
    this.cur.checks++; this.totals.checks++; this._topic().checks++;
    if (this.adapter && this.adapter.onCheck) { try { this.adapter.onCheck({ id: this.cur.id, difficulty: this.cur.difficulty, correct: !!correct, checks: this.cur.checks }); } catch (e) {} }
    this.touch();
    var res = 'incorrect';
    if (correct) {
      if (this.cur.checks === 1) { this.totals.firstAttemptCorrect++; this._topic().firstAttemptCorrect++; res = 'first'; }
      else { this.totals.correctAfterRetries++; this._topic().correctAfterRetries++; res = 'retry'; }
      this._finishOutcome(res === 'first' ? 'first-attempt' : 'after-retries');
    }
    this._save();
    return res;
  };
  Tracker.prototype.recordReveal = function () {
    this._ensureDay();
    if (!this.cur || this.cur.outcome) return;
    this._engage(); this.totals.revealed++; this._topic().revealed++;
    if (this.adapter && this.adapter.onReveal) { try { this.adapter.onReveal({ id: this.cur.id, difficulty: this.cur.difficulty }); } catch (e) {} } this._finishOutcome('revealed'); this.touch(); this._save();
  };
  /** Next Challenge pressed before solving/revealing */
  Tracker.prototype.recordSkip = function () {
    this._ensureDay();
    if (!this.cur || this.cur.outcome) return;
    this._engage(); this.totals.skipped++; this._topic().skipped++;
    if (this.adapter && this.adapter.onSkip) { try { this.adapter.onSkip({ id: this.cur.id, difficulty: this.cur.difficulty }); } catch (e) {} } this._finishOutcome('skipped'); this.touch(); this._save();
  };
  Tracker.prototype.save = function () { this._save(); };

  Tracker.prototype.summary = function () {
    this._ensureDay();
    var t = this.totals, topics = {};
    for (var k in t.topics) topics[k] = Object.assign({}, t.topics[k]);
    return {
      mode: MODE_ID, sessionDate: t.sessionDate, attempted: t.attempted, firstAttemptCorrect: t.firstAttemptCorrect, correctAfterRetries: t.correctAfterRetries,
      revealed: t.revealed, skipped: t.skipped, checks: t.checks, hints: t.hints,
      activeSeconds: Math.round(t.activeMs / 1000), topics: topics
    };
  };
  Tracker.prototype.reset = function () { this.totals = blank(localDate(this.now())); this._save(); };

  return { Tracker: Tracker, MODE_ID: MODE_ID, TOPIC_PREFIX: TOPIC_PREFIX, STORAGE_KEY: STORAGE_KEY };
});
