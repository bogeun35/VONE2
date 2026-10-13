'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const m=require('./source-magnet-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
for(const id of ['st_w_03_03','st_w_03_04','st_w_05_03'])test(id+' exact shipped indices and explicit refusal at 2..8 players',()=>{
 const stage=stages.find(s=>s.stageId===id);
 for(let count=2;count<=8;count++){
  const actors=pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,count,true),count),magnets=actors.filter(a=>a.typeName==='PlayerMagnet');
  assert.deepEqual(magnets.map(m.decodeParameters),Array.from({length:8},(_,i)=>({playerActorIndex:i})));
  assert.deepEqual(magnets.map(a=>[a.posX,a.posY,a.playerCount]),Array.from({length:8},()=>[0,0,0]));
  assert.throws(()=>m.compile(actors,count),/candidate ordering\/event 16 acceptance/);
 }
});
test('ParseParameter ignores unused slots and arithmetic shift floors negatives',()=>{
 assert.deepEqual(m.decodeParameters({datas:[{t:1,f:-0.5},{t:1,f:999}]}),{playerActorIndex:-1});
 assert.deepEqual(m.decodeParameters({datas:[{t:2,s:'7'}]}),{playerActorIndex:0});
});
test('recovered literal raws and summed OFFSET_X',()=>{
 assert.equal(m.nativeConstants.intervalTimeRaw,39321);
 assert.equal(m.nativeConstants.approachSpeedXRaw,1966);
 assert.equal(m.nativeConstants.approachSpeedYRaw,5242);
 assert.equal(m.nativeConstants.offsetXRaw,1212416+540672);
 assert.equal(m.nativeConstants.tractorYRaw,-44*65536);
});
test('approach uses acceleration capped ABOVE by one/two, not a minimum speed',()=>{
 assert.deepEqual(m.approachAxisRaw(0,0,10*65536,'x'),{displacementRaw:19660,arrived:false});
 assert.deepEqual(m.approachAxisRaw(0,0,-100*65536,'x'),{displacementRaw:-65536,arrived:false});
 assert.deepEqual(m.approachAxisRaw(0,0,10*65536,'y'),{displacementRaw:52420,arrived:false});
 assert.deepEqual(m.approachAxisRaw(0,0,100*65536,'y'),{displacementRaw:131072,arrived:false});
});
test('snap threshold is inclusive, accounts for previous velocity, and boost doubles rate',()=>{
 assert.deepEqual(m.approachAxisRaw(0,2*65536,3*65536,'x'),{displacementRaw:3*65536,arrived:true});
 assert.deepEqual(m.approachAxisRaw(0,0,65537,'x'),{displacementRaw:1966,arrived:false});
 assert.deepEqual(m.approachAxisRaw(0,0,10*65536,'x',true),{displacementRaw:39320,arrived:false});
});
test('empty state is JSON serializable and guarded hooks reject fabricated active state',()=>{
 const s=m.create(m.compile([],2));
 assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
 for(let tick=0;tick<60;tick++)assert.deepEqual(m.beforeStep(s),{events:[],solids:[]});
 assert.deepEqual(m.solids(s),[]);assert.deepEqual(m.displays(s),[]);
 assert.throws(()=>m.create({magnets:[{}]}),/capture is unresolved/);
 assert.throws(()=>m.afterStep({magnets:[{}]}),/capture is unresolved/);
});

