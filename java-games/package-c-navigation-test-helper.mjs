import assert from 'node:assert/strict';

// Inspect destinations rather than assuming a breadcrumb anchor's position.
export function assertCourseBreadcrumb(document, currentPage) {
  const nav=document.querySelector('header nav[aria-label="Breadcrumb"]');
  assert.ok(nav, 'course breadcrumb exists');
  const links=[...nav.querySelectorAll('a')];
  const byPath=path=>links.find(a=>new URL(a.getAttribute('href'), 'https://davisjm4.github.io/').href === `https://davisjm4.github.io${path}`);
  assert.ok(byPath('/cs-games/'), 'CS Games hub link exists');
  const course=byPath('/cs-games/advanced/');
  assert.ok(course, 'Advanced Computer Science pathway link exists');
  assert.equal(course.textContent.trim(), 'Advanced Computer Science');
  const current=nav.querySelector('[aria-current="page"]');
  assert.ok(current && currentPage.test(current.textContent.trim()), 'current page is identified in breadcrumb');
}
