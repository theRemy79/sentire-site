import {readFileSync} from 'node:fs';
const header = readFileSync(new URL('../src/partials/header.html',import.meta.url),'utf8');
const footer = readFileSync(new URL('../src/partials/footer.html',import.meta.url),'utf8');
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function storeURL(value,host){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function renderHeader(pathname='/'){
  return header.replace(/{{(GUIDE|BLOG|SUPPORT|DOWNLOADS)_CURRENT}}/g,(_,section)=>{
    const route={GUIDE:'/guide/',BLOG:'/blog/',SUPPORT:'/support/',DOWNLOADS:'/downloads/'}[section];
    return pathname===route?' aria-current="page"':pathname.startsWith(route)?' aria-current="true"':'';
  });
}
export function renderFooter(config={}){
  const platforms=[['linux','Linux','snap-store-dark.svg','Get it from the Snap Store',storeURL(config.linuxDownloadUrl??'https://snapcraft.io/sentire','snapcraft.io')],['windows','Windows','microsoft-store-dark.svg','Get it from Microsoft',storeURL(config.windowsDownloadUrl,'apps.microsoft.com')]];
  const badges=platforms.map(([platform,name,file,alt,url])=>{
    const img=`<img src="/assets/${file}" alt="${alt}" width="182" height="56">`;
    return `<div class="footer-store" data-footer-platform="${platform}"><a class="footer-store-badge" data-footer-store-link href="${escape(url||'/downloads/')}"${url?'':' hidden'}>${img}</a><span class="footer-store-badge footer-store-disabled" data-footer-store-disabled aria-disabled="true" aria-label="${name} release coming soon"${url?' hidden':''}>${img}</span><span class="footer-store-status" data-footer-store-status>${name}${url?'':' · Coming soon'}</span></div>`;
  }).join('');
  return footer.replace('{{STORE_BADGES}}',badges).replace('{{YEAR}}',String(new Date().getUTCFullYear()));
}
export function renderLayout(html,{pathname='/',config={}}={}){
  let output=html.replace('{{SITE_HEADER}}',renderHeader(pathname)).replace('{{SITE_FOOTER}}',renderFooter(config));
  if(!output.includes('href="/site-shell.css"'))output=output.replace('</head>','<link rel="stylesheet" href="/site-shell.css"><script src="/site-shell.js" defer></script></head>');
  if(/{{SITE_(HEADER|FOOTER)}}/.test(output))throw Error('Unrendered site layout');
  return output;
}
