"""Real-browser test of Class & Object Lab (headless Chromium via Playwright).
Run from the repository root:  python3 java-games/class-object-lab/tests/class-object-browser.py [per_cell]
Serves the repository with a local static server; nothing is uploaded anywhere."""
import json, os, subprocess, sys, time, socket
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
PER = int(sys.argv[1]) if len(sys.argv) > 1 else 2
MODES = ["structure", "defaults", "constructors", "getters", "setters", "this", "independent", "aliases", "equality", "parameters", "static", "tostring", "reverse"]
LEVELS = ["Beginner", "Intermediate", "Advanced"]
checks = 0
failures = []

def ok(cond, msg):
    global checks
    checks += 1
    if not cond:
        failures.append(msg)

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

port = free_port()
server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = f"http://127.0.0.1:{port}/java-games/class-object-lab/"
# Seeded progress from earlier TODAY (the shared session keeps only the current local day's records).
_now_ms = int(time.time() * 1000)
_today = time.strftime("%Y-%m-%d", time.localtime())
SEEDED = {"schema": 1, "sessionDate": _today, "id": "seeded", "startedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(_now_ms / 1000 - 60)), "lastActivityAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(_now_ms / 1000 - 30)), "activeSeconds": 5, "student": {"name": "", "period": ""},
          "totals": {"generated": 3, "attempted": 2, "firstTry": 1, "afterRetry": 0, "submissions": 2, "incorrect": 1, "skipped": 1, "revealed": 1},
          "games": {"class-object-lab": {"title": "Class & Object Lab", "generated": 3, "attempted": 2, "firstTry": 1, "afterRetry": 0, "submissions": 2, "incorrect": 1, "skipped": 1, "revealed": 1,
                    "topics": {"aliases": {"title": "Object references and aliases", "generated": 3, "attempted": 2, "firstTry": 1, "afterRetry": 0, "submissions": 2, "incorrect": 1, "skipped": 1, "revealed": 1}},
                    "modes": {"aliases": {"title": "Object references and aliases", "generated": 3, "attempted": 2, "firstTry": 1, "afterRetry": 0, "submissions": 2, "incorrect": 1, "skipped": 1, "revealed": 1}}}},
          "records": {}}

def session(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('javaGames.session.v1') || 'null')")

def answer_current(page, pick):
    """pick: index to choose. Returns (correct, correct_answer_text)."""
    btns = page.locator("#choices button")
    ok(btns.count() == 4, "four choices")
    btns.nth(pick).click()
    ok(btns.nth(pick).get_attribute("aria-checked") == "true", "selection is announced")
    page.click("#check")
    fb = page.locator("#feedback")
    fb.wait_for(state="visible")
    cls = fb.get_attribute("class")
    good = "good" in cls
    # locking: all choices disabled; clicking again must not change state
    ok(all(btns.nth(i).is_disabled() for i in range(4)), "choices locked after submission")
    ok(page.locator("#check").is_disabled(), "check locked")
    ok(page.locator("#feedback .answer-text").count() == 1, "correct answer shown")
    return good

