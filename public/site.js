'use strict';
document.documentElement.classList.add('js');
const nav = document.querySelector('#main-nav');
const toggle = document.querySelector('.nav-toggle');
toggle.hidden = false;
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open',open);
});
nav.addEventListener('click',event => {
  if (event.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }
});
nav.addEventListener('keydown',event => {if (event.key === 'Escape') {nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.focus();}});
const tabs = [...document.querySelectorAll('[data-tab]')];
document.querySelector('.tour-tabs').hidden = false;
function selectTab(tab,focus=false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected',String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}
for (const [index,tab] of tabs.entries()) {
  tab.addEventListener('click',() => selectTab(tab));
  tab.addEventListener('keydown',event => {
    const next = {'ArrowRight':(index+1)%tabs.length,'ArrowLeft':(index-1+tabs.length)%tabs.length,'Home':0,'End':tabs.length-1}[event.key];
    if (next !== undefined) {event.preventDefault();selectTab(tabs[next],true);}
  });
}
const dialog = document.querySelector('#screenshot-dialog');
const zoomImage = document.querySelector('#zoom-image');
let zoomTrigger;
for (const link of document.querySelectorAll('[data-zoom]')) link.addEventListener('click',event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
  event.preventDefault();
  zoomTrigger = link;
  zoomImage.src = link.href;
  zoomImage.alt = link.querySelector('img').alt;
  document.querySelector('#zoom-caption').textContent = link.dataset.caption;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  document.querySelector('#close-screenshot').focus();
});
document.querySelector('#close-screenshot').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close',()=> {document.body.classList.remove('dialog-open');zoomTrigger?.focus();});
async function configurePurchasing() {
  try {
    const response = await fetch('/api/config.json');
    if (!response.ok) return;
    const config = await response.json();
    const purchase = document.querySelector('[data-purchase]');
    if (config.checkoutMode === 'local-test' && ['127.0.0.1','localhost'].includes(location.hostname) && config.checkoutUrl === '/checkout') {
      purchase.href = '/checkout';
      purchase.target = '_blank';
      purchase.rel = 'noopener noreferrer';
      purchase.textContent = 'Try the $14.95 test checkout ↗';
      document.querySelector('#purchase-note').textContent = 'Explore the purchase flow and activate a test license. Stripe sandbox checkout uses test cards and makes no real charges.';
      document.querySelector('#test-badge').hidden = false;
    } else if (config.checkoutMode === 'live' && config.checkoutUrl) {
      const url = new URL(config.checkoutUrl);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      purchase.href = url.href;
      purchase.rel = 'noopener noreferrer';
      purchase.textContent = 'Buy Sentire — $14.95 ↗';
      document.querySelector('#purchase-note').textContent = 'Continue to secure checkout. Your license is issued after payment is confirmed.';
    }
    for (const platform of ['linux','windows']) {
      const download = config[platform+'DownloadUrl'];
      if (!download) continue;
      const url = new URL(download);
      if (url.protocol !== 'https:' || url.username || url.password) continue;
      const link = document.querySelector('[data-'+platform+'-download]');
      link.href = url.href;link.rel = 'noopener noreferrer';link.hidden = false;
      document.querySelector('[data-'+platform+'-status]').textContent = 'Download available';
      link.closest('article').querySelector('.platform-label').textContent = 'AVAILABLE';
    }
  } catch { /* Static release information stays visible when configuration is unavailable. */ }
}
configurePurchasing();
