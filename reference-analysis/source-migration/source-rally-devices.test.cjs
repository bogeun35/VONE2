'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const rally=require('./source-rally-devices.js'),pop=require('./population-rules.cjs');
const stage=JSON.parse(fs.readFileSync(__dirname+'/installed-stage-decoded.local.json')).stages.find(s=>s.stageId==='st_w_13_03');
const actors=n=>pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,n,true),n);
const layouts={
 2:[[384,288,0,90,400],[1008,288,1,90,400]],
 3:[[528,240,0,120,400],[864,240,1,240,400],[696,456,2,0,400]],
 4:[[504,288,0,90,320],[888,288,1,90,320],[696,120,2,0,320],[696,456,3,0,320]],
 5:[[744,216,0,144,272],[1032,216,1,216,272],[672,456,2,72,272],[1104,456,3,288,272],[888,600,4,0,272]],
 6:[[672,264,0,120,256],[1104,264,1,240,256],[672,504,2,240,256],[1104,504,3,120,256],[888,624,4,0,256],[888,144,5,0,256]],
 7:[[672,216,0,309,240],[1104,216,1,51.5,240],[624,444,2,257.5,240],[1152,444,3,103,240],[768,624,4,26,240],[1008,624,5,154.5,240],[888,120,6,0,240]],
 8:[[696,192,0,315,208],[1080,192,1,45,208],[696,576,2,225,208],[1080,576,3,135,208],[612,384,4,90,208],[1164,384,5,90,208],[888,108,6,0,208],[888,660,7,0,208]]
};
for(let n=2;n<=8;n++){
 test(n+' players: exact shipped layout and controller slots',()=>{
  const s=rally.inspectActors(actors(n),n),c=s.controllers[0];
  assert.equal(s.controllers.length,1);
  assert.deepEqual(s.mallets.map(m=>[m.x,m.y,m.authoredActorIndex,m.railAngle,m.railLength]),layouts[n]);
  assert.deepEqual([c.x,c.y,c.ballStartPos.x,c.ballStartPos.y],n<=4?[696,576,696,288]:[888,768,888,384]);
  assert.deepEqual([c.rallyMax,c.speedUpRallyCount,c.malletSpeed,c.ballSpeedMax,c.malletSpeedMax,c.ballScale],[16,5,8,16,20,1.5]);
  assert.equal(c.ballSpeed,{2:6.5,3:4.8,4:5,5:6,6:6,7:6,8:6}[n]);
  assert.equal(c.ballSpeedInc,n===3||n===4?6553/65536:0.5);
  assert.equal(c.malletSpeedInc,6553/65536); // authored zero preserves default
  assert.equal(c.malletScale,n===3||n===4||n===5?1.5:1.3);
 });
 test(n+' players: unresolved physics refuses compilation',()=>assert.throws(()=>rally.compile(actors(n),n),/missing RallyBall simulation/));
}
const controller=()=>rally.inspectActors(actors(2),2).controllers[0];
test('initial timer expires on 31st countdown, separate from phase0 tick',()=>{
 const c=controller();assert.deepEqual(rally.controllerPost(c,1/60),[]);
 assert.equal(c.timerRaw,32768);assert.equal(c.phase,1);
 for(let i=0;i<30;i++)assert.deepEqual(rally.controllerPost(c,1/60),[]);
 assert.equal(c.timerRaw,8);assert.equal(c.phase,1);
 assert.deepEqual(rally.controllerPost(c,1/60),[{kind:'createBallRequired'}]);
 assert.equal(c.timerRaw,-1084);assert.equal(c.phase,2);
});
test('missing ball retries after 16 countdown ticks; no phase fallthrough',()=>{
 const c=controller();c.phase=2;
 assert.deepEqual(rally.controllerPost(c,1/60),[]);assert.equal(c.timerRaw,16384);assert.equal(c.phase,1);
 for(let i=0;i<15;i++)assert.deepEqual(rally.controllerPost(c,1/60),[]);
 assert.equal(c.timerRaw,4);
 assert.deepEqual(rally.controllerPost(c,1/60),[{kind:'createBallRequired'}]);
});
test('live ball holds phase2 without countdown',()=>{
 const c=controller();c.phase=2;c.ballId='ball';c.timerRaw=99;
 for(let i=0;i<100;i++)assert.deepEqual(rally.controllerPost(c,1/60),[]);
 assert.equal(c.phase,2);assert.equal(c.timerRaw,99);
});
test('5/10/15 hits accelerate, final hit schedules one clear on Post',()=>{
 const c=controller();c.phase=2;c.ballId='ball';
 for(let hit=1;hit<=16;hit++){
  const events=rally.controllerEvent(c,9);
  assert.deepEqual(events,hit<16&&hit%5===0?[
   {eventType:57,broadcastActorType:191,value:0.5},
   {eventType:57,broadcastActorType:189,value:6553/65536}]:[]);
  assert.equal(c.rallyCount,hit);
 }
 assert.equal(c.phase,3);assert.equal(c.cleared,false);
 assert.deepEqual(rally.controllerPost(c,1/60),[
  {eventType:1,broadcastActorType:17},{eventType:35,targetId:'ball'},
  {eventType:35,broadcastActorType:189},{kind:'changeAllPlayerState',state:1}]);
 assert.equal(c.phase,4);assert.equal(c.cleared,true);
 assert.deepEqual(rally.controllerPost(c,1/60),[]);
 assert.deepEqual(rally.controllerEvent(c,9),[]);assert.equal(c.rallyCount,16);
});
test('disappearance resets incomplete rally and preserves completed count',()=>{
 const c=controller();c.phase=2;c.ballId='ball';c.rallyCount=10;
 assert.deepEqual(rally.controllerEvent(c,7),[{eventType:58,broadcastActorType:189}]);
 assert.equal(c.rallyCount,0);assert.equal(c.ballId,null);assert.equal(c.phase,2);
 c.rallyCount=16;c.phase=3;c.ballId='ball';
 assert.deepEqual(rally.controllerEvent(c,7),[]);assert.equal(c.rallyCount,16);assert.equal(c.phase,3);
});
test('native hit handler also accepts phase0 and phase1',()=>{
 const c=controller();rally.controllerEvent(c,9);assert.equal(c.rallyCount,1);
 c.phase=1;rally.controllerEvent(c,9);assert.equal(c.rallyCount,2);
});
test('mallet events accumulate exact raws, reset increment, stop',()=>{
 const m=rally.inspectActors(actors(2),2).mallets[0];
 rally.malletEvent(m,57,6553);rally.malletEvent(m,57,6553);assert.equal(m.speedIncrementRaw,13106);
 rally.malletEvent(m,58);assert.equal(m.speedIncrementRaw,0);
 rally.malletEvent(m,35);assert.equal(m.stopped,true);
});
test('analysis snapshots serialize but cannot silently enter simulation',()=>{
 const s=rally.inspectActors(actors(8),8),copy=rally.create(s);
 assert.deepEqual(copy,s);copy.controllers[0].phase=2;assert.equal(s.controllers[0].phase,0);
 for(const fn of [rally.solids,rally.beforeStep,rally.afterStep])assert.throws(()=>fn(copy),/Rally physics unresolved/);
 assert.equal(rally.displays(copy).analysisOnly,true);
});
test('unrelated stage is harmless',()=>{
 const s=rally.create(rally.compile([],2));assert.deepEqual(rally.solids(s),[]);
 assert.deepEqual(rally.beforeStep(s),{events:[],solids:[]});assert.deepEqual(rally.afterStep(s),{events:[],solids:[]});
});
