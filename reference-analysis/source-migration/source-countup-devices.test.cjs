'use strict';
// Device tests for source-countup-devices.js. Every expected number is either
// st_w_10_01's own authored data or a native constant named in the module
// header; nothing here is calibrated against the port's own output.
const test=require('node:test'),assert=require('node:assert');
const fs=require('node:fs'),path=require('node:path');
const M=require('./source-countup-devices.js');
const pop=require('./population-rules.cjs');

const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
const stage=(source.stages||source).find(s=>(s.id||s.stageId)==='st_w_10_01');
function actorsFor(count){
 const variant=pop.selectVariant(stage.json.stageInitParamList,count,true);
 return pop.actorsForCount(variant,count);
}
const SEED={rngState:'0x853c49e6748fea9b',rngIncrement:'0xda3e39cb94b95bdb'};
const fresh=count=>M.create(M.compile(actorsFor(count),count,SEED));
const DT=1/60;
// Steps the device and returns everything it emitted, so a test can assert on
// the tick a notice or an event landed rather than only on the end state.
function run(state,ticks,hook){
 const seen=[];
 for(let tick=0;tick<ticks;tick++){
  const out=M.beforeStep(state,{dt:DT,events:hook?hook(tick,state)||[]:[]});
  for(const n of out.notices)seen.push({tick,notice:n.release?'release':n.typeName});
  for(const e of out.events)seen.push({tick,event:e});
  for(const s of out.sounds)seen.push({tick,seId:s.seId});
 }
 return seen;
}
const coopOf=state=>state.coops[0];
// Reaches the tick right after "Go", with every timer counting.
function runToGo(state){
 for(let tick=0;tick<600;tick++){
  M.beforeStep(state,{dt:DT});
  if(coopOf(state).phase===3)return tick;
 }
 throw new Error('never reached Go');
}

test('st_w_10_01 authors one coop timer and one CountUpTimer per present player',()=>{
 for(let count=2;count<=8;count++){
  const compiled=M.compile(actorsFor(count),count,SEED);
  assert.equal(compiled.coops.length,1,count+' players');
  assert.equal(compiled.timers.length,count);
  assert.deepEqual(compiled.warnings,[]);
  // datas[0] is m_Index, so slot i holds the i-th timer and nothing is dropped.
  assert.deepEqual(compiled.coops[0].timerIds.map(id=>id?1:0),
   Array.from({length:8},(_,i)=>i<count?1:0));
  for(const t of compiled.timers)assert.equal(t.parentName,'CoopCountUpTimer1');
 }
});

test('the datas[1] judge table decodes to 0.4 seconds of slack per player',()=>{
 const coop=actorsFor(8).find(a=>a.typeName==='CoopCountUpTimer');
 const table=M.playerCountTable(coop.datas[1]).map(raw=>raw/65536);
 assert.deepEqual(table,[0.79998779296875,1.1999969482421875,1.5999908447265625,2,
  2.399993896484375,2.79998779296875,3.1999969482421875]);
 // The walk-down at 0x181807e26 starts at count-2; every entry here is non-zero.
 assert.equal(M.findByPlayerCount(table.map(v=>v*65536),5),131072);
 // A hole falls back to the nearest lower entry, and an all-zero prefix gives 0.
 assert.equal(M.findByPlayerCount([10,0,0,0,0,0,0],4),10);
 assert.equal(M.findByPlayerCount([0,0,0,0,0,0,0],8),0);
});

test('the judge window is the authored centisecond pair, not a rounded second',()=>{
 // (QFP._0_005 + slot) * 100 floored. datas[0] is 0.05 for every count.
 const expected={2:80,3:120,4:160,5:200,6:240,7:280,8:320};
 for(let count=2;count<=8;count++){
  const coop=M.compile(actorsFor(count),count,SEED).coops[0];
  assert.equal(coop.judgeTimeMin,5,count+' players min');
  assert.equal(coop.judgeTimeMax,expected[count],count+' players max');
 }
});

test('the half-centisecond bias makes the conversion round rather than truncate',()=>{
 // Without QFP._0_005 the 0.8 table entry would floor to 79 instead of 80,
 // because its FP raw is 52428 = 0.79998779, not 0.8.
 assert.equal(M.centiseconds(52428),80);
 assert.equal(Math.floor(52428*100/65536),79);
 assert.equal(M.centiseconds(0),0);
});

