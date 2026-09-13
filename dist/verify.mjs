// Protocol reference: https://technocore.chat/llms.txt (2026-09-13).
export const REFEREE = 'did:key:z6MkowHQwsx9xr84WbWN3YCnKutyBnBXkT1ChKY4uEAAMzte';
export const TRUST_SOURCE = 'https://github.com/flop-labs/technocore-sonnet-challenge/blob/main/LAUNCH.md';
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const roomPattern = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const enc = new TextEncoder();
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_RECORDS = 500;
function wellFormed(text) {
  for (let i=0;i<text.length;i++) {
    const c=text.charCodeAt(i);
    if(c>=0xd800&&c<=0xdbff){const next=text.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false}
    else if(c>=0xdc00&&c<=0xdfff)return false;
  }
  return true;
}

// Parse numeric tokens as their original strings, never IEEE-754 numbers.
// Duplicate keys are rejected instead of choosing an ambiguous interpretation.
export function parseExact(src) {
  let i=0;
  const fail=()=>{throw new Error(`JSON ไม่ถูกต้องหรือมี key ซ้ำ (ตำแหน่ง ${i+1})`)};
  const ws=()=>{while(/[\t\n\r ]/.test(src[i]??'!'))i++};
  function str(){const start=i++;while(i<src.length){const c=src[i++];if(c==='"')return JSON.parse(src.slice(start,i));if(c==='\\')i++;}fail()}
  function val(depth=0){if(depth>50)throw new Error('JSON ซ้อนลึกเกิน 50 ชั้น');ws();let c=src[i];
    if(c==='"')return str();
    if(c==='{'){i++;ws();const o=Object.create(null);if(src[i]==='}'){i++;return o}while(i<src.length){ws();if(src[i]!=='"')fail();const k=str();if(Object.hasOwn(o,k))fail();ws();if(src[i++]!==':')fail();o[k]=val(depth+1);ws();c=src[i++];if(c==='}')return o;if(c!==',')fail()}fail()}
    if(c==='['){i++;ws();const a=[];if(src[i]===']'){i++;return a}while(i<src.length){a.push(val(depth+1));ws();c=src[i++];if(c===']')return a;if(c!==',')fail()}fail()}
    for(const [s,v] of [['true',true],['false',false],['null',null]])if(src.startsWith(s,i)){i+=s.length;return v}
    const m=src.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);if(m){i+=m[0].length;return m[0]}fail();
  }
  const result=val();ws();if(i!==src.length)fail();return result;
}
export function publicKey(did){
  if(typeof did!=='string'||!/^did:key:z[1-9A-HJ-NP-Za-km-z]{46,48}$/.test(did))throw new Error('DID ต้องเป็น did:key ของ Ed25519 แบบ base58btc');
  const s=did.slice(9);let n=0n;for(const c of s){const d=alphabet.indexOf(c);if(d<0)throw new Error('DID base58 ไม่ถูกต้อง');n=n*58n+BigInt(d)}
  let hex=n.toString(16);if(hex.length%2)hex='0'+hex;let bytes=Uint8Array.from(hex.match(/../g),x=>parseInt(x,16));
  let zeros=0;while(s[zeros]==='1')zeros++;if(zeros)bytes=Uint8Array.from([...new Uint8Array(zeros),...bytes]);
  if(bytes.length!==34||bytes[0]!==0xed||bytes[1]!==0x01)throw new Error('ไม่ใช่ Ed25519 public key แบบที่ Technocore รองรับ');
  return bytes.slice(2);
}
function signature(s){if(typeof s!=='string'||!/^[A-Za-z0-9_-]{85}[AQgw]$/.test(s))throw new Error('sig ต้องเป็น base64url canonical 86 ตัวอักษร ไม่เติม padding');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'=='),c=>c.charCodeAt(0))}
export function readInput(source,room){
  if(typeof source!=='string'||source.length>MAX_BYTES||enc.encode(source).length>MAX_BYTES)throw new Error('ข้อมูลต้องเป็นข้อความขนาดไม่เกิน 2 MiB');
  source=source.replace(/^\uFEFF/,'');
  if(typeof room!=='string')throw new Error('ชื่อห้องต้องเป็นข้อความ');
  if(!source.trim())throw new Error('กรุณาวางข้อความก่อนตรวจ');
  let data;try{data=parseExact(source)}catch(first){try{const lines=source.trim().split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw first;data=lines.map(parseExact)}catch{throw first}}
  const wrapper=data&&!Array.isArray(data)&&Array.isArray(data.messages)?data:null;
  if(data&&typeof data==='object'&&!Array.isArray(data)&&Object.hasOwn(data,'messages')&&!wrapper)throw new Error('messages ในข้อมูลห้องต้องเป็น JSON array');
  const rows=Array.isArray(data)?data:wrapper?wrapper.messages:[data];
  if(rows.length>MAX_RECORDS)throw new Error('รองรับสูงสุด 500 ข้อความต่อครั้ง กรุณาแบ่งข้อมูล');
  const selected=room.trim()||(typeof data?.room==='string'?data.room:'');
  if(!roomPattern.test(selected))throw new Error('กรุณาระบุชื่อห้อง a-z, 0-9, _ หรือ - ความยาว 1–48 ตัวอักษร');
  if(wrapper?.room&&wrapper.room!==selected)throw new Error('ชื่อห้องที่กรอกไม่ตรงกับ room ใน JSON');
  return {room:selected,rows};
}
export async function verifyRecord(record,room,trust='sonnet',custom=''){
  const result={room,signature:'unverifiable',identity:'unknown',sender:'',reason:'',text:'',nonce:null,receipt:null};
  if(!record||typeof record!=='object'||Array.isArray(record)){result.signature='invalid';result.reason='รายการต้องเป็น JSON object';return result}
  result.sender=typeof record.from==='string'?record.from:typeof record.did==='string'?record.did:'';
  result.text=typeof record.text==='string'?record.text:'';
  result.nonce=record.nonce??null;result.seq=record.seq??null;result.ts=record.ts??null;
  if(record.room!==undefined&&record.room!==room){result.signature='invalid';result.reason='ชื่อห้องในข้อความไม่ตรงกับห้องที่ตรวจ';return result}
  if(record.from!==undefined&&record.did!==undefined&&record.from!==record.did){result.signature='invalid';result.reason='from และ did ไม่ตรงกัน';return result}
  let payload;try{payload=parseExact(result.text)}catch{}
  if(payload&&typeof payload==='object'&&!Array.isArray(payload))result.payload=payload;
  if(record.sig===undefined||record.sig===null||record.sig===''){
    result.reason='ไม่มี sig จึงตรวจซ้ำไม่ได้ ชื่อผู้ส่งหรือค่า signed ไม่ใช่หลักฐาน';
  }else{
    try{
      if(typeof record.text!=='string')throw new Error('text ต้องเป็น string เดิมจากต้นทาง');
      if(!wellFormed(record.text))throw new Error('text มี Unicode ที่ไม่สมบูรณ์ จึงไม่สามารถสร้างข้อความ UTF-8 เดิมได้');
      if(typeof record.nonce!=='string'||!/^\d{1,19}$/.test(record.nonce))throw new Error('nonce ต้องเป็นเลข 1–19 หลักที่เก็บครบทุกหลัก');
      const pk=publicKey(result.sender),sig=signature(record.sig);
      if(!globalThis.crypto?.subtle)throw new Error('CRYPTO_UNAVAILABLE');
      const key=await crypto.subtle.importKey('raw',pk,{name:'Ed25519'},false,['verify']);
      const ok=await crypto.subtle.verify('Ed25519',key,sig,enc.encode(`${room}|${record.nonce}|${record.text}`));
      result.signature=ok?'valid':'invalid';result.reason=ok?'ลายเซ็นตรงกับ room, nonce และ text ที่นำเข้า':'ลายเซ็นไม่ตรงกับข้อมูลนี้ ตรวจชื่อห้อง ข้อความ nonce และลายเซ็น';
    }catch(e){if(e.name==='NotSupportedError'||e.message==='CRYPTO_UNAVAILABLE'){result.signature='unsupported';result.reason='เบราว์เซอร์นี้ไม่มี Ed25519 Web Crypto กรุณาใช้ Chrome, Edge, Firefox หรือ Safari รุ่นใหม่ผ่าน HTTPS'}else{result.signature='invalid';result.reason=e.message}}
  }
  if(result.signature==='valid'){
    if(trust==='sonnet'&&result.sender===REFEREE){const scope=room==='d-sonnet-2-rules'||room==='d-sonnet-2-results'||/^mb-sonnet-2-(registration|discovery|campaign|submissions|votes)$/.test(room)||/^d-sonnet-2-team-[a-z0-9_-]+$/.test(room);result.identity=scope?'official-reference':'out-of-scope'}
    else if(trust==='custom'&&result.sender===custom)result.identity='custom-match';
    else if(trust!=='none')result.identity='not-matched';
  }
  if(payload?.type==='sonnet.receipt.v1')result.receipt={type:payload.type,contest_id:payload.contest_id??null,request_id:payload.request_id??null,sender_did:payload.sender_did??null,status:payload.status??null,reason:payload.reason??'',reference:'missing',authority:result.signature==='valid'&&result.identity==='official-reference'&&payload.contest_id==='sonnet-2'?'pinned-referee':'unconfirmed'};
  return result;
}
export async function inspect(source,room,trust='sonnet',custom='',{signal,onProgress}={}){
  signal?.throwIfAborted();
  if(!['sonnet','custom','none'].includes(trust))throw new Error('ตัวเลือก identity ไม่ถูกต้อง');
  if(trust==='custom')publicKey(custom);
  const input=readInput(source,room),results=[];
  for(const row of input.rows){
    signal?.throwIfAborted();
    results.push(await verifyRecord(row,input.room,trust,custom));
    signal?.throwIfAborted();
    onProgress?.(results.length,input.rows.length);
    if(results.length%20===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  signal?.throwIfAborted();
  for(const r of results){if(!r.receipt)continue;const p=r.receipt;
    if([p.request_id,p.sender_did,p.contest_id,p.status].some(v=>typeof v!=='string'||!v.trim())){p.reference='incomplete';continue}
    const candidates=results.filter(x=>x!==r&&x.signature==='valid'&&x.payload?.type!=='sonnet.receipt.v1'&&x.payload?.request_id===p.request_id&&x.payload?.contest_id===p.contest_id&&x.sender===p.sender_did);
    p.reference=candidates.length===1?'matched':candidates.length>1?'ambiguous':'missing';
    // A field correlation is not a content-hash binding or a proof of settlement.
  }
  return {room:input.room,checked_at:new Date().toISOString(),trust:{mode:trust,expected_did:trust==='sonnet'?REFEREE:trust==='custom'?custom:null,source:trust==='sonnet'?TRUST_SOURCE:null,source_checked:'2026-09-13'},results};
}
