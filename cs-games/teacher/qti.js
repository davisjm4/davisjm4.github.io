// Shared question content renderer for the teacher preview and QTI 1.2 export.
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const xml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[c]));
const hash = text => { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };

function questionParts(question) {
  return {
    prompt: question.prompt ?? question.stem ?? question.question ?? "",
    context: question.context ?? "",
    passage: question.passage ?? "",
    questionContext: question.questionContext ?? "",
    response: question.response ?? "",
    code: question.code ?? "",
    choices: question.choices ?? [],
  };
}

function textBlock(label, value) {
  if (!value) return "";
  const paragraphs = String(value).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  return `${label ? `<p><strong>${escapeHtml(label)}</strong></p>` : ""}${paragraphs.map(p => `<p>${escapeHtml(p).replaceAll("\n", "<br>")}</p>`).join("")}`;
}

// Keep code in a preformatted element. Escape Java as HTML text, then escape the
// complete fragment for XML when inserting it into QTI mattext.
export function formatQuestionHtml(question) {
  const { prompt, context, passage, questionContext, response, code } = questionParts(question);
  return [
    passage && textBlock("Source passage", passage),
    questionContext && textBlock("Writing question", questionContext),
    context && textBlock("", context),
    prompt && `<p>${escapeHtml(prompt)}</p>`,
    response && textBlock("Student response", response),
    code !== "" && `<pre><code>${escapeHtml(code)}</code></pre>`
  ].filter(Boolean).join("");
}

export function formatChoiceHtml(choice) {
  // Choices are normally plain answer values. Honor explicit code choices for
  // future-compatible question objects without interpreting arbitrary strings.
  return choice && typeof choice === "object" && choice.code != null
    ? `<pre><code>${escapeHtml(choice.code)}</code></pre>`
    : escapeHtml(choice && typeof choice === "object" ? choice.text : choice);
}

function formatChoiceMattext(choice) {
  if (choice && typeof choice === "object" && choice.code != null) {
    return `<mattext texttype="text/html">${xml(`<pre><code>${escapeHtml(choice.code)}</code></pre>`)}</mattext>`;
  }
  return `<mattext texttype="text/plain">${xml(choice && typeof choice === "object" ? choice.text : choice)}</mattext>`;
}

