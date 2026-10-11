'use strict';
// 1-1 closed-loop policy (whole-route-completion.cjs, all counts) driven through a human
// actuation filter: every change of intent lands late by 0-3 ticks (jitter), a start after
// >=20 idle ticks adds a 9-15 tick reaction, and 3% of starts first press a wrong key 4-10 ticks.
const fs=require('fs'),path=require('path');const R=require('../source-stage-runtime.js');const {mulberry}=require('./hd-kit.cjs');
const dir=__dirname,snap=s=>s.players.map(({id,x,y,grounded,supportId,exit})=>({id,x,y,grounded,supportId,exit}));
const HALT={halt:true};
function makeFilter(noise,seed){
 const r=mulberry(seed),ri=(a,b)=>a+Math.floor(r()*(b-a+1));const st={};let wrong=0;
 const key=v=>JSON.stringify(v||{});
 return {maxTicks:60*400,halt:HALT,get wrong(){return wrong;},step(s,inputs){
  if(!noise){R.step(s,inputs);return;}
  const out={};
  for(const p of s.players){const id=p.id,want=inputs[id]||{},k=key(want);const q=st[id]||(st[id]={last:'{}',actual:{},pending:null,idle:0,wrongLeft:0,wrongInput:null});
   if(k!==q.last){const wasIdle=q.last==='{}';let lag=ri(0,noise.jitter);
    if(wasIdle&&q.idle>=20)lag+=ri(noise.reaction[0],noise.reaction[1]);
    if(wasIdle&&k!=='{}'&&r()<noise.wrongRate){wrong++;q.wrongLeft=ri(4,10);const kd=r();q.wrongInput=kd<0.5?(want.right?{left:true}:{right:true}):{jump:true};lag+=q.wrongLeft;}
    q.pending={input:want,at:s.ticks+lag};q.last=k;}
   q.idle=k==='{}'?q.idle+1:0;
   if(q.pending&&s.ticks>=q.pending.at){q.actual=q.pending.input;q.pending=null;}
   let use=q.actual;if(q.wrongLeft>0){use=q.wrongInput;q.wrongLeft--;}
   if(Object.values(use).some(Boolean))out[id]=use;}
  R.step(s,out);}};
}
function runPolicy(count,F){
 const compiled=JSON.parse(fs.readFileSync(path.join(dir,'..','play','data','st_w_01_01',count+'.json'),'utf8')),s=R.create(compiled),commands=[],milestones=[];F.s=s;
 let overlaps=0,activeOverlaps=0,maxTower=0;
 function step(inputs={}){if(s.status!=='play'||s.ticks>F.maxTicks)throw F.halt;F.step(s,inputs);const text=JSON.stringify(inputs),last=commands.at(-1);if(last&&JSON.stringify(last.inputs)===text)last.frames++;else commands.push({frames:1,inputs});for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(R.overlap(s.players[i],s.players[j])){overlaps++;if(!s.players[i].exit&&!s.players[j].exit)activeOverlaps++;}}
 function idle(n=40){for(let i=0;i<n;i++)step();}
 function mark(name,evidence={}){milestones.push({name,tick:s.ticks,players:snap(s),...evidence});}
 function go(id,target,max=1200){const p=s.players.find(p=>p.id===id);let t=0;while(p.x<target&&t++<max)step({[id]:{right:true,jump:!!(p.grounded&&((p.x>800&&p.x<915)||(p.x>1220&&p.y>830))||p.jumpFrame>0&&p.jumpFrame<14)}});idle();return p.x>=target;}
 function hop(id,target){const p=s.players.find(p=>p.id===id);step();for(let t=0;t<45;t++)step({[id]:{right:p.x<target,jump:t<14}});}
 const base=s.players[count-1],top=s.players[0];
 go(base.id,1370);mark('first player crosses gap and reaches spring row');const stack=[base.id];
 for(let i=count-1;i>=1;i--){const id='p'+i;go(id,1337);for(const support of stack)hop(id,s.players.find(p=>p.id===support).x-16);go(id,1371+24*stack.length,120);stack.push(id);}
 maxTower=s.players.filter(p=>p.supportId?.startsWith('p')).length+1;mark('full staircase tower assembled',{towerHeightPlayers:maxTower});
 go(base.id,base.x+(1552-top.x),120);
 const firstStair=compiled.map.platforms.filter(p=>p.x===1584).reduce((a,b)=>a.y<b.y?a:b);
 hop(top.id,1610);
 const directPassed=top.x>=1584&&top.y+46<=firstStair.y+0.01;
 mark('direct top held-jump attempt',{passed:directPassed,requiredRise:874-46*(count-1)-firstStair.y});
 if(!directPassed){
  // A top jump frees its immediate carrier. A delayed carrier jump raises
  // the landing surface; top releases then jumps again from real contact.
  step();for(let t=0;t<100;t++){
   let input={p1:{jump:t<14},p2:{jump:t>=14&&t<28}};
   if(t>=14&&top.grounded)input.p1={jump:!top.jump,right:true};
   else if(t>=14&&top.jumpFrame)input.p1={jump:true,right:true};
   step(input);
  }
  idle();mark('delayed carrier jump and top re-jump');
 }
 const firstStairPassed=top.x>=1584&&top.y+46<=firstStair.y+0.01;
 if(firstStairPassed){mark('first stair reached by normal inputs');for(let z=0;z<10&&top.y+46>480;z++)hop(top.id,top.x+48);go(top.id,1930,180);hop(top.id,1955);mark('first source switch approach',{pressed:s.map.switches[0].pressed});}
 if(firstStairPassed){for(let i=2;i<=count;i++){go('p'+i,1880,200);for(let z=0;z<10&&s.players[i-1].y+46>480;z++)hop('p'+i,s.players[i-1].x+48);go('p'+i,1910,180);hop('p'+i,1990+(i-2)*36);go('p'+i,1990+(i-2)*36,180);mark('remaining player first spring launch and stair climb',{playerId:'p'+i});}}
 if(firstStairPassed){
 go(base.id,2500,500);const scout=s.players[count-2];go(scout.id,2466,600);hop(scout.id,base.x-16);go(scout.id,2530,160);hop(scout.id,2590);for(let z=0;z<7&&scout.y+46>192;z++)hop(scout.id,scout.x+48);go(scout.id,2850,200);mark('second scout reaches delay switch approach');
 for(let i=count-2;i>=1;i--)go('p'+i,2305+32*(i-1),600);mark('second spring launch queue');
 // For sparse queues, bring the rightmost carrier under the key before launch.
 if(count<=5){for(let t=0;t<80&&base.x>2385;t++)step({[base.id]:{left:true}});idle(30);}
 hop(scout.id,2883);mark('delay switch pressed',{pressed:s.map.switches[1].pressed});
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
  step(input);for(const x of s.lastImpulses)if(s.players.find(p=>p.id===x.actorId)?.vy<-1500)launched.add(x.actorId);
  if(s.players.filter(p=>p!==scout).every(p=>p.exit))break;
 }
 mark('earlier wave goal entry and survivor recovery',{launched:[...launched],keyTaken:s.keyTaken,enteredCount:s.players.filter(p=>p.exit).length});
 // Leave just after a new physical-contact countdown arms.
 for(let t=0;t<320&&delay.remaining<4.96;t++)step();
 mark('new countdown armed before scout return',{remaining:delay.remaining});
 for(let t=0;t<260&&scout.x>2340;t++)step({[scout.id]:{left:true}});idle(40);mark('scout returned',{remaining:delay.remaining});
 for(let t=0;t<900;t++){
  const input={};for(const p of s.players)input[p.id]=routeInput(p);
  step(input);for(const x of s.lastImpulses)if(s.players.find(p=>p.id===x.actorId)?.vy<-1500)launched.add(x.actorId);
  if(s.status==='clear')break;
 }
 mark('all player goal entry',{enteredCount:s.players.filter(p=>p.exit).length,status:s.status,keyTaken:s.keyTaken});

 }

 return s;
}
function run(stage,count,{noise=null,seed=1}={}){const F=makeFilter(noise,seed);let s;try{s=runPolicy(count,F);}catch(e){if(e!==HALT)throw e;s=F.s;}
 return {stage,count,status:s.status,seconds:+(s.ticks/60).toFixed(2),failure:s.failure,exited:s.players.filter(p=>p.exit).length,wrongPresses:F.wrong,deathAfterWrongPress:false};}
module.exports={run};
if(require.main===module)for(const n of [2,4,8]){const r=run('st_w_01_01',n);console.log(n,r.status,r.seconds,r.exited);}
