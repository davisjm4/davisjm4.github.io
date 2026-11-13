import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { startDev } from '../../wpr-games/workplace-readiness/service/dev.mjs';
import { createClient, seedFixtures } from './fixtures.mjs';

const escape = value => String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);

function home(classes,token) {
  const content = classes.map(course=>`<section>
    <h2>${escape(course.title)}</h2>
    <p><a href="/cs-games/student/#enroll=${course.invite}">Join as a new student</a>
    · <a href="/cs-games/student/">Restore a seeded profile</a>
    · <a href="/cs-games/teacher/?class=${course.id}#classes">Open class as teacher</a>
    ${course.diagnosticId?`· <a href="/wpr-games/workplace-readiness/?assignment=${course.diagnosticId}">Class diagnostic</a>`:''}</p>
    <details><summary>24 synthetic profile IDs and recovery credentials</summary>
    <table><thead><tr><th scope="col">Scenario</th><th scope="col">Profile ID</th><th scope="col">Recovery credential</th></tr></thead>
    <tbody>${course.students.map(student=>`<tr><th scope="row">${escape(student.label)}</th>
      <td><code>${student.id}</code></td><td><code>${student.recovery}</code></td></tr>`).join('')}</tbody></table></details>
  </section>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CS Games local audit</title>
  <style>
    body {font: 1rem/1.5 system-ui; margin: 2rem auto; padding: 0 1rem; max-width: 68rem}
    section {border-top: 1px solid #aaa; margin-top: 1rem}
    summary {cursor: pointer} table {border-collapse: collapse; width: 100%; table-layout: fixed}
    th, td {padding: .5rem; text-align: left; border-bottom: 1px solid #bbb; overflow-wrap: anywhere}
    code {overflow-wrap: anywhere} a {color: #164b9b}
  </style><main>
    <h1>CS Games local audit</h1>
    <p>All classes, practice history, scores, and credentials here are synthetic. Restart this process and use a fresh browser context to reset the audit.</p>
    <ul><li><a href="/cs-games/student/guest/">Test as Independent Student</a></li>
    <li><a href="#classes">Test as Enrolled Student</a></li>
    <li><a href="/cs-games/teacher/">Test as Teacher</a></li></ul>
    <details><summary>Teacher sign-in credential for this run</summary><p>Paste into the Development teacher token field in Teacher Tools.</p>
    <p><code id="teacher-token">${token}</code></p></details>
    <div id="classes">${content}</div>
  </main></html>`;
}

export async function startAudit() {
  const teacherToken = 'audit_'+randomBytes(32).toString('hex');
  const secondTeacherToken = 'audit_'+randomBytes(32).toString('hex');
  let page = '<h1>Preparing synthetic classes…</h1>';
  const dev = await startDev({
    teacherTokens:{'synthetic-audit-teacher':teacherToken,'synthetic-isolation-teacher':secondTeacherToken},
    auditPage:()=>page
  });
  const api = createClient(dev.url);
  const close = async () => {
    await new Promise(resolve=>dev.server.close(resolve));
    dev.db.close();
  };
  try {
    const classes = await seedFixtures(api,teacherToken);
    page = home(classes,teacherToken);
    return {...dev,api,classes,teacherToken,secondTeacherToken,close};
  } catch (error) {
    await close();
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  const audit = await startAudit();
  console.log('CS Games audit start page: '+audit.url+'/audit/');
  console.log('Independent student: '+audit.url+'/cs-games/student/guest/');
  console.log('Enrolled student (restore): '+audit.url+'/cs-games/student/');
  console.log('Teacher Tools: '+audit.url+'/cs-games/teacher/');
  console.log('For a fresh baseline, stop this process and run the same command again.');
}
