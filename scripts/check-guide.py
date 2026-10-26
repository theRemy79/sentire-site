"""Exercise tutorial search, media, routes and responsive layouts with no user data."""
from pathlib import Path
import json
import os
import socket
import subprocess
import time
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=ROOT/'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
process=subprocess.Popen(['node','scripts/serve.mjs','--local-preview'],cwd=ROOT,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
base=f'http://127.0.0.1:{port}'
try:
    for _ in range(100):
        try:
            with urllib.request.urlopen(base+'/guide/',timeout=1) as response:
                assert response.status==200
            break
        except (OSError,urllib.error.URLError):time.sleep(.1)
    else:raise RuntimeError('Guide preview did not start')
    # Video seeking requires byte ranges and the correct MIME type.
    url=base+'/assets/tutorial/manual-entry.mp4'
    request=urllib.request.Request(url,headers={'Range':'bytes=0-99'})
    with urllib.request.urlopen(request) as response:
        assert response.status==206
        assert response.headers['Content-Type']=='video/mp4'
        assert len(response.read())==100
    request=urllib.request.Request(url,headers={'Range':'bytes=999999999-'})
    try:urllib.request.urlopen(request)
    except urllib.error.HTTPError as error:assert error.code==416
    else:raise AssertionError('Invalid media range was accepted')
    with urllib.request.urlopen(base+'/assets/tutorial/manual-entry.vtt') as response:
        assert response.headers['Content-Type'].startswith('text/vtt')
        assert response.read().startswith(b'WEBVTT')
    with sync_playwright() as p:
        browser=p.chromium.launch()
        context=browser.new_context(viewport={'width':1440,'height':1050},device_scale_factor=1)
        page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.status>=400 else None)
        page.goto(base+'/guide/',wait_until='networkidle')
        assert page.locator('.chapter').count()==18
        assert page.locator('video').count()==3
        # Every fragment and locally referenced image/media asset resolves.
        missing=page.evaluate("""() => [...document.querySelectorAll('a[href^="#"]')].map(a=>a.hash.slice(1)).filter(id=>id&&!document.getElementById(id))""")
        assert not missing,missing
        assets=page.evaluate("""() => [...new Set([...document.querySelectorAll('img,source,track')].map(e=>e.getAttribute('src')).filter(Boolean))]""")
        for asset in assets:
            with urllib.request.urlopen(base+asset) as response:assert response.status==200,asset
        assert page.locator('img').first.evaluate('(img)=>img.complete && img.naturalWidth>0')
        page.screenshot(path=str(ARTIFACTS/'guide-desktop.png'))
        search=page.get_by_role('searchbox',name='Search the Sentire guide')
        search.fill('air bone gap')
        assert page.locator('#air-bone-gap').is_visible()
        assert page.locator('#getting-started').is_hidden()
        assert page.locator('#search-results a').count()>0
        assert 'q=' in page.url
        page.locator('#search-results a[href="#air-bone-gap"]').click()
        assert page.url.endswith('#air-bone-gap')
        page.locator('#clear-search').click()
        assert page.locator('.chapter:visible').count()==18
        search.fill('licence')
        assert page.locator('#getting-started').is_visible()
        search.fill('zzzz-no-matching-topic')
        assert page.locator('#search-empty').is_visible()
        page.get_by_role('button',name='Show the whole guide').click()
        assert page.locator('.chapter:visible').count()==18
        page.keyboard.press('Control+k')
        assert search.evaluate('(e)=>e===document.activeElement')
        search.fill('word recognition')
        page.keyboard.press('Escape')
        assert search.input_value()==''
        page.locator('.hero-image').click()
        assert page.locator('#guide-lightbox').is_visible()
        page.keyboard.press('Escape')
        assert page.locator('#guide-lightbox').is_hidden()
        assert page.locator('.hero-image').evaluate('(e)=>e===document.activeElement')
        for video in page.locator('video').all():
            video.evaluate('(v)=>v.load()')
            video.wait_for(state='attached')
            page.wait_for_function('(v)=>v.readyState>=1',arg=video.element_handle())
            assert video.evaluate('(v)=>v.duration>5 && v.videoWidth>0')
            assert video.locator('track').get_attribute('kind')=='captions'
        # A real play/pause check, including caption resource loading.
        page.locator('video').first.evaluate('(v)=>v.play()')
        page.wait_for_timeout(500)
        assert page.locator('video').first.evaluate('(v)=>v.currentTime>0')
        page.locator('video').first.evaluate('(v)=>v.pause()')
        page.goto(base+'/guide/?q=restore',wait_until='networkidle')
        assert page.locator('#backup-restore').is_visible()
        assert page.locator('#getting-started').is_hidden()
        page.locator('#chapter-nav a[href="#getting-started"]').click()
        assert page.locator('#getting-started').is_visible()
        for width in (390,768,1440):
            page.set_viewport_size({'width':width,'height':1000})
            page.goto(base+'/',wait_until='networkidle')
            assert page.get_by_role('link',name='Field guide',include_hidden=True).count()==1
            if width==390:
                page.get_by_role('button',name='Toggle navigation').click()
                assert page.get_by_role('link',name='Field guide').is_visible()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('homepage',width)
            page.goto(base+'/guide/',wait_until='networkidle')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            page.locator('#speech-scores').scroll_into_view_if_needed()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            page.locator('#walkthroughs').scroll_into_view_if_needed()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            if width==390:
                assert page.locator('#chapter-nav').is_hidden()
                page.get_by_role('button',name='In this guide').click()
                assert page.locator('#chapter-nav').is_visible()
                page.goto(base+'/guide/',wait_until='networkidle')
                page.screenshot(path=str(ARTIFACTS/'guide-mobile.png'))
        nojs=browser.new_context(java_script_enabled=False,viewport={'width':1280,'height':900})
        basic=nojs.new_page();basic.goto(base+'/guide/')
        assert basic.locator('.chapter:visible').count()==18
        assert basic.locator('noscript').is_visible()
        assert basic.locator('video').count()==3
        nojs.close()
        assert not errors,errors
        browser.close()
    print('Guide passed: 18 chapters, search/aliases/shared queries, chapter links, zoom/focus, three playable captioned videos, byte-range serving, desktop/mobile layouts and no-JavaScript fallback.')
finally:
    process.terminate()
    try:process.wait(timeout=5)
    except subprocess.TimeoutExpired:process.kill();process.wait()
