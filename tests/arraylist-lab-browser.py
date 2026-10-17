"""ArrayList Lab: real-browser check (Chromium via Playwright).

Optional, not used by students. Serve the repository root first:
    python3 -m http.server 8765        (from the repository root)
then run:
    python3 tests/arraylist-lab-browser.py [base_url]

Checks, at Chromebook (1366x768), phone (390x844) and small phone (360x740)
sizes: every mode plays through real mouse clicks; no answer marks, index
labels, reveal or feedback are visible before submission; correct and
incorrect feedback; no immediate repeats; tap targets are on-screen and large
enough; no horizontal page scroll; the session is written to localStorage and
shown on Session Summary; reset needs confirmation; the hub card links here.
"""
import asyncio, json, sys
from playwright.async_api import async_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765").rstrip("/")
GAME = f"{BASE}/java-games/arraylist-lab/"
MODES = ["mixed", "access", "insert-remove", "search-size", "traverse", "compare"]
checks = 0


def ok(cond, msg):
    global checks
    if not cond:
        raise AssertionError(msg)
    checks += 1


async def current(pg):
    return await pg.evaluate(
        "(()=>{const c=ArrayListLab.current();return {kind:c.kind,answer:c.answer,n:c.choices?c.choices.length:0,len:c.list?c.list.values.length:0,sig:c.signature,mode:c.mode,family:c.family,template:c.template};})()"
    )


async def answer(pg, ch, correct):
    k, a = ch["kind"], ch["answer"]
    if k == "choice":
        await pg.click(f'[data-choice="{a if correct else (a + 1) % ch["n"]}"]')
    elif k == "cell":
        await pg.click(f'[data-cell="{a if correct else (a + 1) % ch["len"]}"]')
    elif k == "gap":
        await pg.click(f'[data-gap="{a if correct else (a + 1) % (ch["len"] + 1)}"]')
    else:
        ids = a if correct else (a[1:] if len(a) > 1 else [i for i in range(ch["len"]) if i not in a][:1])
        for i in ids:
            await pg.click(f'[data-cell="{i}"]')


