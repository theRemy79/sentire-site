"""Shared site layout checks; no form submissions or live checkout requests."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts';OUT.mkdir(exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
base=f'http://127.0.0.1:{port}'
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/guide/',timeout=1);break
  except OSError:time.sleep(.1)
 else:raise RuntimeError('Preview did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
  context.route('**/community/token',lambda route:route.fulfill(json={'csrf':'fictional-preview-token','preview':True}))
  page=context.new_page();errors=[];posts=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
  routes=['/','/guide/','/downloads/','/support/','/privacy/','/health-data-privacy/','/terms/','/releases/','/blog/','/blog/why-i-built-sentire/','/blog/authors/jw/']
  # Author identifiers come from content; discover their actual generated route.
  authors=list((ROOT/'dist/blog/authors').glob('*/index.html'))
  if authors:routes[-1]='/blog/authors/'+authors[0].parent.name+'/'
  expectedNav=None;expectedStyles=None
  for path in routes:
   page.goto(base+path,wait_until='networkidle')
   expect(page.locator('.shared-header')).to_have_count(1);expect(page.locator('.shared-footer')).to_have_count(1)
   links=page.locator('#main-nav a').evaluate_all('(els)=>els.map(e=>[e.textContent.trim(),e.getAttribute("href")])')
   if expectedNav is None:expectedNav=links
   assert links==expectedNav,path
   styles=page.locator('.shared-header').evaluate('(e)=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.color,s.backgroundColor,e.getBoundingClientRect().height]}')
   if expectedStyles is None:expectedStyles=styles
   assert styles==expectedStyles,(path,styles,expectedStyles)
   expect(page.locator('[data-footer-platform=windows] [data-footer-store-disabled]')).to_be_visible()
   expect(page.locator('[data-footer-platform=windows] [data-footer-store-link]')).to_be_hidden()
   expect(page.locator('[data-footer-platform=linux] [data-footer-store-link]')).to_have_attribute('href','https://snapcraft.io/sentire')
   for href in ['/privacy/','/health-data-privacy/','/terms/','/support/']:
    assert page.locator(f'.shared-footer a[href="{href}"]').count()==1
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),path
  page.goto(base+'/guide/',wait_until='networkidle');expect(page.locator('#main-nav a[href="/guide/"]')).to_have_attribute('aria-current','page')
  page.locator('.shared-footer').screenshot(path=str(OUT/'shared-footer-desktop.png'))
  # Guide search/sidebar and page-specific start action stay intact.
  page.get_by_role('searchbox',name='Search the Sentire guide').fill('speech')
  assert page.locator('#search-results a').count()>0
  page.locator('#clear-search').click();page.get_by_role('link',name='Start here',exact=False).first.click()
  expect(page.locator('#getting-started')).to_be_visible()
  for width in [320,390,768,960,1024,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   for path in ['/','/guide/','/support/','/blog/','/privacy/']:
    page.goto(base+path,wait_until='networkidle');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(path,width)
    if path in ['/','/guide/','/support/','/privacy/','/blog/']:
     bounds=page.evaluate("() => {const h=document.querySelector('.shared-header .chrome-container').getBoundingClientRect();return [...document.querySelectorAll('.guide-hero,.edition-note,.search-wrap,.guide-layout,.guide-provenance,main.container,main>.container')].map(e=>{const r=e.getBoundingClientRect();return [r.left-h.left,r.right-h.right]})}")
     assert all(abs(left)<1 and abs(right)<1 for left,right in bounds),(width,bounds)
    if width<=960:
     toggle=page.get_by_role('button',name='Toggle navigation');expect(toggle).to_be_visible();expect(page.locator('#main-nav')).to_be_hidden()
     toggle.click();expect(page.locator('#main-nav')).to_be_visible();expect(toggle).to_have_attribute('aria-expanded','true')
     page.locator('#main-nav a').first.focus();page.keyboard.press('Escape');expect(toggle).to_be_focused();expect(page.locator('#main-nav')).to_be_hidden()
    page.locator('.shared-footer').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if width==390:page.locator('.shared-footer').screenshot(path=str(OUT/'shared-footer-mobile.png'))
  plain=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':900}).new_page()
  for path in ['/guide/','/blog/','/privacy/']:
   plain.goto(base+path);expect(plain.locator('#main-nav')).to_be_visible();expect(plain.locator('.shared-footer')).to_be_visible()
   assert plain.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Availability is driven by the deployed config, not only the build snapshot.
  context.route('**/api/config.json',lambda route:route.fulfill(json={'linuxDownloadUrl':'https://snapcraft.io/sentire','windowsDownloadUrl':'https://apps.microsoft.com/detail/9P1533FC1864'}))
  page.goto(base+'/blog/',wait_until='networkidle')
  expect(page.locator('[data-footer-platform=windows] [data-footer-store-link]')).to_be_visible()
  expect(page.locator('[data-footer-platform=windows] [data-footer-store-disabled]')).to_be_hidden()
  assert not errors,errors
  assert not posts,posts
  browser.close()
 print('Shared layout passed: 11 public route types, consistent header styles/links, 6 widths, keyboard menu, guide search, badges, policies and no-JS navigation. No forms submitted.')
finally:server.terminate();server.wait(timeout=10)
