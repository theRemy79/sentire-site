"""Local-only integration checks with disposable submissions and private mail previews."""
from pathlib import Path
import os
import socket
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from playwright.sync_api import sync_playwright, expect
from werkzeug.serving import make_server

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'sentire'))
from commerce.server import create_app

def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));return sock.getsockname()[1]

with tempfile.TemporaryDirectory(prefix='sentire-beta-check-') as tmp:
    directory=Path(tmp)
    key=Ed25519PrivateKey.generate()
    (directory/'test-signing.key').write_bytes(key.private_bytes(serialization.Encoding.Raw,serialization.PrivateFormat.Raw,serialization.NoEncryption()))
    os.environ['SENTIRE_MAIL_MODE']='preview'
    os.environ.pop('SENTIRE_BETA_NOTIFY_TO',None);os.environ.pop('SENTIRE_SUPPORT_NOTIFY_TO',None)
    app=create_app(directory)
    upstream=make_server('127.0.0.1',0,app);thread=threading.Thread(target=upstream.serve_forever,daemon=True);thread.start()
    port=free_port();base=f'http://127.0.0.1:{port}'
    process=subprocess.Popen(['node','scripts/serve.mjs','--local-preview'],cwd=ROOT,env={**os.environ,'PORT':str(port),'SENTIRE_LOCAL_COMMERCE_PORT':str(upstream.server_port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:urllib.request.urlopen(base+'/beta/',timeout=1);break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('Preview did not start')
        with sync_playwright() as p:
            executable=next((Path.home()/'.cache/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell'))
            browser=p.chromium.launch(executable_path=str(executable));page=browser.new_page(viewport={'width':1440,'height':1000})
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            for route in ['/', '/downloads/','/support/','/privacy/','/terms/']:
                response=page.goto(base+route);assert response.status==200
                assert page.locator('.beta-badge').count()==0
                for width in [360,390,600,768,1024,1440]:
                    page.set_viewport_size({'width':width,'height':1000})
                    page.wait_for_function('() => document.documentElement.scrollWidth<=innerWidth',timeout=3000)
                    assert page.evaluate('() => document.documentElement.scrollWidth<=innerWidth'),(route,width)
            page.goto(base+'/downloads/')
            assert page.locator('form').count()==0
            assert page.get_by_role('link',name='Download Sentire for Linux').is_hidden()
            assert page.get_by_role('link',name='Download Sentire for Windows').is_hidden()
            page.goto(base+'/')
            expect(page.locator('[data-purchase]')).to_have_attribute('href','/checkout')
            expect(page.locator('[data-purchase]')).to_contain_text('$14.95')
            page.goto(base+'/support/')
            expect(page.locator('button[type=submit]')).to_be_enabled()
            page.get_by_label('Email address').fill('fictional-feedback@example.com')
            page.get_by_label('Your platform').select_option('windows')
            page.get_by_label('What is this about?').select_option('bug')
            page.get_by_label('App version').fill('0.2.0 Beta')
            page.locator('[name=message]').fill('Fictional reproduction steps. <script>throw Error("injected")</script>')
            page.locator('[name=consent]').check();page.get_by_role('button',name='Send feedback').click()
            expect(page.locator('.form-status')).to_contain_text('feedback is saved')
            assert len(list((directory/'mail-preview').glob('*.eml')))==1
            with sqlite3.connect(directory/'orders.sqlite3') as c:
                assert c.execute('SELECT COUNT(*) FROM community_messages').fetchone()[0]==1
                assert c.execute('SELECT COUNT(*) FROM orders').fetchone()[0]==0
            artifacts=ROOT/'artifacts';artifacts.mkdir(exist_ok=True)
            page.goto(base+'/downloads/');page.screenshot(path=str(artifacts/'launch-desktop.png'),full_page=True)
            page.set_viewport_size({'width':390,'height':900});page.screenshot(path=str(artifacts/'launch-mobile.png'),full_page=True)
            # A service outage must never pretend to save a submission.
            upstream.shutdown();page.goto(base+'/support/')
            expect(page.locator('.form-status')).to_contain_text('not open right now')
            assert page.get_by_role('button',name='Send feedback').is_disabled()
            nojs=browser.new_context(java_script_enabled=False)
            basic=nojs.new_page();basic.goto(base+'/support/')
            assert basic.get_by_role('link',name='support@getsentire.io',exact=True).count()==2
            assert basic.locator('noscript').is_visible();nojs.close()
            from app import create_app as create_local_app
            local_app=make_server('127.0.0.1',0,create_local_app(directory/'app'))
            app_thread=threading.Thread(target=local_app.serve_forever,daemon=True);app_thread.start()
            try:
                page.set_viewport_size({'width':800,'height':600})
                page.goto(f'http://127.0.0.1:{local_app.server_port}')
                expect(page.locator('#main h1')).to_be_visible()
                assert 'Beta' not in page.title()
                assert page.locator('.beta-badge').count()==0
                assert page.locator('[data-nav=license]').is_visible()
                assert page.locator('#license-form').is_visible()
                assert page.locator('#buy-sentire').is_visible()
                assert '$14.95' in page.locator('#main').inner_text()
                page.get_by_role('link',name='Send feedback').scroll_into_view_if_needed()
                assert page.get_by_role('link',name='Send feedback').is_visible()
                page.screenshot(path=str(artifacts/'launch-app.png'),full_page=True)
            finally:
                local_app.shutdown();local_app.server_close()
            assert not errors,errors
            browser.close()
        print('Launch/support passed: routes, responsive layout, consent, CSRF proxy, license-gated onboarding and $14.95 checkout, durable feedback, private previews, no license issuance and honest service-outage state.')
    finally:
        process.terminate();process.wait(timeout=10)
        upstream.server_close()
