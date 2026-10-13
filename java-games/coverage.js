const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
try {
  const response = await fetch("./coverage.json?v=java-v1");
  if (!response.ok) throw Error("Coverage unavailable");
  const d = await response.json();
  document.getElementById("coverage").innerHTML =
    `<p>${esc(d.scope)}</p><p>Reviewed ${d.audited}. <a href="${d.source}">Official AP CSA framework</a> · <a href="${d.clarifications}">Clarifications</a></p><p>Introduced means limited recognition. Practiced means application in the listed templates. Neither means full topic mastery.</p>${d.topics.map((t) => `<details class="panel"><summary><strong>${t.topic} ${esc(t.title)}</strong> — ${t.status}</summary><p><strong>Activity:</strong> ${esc(t.activity)}<br><strong>Modes:</strong> ${esc(t.modes)}</p><p><strong>Objectives:</strong> ${t.objectives.join(", ")}<br><strong>Essential knowledge IDs:</strong> ${t.essentialKnowledge.join(", ")}</p><p><strong>Validation:</strong> ${esc(t.validation)}<br><strong>Testing:</strong> ${esc(t.testing)}</p><p><strong>Remaining gaps:</strong> ${esc(t.gaps)}</p><small>Source PDF page ${t.pdfPage}</small></details>`).join("")}<h2>Computational thinking practices</h2>${d.practices.map((p) => `<section class="panel"><h3>${esc(p.title)}</h3><p>${esc(p.status)}</p></section>`).join("")}<h2>Proposed future work</h2>${d.future.map((f) => `<section class="panel"><h3>${esc(f.name)}</h3><p>${esc(f.interaction)}</p></section>`).join("")}`;
} catch (error) {
  document.getElementById("coverage").textContent =
    error.message + "; use the detailed matrix link.";
}
