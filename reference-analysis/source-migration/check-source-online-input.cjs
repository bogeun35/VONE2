'use strict';
// Real-browser, real-RTDB check that every player's keyboard drives their own
// character at the same time in an online room, and that every player can
// restart the round. Each player is a separate browser context (separate
// storage, separate Firebase connection), keys are dispatched to each page on
// its own, and the verdict comes from what each client sent and what the host
// actually applied on each tick - not from the room stream (HANDOFF trap 4).
//
// Usage:
//   PUPPETEER_CORE=<path to puppeteer-core> BROWSER_URL=http://localhost:9224 \
//     node check-source-online-input.cjs [players=2] [page url]
// Without a page url the local play/ folder is served on a random port.
// The pages are muted at the document level; nothing reaches the speakers.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const puppeteer=require(process.env.PUPPETEER_CORE||'puppeteer-core');
const {handler}=require('./atlas-preview.cjs');
const COUNT=Number(process.argv[2]||2);
const BASE=process.argv[3]||'';
const report={timestamp:new Date().toISOString(),players:COUNT,page:BASE||'local play/',backend:'Actual Firebase RTDB',scenarios:{},failures:[],errors:[],browserErrors:[],passed:false};
const pages=[],contexts=[];let browser,server;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=(page,fn,arg,timeout=45000)=>page.waitForFunction(fn,{timeout,polling:50},arg);
const all=(fn,arg,t)=>Promise.all(pages.map(p=>until(p,fn,arg,t)));
// Eight browsers on one computer render slowly; give their UI more time.
const WAIT=COUNT>4?20000:8000;
const fail=(scenario,why)=>{report.failures.push(scenario+': '+why);console.log('  FAIL',why);};

// The game must never reach the speakers of the machine running this check.
const SILENCE=`(()=>{try{const AC=window.AudioContext||window.webkitAudioContext;
 if(AC){const Wrapped=function(...a){const c=new AC(...a);try{c.suspend();}catch{}c.resume=()=>Promise.resolve();return c;};Wrapped.prototype=AC.prototype;window.AudioContext=window.webkitAudioContext=Wrapped;}
 HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};}catch{}})();`;

async function open(i){
 const context=await browser.createBrowserContext();contexts.push(context);
 const page=await context.newPage();pages.push(page);
 const cdp=await page.createCDPSession();
 // Each page behaves as the focused, foreground window of its own computer.
 await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 try{await cdp.send('Page.setWebLifecycleState',{state:'active'});}catch{}
 await page.evaluateOnNewDocument(SILENCE);
 page.on('pageerror',e=>report.browserErrors.push({client:i,error:e.message}));
 const url=(BASE||`http://127.0.0.1:${server.address().port}/play/`)+(BASE.includes('?')?'&':'?')+'mute=1';
 await page.goto(url,{waitUntil:'load'});
 await until(page,()=>window.SourceParkOnline?.app.getState());
 return page;
}

// What each client sent, published and showed as an error; on the host, the
// input every player had on every simulated tick.
async function instrument(page){
 await page.evaluate(()=>{
  if(window.__probe)return;
  const c=window.SourceParkOnline;
  const L=window.__probe={sent:[],pub:[],errors:[],applied:[],seen:[]};
  const now=()=>Date.now();
  const wrap=net=>{
   if(!net||net.__wrapped)return;net.__wrapped=true;
   const input=net.input.bind(net);net.input=v=>{L.sent.push({t:now(),right:!!v.right,left:!!v.left,jump:!!v.jump});return input(v);};
   const publish=net.publish.bind(net);net.publish=s=>{L.pub.push({t:now(),status:s.status,runId:s.runId});return publish(s);};
   const onError=net.onError;net.onError=e=>{L.errors.push({t:now(),e:String(e)});return onError&&onError(e);};
  };
  wrap(c.net);setInterval(()=>wrap(c.net),100);
  setInterval(()=>{const sn=c.net?.room?.snapshot;const k=sn&&sn.runId+':'+sn.ticks;if(k&&L.seen[L.seen.length-1]?.k!==k)L.seen.push({t:Date.now(),k});},5);
  const step=SourceStageRuntime.step;
  // One call may advance several native ticks when frames are slow, so each
  // row records how many ticks ran with that input.
  SourceStageRuntime.step=(s,inputs,dt)=>{
   const record=c.net?.host&&s===c.app.getState(),ticks=s.ticks,out=step(s,inputs,dt);
   if(record&&s.ticks>ticks){const row={t:now(),run:c.runId,n:s.ticks-ticks,r:{},l:{},j:{}};
    for(const p of s.players){row.r[p.id]=!!inputs?.[p.id]?.right;row.l[p.id]=!!inputs?.[p.id]?.left;row.j[p.id]=!!inputs?.[p.id]?.jump;}L.applied.push(row);}
   return out;
  };
 });
}
const probe=page=>page.evaluate(()=>{const c=window.SourceParkOnline,s=c.app.getState();
 return {id:c.net?.id,host:!!c.net?.host,runId:c.runId,status:s?.status,roomStatus:c.net?.room?.status,paused:c.app.isPaused(),
  xs:Object.fromEntries((s?.players||[]).map(p=>[p.id,Math.round(p.x*10)/10])),
  message:document.getElementById('room-message')?.textContent||'',t:Date.now()};});
