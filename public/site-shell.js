'use strict';
(()=>{
 const nav=document.getElementById('main-nav'),toggle=document.querySelector('.shared-header .nav-toggle');
 if(nav&&toggle){
  document.documentElement.classList.add('has-site-navigation');toggle.hidden=false;
  const close=()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));});
  nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  nav.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();toggle.focus();}});
  window.matchMedia('(min-width: 961px)').addEventListener('change',close);
 }
 // Keep footer badges aligned with deployed platform availability, including future Store releases.
 if(!document.querySelector('[data-footer-platform]'))return;
 fetch('/api/config.json').then(response=>response.ok?response.json():null).then(config=>{
  if(!config)return;
  for(const platform of ['linux','windows']){
   const group=document.querySelector(`[data-footer-platform="${platform}"]`);if(!group)continue;
   const host=platform==='linux'?'snapcraft.io':'apps.microsoft.com',name=platform==='linux'?'Linux':'Windows';
   let url;try{url=new URL(config[platform+'DownloadUrl']);}catch{/* Unreleased platform. */}
   const available=!!url&&url.protocol==='https:'&&url.hostname===host&&!url.username&&!url.password;
   const link=group.querySelector('[data-footer-store-link]');link.hidden=!available;
   if(available)link.href=url.href;else link.removeAttribute('href');
   group.querySelector('[data-footer-store-disabled]').hidden=available;
   group.querySelector('[data-footer-store-status]').textContent=name+(available?'':' · Coming soon');
  }
 }).catch(()=>{});
})();
