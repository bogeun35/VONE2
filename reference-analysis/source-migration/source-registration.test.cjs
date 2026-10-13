'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('./source-stage-runtime.js'),Coin=require('./source-coin-devices.js'),CP=require('./source-checkpoint-devices.js'),Energy=require('./source-touchenergy-devices.js'),pop=require('./population-rules.cjs');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const actors=(id,count)=>pop.actorsForCount(pop.selectVariant(source.stages.find(x=>x.stageId===id).json.stageInitParamList,count,true),count);
const base=count=>R.compile({source,geometry,count});
test('real 5-1 coin observer event reaches runtime Key next update',()=>{
 const c=base(2);c.coins=Coin.compile(actors('st_w_05_01',2),2);
 c.gates.keys.forEach(k=>k.active=false);const s=R.create(c);assert.equal(s.keyActive,false);
 // Dispatch native-equivalent collection for every shipped coin; then run host tick.
 Coin.afterStep(s.coinsState,{coinContacts:s.coinsState.coins.map(c=>c.id)});
 assert.equal(s.coinsState.observers[0].isNotified,false);R.step(s);
 assert.equal(s.coinsState.observers[0].isNotified,true);assert.equal(s.keyActive,true);
});
test('real checkpoint contact survives retry, authored anchors and raw play time restored',()=>{
 for(let count=2;count<=8;count++){
  const c=base(count);c.checkpoints=CP.compile(actors('st_l_04_01',count),count);
  const s=R.create(c),cp=s.checkpointsState.checkpoints[0];
  s.players[0].x=cp.x-16;s.players[0].y=cp.y-47;R.step(s);
  assert.equal(s.checkpointsState.checkpointInfo.isActive,true);assert.equal(s.checkpointsState.checkpointInfo.playTimeRaw,1092);
  s.status='dead';const retry=R.restart(c,{...s,checkpointsState:JSON.parse(JSON.stringify(s.checkpointsState))});
  assert.equal(retry.playTimeRaw,1092);assert.equal(retry.checkpointsState.checkpointInfo.gameOverCount,1);
  retry.players.forEach((p,i)=>{assert.equal(p.x,1296+i*50-16);assert.equal(p.y,336);assert.equal(p.vx,0);});
  assert.equal(retry.keyTaken,false);assert.equal(retry.checkpointsState.checkpoints[0].checked,false);
  const other=R.compile({source,geometry,count,stageId:'st_w_01_02'});assert.equal(R.restart(other,s).checkpointsState.checkpointInfo.isActive,false);
 }
});
test('real TouchEnergy exhaustion routes QuakeDead through host, including immortality',()=>{
 for(const immortal of [false,true]){
  const c=base(2);c.touchEnergies=Energy.compile(actors('st_w_02_04',2),2);const s=R.create(c);
  // Existing contacts consumed the budget; native smoothing emits death on this tick.
  const d=s.touchEnergiesState.devices[0];d.energyRaw=1;d.targetRaw=0;
  s.players.forEach(p=>p.immortal=immortal);R.step(s);
  assert.equal(d.exhausted,true);assert.equal(s.status,immortal?'play':'dead');
  if(!immortal)assert.equal(s.failure.reason,'접촉 에너지가 다 됐어요');
 }
});

