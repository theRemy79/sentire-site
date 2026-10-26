import test from 'node:test';
import assert from 'node:assert/strict';
import {configuration} from '../src/config.mjs';
const empty = {origin:'',checkoutUrl:'',linuxDownloadUrl:'',windowsDownloadUrl:''};
test('published defaults contain no localhost checkout or invented releases',()=>{
  const config=configuration(empty);
  assert.equal(config.checkoutMode,'upcoming');
  assert.equal(config.checkoutUrl,'');
  assert.equal(config.linuxDownloadUrl,'');
  assert.equal(config.windowsDownloadUrl,'');
});
test('test purchase route is explicitly enabled only for local preview',()=>{
  assert.equal(configuration({...empty},{local:true}).checkoutUrl,'/checkout');
  assert.equal(configuration({...empty},{local:true}).checkoutMode,'local-test');
});
test('live checkout needs a canonical HTTPS origin and a safe checkout URL',()=>{
  assert.throws(()=>configuration({...empty,checkoutUrl:'https://checkout.example.com/buy'}));
  for(const checkoutUrl of ['http://checkout.example.com/buy','javascript:alert(1)','https://user:secret@example.com/buy','https://localhost/buy','https://example.com/buy?key=secret']) {
    assert.throws(()=>configuration({...empty,origin:'https://sentire.example',checkoutUrl}));
  }
  assert.equal(configuration({...empty,origin:'https://sentire.example',checkoutUrl:'https://checkout.example.com/buy'}).checkoutMode,'live');
});
test('public downloads reject unsafe schemes and embedded credentials',()=>{
  assert.throws(()=>configuration({...empty,linuxDownloadUrl:'file:///tmp/app'}));
  assert.throws(()=>configuration({...empty,windowsDownloadUrl:'https://user:secret@example.com/app'}));
});

test('introductory price is 14.95 and local checkout is active',()=>{
  const config=configuration(empty,{local:true});
  assert.equal(config.checkoutUrl,'/checkout');assert.equal(config.checkoutMode,'local-test');assert.equal(config.price,14.95);
});
