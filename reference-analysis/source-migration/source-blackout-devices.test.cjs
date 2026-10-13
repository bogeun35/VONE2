'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('./source-blackout-devices.js'),pop=require('./population-rules.cjs');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
const ids=['st_w_03_01','st_w_07_03','st_w_09_01','st_w_09_03','st_w_15_02'];
const actors=(id,count=2)=>{const s=source.stages.find(s=>s.stageId===id);return pop.actorsForCount(pop.selectVariant(s.json.stageInitParamList,count,true),count);};
const fresh=(id='st_w_07_03',count=2,options={})=>M.create(M.compile(actors(id,count),count,options));
const run=(s,n,ctx={})=>{let out;for(let i=0;i<n;i++)out=M.beforeStep(s,ctx);return out;};
test('real five stages compile for all 2..8 populations with exact authored raw values',()=>{
 for(const id of ids)for(let count=2;count<=8;count++){
  const s=fresh(id,count),b=s.blackouts[0];assert.equal(s.blackouts.length,1);assert.deepEqual(M.solids(s),[]);
  if(id==='st_w_07_03'||id==='st_w_15_02'){
   assert.deepEqual([b.brightRaw,b.darkRaw,b.darknessRaw,b.fadeRaw,b.option,b.curtain,b.phase],[98304,196608,39321,52428,1,true,0]);
   assert.equal(s.controllers.length,1);const c=s.controllers[0];assert.deepEqual(c.activeTable,Array(7).fill(262144));assert.deepEqual(c.inactiveTable,Array(7).fill(229376));assert.equal(c.timerRaw,229376);
  }else{assert.equal(s.controllers.length,0);assert.equal(b.phase,4);assert.equal(b.alphaRaw,id==='st_w_03_01'?29491:22937);assert.equal(b.option,0);assert.equal(s.actorsPaused,false);assert.equal(b.fadeRaw,4368);}
 }
});
test('QPlayerCountParam zero fallback and signed raws; malformed strings are refused',()=>{
 const encoded=values=>({t:2,s:values.map(v=>{let raw=BigInt.asUintN(64,BigInt(v)),s='';for(let b=0;b<8;b++){s+=String.fromCharCode(Number(raw&255n)+0x21);raw>>=8n;}return s;}).join('')});
 const table=M.playerCountTable(encoded([65536,0,-65536,0,0,131072,0]));assert.deepEqual(table,[65536,0,-65536,0,0,131072,0]);
 assert.equal(M.findByPlayerCount(table,3),65536);assert.equal(M.findByPlayerCount(table,6),-65536);assert.equal(M.findByPlayerCount(table,8),131072);
 assert.throws(()=>M.playerCountTable({t:2,s:'bad'}),/56 UTF16/);
 assert.throws(()=>M.compile(actors('st_w_07_03').filter(a=>a.typeName!=='Blackout'),2),/requires a Blackout/);
 const a=actors('st_w_07_03').map(a=>structuredClone(a)),c=a.find(a=>a.typeName==='BlackoutController');c.datas[0]=encoded(Array(7).fill(0));c.datas[1]=encoded(Array(7).fill(-65536));
 assert.deepEqual(M.compile(a,2).controllers.map(c=>[c.activeRaw,c.inactiveRaw]),[[262144,262144]]);
});
test('inactive 3.5 seconds expires at tick211; dark fade takes49 FP ticks and resumes physics before fade',()=>{
 const s=fresh();let out=run(s,210);assert.equal(s.controllers[0].phase,0);assert.equal(s.controllers[0].timerRaw,56);assert.equal(s.blackouts[0].phase,1);assert.equal(s.actorsPaused,true);
 out=run(s,1);assert.equal(s.controllers[0].phase,1);assert.equal(s.controllers[0].timerRaw,262471);assert.equal(s.blackouts[0].phase,1);
 out=run(s,1);assert.equal(s.blackouts[0].phase,2);assert.equal(s.blackouts[0].alphaRaw,0);assert.equal(s.actorsPaused,false);assert.deepEqual(out.events.map(e=>[e.eventType,e.pause]),[[53,false]]);
 // 0x18183bf99..c0: floor(52416*65536/52428)=65520,
 // then floor(65520*39321/65536)=39311 (two separate FP truncations).
 run(s,48);assert.equal(s.blackouts[0].phase,2);assert.equal(s.blackouts[0].fade.timeRaw,52416);assert.equal(s.blackouts[0].alphaRaw,39311);
 out=run(s,1);assert.equal(s.blackouts[0].phase,3);assert.equal(s.blackouts[0].alphaRaw,39321);assert.equal(s.blackouts[0].curtainDown,true);assert.deepEqual(out.curtainCommands.map(c=>c.animationId),[3]);
});
test('controller reveals at241 active ticks, accepts only chosen Shot edge and preserves selected player',()=>{
 const s=fresh(),selected=s.controllers[0].playerIndex;run(s,211);run(s,240);assert.equal(s.controllers[0].phase,1);assert.equal(s.controllers[0].timerRaw,391);assert.equal(s.controllers[0].visibleUI,false);
 run(s,1);assert.equal(s.controllers[0].phase,2);assert.equal(s.controllers[0].visibleUI,true);
 const inputs=[];inputs[1-selected]={shotPressed:true};run(s,1,{gamePlayerInputs:inputs});assert.equal(s.controllers[0].phase,2);
 inputs[selected]={shot:{counter7c:2,counter80:1}};run(s,1,{gamePlayerInputs:inputs});assert.equal(s.controllers[0].phase,2);
 inputs[selected]={shot:{counter7c:2,counter80:2}};run(s,1,{gamePlayerInputs:inputs});assert.equal(s.controllers[0].phase,0);assert.equal(s.controllers[0].timerRaw,229703);assert.equal(s.controllers[0].visibleUI,false);assert.equal(s.blackouts[0].inBlackout,false);
 const out=run(s,1);assert.equal(s.blackouts[0].phase,0);assert.equal(s.actorsPaused,true);assert.deepEqual(out.events.map(e=>[e.eventType,e.pause]),[[53,true]]);
 run(s,49);assert.equal(s.blackouts[0].alphaRaw,0);assert.equal(s.blackouts[0].phase,1);assert.equal(s.controllers[0].playerIndex,selected);
});
test('native pause is ignored locally; any single dead player ends controller and releases bright hold',()=>{
 const s=fresh();run(s,1);const out=run(s,1,{events:[{broadcast:true,eventType:53,pause:true}],players:[{id:'p1',dead:true},{id:'p2',dead:false}]});
 assert.equal(s.controllers[0].phase,3);assert.equal(s.controllers[0].visibleUI,false);assert.equal(s.blackouts[0].phase,2);assert.equal(s.blackouts[0].suspended,false);assert.deepEqual(out.events.map(e=>[e.eventType,e.pause]),[[53,false]]);
 const t=fresh();run(t,1);run(t,1,{stageRequestedAny:true});assert.equal(t.controllers[0].phase,3);assert.equal(t.blackouts[0].phase,2);
});
test('event15 permanently sets blackout suspension and stops at phase4',()=>{
 const s=fresh();run(s,1);M.afterStep(s,{events:[{broadcast:true,eventType:15}]});assert.equal(s.blackouts[0].suspended,true);
 run(s,1);assert.equal(s.blackouts[0].phase,2);run(s,1);assert.equal(s.blackouts[0].phase,4);
});
test('PCG draw is seeded and maps ordered game player infos; JSON roundtrip yields identical ticks',()=>{
 const options={rngState:'0x853c49e6748fea9b',rngIncrement:'0xda3e39cb94b95bdb',playerInfo:[{playerIndex:6,colorIndex:3},{playerIndex:2,colorIndex:7}]};
 const s=fresh('st_w_07_03',2,options);assert.equal(s.controllers[0].playerIndex,2);assert.equal(s.controllers[0].colorIndex,7);
 const copy=JSON.parse(JSON.stringify(s));for(let i=0;i<500;i++){assert.deepEqual(M.beforeStep(s),M.beforeStep(copy));assert.deepEqual(s,copy);}
 assert.deepEqual(M.displays(s),M.displays(copy));
});
test('without controller native repeating timers and default four-frame fade keep exact phases',()=>{
 const a=structuredClone(actors('st_w_07_03').find(a=>a.typeName==='Blackout'));a.datas[4].f=0;a.datas[6].f=0;
 const s=M.create(M.compile([a],2));assert.equal(s.blackouts[0].fadeRaw,4368);run(s,1);assert.equal(s.blackouts[0].phase,1);
 run(s,90);assert.equal(s.blackouts[0].phase,1);assert.equal(s.blackouts[0].timerRaw,24);run(s,1);assert.equal(s.blackouts[0].phase,2);
 run(s,3);assert.equal(s.blackouts[0].phase,2);run(s,1);assert.equal(s.blackouts[0].phase,3);assert.equal(s.blackouts[0].alphaRaw,65536);
 run(s,180);assert.equal(s.blackouts[0].phase,3);assert.equal(s.blackouts[0].timerRaw,48);run(s,1);assert.equal(s.blackouts[0].phase,0);
});
