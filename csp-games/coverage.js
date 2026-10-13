const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
try {
  const r = await fetch("./coverage.json?v=platform-expansion-v2");
  if (!r.ok) throw Error("Coverage data unavailable");
  const d = await r.json();
  document.getElementById("coverage").innerHTML =
    `<p>Audited ${d.audited}. Source: <a href="${d.source}">College Board CED</a>. Objective and essential-knowledge IDs refer to the source; summaries are paraphrased.</p><p><strong>Not covered:</strong> no meaningful practice. <strong>Introduced:</strong> identification. <strong>Practiced:</strong> randomized application. <strong>Reinforced:</strong> varied application, analysis, and independent explanation.</p><p>${esc(d.scope)}</p>${d.topics.map((t) => `<details class="panel"><summary><strong>${t.topic} ${esc(t.title)}</strong> — ${t.coverage}</summary><p><strong>Objectives:</strong> ${t.objectives.join(", ")}<br>${esc(t.objectiveSummary)}</p><p><strong>Essential knowledge:</strong> ${esc(t.knowledgeSummary)}<br><small>${t.essentialKnowledge.join(", ")}</small></p><p><strong>Activity:</strong> ${esc(t.activity)}<br><strong>Modes:</strong> ${esc(t.modes)}</p><p><strong>Identification / application / explanation:</strong> ${esc(t.identification)} / ${esc(t.application)} / ${esc(t.explanation)}</p><p><strong>Validation:</strong> ${esc(t.validation)}<br><strong>Implementation:</strong> ${esc(t.implementation)}<br><strong>Testing:</strong> ${esc(t.testing)}</p><p><strong>Remaining gap:</strong> ${esc(t.gaps)}</p><small>Source PDF page ${t.pdfPage}</small></details>`).join("")}<h2>Six computational thinking practices</h2>${d.practices.map((p) => `<section class="panel"><h3>${p.number}. ${p.title}</h3><p>${p.current}</p><p>${p.gaps}</p></section>`).join("")}<section class="panel"><h2>Authentic work remains essential</h2><p>Collaboration, user-focused design, documentation, creating programs, abstraction explanations, attribution, and responsible data use require teacher-reviewed projects and/or extended writing. Browser practice supports those skills but cannot certify authentic completion.</p></section>`;
} catch (e) {
  document.getElementById("coverage").textContent =
    e.message + " — use the detailed matrix link above.";
}
