'use strict';
// human-difficulty/ : measurement scripts behind HUMAN-DIFFICULTY.md and play/human-difficulty-report.json.
// Runtime = ../source-stage-runtime.js + ../play/data (same content as the live page).
//   node trials.cjs r0404.cjs st_w_04_04 2,4,8 30 online,local '{"perWindow":1}'   4-4 lasers
//   node trials.cjs r0401.cjs st_w_04_01 2,4 30 online,local                       4-1 door hand-off
//   node trials.cjs r0502.cjs st_w_05_02 2 20 online                               5-2 (timer-stop bug present)
//   node trials.cjs r0103.cjs st_w_01_03 2,4,8 20 online                           1-3 alternating dashers
//   node r0101.cjs   (1-1 policy from whole-route-completion.cjs, 2/4/8)
//   node sync-10-02.cjs   10-2 launch-offset sweep      node dodge-11-04.cjs   11-4 trap dodge window
//   node rows-11-04.cjs   11-4 thorn rows              node tap-01-02.cjs     1-2 switch tap window
//   node idle-death.cjs   untouched-round death times  node openloop.cjs 20   noise on the 8-player recording
// Human-difficulty bot kit: closed-loop route policies driven through R.step only,
// with an optional human-noise layer (reaction delay, timing jitter, wrong presses)
// and a "local" mode where one person drives every character in turn.
const fs=require('node:fs'),path=require('node:path');
const R=require('../source-stage-runtime.js');
const DATA=path.join(__dirname,'..','play','data');
const load=(stage,count)=>JSON.parse(fs.readFileSync(path.join(DATA,stage,count+'.json'),'utf8'));
const compiledCache=new Map();
function compiled(stage,count){const k=stage+'/'+count;if(!compiledCache.has(k))compiledCache.set(k,load(stage,count));return compiledCache.get(k);}

