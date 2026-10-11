'use strict';
// Input-only source-route evidence. Every recorded trial starts at R.create.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const R=require('./source-stage-runtime.js');
const dir=__dirname,snap=s=>s.players.map(({id,x,y,grounded,supportId,exit})=>({id,x,y,grounded,supportId,exit}));
function run(count){
 const compiled=JSON.parse(fs.readFileSync(path.join(dir,'play/data',count+'.json'),'utf8')),s=R.create(compiled),commands=[],milestones=[];
 let overlaps=0,activeOverlaps=0,maxTower=0;
 function step(inputs={}){R.step(s,inputs);const text=JSON.stringify(inputs),last=commands.at(-1);if(last&&JSON.stringify(last.inputs)===text)last.frames++;else commands.push({frames:1,inputs});for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(R.overlap(s.players[i],s.players[j])){overlaps++;if(!s.players[i].exit&&!s.players[j].exit)activeOverlaps++;}}
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
 const result={count,placementsUsed:false,stateMutationUsed:false,fixtureFlagsUsed:false,ticks:s.ticks,seconds:s.elapsed,status:s.status,keyTaken:s.keyTaken,fullRouteVerified:s.status==='clear',firstGapPassed:milestones[0].players.at(-1).x>912,towerPlayers:maxTower,firstStairPassed,directTowerJumpPassed:directPassed,overlapTicks:activeOverlaps,includingExitedOverlapTicks:overlaps,activePlayerOverlapTicks:activeOverlaps,deaths:s.deaths,milestones,terminalPlayers:snap(s),bottleneck:s.status==='clear'?null:'See final milestone and terminal players',fidelityLimitations:compiled.status.missingMechanics};
 // Independently replay the exact commands against fresh spawns.
 const replay=R.create(compiled);for(const c of commands)for(let f=0;f<c.frames;f++)R.step(replay,c.inputs);
 assert.deepEqual(replay,s);assert.equal(s.status,'clear');assert.equal(s.keyTaken,true);assert.equal(s.players.filter(p=>p.exit).length,count);assert.equal(s.deaths,0);assert.equal(activeOverlaps,0);result.freshSpawnReplayMatched=true;result.recordedCommandGroups=commands.length;result.recordedFrames=commands.reduce((n,c)=>n+c.frames,0);
 return {result,replay:{schemaVersion:1,count,commands,scope:'Complete input-only source01-01: natural spawn through key pickup and every player entering goal',fullRouteVerified:s.status==='clear',placementsUsed:false,stateMutationUsed:false,fixtureFlagsUsed:false,milestones,terminalStatus:s.status}};
}
const runs=[];for(let count=2;count<=8;count++)runs.push(run(count));
const report={schemaVersion:1,stage:'PP2 source01-01',generatedAt:new Date().toISOString(),audio:'none (headless simulation)',runtimeSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'source-stage-runtime.js'))).digest('hex'),fullRouteVerified:runs.every(r=>r.result.fullRouteVerified),humanPlayVerified:false,nativeExecutableVerified:false,cases:runs.map(r=>r.result),summary:{countsTested:[2,3,4,5,6,7,8],firstStairPassed:runs.filter(r=>r.result.firstStairPassed).map(r=>r.result.count),fullRoutePassed:runs.filter(r=>r.result.fullRouteVerified).map(r=>r.result.count),activeOverlapCounts:runs.filter(r=>r.result.activePlayerOverlapTicks>0).map(r=>r.result.count),scope:'Complete source-runtime input route; no placements, manual warps, key opening or exit flags.'}};
fs.writeFileSync(path.join(dir,'whole-route-completion-report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(dir,'whole-route-completion-replay.json'),JSON.stringify(runs.at(-1).replay,null,2)+'\n');
console.log(JSON.stringify(report.summary));
