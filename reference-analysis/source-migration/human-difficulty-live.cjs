'use strict';
// Live smoke check behind HUMAN-DIFFICULTY.md: every connected round x 2/4/8
// players on the deployed page. Measures load errors, control response, HUD and
// when an untouched round ends. Audio is neutralised before any page script runs.
//   PUPPETEER_CORE=<path to puppeteer-core> PARK_BROWSER=http://localhost:9224 node human-difficulty-live.cjs out.json
const puppeteer=require(process.env.PUPPETEER_CORE||'puppeteer-core');
const fs=require('node:fs');
const ENTRY=process.env.PARK_URL||'https://bogeun35.github.io/chamchicode/coop.html';
const BROWSER=process.env.PARK_BROWSER||'http://localhost:9224';
const IDLE_LIMIT=Number(process.env.IDLE_LIMIT||20);
const STAGES=(process.env.PARK_STAGES||'st_w_01_01,st_w_01_02,st_w_01_03,st_w_01_04,st_w_04_01,st_w_04_03,st_w_04_04,st_w_05_02,st_w_10_02,st_w_11_04').split(',');
const COUNTS=(process.env.PARK_COUNTS||'2,4,8').split(',').map(Number);
// PARK_NO_JUMP=1 skips the jump probe: on 4-4 and 11-4 a jump at the spawn touches a laser.
const NO_JUMP=process.env.PARK_NO_JUMP==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function silence(){
 // No sound may leave this browser: the page's only music is an Audio element,
 // so play() never starts anything; any AudioContext is created suspended.
 const proto=HTMLMediaElement.prototype;
 proto.play=function(){try{this.muted=true;this.volume=0;}catch{}return Promise.resolve();};
 for(const name of ['AudioContext','webkitAudioContext']){const AC=window[name];if(!AC)continue;
  window[name]=class extends AC{constructor(...a){super(...a);this.suspend().catch(()=>{});}resume(){return Promise.resolve();}};}
 window.__parkSilenced=true;
}

async function snapshot(page){return page.evaluate(()=>{const s=window.SourceParkOnline?.app.getState();if(!s)return null;
 return {id:s.map.id,n:s.players.length,status:s.status,elapsed:s.elapsed,ticks:s.ticks,keyTaken:s.keyTaken,failure:s.failure,
  players:s.players.map(p=>({x:p.x,y:p.y,vy:p.vy,exit:p.exit})),
  timers:window.SourceSwitchTimerDevices&&s.switchTimerState?window.SourceSwitchTimerDevices.displays(s.switchTimerState):[],
  progress:document.getElementById('progress').textContent,headline:document.getElementById('headline').textContent,
  detail:document.getElementById('detail').textContent,coverHidden:document.getElementById('cover').hidden,
  visibility:document.visibilityState};});}

async function hold(page,key,ms){await page.keyboard.down(key);await sleep(ms);await page.keyboard.up(key);}

