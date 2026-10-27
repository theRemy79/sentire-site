"""Capture actual Sentire UI in a temporary fictional workspace. No real data is read."""
from pathlib import Path
import base64,json,sys,tempfile,threading,subprocess,time,os
from io import BytesIO
SITE=Path(__file__).resolve().parents[1];APP=SITE.parent/'sentire';sys.path.insert(0,str(APP))
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding,PublicFormat
from werkzeug.serving import make_server
from playwright.sync_api import sync_playwright
from PIL import Image
import licensing
from app import create_app
OUT=SITE/'public/assets/tutorial';OUT.mkdir(parents=True,exist_ok=True)
enc=lambda b:base64.urlsafe_b64encode(b).decode().rstrip('=')
with tempfile.TemporaryDirectory(prefix='sentire-point-click-') as directory:
 tmp=Path(directory);key=Ed25519PrivateKey.generate();config=tmp/'public.json'
 config.write_text(json.dumps(dict(keys={'tutorial':dict(mode='test',public_key=enc(key.public_key().public_bytes(Encoding.Raw,PublicFormat.Raw)))},accepted_modes=['test'],checkout_url='http://127.0.0.1:8860/buy',preview=True)));licensing.CONFIG=config
 app=create_app(tmp/'data');server=make_server('127.0.0.1',0,app);threading.Thread(target=server.serve_forever,daemon=True).start()
 client=app.test_client();headers={'X-CSRF-Token':client.get('/api/state').json['csrf']}
 payload=dict(product='sentire',version=1,edition='personal',term='perpetual',mode='test',key_id='tutorial',license_id='fictional-tutorial-only',issued_at=1792627200)
 body='SENTIRE1.'+enc(json.dumps(payload,separators=(',',':')).encode());token=body+'.'+enc(key.sign(body.encode()))
 assert client.post('/api/license',json={'license':token},headers=headers).status_code==200
 assert client.put('/api/profile',json={'name':'Alex Morgan · fictional example'},headers=headers).status_code==200
 ffmpeg_dir=tmp/'browsers/ffmpeg-1013';ffmpeg_dir.mkdir(parents=True);(ffmpeg_dir/'ffmpeg-linux').symlink_to('/usr/bin/ffmpeg');os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(tmp/'browsers')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=str(next((Path.home()/'.cache/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell'))))
  context=browser.new_context(bypass_csp=True,viewport={'width':1440,'height':1000},record_video_dir=str(tmp/'video'),record_video_size={'width':1440,'height':1000},reduced_motion='reduce')
  page=context.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/#new');page.wait_for_selector('#editable-chart')
  # Use the existing fictional source image; no real patient documents are read.
  image=base64.b64encode((OUT/'fictional-report.webp').read_bytes()).decode()
  page.evaluate("""image=>{sourceImage='data:image/webp;base64,'+image;sourceText='';showSource();document.querySelector('.editor-layout').classList.add('review-layout');document.querySelector('#draft-chart').scrollIntoView({block:'start'});} """,image)
  page.add_style_tag(content='.tutorial-caption{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:9999;background:#123849;color:white;padding:16px 24px;border-radius:8px;font:18px sans-serif;max-width:900px;box-shadow:0 2px 12px #0004} .tutorial-cursor{position:fixed;width:26px;height:26px;border:3px solid #dd8b24;border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%)}')
  page.evaluate("""()=>{const c=document.createElement('div');c.className='tutorial-caption';document.body.append(c);const cursor=document.createElement('div');cursor.className='tutorial-cursor';document.body.append(cursor);document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});} """)
  def caption(text):page.locator('.tutorial-caption').evaluate('(el,t)=>el.textContent=t',text)
  caption('1. Compare the report beside the editable graph. Match the Hz and dB labels.');time.sleep(3)
  page.locator('#plot-ear').select_option('right');page.locator('#plot-kind').select_option('air')
  caption('2. Choose Right ear and Air before plotting. No popup interrupts each click.');page.locator('#plot-kind').scroll_into_view_if_needed();time.sleep(3)
  caption('3. Click the editable graph at 1000 Hz / 30 dB HL to add a point.')
  point=page.locator('#editable-chart').evaluate("""el=>{let p=el.createSVGPoint();p.x=55+3/7*660;p.y=40+50/140*660;const q=p.matrixTransform(el.getScreenCTM());return {x:q.x,y:q.y}}""")
  page.mouse.move(point['x'],point['y'],steps=18);page.mouse.click(point['x'],point['y']);time.sleep(3)
  assert page.evaluate('draft.measurements.length')==1
  assert page.evaluate('draft.measurements[0].kind')=='air'
  caption('4. Click the existing symbol to select its measurement row, without adding a duplicate.')
  page.locator('#editable-chart [data-measurement="0"]').click();time.sleep(3)
  assert page.evaluate('draft.measurements.length')==1
  caption('5. Change Type from Air to Bone in the selected row. The symbol updates immediately.')
  page.get_by_label('Conduction row 1',exact=True).select_option('bone');time.sleep(3)
  assert page.evaluate('draft.measurements[0].kind')=='bone'
  page.locator('#draft-chart').scroll_into_view_if_needed();time.sleep(2)
  page.set_viewport_size({'width':1440,'height':1200});page.locator('.tutorial-caption').evaluate('(el)=>el.hidden=true');page.locator('.tutorial-cursor').evaluate('(el)=>el.hidden=true')
  page.screenshot(path=str(tmp/'point-click.png'));Image.open(tmp/'point-click.png').save(OUT/'point-click.webp','WEBP',quality=88)
  page.set_viewport_size({'width':1440,'height':1000});page.locator('.tutorial-caption').evaluate('(el)=>el.hidden=false');page.locator('.tutorial-cursor').evaluate('(el)=>el.hidden=false')
  # Selecting the bone symbol must not turn it back into the toolbar's Air type.
  page.locator('#editable-chart [data-measurement="0"]').click();assert page.evaluate('draft.measurements[0].kind')=='bone'
  caption('6. Use the row to adjust the exact level. Review every point against the report before saving.')
  page.get_by_label('Threshold row 1',exact=True).fill('25');time.sleep(3)
  assert page.evaluate('draft.measurements[0].db')==25
  video=page.video;context.close();src=video.path();browser.close()
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(src),'-vf','fps=15','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(OUT/'point-click.mp4')],check=True)
 server.shutdown()
print('Recorded point-click walkthrough; adding, selecting and Air/Bone editing verified with fictional data.')
