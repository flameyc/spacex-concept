from pathlib import Path
from urllib.parse import quote
import json

from playwright.sync_api import sync_playwright


site = Path(__file__).resolve().parent / "site"
pages = ["index.html", "vehicles.html", "missions.html", "company.html"]
results = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for filename in pages:
        context = browser.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
        page = context.new_page()
        url = "file:///" + quote((site / filename).as_posix(), safe="/:()")
        page.goto(url, wait_until="load")
        page.wait_for_timeout(250)
        results.append(
            {
                "page": filename,
                "revealsVisible": page.evaluate(
                    "() => [...document.querySelectorAll('.reveal')].every(e => getComputedStyle(e).opacity !== '0')"
                ),
                "overflow": page.evaluate(
                    "document.documentElement.scrollWidth - document.documentElement.clientWidth"
                ),
                "textLength": len(page.locator("body").inner_text()),
            }
        )
        context.close()
    browser.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
if not all(item["revealsVisible"] and item["overflow"] <= 1 and item["textLength"] > 500 for item in results):
    raise SystemExit(1)
