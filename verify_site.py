from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import atexit
import json
import os
import threading

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
OUTPUT = ROOT / "verification"
PAGES = ["index.html", "vehicles.html", "missions.html", "company.html"]
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile": {"width": 390, "height": 844},
}

BASE_URL = os.environ.get("VERIFY_BASE_URL", "").rstrip("/")
if not BASE_URL:
    SERVER = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(SimpleHTTPRequestHandler, directory=str(ROOT)),
    )
    threading.Thread(target=SERVER.serve_forever, daemon=True).start()
    atexit.register(SERVER.shutdown)
    BASE_URL = f"http://127.0.0.1:{SERVER.server_port}/site"


def main() -> None:
    OUTPUT.mkdir(exist_ok=True)
    report = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for page_name in PAGES:
            for viewport_name, viewport in VIEWPORTS.items():
                page = browser.new_page(viewport=viewport, device_scale_factor=1)
                console_errors = []
                page_errors = []
                failed_requests = []
                page.on("console", lambda msg, bag=console_errors: bag.append(msg.text) if msg.type == "error" else None)
                page.on("pageerror", lambda err, bag=page_errors: bag.append(str(err)))
                page.on("requestfailed", lambda req, bag=failed_requests: bag.append(f"{req.url}: {req.failure}"))
                response = page.goto(f"{BASE_URL}/{page_name}", wait_until="load")
                page.wait_for_timeout(900)
                # 逐屏触发懒加载与进入动画，再回到顶部做一致检查。
                page.evaluate(
                    """async () => {
                      document.documentElement.style.scrollBehavior = 'auto';
                      const max = document.documentElement.scrollHeight - innerHeight;
                      for (let y = 0; y <= max; y += Math.max(420, innerHeight * .72)) {
                        window.scrollTo({top: y, behavior: 'instant'});
                        await new Promise(resolve => setTimeout(resolve, 90));
                      }
                      window.scrollTo({top: max, behavior: 'instant'});
                      await new Promise(resolve => setTimeout(resolve, 450));
                      window.scrollTo({top: 0, behavior: 'instant'});
                      await new Promise(resolve => setTimeout(resolve, 250));
                    }"""
                )
                metrics = page.evaluate(
                    """() => ({
                      title: document.title,
                      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                      brokenImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
                      duplicateIds: [...document.querySelectorAll('[id]')].map(x => x.id).filter((id, i, a) => a.indexOf(id) !== i),
                      navLinks: [...document.querySelectorAll('header a, [data-mobile-nav] a')].length,
                      unofficial: document.body.innerText.includes('UNOFFICIAL CONCEPT') && document.body.innerText.includes('NOT AFFILIATED WITH SPACEX'),
                      scenes: document.querySelectorAll('[data-scene]').length,
                      videos: [...document.querySelectorAll('[data-scene-video]')].map(video => ({
                        muted: video.muted,
                        autoplay: video.autoplay,
                        loop: video.loop,
                        playsInline: video.playsInline,
                        poster: video.getAttribute('poster'),
                      })),
                    })"""
                )
                if page_name == "index.html":
                    detail_trigger = page.locator('[data-detail="starship"]').first
                    if detail_trigger.count():
                        detail_trigger.scroll_into_view_if_needed()
                        before_scroll = page.evaluate("window.scrollY")
                        detail_trigger.evaluate("element => element.click()")
                        metrics["detailOpened"] = page.locator("[data-detail-dialog]").evaluate("d => d.open")
                        metrics["detailTitle"] = page.locator("[data-detail-title]").inner_text()
                        page.locator("[data-detail-close]").click()
                        page.wait_for_timeout(220)
                        after_scroll = page.evaluate("window.scrollY")
                        metrics["detailClosed"] = not page.locator("[data-detail-dialog]").evaluate("d => d.open")
                        metrics["scrollRestored"] = abs(after_scroll - before_scroll) <= 1
                    audio_toggle = page.locator("[data-audio-toggle]")
                    if audio_toggle.count():
                        audio_toggle.click()
                        page.wait_for_timeout(250)
                        metrics["audioStarted"] = audio_toggle.get_attribute("aria-pressed") == "true"
                        audio_toggle.click()
                        metrics["audioPaused"] = audio_toggle.get_attribute("aria-pressed") == "false"
                    video_toggle = page.locator("[data-video-toggle]").first
                    if video_toggle.count():
                        video_toggle.scroll_into_view_if_needed()
                        page.wait_for_timeout(650)
                        video_toggle.click()
                        metrics["videoPaused"] = video_toggle.get_attribute("data-video-state") == "paused"
                        video_toggle.click()
                        page.wait_for_timeout(350)
                        metrics["videoResumeRequested"] = video_toggle.locator("[data-video-toggle-label]").inner_text() == "暂停视频"
                if viewport_name == "mobile":
                    toggle = page.locator("[data-menu-toggle]")
                    if toggle.count():
                        toggle.click()
                        metrics["menuOpen"] = page.locator("[data-mobile-nav]").get_attribute("data-open") == "true"
                        page.keyboard.press("Escape")
                        metrics["menuClosedByEscape"] = page.locator("[data-mobile-nav]").get_attribute("data-open") == "false"
                screenshot = OUTPUT / f"{Path(page_name).stem}-{viewport_name}.png"
                page.screenshot(path=str(screenshot), full_page=True)
                entry = {
                    "page": page_name,
                    "viewport": viewport_name,
                    "status": response.status if response else 200,
                    "consoleErrors": console_errors,
                    "pageErrors": page_errors,
                    "failedRequests": failed_requests,
                    **metrics,
                    "screenshot": str(screenshot),
                }
                entry["pass"] = (
                    not console_errors
                    and not page_errors
                    and not failed_requests
                    and not metrics["brokenImages"]
                    and not metrics["duplicateIds"]
                    and metrics["overflow"] <= 1
                    and metrics["unofficial"]
                    and (page_name != "index.html" or metrics.get("detailOpened", False))
                    and (page_name != "index.html" or metrics.get("detailClosed", False))
                    and (page_name != "index.html" or metrics.get("scrollRestored", False))
                    and (page_name != "index.html" or metrics.get("audioStarted", False))
                    and (page_name != "index.html" or metrics.get("audioPaused", False))
                    and (page_name != "index.html" or len(metrics.get("videos", [])) == 2)
                    and (page_name != "index.html" or all(
                        video["muted"] and video["autoplay"] and video["loop"] and video["playsInline"] and video["poster"]
                        for video in metrics.get("videos", [])
                    ))
                    and (page_name != "index.html" or metrics.get("videoPaused", False))
                    and (page_name != "index.html" or metrics.get("videoResumeRequested", False))
                    and (viewport_name != "mobile" or metrics.get("menuOpen", True))
                    and (viewport_name != "mobile" or metrics.get("menuClosedByEscape", True))
                )
                report.append(entry)
                page.close()
        browser.close()
    (OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not all(item["pass"] for item in report):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
