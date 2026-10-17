const catalog = window.CSGamesCatalog || [];
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const course = document.body.dataset.course;
const isCsp = course === "csp";
const items = catalog.filter(g => g.course === course);
const groups = isCsp ? [
  ["1","Big Idea 1 — Creative Development",["1.1 Collaboration","1.2 Program Purpose","1.3 Program Design","1.4 Testing"]],
  ["2","Big Idea 2 — Data",["2.1 Binary Representation","2.2 Data Compression","2.3 Data Analysis","2.4 Data Transformations"]],
  ["3","Big Idea 3 — Algorithms and Programming",["3.1 Program Components","3.2 Variables and Expressions","3.3 Selection and Iteration","3.4 Boolean Logic","3.5 Lists","3.6 Procedures","3.7 Algorithm Design","3.8 Iteration","3.9 Algorithm Efficiency","3.10 Procedures","3.11 Searching","3.12 Simulations"]],
  ["4","Big Idea 4 — Computer Systems and Networks",["4.1 Network Communication","4.2 Routing","4.3 Fault Tolerance","4.4 Parallel and Distributed Computing","4.5 Cybersecurity"]],
  ["5","Big Idea 5 — Impact of Computing",["5.1 Computing Innovations","5.2 Privacy and Security","5.3 Bias and Equity","5.4 Ethical Implications","5.5 Responsible Computing"]]
] : [
  ["2.1","2.1 — Apply Algorithms",["2.1 Algorithm Development","2.1 Classic Algorithms","2.1 Algorithm Interpretation","2.1 Searching","2.1 Algorithm Efficiency"]],
  ["2.2","2.2 — Implement Controls",["2.2 Boolean Logic","2.2 Conditionals","2.2 Loops","2.2 Nested Loops","2.2 Recursion"]],
  ["2.3","2.3 — Utilize Variables and Data Structures",["2.3 Variables and Data Types","2.3 Scope","2.3 Arrays","2.3 ArrayLists","2.3 Two-Dimensional Arrays"]],
  ["2.4","2.4 — Construct Solutions Using Modularity",["2.4 Methods and Parameters","2.4 Constructors","2.4 Classes and Objects","2.4 Encapsulation","2.4 Modularity","2.4 Object-Oriented Programming"]],
  ["2.5","2.5 — Programming and Development",["2.5 Debugging","2.5 Testing","2.5 Documentation"]],
  ["3","3.0 — Computing Systems",["3.0 Computing Systems"]],
  ["4","4.0 — Data and Analysis",["4.0 Binary Representation","4.0 Data Storage","4.0 Data Transformations","4.0 Data Analysis"]],
  ["5","5.0 — Impacts of Computing",["5.0 Impacts of Computing"]],
  ["6","6.0 — Networks and the Internet",["6.0 Networks and the Internet"]],
  ["7","7.0 — Emerging Technologies",[]],
  ["eop","EOP extensions — related Java concepts",[]]
];
const topicText = g => g.topics.join(" · ");
function card(g){
  const source = g.source === "csp" ? '<span class="course-pill">AP CSP activity</span>' : "";
  return '<article class="game-card" data-search="'+esc((g.title+" "+g.description+" "+g.skill+" "+topicText(g)).toLowerCase())+'"><div class="card-top">'+source+'</div><h3>'+esc(g.title)+'</h3><p>'+esc(g.description)+'</p><p class="skill"><strong>Practice:</strong> '+esc(g.skill)+'</p><p class="topics">'+esc(topicText(g))+'</p><a class="launch" href="'+g.url+'">Launch '+esc(g.title)+' <span aria-hidden="true">→</span></a></article>';
}
function matches(g, query, topic){return (!query || (g.title+" "+g.description+" "+g.skill+" "+topicText(g)).toLowerCase().includes(query)) && (!topic || g.topics.includes(topic));}
function render(){
  const query = document.getElementById("game-search").value.trim().toLowerCase();
  const topic = document.getElementById("topic-filter").value;
  const results = document.getElementById("results");
  let shown = 0;
  results.innerHTML = groups.map(([id,title,topics]) => {
    const groupItems = items.filter(g => g.topics.some(t => topics.includes(t)) && matches(g,query,topic));
    if (!groupItems.length) return "";
    shown += groupItems.length;
    const sub = topics.length ? '<div class="topic-list">'+topics.map(t => {const count=items.filter(g=>g.topics.includes(t)).length; return '<button class="topic-chip'+(topic===t?' active':'')+'" data-topic="'+esc(t)+'">'+esc(t)+' <span>'+count+'</span></button>';}).join("")+'</div>' : "";
    return '<details class="standard" open><summary><span>'+esc(title)+'</span><small>'+groupItems.length+' activit'+(groupItems.length===1?'y':'ies')+'</small></summary>'+sub+'<div class="game-grid">'+groupItems.map(card).join("")+'</div></details>';
  }).join("");
  document.getElementById("result-count").textContent = shown+" activit"+(shown===1?"y":"ies")+" shown";
  document.querySelectorAll("[data-topic]").forEach(b => b.onclick = () => { document.getElementById("topic-filter").value = b.dataset.topic; render(); });
}
const title = isCsp ? "AP Computer Science Principles" : "Advanced Computer Science";
document.title = title+" | CS Games";
document.querySelector("[data-course-title]").textContent = title;
document.querySelector("[data-course-intro]").textContent = isCsp ? "Practice AP CSP concepts through short activities aligned to the five Big Ideas. Use the topic names to find a useful next challenge." : "Practice Java programming, algorithms, data structures, and object-oriented programming while preparing for Nevada's Advanced Computer Science course and End-of-Program assessment.";
document.querySelector("[data-summary-link]").href = isCsp ? "/csp-games/session-summary/" : "/java-games/session-summary/";
document.querySelector("[data-summary-link]").textContent = isCsp ? "AP CSP Session Summary" : "Advanced CS Session Summary";
const filter = document.getElementById("topic-filter");
[...new Set(items.flatMap(g=>g.topics))].sort().forEach(t => filter.insertAdjacentHTML("beforeend",'<option value="'+esc(t)+'">'+esc(t)+'</option>'));
document.getElementById("game-search").addEventListener("input",render);
filter.addEventListener("change",render);
document.addEventListener("click", e => {if(e.target.matches(".topic-chip")) e.preventDefault();});
render();