import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,access} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildBlog,loadContent,renderMarkdown} from '../scripts/blog.mjs';

async function fixture(t) {
  const root=await mkdtemp(path.join(os.tmpdir(),'sentire-blog-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const dir of ['content/posts','content/authors','content/briefs','public/assets']) await mkdir(path.join(root,dir),{recursive:true});
  const author={id:'test-author',name:'Test Author',role:'Creator',bio:'An author biography.',disclosure:'Creates the product.'};
  const post={slug:'test-story',title:'A hearing history story',description:'A personal account.',excerpt:'A short introduction.',author:author.id,publishedAt:'2026-10-30T09:26:34-04:00',updatedAt:'2026-10-30T09:26:34-04:00',category:'Behind Sentire',image:'/assets/test.png',imageAlt:'Fictional example',imageCaption:'Fictional example records.',imageWidth:1,imageHeight:1,draft:false};
  const save=async (slug,meta,body='A personal story.\n\n## Keeping a history\n\nSome records.')=>{
    await writeFile(path.join(root,'content/posts',slug+'.json'),JSON.stringify(meta));
    await writeFile(path.join(root,'content/posts',slug+'.md'),body);
    await writeFile(path.join(root,'content/briefs',slug+'.md'),'Primary intent and provisional keyword research.');
  };
  await writeFile(path.join(root,'content/authors/test-author.json'),JSON.stringify(author));
  await writeFile(path.join(root,'public/assets/test.png'),'fixture');
  await save(post.slug,post);
  return {root,post,save,dist:path.join(root,'dist')};
}

test('Markdown is readable HTML with stable, unique section IDs and no executable inline HTML',()=>{
  const result=renderMarkdown('## Keeping records\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n## Keeping records');
  assert.deepEqual(result.headings.map(h=>h.id),['keeping-records','keeping-records-2']);
  assert.match(result.html,/<h2 id="keeping-records">/);
  assert.doesNotMatch(result.html,/<script>|href="javascript:/);
  assert.match(result.html,/&lt;script&gt;/);
  assert.throws(()=>renderMarkdown('# A second page title'),/template supplies h1/);
});

test('published posts have canonical pages, author identity, valid schema, RSS and sitemap route metadata',async t=>{
  const f=await fixture(t),origin='https://getsentire.io';
  const routes=await buildBlog({...f,origin});
  assert.deepEqual(routes.map(r=>r.pathname),['/blog/','/blog/test-story/','/blog/authors/test-author/']);
  assert.equal(routes[1].modified,f.post.updatedAt);
  const html=await readFile(path.join(f.dist,'blog/test-story/index.html'),'utf8');
  assert.match(html,/<link rel="canonical" href="https:\/\/getsentire.io\/blog\/test-story\/">/);
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.match(html,/<h2 id="keeping-a-history">/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const article=schema['@graph'].find(s=>s['@type']==='BlogPosting');
  assert.equal(article.author.url,origin+'/blog/authors/test-author/');
  assert.equal(article.datePublished,f.post.publishedAt);
  assert.equal(article.mainEntityOfPage['@id'],origin+'/blog/test-story/');
  const feed=await readFile(path.join(f.dist,'blog/feed.xml'),'utf8');
  assert.match(feed,/<pubDate>Fri, 30 Oct 2026 13:26:34 GMT<\/pubDate>/);
  assert.match(feed,/<guid isPermaLink="true">https:\/\/getsentire.io\/blog\/test-story\/<\/guid>/);
  assert.match(await readFile(path.join(f.dist,'blog/index.html'),'utf8'),/href="\/blog\/test-story\/"/);
});

test('drafts never appear in pages, author listings, RSS or generated routes',async t=>{
  const f=await fixture(t);await f.save('unpublished-story',{...f.post,slug:'unpublished-story',title:'Private draft headline',draft:true});
  const routes=await buildBlog({...f,origin:'https://getsentire.io'});
  assert(!routes.some(r=>r.pathname.includes('unpublished')));
  for(const file of ['blog/index.html','blog/feed.xml','blog/authors/test-author/index.html']) assert.doesNotMatch(await readFile(path.join(f.dist,file),'utf8'),/Private draft headline|unpublished-story/);
  await assert.rejects(access(path.join(f.dist,'blog/unpublished-story/index.html')));
});

test('publication rejects broken identity, dates, unsafe paths and missing keyword briefs',async t=>{
  const f=await fixture(t);
  for(const change of [{author:'missing'},{updatedAt:'2026-10-29T09:26:34-04:00'},{publishedAt:'2026-02-30T09:26:34-04:00'},{image:'/assets/../private.png'},{slug:'../escape'},{draft:'false'}]){
    await f.save('test-story',{...f.post,...change});
    await assert.rejects(loadContent(path.join(f.root,'content')));
  }
  await f.save('test-story',f.post);
  await rm(path.join(f.root,'content/briefs/test-story.md'));
  await assert.rejects(loadContent(path.join(f.root,'content')));
});

test('metadata cannot terminate the inert JSON-LD block or inject page markup',async t=>{
  const f=await fixture(t),title='Story </script><script>alert(1)</script>';
  await f.save('test-story',{...f.post,title});
  await buildBlog({...f,origin:'https://getsentire.io'});
  const html=await readFile(path.join(f.dist,'blog/test-story/index.html'),'utf8');
  assert.doesNotMatch(html,/<script>alert/);
  assert.match(html,/\\u003c\/script\\u003e/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@graph'][0].headline,title);
});
