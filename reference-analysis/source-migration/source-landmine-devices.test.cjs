'use strict';
// Device tests for source-landmine-devices.js. Every expected number is either
// st_w_13_01's own authored data or a native constant named in the module
// header; nothing is calibrated against the port's own output.
const test=require('node:test'),assert=require('node:assert');
const fs=require('node:fs'),path=require('node:path');
const M=require('./source-landmine-devices.js');
const pop=require('./population-rules.cjs');

const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
const stage=(source.stages||source).find(s=>(s.id||s.stageId)==='st_w_13_01');
function actorsFor(count){
 const variant=pop.selectVariant(stage.json.stageInitParamList,count,true);
 return pop.actorsForCount(variant,count);
}
const SEED={rngState:'0x853c49e6748fea9b',rngIncrement:'0xda3e39cb94b95bdb'};
const fresh=(count=4,options=SEED)=>M.create(M.compile(actorsFor(count),count,options));
const DT=1/60;
const S=M.nativeConstants.state;
const players=n=>Array.from({length:n},(_,i)=>({id:'p'+(i+1),x:0,y:0,w:32,h:46}));
const contact=(sw,player)=>[{relayId:sw.id,actorId:player.id}];
// The machine spends one update on Start and one on Idle before Judge starts
// accumulating, and each update adds exactly one frame of FP time.
const TICK_RAW=M.tickRaw(DT); // 1092, which is QFP.OneFrame
const callsToSettle=raw=>2+Math.ceil(raw/TICK_RAW);
const SAFE_CALLS=callsToSettle(M.nativeConstants.pushedWaitTimeSafeRaw);
const FAIL_CALLS=callsToSettle(M.nativeConstants.pushedWaitTimeFailRaw);
const BANG_CALLS=FAIL_CALLS+Math.ceil(M.nativeConstants.explodeTimeRaw/TICK_RAW);
// Presses `sw` with `player` and runs until the switch settles or the budget ends.
function press(state,sw,player,party,ticks){
 const seen=[];
 for(let tick=0;tick<ticks;tick++){
  const out=M.beforeStep(state,{dt:DT,players:party,switchContacts:contact(sw,player)});
  seen.push({tick,...out});
 }
 return seen;
}

test('st_w_13_01 authors twelve switches and one observer aimed at its key',()=>{
 for(let count=2;count<=8;count++){
  const compiled=M.compile(actorsFor(count),count,SEED);
  assert.equal(compiled.switches.length,12,count+' players');
  assert.equal(compiled.observers.length,1);
  assert.equal(compiled.observers[0].targetName,'Key3');
  assert.deepEqual(compiled.warnings,[]);
  // The whole field is population-independent: pc0 on every actor.
  assert.deepEqual(compiled.observers[0].switchIds.length,12);
 }
});

test('the percentages become FP raws by a truncating divide, not a float',()=>{
 // ParseParameter 0x181871571: (n << 32) / (100 * 65536).
 assert.equal(M.percentRaw(5),3276);    // 5 * 65536 / 100 is 3276.8
 assert.equal(M.percentRaw(66),43253);  // 66 * 65536 / 100 is 43253.76
 assert.equal(M.percentRaw(100),65536);
 assert.equal(M.percentRaw(1),655);
 const observer=M.compile(actorsFor(4),4,SEED).observers[0];
 assert.equal(observer.landminePercentRaw,3276,'datas[0] is 5 percent');
 assert.equal(observer.clearPercentRaw,43253,'datas[1] is 66 percent');
});

test('the lottery turns one of the twelve into a mine and asks for eight presses',()=>{
 for(let count=2;count<=8;count++){
  const observer=M.compile(actorsFor(count),count,SEED).observers[0];
  // ceil(12 * 0.049988) is 1; ceil(12 * 0.65997) is 8, capped at 12 - 1.
  assert.equal(observer.landmineCount,1,count+' players');
  assert.equal(observer.clearSwitchCount,8,count+' players');
 }
});

test('the ceiling is an FP ceiling, so a hair over a whole number rounds up',()=>{
 assert.equal(M.ceilFp(65536),1,'exactly 1.0 stays 1');
 assert.equal(M.ceilFp(65537),2,'1.0 plus one raw unit becomes 2');
 assert.equal(M.ceilFp(0),0);
 assert.equal(M.ceilFp(1),1,'the smallest positive fraction still ceilings');
 // 12 * 0.65997 is 7.9196, which is why the stage asks 8 and not 7.
 assert.equal(M.ceilFp(Math.trunc(12*65536*43253/65536)),8);
});