test('the ready window is read per variant, so a small party gets the other one',()=>{
 // st_w_10_01 ships two variants: createIndex 0 for 2..4 and 1 for 5..8.
 for(const count of [2,3,4]){
  const coop=M.compile(actorsFor(count),count,SEED).coops[0];
  assert.deepEqual([coop.readySecMin,coop.readySecMax],[2.75,4.136],count+' players');
 }
 for(const count of [5,6,7,8]){
  const coop=M.compile(actorsFor(count),count,SEED).coops[0];
  assert.deepEqual([coop.readySecMin,coop.readySecMax],[1.25,5.36],count+' players');
 }
});

test('the phase machine waits half a second, says Ready, then waits a random delay',()=>{
 const state=fresh(8),coop=coopOf(state);
 const seen=run(state,200);
 // Phase 0 is instant: m_ColorType 0, m_Timer = QFP._0_50, phase 1 on the first tick.
 const ready=seen.find(s=>s.notice==='Ready');
 assert.equal(ready.tick,31,'0.5s at 60Hz, with the > 0 test costing one extra tick');
 assert.ok(seen.some(s=>s.seId===M.nativeConstants.readySeId),'the Ready SE is SeId 0x17');
 const go=seen.find(s=>s.notice==='Go');
 const delay=(go.tick-ready.tick)*DT;
 assert.ok(delay>=coop.readySecMin&&delay<=coop.readySecMax+DT,
  'the delay '+delay+' must sit inside the authored '+coop.readySecMin+'..'+coop.readySecMax);
 // Only at Go do the timers start; before it they are all at zero.
 assert.equal(state.timers.filter(t=>t.counting).length,8);
});

test('the Ready delay is drawn from the seeded stream and is reproducible',()=>{
 const first=run(fresh(8),200).find(s=>s.notice==='Go').tick;
 const again=run(fresh(8),200).find(s=>s.notice==='Go').tick;
 assert.equal(first,again);
 const other=M.create(M.compile(actorsFor(8),8,{rngState:'0x1234567890abcdef'}));
 assert.notEqual(run(other,400).find(s=>s.notice==='Go').tick,first,
  'a different seed must draw a different delay');
});

test('a switch pressed before Go is a false start and resets the whole round',()=>{
 const state=fresh(8),coop=coopOf(state),timer=state.timers[3];
 run(state,10);
 M.beforeStep(state,{dt:DT,events:[{targetName:timer.name,eventType:61}]});
 assert.equal(timer.failed,true,'pressing while not counting sets IsFailed');
 assert.equal(timer.stopped,true);
 assert.equal(timer.hatena,false,'hatena is versus-mode only, and the parent is a coop timer');
 assert.equal(coop.phase,5,'phase 1 jumps straight to 5 on a false start');
 // Phase 5 paints it red and holds QFP._1_50 before broadcasting the reset.
 let resetTick=-1;
 for(let tick=0;tick<200&&resetTick<0;tick++){
  const out=M.beforeStep(state,{dt:DT});
  assert.equal(coop.colorType,2,'the round stays red until it resets');
  if(out.events.some(e=>e.eventType===47))resetTick=tick;
 }
 assert.equal(resetTick,91,'1.5s at 60Hz, plus the tick the > 0 test costs');
 for(const t of state.timers){
  assert.equal(t.failed,false,'event 47 clears every flag');
  assert.equal(t.stopped,false);
  assert.equal(t.time,0);
 }
 assert.equal(coop.phase,0,'the machine starts over rather than ending');
 // And it really does start over: a second Ready/Go pair follows.
 const again=run(state,400);
 assert.ok(again.some(s=>s.notice==='Ready'));
 assert.ok(again.some(s=>s.notice==='Go'));
});

