import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,sign} from 'node:crypto';
import {inspect,parseExact,REFEREE} from '../dist/verify.mjs';
const sample=JSON.parse(readFileSync(new URL('../dist/sample.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const room='d-sonnet-2-rules';
const check=async(r,where=room)=>(await inspect(JSON.stringify(r),where)).results[0];
test('real official launch signature and scoped identity verify',async()=>{const r=await check(sample);assert.equal(r.signature,'valid');assert.equal(r.identity,'official-reference')});
test('tampering with text, nonce or room fails',async()=>{for(const r of [{...sample,text:sample.text+'x'},{...sample,nonce:'1789137697'}])assert.equal((await check(r)).signature,'invalid');assert.equal((await check(sample,'other-room')).signature,'invalid')});
test('absent signature and a forged signed flag are not evidence',async()=>{const r={...sample,signed:true};delete r.sig;assert.equal((await check(r)).signature,'unverifiable');assert.equal((await check(r)).identity,'unknown')});
test('noncanonical signature fails',async()=>{assert.equal((await check({...sample,sig:sample.sig.slice(0,-1)+'B'})).signature,'invalid')});
test('JSON parser retains 19-digit nonce and rejects duplicate keys',()=>{assert.equal(parseExact('{"nonce":1789298773777114405}').nonce,'1789298773777114405');assert.throws(()=>parseExact('{"nonce":1,"nonce":2}'));assert.throws(()=>parseExact('{"text":"a","text":"b"}'));assert.throws(()=>parseExact('{"a":1,}'))});
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const bytes=Buffer.concat([Buffer.from([0xed,1]),publicKey.export({type:'spki',format:'der'}).subarray(-32)]);
let n=BigInt('0x'+bytes.toString('hex')),b58='';while(n){b58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Number(n%58n)]+b58;n/=58n}
const did='did:key:z'+b58;
function make(text,nonce='1789298773777114405'){const sig=sign(null,Buffer.from(`${room}|${nonce}|${text}`),privateKey).toString('base64url');return {from:did,nonce,text,sig}}
test('19-digit numeric JSON nonce verifies without float rounding',async()=>{const r=make('ทดสอบ nonce');const raw=JSON.stringify(r).replace('"nonce":"1789298773777114405"','"nonce":1789298773777114405');assert.equal((await inspect(raw,room)).results[0].signature,'valid')});
test('valid attacker identity never becomes official; custom pin stays custom',async()=>{const record=make('hello');assert.equal((await check(record)).identity,'not-matched');const r=await inspect(JSON.stringify(record),room,'custom',did);assert.equal(r.results[0].identity,'custom-match')});
test('receipt correlation requires signer and request ID; no payment inference',async()=>{const req=make(JSON.stringify({type:'sonnet.register.v1',contest_id:'sonnet-2',request_id:'r1'}));const rec=make(JSON.stringify({type:'sonnet.receipt.v1',contest_id:'sonnet-2',request_id:'r1',sender_did:did,status:'accepted'}),'1789298773777114406');let r=await inspect(JSON.stringify([req,rec]),room);assert.equal(r.results[1].receipt.reference,'matched');assert.equal(r.results[1].receipt.authority,'unconfirmed');r=await inspect(JSON.stringify([rec]),room);assert.equal(r.results[0].receipt.reference,'missing');r=await inspect(JSON.stringify([req,req,rec]),room);assert.equal(r.results[2].receipt.reference,'ambiguous')});
test('JSONL, wrapper, Unicode and unsafe HTML stay text',async()=>{const r=make('<img src=x onerror=alert(1)> ไทย é');const report=await inspect(JSON.stringify(r)+'\n'+JSON.stringify(sample),room);assert.equal(report.results[0].signature,'valid');assert.equal((await inspect(JSON.stringify({room,messages:[r]}),'')).results[0].signature,'valid');await assert.rejects(()=>inspect(JSON.stringify({room:'other',messages:[r]}),room));assert.equal((await check({...r,text:r.text.normalize('NFD')})).signature,'invalid')});
test('malformed inputs fail intentionally',async()=>{for(const source of ['', 'null','[]']){if(source==='[]')assert.equal((await inspect(source,room)).results.length,0);else if(source==='null')assert.equal((await inspect(source,room)).results[0].signature,'invalid');else await assert.rejects(()=>inspect(source,room))}await assert.rejects(()=>inspect(JSON.stringify(Array(501).fill(sample)),room));await assert.rejects(()=>inspect(JSON.stringify(sample),'../escape'));await assert.rejects(()=>inspect(JSON.stringify(sample),room,'custom','bad'))});

test('BOM exports and room on a single record are accepted',async()=>{
  assert.equal((await inspect('\uFEFF'+JSON.stringify({room,messages:[sample]}),'')).results[0].signature,'valid');
  assert.equal((await inspect(JSON.stringify({...sample,room}),'')).results[0].signature,'valid');
});
test('invalid wrappers, excessive bytes, depth and room types fail clearly',async()=>{
  await assert.rejects(()=>inspect('{"messages":{}}',room),/messages/);
  await assert.rejects(()=>inspect(JSON.stringify(sample),null),/Room name/);
  await assert.rejects(()=>inspect('ก'.repeat(700000),room),/2 MiB/);
  assert.throws(()=>parseExact('['.repeat(52)+'0'+']'.repeat(52)),/50/);
});
test('lone surrogates cannot verify as the UTF-8 replacement character',async()=>{
  for(const text of ['\ud800','\udc00','x\ud800y']){
    const record=make(text);
    const r=await check(record);
    assert.equal(r.signature,'invalid');assert.match(r.reason,/Unicode/);
  }
  assert.equal((await check(make('ภาษาไทย 🔎'))).signature,'valid');
});
test('blank receipt references cannot correlate',async()=>{
  const req=make(JSON.stringify({type:'sonnet.register.v1',contest_id:'sonnet-2',request_id:''}));
  const rec=make(JSON.stringify({type:'sonnet.receipt.v1',contest_id:'sonnet-2',request_id:'',sender_did:did,status:'accepted'}));
  assert.equal((await inspect(JSON.stringify([req,rec]),room)).results[1].receipt.reference,'incomplete');
});
test('cancellation stops a batch and reports bounded progress',async()=>{
  const controller=new AbortController(),progress=[];
  await assert.rejects(()=>inspect(JSON.stringify([sample,sample]),room,'none','',{signal:controller.signal,onProgress(done,total){progress.push([done,total]);controller.abort()}}),{name:'AbortError'});
  assert.deepEqual(progress,[[1,2]]);
  await assert.rejects(()=>inspect(JSON.stringify(sample),room,'none','',{signal:controller.signal}),{name:'AbortError'});
});
test('unsupported crypto yields an explicit unsupported result',async()=>{
  const original=globalThis.crypto;
  try{Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});assert.equal((await check(sample)).signature,'unsupported')}
  finally{Object.defineProperty(globalThis,'crypto',{value:original,configurable:true})}
});

