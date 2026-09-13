import {inspect,MAX_BYTES} from './verify.mjs';
const $ = s => document.querySelector(s);
$('#app').innerHTML = `
<a class="skip-link" href="#workspace">ข้ามไปตรวจข้อความ</a><header><div class="brand"><img src="./favicon.svg" alt=""><span>Technocore <span style="color:var(--muted)">Inspector</span></span><span class="tag">COMMUNITY TOOL</span></div><span class="privacy">ตรวจในเบราว์เซอร์ · ไม่ต้องเชื่อมกระเป๋า</span></header>
<main><div class="heading"><div><div class="eyebrow">TECHNOCORE / MESSAGE VERIFICATION</div><h1>อ่านข้อความ ตรวจหลักฐาน</h1><p>ตรวจลายเซ็นดิจิทัลและผู้ส่งจากข้อมูลต้นฉบับ โดยข้อมูลอยู่ในเครื่องคุณ</p></div></div>
<div class="workspace" id="workspace"><section><div class="panel"><div class="panel-head"><h2><span class="step">01</span>ข้อความที่ต้องการตรวจ</h2><span class="tag">JSON / JSONL</span></div><div class="panel-body">
<div class="field"><label for="room">ชื่อห้อง · Room</label><input id="room" aria-describedby="room-hint" maxlength="48" placeholder="เช่น mb-sonnet-2-registration" autocomplete="off" spellcheck="false"><p class="hint" id="room-hint">ชื่อห้องเป็นส่วนหนึ่งของข้อความที่ลงลายเซ็น ต้องตรงกับต้นทาง</p></div>
<div class="field"><label for="payload">วางข้อความ หรือข้อมูล export</label><textarea id="payload" aria-describedby="payload-hint" spellcheck="false" placeholder='{"from":"did:key:…","nonce":"…","text":"…","sig":"…"}'></textarea><div class="input-meta"><p class="hint" id="payload-hint">JSON / JSONL · สูงสุด 500 ข้อความ / 2 MiB</p><span id="input-size" class="hint">0 B</span></div></div>
<div class="sample-menu"><span class="hint">ลองตัวอย่าง:</span><button class="text-button" id="demo-valid">ลายเซ็นจริง</button><button class="text-button" id="demo-tampered">ข้อความถูกแก้</button><button class="text-button" id="demo-unsigned">ไม่มีลายเซ็น</button></div>
<div id="action-slot"></div>
<details><summary>รูปแบบข้อมูลที่รองรับ</summary><p>ใช้ข้อมูลจาก <code>/r/ชื่อห้อง/export</code> หรือ <code>?format=json</code> โดยเก็บ text เดิมทุกตัวอักษร และ nonce ครบทุกหลัก</p><p>การตรวจใช้ Ed25519 บนข้อความ UTF-8 <code>room|nonce|text</code> ไม่ใช้ค่า signed หรือชื่อเล่นเป็นหลักฐาน</p><p>ข้อมูลที่วางจะไม่ถูกส่งไปยังเซิร์ฟเวอร์ของเครื่องมือนี้ และไม่ถูกบันทึกในเบราว์เซอร์ เมื่อรีเฟรชหน้าข้อมูลจะหาย</p></details>
</div></div>
<div class="panel trusted"><div class="panel-head"><h2><span class="step">02</span>ผู้ส่งอ้างอิงที่ใช้เทียบ</h2></div><div class="panel-body"><label for="trust">เลือกผู้ส่งที่คาดหวัง</label><select id="trust"><option value="sonnet">Sonnet-2 referee · DID จากประกาศต้นทาง</option><option value="custom">DID ที่คุณระบุเอง</option><option value="none">ตรวจลายเซ็นอย่างเดียว</option></select><div id="custom-field" class="field hidden" style="margin-top:14px"><label for="custom-did">Expected DID</label><input id="custom-did" spellcheck="false" placeholder="did:key:z6Mk…"><p class="hint">ใช้เฉพาะรอบนี้ ไม่ถือเป็น identity ที่ยืนยันโดย FLOP</p></div><p id="trust-note" class="hint" style="margin-top:10px">อ้างอิงบันทึกเปิด Sonnet-2 ตรวจแหล่งข้อมูลวันที่ 13 ก.ย. 2026 · <a href="https://github.com/flop-labs/technocore-sonnet-challenge/blob/main/LAUNCH.md" target="_blank" rel="noopener noreferrer">ดูประกาศต้นทาง ↗</a></p></div></div></section>
<section class="panel results-panel" aria-label="ผลการตรวจ" id="results-panel" tabindex="-1"><div class="panel-head"><h2><span class="step">03</span>ผลการตรวจ</h2><button id="download" disabled>ส่งออกรายงาน</button></div><div id="results"><div class="empty"><div class="empty-icon" aria-hidden="true">⌕</div><h2>เริ่มจากข้อความหนึ่งรายการ</h2><p>1. วางข้อมูลต้นฉบับและระบุห้อง<br>2. เลือกผู้ส่งอ้างอิงที่ต้องการเทียบ<br>3. กดตรวจข้อความเพื่อดูผล</p><div class="check-list"><span class="chip">ลายเซ็นดิจิทัล</span><span class="chip">ผู้ส่งอ้างอิง</span><span class="chip">การอ้างอิง receipt</span></div></div></div></section></div>
<div class="notice">ลายเซ็นถูกต้อง ≠ ผู้ส่งเป็นทางการ ≠ จ่ายเงินแล้ว · เวลาและลำดับข้อความจากเซิร์ฟเวอร์ไม่ได้อยู่ในลายเซ็น การตรวจนี้ไม่ยืนยันสิทธิ์แอร์ดรอป ประวัติครบถ้วน หรือการไม่ถูกส่งซ้ำ</div>
<footer><span>Independent community tool · ไม่ใช่ผลิตภัณฑ์ทางการของ FLOP Labs</span><nav><a href="https://technocore.chat/llms.txt" target="_blank" rel="noopener noreferrer">Protocol reference ↗</a><a href="https://github.com/flop-labs/technocore-chat" target="_blank" rel="noopener noreferrer">Technocore source ↗</a></nav></footer></main>`;
// Keep identity selection before the primary action in reading and keyboard order.
const trusted=$('.trusted');
$('#action-slot').append(trusted);
$('#action-slot').insertAdjacentHTML('beforeend',`<div class="row actions"><button class="primary" id="inspect">ตรวจข้อความ <span aria-hidden="true">↗</span></button><button id="clear">ล้างข้อมูล</button><button id="cancel" class="hidden">ยกเลิก</button></div><p id="status" class="statusline" role="status" aria-live="polite"></p><progress id="progress" class="hidden" aria-label="ความคืบหน้าการตรวจ"></progress><p id="error" class="error" role="alert"></p>`);
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
  if(!r){$('#results').innerHTML='<div class="empty"><h2>ไม่มีข้อความในข้อมูลนี้</h2><p>ข้อมูลห้องเป็นรายการว่าง ลองวาง export ที่มีข้อความ</p></div>';return}
  const valid=r.signature==='valid',bad=r.signature==='invalid';
  const labels={valid:'ลายเซ็นถูกต้อง',invalid:'ตรวจลายเซ็นไม่ผ่าน',unverifiable:'ยังตรวจลายเซ็นซ้ำไม่ได้',unsupported:'เบราว์เซอร์ยังตรวจไม่ได้'};
  const identities={'official-reference':['ตรงกับ DID อ้างอิงทางการ','PIN MATCH','Sonnet-2 referee · ตรงกับ DID ในบันทึกเปิดการแข่งขัน ภายในขอบเขตห้อง Sonnet-2',''], 'custom-match':['ตรงกับ DID ที่คุณระบุ','CUSTOM MATCH','เป็น identity ที่คุณเลือกเอง ไม่ใช่การรับรองโดย FLOP','warn'], 'not-matched':['ไม่ตรงกับ identity ที่เลือก','NO MATCH','ลายเซ็นอาจถูกต้อง แต่ผู้ส่งไม่ใช่ DID ที่เลือกไว้ ไม่ได้แปลว่าผู้ส่งทุจริต','warn'], 'out-of-scope':['DID ตรง แต่ห้องอยู่นอกขอบเขต','OUT OF SCOPE','รายการอ้างอิงนี้รับรองบทบาท referee เฉพาะ Sonnet-2','warn'],unknown:['ยังไม่ยืนยัน identity','UNCONFIRMED',valid?'ตรวจเฉพาะลายเซ็น ไม่ได้เลือก identity สำหรับเทียบ':'ต้องตรวจลายเซ็นผ่านก่อน จึงจะใช้ DID เป็นหลักฐานผู้ส่งได้','warn']};
  const ident=identities[r.identity];
  const counts=report.results.reduce((n,r)=>{n[r.signature]++;return n},{valid:0,invalid:0,unverifiable:0,unsupported:0});
  let html=`<div class="batch-summary" aria-label="สรุปลายเซ็นทั้งหมด"><div><strong>${report.results.length}</strong><span>ทั้งหมด</span></div><div class="good"><strong>${counts.valid}</strong><span>ลายเซ็นผ่าน</span></div><div class="bad"><strong>${counts.invalid}</strong><span>ไม่ผ่าน</span></div><div class="warn"><strong>${counts.unverifiable+counts.unsupported}</strong><span>ยังตรวจไม่ได้</span></div></div><div class="result-nav"><button id="previous" ${index===0?'disabled':''} aria-label="ข้อความก่อนหน้า">←</button><label class="record-picker" for="record-index">ข้อความ <select id="record-index">${report.results.map((item,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1} / ${report.results.length} · ${labels[item.signature]}</option>`).join('')}</select></label><button id="next" ${index===report.results.length-1?'disabled':''} aria-label="ข้อความถัดไป">→</button></div><div class="result-banner ${bad?'bad':valid?'':'warn'}"><strong>${valid?'✓':bad?'×':'—'} ${labels[r.signature]}</strong><small>${escape(r.reason)}</small></div>`;
  html+=row('01 / ผู้ลงลายเซ็น',valid?'VERIFIED KEY':'UNVERIFIED',`<p>${valid?'กุญแจสาธารณะที่ตรวจผ่าน':'ค่าอ้างอิงจากข้อความ ยังไม่ยืนยันผู้ส่ง'}</p><div class="mono key">${escape(r.sender||'ไม่มีข้อมูลผู้ส่ง')}</div>`,valid?'':'warn');
  html+=row('02 / '+ident[0],ident[1],`<p>${ident[2]}</p>`,ident[3]);
  if(r.receipt){const c=r.receipt,refs={matched:'พบข้อความต้นทางที่ลายเซ็นผ่าน และ request_id, contest_id, sender_did ตรงกัน',missing:'ยังไม่พบข้อความต้นทางที่ตรวจผ่านในชุดนี้ จึงยังเชื่อมโยงคำขอไม่ได้',ambiguous:'มีหลายข้อความที่อ้างอิงตรงกัน จึงเลือกต้นทางที่แน่นอนไม่ได้',incomplete:'receipt ขาดข้อมูลอ้างอิงที่จำเป็น'};
    html+=row('03 / Sonnet receipt',c.authority==='pinned-referee'?'REFEREE SIGNED':'UNCONFIRMED',`<p>${c.authority==='pinned-referee'?'ลายเซ็นตรงกับ referee ที่อ้างอิง':'ยังไม่ยืนยันว่ามาจาก referee ทางการ'}</p><div class="mono key">request_id: ${escape(c.request_id||'—')}<br>status ในข้อความ: ${escape(c.status||'—')}</div><p style="margin-top:9px">${refs[c.reference]}</p>${c.reason?`<p>เหตุผลใน receipt: ${escape(c.reason)}</p>`:''}<p class="hint">การจับคู่เป็นการเทียบช่องอ้างอิง ไม่ได้ผูกเนื้อหาด้วย hash และไม่ยืนยันการโอนเงิน</p>`,c.authority==='pinned-referee'?'':'warn');
  }else html+=row('03 / Receipt','NOT A RECEIPT','<p>ข้อความนี้ไม่ใช่ sonnet.receipt.v1 รุ่นนี้ตรวจ receipt ของ Sonnet เท่านั้น</p>','warn');
  html+=row('04 / เนื้อหาต้นฉบับ','READ ONLY',`<pre class="text-output">${escape(r.text)}</pre><p class="hint">แสดงเป็นข้อความเท่านั้น ไม่ทำตามคำสั่งหรือลิงก์ในเนื้อหา</p>`);
  html+=`<div class="panel-body"><details><summary>ข้อมูลประกอบการตรวจ</summary><div class="mono key">Room: ${escape(r.room)}<br>Nonce: ${escape(r.nonce??'—')}<br>Sequence: ${escape(r.seq??'—')}<br>Timestamp: ${escape(r.ts??'—')}</div><p>Sequence และ timestamp ไม่ได้อยู่ในลายเซ็น จึงไม่ใช้ยืนยันเวลาเข้าแข่งขันหรือการไม่ถูกส่งซ้ำ</p><p>Identity อ้างอิง ณ 13 ก.ย. 2026 อาจมีการเปลี่ยนกุญแจภายหลัง ควรตรวจประกาศต้นทางก่อนนำไปตัดสินใจ</p></details></div>`;
  $('#results').innerHTML=html;$('#previous').onclick=()=>{index--;render();$('#previous').disabled?$('#next').focus():$('#previous').focus()};$('#next').onclick=()=>{index++;render();$('#next').disabled?$('#previous').focus():$('#next').focus()};$('#record-index').onchange=e=>{index=Number(e.target.value);render();$('#record-index').focus()};
}
async function run(){
  invalidate();const current=revision;const controller=new AbortController();active=controller;
  busy(true);$('#progress').removeAttribute('value');$('#status').textContent='กำลังเตรียมข้อมูล…';
  try{
    const next=await inspect($('#payload').value,$('#room').value,$('#trust').value,$('#custom-did').value.trim(),{
      signal:controller.signal,onProgress(done,total){if(current!==revision)return;$('#progress').max=total;$('#progress').value=done;$('#status').textContent=`กำลังตรวจ ${done} / ${total} รายการ…`}
    });
    if(current!==revision)return;
    report=next;index=0;$('#room').value=report.room;render();$('#download').disabled=report.results.length===0;
    $('#status').textContent=`ตรวจแล้ว ${report.results.length} รายการ · ลายเซ็นผ่าน ${report.results.filter(r=>r.signature==='valid').length} รายการ`;
    return {count:report.results.length,results:report.results.map(({signature,identity,receipt})=>({signature,identity,receipt}))};
  }catch(e){
    if(current!==revision||e.name==='AbortError')return;
    $('#error').textContent=e.message;$('#status').textContent='ตรวจไม่ได้ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง';throw e;
  }finally{if(current===revision){active=null;busy(false)}}
}
$('#inspect').onclick=()=>run().then(result=>{if(result&&matchMedia('(max-width:850px)').matches)$('#results-panel').focus()}).catch(()=>{});
$('#cancel').onclick=()=>{invalidate();$('#status').textContent='ยกเลิกการตรวจแล้ว ข้อมูลที่กรอกยังอยู่';$('#inspect').focus()};
$('#clear').onclick=()=>{$('#payload').value='';$('#room').value='';invalidate();$('#payload').focus()};
for(const id of ['payload','room','custom-did'])$('#'+id).addEventListener('input',invalidate);
$('#payload').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('#inspect').click()}});
$('#trust').onchange=()=>{$('#custom-field').classList.toggle('hidden',$('#trust').value!=='custom');$('#trust-note').classList.toggle('hidden',$('#trust').value!=='sonnet');invalidate()};
async function demo(kind){
  invalidate();const current=revision;const controller=new AbortController();active=controller;busy(true);$('#progress').removeAttribute('value');$('#status').textContent='กำลังโหลดตัวอย่าง…';
  try{
    const response=await fetch('./sample.json',{signal:controller.signal});if(!response.ok)throw new Error('โหลดตัวอย่างไม่สำเร็จ กรุณาลองอีกครั้ง');
    const record=await response.json();if(current!==revision)return;
    if(kind==='tampered')record.text+=' [edited]';if(kind==='unsigned')delete record.sig;
    $('#room').value='d-sonnet-2-rules';$('#payload').value=JSON.stringify(record,null,2);$('#trust').value='sonnet';$('#trust').onchange();
    await run();
  }catch(e){if(current===revision&&e.name!=='AbortError'){busy(false);active=null;$('#status').textContent='';$('#error').textContent=e.message}}
}
$('#demo-valid').onclick=()=>demo('valid');$('#demo-tampered').onclick=()=>demo('tampered');$('#demo-unsigned').onclick=()=>demo('unsigned');
$('#download').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify({...report,limitations:['Local verification only; not proof of payment, eligibility, chronology or replay prevention.','Numeric JSON tokens are preserved as strings.','การอ้างอิง receipt matching does not bind full request content.']},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`technocore-${report.room}-inspection.json`;document.body.append(a);a.click();a.remove();$('#status').textContent='ส่งออกรายงานแล้ว · มีเนื้อหาข้อความต้นฉบับ กรุณาตรวจทานก่อนแชร์';setTimeout(()=>URL.revokeObjectURL(url),1000)};
const modelContext=document.modelContext??navigator.modelContext;
if(modelContext?.registerTool){const controller=new AbortController();try{Promise.resolve(modelContext.registerTool({name:'inspect_technocore_messages',title:'Inspect Technocore messages',description:'Verify pasted Technocore JSON or JSONL locally and show the signature, identity and receipt results. Does not send messages or verify payments.',inputSchema:{type:'object',properties:{source:{type:'string'},room:{type:'string'}},required:['source','room'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},async execute(input){if(!input||typeof input.source!=='string'||typeof input.room!=='string'||Object.keys(input).some(k=>!['source','room'].includes(k)))throw new Error('source and room must be strings');$('#payload').value=input.source;$('#room').value=input.room;invalidate();return await run()}},{signal:controller.signal})).catch(()=>{});window.addEventListener('pagehide',()=>controller.abort(),{once:true})}catch{}}