const snapshotAll=()=>Promise.all(pages.map(probe));
const hostPage=async()=>{const a=await snapshotAll();return pages[a.findIndex(x=>x.host)];};

// A held key on a real keyboard repeats (keydown with repeat) until released.
async function press(page,code,ms){
 await page.keyboard.down(code);
 const end=Date.now()+ms;while(Date.now()+50<end){await sleep(50);await page.keyboard.down(code);}
 await sleep(Math.max(0,end-Date.now()));await page.keyboard.up(code);
}

async function scenario(name,plan,retry=true){
 console.log('==',name);
 await sleep(400);
 const before=await snapshotAll(),t0=before.map(b=>b.t);
 await Promise.all(plan.map(async step=>{await sleep(step.delay||0);await press(pages[step.client],step.code,step.ms);}));
 await sleep(900); // let the last snapshot reach every peer
 const after=await snapshotAll();
 const hostIndex=after.findIndex(a=>a.host),host=pages[hostIndex];
 const applied=await host.evaluate(t=>window.__probe.applied.filter(r=>r.t>=t),t0[hostIndex]);
 // A round lost mid-scenario (someone walked off the map) restarts with new
 // spawns; that measures the level, not the input path, so run it again once.
 if(new Set(applied.map(r=>r.run)).size>1||before[hostIndex].runId!==after[hostIndex].runId){
  console.log('  round restarted during the scenario; repeating');
  if(retry){await sleep(1500);return scenario(name,plan,false);}
  fail(name,'the round restarted twice during the scenario');return null;
 }
 const result={plan:plan.map(s=>({client:s.client,code:s.code,ms:s.ms,delay:s.delay||0})),perClient:[],
  screens:after.map((a,i)=>({host:a.host,runBefore:before[i].runId,runAfter:a.runId,status:a.status}))};
 // The host's simulation runs slower than real time when its frames are slow
 // (each frame advances at most three native ticks), so expectations use the
 // tick rate it actually achieved during the scenario.
 const wall=Math.max(1,applied.length?applied[applied.length-1].t-applied[0].t:1),achieved=applied.reduce((a,r)=>a+r.n,0);
 const rate=Math.min(60,achieved*1000/wall);result.hostTickRate=Math.round(rate*10)/10;
 for(let i=0;i<pages.length;i++){
  const id=before[i].id,pressedBy=plan.filter(s=>s.client===i);
  const field=pressedBy[0]&&/Left|KeyA/.test(pressedBy[0].code)?'l':'r';
  const sent=await pages[i].evaluate(t=>window.__probe.sent.filter(r=>r.t>=t),t0[i]);
  const appliedTicks=applied.filter(r=>r[field][id]).reduce((a,r)=>a+r.n,0);
  const firstSent=sent.find(r=>r[field==='l'?'left':'right']),firstApplied=applied.find(r=>r[field][id]);
  const expected=pressedBy.reduce((a,s)=>a+Math.round(s.ms*rate/1000),0);
  const moved={};for(let j=0;j<pages.length;j++)moved['screen'+j]=Math.round(((after[j].xs[id]??0)-(before[j].xs[id]??0))*10)/10;
  const row={client:i,host:i===hostIndex,pressed:pressedBy.map(s=>s.code+' '+s.ms+'ms').join(', ')||'-',
   sentPresses:sent.filter(r=>r.right||r.left).length,expectedTicks:expected,hostAppliedTicks:appliedTicks,
   latencyMs:i===hostIndex?0:firstSent&&firstApplied?firstApplied.t-firstSent.t:null,moved};
  result.perClient.push(row);
  console.log('  c'+i+(row.host?'H':' '),row.pressed,'exp',expected,'applied',appliedTicks,'lat',row.latencyMs,JSON.stringify(moved));
  if(pressedBy.length){
   if(appliedTicks<expected*0.8)fail(name,`client ${i} pressed ${expected} ticks but the host applied ${appliedTicks}`);
   if(row.latencyMs!==null&&row.latencyMs>700)fail(name,`client ${i} input reached the simulation after ${row.latencyMs}ms`);
  }else if(appliedTicks)fail(name,`client ${i} never pressed but the host applied ${appliedTicks} ticks`);
  // Peer screens show the host's state a snapshot or two late; a body still
  // falling or sliding after the keys are released may differ by a few pixels.
  const spread=Object.values(moved);if(Math.max(...spread)-Math.min(...spread)>6)fail(name,`client ${i} ends at different places on different screens ${JSON.stringify(moved)}`);
 }
 result.snapshotCadence=await Promise.all(pages.map((p,i)=>i===hostIndex?null:p.evaluate((a,b)=>{
  const s=window.__probe.seen.filter(r=>r.t>=a&&r.t<=b),g=s.slice(1).map((r,k)=>r.t-s[k].t).sort((x,y)=>x-y);
  return {updates:s.length,medianGapMs:g[g.length>>1]??null,maxGapMs:g[g.length-1]??null};},before[i].t,after[i].t)));
 for(const [i,c] of result.snapshotCadence.entries())if(c&&(c.updates<5||c.maxGapMs>800))fail(name,`client ${i} screen received ${c.updates} snapshots, longest gap ${c.maxGapMs}ms`);
 const errs=await host.evaluate(t=>window.__probe.errors.filter(r=>r.t>=t).map(r=>r.e),t0[hostIndex]);
 result.host={publishCalls:await host.evaluate(t=>window.__probe.pub.filter(r=>r.t>=t).length,t0[hostIndex]),errors:errs.length,errorKinds:[...new Set(errs)]};
 if(errs.length)fail(name,`host showed ${errs.length} network errors ${JSON.stringify(result.host.errorKinds)}`);
 console.log('  cadence',JSON.stringify(result.snapshotCadence.filter(Boolean)[0]),'host',JSON.stringify(result.host));
 report.scenarios[name]=result;
 return result;
}

