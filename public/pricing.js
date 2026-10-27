
'use strict';
window.sentirePricing=fetch('/api/config.json').then(async response=>{
 if(!response.ok)throw Error('Pricing unavailable');
 const config=await response.json();
 if(!Number.isSafeInteger(config.unitAmount)||config.unitAmount<=0||config.unitAmount>99999999||config.currency!=='USD')throw Error('Pricing unavailable');
 const label=new Intl.NumberFormat(undefined,{style:'currency',currency:config.currency}).format(config.unitAmount/100);
 document.querySelectorAll('[data-current-price],[data-price-hero]').forEach(el=>el.textContent=label);
 return {...config,priceLabel:label};
}).catch(()=>null);