test('exactly landmineCount switches are mines and the draw follows the seed',()=>{
 const first=M.compile(actorsFor(4),4,SEED);
 assert.equal(first.switches.filter(sw=>sw.isLandmine).length,1);
 const again=M.compile(actorsFor(4),4,SEED);
 assert.deepEqual(again.switches.map(sw=>sw.isLandmine),first.switches.map(sw=>sw.isLandmine),
  'the same seed must pick the same mine');
 const other=M.compile(actorsFor(4),4,{rngState:'0x1234567890abcdef',rngIncrement:'0xda3e39cb94b95bdb'});
 assert.equal(other.switches.filter(sw=>sw.isLandmine).length,1);
 assert.notDeepEqual(other.switches.map(sw=>sw.isLandmine),first.switches.map(sw=>sw.isLandmine),
  'a different seed must pick a different mine');
});

test('the shuffle can reach every switch, so no position is safe by construction',()=>{
 const seen=new Set();
 for(let i=0;i<400;i++){
  const compiled=M.compile(actorsFor(4),4,{rngState:'0x'+(0x9e3779b97f4a7c15n*BigInt(i+1)&((1n<<64n)-1n)).toString(16),rngIncrement:'0xda3e39cb94b95bdb'});
  seen.add(compiled.switches.findIndex(sw=>sw.isLandmine));
 }
 assert.equal(seen.size,12,'every one of the twelve was drawn at least once over 400 seeds');
});

test('a safe switch takes PUSHED_WAIT_TIME_SAFE and then counts, without a mine wait',()=>{
 const state=fresh(),party=players(4);
 const safe=state.switches.find(sw=>!sw.isLandmine);
 const seen=press(state,safe,party[0],party,SAFE_CALLS);
 assert.equal(safe.state,S.END);
 assert.equal(state.observers[0].pushedSwitchCount,1);
 assert.ok(seen.some(s=>s.sounds.some(x=>x.seId===M.nativeConstants.se.SAFE)));
 assert.deepEqual(seen.flatMap(s=>s.events),[],'a safe press emits nothing');
 const faster=fresh(),party2=players(4);
 const safe2=faster.switches.find(sw=>!sw.isLandmine);
 press(faster,safe2,party2[0],party2,SAFE_CALLS-1);
 assert.equal(safe2.state,S.JUDGE,'one update earlier it is still judging');
 assert.equal(TICK_RAW,1092,'one frame of 60Hz truncates to QFP.OneFrame');
 assert.equal(SAFE_CALLS,27,'0.4s needs 25 frames of 1092 raw, after Start and Idle');
});

test('a mine waits the longer PUSHED_WAIT_TIME_FAIL before it starts ticking',()=>{
 const state=fresh(),party=players(4);
 const mine=state.switches.find(sw=>sw.isLandmine);
 press(state,mine,party[0],party,FAIL_CALLS-1);
 assert.equal(mine.state,S.JUDGE,'0.5s is 30 frames, so one short is still the judge');
 assert.equal(FAIL_CALLS,33,'0.5s needs 31 frames of 1092 raw');
 assert.ok(FAIL_CALLS>SAFE_CALLS,'a mine deliberately hesitates longer than a safe switch');
 M.beforeStep(state,{dt:DT,players:party,switchContacts:contact(mine,party[0])});
 assert.equal(mine.state,S.EXPLOSION);
 assert.equal(mine.pushedPlayerId,party[0].id);
 assert.equal(party[0].inputLocked,false,'the Judge to Explosion step hands control back');
});

test('an exploding mine beeps on the QFP._0_05 interval and kills after EXPLODE_TIME',()=>{
 const state=fresh(),party=players(4);
 const mine=state.switches.find(sw=>sw.isLandmine);
 const seen=press(state,mine,party[0],party,BANG_CALLS);
 const beeps=seen.filter(s=>s.sounds.some(x=>x.seId===M.nativeConstants.se.SAFE&&!x.flash)).length;
 // 1.5s of beeps every 0.0499725s is 30 of them, plus the safe-press beep is absent here.
 assert.ok(beeps>=29&&beeps<=31,'beeps '+beeps);
 const bang=seen.find(s=>s.sounds.some(x=>x.seId===M.nativeConstants.se.EXPLODE));
 assert.ok(bang,'the explosion sound fires');
 assert.deepEqual(bang.sounds.find(x=>x.seId===M.nativeConstants.se.EXPLODE),
  {switchId:mine.id,seId:11,flash:true,shake:true});
 assert.deepEqual(bang.events,[{targetId:party[0].id,eventType:19,senderId:mine.id}],
  'the kill is event 19 at that one player, not a broadcast');
 assert.deepEqual(bang.deadPlayerIds,[party[0].id]);
 assert.equal(mine.state,S.END);
 assert.equal(mine.isRevealed,true,'the mine shows itself once it has gone off');
 assert.equal(state.observers[0].isGameOver,true);
});

