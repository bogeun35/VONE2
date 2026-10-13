'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const m=require('./source-fake-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
const stage=stages.stages.find(s=>s.stageId==='st_w_13_04');
const actors=count=>pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,count,true),count);
const inventory=count=>m.inspectActors(actors(count),count);
const seed={rngState:'42',rngIncrement:'54'};
test('actual stage: one variant, no authored Player, 24 cages-to-be for all populations',()=>{
 assert.equal(stage.json.stageInitParamList.length,1);
 const xs=[96,216,336,456,600,720,840,960];
 for(let count=2;count<=8;count++){
  const a=actors(count);assert.deepEqual(a.reduce((r,a)=>(r[a.typeName]=(r[a.typeName]||0)+1,r),{}),{Key:1,Goal:1,FakeTimer:1,FakePlayer:24});
  const v=inventory(count);assert.equal(v.fakes.length,24);
  assert.deepEqual(v.fakes.map(f=>[f.x,f.y]),[216,312,408].flatMap(y=>xs.map(x=>[x,y])));
  assert.deepEqual(v.fakes.map(f=>f.playerIndex),new Array(24).fill(-1));
 }
});
test('actual FP table: 10,10,11,11,12,12,13 seconds; exact UI fields',()=>{
 for(let c=2;c<=8;c++){
  const t=inventory(c).timers[0];
  assert.deepEqual(t.secondTable,[655360,655360,720896,720896,786432,786432,851968]);
  assert.equal(t.secondRaw,t.secondTable[c-2]);
  assert.deepEqual([t.x,t.y,t.uiScaleRaw,t.uiPosRaw.x,t.uiPosRaw.y],[528,72,655360,0,27262976]);
 }
});
test('actual integer table: zero entries FALL BACK to 1 for 6..8 players',()=>{
 const expected=[2,2,1,1,1,1,1];
 for(let c=2;c<=8;c++){
  const t=inventory(c).timers[0];assert.deepEqual(t.allInputTable,[2,2,1,1,0,0,0]);
  assert.equal(t.allInputFakePlayerCount,expected[c-2]);
 }
});
test('decoders retain UTF16 low bytes, signed values and exact widths',()=>{
 const slot=(n,width)=>({t:2,s:Array.from({length:7*width},(_,i)=>String.fromCharCode(i<width?288:33)).join('')});
 assert.deepEqual(m.decodeTable(slot(-1,8),8),[-1,0,0,0,0,0,0]);
 assert.deepEqual(m.decodeTable(slot(-1,4),4),[-1,0,0,0,0,0,0]);
 assert.throws(()=>m.decodeTable({t:2,s:'!'},8),/length/);
 assert.throws(()=>m.inspectActors(actors(2),1),/2..8/);
});
test('seeded assignment uses stable removal: exact body identities and extra manual flags',()=>{
 const before=inventory(2).fakes,assigned=m.assignPlayers(before,[0,1],[3,4],2,seed);
 assert.deepEqual(assigned.manualPlayerIds,['source:a15','source:a18']);
 assert.deepEqual(assigned.fakes.filter(f=>f.mode===1).map(f=>[f.name,f.playerIndex,f.colorIndex,f.flags]),[
  ['FakePlayer12',-1,8,32],['FakePlayer13',0,3,0],['FakePlayer16',1,4,0],['FakePlayer20',-1,8,64]
 ]);
 assert.deepEqual(assigned.rng,{state:'979653652388430269',inc:'54'});
 assert.deepEqual(before,inventory(2).fakes);
 assert.deepEqual(assigned,m.assignPlayers(before,[0,1],[3,4],2,seed));
});
test('assignment covers 2..8 players plus authored fallback extras, never reuses a body',()=>{
 for(let c=2;c<=8;c++){
  const v=inventory(c),indexes=Array.from({length:c},(_,i)=>i),a=m.assignPlayers(v.fakes,indexes,indexes,v.timers[0].allInputFakePlayerCount,seed);
  assert.equal(new Set(a.manualPlayerIds).size,c);
  assert.equal(a.fakes.filter(f=>f.mode===1).length,c+(c<4?2:1));
  assert.deepEqual(a.fakes.filter(f=>f.playerIndex>=0).map(f=>f.playerIndex).sort((a,b)=>a-b),indexes);
  assert.deepEqual(JSON.parse(JSON.stringify(a)),a);
 }
 assert.throws(()=>m.assignPlayers(inventory(2).fakes,[0,1],[0,1],2,{}),/explicit session RNG/);
});
test('history trends use four samples INCLUDING initially empty samples',()=>{
 const h=m.newHistory();assert.deepEqual(m.storeHistory(h,[1,6]),{left:8192,right:8192,jump:8192});
 m.storeHistory(h,[1,6]);m.storeHistory(h,[1,6]);
 assert.deepEqual(m.storeHistory(h,[1,6]),{left:32768,right:32768,jump:32768});
 assert.equal(h.historyIndex,0);assert.deepEqual(h.history,Array.from({length:4},()=>[1,6,0,0,0,0,0,0]));
 assert.deepEqual(m.storeHistory(h,[0,0]),{left:24576,right:24576,jump:24576});assert.equal(h.historyIndex,1);
});
test('history divides by participant count*4 with FP truncation, survives JSON',()=>{
 const h=m.newHistory();assert.deepEqual(m.storeHistory(h,[1,2,4]),{left:5461,right:5461,jump:5461});
 const clone=JSON.parse(JSON.stringify(h));assert.deepEqual(m.storeHistory(h,[7,0,0]),m.storeHistory(clone,[7,0,0]));
 assert.throws(()=>m.storeHistory(h,[8,0,0]),/bit masks/);
});
test('manual status is NOT IsPlayer; correct event reveals only a manual fake',()=>{
 const fake={mode:1,flags:1,fadeState:0,fakeLevelRaw:65536};assert.equal(m.isManual(fake),true);assert.equal(m.isPlayer(fake),false);
 m.applyPlayerEvent(fake,1,0);assert.equal(fake.flags,0);assert.equal(fake.fadeState,0);
 m.applyPlayerEvent(fake,35);assert.equal(fake.flags,1);
 m.applyPlayerEvent(fake,1,1);assert.equal(m.isPlayer(fake),true);assert.equal(fake.collisionAttribute,1);
 const ai={mode:0,flags:1,fadeState:0};m.applyPlayerEvent(ai,1,1);assert.deepEqual(ai,{mode:0,flags:0,fadeState:0});
 assert.equal(m.isClear({flags:8}),true);assert.equal(m.isClear({flags:1}),false);
});
test('fade: 60 truncated 60Hz frames leave raw 16; frame 61 completes',()=>{
 const f={mode:1,flags:0,fadeState:1,fakeLevelRaw:65536};
 assert.equal(m.rawFP(1/60),1092);
 for(let i=0;i<60;i++)m.advanceFade(f,1/60);
 assert.deepEqual([f.fadeState,f.fakeLevelRaw],[1,16]);m.advanceFade(f,1/60);
 assert.deepEqual([f.fadeState,f.fakeLevelRaw],[2,0]);m.advanceFade(f,1/60);assert.equal(f.fakeLevelRaw,0);
});
test('cursor result checker: absent=0, correct=1, wrong=-1; completed refs absent',()=>{
 const infos=[{fakePlayerId:'f0',playerIndex:3},{fakePlayerId:null,playerIndex:2}];
 assert.equal(m.checkPlayer(infos,0,3),1);assert.equal(m.checkPlayer(infos,0,2),-1);
 assert.equal(m.checkPlayer(infos,1,2),0);assert.equal(m.checkPlayer(infos,-1,3),0);assert.equal(m.checkPlayer(infos,2,3),0);
});
test('runtime refuses active stage at EVERY count, and refuses inventory bypass',()=>{
 for(let c=2;c<=8;c++)assert.throws(()=>m.compile(actors(c),c,seed),/missing FakeCage.*FakeCursor/);
 const inv=inventory(2);
 for(const fn of [m.create,m.solids,m.beforeStep,m.afterStep,m.displays])assert.throws(()=>fn(inv),/not ported/);
 const empty=m.create(m.compile([],2));assert.deepEqual(m.solids(empty),[]);
 assert.deepEqual(m.beforeStep(empty),{events:[],solids:[]});assert.deepEqual(m.displays(empty),[]);
 assert.deepEqual(m.supportedTypes,['FakePlayer','FakeTimer']);
});
