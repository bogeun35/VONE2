'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {handler}=require('./atlas-preview.cjs');
(async()=>{
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const report={tested:[],pageErrors:[],audio:'muted',passed:false};
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--mute-audio']});
  const page=await browser.newPage({viewport:{width:1440,height:1024}});page.on('pageerror',e=>report.pageErrors.push(e.stack));
  await page.goto(`http://127.0.0.1:${server.address().port}/play/?mute=1`);
  const {stages}=JSON.parse(fs.readFileSync(path.join(__dirname,'play/catalogue.json')));
  for(const stage of stages)for(let count=2;count<=8;count++){
   await page.selectOption('#stage',stage.id);await page.selectOption('#count',String(count));
   await page.waitForFunction(({id,count})=>{const s=SourceParkOnline.app.getState();return s?.map.id===id&&s.players.length===count;},{id:stage.id,count});
   await page.click('#start');await page.waitForFunction(()=>SourceParkOnline.app.getState().ticks>=4);
   assert.equal(await page.evaluate(()=>SourceParkOnline.app.getState().status),'play');
   if(count===2)await page.screenshot({path:path.join(__dirname,stage.id+'-review.png')});
   report.tested.push({stage:stage.id,count});
  }
  assert.deepEqual(report.pageErrors,[]);report.passed=true;
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(__dirname,'stage-selection-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,combinations:report.tested.length,errors:report.pageErrors}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
