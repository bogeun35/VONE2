'use strict';
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');let browser,server;
(async()=>{
 server=http.createServer(require('./atlas-preview.cjs').handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--mute-audio']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let api;Object.defineProperty(window,'SourceStageRuntime',{configurable:true,get(){return api},set(value){api={...value,create(...args){const s=value.create(...args);window.__sourceTestState=s;return s}}}});});
 await page.addInitScript(()=>{const OriginalAudio=window.Audio;window.Audio=function(...args){const a=new OriginalAudio(...args);window.__sourceTestMusic=a;return a;};});
 await page.goto(`http://127.0.0.1:${server.address().port}/play/?mute=1`);
 for(let count=2;count<=8;count++){
  await page.locator('#count').selectOption(String(count));
  await page.waitForFunction(n=>window.__sourceTestState?.players.length===n,count);
  await page.locator('#game').focus();await page.keyboard.press('Enter');await page.keyboard.press('Digit'+count);
  const before=await page.evaluate(n=>window.__sourceTestState.players[n-1].x,count);
  await page.keyboard.down('ArrowRight');try{await page.waitForFunction(({n,x})=>window.__sourceTestState.players[n-1].x>x+12,{n:count,x:before},{timeout:5000});}catch(e){console.error(JSON.stringify({count,errors,ui:await page.evaluate(()=>({paused:SourceParkOnline.app.isPaused(),online:SourceParkOnline.active,cover:document.getElementById('cover').hidden,ticks:window.__sourceTestState.ticks}))}));throw e;}await page.keyboard.up('ArrowRight');
  assert.equal(await page.evaluate(()=>window.__sourceTestState.status),'play');
  await page.keyboard.press('Backspace');assert.equal(await page.locator('#cover').isVisible(),true);
 }
 await page.locator('#count').selectOption('2');await page.waitForFunction(()=>window.__sourceTestState?.players.length===2);
 await page.locator('#game').focus();await page.keyboard.press('Enter');
 await page.screenshot({path:path.join(__dirname,'play/verified-first-source.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>window.__sourceTestMusic.paused),true,'mute query prevents music playback');
 await page.goto(`http://127.0.0.1:${server.address().port}/play/`);
 await page.waitForFunction(()=>window.__sourceTestState?.players.length===2);await page.locator('#game').focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.__sourceTestMusic.currentTime>.1,{},{timeout:15000});
 assert.equal(await page.evaluate(()=>window.__sourceTestMusic.error),null);assert.equal(await page.evaluate(()=>window.__sourceTestMusic.loop),true);
 await page.keyboard.press('Backspace');assert.equal(await page.evaluate(()=>window.__sourceTestMusic.paused),true);
 await page.keyboard.press('KeyM');assert.equal(await page.locator('#music').getAttribute('aria-pressed'),'false');
 await page.keyboard.press('KeyT');await page.waitForFunction(()=>window.__sourceTestState?.players.length===8&&window.__sourceTestState.ticks>10);
 await page.keyboard.press('KeyV');assert.equal(await page.locator('#replay-speed').textContent(),'×4');
 assert.equal(await page.evaluate(()=>window.__sourceTestMusic.paused),true,'automatic input replay must stay silent');
 assert.equal(await page.evaluate(()=>window.__sourceTestState.status),'play');await page.keyboard.press('Backspace');assert.equal(await page.locator('#cover').isVisible(),true);
 await page.goto(`http://127.0.0.1:${server.address().port}/play/review.html`);await page.waitForFunction(()=>document.querySelectorAll('#populations .card').length===7);
 assert.match(await page.locator('#summary').textContent(),/63\/63/);
 assert.deepEqual(errors,[]);
 const report={passed:true,populations:[2,3,4,5,6,7,8],keyboardStartMovementAndPause:true,musicDecodeLoopPauseToggle:true,muteQueryPreventsPlayback:true,inputReplayStartsEightAndStaysSilent:true,replaySpeedKeyboardToggle:true,reviewCardsAndReport:true,audio:'Chrome --mute-audio throughout',pageErrors:errors,scope:'Original world01-01 local connection; full routes and native fidelity not validated'};
 fs.writeFileSync(path.join(__dirname,'play/browser-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