async def run_viewport(browser, w, h, tag, errors):
    ctx = await browser.new_context(viewport={"width": w, "height": h})
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"{tag}: {e}"))
    pg.on("console", lambda m: errors.append(f"{tag}: {m.text}") if m.type == "error" else None)
    await pg.goto(GAME + "?seed=1234")
    ok(await pg.input_value("#mode") == "mixed", "Mixed Practice is the default")
    stats = {"rounds": 0, "kinds": set(), "families": set()}
    prev_sig = None
    for mode in MODES:
        await pg.select_option("#mode", mode)
        for r in range(10):
            ch = await current(pg)
            stats["rounds"] += 1
            stats["kinds"].add(ch["kind"])
            stats["families"].add(ch["family"])
            ok(mode == "mixed" or ch["mode"] == mode, f"{mode}: challenge from the selected mode")
            ok(ch["sig"] != prev_sig, "no immediate repeat")
            prev_sig = ch["sig"]
            # nothing revealed before submission
            ok(await pg.locator(".is-correct, .is-answer, .is-wrong").count() == 0, "no answer marks before submitting")
            ok(not await pg.locator("#feedback").is_visible(), "feedback hidden")
            ok(not await pg.locator("#reveal").is_visible(), "reveal hidden")
            ok(await pg.locator("#submit").is_disabled(), "Check Answer disabled until a choice is made")
            if ch["kind"] in ("cell", "gap", "cells"):
                ok(await pg.locator("#start .al-idx:visible").count() == 0, f"{ch['template']}: no index labels on an index-target question")
                # every tap target fully on screen and >= 22px wide / 40px tall
                for box in await pg.eval_on_selector_all("[data-cell],[data-gap]", "els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.left,r.right,r.width,r.height]})"):
                    ok(box[0] >= 0 and box[1] <= w + 0.5, f"{tag} {ch['template']}: tap target on screen {box}")
                    ok(box[2] >= 21 and box[3] >= 40, f"{tag}: tap target size {box}")
            correct = (r % 3) != 2
            await answer(pg, ch, correct)
            ok(await pg.locator("#submit").is_enabled(), "selection enables Check Answer")
            await pg.click("#submit")
            fb = pg.locator("#feedback")
            ok(await fb.is_visible(), "feedback shown")
            cls = await fb.get_attribute("class")
            ok(("good" in cls) == correct and ("bad" in cls) == (not correct), f"{tag}: feedback matches correctness")
            text = await fb.inner_text()
            ok(("Correct!" in text) if correct else ("Correct answer:" in text), "feedback text")
            if ch["kind"] in ("cell", "gap", "cells"):
                ok(await pg.locator("#start .al-idx:visible").count() > 0, "indices revealed after submission")
            if r == 0 and mode in ("insert-remove", "traverse"):
                await pg.screenshot(path=f"/tmp/claude-0/shots/browser-{tag}-{mode}.png", full_page=True)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            ok(sw <= w, f"{tag}: no horizontal page scroll ({sw} > {w})")
            await pg.click("#next")
    # Show Answer and Skip
    await pg.click("#show")
    ok("Answer shown" in await pg.locator("#feedback").inner_text(), "Show Answer reveals")
    await pg.click("#next")
    await pg.click("#skip")
    session = json.loads(await pg.evaluate("localStorage.getItem('javaGames.session.v1')"))
    g = session["games"]["arraylist-lab"]
    ok(g["title"] == "ArrayList Lab", "session game title")
    ok(g["attempted"] == stats["rounds"], f"attempted {g['attempted']} == rounds {stats['rounds']}")
    expected_wrong = sum(1 for _ in MODES for r in range(10) if r % 3 == 2)
    ok(g["incorrect"] == expected_wrong and g["firstTry"] == stats["rounds"] - expected_wrong, "first-try / incorrect counts")
    ok(g["revealed"] == expected_wrong + 1 and g["skipped"] >= 1, "revealed and skipped counts")
    ok(set(g["topics"]) == set(MODES[1:]), f"per-mode topics {sorted(g['topics'])}")
    # Session Summary shows the game; reset requires confirmation
    await pg.goto(f"{BASE}/java-games/session-summary/")
    rep = await pg.locator("#report").inner_text()
    ok("ArrayList Lab" in rep and "Insert & Remove" in rep, "Session Summary lists ArrayList Lab and its modes")
    await pg.click("#reset")
    ok(await pg.locator("#reset-dialog").is_visible(), "reset asks for confirmation")
    await pg.click("#cancel-reset")
    ok("ArrayList Lab" in await pg.locator("#report").inner_text(), "cancel keeps results")
    await pg.click("#reset")
    await pg.click("#confirm-reset")
    ok("ArrayList Lab" not in await pg.locator("#report").inner_text(), "confirmed reset clears results")
    # Hub card
    await pg.goto(f"{BASE}/java-games/")
    card = pg.locator('a[href="arraylist-lab/"]')
    ok(await card.count() == 1, "hub card present")
    await card.click()
    await pg.wait_for_url("**/arraylist-lab/")
    ok(await pg.locator("h1").inner_text() == "ArrayList Lab", "hub link opens the lab")
    ok(await pg.locator("header [data-session-link]").count() == 1, "shared Session Summary navigation")
    await ctx.close()
    return stats


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        errors = []
        for w, h, tag in [(1366, 768, "chromebook"), (390, 844, "phone"), (360, 740, "small-phone")]:
            s = await run_viewport(browser, w, h, tag, errors)
            print(f"  ✓ {tag} {w}x{h}: {s['rounds']} rounds, kinds {sorted(s['kinds'])}, {len(s['families'])} families")
        # overflow sweep: 300 revealed challenges (feedback + before/after) at 360px
        ctx = await browser.new_context(viewport={"width": 360, "height": 740})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"sweep: {e}"))
        await pg.goto(GAME + "?seed=777")
        for _ in range(300):
            await pg.click("#show")
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            t = (await current(pg))["template"]
            ok(sw <= 360, f"sweep {t}: no horizontal scroll at 360px ({sw})")
            await pg.click("#next")
        await ctx.close()
        print("  ✓ 360px overflow sweep: 300 revealed challenges")
        ok(not errors, f"no console/page errors: {errors}")
        await browser.close()
    print(f"ArrayList Lab browser: {checks} checks passed in Chromium.")


asyncio.run(main())
