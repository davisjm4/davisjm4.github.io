import { activeProfile } from '../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';
import { classProfileActive } from './guest/class-state.mjs';
import { el } from './map/ui/dom.mjs';

const nav = document.querySelector('[data-student-navigation]');
if (nav) {
  const page = nav.dataset.studentNavigation;
  const independent = page === 'courses' || new URLSearchParams(location.search).get('learner') === 'guest';
  let hasClass = Boolean(activeProfile);
  try { hasClass ||= classProfileActive(localStorage); } catch { /* The class page handles unavailable storage. */ }
  const links = [
    ['Courses', '/cs-games/student/guest/?choose=1', page === 'courses'],
    ['My Session', '/cs-games/student/session/' + (independent ? '?learner=guest' : ''), page === 'session'],
    [hasClass ? 'My Class' : 'Join a Class', '/cs-games/student/', page === 'class'],
    ...(page === 'class' ? [['Student profile', '#student-profile', false]] : []),
    ['Teacher Tools', '/cs-games/teacher/', false],
  ];
  const menu = el('details', { class: 'student-nav-menu' },
    el('summary', { text: 'Menu' }),
    el('div', { class: 'student-nav-links' }, links.map(([text, href, current]) =>
      el('a', { text, href, 'aria-current': current ? 'page' : undefined }))));
  const narrow = matchMedia('(max-width: 560px)');
  function sizeMenu() { menu.open = !narrow.matches; }
  narrow.addEventListener('change', sizeMenu);
  sizeMenu();
  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrow.matches && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  nav.replaceChildren(el('a', { class: 'brand', href: '/cs-games/', text: 'CS Games', 'aria-current': page === 'home' ? 'page' : undefined }), menu);
}
