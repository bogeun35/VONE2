'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const m=require('./source-pole-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(__dirname+'/installed-stage-decoded.local.json')).stages;
const actors=(id,c)=>pop.actorsForCount(pop.selectVariant(stages.find(x=>x.stageId===id).json.stageInitParamList,c,true),c);
const pole=c=>actors('st_w_11_02',c).filter(a=>a.typeName==='PoleLadder');
test('real population variants: exact thorn counts and intentional compile refusal',()=>{
 const expected=[36,30,24,18,18,12,12];
 for(let c=2;c<=8;c++){
  const a=actors('st_w_11_02',c);assert.equal(a.filter(x=>x.typeName==='FloatingThorn').length,expected[c-2]);
  assert.throws(()=>m.compile(a,c),/Unverified FloatingThorn FPMath.Sin lookup table/);
  assert.equal(actors('st_w_07_04',c).filter(x=>x.typeName==='FloatingThorn').length,8);
  assert.throws(()=>m.compile(actors('st_w_07_04',c),c),/Unverified FloatingThorn/);
 }
});
test('real pole positions, speeds, distances and selected heights',()=>{
 for(let c=2;c<=8;c++){
  const p=m.compile(pole(c),c).poles[0];
  assert.deepEqual([p.xRaw,p.yRaw,p.speedRaw,p.distanceRaw,p.heightRaw],
   [168,48,3,4775,[480,480,480,480,540,505,515][c-2]].map(v=>v*65536));
 }
});
test('real height table is signed FP, not a player-count integer table',()=>{
 assert.deepEqual(m.heightTable(pole(2)[0].datas[0]).map(v=>v/65536),[480,480,480,480,480,505,480]);
});
test('pole advances per tick regardless of delta and stops exactly at tick1592',()=>{
 const s=m.create(m.compile(pole(2),2));
 for(let i=0;i<1591;i++)m.beforeStep(s,{dt:0});
 assert.equal(s.poles[0].xRaw,(168+4773)*65536);
 m.beforeStep(s,{dt:100});assert.equal(s.poles[0].xRaw,(168+4775)*65536);
 m.beforeStep(s);assert.equal(s.poles[0].moveXRaw,4775*65536);
});
test('native post skips states3..5 and requests state10 without contact',()=>{
 const s=m.create(m.compile(pole(2),2));
 assert.deepEqual(m.afterStep(s,{players:[{id:'a',nativeState:0},{id:'b',nativeState:3},{id:'c',nativeState:4},{id:'d',nativeState:5}]}).playerConstraints,
  [{playerId:'a',nextNativeState:10,lookRight:true}]);
});
test('native post right/left anchors and both Y endpoints',()=>{
 const s=m.create(m.compile(pole(2),2));m.beforeStep(s);
 assert.deepEqual(m.afterStep(s,{players:[{id:'r',nativeState:10,lookingRight:true,anchorYRaw:0},{id:'l',nativeState:10,lookingRight:false,anchorYRaw:600*65536}]}).playerConstraints,
  [{playerId:'r',anchorXRaw:159*65536,anchorYRaw:48*65536},{playerId:'l',anchorXRaw:211*65536,anchorYRaw:528*65536}]);
});
test('JSON round trip preserves native movement and constraints',()=>{
 const a=m.create(m.compile(pole(7),7));for(let i=0;i<10;i++)m.beforeStep(a);
 const b=JSON.parse(JSON.stringify(a));m.beforeStep(a);m.beforeStep(b);assert.deepEqual(a,b);
 assert.equal(b.poles[0].xRaw,201*65536);
});
test('pole has no solids and view retains exact authored height',()=>{
 const s=m.create(m.compile(pole(8),8));assert.deepEqual(m.solids(s),[]);
 assert.deepEqual(m.displays(s).poles[0],{id:'source:a0',x:168,y:48,height:515,width:4});
});
test('invalid player adapter and malformed table refuse rather than guess',()=>{
 const s=m.create(m.compile(pole(2),2));assert.throws(()=>m.afterStep(s,{players:[{id:'a'}]}),/nativeState/);
 assert.throws(()=>m.afterStep(s,{players:[{id:'a',nativeState:10}]}),/lookingRight and anchorYRaw/);
 assert.throws(()=>m.heightTable({t:2,s:'short'}),/56 units/);
 assert.throws(()=>m.compile(pole(2),1),/2..8/);
});
test('zero thorn parameters still mean native nonzero defaults and are refused',()=>{
 const a=structuredClone(actors('st_w_07_04',2).find(x=>x.typeName==='FloatingThorn'));
 a.datas[0].f=0;a.datas[1].f=0;assert.throws(()=>m.compile([a],2),/Unverified FloatingThorn/);
 assert.deepEqual(m.supportedTypes,['FloatingThorn','PoleLadder']);
});
