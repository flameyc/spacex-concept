from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import atexit
import json
import os
import threading

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parent
output = root / "verification"
output.mkdir(exist_ok=True)
base_url = os.environ.get("VERIFY_BASE_URL", "").rstrip("/")
if base_url:
    url = f"{base_url}/index.html"
else:
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(SimpleHTTPRequestHandler, directory=str(root)),
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    atexit.register(server.shutdown)
    url = f"http://127.0.0.1:{server.server_port}/site/index.html"
results = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for name, viewport in {
        "desktop": {"width": 1440, "height": 900},
        "mobile": {"width": 390, "height": 844},
    }.items():
        page = browser.new_page(viewport=viewport)
        errors = []
        page.on("pageerror", lambda error, bag=errors: bag.append(str(error)))
        page.goto(url, wait_until="load")
        page.wait_for_timeout(500)
        page.evaluate(
            """async () => {
              document.documentElement.style.scrollBehavior = 'auto';
              const max = document.documentElement.scrollHeight - innerHeight;
              for (let y = 0; y <= max; y += Math.max(420, innerHeight * .72)) {
                window.scrollTo({top: y, behavior: 'instant'});
                await new Promise(resolve => setTimeout(resolve, 35));
              }
              window.scrollTo({top: 0, behavior: 'instant'});
            }"""
        )

        trigger = page.locator('[data-detail="starship"]').first
        trigger.scroll_into_view_if_needed()
        before = page.evaluate("window.scrollY")
        trigger.evaluate("element => element.click()")
        page.wait_for_timeout(520)
        opened = page.locator("[data-detail-dialog]").evaluate("dialog => dialog.open")
        title = page.locator("[data-detail-title]").inner_text()
        page.screenshot(path=str(output / f"index-dialog-{name}.png"))
        page.locator("[data-detail-close]").click()
        page.wait_for_timeout(220)
        after = page.evaluate("window.scrollY")

        settings = page.locator("[data-audio-settings]")
        settings.click()
        panel_opened = not page.locator("[data-audio-panel]").evaluate("panel => panel.hidden")
        page.screenshot(path=str(output / f"index-audio-{name}.png"))
        toggle = page.locator("[data-audio-toggle]")
        toggle.click()
        page.wait_for_timeout(250)
        audio_started = toggle.get_attribute("aria-pressed") == "true"
        toggle.click()
        audio_paused = toggle.get_attribute("aria-pressed") == "false"

        scene_videos = page.locator("[data-scene-video]")
        video_attributes_valid = scene_videos.evaluate_all(
            """videos => videos.length === 2 && videos.every(video =>
              video.muted && video.autoplay && video.loop && video.playsInline && Boolean(video.getAttribute('poster'))
            )"""
        )
        video_toggle = page.locator("[data-video-toggle]").first
        video_toggle.scroll_into_view_if_needed()
        page.wait_for_timeout(650)
        video_toggle.click()
        video_paused = video_toggle.get_attribute("data-video-state") == "paused"
        video_toggle.click()
        page.wait_for_timeout(350)
        video_resume_requested = video_toggle.locator("[data-video-toggle-label]").inner_text() == "暂停视频"

        results.append(
            {
                "viewport": name,
                "dialogOpened": opened,
                "dialogTitle": title,
                "scrollBefore": before,
                "scrollAfter": after,
                "scrollRestored": abs(before - after) <= 1,
                "audioPanelOpened": panel_opened,
                "audioStarted": audio_started,
                "audioPaused": audio_paused,
                "videoAttributesValid": video_attributes_valid,
                "videoPaused": video_paused,
                "videoResumeRequested": video_resume_requested,
                "errors": errors,
            }
        )
        page.close()
    browser.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
if not all(
    item["dialogOpened"]
    and item["scrollRestored"]
    and item["audioPanelOpened"]
    and item["audioStarted"]
    and item["audioPaused"]
    and item["videoAttributesValid"]
    and item["videoPaused"]
    and item["videoResumeRequested"]
    and not item["errors"]
    for item in results
):
    raise SystemExit(1)
