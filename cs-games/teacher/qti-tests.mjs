import assert from "node:assert/strict";
import { buildAssessmentXml, buildManifest, createZip, formatQuestionHtml } from "./qti.js";
import { generate, makeRng, signature } from "../../java-games/boolean-conditional-lab/engine.js";

const passed = [];
async function test(name, fn) { await fn(); passed.push(name); }
function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    const table = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    return entity[0] === "#" ? String.fromCodePoint(entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))) : table[entity.toLowerCase()];
  });
}
function assertXmlWellFormed(xml) {
  const tokens = xml.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![^>]*>|<[^>]+>|[^<]+/g) || [];
  const stack = [];
  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<?") || token.startsWith("<!")) continue;
    if (token.startsWith("</")) { const name = token.slice(2, -1).trim(); assert.equal(stack.pop(), name, `Mismatched closing tag ${name}`); }
    else if (token.startsWith("<")) { const name = token.slice(1).match(/^([^\s/>]+)/)?.[1]; assert.ok(name, `Invalid tag ${token}`); if (!token.endsWith("/>")) stack.push(name); }
    else assert.ok(!/(^|[^&])&(?!#\d+;|#x[\da-f]+;|amp;|lt;|gt;|quot;|apos;)/i.test(token), `Unescaped ampersand in ${token}`);
  }
  assert.deepEqual(stack, [], "Unclosed XML elements");
}
function readStoredZip(blob) {
  return blob.arrayBuffer().then(buffer => {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer), decoder = new TextDecoder();
    const files = new Map(); let pos = 0;
    while (view.getUint32(pos, true) === 0x04034b50) {
      const method = view.getUint16(pos + 8, true), size = view.getUint32(pos + 18, true);
      const nameLength = view.getUint16(pos + 26, true), extraLength = view.getUint16(pos + 28, true);
      const name = decoder.decode(bytes.slice(pos + 30, pos + 30 + nameLength));
      const start = pos + 30 + nameLength + extraLength;
      assert.equal(method, 0, "Expected existing ZIP store compression");
      files.set(name, decoder.decode(bytes.slice(start, start + size)));
      pos = start + size;
    }
    assert.equal(view.getUint32(pos, true), 0x02014b50, "Missing ZIP central directory");
    return files;
  });
}
function makeQuestion(id, code, prompt = "Trace this Java code.") {
  return { id, prompt, stem: prompt, code, choices: ["true", "false", "Compilation error", "Nothing"], correctIndex: 0, points: 2, explanation: "The first choice is correct." };
}

const samples = [
  makeQuestion("single", "int total = 3;"),
  makeQuestion("multi", "int a = 2;\nint b = 4;\nint sum = a + b;"),
  makeQuestion("nested", "if (a > b) {\n    if (flag) {\n        value++;\n    }\n}"),
  makeQuestion("chain", 'int score = 69;\n\nif (score >= 90) {\n    System.out.println("A");\n} else if (score >= 80) {\n    System.out.println("B");\n} else if (score >= 70) {\n    System.out.println("C");\n} else {\n    System.out.println("D");\n}'),
  makeQuestion("boolean", "boolean result = a > b && a < c || !flag;"),
  makeQuestion("vars", "int first = 1;\ndouble second = 2.5;\nboolean third = first <= second;"),
  makeQuestion("blank", "int start = 0;\n\nstart++;\n\nSystem.out.println(start);"),
  makeQuestion("strings", 'String text = "A & B < C > D";'),
  makeQuestion("chars", "char letter = 'Q';"),
  makeQuestion("escapes", 'String empty = "";\nString escaped = "Line\\nTab\\tQuote\\\"Slash\\\\";\nint[] values = {0, -1, 2147483647};'),
  makeQuestion("generics", "java.util.List<String> names = new java.util.ArrayList<>();"),
];

await test("shared preview/export renderer keeps structure and safe markup", () => {
  for (const question of samples) {
    const html = formatQuestionHtml(question);
    assert.ok(html.startsWith("<p>Trace this Java code.</p><pre><code>"));
    assert.ok(html.includes("</code></pre>"));
    assert.equal(decodeEntities(html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)[1]), question.code);
  }
  assert.ok(formatQuestionHtml(samples[7]).includes("A &amp; B &lt; C &gt; D"));
  assert.ok(decodeEntities(formatQuestionHtml(samples[8])).includes("'Q'"));
  assert.ok(formatQuestionHtml(samples.find(q=>q.id==="generics")).includes("List&lt;String&gt;"));
});

