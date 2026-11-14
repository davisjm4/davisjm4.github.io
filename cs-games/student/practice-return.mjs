import { readRoute, routeHash } from './map/route.mjs';

const guestPath = '/cs-games/student/guest/';
const classPath = '/cs-games/student/';
const courses = new Set(['advanced', 'csp', 'robotics', 'workplace']);

export function withPracticeReturn(href, { origin, course, classId, route }) {
  const activity = new URL(href, origin);
  if (activity.origin !== origin || !courses.has(course)) return href;
  const target = new URL(classId ? classPath : guestPath, origin);
  if (classId) target.searchParams.set('class', classId);
  target.searchParams.set('course', course);
  target.hash = routeHash(route);
  activity.searchParams.set('returnTo', target.pathname + target.search + target.hash);
  return activity.pathname + activity.search + activity.hash;
}

export function resolvePracticeReturn(current, profile) {
  const raw = current.searchParams.get('returnTo');
  if (!raw?.startsWith('/') || raw.startsWith('//')) return null;
  let target;
  try { target = new URL(raw, current.origin); } catch { return null; }
  const course = target.searchParams.get('course');
  if (!courses.has(course) || target.origin !== current.origin) return null;
  const guest = current.searchParams.get('learner') === 'guest';
  if (guest) {
    if (target.pathname !== guestPath) return null;
  } else if (target.pathname !== classPath || !profile?.classId ||
    target.searchParams.get('class') !== profile.classId || (profile.courseId && profile.courseId !== course)) return null;

  // Only forward map state. Discard extra query parameters and hash keys, including enrollment links.
  const route = readRoute(target.hash);
  target.search = guest ? new URLSearchParams({ course }) : new URLSearchParams({ class: profile.classId, course });
  target.hash = routeHash(route);
  return target.pathname + target.search + target.hash;
}

export function addPracticeReturn(header, profile, fallback) {
  if (!header || header.querySelector('[data-profile-link]')) return;
  const current = new URL(location.href);
  const target = resolvePracticeReturn(current, profile);
  const stale = current.searchParams.has('returnTo') && !target;
  if (!target && !stale && !profile) return;

  const link = document.createElement('a');
  link.href = target || (stale ? fallback : classPath);
  link.textContent = target ? 'Back to Course Map' : stale ? 'Back to Course' : 'My class progress';
  link.dataset.profileLink = 'true';
  header.append(link);
  if (stale) {
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'The original map link is unavailable. You can return to the course from here.';
    header.after(note);
  }
}
