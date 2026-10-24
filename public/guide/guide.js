'use strict';
const search=document.querySelector('#guide-search');
const clear=document.querySelector('#clear-search');
const results=document.querySelector('#search-results');
const status=document.querySelector('#search-status');
const chapters=[...document.querySelectorAll('.chapter')];
const videos=document.querySelector('#walkthroughs');
const closeNote=document.querySelector('.guide-close');
const normalize=value=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—−]/g,'-').replace(/[^a-z0-9%]+/g,' ').trim();
const index=[...chapters,videos].map(section=>({section,id:section.id,title:section.querySelector('h2').innerText.replace(/\s+/g,' ').trim(),body:section.textContent.replace(/\s+/g,' ').trim(),keywords:normalize(section.dataset.keywords||''),text:normalize(section.textContent)}));
const aliases={licence:'license',abg:'air bone gap',wrs:'word recognition',upload:'import',dbhl:'db hl',nr:'no response'};
function termsFor(value){return normalize(value).split(/\s+/).filter(Boolean).flatMap(term=>(aliases[term]||term).split(' '));}
function matches(entry,terms){return terms.every(term=>entry.text.includes(term)||entry.keywords.includes(term));}
function snippet(entry,terms){
 const lower=entry.body.toLowerCase();const at=terms.map(t=>lower.indexOf(t)).filter(i=>i>=0).sort((a,b)=>a-b)[0]??0;
 const start=Math.max(0,at-45),end=Math.min(entry.body.length,start+180);
 return (start?'…':'')+entry.body.slice(start,end)+(end<entry.body.length?'…':'');
}
function updateSearch({writeURL=true}={}){
 const query=search.value.trim(),terms=termsFor(query);
 clear.hidden=!query;
 const found=terms.length?index.filter(entry=>matches(entry,terms)):index;
 for(const entry of index){entry.section.hidden=terms.length>0&&!found.includes(entry);entry.section.classList.toggle('search-match',terms.length>0&&found.includes(entry));}
 results.replaceChildren();results.hidden=!terms.length||!found.length;
 for(const entry of found){
  if(!terms.length)break;
  const link=document.createElement('a');link.className='search-result';link.href='#'+entry.id;
  const strong=document.createElement('strong');strong.textContent=entry.title;
  const p=document.createElement('p');p.textContent=snippet(entry,terms);link.append(strong,p);
  link.addEventListener('click',()=>{entry.section.querySelectorAll('details').forEach(d=>d.open=true);});
  results.append(link);
 }
 document.querySelector('#search-empty').hidden=!terms.length||found.length>0;
 closeNote.hidden=!!terms.length;
 status.textContent=terms.length?`${found.length} ${found.length===1?'section':'sections'} found for “${query}”. Choose a result or read the matching chapters below.`:'Search instructions, options, and troubleshooting. Everything stays on this page.';
 if(writeURL){const url=new URL(location.href);if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');history.replaceState(null,'',url.pathname+url.search+url.hash);}
}
search.addEventListener('input',()=>updateSearch());
document.querySelector('.search-form').addEventListener('submit',event=>{event.preventDefault();results.querySelector('a')?.focus();});
function resetSearch(focus=true){search.value='';updateSearch();if(focus)search.focus();}
clear.addEventListener('click',()=>resetSearch());
document.querySelectorAll('[data-reset-search]').forEach(button=>button.addEventListener('click',()=>resetSearch()));
document.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search.focus();search.select();}
 if(event.key==='Escape'&&document.activeElement===search){resetSearch();}
});
// Chapter links always reveal their target, including while search filters are active.
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
 const id=link.getAttribute('href').slice(1),target=document.getElementById(id);
 if(target&&search.value.trim())resetSearch(false);
}));
const tocButton=document.querySelector('.contents-toggle'),toc=document.querySelector('#chapter-nav');
const narrow=window.matchMedia('(max-width:800px)');
function fitContents(){toc.hidden=narrow.matches;tocButton.setAttribute('aria-expanded',String(!narrow.matches));}
fitContents();narrow.addEventListener('change',fitContents);
tocButton.addEventListener('click',()=>{const expanded=tocButton.getAttribute('aria-expanded')==='true';tocButton.setAttribute('aria-expanded',String(!expanded));toc.hidden=expanded;});
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{
  const visible=entries.filter(entry=>entry.isIntersecting&&!entry.target.hidden).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
  if(!visible.length)return;
  const id=visible[0].target.id;
  document.querySelectorAll('#chapter-nav>a').forEach(a=>{if(a.hash==='#'+id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
 },{rootMargin:'-110px 0px -60% 0px',threshold:0});chapters.forEach(chapter=>observer.observe(chapter));
}
const lightbox=document.querySelector('#guide-lightbox');let trigger;
document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
 trigger=button;
 document.querySelector('#lightbox-image').src=button.dataset.zoom;
 document.querySelector('#lightbox-image').alt=button.querySelector('img').alt;
 document.querySelector('#lightbox-caption').textContent=button.dataset.caption;
 lightbox.showModal();document.body.classList.add('dialog-open');document.querySelector('#close-lightbox').focus();
}));
document.querySelector('#close-lightbox').addEventListener('click',()=>lightbox.close());
lightbox.addEventListener('click',event=>{const b=lightbox.getBoundingClientRect();if(event.target===lightbox&&(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom))lightbox.close();});
lightbox.addEventListener('close',()=>{document.body.classList.remove('dialog-open');trigger?.focus();});
// Avoid overlapping silent demonstrations. Videos never start automatically.
document.querySelectorAll('video').forEach(video=>video.addEventListener('play',()=>document.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause();})));
search.value=new URL(location.href).searchParams.get('q')||'';updateSearch({writeURL:false});
// A shared chapter link takes priority over a stale query that would hide it.
if(location.hash&&document.getElementById(location.hash.slice(1))?.hidden)resetSearch(false);
