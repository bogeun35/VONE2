'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('./source-linepath-devices.js');
const stages=require('./installed-stage-decoded.local.json');
const pop=require('./population-rules.cjs');
function actors(id,count){const stage=stages.stages.find(s=>s.stageId===id);assert.ok(stage, id+' extracted stage exists');return pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,count,true),count);}
function device(id,count,type){return actors(id,count).filter(a=>a.typeName===type);}
test('loader float32 multiply and signed truncate, including authored fractional obstacle',()=>{
 assert.equal(Math.fround(2.3335),2.3334999084472656);
 assert.equal(api.stageFpRaw(2.3335),152928);
 assert.equal(api.stageFpRaw(-0.2),-13107);
 assert.equal(api.fpFromFloatRaw(0.1),6553);
 assert.equal(api.fpFromFloatRaw(-0.1),-6553);
 assert.equal(api.fpFromFloatRaw(1/60),1092);
 assert.throws(()=>api.stageFpRaw(1.23456789),/string round trip/);
 assert.throws(()=>api.fpFromFloatRaw(Infinity),/Non-finite/);
});
test('real 03-02 uses a different lift actor at 4 players, with raw 152928',()=>{
 const expected=[262144,196608,152928,152928,152928,152928,152928];
 for(let count=2;count<=8;count++){
  const [a]=device('st_w_03_02',count,'LinePathLift'),d=api.decodeLinePathLift(a,count);
  assert.equal(a.playerCount,count<4?-3:4);
  assert.equal(a.datas[4].f,count<4?4:2.3335);
  assert.equal(d.speedRaw,expected[count-2]);
  assert.equal(d.paths.length,9);
  assert.deepEqual(d.paths[0],{xRaw:800*65536,yRaw:0});
  assert.deepEqual(d.paths[8],{xRaw:1876*65536,yRaw:-250*65536});
  assert.equal(d.rectRaw.width,(118+(count-2)*30)*65536);
  assert.equal(d.moveContactCount,count);
  assert.equal(d.needRideCount,count);
 }
});
test('03-03 speed growth uses raw -13107; geometry and external start remain distinct',()=>{
 for(let count=2;count<=8;count++){
  const [a]=device('st_w_03_03',count,'LinePathLift'),d=api.decodeLinePathLift(a,count);
  assert.equal(d.speedRaw,262144-(count-2)*13107);
  assert.equal(d.paths.length,9);
  assert.deepEqual(d.rectRaw,{height:1179648,width:7864320,x:-3932160,y:-589824});
  assert.equal(d.externalStart,true);assert.equal(d.needRideCount,0);
  assert.equal(d.enableLine,1);assert.equal(d.isInertia,1);assert.equal(d.loop,false);
 }
});
test('02-04 width grows by 70 per additional player; zero pair terminates path',()=>{
 for(let count=2;count<=8;count++){
  const d=api.decodeLinePathLift(device('st_w_02_04',count,'LinePathLift')[0],count);
  assert.equal(d.speedRaw,65536);
  assert.deepEqual(d.paths,[{xRaw:37748736,yRaw:0}]);
  assert.equal(d.rectRaw.width,(160+(count-2)*70)*65536);
  assert.equal(d.rectRaw.x,(-80-(count-2)*35)*65536);
 }
});
test('DamageRect actual population counts and height/width/X/Y member order',()=>{
 const expected=[6,4,4,4,4,4,4];
 for(let count=2;count<=8;count++){
  assert.equal(device('st_w_03_02',count,'DamageRect').length,expected[count-2]);
  assert.equal(device('st_w_03_03',count,'DamageRect').length,2);
  assert.equal(device('st_w_06_02',count,'DamageRect').length,4);
 }
 const d=api.decodeDamageRect(device('st_w_03_03',2,'DamageRect')[0]);
 assert.equal(d.xRaw,75497472);assert.equal(d.yRaw,20447232);
 assert.deepEqual(d.rectRaw,{height:20447232,width:13172736,x:0,y:-20447232});
});
test('negative authored width moves create X and flips width, without flipping height',()=>{
 const d=api.decodeDamageRect({posX:100,posY:200,datas:[{t:1,f:-48},{t:1,f:96}]});
 assert.equal(d.xRaw,3407872);assert.equal(d.yRaw,13107200);
 assert.deepEqual(d.rectRaw,{height:6291456,width:3145728,x:0,y:-6291456});
});
test('integer slots use arithmetic shift: -0.2 mode decodes to -1',()=>{
 const a=JSON.parse(JSON.stringify(device('st_w_03_03',2,'LinePathLift')[0]));
 a.datas[5]={t:1,f:-0.2};assert.equal(api.decodeLinePathLift(a,2).mode,-1);
});
test('zero speed follows native epsilon fallback; negative scaled speed clamps to zero',()=>{
 const a=JSON.parse(JSON.stringify(device('st_w_03_02',2,'LinePathLift')[0]));
 a.datas[4]={t:1,f:0};assert.equal(api.decodeLinePathLift(a,8).speedRaw,65536);
 a.datas[4]={t:1,f:4};assert.equal(api.decodeLinePathLift(a,8).speedRaw,0);
});
test('all shipped device parameters can be decoded at every selected population',()=>{
 for(const id of ['st_w_02_04','st_w_03_02','st_w_03_03','st_w_06_02'])for(let c=2;c<=8;c++){
  for(const a of device(id,c,'DamageRect'))assert.deepEqual(JSON.parse(JSON.stringify(api.decodeDamageRect(a))),api.decodeDamageRect(a));
  for(const a of device(id,c,'LinePathLift'))assert.deepEqual(JSON.parse(JSON.stringify(api.decodeLinePathLift(a,c))),api.decodeLinePathLift(a,c));
 }
});
test('compile refuses every applicable DamageRect and LinePathLift instead of producing inert hazards',()=>{
 for(const id of ['st_w_02_04','st_w_03_02','st_w_03_03','st_w_06_02'])for(let c=2;c<=8;c++)
  assert.throws(()=>api.compile(actors(id,c),c),/Unverified (LinePathLift|DamageRect) runtime/);
 for(const type of api.supportedTypes){const a=device(type==='DamageRect'?'st_w_06_02':'st_w_02_04',2,type)[0];assert.throws(()=>api.compile([a],2),new RegExp('Unverified '+type+' runtime'));}
});
test('compile ignores actors excluded by population, preserves required interface and JSON state',()=>{
 const a={typeName:'LinePathLift',playerCount:4};
 const c=api.compile([a,{typeName:'Other',playerCount:0}],2,{}),s=api.create(c);
 assert.deepEqual(s,{schemaVersion:1,count:2,devices:[],completePhysicsFidelity:false});
 assert.deepEqual(api.solids(s),[]);assert.deepEqual(api.beforeStep(s,{}),{events:[],solids:[]});
 assert.deepEqual(api.afterStep(s,{}),{events:[],deadPlayerIds:[]});assert.deepEqual(api.displays(s),{devices:[]});
 assert.deepEqual(api.supportedTypes,['DamageRect','LinePathLift']);
});
