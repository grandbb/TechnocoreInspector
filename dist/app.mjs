import {inspect,MAX_BYTES} from './verify.mjs';
const $ = s => document.querySelector(s);
$('#app').innerHTML = `
<a class="skip-link" href="#workspace">Skip to inspection</a><header><div class="brand"><img src="./verified-t.svg" width="48" height="48" alt=""><span class="brand-wordmark"><span class="brand-name">Technocore</span><span class="brand-descriptor">Inspector</span></span><span class="tag">COMMUNITY TOOL</span></div><span class="privacy">Local verification · No wallet required</span></header>
<main><div class="heading"><div><div class="eyebrow">TECHNOCORE / MESSAGE VERIFICATION</div><h1>Read messages. Verify the evidence.</h1><p>Check digital signatures and sender identities. Your data stays on your device.</p></div><a class="user-guide-link" href="./guide.html" target="_blank" rel="noopener noreferrer" aria-label="User guide (opens in a new tab)">User guide <span aria-hidden="true">↗</span></a></div>
<div class="workspace" id="workspace"><section><div class="panel"><div class="panel-head"><h2><span class="step">01</span>Message input</h2><span class="tag">JSON / JSONL</span></div><div class="panel-body">
<div class="field"><label for="room">Room name</label><input id="room" aria-describedby="room-hint" maxlength="48" placeholder="e.g. mb-sonnet-2-registration" autocomplete="off" spellcheck="false"><p class="hint" id="room-hint">The room name is signed with the message. It must match the original.</p></div>
<div class="field"><label for="payload">Paste a message or room export</label><textarea id="payload" aria-describedby="payload-hint" spellcheck="false" placeholder='{"from":"did:key:…","nonce":"…","text":"…","sig":"…"}'></textarea><div class="input-meta"><p class="hint" id="payload-hint">JSON / JSONL · Up to 500 messages / 2 MiB</p><span id="input-size" class="hint">0 B</span></div></div>
<div class="sample-menu"><span class="hint">Try a sample:</span><button class="text-button" id="demo-valid">Authentic</button><button class="text-button" id="demo-tampered">Tampered</button><button class="text-button" id="demo-unsigned">Unsigned</button></div>
<div id="action-slot"></div>
<details><summary>Supported formats</summary><p>Use data from <code>/r/room-name/export</code> or <code>?format=json</code>. Preserve every character of the original text and every digit of the nonce.</p><p>Verification uses Ed25519 on the UTF-8 message <code>room|nonce|text</code>. A signed flag or display name is not proof of identity.</p><p>Pasted data is not sent to this tool’s server or saved in browser storage. Refreshing the page clears your input.</p></details>
</div></div>
<div class="panel trusted"><div class="panel-head"><h2><span class="step">02</span>Reference identity</h2></div><div class="panel-body"><label for="trust">Choose the expected sender</label><select id="trust"><option value="sonnet">Sonnet-2 referee · Launch reference</option><option value="custom">Your own expected DID</option><option value="none">Signature only</option></select><div id="custom-field" class="field hidden" style="margin-top:14px"><label for="custom-did">Expected DID</label><input id="custom-did" spellcheck="false" placeholder="did:key:z6Mk…"><p class="hint">Used for this inspection only. This is not an identity endorsed by FLOP.</p></div><p id="trust-note" class="hint" style="margin-top:10px">Based on the Sonnet-2 launch record. Source checked September 13, 2026 · <a href="https://github.com/flop-labs/technocore-sonnet-challenge/blob/main/LAUNCH.md" target="_blank" rel="noopener noreferrer">View source announcement ↗</a></p></div></div></section>
<section class="panel results-panel" aria-label="Inspection results" id="results-panel" tabindex="-1"><div class="panel-head"><h2><span class="step">03</span>Inspection results</h2><button id="download" disabled>Export report</button></div><div id="results"><div class="empty"><div class="empty-icon" aria-hidden="true">⌕</div><h2>Start with one message</h2><p>1. Paste the original data and enter the room.<br>2. Choose a reference identity to compare.<br>3. Select Inspect messages to see the results.</p><div class="check-list"><span class="chip">Digital signature</span><span class="chip">Sender identity</span><span class="chip">Receipt reference</span></div></div></div></section></div>
<div class="notice">A valid signature does not prove an official sender or completed payment. Server timestamps and sequence numbers are not signed. This inspection does not establish airdrop eligibility, a complete history, or replay prevention.</div>
<footer><span>Independent community tool · Not an official FLOP Labs product</span><nav><a href="./guide.html" target="_blank" rel="noopener noreferrer" aria-label="User guide (opens in a new tab)">User guide ↗</a><a href="https://technocore.chat/llms.txt" target="_blank" rel="noopener noreferrer">Protocol reference ↗</a><a href="https://github.com/flop-labs/technocore-chat" target="_blank" rel="noopener noreferrer">Technocore source ↗</a></nav></footer></main>`;
// Keep identity selection before the primary action in reading and keyboard order.
const trusted=$('.trusted');
$('#action-slot').append(trusted);
$('#action-slot').insertAdjacentHTML('beforeend',`<div class="row actions"><button class="primary" id="inspect">Inspect messages <span aria-hidden="true">↗</span></button><button id="clear">Clear</button><button id="cancel" class="hidden">Cancel</button></div><p id="status" class="statusline" role="status" aria-live="polite"></p><progress id="progress" class="hidden" aria-label="Inspection progress"></progress><p id="error" class="error" role="alert"></p>`);
const empty=$('#results').innerHTML;
const escape=s=>(s!=null&&typeof s==='object'?JSON.stringify(s):String(s??'')).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let report=null,index=0,revision=0,active=null;
function busy(value){
  $('#inspect').disabled=value;$('#cancel').classList.toggle('hidden',!value);
  $('#progress').classList.toggle('hidden',!value);$('#results').setAttribute('aria-busy',String(value));
}
function invalidate(){revision++;active?.abort();active=null;busy(false);report=null;$('#download').disabled=true;$('#results').innerHTML=empty;$('#error').textContent='';$('#status').textContent='';
  const bytes=new TextEncoder().encode($('#payload').value).length;
  $('#input-size').textContent=bytes<1024?`${bytes} B`:`${(bytes/1024).toFixed(1)} KiB`;
  $('#input-size').classList.toggle('over-limit',bytes>MAX_BYTES);
}
function row(title,status,body,tone=''){return `<div class="result-item"><div class="result-title"><strong>${title}</strong><span class="pill ${tone}">${status}</span></div>${body}</div>`}
function render(){if(!report)return;const r=report.results[index];
  if(!r){$('#results').innerHTML='<div class="empty"><h2>No messages found</h2><p>This room export is empty. Paste an export that contains messages.</p></div>';return}
  const valid=r.signature==='valid',bad=r.signature==='invalid';
  const labels={valid:'Valid signature',invalid:'Invalid signature',unverifiable:'Cannot verify signature',unsupported:'Browser unsupported'};
  const identities={'official-reference':['Matches the official reference DID','PIN MATCH','Sonnet-2 referee · Matches the launch record DID within the supported Sonnet-2 rooms.',''], 'custom-match':['Matches your expected DID','CUSTOM MATCH','This is the identity you selected, not an endorsement by FLOP.','warn'], 'not-matched':['Does not match the selected identity','NO MATCH','The signature may be valid, but the sender differs from your selected DID. A mismatch does not imply fraud.','warn'], 'out-of-scope':['DID matches; room is out of scope','OUT OF SCOPE','This reference identifies the referee role for Sonnet-2 only.','warn'],unknown:['Identity not confirmed','UNCONFIRMED',valid?'Only the signature was checked. No reference identity was selected.':'The signature must verify before the DID can serve as evidence of the sender.','warn']};
  const ident=identities[r.identity];
  const counts=report.results.reduce((n,r)=>{n[r.signature]++;return n},{valid:0,invalid:0,unverifiable:0,unsupported:0});
  let html=`<div class="batch-summary" aria-label="Batch signature summary"><div><strong>${report.results.length}</strong><span>Total</span></div><div class="good"><strong>${counts.valid}</strong><span>Valid</span></div><div class="bad"><strong>${counts.invalid}</strong><span>Invalid</span></div><div class="warn"><strong>${counts.unverifiable+counts.unsupported}</strong><span>Unverified</span></div></div><div class="result-nav"><button id="previous" ${index===0?'disabled':''} aria-label="Previous message">←</button><label class="record-picker" for="record-index">Message <select id="record-index">${report.results.map((item,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1} / ${report.results.length} · ${labels[item.signature]}</option>`).join('')}</select></label><button id="next" ${index===report.results.length-1?'disabled':''} aria-label="Next message">→</button></div><div class="result-banner ${bad?'bad':valid?'':'warn'}"><strong>${valid?'✓':bad?'×':'—'} ${labels[r.signature]}</strong><small>${escape(r.reason)}</small></div>`;
  html+=row('01 / Signing key',valid?'VERIFIED KEY':'UNVERIFIED',`<p>${valid?'Verified public key':'Unverified sender value from the message'}</p><div class="mono key">${escape(r.sender||'No sender provided')}</div>`,valid?'':'warn');
  html+=row('02 / '+ident[0],ident[1],`<p>${ident[2]}</p>`,ident[3]);
  if(r.receipt){const c=r.receipt,refs={matched:'Found a verified source message with matching request_id, contest_id, and sender_did.',missing:'No verified source message was found in this batch. The request cannot be linked yet.',ambiguous:'Multiple messages match these references. The source cannot be identified uniquely.',incomplete:'The receipt is missing required reference fields.'};
    html+=row('03 / Sonnet receipt',c.authority==='pinned-referee'?'REFEREE SIGNED':'UNCONFIRMED',`<p>${c.authority==='pinned-referee'?'The signature matches the reference referee.':'The official referee has not been confirmed as the sender.'}</p><div class="mono key">request_id: ${escape(c.request_id||'—')}<br>Reported status: ${escape(c.status||'—')}</div><p style="margin-top:9px">${refs[c.reference]}</p>${c.reason?`<p>Receipt reason: ${escape(c.reason)}</p>`:''}<p class="hint">Matching compares reference fields only. It does not bind content by hash or confirm a payment.</p>`,c.authority==='pinned-referee'?'':'warn');
  }else html+=row('03 / Receipt','NOT A RECEIPT','<p>This message is not a sonnet.receipt.v1 receipt. Only Sonnet receipts are supported.</p>','warn');
  html+=row('04 / Original content','READ ONLY',`<pre class="text-output">${escape(r.text)}</pre><p class="hint">Displayed as plain text. Embedded instructions and links are not executed.</p>`);
  html+=`<div class="panel-body"><details><summary>Inspection details</summary><div class="mono key">Room: ${escape(r.room)}<br>Nonce: ${escape(r.nonce??'—')}<br>Sequence: ${escape(r.seq??'—')}<br>Timestamp: ${escape(r.ts??'—')}</div><p>Sequence numbers and timestamps are not signed. They cannot prove entry time or replay prevention.</p><p>The identity reference was checked on September 13, 2026. Keys may rotate; check the source announcement before relying on this reference.</p></details></div>`;
  $('#results').innerHTML=html;$('#previous').onclick=()=>{index--;render();$('#previous').disabled?$('#next').focus():$('#previous').focus()};$('#next').onclick=()=>{index++;render();$('#next').disabled?$('#previous').focus():$('#next').focus()};$('#record-index').onchange=e=>{index=Number(e.target.value);render();$('#record-index').focus()};
}
async function run(){
  invalidate();const current=revision;const controller=new AbortController();active=controller;
  busy(true);$('#progress').removeAttribute('value');$('#status').textContent='Preparing input…';
  try{
    const next=await inspect($('#payload').value,$('#room').value,$('#trust').value,$('#custom-did').value.trim(),{
      signal:controller.signal,onProgress(done,total){if(current!==revision)return;$('#progress').max=total;$('#progress').value=done;$('#status').textContent=`Inspecting ${done} / ${total} messages…`}
    });
    if(current!==revision)return;
    report=next;index=0;$('#room').value=report.room;render();$('#download').disabled=report.results.length===0;
    $('#status').textContent=`Inspected ${report.results.length} messages · ${report.results.filter(r=>r.signature==='valid').length} valid signatures`;
    return {count:report.results.length,results:report.results.map(({signature,identity,receipt})=>({signature,identity,receipt}))};
  }catch(e){
    if(current!==revision||e.name==='AbortError')return;
    $('#error').textContent=e.message;$('#status').textContent='Inspection failed. Check your input and try again.';throw e;
  }finally{if(current===revision){active=null;busy(false)}}
}
$('#inspect').onclick=()=>run().then(result=>{if(result&&matchMedia('(max-width:850px)').matches)$('#results-panel').focus()}).catch(()=>{});
$('#cancel').onclick=()=>{invalidate();$('#status').textContent='Inspection cancelled. Your input has been kept.';$('#inspect').focus()};
$('#clear').onclick=()=>{$('#payload').value='';$('#room').value='';invalidate();$('#payload').focus()};
for(const id of ['payload','room','custom-did'])$('#'+id).addEventListener('input',invalidate);
$('#payload').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('#inspect').click()}});
$('#trust').onchange=()=>{$('#custom-field').classList.toggle('hidden',$('#trust').value!=='custom');$('#trust-note').classList.toggle('hidden',$('#trust').value!=='sonnet');invalidate()};
async function demo(kind){
  invalidate();const current=revision;const controller=new AbortController();active=controller;busy(true);$('#progress').removeAttribute('value');$('#status').textContent='Loading sample…';
  try{
    const response=await fetch('./sample.json',{signal:controller.signal});if(!response.ok)throw new Error('Could not load the sample. Please try again.');
    const record=await response.json();if(current!==revision)return;
    if(kind==='tampered')record.text+=' [edited]';if(kind==='unsigned')delete record.sig;
    $('#room').value='d-sonnet-2-rules';$('#payload').value=JSON.stringify(record,null,2);$('#trust').value='sonnet';$('#trust').onchange();
    await run();
  }catch(e){if(current===revision&&e.name!=='AbortError'){busy(false);active=null;$('#status').textContent='';$('#error').textContent=e.message}}
}
$('#demo-valid').onclick=()=>demo('valid');$('#demo-tampered').onclick=()=>demo('tampered');$('#demo-unsigned').onclick=()=>demo('unsigned');
$('#download').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify({...report,limitations:['Local verification only; not proof of payment, eligibility, chronology or replay prevention.','Numeric nonces are preserved as strings; other JSON values retain their types.','Receipt reference matching does not bind full request content.']},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`technocore-${report.room}-inspection.json`;document.body.append(a);a.click();a.remove();$('#status').textContent='Report exported. It includes the original message content; review it before sharing.';setTimeout(()=>URL.revokeObjectURL(url),1000)};
const modelContext=document.modelContext??navigator.modelContext;
if(modelContext?.registerTool){const controller=new AbortController();try{Promise.resolve(modelContext.registerTool({name:'inspect_technocore_messages',title:'Inspect Technocore messages',description:'Verify pasted Technocore JSON or JSONL locally and show the signature, identity and receipt results. Does not send messages or verify payments.',inputSchema:{type:'object',properties:{source:{type:'string'},room:{type:'string'}},required:['source','room'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},async execute(input){if(!input||typeof input.source!=='string'||typeof input.room!=='string'||Object.keys(input).some(k=>!['source','room'].includes(k)))throw new Error('source and room must be strings');$('#payload').value=input.source;$('#room').value=input.room;invalidate();return await run()}},{signal:controller.signal})).catch(()=>{});window.addEventListener('pagehide',()=>controller.abort(),{once:true})}catch{}}