try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        results = {"viewports": {}, "cells": 0, "correct": 0, "incorrect": 0, "skips": 0}
        for (w, h) in [(1366, 768), (390, 844), (360, 740)]:
            ctx = browser.new_context(viewport={"width": w, "height": h})
            page = ctx.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            # pre-existing progress must survive
            page.goto(URL)
            page.evaluate("s => localStorage.setItem('javaGames.session.v1', JSON.stringify(s))", SEEDED)
            page.reload()
            page.wait_for_selector("#choices button")
            s0 = session(page)
            ok(s0 and s0["games"]["class-object-lab"]["topics"]["aliases"]["attempted"] == 2, f"existing progress preserved ({w})")
            ok(page.locator("#difficulty").is_visible(), "difficulty selector visible")
            ok(page.locator("#difficulty option").count() == 3, "three difficulty options")
            ok(page.locator("#mode option").count() == 15, "13 modes + Mixed + Class Builder")
            # keyboard: arrow moves the selection
            first = page.locator("#choices button").nth(0)
            first.focus(); page.keyboard.press("ArrowDown")
            ok(page.locator("#choices button").nth(1).get_attribute("aria-checked") == "true", "arrow key selects next choice")
            cells = MODES if w == 1366 else MODES[::4]
            for mode in cells:
                for lvl in LEVELS:
                    page.select_option("#difficulty", lvl)
                    page.select_option("#mode", mode)
                    for k in range(PER if w == 1366 else 1):
                        if k: page.click("#next")
                        page.wait_for_selector("#choices button")
                        meta = page.locator(".challenge-meta").inner_text()
                        ok(lvl in meta, f"difficulty shown {mode}/{lvl}")
                        code = page.locator(".class-snippet code").inner_text()
                        ok(len(code) > 20 and "undefined" not in code and "NaN" not in code, f"code rendered {mode}/{lvl}")
                        before = session(page)["games"]["class-object-lab"]["topics"].get(mode, {}).get("attempted", 0)
                        good = answer_current(page, (k + MODES.index(mode)) % 4)
                        results["correct" if good else "incorrect"] += 1
                        if not good:
                            ok(page.locator(".about-choice").count() == 1, f"misconception feedback {mode}/{lvl}")
                        ok(page.locator("#feedback .trace li").count() >= 1, f"trace present {mode}/{lvl}")
                        after = session(page)["games"]["class-object-lab"]["topics"][mode]["attempted"]
                        ok(after == before + 1, f"one scored attempt recorded {mode}/{lvl}")
                        ok(session(page)["games"]["class-object-lab"].get("modes", {}).get(mode, {}).get("attempted", 0) >= 1, f"per-mode session bucket {mode}")
                        results["cells"] += 1
                    ok(page.evaluate("() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"no horizontal page scroll {mode}/{lvl} at {w}px")
            # skip: next without answering
            sk0 = session(page)["games"]["class-object-lab"]["skipped"]
            page.click("#next"); page.wait_for_selector("#choices button"); page.click("#next"); page.wait_for_selector("#choices button")
            ok(session(page)["games"]["class-object-lab"]["skipped"] >= sk0 + 1, "skip recorded")
            results["skips"] += 1
            # mixed practice
            page.select_option("#mode", "mixed"); page.wait_for_selector("#choices button")
            ok(page.locator(".class-snippet").count() == 1, "mixed practice renders")
            # Class Builder: separate difficulty, conventional selector hidden
            page.select_option("#mode", "class-builder-rearrange")
            page.wait_for_function("() => document.querySelector('#stage') && !document.querySelector('#stage').textContent.startsWith('Loading')")
            ok(not page.locator("#difficulty-label").is_visible(), "conventional difficulty hidden for Class Builder")
            ok(page.locator(".cbr-level").count() >= 3, "Class Builder difficulty buttons present")
            page.select_option("#mode", "aliases"); page.wait_for_selector("#choices button")
            ok(page.locator("#difficulty-label").is_visible(), "difficulty selector restored")
            # difficulty persists across reload
            page.select_option("#difficulty", "Advanced"); page.wait_for_selector("#choices button"); page.reload(); page.wait_for_selector("#choices button")
            ok(page.locator("#difficulty").input_value() == "Advanced", "difficulty persisted")
            ok(not errors, f"no console errors at {w}px: {errors[:3]}")
            final = session(page)
            ok(final["games"]["class-object-lab"]["topics"]["aliases"]["attempted"] >= 2, "seeded progress still intact")
            results["viewports"][f"{w}x{h}"] = "ok" if not errors else "errors"
            page.screenshot(path=os.path.join(os.path.dirname(__file__), f"../test-results/screenshot-{w}x{h}.png"), full_page=True)
            ctx.close()
        browser.close()
finally:
    server.terminate()

summary = {"checks": checks, "failures": failures, **results, "browser": "Chromium (Playwright, headless)"}
os.makedirs(os.path.join(os.path.dirname(__file__), "../test-results"), exist_ok=True)
with open(os.path.join(os.path.dirname(__file__), "../test-results/browser-results.json"), "w") as f:
    json.dump(summary, f, indent=1)
print(f"Class & Object Lab browser test: {checks} checks, {len(failures)} failures; {results['cells']} challenges answered ({results['correct']} correct, {results['incorrect']} incorrect) at 3 viewports.")
for x in failures[:15]: print("FAIL", x)
sys.exit(1 if failures else 0)