test('numeric text cannot borrow a signature over a string',async()=>{
  const r=await check({...make('123'),text:123});
  assert.equal(r.signature,'invalid');assert.match(r.reason,/text/);
});
test('trailing newlines cannot bypass canonical field validation',async()=>{
  for(const suffix of ['\n','\r','\u2028','\u2029']){
    assert.equal((await check({...sample,sig:sample.sig+suffix})).signature,'invalid');
    assert.equal((await check(make('hello','123'+suffix))).signature,'invalid');
    await assert.rejects(()=>inspect(JSON.stringify({room:room+suffix,messages:[]}),''),/room/i);
  }
});
test('room wrappers reject present but invalid room fields',async()=>{
  for(const value of ['',null,false,0,123]){
    await assert.rejects(()=>inspect(JSON.stringify({room:value,messages:[sample]}),room),/room/i);
  }
  await assert.rejects(()=>inspect('{"room":123,"messages":[]}',''),/room/i);
});
test('numeric receipt fields do not alias string references',async()=>{
  const req=make(JSON.stringify({type:'sonnet.register.v1',contest_id:'sonnet-2',request_id:'123'}));
  const receipt=(request_id,status='accepted')=>make(JSON.stringify({type:'sonnet.receipt.v1',contest_id:'sonnet-2',request_id,sender_did:did,status}));
  for(const rec of [receipt(123),receipt('123',1)]){
    const report=await inspect(JSON.stringify([req,rec]),room);
    assert.equal(report.results[1].signature,'valid');
    assert.equal(report.results[1].receipt.reference,'incomplete');
  }
  const numericReq=make(JSON.stringify({type:'sonnet.register.v1',contest_id:'sonnet-2',request_id:123}));
  assert.equal((await inspect(JSON.stringify([numericReq,receipt('123')]),room)).results[1].receipt.reference,'missing');
});
test('payload parser rejects duplicate and prototype keys cannot pollute objects',async()=>{
  const r=await check(make('{"type":"sonnet.receipt.v1","type":"other"}'));
  assert.equal(r.signature,'valid');assert.equal(r.receipt,null);
  const parsed=parseExact('{"__proto__":{"polluted":true},"constructor":1}');
  assert.equal(Object.getPrototypeOf(parsed),null);assert.equal({}.polluted,undefined);
});
