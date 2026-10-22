"""Render the code-native social card against the running local marketing preview."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1200,'height':630},device_scale_factor=1)
    # A fresh about:blank document keeps this trusted design fixture separate from
    # the published site's intentionally strict no-inline-style CSP.
    html=(ROOT/'scripts/social-card.html').read_text().replace('<head>','<head><base href="http://127.0.0.1:8791/">',1)
    page.set_content(html,wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    assert page.locator('img').evaluate_all('(images)=>images.every(img=>img.complete && img.naturalWidth>0)')
    assert page.locator('h1').evaluate('(el)=>getComputedStyle(el).fontSize')=='70px'
    page.screenshot(path=str(ROOT/'public/assets/social-card.png'))
    browser.close()
print('Rendered 1200 × 630 social card.')
