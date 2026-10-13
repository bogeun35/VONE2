'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('./source-dossun-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
for(let count=2;count<=8;count++)test(`real stages, ${count} players: exact decode and explicit refusal`,()=>{
 for(const id of ['st_w_14_01','st_w_14_03']){
  const st=stages.find(s=>s.stageId===id),actors=pop.actorsForCount(pop.selectVariant(st.json.stageInitParamList,count,true),count);
  const guns=actors.filter(a=>a.typeName==='PlayerBlockGun').map(api.decodeActor);
  assert.equal(guns.length,8);assert.deepEqual(guns.map(g=>g.actorIndex),[0,1,2,3,4,5,6,7]);assert.deepEqual(guns.map(g=>g.bulletSpeedRaw),Array(8).fill(393216));
  assert.throws(()=>api.compile(actors,count),/PlayerBlockComponent/);
  if(id==='st_w_14_03'){
   const blocks=actors.filter(a=>a.typeName==='Dossun');assert.equal(blocks.length,1);
   assert.deepEqual(api.decodeActor(blocks[0]),{type:'Dossun',name:'Dossun1',x:1032,y:192,accelRaw:65536,waitRaw:65536,returnRaw:131072,retriggerOnReturn:false});
   assert.throws(()=>api.compile(blocks,count),/Map.Move sensor geometry/);
  }
 }
});
test('phase acceleration is per update; landing clears velocity on following update',()=>{
 const d={phase:1,accelRaw:65536,waitRaw:65536},a={vxRaw:200,vyRaw:0};
 api.updatePhase(d,a,1092);api.updatePhase(d,a,1092);assert.equal(a.vyRaw,131072);
 d.phase=2;api.updatePhase(d,a,1092);assert.deepEqual(a,{vxRaw:0,vyRaw:0});assert.equal(d.phase,3);assert.equal(d.timerRaw,65536);assert.equal(d.face,1);
});
test('one second wait uses 61 FP ticks, then return clamps to original height',()=>{
 const d={phase:3,timerRaw:65536,returnRaw:131072,face:1},a={yRaw:393216,initialYRaw:65536};
 for(let i=0;i<60;i++)api.updatePhase(d,a,1092);assert.equal(d.phase,3);assert.equal(d.timerRaw,16);
 api.updatePhase(d,a,1092);assert.equal(d.phase,4);assert.equal(d.face,0);
 api.updatePhase(d,a,1092);assert.equal(a.yRaw,262144);api.updatePhase(d,a,1092);assert.equal(a.yRaw,131072);api.updatePhase(d,a,1092);assert.equal(a.yRaw,65536);assert.equal(d.phase,0);
});
test('empty compilation round trips and interface is inert',()=>{
 const s=api.create(api.compile([],2));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);assert.deepEqual(api.solids(s),[]);assert.deepEqual(api.beforeStep(s),{events:[],solids:[]});assert.deepEqual(api.afterStep(s),{events:[],deadPlayerIds:[]});assert.deepEqual(api.displays(s),[]);
});
test('zero slots preserve Initialize QFP defaults verified by field names',()=>{
 const d=api.decodeActor({typeName:'Dossun',posX:0,posY:0,datas:[]});assert.equal(d.accelRaw,327680);assert.equal(d.waitRaw,65536);assert.equal(d.returnRaw,163840);
 assert.equal(api.decodeActor({typeName:'PlayerBlockGun',datas:[]}).bulletSpeedRaw,393216);
});
