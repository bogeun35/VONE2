'use strict';
// Recording kit for input-only whole-route evidence.
//
// A Run wraps one fresh runtime state (R.create on play/data/<stage>/<count>.json)
// and records exactly the per-tick inputs fed to R.step. Nothing here touches the
// state except through R.step, so the recorded commands alone reproduce the run.
// Route policies drive players with small generator "tasks" that read the live
// state (positions, switches, timers) and yield one input object per tick.
const fs=require('node:fs'),path=require('node:path');
const R=require('./source-stage-runtime.js');
const DATA=path.join(__dirname,'play','data');

function loadCompiled(stage,count){return JSON.parse(fs.readFileSync(path.join(DATA,stage,count+'.json'),'utf8'));}
// Only true keys are kept; the runtime reads every key as a boolean.
function clean(inputs){
 const out={};
 for(const id of Object.keys(inputs).sort()){
  const v=inputs[id]||{},o={};
  for(const k of ['left','right','jump','up'])if(v[k])o[k]=true;
  if(Object.keys(o).length)out[id]=o;
 }
 return out;
}
class RouteError extends Error{constructor(message,run){super(message+' @tick '+run.s.ticks+' '+run.brief());Object.defineProperty(this,'run',{value:run,enumerable:false});}}

class Run{
 constructor(stage,count,{throwOnDeath=true}={}){
  this.stage=stage;this.count=count;this.compiled=loadCompiled(stage,count);
  this.s=R.create(this.compiled);this.commands=[];this.milestones=[];this.throwOnDeath=throwOnDeath;
 }
 p(id){return this.s.players.find(q=>q.id===(typeof id==='number'?'p'+id:id));}
 get players(){return this.s.players;}
 brief(){return JSON.stringify({status:this.s.status,failure:this.s.failure,players:this.s.players.map(p=>[p.id,Math.round(p.x),Math.round(p.y),p.grounded?1:0,p.exit?'E':''].join(':'))});}
 step(inputs={}){
  if(this.s.status!=='play')throw new RouteError('step after '+this.s.status,this);
  const c=clean(inputs),text=JSON.stringify(c),last=this.commands.at(-1);
  if(last&&last.key===text)last.frames++;else this.commands.push({frames:1,inputs:c,key:text});
  R.step(this.s,c);
  if(this.s.status==='dead'&&this.throwOnDeath)throw new RouteError('died',this);
 }
 idle(n){for(let i=0;i<n;i++)this.step({});}
 mark(name,extra={}){
  const m={name,tick:this.s.ticks,keyTaken:this.s.keyTaken,exited:this.s.players.filter(p=>p.exit).length,
   players:this.s.players.map(({id,x,y,grounded,exit})=>({id,x:+x.toFixed(3),y:+y.toFixed(3),grounded,exit})),...extra};
  this.milestones.push(m);return m;
 }
 // Run generator tasks in parallel, one per player id, until every task is done.
 // A task is a generator that yields an input object per tick ({} to idle).
 together(tasks,{max=20000,label='together',stopWhen=null}={}){
  const live=new Map(Object.entries(tasks).map(([id,t])=>[id.startsWith('p')?id:'p'+id,t]));
  const pending=new Map();
  for(let t=0;t<max;t++){
   if(stopWhen&&stopWhen(this))return this;
   const inputs={};
   for(const [id,task] of [...live]){
    const r=task.next();
    if(r.done){live.delete(id);continue;}
    inputs[id]=r.value||{};
   }
   if(!live.size)return this;
   this.step(inputs);
   if(this.s.status==='clear')return this;
  }
  throw new RouteError(label+' timed out',this);
 }
 // Single task convenience.
 run(id,task,opts){return this.together({[typeof id==='number'?'p'+id:id]:task},opts);}
 // Authoring speed-up only: when ROUTE_CACHE names a JSON file, the inputs a
 // segment produced are stored under (stage, label, digest of every earlier
 // command) and fed back verbatim on the next run. The recorded commands are
 // identical either way because the runtime is deterministic.
 segment(label,fn){
  const file=process.env.ROUTE_CACHE;
  if(!file)return fn();
  const crypto=require('node:crypto');
  const prefix=crypto.createHash('sha256').update(JSON.stringify(this.commands.map(c=>[c.frames,c.key]))).digest('hex').slice(0,16);
  const key=this.stage+'|'+label+'|'+prefix;
  let cache={};try{cache=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  if(cache[key]){for(const [frames,inputs] of cache[key])for(let i=0;i<frames;i++)this.step(inputs);return;}
  const before=this.commands.reduce((n,c)=>n+c.frames,0);
  const result=fn();
  // Collect the inputs fed since `before`.
  const out=[];let seen=0;
  for(const c of this.commands){const start=seen;seen+=c.frames;if(seen<=before)continue;const n=seen-Math.max(start,before);out.push([n,c.inputs]);}
  try{cache=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  cache[key]=out;fs.writeFileSync(file,JSON.stringify(cache));
  return result;
 }
 export(meta={}){
  return {stage:this.stage,count:this.count,ticks:this.s.ticks,seconds:+(this.s.ticks/60).toFixed(3),status:this.s.status,deaths:this.s.deaths,
   commands:this.commands.map(({frames,inputs})=>({frames,inputs})),milestones:this.milestones,...meta};
 }
}

// ---------------------------------------------------------------- task helpers
// Each helper returns a generator bound to the run and a player.
const H={
 wait(run,id,n){return (function*(){for(let i=0;i<n;i++)yield {};})();},
 waitUntil(run,id,cond,max=100000){return (function*(){for(let i=0;i<max&&!cond(run);i++)yield {};})();},
 // Walk to x (within tolerance). Optional jump rule: jumpIf(p,run) -> start a
 // full held jump when grounded. Auto-jumps when blocked while grounded.
 walkTo(run,id,x,{tol=1.6,jumpIf=null,hold=14,autoJump=true,max=4000,extra=null}={}){
  return (function*(){
   const p=run.p(id);let holdLeft=0,lastX=null,stuck=0;
   for(let i=0;i<max;i++){
    if(Math.abs(p.x-x)<=tol&&holdLeft===0&&p.grounded)return;
    if(p.exit)return;
    const dir=p.x<x-tol?1:p.x>x+tol?-1:0;
    if(p.grounded&&holdLeft===0){
     stuck=(lastX!==null&&Math.abs(p.x-lastX)<0.01&&dir)?stuck+1:0;
     if((jumpIf&&jumpIf(p,run))||(autoJump&&stuck>=2))holdLeft=hold;
    }
    lastX=p.x;
    const v={right:dir>0,left:dir<0,jump:holdLeft>0&&!(holdLeft===hold&&p.jump)};
    if(holdLeft===hold&&p.jump){yield {right:dir>0,left:dir<0};continue;}
    if(holdLeft>0)holdLeft--;
    if(extra)Object.assign(v,extra(p,run)||{});
    yield v;
   }
  })();
 },
 // One full jump steering toward x; ends when grounded again (or max ticks).
 jumpTo(run,id,x,{hold=14,max=200,tol=1.6}={}){
  return (function*(){
   const p=run.p(id);
   if(p.jump)yield {};
   for(let i=0;i<max;i++){
    const dir=p.x<x-tol?1:p.x>x+tol?-1:0;
    if(i>2&&p.grounded)return;
    yield {right:dir>0,left:dir<0,jump:i<hold};
   }
  })();
 },
 // Steer horizontally toward x (number or function of p) until until(p,run)
 // holds; optional jumpIf(p,run) starts a full held jump when grounded.
 steer(run,id,x,until,{max=3000,jumpIf=null,hold=14,label='steer',tol=1.5,autoJump=false}={}){
  return (function*(){
   const p=run.p(id);let holdLeft=0,lastX=null,stuck=0;
   for(let i=0;i<max;i++){
    if(until(p,run))return;
    const tx=typeof x==='function'?x(p,run):x,dir=p.x<tx-tol?1:p.x>tx+tol?-1:0;
    stuck=(p.grounded&&lastX!==null&&Math.abs(p.x-lastX)<0.01&&dir)?stuck+1:0;lastX=p.x;
    if(p.grounded&&holdLeft===0&&!p.jump&&((jumpIf&&jumpIf(p,run))||(autoJump&&stuck>=2)))holdLeft=hold;
    const jump=holdLeft>0;if(holdLeft>0)holdLeft--;
    yield {right:dir>0,left:dir<0,jump};
   }
   throw new RouteError(label+' timed out',run);
  })();
 },
 // Hold an input pattern for n ticks.
 hold(run,id,input,n){return (function*(){for(let i=0;i<n;i++)yield typeof input==='function'?input(i):input;})();},
 // Sequence several task factories (functions returning generators).
 seq(...factories){return (function*(){for(const f of factories)yield* (typeof f==='function'?f():f);})();},
 // Enter the goal: walk to the goal and press up until exit.
 enter(run,id,{max=3000}={}){
  return (function*(){
   const p=run.p(id),g=run.s.map.exit;let lastX=null,stuck=0,holdLeft=0;
   for(let i=0;i<max&&!p.exit;i++){
    const cx=g.x+g.w/2-16,dir=p.x<cx-4?1:p.x>cx+4?-1:0;
    if(p.grounded&&holdLeft===0){stuck=(lastX!==null&&Math.abs(p.x-lastX)<0.01&&dir)?stuck+1:0;if(stuck>=2&&!p.jump)holdLeft=14;}
    lastX=p.x;
    const jump=holdLeft>0;if(holdLeft>0)holdLeft--;
    yield {right:dir>0,left:dir<0,up:true,jump};
   }
  })();
 }
};

// ------------------------------------------------------------- local planner
// Best-first search over short macro actions for ONE player while the others
// follow `others(run)` (default idle). Returns the input list for the mover.
// Used only while authoring; the recorded result is plain per-tick inputs.
const DEFAULT_ACTIONS=[];
for(const dir of [-1,0,1]){DEFAULT_ACTIONS.push({dir,ticks:6,jump:0},{dir,ticks:16,jump:14},{dir,ticks:8,jump:4});}
function plan(run,id,goal,{others=null,actions=DEFAULT_ACTIONS,maxNodes=4000,heuristic=null,keyOf=null,maxDepth=120,extra=null}={}){
 const pid=typeof id==='number'?'p'+id:id;
 const start={s:structuredClone(run.s),seq:[],depth:0};
 const key=keyOf||((s)=>{const p=s.players.find(q=>q.id===pid);return [Math.round(p.x/3),Math.round(p.y/3),p.grounded?1:0,Math.round(p.vy/60)].join(',');});
 const h=heuristic||((s)=>0);
 const seen=new Set([key(start.s)]);let frontier=[start],nodes=0;
 while(frontier.length&&nodes<maxNodes){
  frontier.sort((a,b)=>(h(a.s)+a.depth*0.01)-(h(b.s)+b.depth*0.01));
  const cur=frontier.shift();nodes++;
  for(const a of actions){
   const s=structuredClone(cur.s),seq=[];let ok=true;
   if(a.jump&&s.players.find(q=>q.id===pid).jump)continue;
   for(let t=0;t<a.ticks;t++){
    const me={right:a.dir>0,left:a.dir<0,jump:t<a.jump,...(extra||{})};
    const inputs=others?{...others(s,t+cur.seq.length)}:{};inputs[pid]=me;
    R.step(s,clean(inputs));seq.push(clean(inputs));
    if(s.status==='dead'){ok=false;break;}
    if(goal(s))return cur.seq.concat(seq);
   }
   if(!ok)continue;
   const k=key(s);if(seen.has(k))continue;seen.add(k);
   if(cur.depth+1<maxDepth)frontier.push({s,seq:cur.seq.concat(seq),depth:cur.depth+1});
  }
 }
 return null;
}
// Feed a planned (already joint) input list into the run.
function feed(run,list){for(const inputs of list)run.step(inputs);}
// Plan toward a target point (heuristic = distance) until goal(s) holds, then
// feed the result. Throws when no plan is found.
function nav(run,id,goal,target,opts={}){
 const pid=typeof id==='number'?'p'+id:id;
 const heuristic=opts.heuristic||(s=>{const p=s.players.find(q=>q.id===pid);return Math.hypot(p.x-target.x,(p.y-target.y)*(opts.yWeight||1));});
 const list=plan(run,pid,goal,{...opts,heuristic});
 if(!list)throw new RouteError('no plan for '+pid+' '+(opts.label||''),run);
 feed(run,list);return list.length;
}

module.exports={R,Run,H,plan,feed,nav,clean,loadCompiled,RouteError};