test('stopping every timer inside the window clears the round and switches the key on',()=>{
 const state=fresh(8);
 runToGo(state);
 // Nine ticks of reaction, then all eight presses on the same tick.
 run(state,9);
 const out=M.beforeStep(state,{dt:DT,
  events:state.timers.map(t=>({targetName:t.name,eventType:61}))});
 assert.deepEqual(out.events,[]);
 const coop=coopOf(state);
 assert.equal(coop.allStopped,true);
 assert.equal(coop.anyFailed,false);
 // Nine ticks is 0.15s, so 15cs each and 120cs over eight, inside (5,320).
 assert.equal(coop.sumTime,120);
 // updatePhase runs once a tick, so the judgement and the reward are one tick apart.
 assert.deepEqual(M.beforeStep(state,{dt:DT}).events,[]);
 assert.equal(coop.phase,7,'phase 4 judged a win');
 const reward=M.beforeStep(state,{dt:DT});
 assert.equal(coop.phase,8);
 assert.equal(coop.colorType,1);
 assert.deepEqual(reward.events,[{broadcastActorType:17,eventType:1,senderId:coop.id}],
  'the win is an event 1 to every Key, which is what un-hides the inactive key');
 // Phase 8 is terminal: nothing more is emitted and the colour stays green.
 for(let i=0;i<120;i++)assert.deepEqual(M.beforeStep(state,{dt:DT}).events,[]);
 assert.equal(coop.phase,8);
});

test('being too slow loses even though nobody made a false start',()=>{
 const state=fresh(2),coop=coopOf(state);
 runToGo(state);
 // 2 players share an 80cs budget. Hold for 60 ticks each and the sum is 200.
 run(state,60);
 const out=M.beforeStep(state,{dt:DT,
  events:state.timers.map(t=>({targetName:t.name,eventType:61}))});
 assert.deepEqual(out.events,[]);
 assert.equal(coop.anyFailed,false,'a slow press is not a false start');
 assert.ok(coop.sumTime>coop.judgeTimeMax,'sum '+coop.sumTime+' over '+coop.judgeTimeMax);
 M.beforeStep(state,{dt:DT});
 assert.equal(coop.phase,6,'a loss goes to phase 5 and straight on to the 1.5s hold');
 assert.equal(coop.colorType,2);
});

test('the judge window is open at both ends',()=>{
 const coop={judgeTimeMin:5,judgeTimeMax:320,anyFailed:false,sumTime:5};
 assert.equal(M.isCleared(coop),false,'equal to the minimum is not inside');
 coop.sumTime=6;assert.equal(M.isCleared(coop),true);
 coop.sumTime=319;assert.equal(M.isCleared(coop),true);
 coop.sumTime=320;assert.equal(M.isCleared(coop),false,'equal to the maximum is not inside');
 coop.sumTime=100;coop.anyFailed=true;
 assert.equal(M.isCleared(coop),false,'a false start overrides a good sum');
});

test('a timer nobody presses stops at m_LimitTime without being marked failed',()=>{
 const state=fresh(2);
 const go=runToGo(state);
 run(state,601); // 10s at 60Hz, stopping before the lost round resets the clocks.
 const t=state.timers[0];
 assert.equal(t.time,M.nativeConstants.limitTime,'QFP._10, not the versus BATTLE_LIMIT_TIME');
 assert.equal(M.nativeConstants.battleLimitTime,3);
 assert.equal(t.stopped,true);
 assert.equal(t.failed,false,'IsFailed needs m_Flags bit4, which only a CountUpJudge parent sets');
 // 1000cs each blows the 80cs window, so the round is lost on time alone.
 assert.ok(coopOf(state).sumTime>=2000,'sum '+coopOf(state).sumTime);
 assert.ok(go>0);
});

test('event 47 rewinds a timer and event 42 only clears hatena',()=>{
 const state=fresh(2),t=state.timers[0];
 runToGo(state);
 run(state,30);
 assert.ok(t.time>0);
 t.hatena=true;
 M.signal(state,{broadcast:true,eventType:42});
 assert.equal(t.hatena,false);
 assert.ok(t.time>0,'event 42 leaves the clock alone');
 M.signal(state,{broadcast:true,eventType:47});
 assert.equal(t.time,0);
 assert.equal(t.counting,false);
 assert.equal(t.stopped,false);
});

test('a start event is ignored by a timer that already false-started',()=>{
 const state=fresh(2),t=state.timers[0];
 M.signal(state,{targetName:t.name,eventType:61});
 assert.equal(t.failed,true);
 M.signal(state,{broadcastActorType:166,eventType:1});
 assert.equal(t.counting,false,'0x18180cf4a refuses to restart a failed timer');
 assert.equal(state.timers[1].counting,true,'its neighbour still starts');
});