export function validateAssessment(quiz, expectedCount) {
  const errors=[],ids=new Set();
  if(!Array.isArray(quiz)||!quiz.length) return ["Generate a complete assessment before exporting."];
  if(expectedCount!=null&&quiz.length!==expectedCount) errors.push(`Expected ${expectedCount} questions; received ${quiz.length}.`);
  for(const [index,item] of quiz.entries()) {
    const label=`Question ${index+1}`;
    if(!item.id||ids.has(item.id)) errors.push(`${label}: missing or duplicate identifier.`);
    ids.add(item.id);
    if(!Number.isFinite(item.points)||item.points<=0) errors.push(`${label}: points must be a positive number.`);
    const {prompt,context,passage,questionContext,response,code}=questionParts(item);
    if(![prompt,context,passage,questionContext,response].some(v=>String(v).trim())) errors.push(`${label}: missing question text.`);
    if(!String(item.explanation||"").trim()) errors.push(`${label}: missing explanation.`);
    if(item.sourceId==="search-sort"&&(typeof item.requiredContext!=="string"||context!==item.requiredContext)) errors.push(`${label}: required Search & Sort context is missing or changed.`);
    if(item.requiredCode!=null&&code!==item.requiredCode) errors.push(`${label}: required source code is missing or changed.`);
    const choices=(item.choices||[]).map(c=>c&&typeof c==="object"?String(c.code??c.text):String(c));
    if(choices.length!==4||new Set(choices).size!==4||choices.some(c=>!c.trim())||!Number.isInteger(item.correctIndex)||item.correctIndex<0||item.correctIndex>=choices.length) errors.push(`${label}: invalid answer choices or key.`);
    if(item.correctAnswer!=null&&choices[item.correctIndex]!==String(item.correctAnswer)) errors.push(`${label}: answer key does not match the correct answer.`);
    if([prompt,context,passage,questionContext,response,code,item.explanation,...choices].some(v=>/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(String(v)))) errors.push(`${label}: content contains invalid XML characters.`);
  }
  return errors;
}
const metadataField = (label,value) => `<qtimetadatafield><fieldlabel>${xml(label)}</fieldlabel><fieldentry>${xml(value)}</fieldentry></qtimetadatafield>`;
export function buildAssessmentXml(config, quiz) {
  const errors=validateAssessment(quiz,config.count);
  if(errors.length) throw new Error(errors.join(" "));
  const ident = "cs-games-" + hash(config.title + "-" + config.seed);
  const total = quiz.reduce((sum, item) => sum + item.points, 0);
  const items = quiz.map((item, index) => {
    const labels = item.choices.map((choice, i) => `<response_label ident="choice_${i}"><material>${formatChoiceMattext(choice)}</material></response_label>`).join("");
    const html = xml(formatQuestionHtml(item));
    const itemTitle = item.source ? `${item.source} · ${item.mode} · Question ${index + 1}` : `Question ${index + 1}`;
    // Canvas exports response weights as percentages and keeps points separate.
    // Never multiply the weight by points here; Canvas applies points_possible.
    const key=`<varequal respident="response_1">choice_${item.correctIndex}</varequal>`;
    const incorrect=item.choices.map((_,i)=>i===item.correctIndex?"":`<respcondition continue="No"><conditionvar><varequal respident="response_1">choice_${i}</varequal></conditionvar><setvar action="Set" varname="SCORE">0</setvar></respcondition>`).join("");
    return `<item ident="${xml(item.id)}" title="${xml(itemTitle)}"><itemmetadata><qtimetadata>${metadataField("question_type","multiple_choice_question")}${metadataField("points_possible",item.points)}</qtimetadata></itemmetadata><presentation><material><mattext texttype="text/html">${html}</mattext></material><response_lid ident="response_1" rcardinality="Single"><render_choice>${labels}</render_choice></response_lid></presentation><resprocessing><outcomes><decvar maxvalue="100" minvalue="0" defaultval="0" varname="SCORE" vartype="Decimal"/></outcomes><respcondition continue="Yes"><conditionvar><other/></conditionvar><displayfeedback feedbacktype="Response" linkrefid="general_fb"/></respcondition><respcondition continue="No"><conditionvar>${key}</conditionvar><setvar action="Set" varname="SCORE">100</setvar></respcondition>${incorrect}</resprocessing><itemfeedback ident="general_fb"><flow_mat><material><mattext texttype="text/plain">${xml(item.explanation)}</mattext></material></flow_mat></itemfeedback></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><assessment ident="${ident}" title="${xml(config.title)}"><qtimetadata>${metadataField("points_possible",total)}</qtimetadata><section ident="root">${items}</section></assessment></questestinterop>`;
}

export function buildManifest() {
  return `<?xml version="1.0" encoding="UTF-8"?><manifest identifier="cs-games-manifest" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><organizations/><resources><resource identifier="assessment-resource" type="imsqti_xmlv1p2" href="assessment.xml"><file href="assessment.xml"/></resource></resources></manifest>`;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
const u16 = n => [n & 255, (n >>> 8) & 255];
const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

// ZIP store method matches the existing browser exporter and requires no library.
export function createZip(entries) {
  const encoder = new TextEncoder(), local = [], central = [], files = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name), data = encoder.encode(entry.data), crc = crc32(data);
    const header = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name]);
    local.push(header, data); files.push({ name, data, crc, offset }); offset += header.length + data.length;
  }
  let centralSize = 0;
  for (const file of files) {
    const record = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(file.crc), ...u32(file.data.length), ...u32(file.data.length), ...u16(file.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(file.offset), ...file.name]);
    central.push(record); centralSize += record.length;
  }
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  return new Blob([...local, ...central, end], { type: "application/zip" });
}
