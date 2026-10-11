'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=require('./source-stage-runtime.js'),M=require('./source-motion-devices.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const geometry=JSON.parse(fs.readFileSync(path.join(__dirname,'source-geometry.local.json')));
const compile=count=>R.compile({source,geometry,count,stageId:'st_w_01_03'});
function firstHit(count){
 const s=R.create(compile(count)),p=s.players[count-1];let launched=false,airForcedFrames=0;
 while(s.ticks<600&&s.status==='play'&&!s.motionState.walls[0].hits){
  R.step(s,{[p.id]:{right:true,jump:p.x>751&&p.x<854}});
  if(p.forcedVx>1000){launched=true;airForcedFrames++;}
 }
 assert.ok(launched,'count '+count+' never triggered dash');assert.ok(airForcedFrames>=4,'dash horizontal velocity lost');
 assert.equal(s.motionState.walls[0].hits,1,'count '+count+' no wall impact');assert.ok(p.forcedVx<0,'reflection not applied');
 assert.equal(s.status,'play');
 return {count,passed:true,originalSpawnInputOnly:true,ticks:s.ticks,launched,airForcedFrames,wallHits:s.motionState.walls[0].hits,reflectedVx:p.forcedVx};
}
function isolatedImpacts(count){
 const s=R.create(compile(count)),p=s.players[count-1],wall=s.motionState.walls[0];
 for(let hit=0;hit<wall.hitsRequired;hit++){
  // Explicit fixture placement: validates collision integration, never a route-clear proof.
  const b=M.solids(s.motionState).find(b=>b.wallId===wall.id&&b.index===4);
  Object.assign(p,{x:b.x-33,y:b.y-6,vx:2400,forcedVx:2400,vy:0,grounded:false,ground:false,supportId:null,jump:false,jumpFrame:0,lastDashBoardId:null});
  R.step(s,{});assert.equal(wall.hits,hit+1,'collision fixture '+count+' impact '+hit);
  for(let i=0;i<13;i++)R.step(s,{});
 }
 for(let i=0;i<600&&!wall.fallen;i++)R.step(s,{});
 assert.ok(wall.fallen,'integrated wall never fell count '+count);
 return {count,passed:true,fixturePlacements:true,originalSpawnInputOnly:false,wallHits:wall.hits,fallen:wall.fallen,solidBlocks:M.solids(s.motionState).filter(b=>b.wallId).length};
}
function twoPlayerRoute(){
 const compiled=compile(2),s=R.create(compiled),p=s.players[1],inputsLog=[];
 let phase='go',hold=0,lastHit=0;const jumpHolds={};let fallenTick=null,maxPlayerOverlap=0;
 while(s.ticks<7000&&s.status==='play'){
  const wall=s.motionState.walls[0],inputs={};
  if(wall.fallen){
   fallenTick??=s.ticks;
   for(const q of s.players){
    if(q.grounded&&q.x>1040&&q.x<1620&&!jumpHolds[q.id])jumpHolds[q.id]=14;
    inputs[q.id]={right:true,up:true,jump:jumpHolds[q.id]>0};jumpHolds[q.id]=Math.max(0,(jumpHolds[q.id]||0)-1);
   }
  }else{
   if(wall.hits>lastHit){lastHit=wall.hits;phase='return';}
   if(phase==='return'&&p.x<740&&p.y<255&&p.grounded)phase='go';
   const input={};
   if(phase==='go'){input.right=true;input.jump=p.x>751&&p.x<854;}
   else{input.left=true;if(p.grounded&&p.x<925&&!hold)hold=14;input.jump=hold>0;hold=Math.max(0,hold-1);}
   inputs[p.id]=input;
  }
  inputsLog.push(inputs);R.step(s,inputs);
  const live=s.players.filter(p=>!p.exit);for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)if(R.overlap(live[i],live[j]))maxPlayerOverlap++;
 }
 assert.equal(s.status,'clear');assert.ok(s.keyTaken);assert.ok(s.players.every(p=>p.exit));assert.equal(s.deaths,0);assert.equal(maxPlayerOverlap,0);
 const replay=R.create(compiled);for(const input of inputsLog)R.step(replay,input);assert.deepEqual(replay,s,'fresh-state input replay diverged');
 return {count:2,passed:true,originalSpawnInputOnly:true,fixturePlacements:false,ticks:s.ticks,seconds:s.elapsed,fallenTick,keyTaken:s.keyTaken,exited:s.players.filter(p=>p.exit).length,deaths:s.deaths,activePlayerOverlapTicks:maxPlayerOverlap,freshStateReplayIdentical:true};
}
function teamRoute(count){
 const compiled=compile(count),s=R.create(compiled),bots=s.players.map(()=>({phase:'go',hold:0,launched:false})),inputsLog=[];
 let fallenTick=null,activePlayerOverlapTicks=0;
 while(s.ticks<10000&&s.status==='play'){
  const inputs={},wall=s.motionState.walls[0];
  for(let j=0;j<count;j++){
   const p=s.players[j],b=bots[j];let input={};
   if(wall.fallen){
    fallenTick??=s.ticks;
    if(p.grounded&&p.x>1040&&p.x<1800&&!b.hold&&!p.jump)b.hold=14;
    input={right:true,up:true,jump:b.hold>0};b.hold=Math.max(0,b.hold-1);
   }else{
    // Two volunteers alternate the dash while the remaining team waits safely.
    if(j<count-2||s.ticks<(count-1-j)*100)continue;
    if(p.forcedVx>1000)b.launched=true;
    if(b.launched&&p.forcedVx<0){b.phase='return';b.launched=false;}
    if(b.phase==='return'&&p.x<740&&p.y<255&&p.grounded)b.phase='go';
    if(b.phase==='go'){input.right=true;input.jump=p.x>751&&p.x<854;}
    else{
     input.left=true;
     if(p.grounded&&p.x<925&&!b.hold&&!p.jump)b.hold=14;
     input.jump=b.hold>0;b.hold=Math.max(0,b.hold-1);
    }
   }
   inputs[p.id]=input;
  }
  inputsLog.push(inputs);R.step(s,inputs);
  const live=s.players.filter(p=>!p.exit);for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)if(R.overlap(live[i],live[j]))activePlayerOverlapTicks++;
 }
 assert.equal(s.status,'clear','full route count '+count);assert.ok(s.keyTaken);assert.ok(s.players.every(p=>p.exit));assert.equal(s.deaths,0);assert.equal(activePlayerOverlapTicks,0,'player overlap count '+count);
 const replay=R.create(compiled);for(const input of inputsLog)R.step(replay,input);assert.deepEqual(replay,s,'fresh-state replay count '+count);
 return {count,passed:true,originalSpawnInputOnly:true,fixturePlacements:false,ticks:s.ticks,seconds:s.elapsed,fallenTick,keyTaken:s.keyTaken,exited:s.players.filter(p=>p.exit).length,deaths:s.deaths,activePlayerOverlapTicks,freshStateReplayIdentical:true,attackingPlayers:2};
}
const report={stageId:'st_w_01_03',generatedAt:new Date().toISOString(),nativeCodeExecuted:false,musicPlayed:false,
 firstDashAndImpact:[],collisionFixtures:[],inputOnlyFullRoutes:[],failures:[],originalFidelityVerified:false,humanFunVerified:false,
 scope:'Actual web runtime tested. All 2..8 player counts have original-spawn input-only full route proof and separately labelled collision fixtures. This does not prove actual online full-route play or human fun.'};
for(let count=2;count<=8;count++)for(const [key,fn] of [['firstDashAndImpact',firstHit],['collisionFixtures',isolatedImpacts]])try{report[key].push(fn(count));}catch(e){report.failures.push({case:key,count,error:e.message});}
try{report.inputOnlyFullRoutes.push(twoPlayerRoute());}catch(e){report.failures.push({case:'twoPlayerFullRoute',error:e.message});}
for(let count=3;count<=8;count++)try{report.inputOnlyFullRoutes.push(teamRoute(count));}catch(e){report.failures.push({case:'teamFullRoute',count,error:e.message});}
report.passed=report.failures.length===0;
fs.writeFileSync(path.join(__dirname,'stage03-route-review-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
