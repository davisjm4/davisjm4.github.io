// Shows one Teacher Tools view at a time (My Classes, Practice & Assessments, Learning Pathways).
// Views are plain sections in one page, addressed by URL hash, so every older link such as
// #wpr-online or #wpr-teacher-profiles still lands on the right section. All views are visible
// in the HTML, so if this script ever fails the page degrades to a long page, never a blank one.
(function () {
  var views = Array.prototype.slice.call(document.querySelectorAll('[data-view]'));
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-view-link]'));
  var NAMES = { classes: 'My Classes', practice: 'Practice & Assessments', pathways: 'Learning Pathways' };
  var aliases = { 'wpr-online': 'practice-online', 'wpr-teacher-profiles': 'classes', 'quiz-settings': 'practice-canvas' };

  function resolve(hash) {
    var id = decodeURIComponent((hash || '').replace(/^#/, ''));
    id = aliases[id] || id;
    if (views.some(function (v) { return v.dataset.view === id; })) return { view: id, target: null };
    var node = id && document.getElementById(id);
    var owner = node && node.closest('[data-view]');
    return owner ? { view: owner.dataset.view, target: id } : { view: 'classes', target: null };
  }
  function show(name) {
    views.forEach(function (v) { v.hidden = v.dataset.view !== name; });
    links.forEach(function (a) {
      if (a.dataset.viewLink === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = (NAMES[name] || 'Teacher Tools') + ' | Teacher Tools | CS Games';
  }
  function route(initial) {
    var r = resolve(location.hash);
    show(r.view);
    if (r.target) { var t = document.getElementById(r.target); if (t) t.scrollIntoView(); return; }
    if (initial) return;
    window.scrollTo(0, 0);
    var heading = document.querySelector('[data-view="' + r.view + '"] h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', function () { route(false); });
  route(true);
})();
