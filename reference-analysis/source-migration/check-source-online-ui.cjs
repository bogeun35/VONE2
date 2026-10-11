'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {handler}=require('./atlas-preview.cjs');
const mark=s=>{console.log('STAGE '+s);};
const report={timestamp:new Date().toISOString(),backend:'Actual Firebase RTDB; integrated UI; eight isolated Chrome contexts',checks:{},browserErrors:[],errors:[],passed:false};
const pages=[];let browser,server;
const wait=(p,f,a)=>p.waitForFunction(f,a,{timeout:45000});
const all=(f,a,clients=pages)=>Promise.all(clients.map(p=>wait(p,f,a)));
async function panel(p){if(!await p.locator('#online-panel').isVisible())await p.click('#online');}
async function run(){
 server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 for(let i=0;i<8;i++){
  const context=await browser.newContext(),p=await context.newPage();pages.push(p);p.setDefaultTimeout(45000);p.on('pageerror',e=>report.browserErrors.push({client:i,error:e.message}));
  mark('load client '+i);await p.goto(`http://127.0.0.1:${server.address().port}/play/?mute=1`);await wait(p,()=>window.SourceParkOnline?.app.getState());await p.click('#online');
  if(i===0){await p.click('#room-create');await wait(p,()=>SourceParkOnline.net?.code&&SourceParkOnline.net.room);report.code=await p.evaluate(()=>SourceParkOnline.net.code);}
  else{await p.fill('#room-code',report.code);await p.click('#room-join');await wait(p,()=>SourceParkOnline.net?.room?.players[SourceParkOnline.net.id]);await p.click('#room-ready');}await p.evaluate(()=>{window.networkDiagnostics={id:SourceParkOnline.net.id,errors:[],transactions:[]};const net=SourceParkOnline.net,oldError=net.onError;net.onError=error=>{networkDiagnostics.errors.push(error);oldError?.(error);};const ref=net.ref,oldTransaction=ref.transaction.bind(ref);ref.transaction=(...args)=>oldTransaction(...args).then(result=>{networkDiagnostics.transactions.push({committed:result.committed,exists:result.snapshot.exists()});return result;});});
 }
 mark('eight rosters');await all(()=>document.querySelectorAll('#room-members .room-member').length===8);report.checks.eightUiRosters=true;
 await wait(pages[0],()=>!document.getElementById('room-start').disabled);await pages[0].click('#room-start');
 await all(()=>SourceParkOnline.app.getState()?.players.length===8&&SourceParkOnline.app.getState().status==='play'&&!SourceParkOnline.app.isPaused());report.checks.eightUiGamesStarted=true;
 mark('movement');const peer=pages[7],ownId=await peer.evaluate(()=>SourceParkOnline.net.id);
 const before=await pages[0].evaluate(()=>SourceParkOnline.app.getState().players.map(p=>({id:p.id,x:p.x})));
 await peer.keyboard.press('Digit1');await peer.keyboard.down('ArrowLeft');
 await wait(pages[0],({id,x})=>SourceParkOnline.app.getState().players.find(p=>p.id===id).x<x-12,{id:ownId,x:before.find(p=>p.id===ownId).x});
 await peer.keyboard.up('ArrowLeft');
 const after=await pages[0].evaluate(()=>SourceParkOnline.app.getState().players.map(p=>({id:p.id,x:p.x})));
 assert(after.find(p=>p.id===ownId).x<before.find(p=>p.id===ownId).x-12);
 for(const p of before.filter(p=>p.id!==ownId))assert(Math.abs(after.find(q=>q.id===p.id).x-p.x)<1,'Digit1 must not redirect peer controls to another player');
 report.checks.guestOwnMovementAndDigitIsolation=true;
 await peer.keyboard.down('ArrowRight');await wait(pages[0],({id,x})=>SourceParkOnline.app.getState().players.find(p=>p.id===id).x>x+12,{id:ownId,x:after.find(p=>p.id===ownId).x});await peer.keyboard.up('ArrowRight');report.checks.guestRightMovement=true;
 mark('pause/resume');await pages[0].keyboard.press('Backspace');await all(()=>SourceParkOnline.app.isPaused());
 await all(()=>SourceParkOnline.net.room.snapshot.paused);report.checks.hostPausePropagated=true;
 const stopped=await pages[0].evaluate(()=>SourceParkOnline.app.getState().players.map(p=>({id:p.id,x:p.x,y:p.y})));
 await all(expected=>expected.every(p=>{const q=SourceParkOnline.app.getState().players.find(q=>q.id===p.id);return Math.abs(q.x-p.x)<1&&Math.abs(q.y-p.y)<1;}),stopped);report.checks.snapshotMirroredToAll=true;
 await peer.keyboard.press('Backspace');assert(await peer.evaluate(()=>SourceParkOnline.app.isPaused()));report.checks.guestCannotResumeHostPause=true;
 mark('pause/resume');await pages[0].keyboard.press('Backspace');await all(()=>!SourceParkOnline.app.isPaused());report.checks.hostResumePropagated=true;
 mark('host leave');await pages[0].evaluate(()=>window.cleanupDb=SourceParkOnline.net.db);await panel(pages[0]);await pages[0].click('#room-leave');
 const remaining=pages.slice(1);await all(()=>SourceParkOnline.net.room.status==='lobby'&&Object.keys(SourceParkOnline.net.room.players).length===7,undefined,remaining);
 const hosts=await Promise.all(remaining.map(p=>p.evaluate(()=>SourceParkOnline.net.host)));assert.equal(hosts.filter(Boolean).length,1);report.checks.hostDepartureElectsNewHostAndLobby=true;
 mark('restart');const newHost=remaining[hosts.indexOf(true)];
 await wait(newHost,()=>document.getElementById('room-start').disabled);
 for(const p of remaining)if(p!==newHost)await p.click('#room-ready');
 await wait(newHost,()=>!document.getElementById('room-start').disabled);await newHost.click('#room-start');
 await all(()=>SourceParkOnline.app.getState()?.players.length===7&&SourceParkOnline.app.getState().status==='play'&&!SourceParkOnline.app.isPaused(),undefined,remaining);report.checks.sevenUiClientsRestartAfterReadiness=true;
 for(const stageId of ['st_w_01_02','st_w_01_03','st_w_01_04']){
  mark('stage selection '+stageId);await newHost.keyboard.press('KeyR');await all(()=>SourceParkOnline.net.room.status==='lobby',undefined,remaining);
  await newHost.selectOption('#stage',stageId);await all(id=>SourceParkOnline.net.room.stageId===id,stageId,remaining);
  for(const p of remaining)if(p!==newHost){assert(await p.locator('#stage').isDisabled());await p.click('#room-ready');}
  await wait(newHost,()=>!document.getElementById('room-start').disabled);await newHost.click('#room-start');
  await all(id=>SourceParkOnline.app.getState()?.map.id===id&&SourceParkOnline.app.getState().status==='play',stageId,remaining);
  await newHost.keyboard.press('Backspace');await all(()=>SourceParkOnline.app.isPaused(),undefined,remaining);
  const dynamic=await newHost.evaluate(()=>JSON.stringify({devices:SourceParkOnline.app.getState().deviceState,motion:SourceParkOnline.app.getState().motionState,gates:SourceParkOnline.app.getState().gateState,keyActive:SourceParkOnline.app.getState().keyActive}));
  await all(expected=>JSON.stringify({devices:SourceParkOnline.app.getState().deviceState,motion:SourceParkOnline.app.getState().motionState,gates:SourceParkOnline.app.getState().gateState,keyActive:SourceParkOnline.app.getState().keyActive})===expected,dynamic,remaining);
 }
 report.checks.multipleStageSelectionAndDeviceStateSync=true;
 mark('UI leave all');for(const p of remaining.slice().reverse()){await panel(p);await p.click('#room-leave',{timeout:5000});await wait(p,()=>!SourceParkOnline.net);}report.checks.allClientsExitThroughUi=true;report.networkDiagnostics=await Promise.all(pages.map(p=>p.evaluate(()=>window.networkDiagnostics)));console.log(JSON.stringify(report.networkDiagnostics));assert.deepEqual(report.networkDiagnostics.flatMap(client=>client.errors),[],'network callbacks must report no errors');
}
async function cleanup(){mark('cleanup');
 await Promise.all(pages.map(async p=>{try{await p.evaluate(async()=>{const control=window.SourceParkOnline;if(control?.net?.ref){control.active=false;await Promise.race([control.net.leave(),new Promise((_,reject)=>setTimeout(()=>reject(Error('leave timeout')),5000))]);}});}catch(e){report.errors.push('cleanup '+e.message);}}));
 if(report.code&&pages.length){try{let value;for(let attempt=0;attempt<30;attempt++){value=await pages[0].evaluate(async code=>{const url='https://rolling2-17a8f-default-rtdb.asia-southeast1.firebasedatabase.app/games/park_source_'+code+'.json';return fetch(url,{cache:'no-store'}).then(r=>r.json());},report.code);if(value===null)break;await new Promise(r=>setTimeout(r,100));}assert.equal(value,null);report.checks.emptyTestRoomDeleted=true;}catch(e){report.errors.push('room deletion '+e.message);}}
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
}
(async()=>{try{await run();}catch(e){report.errors.push(e.stack||String(e));console.log('FAIL '+e.stack);for(let i=0;i<pages.length;i++){try{report['client'+i]=await pages[i].evaluate(()=>({message:document.getElementById('room-message').textContent,roomStatus:window.SourceParkOnline?.net?.room?.status,stateStatus:window.SourceParkOnline?.app.getState()?.status,paused:window.SourceParkOnline?.app.isPaused(),active:window.SourceParkOnline?.active,host:window.SourceParkOnline?.net?.host,snapshot:window.SourceParkOnline?.net?.room?.snapshot&&{runId:SourceParkOnline.net.room.snapshot.runId,ticks:SourceParkOnline.net.room.snapshot.ticks,paused:SourceParkOnline.net.room.snapshot.paused,count:SourceParkOnline.net.room.snapshot.count}}));}catch{}}}finally{console.log(JSON.stringify(report));await cleanup();}report.passed=Object.keys(report.checks).length===13&&!report.errors.length&&!report.browserErrors.length;fs.writeFileSync(path.join(__dirname,'source-online-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;})();






