import { activeProfile } from '../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';
import { el } from './map/ui/dom.mjs';

const nav = document.querySelector('[data-student-navigation]');
if (nav) {
  const page = nav.dataset.studentNavigation;
  const links = [
    ['Courses', '/cs-games/student/guest/?choose=1', page === 'courses'],
    ['My Session', '/cs-games/student/guest/#my-session', false],
    [activeProfile ? 'My Class' : 'Join a Class', '/cs-games/student/', page === 'class'],
    ['Teacher Tools', '/cs-games/teacher/', false],
  ];
  nav.replaceChildren(el('a', { class: 'brand', href: '/cs-games/', text: 'CS Games' }),
    ...links.map(([text, href, current]) => el('a', { text, href, 'aria-current': current ? 'page' : undefined })));
}
