const assert=require('node:assert/strict');
const {readFileSync,mkdirSync}=require('node:fs');
mkdirSync(require('node:path').resolve(__dirname,'../.sites-runtime'),{recursive:true});
const {resolve}=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const sample=JSON.parse(readFileSync(resolve(__dirname,'../dist/sample.json'),'utf8').replace(/^\uFEFF/,''));
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:'))external.push(r.url())});
  page.setDefaultTimeout(10000);
  const check=async(name,fn)=>{await fn();console.log('PASS',name)};
  const run=async(source)=>{await page.locator('#payload').fill(source);await page.locator('#room').fill('d-sonnet-2-rules');await page.locator('#inspect').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Inspected'))};
  try{
    await page.goto(base);await page.locator('h1').waitFor();
    await check('initial screen, keyboard order, no third-party requests',async()=>{
      assert(await page.locator('#download').isDisabled());
      assert(await page.evaluate(()=>Boolean(document.querySelector('#trust').compareDocumentPosition(document.querySelector('#inspect'))&Node.DOCUMENT_POSITION_FOLLOWING)));
      assert.deepEqual(external,[]);
    });
    await page.screenshot({path:resolve(__dirname,'../.sites-runtime/desktop-empty.png'),fullPage:true});
    await check('empty input gives actionable error',async()=>{await page.locator('#inspect').click();await page.locator('#error').filter({hasText:'Paste a message'}).waitFor()});
    await check('real signature and export',async()=>{
      await page.locator('#demo-valid').click();await page.locator('.result-banner strong').filter({hasText:'Valid signature'}).waitFor();
      const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);
      const data=JSON.parse(readFileSync(await download.path(),'utf8'));
      assert.equal(data.results[0].signature,'valid');assert.equal(data.results[0].text,sample.text);
    });
    await page.screenshot({path:resolve(__dirname,'../.sites-runtime/desktop-result.png'),fullPage:true});
    await check('tampered and unsigned demos',async()=>{
      await page.locator('#demo-tampered').click();await page.locator('.result-banner.bad').waitFor();
      await page.locator('#demo-unsigned').click();await page.locator('.result-banner.warn').waitFor();
    });
    await check('noncanonical signature suffix is rejected in the UI',async()=>{
      await run(JSON.stringify({...sample,sig:sample.sig+'\n'}));
      await page.locator('.result-banner.bad').waitFor();
      assert.match(await page.locator('.result-banner').textContent(),/canonical/);
    });
    await check('content security policy blocks inline scripts',async()=>{
      const blocked=await page.evaluate(()=>{
        const script=document.createElement('script');
        script.textContent='window.__injectedScriptRan = true';
        document.body.append(script);script.remove();
        return window.__injectedScriptRan!==true;
      });
      assert(blocked,'inline script unexpectedly executed');
    });
    await check('mixed batch summary, direct selection and paging',async()=>{
      const unsigned={...sample};delete unsigned.sig;
      await run(JSON.stringify([sample,{...sample,text:sample.text+'x'},unsigned]));
      assert.deepEqual(await page.locator('.batch-summary strong').allTextContents(),['3','1','1','1']);
      await page.locator('#record-index').selectOption('2');await page.locator('.result-banner.warn').waitFor();
      await page.locator('#previous').click();await page.locator('.result-banner.bad').waitFor();
      await page.locator('#previous').click();await page.locator('.result-banner:not(.bad):not(.warn)').waitFor();
    });
    await check('editing invalidates reports',async()=>{
      await page.locator('#room').fill('other');assert(await page.locator('#download').isDisabled());assert.equal(await page.locator('.result-banner').count(),0);
    });
    await check('malformed metadata renders safely and HTML stays inert',async()=>{
      await run(JSON.stringify({from:sample.from,nonce:{a:1},seq:{nested:true},ts:{x:2},text:'<img src=x onerror=alert(1)>',sig:sample.sig}));
      assert.equal(await page.locator('#results img').count(),0);assert.match(await page.locator('.text-output').textContent(),/<img/);
    });
    await check('custom DID validation and matching',async()=>{
      await page.locator('#trust').selectOption('custom');await page.locator('#custom-did').fill('bad');await page.locator('#inspect').click();await page.locator('#error').filter({hasText:'DID'}).waitFor();
      await page.locator('#custom-did').fill(sample.from);await run(JSON.stringify(sample));assert.match(await page.locator('#results').textContent(),/CUSTOM MATCH/);
      await page.locator('#trust').selectOption('sonnet');
    });
    await check('empty batch cannot export',async()=>{await run('[]');assert(await page.locator('#download').isDisabled());assert.match(await page.locator('#results').textContent(),/No messages/)});
    await check('stale sample response never overwrites user changes',async()=>{
      await page.route('**/sample.json',async route=>{await new Promise(r=>setTimeout(r,350));await route.fulfill({json:sample})});
      await page.locator('#demo-valid').click();await page.locator('#payload').fill('my new input');await page.waitForTimeout(500);
      assert.equal(await page.locator('#payload').inputValue(),'my new input');assert.equal(await page.locator('.result-banner').count(),0);await page.unroute('**/sample.json');
    });
    await check('cancel button stops a live batch',async()=>{
      await page.evaluate(()=>{const original=crypto.subtle.verify.bind(crypto.subtle);crypto.subtle.verify=async(...args)=>{await new Promise(r=>setTimeout(r,40));return original(...args)}});
      await page.locator('#payload').fill(JSON.stringify(Array(30).fill(sample)));await page.locator('#inspect').click();await page.locator('#cancel').click();await page.waitForTimeout(120);
      assert.match(await page.locator('#status').textContent(),/cancelled/);assert(await page.locator('#download').isDisabled());
    });
    await page.reload();await page.locator('h1').waitFor();
    await check('500-record batch and input limits',async()=>{
      await run(JSON.stringify(Array(500).fill({text:'hello'})));assert.match(await page.locator('#status').textContent(),/500/);
      await page.locator('#payload').fill(JSON.stringify(Array(501).fill({text:'hello'})));await page.locator('#inspect').click();await page.locator('#error').filter({hasText:'500'}).waitFor();
    });
    await check('responsive layout at phone, tablet and desktop widths',async()=>{
      await page.locator('#demo-valid').click();await page.locator('.result-banner strong').filter({hasText:'Valid signature'}).waitFor();
      for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`)}
      await page.setViewportSize({width:375,height:812});await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:resolve(__dirname,'../.sites-runtime/mobile.png'),fullPage:true});
    });
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS no JavaScript errors or external data requests');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
