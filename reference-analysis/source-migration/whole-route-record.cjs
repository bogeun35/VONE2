'use strict';
// Records the 8-player input-only route of every connected round against the
// CURRENT runtime (root source-stage-runtime.js + play/data). Route policies read
// the live state to decide inputs, but only the per-tick inputs are saved; the
// replay check (whole-route-replay.cjs) re-runs them on fresh states.
//
//   node whole-route-record.cjs            # all rounds
//   node whole-route-record.cjs st_w_01_02 # one round (others kept from file)
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {R,Run,H}=require('./whole-route-kit.cjs');
const OUT=path.join(__dirname,'play','whole-route-input-replay.json');
const COUNT=8;

const policies={};

// ------------------------------------------------------------------ 2편 1-1
// Ported from whole-route-completion.cjs (the policy still clears on the current
// runtime): staircase tower at the spring row, carrier-assisted climb to the
// first stair, delay switch scout and the spring launch wave.
policies.st_w_01_01=function(run){
 const s=run.s,count=run.count,P=id=>run.p(id);
 const step=inputs=>run.step(inputs),idle=(n=40)=>run.idle(n);
 function go(id,target,max=1200){const p=P(id);let t=0;while(p.x<target&&t++<max)step({[id]:{right:true,jump:!!(p.grounded&&((p.x>800&&p.x<915)||(p.x>1220&&p.y>830))||p.jumpFrame>0&&p.jumpFrame<14)}});idle();return p.x>=target;}
 function hop(id,target){const p=P(id);step();for(let t=0;t<45;t++)step({[id]:{right:p.x<target,jump:t<14}});}
 const base=s.players[count-1],top=s.players[0];
 go(base.id,1370);run.mark('first player crosses gap and reaches spring row');const stack=[base.id];
 for(let i=count-1;i>=1;i--){const id='p'+i;go(id,1337);for(const support of stack)hop(id,P(support).x-16);go(id,1371+24*stack.length,120);stack.push(id);}
 run.mark('full staircase tower assembled');
 go(base.id,base.x+(1552-top.x),120);
 const firstStair=s.map.platforms.filter(p=>p.x===1584).reduce((a,b)=>a.y<b.y?a:b);
 hop(top.id,1610);
 if(!(top.x>=1584&&top.y+46<=firstStair.y+0.01)){
  step();for(let t=0;t<100;t++){
   let input={p1:{jump:t<14},p2:{jump:t>=14&&t<28}};
   if(t>=14&&top.grounded)input.p1={jump:!top.jump,right:true};
   else if(t>=14&&top.jumpFrame)input.p1={jump:true,right:true};
   step(input);
  }
  idle();
 }
 if(!(top.x>=1584&&top.y+46<=firstStair.y+0.01))throw new Error('first stair not reached');
 run.mark('first stair reached');
 for(let z=0;z<10&&top.y+46>480;z++)hop(top.id,top.x+48);go(top.id,1930,180);hop(top.id,1955);
 for(let i=2;i<=count;i++){go('p'+i,1880,200);for(let z=0;z<10&&s.players[i-1].y+46>480;z++)hop('p'+i,s.players[i-1].x+48);go('p'+i,1910,180);hop('p'+i,1990+(i-2)*36);go('p'+i,1990+(i-2)*36,180);}
 run.mark('everyone on the first switch stair',{switchPressed:s.map.switches[0].pressed});
 go(base.id,2500,500);const scout=s.players[count-2];go(scout.id,2466,600);hop(scout.id,base.x-16);go(scout.id,2530,160);hop(scout.id,2590);for(let z=0;z<7&&scout.y+46>192;z++)hop(scout.id,scout.x+48);go(scout.id,2850,200);
 for(let i=count-2;i>=1;i--)go('p'+i,2305+32*(i-1),600);
 if(count<=5){for(let t=0;t<80&&base.x>2385;t++)step({[base.id]:{left:true}});idle(30);}
 hop(scout.id,2883);run.mark('delay switch pressed',{pressed:s.map.switches[1].pressed});
 const delay=s.relayState.relays.find(r=>r.type==='DelaySwitch');
 const launched=new Set();
 function routeInput(p){
  if(p.exit)return {};
  if(launched.has(p.id)&&p.grounded&&p.y>=100)launched.delete(p.id);
  if(launched.has(p.id)&&(!p.grounded||p.y<100))return {left:p.x>1890,up:true};
  if(p.grounded&&p.y>=100&&!p.supportId?.startsWith('source:'))return {right:p.x<2340,left:p.x>2343,jump:p.x<2305};
  return {};
 }
 for(let t=0;t<1300;t++){
  const input={};for(const p of s.players)if(p!==scout)input[p.id]=routeInput(p);
  step(input);for(const x of s.lastImpulses)if(P(x.actorId)?.vy<-1500)launched.add(x.actorId);
  if(s.players.filter(p=>p!==scout).every(p=>p.exit))break;
 }
 run.mark('first wave in goal',{keyTaken:s.keyTaken,entered:s.players.filter(p=>p.exit).length});
 for(let t=0;t<320&&delay.remaining<4.96;t++)step();
 for(let t=0;t<260&&scout.x>2340;t++)step({[scout.id]:{left:true}});idle(40);
 for(let t=0;t<900&&s.status==='play';t++){
  const input={};for(const p of s.players)input[p.id]=routeInput(p);
  step(input);for(const x of s.lastImpulses)if(P(x.actorId)?.vy<-1500)launched.add(x.actorId);
 }
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 1-2
// Spring launch onto the upper ledge and the 7-pusher box: same moves as
// stage02-route-review.cjs. The thorn corridor changed: Thorn now falls
// speed^2 = 36 px per tick (thorn-speed-report.json), so walking under a
// thorn after touching its CollisionSwitch is fatal. The scout touches each
// switch and steps back out of the 24 px thorn column (switch fires two ticks
// after contact, the thorn needs two more ticks to reach head height).
policies.st_w_01_02=function(run){
 const s=run.s,count=run.count,step=i=>run.step(i);
 const box=s.deviceState.devices.find(d=>d.type==='PushBox');
 for(let k=0;k<count-1;k++){
  const p=s.players[k];for(let t=0;t<250&&p.x>86;t++)step({[p.id]:{left:true}});step();
  for(let t=0;t<100;t++)step({[p.id]:{left:p.y>130&&p.x>54,right:p.y<98&&p.x<140,jump:t<14}});
  for(let t=0;t<150;t++)step({[p.id]:{right:p.x<392-k*32}});
 }
 run.mark('spring launches put seven players on the ledge');
 const push=Object.fromEntries(s.players.slice(0,count-1).map(p=>[p.id,{right:true}]));
 for(let t=0;t<200&&box.x<538;t++)step(push);
 run.idle(30);
 if(box.x<538)throw new Error('box not pushed');
 run.mark('seven pushers move the box off the ledge',{box:{x:box.x,y:box.y}});
 const thorns=s.deviceState.devices.filter(d=>d.type==='Thorn');
 const switches=s.deviceState.devices.filter(d=>d.type==='CollisionSwitch').sort((a,b)=>a.x-b.x);
 const scout=run.p('p1');
 // Everyone else waits left of the first switch column.
 run.together(Object.fromEntries(s.players.slice(1).map((p,i)=>[p.id,H.walkTo(run,p.id,560-i*34>100?Math.min(560-i*34,600):100)])),{label:'gather'});
 run.run(scout.id,H.walkTo(run,scout.id,600));
 for(const sw of switches){
  const thorn=thorns.find(t=>sw.targets.includes(t.name));
  // Walk right until the first tick of contact, then back off.
  run.run(scout.id,(function*(){while(!(scout.x+scout.w>sw.x&&scout.x<sw.x+sw.w))yield {right:true};})(),{label:'approach '+sw.name});
  run.run(scout.id,H.hold(run,scout.id,{left:true},8));
  run.run(scout.id,H.waitUntil(run,scout.id,()=>!thorn.active||thorn.phase==='fade'),{label:'thorn '+thorn.name});
 }
 run.mark('scout consumed every falling thorn',{thornsLeft:thorns.filter(t=>t.active&&t.phase!=='fade').length});
 // Everybody to the key; two-player tower under the key.
 const key=s.map.key,base=run.p('p2'),climber=scout;
 run.together({[base.id]:H.walkTo(run,base.id,key.x),[climber.id]:H.walkTo(run,climber.id,key.x-40)},{label:'to key'});
 run.run(climber.id,H.jumpTo(run,climber.id,base.x));
 run.run(climber.id,H.wait(run,climber.id,4));
 run.run(climber.id,H.jumpTo(run,climber.id,key.x));
 if(!s.keyTaken)throw new Error('key not taken');
 run.mark('two-player tower takes the key');
 run.together(Object.fromEntries(s.players.map(p=>[p.id,H.enter(run,p.id)])),{label:'goal'});
 run.mark('all players in goal');
};

function recordOne(stage){
 const policy=policies[stage];
 if(!policy)return {stage,count:COUNT,status:'no-policy',commands:[],milestones:[]};
 const run=new Run(stage,COUNT);
 let error=null;
 try{policy(run);}catch(e){error=e.message;}
 return run.export({error});
}

module.exports={policies,recordOne};
if(require.main===module){
 const only=process.argv.slice(2);
 const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'play','catalogue.json'),'utf8')).stages.map(s=>s.id);
 const prev=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):{};
 const prevRounds=new Map((prev.rounds||[]).map(r=>[r.stage,r]));
 const rounds=[];
 for(const stage of stages){
  if(only.length&&!only.includes(stage)&&prevRounds.has(stage)){rounds.push(prevRounds.get(stage));continue;}
  const t0=Date.now(),r=recordOne(stage);
  console.log(stage,r.status,r.ticks,'ticks',r.error||'',(Date.now()-t0)+'ms');
  rounds.push(r);
 }
 const first=rounds.find(r=>r.stage==='st_w_01_01');
 // Top level keeps schemaVersion 1 + count + commands for 2편 1-1 so the in-page
 // "검수 재생" (play.js runReplay, T key) keeps working unchanged.
 const out={schemaVersion:1,count:COUNT,stage:'st_w_01_01',commands:first?first.commands:[],
  scope:'8인 입력 전용 공략 녹화. 최상위 commands 는 2편 1-1(play.js 검수 재생용), rounds[] 에 연결된 10라운드 전부.',
  recordedAt:new Date().toISOString(),
  runtimeSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'source-stage-runtime.js'))).digest('hex'),
  recorder:'reference-analysis/source-migration/whole-route-record.cjs',
  placementsUsed:false,stateMutationUsed:false,
  rounds:rounds.map(r=>({stage:r.stage,count:r.count,status:r.status,ticks:r.ticks,seconds:r.seconds,deaths:r.deaths,error:r.error||null,commands:r.commands,milestones:r.milestones}))};
 fs.writeFileSync(OUT,JSON.stringify(out)+'\n');
 console.log('wrote',path.relative(__dirname,OUT));
}
