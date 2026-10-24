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
from tests.synthetic_report import make_report
OUT=SITE/'public/assets/tutorial';OUT.mkdir(parents=True,exist_ok=True)
enc=lambda b:base64.urlsafe_b64encode(b).decode().rstrip('=')
def fixtures():
 records=[]
 for dt,title,offset in [('2026-02-10','Reference appointment',0),('2026-06-16','Follow-up appointment',5),('2026-09-22','Latest hearing review',10)]:
  measurements=[];speech={}
  for ear,extra in [('right',0),('left',10)]:
   for f,v in zip([250,500,1000,2000,4000,8000],[15,20,25,35,45,50]):
    measurements.append(dict(ear=ear,kind='air',frequency=f,db=v+extra+offset,masked=False,no_response=False))
    if f<=4000:measurements.append(dict(ear=ear,kind='bone',frequency=f,db=v+extra+offset-10,masked=True,no_response=False))
   speech[ear]=dict(wrs=92 if ear=='right' else 88,presentation_db=65 if ear=='right' else 70,material='Fictional recorded word list · quiet · unaided',points=[dict(level=40+extra,score=50),dict(level=65+extra,score=92 if ear=='right' else 88)])
  gaps=[dict(ear=e,frequency=f,db=d) for e,ds in [('right',[10,15,10,5]),('left',[5,10,5,-5])] for f,d in zip([250,500,1000,2000],ds)]
  records.append(dict(date=dt,title=title,provider='Example Hearing Centre',conditions='Fictional clinic booth · inserts · unaided',notes='Entirely fictional tutorial example. Not a real patient or diagnosis.',measurements=measurements,speech=speech,reported_gaps=gaps,source='Fictional tutorial',reviewed=True))
 return records
