import { booleanGame, generate, makeRng, signature } from "../../java-games/boolean-conditional-lab/engine.js";
import { buildAssessmentXml, buildManifest, createZip, escapeHtml, formatChoiceHtml, formatQuestionHtml } from "./qti.js";

const $ = id => document.getElementById(id);
const supportedModes = ["branch","conditions","equivalent","short","construct"];
const hash = text => { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
let quiz = [];
let config = null;

function makeConfig() {
  const mode = $("mode").value;
  const count = Math.max(1, Math.min(20, Number($("question-count").value) || 5));
  const points = Math.max(1, Math.min(100, Number($("points").value) || 1));
  const rawSeed = $("seed").value.trim();
  const seed = rawSeed === "" ? (Date.now() >>> 0) : (Number(rawSeed) >>> 0);
  return { title: $("quiz-title").value.trim() || "CS Games Practice Quiz", mode, count, points, seed };
}
function generateItem(rng, mode, points, used) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const q = generate(mode, rng);
    if (q.kind === "select" || !Array.isArray(q.choices) || q.choices.length !== 4) continue;
    const sig = signature(q);
    if (used.has(sig)) continue;
    used.add(sig);
    return {
      id: "boolean-" + hash(sig + "-" + attempt),
      source: booleanGame.name,
      mode: q.modeTitle || booleanGame.modes[q.mode],
      stem: q.question,
      code: q.code,
      choices: q.choices,
      correctIndex: q.answer,
      correctAnswer: q.answerText,
      explanation: q.explanation,
      signature: sig,
      points
    };
  }
  return null;
}
function buildQuiz(nextConfig, count = nextConfig.count, excluded = new Set()) {
  const rng = makeRng(nextConfig.seed >>> 0);
  const modes = nextConfig.mode === "all" ? supportedModes : [nextConfig.mode];
  const used = new Set(excluded);
  const items = [];
  for (let i = 0; i < count; i++) {
    const mode = modes[i % modes.length];
    const item = generateItem(rng, mode, nextConfig.points, used);
    if (!item) return { items, error: "There were not enough distinct questions for that configuration. Try fewer questions or another mode." };
    items.push(item);
  }
  return { items, error: "" };
}
function render() {
  $("regenerate-quiz").disabled = quiz.length === 0;
  $("download").disabled = quiz.length === 0;
  if (!quiz.length) { $("quiz-summary").hidden = true; $("preview").innerHTML = ""; return; }
  $("quiz-summary").hidden = false;
  const total = quiz.reduce((sum, item) => sum + item.points, 0);
  $("quiz-summary").innerHTML = "<h2>Quiz summary</h2><p class='quiz-total'><span><strong>" + quiz.length + "</strong> questions</span><span><strong>" + total + "</strong> total points</span><span>Source: " + escapeHtml(booleanGame.name) + "</span></p>";
  $("preview").innerHTML = "<h2>Preview</h2>" + quiz.map((item, index) => `
    <article class="quiz-item">
      <h3>Question ${index + 1}</h3>
      <div class="question-content">${formatQuestionHtml(item)}</div>
      <p class="source-note">${escapeHtml(item.mode)} · ${escapeHtml(item.source)} · ${item.points} point${item.points === 1 ? "" : "s"}</p>
      <ol class="choice-list">${item.choices.map((choice, choiceIndex) => "<li class='" + (choiceIndex === item.correctIndex ? "correct" : "") + "'>" + formatChoiceHtml(choice) + (choiceIndex === item.correctIndex ? " — Correct answer" : "") + "</li>").join("")}</ol>
      <p class="answer-note"><strong>Explanation:</strong> ${escapeHtml(item.explanation)}</p>
      <button class="secondary regenerate-one" data-index="${index}">Regenerate Question</button>
    </article>`).join("");
  document.querySelectorAll(".regenerate-one").forEach(button => button.onclick = () => regenerateOne(Number(button.dataset.index)));
}
function generateQuiz() {
  config = makeConfig();
  const result = buildQuiz(config);
  quiz = result.items;
  $("status").textContent = result.error || "Quiz generated. Review every answer before downloading.";
  render();
}
function regenerateOne(index) {
  if (!config || !quiz[index]) return;
  const excluded = new Set(quiz.map((item, i) => i === index ? "" : item.signature));
  const replacement = buildQuiz({ ...config, seed: (config.seed + index + 1) >>> 0 }, 1, excluded).items[0];
  if (!replacement) { $("status").textContent = "No distinct replacement was available for that question."; return; }
  replacement.points = quiz[index].points;
  quiz[index] = replacement;
  $("status").textContent = "Question " + (index + 1) + " regenerated.";
  render();
}
function assessmentXml() {
  return buildAssessmentXml(config, quiz);
}
function downloadZip() {
  const manifest = buildManifest();
  const metadata = JSON.stringify({ title: config.title, source: booleanGame.name, questions: quiz.length, points: quiz.reduce((sum, item) => sum + item.points, 0) }, null, 2);
  const blob = createZip([{ name: "imsmanifest.xml", data: manifest }, { name: "assessment.xml", data: assessmentXml() }, { name: "metadata.json", data: metadata }]);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = (config.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "cs-games-quiz") + ".zip";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  $("status").textContent = "QTI ZIP created and downloaded. Validate it in Canvas before assigning it.";
}
$("generate").onclick = generateQuiz;
$("regenerate-quiz").onclick = generateQuiz;
$("download").onclick = downloadZip;
