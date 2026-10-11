'use strict';
// Real-browser, real-RTDB check for the original loss rule: one player going out
// of bounds loses the round for the whole party, and the same stage restarts
// immediately without sending anyone back to the waiting room.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {handler}=require('./atlas-preview.cjs');
const CLIENTS=Number(process.env.PARK_CLIENTS||2);
const mark=s=>{report.lastStage=s;(report.stages||(report.stages=[])).push(s);console.log('STAGE '+s);};
const report={timestamp:new Date().toISOString(),clients:CLIENTS,backend:'Actual Firebase RTDB',checks:{},browserErrors:[],errors:[],passed:false};
const pages=[];let browser,server;
const wait=(p,f,a)=>p.waitForFunction(f,a,{timeout:45000});
const all=(f,a)=>Promise.all(pages.map(p=>wait(p,f,a)));

async function run(){
 server=http.createServer(handler);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args:['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 let code=null; // the host generates its own room code

 for(let i=0;i<CLIENTS;i++){
  const context=await browser.newContext(),p=await context.newPage();
  pages.push(p);p.setDefaultTimeout(45000);
  p.on('pageerror',e=>report.browserErrors.push({client:i,error:e.message}));
  mark('load client '+i);
  await p.goto(`http://127.0.0.1:${server.address().port}/play/?mute=1`);
  await wait(p,()=>window.SourceParkOnline?.app.getState());
  await p.click('#online');
  if(i===0){await p.click('#room-create');await wait(p,()=>SourceParkOnline.net?.code&&SourceParkOnline.net.room);
   code=await p.evaluate(()=>SourceParkOnline.net.code);report.code=code;}
  else{await p.fill('#room-code',code);await p.click('#room-join');
   await wait(p,()=>SourceParkOnline.net?.room?.players[SourceParkOnline.net.id]);
   await p.click('#room-ready');}
 }
 assert.ok(code,'host room code');

 mark('roster');
 await all(n=>document.querySelectorAll('#room-members .room-member').length===n,CLIENTS);
 await wait(pages[0],()=>!document.getElementById('room-start').disabled);

 // Record every room status each client observes, so a hidden lobby bounce cannot pass.
 for(const p of pages)await p.evaluate(()=>{window.__seen=[];setInterval(()=>{
  const s=window.SourceParkOnline?.net?.room?.status;if(s&&window.__seen[window.__seen.length-1]!==s)window.__seen.push(s);},25);});

 mark('start round');
 await pages[0].click('#room-start');
 await all(n=>SourceParkOnline.app.getState()?.players.length===n&&SourceParkOnline.app.getState().status==='play'&&!SourceParkOnline.app.isPaused(),CLIENTS);
 report.checks.roundStarted=true;
 for(const p of pages)await p.evaluate(()=>{window.__seen=[];window.__pub=[];window.__t0=performance.now();
  const c=window.SourceParkOnline,net=c.net,orig=net.publish.bind(net);
  net.publish=snap=>{window.__pub.push({t:Math.round(performance.now()-window.__t0),status:snap.status,runId:snap.runId,restarting:!!c.restarting});return orig(snap);};
  window.__roomLog=[];setInterval(()=>{const st=net.room?.status;const last=window.__roomLog[window.__roomLog.length-1];
   if(st&&(!last||last.status!==st))window.__roomLog.push({t:Math.round(performance.now()-window.__t0),status:st});},20);});

 const before=await Promise.all(pages.map(p=>p.evaluate(()=>({runId:SourceParkOnline.runId,stage:SourceParkOnline.app.getState().map.id}))));
 assert.equal(new Set(before.map(b=>b.runId)).size,1,'all clients share one run');
 report.runIdBefore=before[0].runId;report.stage=before[0].stage;

 mark('force one player out of bounds on the host');
 await pages[0].evaluate(()=>{const s=SourceParkOnline.app.getState();s.players[0].y=s.map.killY+200;s.players[0].vy=0;});

 mark('every client loses the round');
 await all(()=>SourceParkOnline.app.getState()?.status==='dead');
 report.checks.wholePartyLost=true;

 mark('same stage restarts for everyone without a lobby');
 await all(id=>SourceParkOnline.app.getState()?.status==='play'&&SourceParkOnline.runId&&SourceParkOnline.runId!==id,report.runIdBefore);
 // The 20ms status sampler lags the app state it is sampling; let it settle so
 // the sequence assertions below read a finished stream, not a half-written one.
 await all(()=>window.__seen.length>0&&window.__seen[window.__seen.length-1]==='game');
 const after=await Promise.all(pages.map(p=>p.evaluate(()=>({runId:SourceParkOnline.runId,stage:SourceParkOnline.app.getState().map.id,
  players:SourceParkOnline.app.getState().players.length,seen:window.__seen,paused:SourceParkOnline.app.isPaused(),
  host:!!SourceParkOnline.net.host,pub:window.__pub||[]}))));
 assert.equal(new Set(after.map(a=>a.runId)).size,1,'restart shares one new run');
 assert.notEqual(after[0].runId,report.runIdBefore);
 for(const a of after){
  assert.equal(a.stage,report.stage,'the stage must not change');
  assert.equal(a.players,CLIENTS,'every player returns');
  assert.equal(a.paused,false,'the restart is live, not paused');
  assert.ok(!a.seen.includes('lobby'),'nobody may be sent back to the waiting room: '+JSON.stringify(a.seen));
  if(a.host){
   // The host's own room-status stream interleaves local optimistic writes with
   // delayed server confirmations, so it is not evidence of what was sent. The
   // publish log is: it must cross from the lost round to the new one once and
   // never go back.
   const statuses=a.pub.map(entry=>entry.status);
   assert.ok(statuses.length>=2,'the host must publish the loss and the restart: '+JSON.stringify(statuses));
   const firstPlay=statuses.indexOf('play');
   assert.ok(firstPlay>0,'the loss must be published before the restart: '+JSON.stringify(statuses));
   assert.ok(statuses.slice(0,firstPlay).every(v=>v==='dead'),'only the loss may precede the restart: '+JSON.stringify(statuses));
   assert.ok(statuses.slice(firstPlay).every(v=>v==='play'),'the lost round must not be published again: '+JSON.stringify(statuses));
   const runs=a.pub.map(entry=>entry.runId);
   assert.equal(new Set(runs.slice(0,firstPlay)).size,1,'the loss belongs to one run');
   assert.equal(new Set(runs.slice(firstPlay)).size,1,'the restart belongs to one run');
   assert.notEqual(runs[firstPlay],runs[0],'the restart must be a new run');
  }else{
   assert.equal(a.seen.filter(v=>v==='dead').length,1,'a peer must see the round lost exactly once: '+JSON.stringify(a.seen));
   assert.equal(a.seen[a.seen.length-1],'game','a peer must end back in play: '+JSON.stringify(a.seen));
  }
 }
 report.runIdAfter=after[0].runId;report.observedStatuses=after[0].seen;
 report.checks.sameStageRestarted=true;report.checks.noLobbyBounce=true;

 mark('spawn positions are restored');
 const spawned=await pages[0].evaluate(()=>{const s=SourceParkOnline.app.getState();
  return s.players.every((p,i)=>Math.abs(p.x-s.map.spawns[i].x)<1&&p.y<s.map.killY);});
 assert.equal(spawned,true,'players restart from the original spawns');
 report.checks.respawnedAtSourceSpawns=true;

 report.passed=report.browserErrors.length===0;
 assert.deepEqual(report.browserErrors,[],'no page errors');
}

run().catch(e=>{report.errors.push(e.message);}).finally(async()=>{
 if(report.errors.length){report.diagnostics=[];
  for(const p of pages){try{report.diagnostics.push(await p.evaluate(()=>{const n=window.SourceParkOnline?.net;const st=window.SourceParkOnline?.app?.getState?.();
   return {id:n?.id?.slice(-4),code:n?.code,host:n?.host,roomStatus:n?.room?.status,roomHost:n?.room?.host?.slice(-4),
    members:Object.keys(n?.room?.players||{}).map(k=>k.slice(-4)),ready:Object.values(n?.room?.players||{}).map(v=>!!v.ready),
    startDisabled:document.getElementById('room-start')?.disabled,message:document.getElementById('room-message')?.textContent,
    state:st&&{status:st.status,players:st.players.length},runId:window.SourceParkOnline?.runId,seen:window.__seen,pub:window.__pub,roomLog:window.__roomLog};}));}catch(e){report.diagnostics.push({error:e.message});}}
 }
 for(const p of pages){try{await p.evaluate(()=>window.SourceParkOnline?.leave());}catch{}}
 try{await browser?.close();}catch{}
 try{server?.close();}catch{}
 fs.writeFileSync(path.join(__dirname,'play','source-death-restart-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,browserErrors:report.browserErrors},null,1));
 process.exit(report.passed?0:1);
});
