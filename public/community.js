'use strict';
for (const form of document.querySelectorAll('[data-intake]')) {
 const status=form.querySelector('[role=status]'),button=form.querySelector('button[type=submit]');
 let ready=false;
 async function prepare(){
  try{
   const response=await fetch('/community/token',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error();
   const data=await response.json();if(typeof data.csrf!=='string')throw Error();
   form.elements.csrf.value=data.csrf;ready=true;button.disabled=false;
   status.textContent=data.preview?'Local preview: this saves a test submission and a private email preview. No email is sent.':'Ready. Only the details you enter above will be sent.';
  }catch{status.textContent='This form is not open right now. Please try again later or use the email address on this page. No details have been sent.';}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!ready||!form.reportValidity())return;
  button.disabled=true;status.textContent='Sending…';
  try{
   const response=await fetch(form.action,{method:'POST',credentials:'same-origin',body:new URLSearchParams(new FormData(form))});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Your request could not be confirmed. Please try again.');
   status.textContent=data.message;form.reset();ready=false;
   button.textContent='Received — thank you';
  }catch(error){status.textContent=error.message||'Could not confirm your request. Please try again.';button.disabled=false;}
 });
 prepare();
}
