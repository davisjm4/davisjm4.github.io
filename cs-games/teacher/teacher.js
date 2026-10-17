import { booleanGame, generate, makeRng, signature } from "../../java-games/boolean-conditional-lab/engine.js";

const $ = id => document.getElementById(id);
const supportedModes = ["branch","conditions","equivalent","short","construct"];
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
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
      <p><strong>${escapeHtml(item.stem)}</strong></p>
      <pre>${escapeHtml(item.code)}</pre>
      <p class="source-note">${escapeHtml(item.mode)} · ${escapeHtml(item.source)} · ${item.points} point${item.points === 1 ? "" : "s"}</p>
      <ol class="choice-list">${item.choices.map((choice, choiceIndex) => "<li class='" + (choiceIndex === item.correctIndex ? "correct" : "") + "'>" + escapeHtml(choice) + (choiceIndex === item.correctIndex ? " — Correct answer" : "") + "</li>").join("")}</ol>
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
function xml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;" }[c])); }
function assessmentXml() {
  const ident = "cs-games-" + hash(config.title + "-" + config.seed);
  const total = quiz.reduce((sum, item) => sum + item.points, 0);
  const items = quiz.map((item, index) => {
    const labels = item.choices.map((choice, i) => `<response_label ident="choice_${i}"><material><mattext texttype="text/plain">${xml(choice)}</mattext></material></response_label>`).join("");
    return `<item ident="${xml(item.id)}" title="Question ${index + 1}"><presentation><material><mattext texttype="text/plain">${xml(item.stem + "\n\n" + item.code)}</mattext></material><response_lid ident="response_1" rcardinality="Single"><render_choice>${labels}</render_choice></response_lid></presentation><resprocessing><outcomes><decvar maxvalue="${total}" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes><respcondition continue="No"><conditionvar><varequal respident="response_1">choice_${item.correctIndex}</varequal></conditionvar><setvar action="Set" varname="SCORE">${item.points}</setvar></respcondition></resprocessing><itemfeedback ident="general"><material><mattext texttype="text/plain">${xml(item.explanation)}</mattext></material></itemfeedback></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><assessment ident="${ident}" title="${xml(config.title)}"><section ident="root">${items}</section></assessment></questestinterop>`;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(n) { return [n & 255, (n >>> 8) & 255]; }
function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
function zip(entries) {
  const encoder = new TextEncoder(), local = [], central = [], chunks = [], files = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name), data = encoder.encode(entry.data), crc = crc32(data);
    const header = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name]);
    local.push(header, data);
    files.push({ name, data, crc, offset });
    offset += header.length + data.length;
  }
  let centralSize = 0;
  for (const file of files) {
    const record = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(file.crc), ...u32(file.data.length), ...u32(file.data.length), ...u16(file.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(file.offset), ...file.name]);
    central.push(record);
    centralSize += record.length;
  }
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  return new Blob([...local.flatMap(x => [x]), ...central, end], { type: "application/zip" });
}
function downloadZip() {
  const manifest = `<?xml version="1.0" encoding="UTF-8"?><manifest identifier="cs-games-manifest" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><organizations/><resources><resource identifier="assessment-resource" type="imsqti_xmlv1p2" href="assessment.xml"><file href="assessment.xml"/></resource></resources></manifest>`;
  const metadata = JSON.stringify({ title: config.title, source: booleanGame.name, questions: quiz.length, points: quiz.reduce((sum, item) => sum + item.points, 0) }, null, 2);
  const blob = zip([{ name: "imsmanifest.xml", data: manifest }, { name: "assessment.xml", data: assessmentXml() }, { name: "metadata.json", data: metadata }]);
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