test('an immortal player survives the mine, like every other event 19',()=>{
 const state=fresh(),party=players(4);
 party[0].immortal=true;
 const mine=state.switches.find(sw=>sw.isLandmine);
 const seen=press(state,mine,party[0],party,BANG_CALLS);
 const bang=seen.find(s=>s.events.length);
 assert.deepEqual(bang.events,[{targetId:party[0].id,eventType:19,senderId:mine.id}]);
 assert.deepEqual(bang.deadPlayerIds,[],'the event still goes out, the player just lives');
});

test('control rotates to the next player after each safe press and everyone else is frozen',()=>{
 const state=fresh(),party=players(4);
 const safe=state.switches.filter(sw=>!sw.isLandmine);
 press(state,safe[0],party[0],party,SAFE_CALLS);
 assert.deepEqual(party.map(p=>!!p.inputLocked),[true,false,true,true]);
 assert.deepEqual(party.map(p=>!!p.grayscale),[true,false,true,true]);
 assert.equal(M.displays(state).observer.currentPushPlayerId,'p2');
 press(state,safe[1],party[1],party,SAFE_CALLS);
 assert.deepEqual(party.map(p=>!!p.inputLocked),[true,true,false,true]);
 assert.equal(M.displays(state).observer.currentPushPlayerId,'p3');
 // It wraps, so a fourth press comes back round to the first player.
 press(state,safe[2],party[2],party,SAFE_CALLS);
 press(state,safe[3],party[3],party,SAFE_CALLS);
 assert.equal(M.displays(state).observer.currentPushPlayerId,'p1');
 assert.equal(state.observers[0].pushedSwitchCount,4);
});

test('pressing the clearSwitchCount-th safe switch clears and opens the key a second later',()=>{
 const state=fresh(),party=players(4);
 const safe=state.switches.filter(sw=>!sw.isLandmine);
 for(let i=0;i<8;i++){
  for(const p of party)p.inputLocked=false;
  press(state,safe[i],party[i%4],party,SAFE_CALLS);
 }
 assert.equal(state.observers[0].pushedSwitchCount,8);
 assert.equal(state.observers[0].isGameClear,true);
 assert.equal(state.observers[0].isClearEventCalled,false,'the event waits a second');
 const seen=[];
 for(let tick=0;tick<61;tick++)seen.push(M.beforeStep(state,{dt:DT,players:party}));
 const opened=seen.find(out=>out.events.length);
 assert.ok(opened,'the key event does fire');
 assert.deepEqual(opened.events,[{targetName:'Key3',eventType:61,on:true,senderId:state.observers[0].id}]);
 assert.ok(opened.sounds.some(x=>x.seId===M.nativeConstants.se.CLEAR));
 assert.deepEqual(party.map(p=>!!p.inputLocked),[false,false,false,false],'clearing unlocks everyone');
 // And it only fires once.
 for(let tick=0;tick<120;tick++)assert.deepEqual(M.beforeStep(state,{dt:DT,players:party}).events,[]);
});

test('a switch nobody touches never leaves Idle',()=>{
 const state=fresh(),party=players(4);
 for(let tick=0;tick<600;tick++)M.beforeStep(state,{dt:DT,players:party});
 for(const sw of state.switches)assert.equal(sw.state,S.IDLE);
 assert.equal(state.observers[0].pushedSwitchCount,0);
 assert.equal(state.observers[0].isGameOver,false);
 assert.equal(state.observers[0].isGameClear,false);
});

test('a lost round stops accepting presses',()=>{
 const state=fresh(),party=players(4);
 const mine=state.switches.find(sw=>sw.isLandmine);
 press(state,mine,party[0],party,BANG_CALLS);
 assert.equal(state.observers[0].isGameOver,true);
 const safe=state.switches.find(sw=>!sw.isLandmine);
 press(state,safe,party[1],party,60);
 assert.equal(safe.state,S.IDLE,'Idle refuses while the observer is over');
 assert.equal(state.observers[0].pushedSwitchCount,0);
});

