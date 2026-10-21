/* Local-only session tracking. No names, no accounts, no network. Separate storage key per site. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./structure.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.Session = factory(root.RACECES.Structure); }
})(typeof self !== 'undefined' ? self : this, function (Structure) {
  'use strict';

  var KEY = 'raceces-writing-games:v1:session';
  var MAX_ATTEMPTS = 300;
  var MAX_RECENT = 60;
  var MAX_ACTIVE_MS_PER_CHALLENGE = 180000;

  function blank() {
    return {
      version: 1, started: 0, activeMs: 0, attempts: [], recent: [], seenModels: [],
      totals: { done: 0, correct: 0 },
      byMode: {}, byRole: {}, byLevel: {}, byErr: {}
    };
  }
  function bump(map, key, ok) {
    if (!map[key]) map[key] = { n: 0, ok: 0 };
    map[key].n++; if (ok) map[key].ok++;
  }

  function Session(storage, now) {
    this.storage = storage || null;
    this.now = now || function () { return Date.now(); };
    this.data = blank();
    this.load();
    if (!this.data.started) this.data.started = this.now();
  }

  Session.prototype.load = function () {
    if (!this.storage) return;
    try {
      var raw = this.storage.getItem(KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && d.version === 1 && d.totals) this.data = Object.assign(blank(), d);
    } catch (e) { this.data = blank(); }
  };
  Session.prototype.save = function () {
    if (!this.storage) return;
    try { this.storage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full or blocked: keep running in memory */ }
  };

  /* entry: { mode, level, role, correct, ms, category, modelId, family } */
  Session.prototype.record = function (entry) {
    var d = this.data;
    var ok = !!entry.correct;
    d.totals.done++; if (ok) d.totals.correct++;
    bump(d.byMode, entry.mode, ok);
    if (entry.role) bump(d.byRole, entry.role, ok);
    bump(d.byLevel, entry.level, ok);
    if (!ok && entry.category) d.byErr[entry.category] = (d.byErr[entry.category] || 0) + 1;
    var ms = Math.max(0, Math.min(MAX_ACTIVE_MS_PER_CHALLENGE, entry.ms || 0));
    d.activeMs += ms;
    d.attempts.push({ t: this.now(), mode: entry.mode, level: entry.level, role: entry.role || null, ok: ok ? 1 : 0, ms: ms, cat: ok ? null : (entry.category || null), model: entry.modelId || null });
    if (d.attempts.length > MAX_ATTEMPTS) d.attempts.splice(0, d.attempts.length - MAX_ATTEMPTS);
    this.save();
  };

  Session.prototype.setRecent = function (history, seenModels) {
    this.data.recent = (history || []).slice(-MAX_RECENT);
    this.data.seenModels = (seenModels || []).slice(-2000);
    this.save();
  };
  Session.prototype.getRecent = function () { return this.data.recent || []; };
  Session.prototype.getSeenModels = function () { return this.data.seenModels || []; };

  Session.prototype.reset = function () {
    this.data = blank();
    this.data.started = this.now();
    if (this.storage) { try { this.storage.removeItem(KEY); } catch (e) { /* ignore */ } }
  };

  function pct(o) { return o && o.n ? Math.round(100 * o.ok / o.n) : null; }

  Session.prototype.stats = function () {
    var d = this.data, t = d.totals;
    var modes = {}, roles = {}, levels = {};
    Structure.MODES.forEach(function (m) { modes[m] = { n: (d.byMode[m] || {}).n || 0, ok: (d.byMode[m] || {}).ok || 0, pct: pct(d.byMode[m]) }; });
    Structure.ROLES.forEach(function (r) { roles[r] = { n: (d.byRole[r] || {}).n || 0, ok: (d.byRole[r] || {}).ok || 0, pct: pct(d.byRole[r]) }; });
    Structure.LEVELS.forEach(function (l) { levels[l] = { n: (d.byLevel[l] || {}).n || 0, ok: (d.byLevel[l] || {}).ok || 0, pct: pct(d.byLevel[l]) }; });
    var errs = Object.keys(d.byErr).map(function (k) { return { key: k, label: Structure.CATEGORY_LABEL[k] || k, n: d.byErr[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
    var focus = [];
    Structure.ROLES.forEach(function (r) { var x = roles[r]; if (x.n >= 3 && x.pct < 70) focus.push({ type: 'role', key: r, label: Structure.LABEL[r], pct: x.pct, n: x.n }); });
    Structure.MODES.forEach(function (m) { var x = modes[m]; if (x.n >= 3 && x.pct < 70) focus.push({ type: 'mode', key: m, label: Structure.MODE_LABEL[m], pct: x.pct, n: x.n }); });
    errs.slice(0, 2).forEach(function (e) { if (e.n >= 2) focus.push({ type: 'error', key: e.key, label: e.label, n: e.n }); });
    return {
      done: t.done, correct: t.correct,
      // Each challenge allows one scored submission, so first-attempt correct equals correct.
      firstAttemptCorrect: t.correct,
      accuracy: t.done ? Math.round(100 * t.correct / t.done) : null,
      modes: modes, roles: roles, levels: levels, errors: errs, focus: focus,
      activeMs: d.activeMs
    };
  };

  /* Active-time tracker: counts time only while the page is visible and the student recently interacted. */
  function ActiveTimer(now, idleMs) {
    this.now = now || function () { return Date.now(); };
    this.idleMs = idleMs || 30000;
    this.visible = true;
    this.start();
  }
  ActiveTimer.prototype.start = function () { this.acc = 0; this.last = this.now(); this.lastTouch = this.last; };
  ActiveTimer.prototype._advance = function () {
    var t = this.now();
    if (this.visible) {
      var from = this.last, to = Math.min(t, this.lastTouch + this.idleMs);
      if (to > from) this.acc += to - from;
    }
    this.last = t;
  };
  ActiveTimer.prototype.touch = function () { this._advance(); this.lastTouch = this.now(); };
  ActiveTimer.prototype.setVisible = function (v) { this._advance(); this.visible = !!v; };
  ActiveTimer.prototype.elapsed = function () { this._advance(); return this.acc; };

  return { Session: Session, ActiveTimer: ActiveTimer, KEY: KEY, MAX_ATTEMPTS: MAX_ATTEMPTS };
});
