'use strict';
// Records the 8-player input-only route of every connected round against the
// CURRENT runtime (root source-stage-runtime.js + play/data). Route policies read
// the live state to decide inputs, but only the per-tick inputs are saved; the
// replay check (whole-route-replay.cjs) re-runs them on fresh states.
//
//   node whole-route-record.cjs            # all rounds
//   node whole-route-record.cjs st_w_01_02 # one round (others kept from file)
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const K=require('./whole-route-kit.cjs'),{R,Run,H}=K;
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
  if(s.players.every(p=>p.exit||p.grounded&&p.y<100))break;
 }
 run.mark('everyone on the door ledge',{holder:s.keyState&&s.keyState.holderId});
 // Since 183def4c the key opens the door only when it reaches it (KeyComponent / Goal layer 10):
 // the holder walks over the heads to above the friend at the door, then that friend slides into
 // the free cell left of the door while the holder walks right against the carry, so the holder
 // drops onto the door floor and the key reaches the door (a carrier cannot jump, ridersOf).
 const door=s.map.exit,opener=s.players.filter(p=>!p.exit&&p.id!==(s.keyState&&s.keyState.holderId)).sort((a,b)=>a.x-b.x)[0];
 for(let t=0;t<1500&&s.status==='play'&&!s.players.every(p=>p.exit);t++){
  const holder=s.players.find(p=>p.id===(s.keyState&&s.keyState.holderId)),input={};
  for(const p of s.players){if(p.exit)continue;const ax=p.x+16,inDoor=p.x<door.x+door.w&&door.x<p.x+p.w&&p.y<door.y+door.h&&door.y<p.y+p.h;
   if(s.goalOpen){input[p.id]=inDoor?{up:true}:{left:ax>door.x+door.w/2,right:ax<door.x+door.w/2-6};continue;}
   if(p===holder&&p!==opener){const above=Math.abs(p.x-opener.x)<4;const onHeads=p.grounded&&p.supportId&&!String(p.supportId).startsWith('terrain');
    const riding=onHeads&&p.supportId===opener.id;
    input[p.id]=riding?{right:true}:above?{}:{left:p.x>opener.x,right:p.x<opener.x-4,jump:!onHeads&&(t%24)<14};continue;}
   if(p===opener&&holder&&holder!==opener&&holder.supportId===opener.id)input[p.id]={left:p.x>door.x-48+2};}
  step(input);
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

// ------------------------------------------------------------------ 2편 1-3
// Ported from stage03-route-review.cjs teamRoute: two volunteers alternate the
// DashBoard launch into the FallingWall until it falls, then everyone crosses,
// touches the key and enters.
policies.st_w_01_03=function(run){
 const s=run.s,count=run.count,bots=s.players.map(()=>({phase:'go',hold:0,launched:false}));
 let marked=false;
 for(let guard=0;guard<10000&&s.status==='play';guard++){
  const inputs={},wall=s.motionState.walls[0];
  for(let j=0;j<count;j++){
   const p=s.players[j],b=bots[j];let input={};
   if(wall.fallen){
    if(p.grounded&&p.x>1040&&p.x<1800&&!b.hold&&!p.jump)b.hold=14;
    input={right:true,up:true,jump:b.hold>0};b.hold=Math.max(0,b.hold-1);
   }else{
    if(j<count-2||s.ticks<(count-1-j)*100)continue;
    if(p.forcedVx>1000)b.launched=true;
    if(b.launched&&p.forcedVx<0){b.phase='return';b.launched=false;}
    if(b.phase==='return'&&p.x<740&&p.y<255&&p.grounded)b.phase='go';
    if(b.phase==='go'){input.right=true;input.jump=p.x>751&&p.x<854;}
    else{input.left=true;if(p.grounded&&p.x<925&&!b.hold&&!p.jump)b.hold=14;input.jump=b.hold>0;b.hold=Math.max(0,b.hold-1);}
   }
   inputs[p.id]=input;
  }
  run.step(inputs);
  if(wall.fallen&&!marked){run.mark('falling wall knocked over by dashes',{hits:wall.hits});marked=true;}
 }
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 1-4
// Seven switches must be held at once (SwitchObserver -> Key), three of them
// open the gates in front of the other three. Holders are placed deepest-first
// (S12 before S9, S6 before S11, S14 before S10), the eighth player takes the
// key on the tall block, then holders leave in the reverse dependency order
// and everyone climbs the staircase to the goal.
policies.st_w_01_04=function(run){
 const s=run.s,P=id=>run.p(id),sw=n=>s.map.switches.find(b=>b.name===n);
 const on=(st,n)=>st.map.switches.find(b=>b.name===n).pressed;
 const me=(st,id)=>st.players.find(q=>q.id===id);
 const nav=(id,label,goal,target,opts={})=>run.segment(id+' '+label+' '+goal.toString()+JSON.stringify(target),()=>K.nav(run,id,goal,target,{maxNodes:8000,label,...opts}));
 const task=(id,label,gen)=>run.run(id,gen,{label});
 const launched=p=>p.vy<-24*60;
 // floor/anywhere low -> top of the big block (via JumpStand1..6)
 const toBigBlock=(id,x=1200)=>nav(id,'big block',st=>{const p=me(st,id);return p.grounded&&p.y<=914.5&&p.x>1150&&p.x<1250;},{x,y:914});
 // big block top -> JumpStand14 -> tall block top
 const toTall=(id)=>{
  nav(id,'launch J11-J14',st=>{const p=me(st,id);return p.vy<-24*60&&p.x>1290;},{x:1420,y:880});
  task(id,'rise onto tall block',H.steer(run,id,1530,(p)=>p.grounded&&p.y<=290.5&&p.x>1488,{label:'tall block'}));
 };
 // tall block top -> staircase -> goal
 const tallToGoal=(id)=>{
  task(id,'tall block right end',H.walkTo(run,id,1934,{tol:2}));
  nav(id,'staircase to goal',st=>me(st,id).exit,{x:2240,y:98},{extra:{up:true}});
 };
 // right-region floor -> JumpStand15 -> back onto the tall block top
 const rightToTall=(id)=>task(id,'J15 to tall block',H.steer(run,id,(p)=>p.vy<-24*60||!p.grounded&&p.y<900?1930:2040,(p)=>p.grounded&&p.y<=290.5&&p.x<1968,{label:'J15',autoJump:true}));
 nav('p8','Switch12',st=>on(st,'Switch12'),{x:1136,y:914});
 nav('p7','Switch9',st=>on(st,'Switch9'),{x:1520,y:1346});
 nav('p6','Switch8',st=>on(st,'Switch8'),{x:1088,y:482});
 nav('p5','S8 block',st=>{const p=me(st,'p5');return p.grounded&&p.y<=482.5&&p.x>=1056&&p.x<1066;},{x:1060,y:482});
 task('p5','JumpStand7',H.seq(()=>H.hold(run,'p5',{},2),()=>H.steer(run,'p5',978,(p)=>launched(p),{label:'J7',max:600,jumpIf:(p)=>p.y<500})));
 task('p5','fly to Switch6',H.steer(run,'p5',416,()=>sw('Switch6').pressed,{label:'S6'}));
 run.mark('Switch12, Switch9, Switch8, Switch6 held');
 toBigBlock('p4');
 nav('p4','launch J10-J14',st=>{const p=me(st,'p4');return p.vy<-24*60&&p.x>1250;},{x:1300,y:880});
 task('p4','fall into Gate1 tunnel',H.steer(run,'p4',(p)=>p.y>600?1530:1440,(p)=>p.grounded&&p.x>1455&&p.y>700&&p.y<800,{label:'gate1'}));
 task('p4','Switch11',H.walkTo(run,'p4',1856,{tol:4}));
 if(!sw('Switch11').pressed)throw new Error('Switch11 not pressed');
 toBigBlock('p3');toTall('p3');
 task('p3','drop to right region',H.steer(run,'p3',1980,(p)=>p.grounded&&p.y>900&&p.x>1968,{label:'drop right'}));
 nav('p3','Switch14',st=>on(st,'Switch14'),{x:2320,y:434});
 run.mark('Switch11 and Switch14 held');
 toBigBlock('p2');toTall('p2');
 task('p2','drop to right region',H.steer(run,'p2',1980,(p)=>p.grounded&&p.y>900&&p.x>1968,{label:'drop right'}));
 nav('p2','Switch10',st=>on(st,'Switch10'),{x:1760,y:1010});
 run.mark('all seven switches held',{pressed:s.map.switches.filter(b=>b.pressed).length,keyActive:s.keyActive});
 toBigBlock('p1');toTall('p1');
 task('p1','key',H.walkTo(run,'p1',s.map.key.x));
 if(!s.keyTaken)throw new Error('key not taken');
 run.mark('key taken');
 tallToGoal('p1');
 // Holders behind gates leave first while the gate holders stay.
 nav('p2','out through Gate3',st=>{const p=me(st,'p2');return p.grounded&&p.x>1975&&p.y>900;},{x:2000,y:962});
 rightToTall('p2');tallToGoal('p2');
 nav('p7','out through Gate2',st=>{const p=me(st,'p7');return p.grounded&&p.x<1060;},{x:1000,y:1346});
 toBigBlock('p7');toTall('p7');tallToGoal('p7');
 nav('p4','out through Gate1',st=>{const p=me(st,'p4');return p.grounded&&p.y>900&&p.x<1460;},{x:1300,y:914});
 toBigBlock('p4');toTall('p4');tallToGoal('p4');
 run.mark('holders behind gates are out');
 task('p3','leave Switch14',H.steer(run,'p3',2180,(p)=>p.grounded&&p.y>900,{label:'drop'}));
 rightToTall('p3');tallToGoal('p3');
 toBigBlock('p8');toTall('p8');tallToGoal('p8');
 toBigBlock('p6');toTall('p6');tallToGoal('p6');
 toBigBlock('p5');toTall('p5');tallToGoal('p5');
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 4-4
// Vertical BlinkThunder beams (x 46,104,162,418,476,534,592,650) are on for
// 3 s and off for 0.9 s (55 ticks); the horizontal one at y 138..142 sits just
// above the upper pillar row, so nobody ever jumps. Players only cross beams
// during the off window and always finish a window inside a beam-free column:
// C1 [48,70] C2 [106,128] C3 [164,384] C6 [536,558] C8 [652,..] (player x).
policies.st_w_04_04=function(run){
 const s=run.s,bt=s.blinkThunderState.thunders[0];
 const off=()=>!bt.visible;
 const go=(id,x)=>H.walkTo(run,id,x,{autoJump:false,tol:1.5});
 // Wait for the next off window (starting fresh), then move.
 const inWindow=(id,f)=>H.seq(()=>H.waitUntil(run,id,()=>!off()),()=>H.waitUntil(run,id,off),f);
 const enter=id=>H.enter(run,id);
 const window=(label,tasks)=>{run.together(tasks,{label});run.mark(label,{beamsVisible:bt.visible});};
 // Visible phase: C3 pillar players drop to floor slots, one after another.
 for(const [id,x] of [['p8',382],['p7',346],['p6',310],['p5',274]])run.run(id,go(id,x),{label:'C3 '+id});
 run.mark('C3 players on the floor');
 // p2 (lower pillar in C1) drops left of its pillar through the left beam,
 // falls past the key and steps back into C1 before the beams return.
 const keyDrop=()=>(function*(){const p=run.p('p2');
  while(p.x>28)yield {left:true};
  while(p.y<386)yield {};
  while(p.x<54)yield {right:true};
 })();
 const shift=(...moves)=>{for(const [id,x] of moves)run.run(id,go(id,x),{label:'shift '+id});};
 const W=(label,tasks)=>window(label,Object.fromEntries(Object.entries(tasks).map(([id,x])=>[id,typeof x==='function'?inWindow(id,x):inWindow(id,()=>go(id,x))])));
 W('W1 p8 to C6, p2 takes key',{p8:545,p2:keyDrop});
 if(!s.keyTaken)throw new Error('key not taken in W1');
 shift(['p7',382],['p6',346],['p5',310]);
 W('W2',{p8:670,p7:545,p4:274});
 run.together({p8:enter('p8')});shift(['p6',382],['p5',346],['p4',310]);
 W('W3',{p7:670,p6:545,p3:274});
 run.together({p7:enter('p7')});shift(['p5',382],['p4',346],['p3',310]);
 W('W4',{p6:670,p5:545,p2:202,p1:120});
 run.together({p6:enter('p6')});shift(['p4',382],['p3',346],['p2',310]);
 W('W5',{p5:670,p4:545,p1:274});
 run.together({p5:enter('p5')});shift(['p3',382],['p2',346],['p1',310]);
 W('W6',{p4:670,p3:545});
 run.together({p4:enter('p4')});shift(['p2',382],['p1',346]);
 W('W7',{p3:670,p2:545});
 run.together({p3:enter('p3')});shift(['p1',382]);
 W('W8',{p2:670,p1:545});
 run.together({p2:enter('p2')});
 W('W9',{p1:670});
 run.run('p1',enter('p1'));
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 11-4
// ThornCeiling: every row drops a thorn in each non-safe column, and "trap"
// thorns in some safe columns 0.4 s later from one chip higher. The row is
// readable from the state once created (lastSet), and the PCG32 stream uses the
// fixed default seed, so the row sequence is identical on every replay.
// Thunder2 (y 552..556) forbids jumping for the first 20 s. Players keep their
// left-to-right order and walk to slots outside the danger columns; after the
// normal thorns of a row are gone, anyone under a trap column steps aside.
policies.st_w_11_04=function(run){
 const s=run.s,c=s.thornCeilingState.ceilings[0],ids=s.players.map(p=>p.id);
 const ROOM=[96,1104],W=32,GAP=2;
 const zone=col=>[c.x+48*col-12,c.x+48*col+12];
 // Free intervals (player x ranges) avoiding the given danger columns.
 function slotsAvoiding(cols){
  const zones=cols.map(zone).sort((a,b)=>a[0]-b[0]);
  const free=[];let left=ROOM[0];
  for(const [a,b] of zones){if(a-left>=W)free.push([left,a]);left=Math.max(left,b);}
  if(ROOM[1]-left>=W)free.push([left,ROOM[1]]);
  const slots=[];
  for(const [a,b] of free)for(let x=a+1;x+W<=b-1;x+=W+GAP)slots.push(x);
  return slots;
 }
 // Order-preserving assignment minimising total walking (DP).
 function assign(players,slots){
  const n=players.length,m=slots.length;if(m<n)throw new Error('not enough safe slots '+m+' for '+n+' at tick '+s.ticks);
  const INF=1e18,dp=Array.from({length:n+1},()=>Array(m+1).fill(INF)),pick=Array.from({length:n+1},()=>Array(m+1).fill(false));
  for(let j=0;j<=m;j++)dp[0][j]=0;
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){
   const skip=dp[i][j-1],take=dp[i-1][j-1]+Math.abs(players[i-1].x-slots[j-1]);
   if(take<skip){dp[i][j]=take;pick[i][j]=true;}else dp[i][j]=skip;
  }
  const out={};let i=n,j=m;
  while(i>0){if(pick[i][j]){out[players[i-1].id]=slots[j-1];i--;j--;}else j--;}
  return out;
 }
 let setRef=null,targets={},trapPhase=false,rows=0;
 const live=()=>s.players.filter(p=>!p.exit).sort((a,b)=>a.x-b.x);
 for(let guard=0;guard<6000&&c.phase<5;guard++){
  const set=c.lastSet;
  if(set&&set!==setRef){
   setRef=set;trapPhase=false;rows++;
   const normal=[];for(let col=0;col<c.ceilingWidth;col++)if(!set.safeColumns.includes(col))normal.push(col);
   // Prefer slots clear of both normal and trap thorns; fall back to normal-only.
   let slots=slotsAvoiding([...normal,...set.trapColumns]);
   if(slots.length<live().length)slots=slotsAvoiding(normal);
   targets=assign(live(),slots);
   run.mark('thorn row '+rows,{safe:set.safeColumns,trap:set.trapColumns,targets});
  }
  if(setRef&&!trapPhase&&setRef.trapColumns.length){
   const normalAlive=c.thorns.some(t=>t.active&&!t.trap&&t.phase<4);
   const someoneUnderTrap=live().some(p=>setRef.trapColumns.some(col=>{const [a,b]=zone(col);return p.x+W>a&&p.x<b;}));
   if(!normalAlive&&someoneUnderTrap){trapPhase=true;targets=assign(live(),slotsAvoiding(setRef.trapColumns));}
  }
  const inputs={};
  for(const p of live()){const tx=targets[p.id];if(tx===undefined)continue;inputs[p.id]={right:p.x<tx-1.5,left:p.x>tx+1.5};}
  run.step(inputs);
 }
 if(c.phase<5)throw new Error('thorn ceiling not survived');
 run.mark('thorn ceiling survived',{rows,hitPoint:c.hitPoint,keyActive:s.keyActive});
 // Key above the goal: the beam is gone after 20 s, so a jump reaches it.
 const k=s.map.key,taker=live().reduce((a,b)=>Math.abs(b.x-k.x)<Math.abs(a.x-k.x)?b:a);
 run.run(taker.id,H.walkTo(run,taker.id,k.x));
 run.run(taker.id,H.jumpTo(run,taker.id,k.x));
 if(!s.keyTaken)throw new Error('key not taken');
 run.mark('key taken');
 for(const p of [...live()].sort((a,b)=>Math.abs(a.x-1016)-Math.abs(b.x-1016)))run.run(p.id,H.enter(run,p.id));
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 10-2
// Nobody can climb from the spawn ledges, but the pit below is a WarpInitPos
// volume (x -100..1400) whose destination is each player's own init position
// plus the authored offset (0,-600): falling in drops you back from above onto
// the upper platform over your spawn. Right-side players must drift left of
// x 1400 while falling or they miss the volume. On the upper platforms the
// two DashBoards (vx +-40, vy -13) are mirror images, so a left and a right
// player stepping on them in the same tick collide over the centre and fall
// straight through the key and the goal (up held).
policies.st_w_10_02=function(run){
 const s=run.s,P=id=>run.p(id),box=s.deviceState.devices.find(d=>d.type==='PushBox');
 function drop(id,side){return (function*(){const p=P(id);let warped=false,prevY=p.y;
  for(let i=0;i<3000;i++){
   if(p.y<prevY-300)warped=true;prevY=p.y;
   if(warped&&p.grounded)return;
   let dir=0;
   if(!warped)dir=side==='L'?1:-1;
   else{const lo=side==='L'?250:1400,hi=side==='L'?600:1740;dir=p.x<lo?1:p.x>hi?-1:0;}
   yield {right:dir>0,left:dir<0};
  }throw new K.RouteError('warp drop '+id,run);})();}
 const left=['p1','p3','p5','p7'],right=['p2','p4','p6','p8'];
 run.together(Object.fromEntries([...left.map(id=>[id,drop(id,'L')]),...right.map(id=>[id,drop(id,'R')])]),{label:'warp up'});
 run.mark('everyone warped onto the upper platforms');
 // Hop over the PushBox instead of pushing it (one pusher moves it).
 const overBox=(p)=>p.grounded&&p.x+p.w<=box.x+0.5&&box.x-(p.x+p.w)<8&&p.y+p.h>box.y;
 // p7 and p8 come down on top of p5 and p6, so riders dash before carriers.
 const order=[['p1','p2'],['p3','p4'],['p7','p8'],['p5','p6']];
 for(let k=0;k<4;k++){
  const [L,Rt]=order[k];
  run.together({[L]:H.walkTo(run,L,510,{jumpIf:overBox,autoJump:false}),[Rt]:H.walkTo(run,Rt,1474,{autoJump:false})},{label:'pair '+(k+1)+' ready'});
  const a=P(L),b=P(Rt);
  const dash=(p,dir)=>(function*(){for(let i=0;i<400&&!p.exit;i++)yield {right:dir>0,left:dir<0,up:true};if(!p.exit)throw new K.RouteError('dash missed '+p.id,run);})();
  run.together({[L]:dash(a,1),[Rt]:dash(b,-1)},{label:'pair '+(k+1)+' dash'});
  run.mark('pair '+(k+1)+' entered',{pair:[L,Rt],keyTaken:s.keyTaken});
 }
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 5-2
// Four trigger boxes (3 pushers each) must be pushed into the wall switches on
// four tiers; every tier is a 48 px corridor under the next one, so towers
// (helper + climber) only work right of each tier's edge. The key sits above
// the ceiling block, the goal is behind a 144 px wall and covered by a 1-pusher
// box. The last player over the wall needs a staircase: PushBox7 (48) next to
// PushBox1 (96, 8 pushers) next to the wall.
// The big box is pushed first while all eight are next to it; 380 px is enough
// for the box-top -> wall-top jump and still reaches the first timer switch
// before the 15 s DeadTimer runs out.
policies.st_w_05_02=function(run){
 const s=run.s,P=id=>run.p(id),dev=n=>s.deviceState.devices.find(d=>d.name===n);
 const big=dev('PushBox1'),b3=dev('PushBox3'),b4=dev('PushBox4'),b5=dev('PushBox5'),b6=dev('PushBox6'),b7=dev('PushBox7'),b11=dev('PushBox11');
 const timer=s.switchTimerState.timers[0];
 const go=(id,x,o={})=>H.walkTo(run,id,x,{autoJump:false,...o});
 const holdWhile=(input,cond,max=4000)=>(function*(){for(let i=0;i<max&&cond();i++)yield input;if(cond())throw new K.RouteError('hold timed out',run);})();
 const ids=s.players.map(p=>p.id);
 // C stands right of helper Hid, hops on its head, then leaps left onto the tier above.
 function climb(C,Hid,landX){
  run.run(C,go(C,P(Hid).x+36),{label:C+' queue'});
  run.run(C,H.jumpTo(run,C,P(Hid).x+2),{label:C+' onto '+Hid});
  if(P(C).supportId!==Hid)throw new K.RouteError(C+' not on '+Hid,run);
  run.run(C,H.jumpTo(run,C,landX),{label:C+' leap'});
 }
 const climbL=(C,Hid,landX)=>{ // climber starts LEFT of the helper (inside the gap)
  run.run(C,go(C,P(Hid).x-36,{autoJump:false}),{label:C+' gap'});
  run.run(C,H.jumpTo(run,C,P(Hid).x-2),{label:C+' onto '+Hid});
  if(P(C).supportId!==Hid)throw new K.RouteError(C+' not on '+Hid,run);
  run.run(C,H.jumpTo(run,C,landX),{label:C+' leap'});
 };
 const push=(ids,box,dir,cond)=>run.together(Object.fromEntries(ids.map(id=>[id,holdWhile(dir>0?{right:true}:{left:true},cond)])),{label:'push '+box.name});
 // P0: everyone pushes the big box 380 px.
 push(ids,big,1,()=>big.x<1972);
 run.mark('big box pushed toward the wall',{bigBox:big.x,timer:timer.sec});
 // P1 tier1: p1-p3 push PushBox3, p4 is the helper at 716 (gap 672..716 left of it).
 run.together({p1:holdWhile({left:true},()=>b3.x>56),p2:holdWhile({left:true},()=>b3.x>56),p3:holdWhile({left:true},()=>b3.x>56),
  p4:go('p4',716),p5:go('p5',752),p6:go('p6',786),p7:go('p7',820),p8:go('p8',854)},{label:'tier1'});
 run.mark('tier1 box in and helper ready',{timer:timer.sec,timerStopped:timer.stopped});
 // Each climber clears the landing area at once so the next leap is free.
 for(const [C,x] of [['p5',200],['p6',234],['p7',268],['p8',572]]){climb(C,'p4',620);run.run(C,go(C,x),{label:C+' clear'});}
 climbL('p3','p4',620);run.run('p3',go('p3',640),{label:'p3 clear'});
 run.mark('five players on tier2');
 // P2 tier2: helper p8 at 572; p5-p7 push PushBox4; p3 climbs from the right.
 push(['p5','p6','p7'],b4,-1,()=>b4.x>56);
 climb('p3','p8',476);run.run('p3',go('p3',200),{label:'p3 clear'});
 for(const [C,x] of [['p7',234],['p6',268],['p5',470]]){climbL(C,'p8',476);run.run(C,go(C,x),{label:C+' clear'});}
 run.mark('four players on tier3');
 // P3 tier3: p3,p7,p6 push PushBox5; p5 is the helper at 428 (gap 384..428).
 run.run('p5',go('p5',428),{label:'p5 helper'});
 push(['p3','p7','p6'],b5,-1,()=>b5.x>56);
 // Hop over PushBox7 (one pusher would shove it into the corridor).
 // Rise straight up beside it first: touching it while rising counts as pushing.
 const hopB7=C=>H.seq(()=>go(C,b7.x+b7.w+4,{tol:1.5}),()=>H.hold(run,C,{jump:true},10),()=>H.hold(run,C,{left:true,jump:true},4));
 for(const [C,x] of [['p6',144],['p7',178],['p3',212]]){climbL(C,'p5',330);run.run(C,H.seq(()=>hopB7(C),()=>go(C,x)),{label:C+' clear'});}
 run.mark('three players on tier4');
 // P4 tier4: all three push PushBox6 (the corridor fits exactly three).
 push(['p6','p7','p3'],b6,-1,()=>b6.x>56);
 run.mark('all trigger switches latched',{keyActive:s.keyActive,observer:s.gateState.observers[0].pushedCount});
 // Key: p3 hops onto PushBox7 (top 96) and leaps left onto the ceiling block (top 48).
 run.run('p3',go('p3',254));
 run.run('p3',H.jumpTo(run,'p3',296),{label:'onto box7'});
 run.run('p3',H.jumpTo(run,'p3',200),{label:'onto ceiling block'});
 run.run('p3',go('p3',s.map.key.x));
 if(!s.keyTaken)throw new Error('key not taken');
 run.mark('key taken');
 // Step just past the ceiling block's edge and drop into the gap left of PushBox7.
 run.run('p3',holdWhile({right:true},()=>P('p3').x<242));
 run.run('p3',holdWhile({},()=>!(P('p3').grounded&&P('p3').y>90)));
 // P5: one player waits in each lower corridor to take PushBox7 over each edge.
 run.run('p5',go('p5',340));run.run('p8',go('p8',484));run.run('p4',go('p4',628));
 run.mark('corridor relay for PushBox7 in place');
 run.run('p3',holdWhile({right:true},()=>b7.y<150),{label:'box7 off tier4'});
 run.run('p5',holdWhile({right:true},()=>b7.y<250),{label:'box7 off tier3'});
 run.run('p8',holdWhile({right:true},()=>b7.y<350),{label:'box7 off tier2'});
 run.run('p4',holdWhile({right:true},()=>b7.x+b7.w<big.x-0.5),{label:'box7 to big box'});
 run.mark('PushBox7 against the big box',{b7:b7.x,big:big.x});
 // P6: everyone down to the floor and over the staircase into the goal room.
 const down=id=>run.run(id,holdWhile({right:true},()=>!(P(id).grounded&&P(id).y>380&&P(id).x>1500),3000),{label:id+' down'});
 const over=(id,first)=>{
  run.run(id,go(id,b7.x-40),{label:id+' before stairs'});
  run.run(id,H.jumpTo(run,id,b7.x+8),{label:id+' onto box7'});
  run.run(id,H.jumpTo(run,id,big.x+30),{label:id+' onto big box'});
  // The box top -> wall top jump needs a start within ~11 px of the box's right edge.
  run.run(id,go(id,big.x+big.w-5,{tol:1}),{label:id+' big box edge'});
  run.run(id,H.jumpTo(run,id,2172),{label:id+' onto wall'});
  // Step off the wall top and drop straight down beside PushBox11.
  run.run(id,holdWhile({right:true},()=>P(id).x<2210),{label:id+' off wall'});
  run.run(id,holdWhile({},()=>!(P(id).grounded&&P(id).y>380)),{label:id+' into room'});
  if(first)run.run(id,holdWhile({right:true},()=>b11.x<2304),{label:'PushBox11 off the goal'});
  run.run(id,H.enter(run,id),{label:id+' goal'});
 };
 over('p4',true);
 for(const id of ['p8','p5','p3','p7','p6','p2','p1']){down(id);over(id,false);}
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 4-1
// The key needs a 4-high tower on the ledge in the pocket (x 1296..1440).
// Touching it starts Thunder2..4 sweeping down every compartment of the ledge
// (0.3 px/tick, ~900 ticks to head height) and taking it drops the four
// Bridges (1 px/tick). A bridge stops only on a player directly below it, and
// a player at ledge level under it is the only way through. So one holder
// stands under each bridge and the whole crew leaves as one contiguous train:
// every bridge column stays occupied until the last player has passed.
// Tower: base 1328, then 1336, 1344, 1352 (8 px steps). With these offsets
// the dismount lands everyone at ledge level touching the next player.
policies.st_w_04_01=function(run){
 const s=run.s,P=id=>run.p(id);
 const go=(id,x,o={})=>H.walkTo(run,id,x,{autoJump:false,...o});
 const holdWhile=(input,cond,max=3000)=>(function*(){for(let i=0;i<max&&cond();i++)yield input;if(cond())throw new K.RouteError('hold timed out',run);})();
 // floor -> step block (864..912, top 384) -> ledge (960.., top 336)
 const toLedge=id=>{run.run(id,go(id,820),{label:id+' to step'});run.run(id,H.jumpTo(run,id,880),{label:id+' onto step'});run.run(id,H.jumpTo(run,id,990),{label:id+' onto ledge'});};
 const climbOn=(id,x)=>run.run(id,H.jumpTo(run,id,x),{label:id+' climb '+x});
 // Tower: p8 base, p7, p6, p5 on top.
 // Climbers start pressed against the base (x = base-32 >= 1296, clear of
 // Bridge4's column) and are clamped by the next player at each level.
 toLedge('p8');run.run('p8',go('p8',1330));const bx=P('p8').x;
 if(bx<1328||bx>1333)throw new K.RouteError('base off '+bx,run);
 const approach=id=>{toLedge(id);run.run(id,go(id,bx-32),{label:id+' at base'});};
 approach('p7');climbOn('p7',bx+8);run.run('p7',go('p7',bx+8,{tol:1.6}));
 approach('p6');climbOn('p6',bx-24);climbOn('p6',bx+16);run.run('p6',go('p6',bx+16,{tol:1.6}));
 approach('p5');climbOn('p5',bx-24);climbOn('p5',bx-16);climbOn('p5',bx+24);run.run('p5',go('p5',bx+24,{tol:1.6}));
 run.mark('four-high tower under the key',{tower:['p8','p7','p6','p5'].map(id=>[id,P(id).x,P(id).y])});
 // Holders: p1..p3 under Bridge1..3, p4 waits left of Bridge4's column.
 for(const [id,x] of [['p4',1232],['p3',1168],['p2',1072],['p1',976]]){toLedge(id);run.run(id,go(id,x,{tol:1}),{label:id+' holder'});}
 run.mark('holders in place');
 // Key: straight jump from the top of the tower.
 run.run('p5',H.hold(run,'p5',{jump:true},14));
 run.run('p5',holdWhile({},()=>!P('p5').grounded));
 if(!s.keyTaken)throw new Error('key not taken');
 run.mark('key taken',{bridges:s.bridgeState.bridges.map(b=>b.h)});
 // p4 steps under Bridge4 before it reaches head height (42 ticks).
 run.run('p4',go('p4',1264,{tol:0.5}),{label:'p4 under bridge4'});
 // Dismount: p6 (carrying p5) steps off p7 and drops straight down.
 run.run('p6',holdWhile({right:true},()=>P('p6').grounded),{label:'p6 off p7'});
 run.run('p6',holdWhile({},()=>!P('p6').grounded),{label:'p6 drop'});
 run.run('p5',holdWhile({right:true},()=>P('p5').y<280||!P('p5').grounded),{label:'p5 down'});
 run.run('p7',holdWhile({left:true},()=>P('p7').grounded&&P('p7').y<280),{label:'p7 off base'});
 run.run('p7',holdWhile({},()=>!P('p7').grounded),{label:'p7 drop'});
 const crew=['p5','p6','p8','p7','p4','p3','p2','p1'];
 run.mark('crew at ledge level',{line:crew.map(id=>[id,Math.round(P(id).x),Math.round(P(id).y)])});
 // Train: a player starts moving left once it is moving or its right
 // neighbour touches it; everyone keeps going until off the ledge.
 const order=[...crew].sort((a,b)=>P(a).x-P(b).x);
 const moving=new Set(['p5','p6','p8','p7']);
 for(let t=0;t<2000;t++){
  const inputs={};
  for(let i=order.length-1;i>=0;i--){
   const id=order[i],p=P(id),right=order[i+1]&&P(order[i+1]);
   if(!moving.has(id)&&right&&moving.has(order[i+1])&&right.x-(p.x+p.w)<4)moving.add(id);
   // Off the ledge, keep walking left to a free floor slot so nobody lands on heads.
   const slot=480+34*i;
   if(moving.has(id)&&p.x>slot+1.5)inputs[id]={left:true};
  }
  run.step(inputs);
  if(order.every((id,i)=>P(id).x<=480+34*i+1.5&&P(id).grounded))break;
 }
 run.mark('train cleared the bridges',{bridges:s.bridgeState.bridges.map(b=>Math.round(b.h)),line:order.map(id=>[id,Math.round(P(id).x),Math.round(P(id).y)])});
 // The corridor under the ledge is 48 px high: nobody can pass, so the rightmost goes first.
 for(const id of [...order].sort((a,b)=>P(b).x-P(a).x))run.run(id,H.enter(run,id),{label:id+' goal'});
 run.mark('all players in goal');
};

// ------------------------------------------------------------------ 2편 4-3
// Not clearable on the current runtime at any player count: the Key's
// collision box (anchor 240,480 -> 224..256 x 452..508) lies inside terrain
// (192..288 x 432..480) and below the map, pickup is plain overlap, and the
// only way under that terrain crosses the always-on through Thunder beams at
// y 454..458 that span the whole room. Nothing is recorded; the evidence is
// computed from the same compiled data and attached to the round.
policies.st_w_04_03=function(run){
 const s=run.s,key=s.map.key,W=32,Hh=46;
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const inside=s.map.platforms.filter(p=>overlap(p,key)).map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h}));
 // Every x a player can have while overlapping the key horizontally, and the
 // lowest standing height there (top of the highest solid under that span).
 const xs=[];for(let x=Math.ceil(key.x-W+1);x<=Math.floor(key.x+key.w-1);x++)xs.push(x);
 const standY=x=>Math.min(...s.map.platforms.filter(p=>x<p.x+p.w&&x+W>p.x&&p.y>=key.y-Hh).map(p=>p.y))-Hh;
 const bestStand=Math.max(...xs.map(standY));
 // Beams at tick 1 (no input yet).
 run.step({});
 const beams=(s.map.hazards||[]).filter(h=>h.type==='Thunder'&&h.lethal!==false).map(h=>({id:h.id,x:h.x,y:h.y,w:h.w,h:h.h}));
 const thunders=s.bridgeState.thunders.map(t=>({name:t.name,x:t.x,y:t.y,through:t.through,switchType:t.switchType,disappearTime:t.disappearTime}));
 const room={x:48,w:s.map.width-96};
 const beamCoversRoom=beams.some(b=>b.x<=room.x&&b.x+b.w>=room.x+room.w);
 // No-input reference: when and how the round ends without input.
 const probe=new Run(run.stage,run.count,{throwOnDeath:false});for(let i=0;i<600&&probe.s.status==='play';i++)probe.step({});
 return {blocked:{reason:'열쇠 충돌 상자가 지형 안(맵 바닥 아래까지)에 있고, 줍기는 단순 겹침이라 플레이어가 닿을 수 없다. 지형 아래로 돌아가는 길은 항상 켜진 관통 전기(y 454~458, 방 전체 폭)를 지나야 한다.',
  key,keyInsideTerrain:inside,
  playerMustReachY:key.y-Hh,highestReachableStandingY:bestStand,gapPx:+(key.y-Hh-bestStand).toFixed(3),
  beams,thunders,beamCoversRoom,room,
  noInput:{status:probe.s.status,ticks:probe.s.ticks,seconds:+(probe.s.ticks/60).toFixed(3),failure:probe.s.failure},
  keyByCount:Object.fromEntries([2,3,4,5,6,7,8].map(n=>[n,K.loadCompiled(run.stage,n).map.key])),
  suspectedCause:'추정: 원작은 열쇠에 충돌 밀어내기/부착 상태기계가 있어 지형 위로 올라오거나 다른 경로로 전달된다. 런타임 status.missingMechanics 에 "Key attach, transfer and goal-opening state machine (overlap pickup used)" 로 미이식 표시돼 있다.'}};
};

function recordOne(stage){
 const policy=policies[stage];
 if(!policy)return {stage,count:COUNT,status:'no-policy',commands:[],milestones:[]};
 const run=new Run(stage,COUNT);
 let error=null,result=null;
 try{result=policy(run);}catch(e){error=e.message;}
 if(result&&result.blocked)return {stage,count:COUNT,status:'blocked',ticks:0,seconds:0,deaths:0,commands:[],milestones:[],blocked:result.blocked,error:null};
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
  rounds:rounds.map(r=>({stage:r.stage,count:r.count,status:r.status,ticks:r.ticks,seconds:r.seconds,deaths:r.deaths,error:r.error||null,...(r.blocked?{blocked:r.blocked}:{}),commands:r.commands,milestones:r.milestones}))};
 fs.writeFileSync(OUT,JSON.stringify(out)+'\n');
 console.log('wrote',path.relative(__dirname,OUT));
}
