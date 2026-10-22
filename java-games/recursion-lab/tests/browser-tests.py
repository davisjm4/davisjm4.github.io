"""Real-Chromium regression test for Recursion Lab (all modes x difficulties, both answer paths, locking,
feedback, trace, keyboard, Session stats, three viewports, console errors).
Usage: python3 tests/browser-tests.py <site_root> [rounds=2]"""
import json, subprocess, sys, os, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
ROOT = sys.argv[1]; ROUNDS = int(sys.argv[2]) if len(sys.argv) > 2 else 2
LAB = os.path.join(ROOT, "java-games", "recursion-lab")
SEED = 1761000000123
MODES = ["base", "returns", "output", "arrays", "debug", "searchsort"]; DIFFS = ["Beginner", "Intermediate", "Advanced"]
checks = 0; failures = []
def ok(c, m):
    global checks; checks += 1
    if not c: failures.append(m)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=ROOT)); port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
# call plan mirrors ui.js: initial next("mixed","Beginner"); difficulty change -> next; mode change -> next; Next -> next
plan = [["mixed", "Beginner"]]; steps = []; current = "mixed"
for d in DIFFS:
    plan.append([current, d]); steps.append(("difficulty", d))
    for m in MODES:
        plan.append([m, d]); steps.append(("mode", m)); current = m
        for k in range(ROUNDS): plan.append([m, d]); steps.append(("next", None))
expected = json.loads(subprocess.check_output(["node", os.path.join(LAB, "tests", "browser-plan.mjs"), str(SEED), json.dumps(plan)], cwd=LAB))
summary = {}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for vw, vh in [(1366, 768), (390, 844), (360, 740)]:
        ctx = browser.new_context(viewport={"width": vw, "height": vh}, has_touch=vw < 500)
        ctx.add_init_script(f"Date.now = () => {SEED};")
        page = ctx.new_page(); errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None); page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"http://127.0.0.1:{port}/java-games/recursion-lab/"); page.wait_for_selector("#choices button")
        ok(page.locator("#mode option").count() == 7, "7 mode options (Mixed + 6)"); ok(page.locator("#difficulty option").count() == 3, "3 difficulties")
        idx = 0; answered = 0
        def check_question(e, answer_correctly):
            global checks
            btns = page.locator("#choices button"); ok(btns.count() == 4, f"{e['mode']}: 4 choices")
            texts = [btns.nth(i).get_attribute("data-answer") for i in range(4)]
            ok(e["answer"] in texts, f"{e['mode']}/{e['difficulty']}: expected key {e['answer'][:40]} is shown")
            meta = page.locator(".challenge-meta").inner_text()
            ok(e["difficulty"] in meta and e["displayFamily"].replace("-", " ") in meta, f"meta line {meta}")
            if e["mode"] == "debug" and e["generator"] == "legacy": ok("find the bug" in meta, "legacy debug label does not leak the bug")
            choice = e["answer"] if answer_correctly else next(t for t in texts if t != e["answer"])
            target = btns.nth(texts.index(choice))
            if vw < 500: target.tap()
            else: target.click()
            ok(page.locator("#check").is_enabled(), "check enabled after selecting")
            page.locator("#check").click()
            fb = page.locator("#feedback"); ok(fb.is_visible(), "feedback visible")
            txt = fb.inner_text()
            ok(txt.startswith("Correct.") if answer_correctly else txt.startswith("Not quite."), f"feedback verdict: {txt[:30]}")
            ok(("About your choice:" in txt) == (not answer_correctly and e["hasFeedback"]), "misconception feedback only for wrong compositional answers")
            ok(("never reaches a base case" in txt) == e["diverges"], "diverging programs show non-termination instead of a call count")
            ok(all(page.locator("#choices button").nth(i).is_disabled() for i in range(4)), "choices locked after one attempt")
            ok(page.locator("#choices .correct-answer").count() == 1, "correct answer highlighted")
            if not answer_correctly: ok(page.locator("#choices .incorrect-answer").count() == 1, "wrong choice marked")
            if page.locator("details.trace").count(): page.locator("details.trace summary").click(); ok(page.locator("details.trace pre").inner_text().strip() != "", "trace has content")
            sw = page.evaluate("document.documentElement.scrollWidth"); ok(sw <= vw + 1, f"no horizontal scroll at {vw}px ({sw})")
        e = expected[idx]; check_question(e, True); idx += 1
        for kind, val in steps:
            if kind == "difficulty": page.select_option("#difficulty", val)
            elif kind == "mode": page.select_option("#mode", val)
            else: page.locator("#next").click()
            page.wait_for_selector("#choices button")
            e = expected[idx]; check_question(e, idx % 2 == 0); idx += 1; answered += 1
        stats = page.locator("#stats").inner_text(); ok(len(stats) > 5, f"session stats rendered: {stats}")
        # keyboard: new challenge, Tab to first choice, Space selects, then Check via keyboard
        page.select_option("#mode", "base"); page.wait_for_selector("#choices button")
        page.locator("#choices button").first.focus(); page.keyboard.press("Space")
        ok(page.locator("#choices button").first.get_attribute("aria-pressed") == "true", "keyboard selection sets aria-pressed")
        page.locator("#check").focus(); page.keyboard.press("Enter"); ok(page.locator("#feedback").is_visible(), "keyboard check works")
        ok(page.evaluate("document.activeElement.id") == "feedback", "focus moves to feedback")
        ok(not errors, f"no console errors at {vw}px: {errors[:2]}")
        summary[f"{vw}x{vh}"] = {"questions": answered + 2, "stats": stats}
        ctx.close()
    browser.close()
httpd.shutdown()
print(json.dumps({"checks": checks, "failures": len(failures), "viewports": summary}))
for f in failures[:10]: print("FAIL:", f)
sys.exit(1 if failures else 0)