// A restart asked by one client must reach every screen as one new run.
async function restart(name,client,how){
 console.log('==',name);
 await sleep(300);
 const before=await snapshotAll(),runId=before.find(b=>b.host).runId;
 const t=Date.now();
 if(how==='key')await pages[client].keyboard.press('KeyR');
 else await pages[client].click(how);
 let ok=true;
 try{await all(id=>{const c=SourceParkOnline;return c.runId&&c.runId!==id&&c.app.getState()?.status==='play'&&!c.app.isPaused();},runId,6000);}catch{ok=false;}
 const after=await snapshotAll();
 const result={client,how,ms:Date.now()-t,runs:[...new Set(after.map(a=>a.runId))],restarted:ok&&new Set(after.map(a=>a.runId)).size===1};
 // The new round must not open with jumps nobody pressed.
 await sleep(700);
 const host=await hostPage();
 const phantom=await host.evaluate((t,runs)=>{const rows=window.__probe.applied.filter(r=>r.t>=t&&runs.includes(r.run));const out={};for(const r of rows)for(const [id,j] of Object.entries(r.j))if(j)out[id]=(out[id]||0)+r.n;return out;},t,result.runs);
 result.phantomJumpTicks=phantom;
 console.log(' ',JSON.stringify(result));
 if(!result.restarted)fail(name,`no shared restart within 6s: runs ${JSON.stringify(result.runs)} statuses ${JSON.stringify(after.map(a=>a.status))}`);
 if(Object.keys(phantom).length)fail(name,`the restarted round opened with jumps nobody pressed ${JSON.stringify(phantom)}`);
 report.scenarios[name]=result;
}