test('a switch only reaches the timer it names',()=>{
 const state=fresh(8);
 runToGo(state);
 M.beforeStep(state,{dt:DT,events:[{targetName:state.timers[2].name,eventType:61}]});
 assert.deepEqual(state.timers.map(t=>t.counting?1:0),[1,1,0,1,1,1,1,1]);
});

test('a CountUpTimer whose parent is not in the stage is refused, not silently orphaned',()=>{
 const actors=actorsFor(8).filter(a=>a.typeName!=='CoopCountUpTimer');
 assert.throws(()=>M.compile(actors,8,SEED),/is not a CoopCountUpTimer/);
 const noName=actorsFor(8).map(a=>a.typeName!=='CountUpTimer'?a:
  {...a,datas:a.datas.map((d,i)=>i===1?{t:2,f:0,s:'""'}:d)});
 assert.throws(()=>M.compile(noName,8,SEED),/without a parent name/);
});

test('an unauthored ready window or an empty judge table is refused',()=>{
 const blank=slot=>actorsFor(8).map(a=>a.typeName!=='CoopCountUpTimer'?a:
  {...a,datas:a.datas.map((d,i)=>i===slot?{t:1,f:0,s:null}:d)});
 assert.throws(()=>M.compile(blank(5),8,SEED),/ready window is not authored/);
 assert.throws(()=>M.compile(blank(6),8,SEED),/ready window is not authored/);
 const emptyTable=actorsFor(8).map(a=>a.typeName!=='CoopCountUpTimer'?a:
  {...a,datas:a.datas.map((d,i)=>i===1?{t:2,f:0,s:'"'+'!'.repeat(56)+'"'}:d)});
 assert.throws(()=>M.compile(emptyTable,8,SEED),/no entry at or below/);
 const shortTable=actorsFor(8).map(a=>a.typeName!=='CoopCountUpTimer'?a:
  {...a,datas:a.datas.map((d,i)=>i===1?{t:2,f:0,s:'"!!!"'}:d)});
 assert.throws(()=>M.compile(shortTable,8,SEED),/must be 56 units/);
});

test('the FP range draw stays inside its bounds and uses the thorn generator',()=>{
 const rng={state:0x853c49e6748fea9bn,inc:0xda3e39cb94b95bdbn};
 for(let i=0;i<500;i++){
  const v=M.rngNextSeconds(rng,1.25,5.36);
  assert.ok(v>=1.25&&v<5.36,'draw '+v);
 }
 // 0x181662020 swaps the bounds itself before computing the range.
 const a={state:1n,inc:1n},b={state:1n,inc:1n};
 assert.equal(M.rngNextSeconds(a,5.36,1.25),M.rngNextSeconds(b,1.25,5.36));
 assert.equal(M.nativeConstants.rng.multiplier,'0x5851f42d4c957f2d');
});

test('the device never produces a solid and never kills anyone',()=>{
 const state=fresh(8);
 run(state,400);
 assert.deepEqual(M.solids(state),[]);
 const out=M.beforeStep(state,{dt:DT});
 assert.deepEqual(out.solids,[]);
 assert.equal('deadPlayerIds' in out,false);
});

test('the state survives a JSON round trip, which the online layer needs',()=>{
 const state=fresh(6);
 runToGo(state);
 run(state,20);
 const copy=JSON.parse(JSON.stringify(state));
 const a=run(state,120),b=run(copy,120);
 assert.deepEqual(a,b,'a rehydrated state must keep drawing the same numbers');
});

test('displays() hands the renderer the phase, the colour and every timer',()=>{
 const state=fresh(4);
 runToGo(state);
 run(state,15);
 const [view]=M.displays(state);
 assert.equal(view.phase,3);
 assert.equal(view.colorType,0);
 assert.equal(view.timers.length,4);
 assert.deepEqual(view.timers.map(t=>t.index),[0,1,2,3]);
 assert.equal(view.timers[0].centiseconds,Math.floor(state.timers[0].time*100));
 assert.deepEqual([view.judgeTimeMin,view.judgeTimeMax],[5,160]);
 for(const t of view.timers)assert.equal(t.counting,true);
});

test('an invalid delta is refused instead of corrupting the clock',()=>{
 const state=fresh(2);
 assert.throws(()=>M.beforeStep(state,{dt:-1}),/Invalid device delta/);
 assert.throws(()=>M.beforeStep(state,{dt:NaN}),/Invalid device delta/);
});
