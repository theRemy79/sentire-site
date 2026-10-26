
'use strict';
(async()=>{
 try{
  const response=await fetch('/api/config.json');if(!response.ok)return;
  const config=await response.json();
  for(const platform of ['linux','windows']){
   const value=config[platform+'DownloadUrl'];if(!value)continue;
   const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return;
   const link=document.querySelector('[data-'+platform+'-download]');
   link.href=url.href;link.rel='noopener noreferrer';link.hidden=false;
   document.querySelector('[data-'+platform+'-status]').textContent='Download available. See the release notes for installation requirements.';
  }
 }catch{/* Keep the honest availability message. */}
})();