function mulberry(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

// Noise model (ticks are 1/60 s):
//  reaction  : extra delay after an external event before acting (150-250 ms = 9-15 ticks)
//  jitter    : every self-timed press/release lands +-1..3 ticks off; for walking this is
//              the stop position (+-3 px per tick), for partial jumps the hold length
//  wrongRate : chance per primitive action of a wrong key for 4-10 ticks first
const HUMAN=Object.freeze({reaction:[9,15],jitter:3,wrongRate:0.03});

class Halt extends Error{}
class Game{
 constructor(stage,count,{noise=null,seed=1,mode='online',maxTicks=60*300}={}){
  this.stage=stage;this.count=count;this.c=compiled(stage,count);this.s=R.create(this.c);
  this.noise=noise;this.r=mulberry(seed*2654435761+count*97+stage.length);this.mode=mode;this.maxTicks=maxTicks;
  this.log=[];this.flags={};this.wrongPresses=0;this.reactions=0;this.selected=0;this.switches=0;
 }
 P(i){return this.s.players[i];}
 get players(){return this.s.players;}
 get t(){return this.s.ticks;}
 rand(){return this.r();}
 ri(a,b){return a+Math.floor(this.r()*(b-a+1));}
 jitterTicks(){return this.noise?this.ri(-this.noise.jitter,this.noise.jitter):0;}
 reactTicks(){if(!this.noise)return 0;this.reactions++;return this.ri(this.noise.reaction[0],this.noise.reaction[1]);}
 // A player switch in local mode costs one press of a digit key.
 switchTicks(){return this.noise?this.ri(this.noise.reaction[0],this.noise.reaction[1]):6;}
 wrongNow(){return !!this.noise&&this.r()<this.noise.wrongRate;}
 mark(name,extra={}){this.log.push({name,tick:this.t,...extra});}
 step(inputs){
  if(this.s.status!=='play')throw new Halt(this.s.status);
  if(this.t>=this.maxTicks)throw new Halt('timeout');
  if(this.mode==='local'){
   // Only the selected character receives keys, exactly as play.js does.
   const ids=Object.keys(inputs).filter(id=>Object.values(inputs[id]||{}).some(Boolean));
   if(ids.length>1)throw new Error('local mode cannot press two characters at once: '+ids.join(','));
  }
  R.step(this.s,inputs,1/60);
  if(this.s.status!=='play')throw new Halt(this.s.status);
 }
 // Run per-player generators in parallel until all finish.
 together(tasks,{max=60*120,until=null}={}){
  const live=new Map(Object.entries(tasks));
  for(let k=0;k<max;k++){
   if(until&&until(this))return;
   const inputs={};
   for(const [i,task] of [...live]){const r=task.next();if(r.done){live.delete(i);continue;}if(r.value)inputs[this.P(+i).id]=r.value;}
   if(!live.size&&!until)return;
   this.step(inputs);
  }
  throw new Halt('together-timeout');
 }
 // Local mode: one person runs one character's task at a time.
 solo(i,task,{max=60*120}={}){
  if(this.selected!==i){const n=this.switchTicks();for(let k=0;k<n;k++)this.step({});this.selected=i;this.switches++;}
  for(let k=0;k<max;k++){const r=task.next();if(r.done)return;this.step(r.value?{[this.P(i).id]:r.value}:{});}
  throw new Halt('solo-timeout');
 }
 idle(n){for(let k=0;k<n;k++)this.step({});}
 waitUntil(cond,max=60*120){for(let k=0;k<max;k++){if(cond(this))return;this.step({});}throw new Halt('wait-timeout');}
 result(extra={}){return {stage:this.stage,count:this.count,mode:this.mode,noise:!!this.noise,status:this.s.status,ticks:this.t,
  seconds:+(this.t/60).toFixed(2),failure:this.s.failure,keyTaken:this.s.keyTaken,exited:this.players.filter(p=>p.exit).length,
  wrongPresses:this.wrongPresses,switches:this.switches,deathAfterWrongPress:this.s.status==='dead'&&this.lastWrong!==undefined&&this.t-this.lastWrong<=45,
  where:this.players.map(p=>[p.id,Math.round(p.x),Math.round(p.y),p.exit?'E':''].join(':')).join(' '),log:this.log,...extra};}
}

// ---------------------------------------------------------------- primitives
// All primitives are generators yielding one input object per tick.
const dirInput=d=>({right:d>0,left:d<0});
function* wrongPress(g,intendedDir){
 if(!g.wrongNow())return;
 g.wrongPresses++;g.lastWrong=g.t;
 const n=g.ri(4,10),kind=g.rand();
 for(let k=0;k<n;k++)yield kind<0.5?dirInput(-(intendedDir||1)):kind<0.75?{jump:k<2}:dirInput(intendedDir||1);
}
function* idleN(n){for(let k=0;k<n;k++)yield {};}
function* until(g,cond,{react=true,max=60*120}={}){
 for(let k=0;k<max&&!cond(g);k++)yield {};
 if(react){const n=g.reactTicks();for(let k=0;k<n;k++)yield {};}
}
// Walk until x is within tol of target (target shifted by jitter*3 px when noisy).
function* walkTo(g,i,x,{tol=1.5,jumpIf=null,hold=14,autoJump=false,max=60*30,noJitter=false,upHeld=false,stuckLimit=30}={}){
 const p=g.P(i);const target=x+(noJitter?0:g.jitterTicks()*3);
 yield* wrongPress(g,Math.sign(target-p.x));
 let holdLeft=0,lastX=null,stuck=0,still=0;
 for(let k=0;k<max;k++){
  if(p.exit)return;
  still=(lastX!==null&&Math.abs(p.x-lastX)<0.01&&p.grounded)?still+1:0;if(still>=stuckLimit)return;
  const dir=p.x<target-tol?1:p.x>target+tol?-1:0;
  if(!dir&&holdLeft===0)return;
  if(p.grounded&&holdLeft===0){
   stuck=(lastX!==null&&Math.abs(p.x-lastX)<0.01&&dir)?stuck+1:0;
   if((jumpIf&&jumpIf(p,g))||(autoJump&&stuck>=3)){holdLeft=hold;if(p.jump){yield {...dirInput(dir),up:upHeld};continue;}}
  }
  lastX=p.x;
  const v={...dirInput(dir),jump:holdLeft>0,up:upHeld};if(holdLeft>0)holdLeft--;
  yield v;
 }
}
// One jump; hold frames are jittered unless it is a full (>=14) jump.
function* jump(g,i,{hold=14,dir=0,steerTo=null,tol=1.5,maxAir=120,up=false}={}){
 const p=g.P(i);
 const h=hold>=14?14:Math.max(1,Math.min(14,hold+g.jitterTicks()));
 if(p.jump)yield {};
 for(let k=0;k<maxAir;k++){
  let d=dir;if(steerTo!==null)d=p.x<steerTo-tol?1:p.x>steerTo+tol?-1:0;
  if(k>2&&p.grounded)return;
  yield {...dirInput(d),jump:k<h,up};
 }
}
function* holdKeys(input,n){for(let k=0;k<n;k++)yield typeof input==='function'?input(k):input;}
// Walk onto the goal and hold Up until inside.
function* enter(g,i,{max=60*30}={}){
 const p=g.P(i),e=g.s.map.exit;
 yield* wrongPress(g,Math.sign(e.x+e.w/2-16-p.x));
 let lastX=null,stuck=0,hold=0;
 for(let k=0;k<max&&!p.exit;k++){const cx=e.x+e.w/2-16;const d=p.x<cx-6?1:p.x>cx+6?-1:0;
  if(p.grounded&&!hold){stuck=(lastX!==null&&d&&Math.abs(p.x-lastX)<0.01)?stuck+1:0;if(stuck>=3&&!p.jump)hold=14;}
  lastX=p.x;const j=hold>0;if(hold>0)hold--;
  yield {...dirInput(d),up:true,jump:j};}
}
module.exports={Game,Halt,HUMAN,R,compiled,walkTo,jump,until,idleN,holdKeys,enter,wrongPress,dirInput,mulberry};
