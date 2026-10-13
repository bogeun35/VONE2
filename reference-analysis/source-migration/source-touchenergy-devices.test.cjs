'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('./source-touchenergy-devices.js');
const pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
const ONE=65536;
function actors(id,n){return pop.actorsForCount(pop.selectVariant(stages.stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),n);}
function state(n=2){return api.create(api.compile(actors('st_w_02_02',n),n));}
function player(index,left=0,nativeState=1){return {index,nativeState,collisionRectRaw:{left,right:left+ONE,top:0,bottom:ONE}};}
const pair=[player(0),player(1,ONE)];
for(const id of ['st_w_02_02','st_w_02_04'])test(id+' real variants compile 2..8 with exact parameters',()=>{
 for(let n=2;n<=8;n++){
  const c=api.compile(actors(id,n),n);assert.equal(c.devices.length,1);
  const d=c.devices[0];assert.equal(d.name,'TouchEnergy1');assert.equal(d.maxRaw,2*n*ONE);
  assert.deepEqual(d.energyTable,[4,6,8,10,12,14,16].map(x=>x*ONE));
  assert.deepEqual(d.damageTable,new Array(7).fill(2*ONE));assert.deepEqual(d.intervalTable,new Array(7).fill(ONE));
  assert.deepEqual(d.visibleTable,new Array(7).fill(1));assert.equal(d.damageRaw,2*ONE);assert.equal(d.intervalRaw,ONE);
  assert.equal(d.visible,true);assert.equal(d.uiScaleRaw,9*ONE);assert.deepEqual(d.uiPos,{x:0,y:428});
 }
});
test('contact tolerates exactly 655 raw gap on both axes',()=>{
 const a=player(0).collisionRectRaw;
 assert.equal(api.closeContact(a,player(1,ONE+655).collisionRectRaw),true);
 assert.equal(api.closeContact(a,player(1,ONE+656).collisionRectRaw),false);
 assert.equal(api.closeContact(a,{left:0,right:ONE,top:ONE+655,bottom:2*ONE+655}),true);
 assert.equal(api.closeContact(a,{left:0,right:ONE,top:ONE+656,bottom:2*ONE+656}),false);
});
test('first contact damages immediately and continuous contact repeats on tick 62',()=>{
 const s=state();let result=api.afterStep(s,{players:pair});
 assert.equal(s.devices[0].targetRaw,2*ONE);assert.equal(s.devices[0].energyRaw,4*ONE-21840);
 assert.equal(result.hitMarks.length,1);assert.equal(result.sounds[0].seId,11);assert.equal(result.cameraShakes[0].strengthRaw,6553);
 for(let k=0;k<60;k++){result=api.afterStep(s,{players:pair});assert.equal(result.hitMarks.length,0);}
 assert.equal(s.devices[0].contactTimersRaw[1],16);
 result=api.afterStep(s,{players:pair});assert.equal(result.hitMarks.length,1);assert.equal(s.devices[0].targetRaw,0);assert.deepEqual(result.sounds,[]);
});
test('separation resets timer; recontact damages immediately',()=>{
 const s=state();api.afterStep(s,{players:pair});api.afterStep(s,{players:[player(0),player(1,3*ONE)]});
 assert.equal(s.devices[0].contactTimersRaw[1],0);
 assert.equal(api.afterStep(s,{players:pair}).hitMarks.length,1);assert.equal(s.devices[0].targetRaw,0);
});
test('all unordered pairs have independent timers, processed in index order',()=>{
 const s=state(3);const r=api.afterStep(s,{players:[player(2),player(0),player(1)]});
 assert.deepEqual(r.hitMarks.map(x=>x.playerIndices),[[0,1],[0,2],[1,2]]);
 assert.equal(s.devices[0].targetRaw,0);assert.equal(s.devices[0].energyRaw,6*ONE-32760);
 assert.equal(s.devices[0].contactTimersRaw[1],ONE);assert.equal(s.devices[0].contactTimersRaw[2],ONE);assert.equal(s.devices[0].contactTimersRaw[10],ONE);
});
test('visible energy clamps on tick 7; zero emits QuakeDead once on tick 68',()=>{
 const s=state();api.afterStep(s,{players:pair});
 for(let k=1;k<6;k++)api.afterStep(s,{players:pair});
 assert.equal(s.devices[0].energyRaw,4*ONE-6*21840);
 api.afterStep(s,{players:pair});assert.equal(s.devices[0].energyRaw,2*ONE);
 for(let tick=8;tick<=67;tick++)assert.deepEqual(api.afterStep(s,{players:pair}).events,[]);
 assert.equal(s.devices[0].energyRaw,2*ONE-6*21840);
 const r=api.afterStep(s,{players:pair});assert.deepEqual(r.events,[{broadcastActorType:27,eventType:43,senderId:s.devices[0].id}]);
 assert.equal(s.devices[0].energyRaw,0);assert.equal(s.devices[0].exhausted,true);
 const snapshot=JSON.stringify(s);for(let k=0;k<120;k++)assert.deepEqual(api.afterStep(s,{players:pair}).events,[]);
 assert.equal(JSON.stringify(s),snapshot);
});
test('hidden HUD snaps energy and exhausts in the same contact tick',()=>{
 const s=state();s.devices[0].visible=false;
 api.afterStep(s,{players:pair});assert.equal(s.devices[0].energyRaw,2*ONE);
 api.afterStep(s,{players:[]});const r=api.afterStep(s,{players:pair});assert.equal(r.events[0].eventType,43);assert.equal(s.devices[0].energyRaw,0);
});
test('inactive/missing collision players do not contact, sparse native indices work',()=>{
 const s=state();assert.deepEqual(api.afterStep(s,{players:[player(0),player(1,ONE,2)]}).hitMarks,[]);
 assert.deepEqual(api.afterStep(s,{players:[player(0),{index:1,nativeState:1,collisionRectRaw:null}]}).hitMarks,[]);
 assert.deepEqual(api.afterStep(s,{players:[player(7),player(2)]}).hitMarks[0].playerIndices,[2,7]);
 assert.equal(s.devices[0].contactTimersRaw[23],ONE);
});
test('JSON round trip preserves independent cooldown and interpolation',()=>{
 const s=state(3);api.afterStep(s,{players:[player(0),player(2)]});let clone=JSON.parse(JSON.stringify(s));
 for(let k=0;k<90;k++){
  assert.deepEqual(api.afterStep(clone,{players:[player(0),player(2)]}),api.afterStep(s,{players:[player(0),player(2)]}));
  assert.deepEqual(clone,s);clone=JSON.parse(JSON.stringify(clone));
 }
});
test('no contact remains unchanged; beforeStep does not tick Post timers',()=>{
 const s=state(),initial=JSON.stringify(s);
 for(let k=0;k<200;k++){api.beforeStep(s,{players:pair});api.afterStep(s,{players:[player(0),player(1,3*ONE)]});}
 assert.equal(JSON.stringify(s),initial);assert.deepEqual(api.solids(s),[]);assert.equal(api.displays(s)[0].energy,4);
});
test('reject unknown conversion, malformed input, and missing native bounds',()=>{
 const a=structuredClone(actors('st_w_02_02',2));const d=a.find(x=>x.typeName==='TouchEnergy').datas;d[0].f=0.1;
 assert.throws(()=>api.compile(a,2),/unverified authored float/);d[0].f=0;d[3].s='!';assert.throws(()=>api.compile(a,2),/malformed/);
 assert.throws(()=>api.compile([],1),/2..8/);
 assert.throws(()=>api.afterStep(state(),{players:[{index:0,nativeState:1}]}),/collisionRectRaw/);
 assert.throws(()=>api.afterStep(state(),{players:[player(0),player(0)]}),/unique/);
 assert.throws(()=>api.afterStep(state(),{dt:-1}),/delta/);
});
test('player table fallback walks backwards through zeros',()=>{
 assert.equal(api.find([4,0,8,0,0,0,0],8),8);assert.equal(api.find([4,0,8,0,0,0,0],3),4);
});