async function setupRoom(){
 let code=null;
 for(let i=0;i<COUNT;i++){
  const p=await open(i);
  await p.click('#online');
  if(i===0){await p.click('#room-create');await until(p,()=>SourceParkOnline.net?.code&&SourceParkOnline.net.room);code=await p.evaluate(()=>SourceParkOnline.net.code);report.code=code;}
  else{await p.type('#room-code',code);await p.click('#room-join');await until(p,()=>SourceParkOnline.net?.room?.players[SourceParkOnline.net.id]);await p.click('#room-ready');}
 }
 await all(n=>document.querySelectorAll('#room-members .room-member').length===n,COUNT);
 await until(pages[0],()=>!document.getElementById('room-start').disabled);
}
async function startRound(){
 await pages[0].click('#room-start');
 await all(n=>SourceParkOnline.app.getState()?.players.length===n&&SourceParkOnline.app.getState().status==='play'&&!SourceParkOnline.app.isPaused(),COUNT);
 for(const p of pages)await instrument(p);
}

async function run(){
 if(!BASE){server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));}
 browser=await puppeteer.connect({browserURL:process.env.BROWSER_URL||'http://localhost:9224',defaultViewport:null});
 await setupRoom();
 report.visibility=await Promise.all(pages.map(p=>p.evaluate(()=>({visible:document.visibilityState,focus:document.hasFocus()}))));
 report.protocol=await pages[0].evaluate(()=>SourceParkOnline.net.room.protocol);
 await startRound();
 const last=COUNT-1;
 await scenario('host only',[{client:0,code:'ArrowRight',ms:1200}]);
 await scenario('peer only',[{client:last,code:'ArrowRight',ms:1200}]);
 await scenario('together',[{client:0,code:'ArrowLeft',ms:1500},{client:last,code:'ArrowLeft',ms:1500}]);
 if(COUNT>2)await scenario('everyone together',pages.map((_,i)=>({client:i,code:i%2?'KeyD':'ArrowRight',ms:1500})));
 await scenario('peer holds, host joins in',[{client:last,code:'ArrowRight',ms:2000},{client:0,code:'ArrowRight',ms:800,delay:600}]);
 await scenario('host holds, peer joins in',[{client:0,code:'ArrowLeft',ms:2000},{client:last,code:'KeyA',ms:800,delay:600}]);
 const alternate=[];for(let k=0;k<6;k++)alternate.push({client:k%2?last:0,code:k%2?'ArrowLeft':'ArrowRight',ms:180,delay:k*200});
 await scenario('alternate fast',alternate);

 // A short jump tap from a peer must reach the simulation (the jump edge
 // counter), and the restarts below must not replay it as a phantom jump.
 console.log('== peer jump tap');
 {const host=await hostPage(),t=Date.now(),id=await pages[last].evaluate(()=>SourceParkOnline.net.id);
  await press(pages[last],'Space',120);await sleep(900);
  const jumped=await host.evaluate((t,id)=>window.__probe.applied.filter(r=>r.t>=t&&r.j[id]).reduce((a,r)=>a+r.n,0),t,id);
  report.scenarios['peer jump tap']={jumpTicks:jumped};console.log('  jump ticks',jumped);
  if(!jumped)fail('peer jump tap','the host never applied the tap');}
 await restart('restart: host R',0,'key');
 await restart('restart: peer R',last,'key');
 await restart('restart: peer [다시] button',last,'#retry');
 await scenario('together after restarts',[{client:0,code:'ArrowRight',ms:1200},{client:last,code:'ArrowRight',ms:1200}]);

 // A loss: the host restarts on its own after a beat; a peer may ask sooner.
 console.log('== loss, peer presses the cover button');
 const host=await hostPage();const lostRun=await host.evaluate(()=>SourceParkOnline.runId);
 await host.evaluate(()=>{const s=SourceParkOnline.app.getState();s.players[0].y=s.map.killY+200;s.players[0].vy=0;});
 // The loss screen is drawn on the frame after the state turns; wait for it.
 await until(pages[last],()=>SourceParkOnline.app.getState()?.status==='dead'&&!document.getElementById('cover').hidden&&document.getElementById('headline').textContent==='다시 한번',null,WAIT);
 const coverEnabled=await pages[last].evaluate(()=>!document.getElementById('start').disabled);
 const tLoss=Date.now();if(coverEnabled)await pages[last].click('#start');
 await all(id=>SourceParkOnline.runId!==id&&SourceParkOnline.app.getState()?.status==='play',lostRun,WAIT);
 report.scenarios['loss: peer cover button']={coverEnabled,restartMs:Date.now()-tLoss};
 console.log(' ',JSON.stringify(report.scenarios['loss: peer cover button']));
 if(!coverEnabled)fail('loss','the peer cover button stays disabled');

 // A clear: the host's "대기실" button returns everyone to the waiting room,
 // the host picks the next round, and a peer that is already holding a key
 // when the round starts moves at once.
 console.log('== clear, lobby, next round with a held key');
 await host.evaluate(()=>{const s=SourceParkOnline.app.getState();s.status='clear';});
 await all(()=>SourceParkOnline.app.getState()?.status==='clear',null,WAIT);
 await host.click('#start');
 let lobby=true;try{await all(()=>SourceParkOnline.net?.room?.status==='lobby'&&!document.getElementById('room-lobby').hidden,null,WAIT);}catch{lobby=false;}
 if(!lobby){fail('clear','the host [대기실] button did not open the waiting room');}
 else{
  const next=await host.evaluate(()=>[...document.getElementById('stage').options].map(o=>o.value).find(v=>v!==SourceParkOnline.net.room.stageId));
  await host.select('#stage',next);
  await all(id=>SourceParkOnline.net?.room?.stageId===id,next,WAIT);
  const peers=pages.filter(p=>p!==host);
  for(const p of peers){await until(p,()=>!document.getElementById('room-ready').hidden&&!SourceParkOnline.net.room.players[SourceParkOnline.net.id].ready);await p.click('#room-ready');}
  await until(host,()=>!document.getElementById('room-start').disabled,null,WAIT);
  const holder=pages[last];
  const holding=press(holder,'ArrowRight',1600);
  await sleep(300);
  await host.click('#room-start');
  await all(n=>SourceParkOnline.app.getState()?.players.length===n&&SourceParkOnline.app.getState().status==='play',COUNT,WAIT);
  await holding;
  const holderId=await holder.evaluate(()=>SourceParkOnline.net.id);
  // From the host's first tick of the new round: how soon the held key took effect.
  const held=await host.evaluate(id=>{const run=SourceParkOnline.runId,rows=window.__probe.applied.filter(r=>r.run===run);
   const first=rows[0],firstHeld=rows.find(r=>r.r[id]);
   return {ticks:rows.filter(r=>r.r[id]).reduce((a,r)=>a+r.n,0),delayMs:first&&firstHeld?firstHeld.t-first.t:null};},holderId);
  const stage=await host.evaluate(()=>SourceParkOnline.app.getState().map.id);
  report.scenarios['next round: key held through the start']={stage,heldTicks:held.ticks,firstEffectMs:held.delayMs};
  console.log(' ',JSON.stringify(report.scenarios['next round: key held through the start']));
  if(stage!==next)fail('next round',`expected ${next}, playing ${stage}`);
  if(!held.ticks||held.delayMs>500)fail('next round',`a key held through the start took effect after ${held.delayMs}ms (${held.ticks} ticks)`);
  await scenario('together in the next round',[{client:0,code:'ArrowLeft',ms:700},{client:last,code:'ArrowLeft',ms:700}]);
 }
 report.passed=!report.failures.length&&!report.browserErrors.length;
}

run().catch(e=>{report.errors.push(e.stack||e.message);}).finally(async()=>{
 for(const p of pages.slice().reverse()){try{await p.evaluate(()=>window.SourceParkOnline?.leave());}catch{}}
 for(const p of pages){try{await p.close();}catch{}}
 for(const c of contexts){try{await c.close();}catch{}}
 try{browser?.disconnect();}catch{}
 try{server?.close();}catch{}
 if(report.errors.length)report.passed=false;
 const out=process.env.REPORT||path.join(__dirname,'play',`source-online-input-report-${COUNT}p.json`);
 fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
 console.log(JSON.stringify({passed:report.passed,failures:report.failures,errors:report.errors,browserErrors:report.browserErrors},null,1));
 process.exit(report.passed?0:1);
});
