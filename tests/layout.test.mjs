import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {build,root} from '../scripts/build.mjs';
import {renderHeader,renderFooter} from '../scripts/layout.mjs';

test('All public routes render one shared header/footer with working root anchors and legal links',async()=>{
 await build();
 const visit=async dir=>{for(const item of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory()&&item.name!=='license')await visit(path);else if(item.name.endsWith('.html')){
  const html=await readFile(path,'utf8');
  assert.equal((html.match(/class="site-header shared-header"/g)||[]).length,1,path);
  assert.equal((html.match(/class="site-footer shared-footer"/g)||[]).length,1,path);
  assert.equal((html.match(/id="main-nav"/g)||[]).length,1,path);
  assert.equal((html.match(/id="main"/g)||[]).length,1,path);
  assert.ok(html.includes('href="/#tour"'),path);
  for(const href of ['/privacy/','/health-data-privacy/','/terms/','/support/'])assert.ok(html.includes(`href="${href}"`),path);
  assert.ok(!html.includes('{{SITE_'),path);
  assert.ok(html.includes('href="/site-shell.css"')&&html.includes('src="/site-shell.js"'),path);
 }}};
 await visit(root+'/dist');
});
test('Active navigation is route-aware and Windows is not an active Store badge until available',()=>{
 assert.match(renderHeader('/guide/'),/href="\/guide\/" aria-current="page"/);
 assert.match(renderHeader('/blog/example/'),/href="\/blog\/" aria-current="true"/);
 const missing=renderFooter({windowsDownloadUrl:''});
 assert.match(missing,/data-footer-store-disabled aria-disabled="true" aria-label="Windows release coming soon">/);
 assert.match(missing,/Windows · Coming soon/);
 const live=renderFooter({windowsDownloadUrl:'https://apps.microsoft.com/detail/9P1533FC1864'});
 assert.ok(live.includes('href="https://apps.microsoft.com/detail/9P1533FC1864"'));
 const unsafe=renderFooter({windowsDownloadUrl:'https://apps.microsoft.com.evil.example/app'});
 assert.ok(unsafe.includes('Windows · Coming soon'));
 assert.ok(!unsafe.includes('evil.example'));
});
