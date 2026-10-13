import { sessionTracker, accuracy } from "./session.js";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const tracker = sessionTracker(),
  fmt = (m) => (accuracy(m) === null ? "N/A" : accuracy(m).toFixed(1) + "%"),
  time = (t) => new Date(t).toLocaleString();
function table(items) {
  return `<div class="table-wrap"><table class="report-table"><thead><tr><th>Game / topic</th><th>Attempted</th><th>First-try correct</th><th>First-try accuracy</th><th>Solved after retry</th><th>Submissions</th><th>Incorrect</th><th>Revealed</th><th>Skipped</th></tr></thead><tbody>${items.map((m) => `<tr><th scope="row">${esc(m.title)}</th><td data-label="Attempted">${m.attempted}</td><td data-label="First-try correct">${m.firstTry}</td><td data-label="First-try accuracy">${fmt(m)}</td><td data-label="Solved after retry">${m.afterRetry}</td><td data-label="Submissions">${m.submissions}</td><td data-label="Incorrect">${m.incorrect}</td><td data-label="Revealed">${m.revealed}</td><td data-label="Skipped">${m.skipped}</td></tr>`).join("")}</tbody></table></div>`;
}
function render() {
  const d = tracker.snapshot(),
    m = d.totals,
    elapsed = Math.max(
      0,
      Math.round((Date.now() - Date.parse(d.startedAt)) / 60000),
    );
  $("student-name").value = d.student.name;
  $("student-period").value = d.student.period;
  $("storage-warning").textContent = tracker.warning;
  $("report").innerHTML =
    `<section class="panel report-identity"><h2>${esc(d.student.name || "Student name not provided")}</h2><p><strong>Class period:</strong> ${esc(d.student.period || "Not provided")}</p><p><strong>Session started:</strong> ${time(d.startedAt)}<br><strong>Most recent activity:</strong> ${time(d.lastActivityAt)}<br><strong>Elapsed time:</strong> ${elapsed} minutes (includes time away; not active practice time)</p><p class="muted">Session ID: ${esc(d.id)}</p></section><section class="panel"><h2>Overall performance</h2><div class="summary-metrics">${[
      ["First-try accuracy", fmt(m)],
      ["Challenges attempted", m.attempted],
      ["First-try correct", m.firstTry],
      ["Solved after retries", m.afterRetry],
      ["Total solved independently", m.firstTry + m.afterRetry],
      ["Answer submissions", m.submissions],
      ["Incorrect submissions", m.incorrect],
      ["Answers revealed", m.revealed],
      ["Challenges skipped", m.skipped],
      ["Challenges generated", m.generated],
    ]
      .map(
        ([label, value]) =>
          `<div><strong>${value}</strong><span>${label}</span></div>`,
      )
      .join(
        "",
      )}</div><p class="muted">First-try accuracy = first-submission correct ÷ challenges with at least one answer submission. Revealing before submitting does not enter that denominator. Retrying keeps the same challenge ID; shown answers never count as independently solved. Skipped means an unfinished challenge was replaced or left.</p></section><section><h2>By game</h2>${Object.keys(d.games).length ? table(Object.values(d.games)) : "<p>No challenges generated in this session yet.</p>"}</section><section><h2>By topic / concept</h2>${
      Object.values(d.games)
        .map(
          (g) =>
            `<section class="topic-report"><h3>${esc(g.title)}</h3>${table(Object.values(g.topics))}</section>`,
        )
        .join("") || "<p>Topic results appear as you practice.</p>"
    }</section><p class="print-note">Locally stored formative practice evidence. This report is not tamper-proof. Elapsed time is not active practice time.</p>`;
}
for (let field of ["student-name", "student-period"])
  $(field).addEventListener("change", () => {
    tracker.student($("student-name").value, $("student-period").value);
    render();
  });
$("print").onclick = () => {
  tracker.student($("student-name").value, $("student-period").value);
  render();
  window.print();
};
$("reset").onclick = () => $("reset-dialog").showModal();
$("cancel-reset").onclick = () => $("reset-dialog").close();
$("confirm-reset").onclick = () => {
  tracker.reset(true);
  $("reset-dialog").close();
  render();
};
window.addEventListener("storage", render);
window.addEventListener("pageshow", render);
render();