with tempfile.TemporaryDirectory(prefix='sentire-tutorial-') as directory:
 tmp=Path(directory);key=Ed25519PrivateKey.generate();config=tmp/'public.json'
 config.write_text(json.dumps(dict(keys={'tutorial':dict(mode='test',public_key=enc(key.public_key().public_bytes(Encoding.Raw,PublicFormat.Raw)))},accepted_modes=['test'],checkout_url='http://127.0.0.1:8860/buy',preview=True)));licensing.CONFIG=config
 app=create_app(tmp/'data');server=make_server('127.0.0.1',8894,app);threading.Thread(target=server.serve_forever,daemon=True).start()
 client=app.test_client();headers={'X-CSRF-Token':client.get('/api/state').json['csrf']}
 ffmpeg_dir=tmp/'browsers/ffmpeg-1013';ffmpeg_dir.mkdir(parents=True);(ffmpeg_dir/'ffmpeg-linux').symlink_to('/usr/bin/ffmpeg');os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(tmp/'browsers')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=str(next((Path.home()/'.cache/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell'))))
  def context(record=None):
   opts=dict(viewport={'width':1280,'height':900},device_scale_factor=1,reduced_motion='reduce')
   if record:opts.update(record_video_dir=str(tmp/record),record_video_size={'width':1280,'height':900})
   c=browser.new_context(**opts);p=c.new_page();p.goto('http://127.0.0.1:8894');p.wait_for_selector('#main h1');return c,p
  def snap(page,name,locator=None):
   time.sleep(.4);path=tmp/(name+'.png')
   if locator:locator.screenshot(path=str(path))
   else:page.screenshot(path=str(path),full_page=False)
   Image.open(path).save(OUT/(name+'.webp'),'WEBP',quality=86,method=6)
  c,p=context();snap(p,'activation');c.close()
  payload=dict(product='sentire',version=1,edition='personal',term='perpetual',mode='test',key_id='tutorial',license_id='fictional-tutorial-only',issued_at=1792627200)
  body='SENTIRE1.'+enc(json.dumps(payload,separators=(',',':')).encode());token=body+'.'+enc(key.sign(body.encode()))
  assert client.post('/api/license',json={'license':token},headers=headers).status_code==200
  assert client.put('/api/profile',json={'name':'Alex Morgan · fictional example','notes':'Tutorial fixture; no real personal or medical information.'},headers=headers).status_code==200
  for r in fixtures():
   response=client.post('/api/records',json=r,headers=headers);assert response.status_code==201,response.json
  c,p=context();snap(p,'overview')
  p.goto('http://127.0.0.1:8894/#timeline');p.wait_for_selector('#history-chart svg');snap(p,'timeline')
  p.goto('http://127.0.0.1:8894/#compare');p.wait_for_selector('#comparison-chart svg');snap(p,'comparison')
  latest=client.get('/api/state').json['records'][0]['id'];p.goto('http://127.0.0.1:8894/#edit/'+latest);p.wait_for_selector('#record-form');snap(p,'editor')
  snap(p,'speech',p.locator('section.panel').filter(has=p.get_by_role('heading',name='Speech intelligibility points',exact=True)))
  snap(p,'reported-gap',p.locator('section.panel').filter(has=p.get_by_role('heading',name='Reported air–bone gap',exact=True)))
  p.goto('http://127.0.0.1:8894/');p.goto('http://127.0.0.1:8894/#backup');p.wait_for_selector('#backup-file')
  backup=tmp/'fictional-backup.json';backup.write_bytes(client.get('/api/export').data);p.locator('#backup-file').set_input_files(str(backup));p.wait_for_selector('#restore-confirm');snap(p,'backup');c.close()
  pdf,png,_=make_report();source=tmp/'fictional-report.pdf';source.write_bytes(pdf);Image.open(BytesIO(png)).resize((928,1200)).save(OUT/'fictional-report.webp','WEBP',quality=90)
  def finish(c,p,name):
   video=p.video;c.close();src=video.path();target=OUT/(name+'.mp4')
   subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(src),'-vf','fps=15','-c:v','libx264','-preset','slow','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(target)],check=True)
   subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','1','-i',str(target),'-frames:v','1',str(OUT/(name+'-poster.webp'))],check=True)
  c,p=context('manual');p.locator('[data-nav=new]').click();p.wait_for_selector('#record-form');time.sleep(2)
  p.locator('input[name=title]').fill('Manual example · fictional');p.locator('input[name=provider]').fill('Example Hearing Centre');time.sleep(2)
  p.locator('#add-measurement').click();p.get_by_label('Threshold row 1',exact=True).fill('25');time.sleep(2);p.locator('#measurement-editor').scroll_into_view_if_needed();time.sleep(3)
  p.locator('[name=reviewed]').check();p.locator('#save-record').click();p.wait_for_selector('.stats');time.sleep(3);finish(c,p,'manual-entry')
  c,p=context('import');p.locator('[data-nav=new]').click();p.wait_for_selector('#record-form');time.sleep(2);p.locator('#report-file').set_input_files(str(source));p.wait_for_selector('#confirm-import',timeout=120000);time.sleep(3);snap(p,'import-review')
  p.locator('#confirm-import').click();time.sleep(2);p.locator('input[name=date]').fill('2026-10-01');p.locator('input[name=title]').fill('Imported fictional report');time.sleep(2);p.locator('#speech-points-right').scroll_into_view_if_needed();time.sleep(3);finish(c,p,'import-review')
  c,p=context('compare');p.locator('[data-nav=compare]').click();p.wait_for_selector('#comparison-chart svg');time.sleep(3);p.locator('#compare-ear').select_option('right');time.sleep(2);p.locator('#comparison-details').scroll_into_view_if_needed();time.sleep(2)
  with p.expect_download() as dl:p.get_by_role('link',name='Export selected tests as PDF').click()
  assert dl.value.suggested_filename.endswith('.pdf');time.sleep(2);p.locator('[data-nav=backup]').click();p.wait_for_selector('#backup-file');time.sleep(2)
  with p.expect_download() as dl:p.get_by_role('link',name='↓ SQLite database backup').click()
  downloaded=tmp/'recording-backup.sqlite3';dl.value.save_as(str(downloaded));time.sleep(2);p.locator('#backup-file').set_input_files(str(downloaded));p.wait_for_selector('#restore-confirm');time.sleep(3);finish(c,p,'compare-backup');browser.close()
 server.shutdown()
print('Captured fictional screenshots and three actual UI videos.')
