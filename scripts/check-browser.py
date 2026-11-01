"""Check the local marketing preview without touching any hearing records."""
import json
from pathlib import Path
import sys,os,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
server=None
if len(sys.argv)>1:URL=sys.argv[1]
else:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    URL=f'http://127.0.0.1:{port}'
    server=subprocess.Popen(['node','scripts/serve.mjs','--local-preview'],cwd=ROOT,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(100):
        try:urllib.request.urlopen(URL,timeout=1);break
        except OSError:time.sleep(.1)
    else:server.terminate();server.wait();raise RuntimeError('Marketing preview did not start')
ARTIFACTS = ROOT/'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        context=browser.new_context(viewport={'width':1440,'height':1050},device_scale_factor=1)
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('response',lambda response:errors.append(f'HTTP {response.status}: {response.url}') if response.status>=400 else None)
        page.goto(URL,wait_until='networkidle')
        page.locator('[data-purchase]').wait_for()
        assert page.locator('h1').count()==1
        assert page.locator('.nav-toggle').is_hidden()
        assert page.locator('img[src]').evaluate_all('(images)=>images.every(img=>img.loading==="lazy" || img.complete && img.naturalWidth>0)')
        page.screenshot(path=str(ARTIFACTS/'desktop.png'),full_page=True)
        page.screenshot(path=str(ARTIFACTS/'hero.png'))
        for name in ['timeline','compare','detail','overview']:
            page.locator('#tab-'+name).click()
            assert page.locator('#panel-'+name).is_visible()
            assert page.locator('#tab-'+name).get_attribute('aria-selected')=='true'
        page.locator('#tab-overview').focus()
        page.keyboard.press('ArrowRight')
        assert page.locator('#tab-timeline').get_attribute('aria-selected')=='true'
        page.keyboard.press('End')
        assert page.locator('#tab-detail').get_attribute('aria-selected')=='true'
        page.keyboard.press('Home')
        assert page.locator('#tab-overview').get_attribute('aria-selected')=='true'
        trigger=page.locator('.hero-frame [data-zoom]')
        trigger.click()
        assert page.locator('dialog').is_visible()
        page.keyboard.press('Escape')
        assert page.locator('dialog').is_hidden()
        assert trigger.evaluate('(el)=>el===document.activeElement')
        page.locator('#tab-compare').click()
        page.locator('#panel-compare [data-zoom]').click()
        page.get_by_role('button',name='Close screenshot').click()
        page.get_by_text('Is Sentire a hearing test?',exact=False).click()
        assert page.locator('.faq-list details').first.get_attribute('open') is not None
        assert page.locator('[data-purchase]').get_attribute('href').endswith(('/checkout','/buy'))
        for width in [360,390,600,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':900})
            page.goto(URL,wait_until='networkidle')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'Overflow at {width}'
            if width<=960:
                assert page.locator('.nav-toggle').is_visible()
                page.locator('.nav-toggle').click()
                assert page.locator('#main-nav').is_visible()
                page.locator('#main-nav a[href="/#tour"]').click()
                assert page.locator('#main-nav').is_hidden()
            if width==390:
                page.evaluate('scrollTo(0,0)')
                page.screenshot(path=str(ARTIFACTS/'mobile.png'),full_page=True)
                page.screenshot(path=str(ARTIFACTS/'mobile-hero.png'))
        assert not errors,errors
        nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':900})
        basic=nojs.new_page()
        basic.goto(URL)
        assert basic.locator('#hero-title').is_visible()
        assert basic.locator('#main-nav').is_visible()
        assert basic.locator('[data-purchase]').is_visible()
        assert basic.evaluate('document.documentElement.scrollWidth<=innerWidth')
        nojs.close()
        context.close()
        browser.close()
finally:
    if server:server.terminate();server.wait(timeout=10)
print('Passed: desktop/mobile layouts, real image loading, keyboard tabs, screenshot zoom/focus, FAQ, checkout configuration, and no-JavaScript fallback.')
