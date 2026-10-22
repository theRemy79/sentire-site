"""Capture real Sentire screens and a report using isolated, entirely fictional data."""
from io import BytesIO
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import threading

SITE = Path(__file__).resolve().parents[1]
APP = SITE.parent / 'sentire'
sys.path.insert(0, str(APP))
from app import create_app
from PIL import Image
from playwright.sync_api import sync_playwright
from waitress import create_server

assets = SITE / 'public/assets'
assets.mkdir(parents=True, exist_ok=True)
with TemporaryDirectory(prefix='sentire-marketing-') as temporary:
    application = create_app(Path(temporary) / 'data')
    client = application.test_client()
    state = client.get('/api/state').json
    headers = {'X-CSRF-Token': state['csrf']}
    visits = [
        ('2024-03-14', 'A starting point', [10,15,15,20,25,30,40], [15,20,20,25,30,35,45]),
        ('2024-09-19', 'Autumn follow-up', [15,15,20,20,30,35,45], [20,20,25,30,35,40,50]),
        ('2025-04-08', 'Annual review', [10,15,20,25,30,40,45], [15,20,25,30,35,45,50]),
        ('2025-10-16', 'A little more detail', [15,20,20,25,35,40,50], [20,25,25,30,40,45,55]),
        ('2026-04-09', 'Spring check-in', [10,15,20,25,30,40,45], [15,20,25,30,35,45,50]),
        ('2026-09-22', 'Latest hearing review', [15,20,20,25,30,40,50], [20,25,25,30,40,45,55]),
    ]
    records = []
    for day, title, right, left in visits:
        measurements = []
        speech = {}
        for ear, values in [('right', right), ('left', left)]:
            for frequency, value in zip([250,500,1000,2000,3000,4000,8000], values):
                measurements.append({'ear':ear, 'kind':'air', 'frequency':frequency, 'db':value,
                                     'masked':False, 'no_response':False})
            speech[ear] = {'srt': 20 if ear == 'right' else 25, 'wrs': 96 if ear == 'right' else 92,
                'presentation_db':65, 'material':'Fictional recorded word list',
                'points':[{'level':30,'score':24},{'level':45,'score':64},{'level':65,'score':96 if ear == 'right' else 92}]}
        records.append({'date':day,'title':title,'provider':'Example Hearing Centre',
                        'conditions':'Fictional clinic booth · inserts · unaided',
                        'notes':'Fictional sample for the Sentire product tour. Not a real person or clinical recommendation.',
                        'measurements':measurements,'speech':speech,'source':'Fictional sample','reviewed':True})
    payload = {'format':'sentire','version':1,'profile':{'name':'Alex Morgan · Sample','notes':'Fictional demonstration workspace.'},'records':records}
    restored = client.post('/api/restore', data={'file':(BytesIO(json.dumps(payload).encode()),'sample.json'),'confirm':'replace'},headers=headers)
    assert restored.status_code == 200, restored.json
    state = client.get('/api/state').json
    report = Path(temporary) / 'sample.pdf'
    report.write_bytes(client.get('/api/report?ids=' + state['records'][0]['id']).data)
    subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1400','-png',str(report),str(Path(temporary)/'report')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    Image.open(Path(temporary)/'report.png').convert('RGB').save(assets/'report.webp',quality=90)
    server = create_server(application,host='127.0.0.1',port=0,threads=4)
    threading.Thread(target=server.run,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1.5)
            for name, route, selector in [
                ('overview','#overview','.hearing-history svg'),
                ('timeline','#timeline','table'),
                ('compare','#compare','#comparison-chart svg'),
                ('detail','#record/'+state['records'][0]['id'],'.chart-wrap svg'),
            ]:
                page.goto(f'http://127.0.0.1:{server.effective_port}/'+route)
                page.wait_for_selector(selector)
                page.evaluate('document.fonts.ready')
                page.screenshot(path=str(Path(temporary)/(name+'.png')))
                image = Image.open(Path(temporary)/(name+'.png')).convert('RGB')
                image.save(assets/(name+'.webp'),quality=88)
                image.resize((1080,788)).save(assets/(name+'-small.webp'),quality=85)
            browser.close()
    finally:
        server.close()
(assets/'SCREENSHOTS.md').write_text('''# Screenshot provenance

Captured from the real Sentire 0.2.0 UI using scripts/capture-app.py and a temporary
database. Alex Morgan, Example Hearing Centre, dates, notes and measurements are
entirely fictional. No existing browser, demo or native workspace was opened.
The report image is the first page of an actual PDF generated from the same fixture.
Screenshots are not AI-generated product mockups.
''')
print('Captured overview, timeline, comparisons, record detail and PDF report from isolated fictional data.')