await test("XML-sensitive Java operators survive XML then HTML parsing exactly", () => {
  const code = "a > b\na < b\na >= b\na <= b\na == b\na != b\na && b\na || b\n!flag";
  const question = makeQuestion("operators", code);
  const xml = buildAssessmentXml({ title: "Operators & < >", seed: 7 }, [question]);
  assertXmlWellFormed(xml);
  const mattext = xml.match(/<mattext texttype="text\/html">([\s\S]*?)<\/mattext>/)[1];
  const html = decodeEntities(mattext);
  const codeHtml = html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)[1];
  assert.equal(decodeEntities(codeHtml), code);
});

await test("explicit Java answer choices use safe preformatted HTML", () => {
  const choiceCode = "List<String> names = new ArrayList<>();";
  const item = { ...makeQuestion("code-choice", "return names.size();"), choices: [{ code: choiceCode }, "1", "0", "Compilation error"] };
  const xml = buildAssessmentXml({ title: "Code choices", seed: 11 }, [item]);
  assertXmlWellFormed(xml);
  assert.ok(xml.includes("<mattext texttype=\"text/html\">&lt;pre&gt;&lt;code&gt;List&amp;lt;String&amp;gt; names = new ArrayList&amp;lt;&amp;gt;();&lt;/code&gt;&lt;/pre&gt;</mattext>"));
});

function generatedBatch(mode, seed, count = 10) {
  const rng = makeRng(seed), used = new Set(), items = [];
  let attempts = 0;
  while (items.length < count && attempts++ < 1000) {
    const q = generate(mode, rng);
    if (q.kind === "select" || !Array.isArray(q.choices) || q.choices.length !== 4) continue;
    const sig = signature(q); if (used.has(sig)) continue;
    used.add(sig); items.push({ id: `${mode}-${items.length + 1}`, stem: q.question, code: q.code, choices: q.choices, correctIndex: q.answer, explanation: q.explanation, points: 3, signature: sig });
  }
  assert.equal(items.length, count, `Could not produce ${count} distinct ${mode} questions`);
  return items;
}

const booleanQuestions = generatedBatch("mixed", 105);
const conditionalQuestions = generatedBatch("branch", 207);
const mixedQuestions = [
  ...generatedBatch("branch", 301).slice(0, 5),
  ...generatedBatch("conditions", 302, 5),
];

for (const [name, items] of [["Boolean", booleanQuestions], ["Conditional", conditionalQuestions], ["Mixed", mixedQuestions]]) {
  await test(`${name} package QTI, IDs, choices, answers and points are intact`, () => {
    const xml = buildAssessmentXml({ title: `${name} Test`, seed: 1 }, items);
    const manifest = buildManifest();
    assertXmlWellFormed(xml); assertXmlWellFormed(manifest);
    assert.match(xml, /ims_qtiasiv1p2/);
    assert.equal((xml.match(/<item ident=/g) || []).length, 10);
    assert.equal(new Set(items.map(q => q.id)).size, items.length);
    for (const item of items) {
      assert.ok(item.correctIndex >= 0 && item.correctIndex < item.choices.length);
      assert.ok(xml.includes(`choice_${item.correctIndex}</varequal>`));
      assert.ok(xml.includes(`<setvar action="Set" varname="SCORE">100</setvar>`));
      for (const choice of item.choices) assert.ok(xml.includes(`<mattext texttype="text/plain">${escapeForXml(choice)}</mattext>`));
    }
    assert.match(manifest, /href="assessment\.xml"/);
    const zip = createZip([{ name: "imsmanifest.xml", data: manifest }, { name: "assessment.xml", data: xml }, { name: "metadata.json", data: JSON.stringify({ questions: items.length }) }]);
    return readStoredZip(zip).then(files => {
      assert.deepEqual([...files.keys()], ["imsmanifest.xml", "assessment.xml", "metadata.json"]);
      assert.equal(files.get("assessment.xml"), xml);
      assert.equal(JSON.parse(files.get("metadata.json")).questions, 10);
    });
  });
}
function escapeForXml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[c])); }

for (const name of passed) console.log(`✓ ${name}`);
console.log(`Passed ${passed.length} QTI formatting and integrity checks.`);