async function main(){
 const out=process.argv[2]||'human-difficulty-live.json';
 const browser=await puppeteer.connect({browserURL:BROWSER,defaultViewport:null});
 const page=await browser.newPage();
 const report={entry:ENTRY,checkedAt:new Date().toISOString(),idleLimitSeconds:IDLE_LIMIT,audio:{},rows:[],errors:[]};
 let current='entry';
 try{
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  page.on('pageerror',e=>report.errors.push({at:current,kind:'pageerror',message:e.message}));
  page.on('console',m=>{if(m.type()==='error')report.errors.push({at:current,kind:'console',message:m.text()});});
  page.on('response',r=>{if(r.status()>=400)report.errors.push({at:current,kind:'http',status:r.status(),url:r.url()});});
  page.on('requestfailed',r=>report.errors.push({at:current,kind:'requestfailed',url:r.url(),reason:r.failure()?.errorText}));
  const cdp=await page.createCDPSession();
  // Keeps the page focused without bringToFront; the game pauses on window blur.
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await page.evaluateOnNewDocument(silence);
  await page.goto(ENTRY,{waitUntil:'networkidle2',timeout:60000});
  await page.waitForFunction(()=>window.SourceParkOnline?.app.getState(),{timeout:30000});
  report.resolvedUrl=page.url();
  report.audio=await page.evaluate(()=>({silenced:!!window.__parkSilenced,musicButton:document.getElementById('music').getAttribute('aria-pressed')}));
  // Also turn the in-game music switch off (M), as a second barrier.
  if(report.audio.musicButton==='true'){await page.focus('#game');await page.keyboard.press('KeyM');}
  report.audio.afterM=await page.evaluate(()=>document.getElementById('music').getAttribute('aria-pressed'));
  report.stageOptions=await page.evaluate(()=>[...document.getElementById('stage').options].map(o=>({id:o.value,title:o.textContent})));
  for(const id of STAGES)for(const n of COUNTS){
   current=`${id}/${n}`;const row={stage:id,count:n};const before=report.errors.length;
   const t0=Date.now();
   await page.select('#stage',id);await sleep(50);await page.select('#count',String(n));
   await page.waitForFunction((id,n)=>{const s=window.SourceParkOnline?.app.getState();return s&&s.map.id===id&&s.players.length===n&&!document.getElementById('start').disabled;},{timeout:30000},id,n);
   row.loadMs=Date.now()-t0;
   const ready=await snapshot(page);row.readyHeadline=ready.headline;row.readyDetail=ready.detail;row.hudReady=ready.progress;row.visibility=ready.visibility;
   // Controls: selected character 1 moves right, jumps; 2 moves left after switching.
   await page.focus('#game');await page.keyboard.press('Enter');await sleep(150);
   const j0=await snapshot(page);let j1=j0;if(!NO_JUMP){await page.keyboard.down('ArrowUp');await sleep(120);j1=await snapshot(page);await sleep(150);await page.keyboard.up('ArrowUp');await sleep(700);}
   // A teammate standing next to you blocks the way, so try both directions.
   const walk=async(i,first)=>{const keysTried=[first,first==='ArrowRight'?'ArrowLeft':'ArrowRight'];let best={key:null,dx:0,other:0};
    for(const k of keysTried){const u=await snapshot(page);await hold(page,k,300);const v=await snapshot(page);await sleep(250);
     const dx=v.players[i].x-u.players[i].x,other=v.players.reduce((m,p,j)=>j===i?m:Math.max(m,Math.abs(p.x-u.players[j].x)),0);
     if(Math.abs(dx)>Math.abs(best.dx))best={key:k,dx:+dx.toFixed(2),other:+other.toFixed(2)};if(Math.abs(dx)>5)break;}
    return best;};
   const m1=await walk(0,'ArrowRight');
   await page.keyboard.press('Digit2');await sleep(50);const m2=await walk(1,'ArrowLeft');
   const e=await snapshot(page);
   row.controls={
    p1Walk:m1,p2WalkAfterDigit2:m2,
    p1JumpRise:+(j0.players[0].y-j1.players[0].y).toFixed(2),p1JumpVy:+j1.players[0].vy.toFixed(1),
    statusAfter:e.status,elapsedDuringControls:+(e.elapsed-j0.elapsed).toFixed(2)};
   // Others may move with the walker only as riders/pushed; report it, judge on the walker.
   row.controls.jumpProbe=!NO_JUMP;
   row.controls.ok=Math.abs(m1.dx)>5&&(NO_JUMP||row.controls.p1JumpRise>0)&&Math.abs(m2.dx)>5;
   // Idle: reset, start, touch nothing.
   await page.keyboard.press('KeyR');await sleep(100);await page.keyboard.press('Enter');
   const w0=Date.now();let s=await snapshot(page),hudSeen=new Set(),timerSeen=[];
   while(s.status==='play'&&s.elapsed<IDLE_LIMIT&&Date.now()-w0<(IDLE_LIMIT+15)*1000){
    hudSeen.add(s.progress);if(s.timers.length)timerSeen.push(s.timers.map(t=>`${t.minutes}:${String(t.seconds).padStart(2,'0')}${t.warning?'!':''}`).join(','));
    await sleep(250);s=await snapshot(page);}
   row.idle={status:s.status,endedAtGameSeconds:s.status==='play'?null:+s.elapsed.toFixed(2),observedGameSeconds:+s.elapsed.toFixed(2),
    wallSeconds:+((Date.now()-w0)/1000).toFixed(2),failure:s.failure,overlay:s.coverHidden?null:{headline:s.headline,detail:s.detail}};
   row.hud={progressTexts:[...hudSeen],timerReadouts:[...new Set(timerSeen)].slice(0,40),timerShown:timerSeen.length>0};
   if(id==='st_w_05_02'&&n===4)await page.screenshot({path:out.replace(/\.json$/,'')+'-05_02-hud.png'}).catch(()=>{});
   row.errors=report.errors.slice(before);
   report.rows.push(row);console.log(JSON.stringify({stage:id,n,load:row.loadMs,controls:row.controls.ok,idle:row.idle.endedAtGameSeconds,reason:row.idle.failure?.reason,timer:row.hud.timerShown,errs:row.errors.length}));
  }
 }catch(e){report.fatal=String(e&&e.stack||e);console.error(e);}
 finally{
  report.audio.finalMusicButton=await page.evaluate(()=>document.getElementById('music')?.getAttribute('aria-pressed')).catch(()=>null);
  await page.close().catch(()=>{});await browser.disconnect();
 }
 fs.writeFileSync(out,JSON.stringify(report,null,1));
}
main();