test('displays() hides which switch is a mine until it has revealed itself',()=>{
 const state=fresh(),party=players(4);
 for(const sw of M.displays(state).switches)
  assert.equal(sw.revealedLandmine,null,'an unpressed switch must give nothing away');
 const mine=state.switches.find(sw=>sw.isLandmine);
 press(state,mine,party[0],party,BANG_CALLS);
 const view=M.displays(state).switches.find(sw=>sw.id===mine.id);
 assert.equal(view.revealedLandmine,true);
 assert.equal(view.state,S.END);
 assert.equal(JSON.stringify(M.displays(state).switches).includes('"isLandmine"'),false);
});

test('unverified LandmineSwitch parameters are refused instead of ignored',()=>{
 const withTable=actorsFor(4).map(a=>a.typeName!=='LandmineSwitch'?a:
  {...a,datas:a.datas.map((d,i)=>i===0?{t:2,f:0,s:'"'+'"'.replace('"','#')+'!'.repeat(55)+'"'}:d)});
 assert.throws(()=>M.compile(withTable,4,SEED),/Unverified LandmineSwitch parameters/);
 const withInt=actorsFor(4).map(a=>a.typeName!=='LandmineSwitch'?a:
  {...a,datas:a.datas.map((d,i)=>i===2?{t:1,f:3,s:null}:d)});
 assert.throws(()=>M.compile(withInt,4,SEED),/Unverified LandmineSwitch parameters/);
});

test('a half-built stage is refused rather than half-simulated',()=>{
 assert.throws(()=>M.compile(actorsFor(4).filter(a=>a.typeName!=='LandmineSwitchObserver'),4,SEED),
  /LandmineSwitch with no LandmineSwitchObserver/);
 assert.throws(()=>M.compile(actorsFor(4).filter(a=>a.typeName!=='LandmineSwitch'),4,SEED),
  /LandmineSwitchObserver with no LandmineSwitch/);
 const noTarget=actorsFor(4).map(a=>a.typeName!=='LandmineSwitchObserver'?a:
  {...a,datas:a.datas.map((d,i)=>i===2?{t:2,f:0,s:'""'}:d)});
 assert.throws(()=>M.compile(noTarget,4,SEED),/without a target name/);
 const twoObservers=[...actorsFor(4),actorsFor(4).find(a=>a.typeName==='LandmineSwitchObserver')];
 assert.throws(()=>M.compile(twoObservers,4,SEED),/More than one LandmineSwitchObserver/);
});

test('more switches than SWITCH_MAX is refused',()=>{
 const one=actorsFor(4).find(a=>a.typeName==='LandmineSwitch');
 const many=[actorsFor(4).find(a=>a.typeName==='LandmineSwitchObserver'),
  ...Array.from({length:M.nativeConstants.switchMax+1},(_,i)=>({...one,name:'LS'+i}))];
 assert.throws(()=>M.compile(many,4,SEED),/SWITCH_MAX/);
});

test('the device never produces a solid and refuses an invalid delta',()=>{
 const state=fresh();
 assert.deepEqual(M.solids(state),[]);
 assert.deepEqual(M.beforeStep(state,{dt:DT,players:players(4)}).solids,[]);
 assert.throws(()=>M.beforeStep(state,{dt:-1}),/Invalid landmine delta/);
 assert.throws(()=>M.beforeStep(state,{dt:NaN}),/Invalid landmine delta/);
});

test('the state survives a JSON round trip, which the online layer needs',()=>{
 const state=fresh(),party=players(4);
 const safe=state.switches.find(sw=>!sw.isLandmine);
 press(state,safe,party[0],party,10);
 const copy=JSON.parse(JSON.stringify(state));
 const partyA=players(4),partyB=players(4);
 const a=[],b=[];
 for(let tick=0;tick<60;tick++){
  a.push(M.beforeStep(state,{dt:DT,players:partyA,switchContacts:contact(safe,partyA[0])}));
  b.push(M.beforeStep(copy,{dt:DT,players:partyB,switchContacts:contact(safe,partyB[0])}));
 }
 assert.deepEqual(a,b);
 assert.deepEqual(state.switches,copy.switches);
});
