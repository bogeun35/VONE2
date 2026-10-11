'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const SwitchTimer=require('./source-switchtimer-devices.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const stage=(id,variant=0)=>{
 const found=data.stages.find(s=>s.stageId===id);
 assert.ok(found,'missing source stage '+id);
 const list=found.json.stageInitParamList[variant];
 assert.ok(list,'missing variant '+variant+' of '+id);
 return list.actorCreateParamList;
};
const named=(compiled,name)=>{const t=compiled.timers.find(x=>x.name===name);assert.ok(t,'missing '+name);return t;};
const live=(state,name)=>{const t=state.timers.find(x=>x.name===name);assert.ok(t,'missing '+name);return t;};
// Deep copy a real source actor so a synthetic probe never mutates the dataset.
const copy=actor=>JSON.parse(JSON.stringify(actor));
// The port ages m_Sec as a float, so a countdown lands inside the native FP
// epsilon of zero instead of on exact raw 0; see the module header.
const atZero=sec=>assert.ok(Math.abs(sec)<SwitchTimer.nativeConstants.fpEpsilon,'expected a spent timer, got '+sec);
const only=(actors,name)=>copy(actors.find(a=>a.typeName==='SwitchTimer'&&(a.name||'')===name));

test('st_w_04_03 SwitchTimers exist only at seven and eight players',()=>{
 const actors=stage('st_w_04_03');
 const source=actors.filter(a=>a.typeName==='SwitchTimer');
 assert.equal(source.length,2);
 for(const a of source)assert.equal(a.playerCount,7);
 for(let count=2;count<=6;count++)assert.deepEqual(SwitchTimer.compile(actors,count).timers,[]);
 for(const count of [7,8]){
  const compiled=SwitchTimer.compile(actors,count);
  assert.equal(compiled.timers.length,2);
  assert.deepEqual(compiled.warnings,[]);
 }
});

test('st_w_04_03 slots decode to the native TimerComponent fields',()=>{
 const compiled=SwitchTimer.compile(stage('st_w_04_03'),7);
 for(const [name,target] of [['SwitchTimer1','Bridge1'],['SwitchTimer2','Bridge2']]){
  const timer=named(compiled,name);
  // datas 0=3.5 1=0 2=0 3=1200 4=1 5=<target> 13=1 14=1 at actor position (0,0).
  assert.equal(timer.sec,3.5);
  assert.equal(timer.targetName,target);
  assert.equal(timer.timeUpTypeName,'Switch');
  assert.equal(timer.timerTypeName,'TimeDown');
  assert.equal(timer.hidden,true);   // datas[13] -> m_Flags bit0
  assert.equal(timer.muteTick,true); // datas[14] -> m_Flags bit1
  assert.equal(timer.uiScale,SwitchTimer.nativeConstants.uiBaseScale); // datas[4] 1 * 10
  assert.deepEqual(timer.uiPos,{x:0,y:SwitchTimer.nativeConstants.uiPosY+1200});
  assert.deepEqual(timer.anchor,{x:0,y:0});
 }
 // Both are hidden, so the port must offer no readout for this stage.
 assert.deepEqual(SwitchTimer.displays(SwitchTimer.create(compiled)),[]);
});

test('a SwitchTimer never contributes collision',()=>{
 const state=SwitchTimer.create(SwitchTimer.compile(stage('st_w_04_03'),8));
 assert.deepEqual(SwitchTimer.solids(state),[]);
 assert.deepEqual(SwitchTimer.beforeStep(state,{dt:1/60}).solids,[]);
});

test('st_w_04_03 fires event 61 at its targets after exactly 3.5 native seconds',()=>{
 const compiled=SwitchTimer.compile(stage('st_w_04_03'),7);
 const state=SwitchTimer.create(compiled);
 const emitted=[];
 for(let tick=1;tick<=209;tick++){
  const result=SwitchTimer.beforeStep(state,{dt:1/60});
  assert.deepEqual(result.events,[],'early event at tick '+tick);
  assert.deepEqual(result.sounds,[],'muted timers must stay silent');
  emitted.push(...result.events);
 }
 assert.equal(live(state,'SwitchTimer1').firedTimeUp,false);
 const fired=SwitchTimer.beforeStep(state,{dt:1/60});
 assert.equal(fired.events.length,2);
 assert.deepEqual(fired.events.map(e=>e.targetName).sort(),['Bridge1','Bridge2']);
 for(const event of fired.events){
  assert.equal(event.eventType,SwitchTimer.nativeConstants.eventOn);
  // Both spellings so every sibling module's signal() can read the event.
  assert.equal(event.event,SwitchTimer.nativeConstants.eventOn);
  assert.equal(event.target,event.targetName);
  assert.equal(event.on,true);
  // QEventParamManager.Get zeroes the param, so the payload is 0.
  assert.equal(event.timerAddSecond,0);
 }
 for(const timer of state.timers){assert.equal(timer.firedTimeUp,true);atZero(timer.sec);}
 // m_Flags bit3 keeps the event one-shot forever after.
 for(let tick=0;tick<120;tick++)assert.deepEqual(SwitchTimer.beforeStep(state,{dt:1/60}).events,[]);
});

test('the Bridge target names in st_w_04_03 name real Bridge actors',()=>{
 const actors=stage('st_w_04_03');
 const bridges=actors.filter(a=>a.typeName==='Bridge').map(a=>a.name);
 for(const timer of SwitchTimer.compile(actors,7).timers)assert.ok(bridges.includes(timer.targetName),'no Bridge named '+timer.targetName);
});

test('st_b_01_09 decodes the fractional UI scale and audible per-second ticks',()=>{
 const timer=named(SwitchTimer.compile(stage('st_b_01_09'),8),'SwitchTimer1');
 // datas 0=30 3=32 4=0.6 5=RallyJudge1 13=0 14=0
 assert.equal(timer.sec,30);
 assert.equal(timer.targetName,'RallyJudge1');
 assert.equal(timer.hidden,false);
 assert.equal(timer.muteTick,false);
 assert.equal(Math.abs(timer.uiScale-6)<1e-9,true);
 assert.deepEqual(timer.uiPos,{x:0,y:448});
 const state=SwitchTimer.create({schemaVersion:1,count:8,timers:[timer],warnings:[]});
 const display=SwitchTimer.displays(state)[0];
 assert.deepEqual([display.minutes,display.seconds],[0,30]);
 assert.equal(display.warning,false);
 const sounds=[];let events=[];
 for(let tick=0;tick<30*60+5;tick++){
  const result=SwitchTimer.beforeStep(state,{dt:1/60});
  sounds.push(...result.sounds);events=events.concat(result.events);
 }
 // WARNING_SECOND gates the Se, so only the last ten seconds speak, and the
 // 0x28f bias puts every beep ~0.01 s after the round number: the crossing that
 // would be labelled 9 happens at 10.01 s left and is swallowed by the gate.
 assert.deepEqual(sounds.map(s=>s.boundary),[8,7,6,5,4,3,2,1,0,-1]);
 for(const sound of sounds)assert.ok(Math.abs(sound.remaining-(sound.boundary+1+655/65536))<1/60,'beep off a biased second boundary: '+sound.remaining);
 assert.equal(sounds.every(s=>s.seId===SwitchTimer.nativeConstants.tickSeId),true);
 assert.deepEqual(events.map(e=>e.targetName),['RallyJudge1']);
});

test('st_b_01_03 keeps an unnamed timer and the default UI anchor',()=>{
 const compiled=SwitchTimer.compile(stage('st_b_01_03'),4);
 assert.equal(compiled.timers.length,1);
 const timer=compiled.timers[0];
 assert.equal(timer.name,'');
 assert.equal(timer.sec,14);
 assert.equal(timer.targetName,'HeightJudge1');
 assert.deepEqual(timer.uiPos,{x:0,y:SwitchTimer.nativeConstants.uiPosY});
 assert.deepEqual(compiled.warnings,[]);
 // An unnamed timer cannot be addressed: FindActor rejects the empty name.
 const state=SwitchTimer.create(compiled);
 assert.equal(SwitchTimer.signal(state,{targetName:'',eventType:61}),false);
 assert.equal(state.timers[0].stopped,false);
});

test('every shipped SwitchTimer compiles for all eight populations',()=>{
 const stages=data.stages.filter(s=>s.json.stageInitParamList.some(p=>p.actorCreateParamList.some(a=>a.typeName==='SwitchTimer')));
 assert.deepEqual(stages.map(s=>s.stageId).sort(),['st_b_01_02','st_b_01_03','st_b_01_08','st_b_01_09','st_w_04_03']);
 let seen=0;
 for(const found of stages)for(let variant=0;variant<found.json.stageInitParamList.length;variant++){
  const actors=found.json.stageInitParamList[variant].actorCreateParamList;
  if(!actors.some(a=>a.typeName==='SwitchTimer'))continue;
  for(let count=2;count<=8;count++){
   const compiled=SwitchTimer.compile(actors,count);
   assert.deepEqual(compiled.warnings,[],found.stageId+' variant '+variant);
   for(const timer of compiled.timers){
    assert.equal(timer.timerTypeName,'TimeDown');
    assert.equal(timer.timeUpTypeName,'Switch');
    assert.ok(timer.sec>0);
    assert.ok(timer.targetName.length>0);
    seen++;
   }
  }
 }
 assert.ok(seen>0);
});

test('OnRecvEvent 61 with no payload stops the countdown and 60 resumes it',()=>{
 const state=SwitchTimer.create(SwitchTimer.compile(stage('st_w_04_03'),7));
 const timer=live(state,'SwitchTimer1');
 for(let tick=0;tick<60;tick++)SwitchTimer.beforeStep(state,{dt:1/60});
 const held=timer.sec;
 assert.ok(Math.abs(held-2.5)<1e-9);
 assert.equal(SwitchTimer.afterStep(state,{events:[{targetName:'SwitchTimer1',eventType:61}]}).events.length,0);
 assert.equal(timer.stopped,true);
 // The untouched twin keeps counting and fires once; the stopped one is frozen.
 let twin=[];
 for(let tick=0;tick<600;tick++)twin=twin.concat(SwitchTimer.beforeStep(state,{dt:1/60}).events);
 assert.deepEqual(twin.map(e=>e.targetName),['Bridge2']);
 assert.equal(timer.sec,held);
 assert.equal(timer.firedTimeUp,false);
 assert.equal(live(state,'SwitchTimer2').firedTimeUp,true);
 SwitchTimer.afterStep(state,{events:[{targetName:'SwitchTimer1',eventType:60}]});
 assert.equal(timer.stopped,false);
 let events=[];
 for(let tick=0;tick<151;tick++)events=events.concat(SwitchTimer.beforeStep(state,{dt:1/60}).events);
 assert.deepEqual(events.map(e=>e.targetName),['Bridge1']);
});

test('OnRecvEvent 61 with a payload adds time rounded up to a whole second',()=>{
 const state=SwitchTimer.create(SwitchTimer.compile(stage('st_w_04_03'),7));
 const timer=live(state,'SwitchTimer1');
 // 3.5 + 2 = 5.5 -> ceil to 6 (and the spare fraction is lost, as in native).
 SwitchTimer.signal(state,{targetName:'SwitchTimer1',eventType:61,timerAddSecond:2});
 assert.equal(timer.sec,6);
 assert.equal(timer.stopped,false);
 assert.equal(timer.beat,true);
 // An exact whole second is left alone by `test ax,ax`.
 SwitchTimer.signal(state,{targetName:'SwitchTimer1',eventType:61,timerAddSecond:4});
 assert.equal(timer.sec,10);
});

test('a fired timer ignores event 61 but still answers event 60',()=>{
 const state=SwitchTimer.create(SwitchTimer.compile(stage('st_w_04_03'),7));
 const timer=live(state,'SwitchTimer1');
 for(let tick=0;tick<210;tick++)SwitchTimer.beforeStep(state,{dt:1/60});
 assert.equal(timer.firedTimeUp,true);
 SwitchTimer.signal(state,{targetName:'SwitchTimer1',eventType:61,timerAddSecond:5});
 atZero(timer.sec);
 assert.equal(timer.stopped,false);
 timer.stopped=true;
 SwitchTimer.signal(state,{targetName:'SwitchTimer1',eventType:60});
 assert.equal(timer.stopped,false);
 // Event 47 is swallowed by a log call and changes nothing.
 SwitchTimer.signal(state,{targetName:'SwitchTimer1',eventType:0x2f});
 atZero(timer.sec);
});

test('the player-count duration table replaces the base duration when populated',()=>{
 // Synthetic probe: no shipped SwitchTimer populates datas[1] or datas[6..12],
 // so this only pins the decoder against ParseParameter, not against the game.
 const base=only(stage('st_w_04_03'),'SwitchTimer1');
 base.playerCount=0;
 const table=copy(base);
 table.datas[8]={t:1,f:9,s:null};   // index 6 + (count-2) -> count 4
 table.datas[12]={t:1,f:12,s:null}; // count 8
 assert.equal(SwitchTimer.compile([table],3).timers[0].sec,3.5);
 assert.equal(SwitchTimer.compile([table],4).timers[0].sec,9);
 assert.equal(SwitchTimer.compile([table],8).timers[0].sec,12);
 // datas[1] scales the base by the population before the table is consulted.
 const scaled=copy(base);
 scaled.datas[1]={t:1,f:0.5,s:null};
 assert.equal(SwitchTimer.compile([scaled],4).timers[0].sec,5.5);
 assert.equal(SwitchTimer.compile([scaled],8).timers[0].sec,7.5);
 // A non-float slot contributes nothing, exactly like the native `cmp ..,1`.
 const stringy=copy(base);
 stringy.datas[9]={t:2,f:0,s:'nonsense'};
 assert.equal(SwitchTimer.compile([stringy],5).timers[0].sec,3.5);
});

test('the flag slots are floored before the zero test',()=>{
 const base=only(stage('st_w_04_03'),'SwitchTimer1');
 base.playerCount=0;
 const soft=copy(base);
 soft.datas[13]={t:1,f:0.5,s:null};
 soft.datas[14]={t:1,f:0.5,s:null};
 const timer=SwitchTimer.compile([soft],4).timers[0];
 assert.equal(timer.hidden,false);
 assert.equal(timer.muteTick,false);
});

test('compile rejects what the original would need native timing or another type for',()=>{
 const base=only(stage('st_w_04_03'),'SwitchTimer1');
 base.playerCount=0;
 const deferred=copy(base);deferred.createThreshold=1;
 assert.throws(()=>SwitchTimer.compile([deferred],7),/Deferred SwitchTimer creation/);
 const wrongType=copy(base);wrongType.type=10;
 assert.throws(()=>SwitchTimer.compile([wrongType],7),/type 37/);
 assert.throws(()=>SwitchTimer.compile(stage('st_w_04_03'),9),/2\.\.8/);
 assert.throws(()=>SwitchTimer.beforeStep(SwitchTimer.create(SwitchTimer.compile([],4)),{dt:-1}),/Invalid SwitchTimer delta/);
});

test('an empty target name is reported instead of silently dropped',()=>{
 const base=only(stage('st_w_04_03'),'SwitchTimer1');
 base.playerCount=0;
 base.datas[5]={t:0,f:0,s:null};
 const compiled=SwitchTimer.compile([base],7);
 assert.equal(compiled.warnings.length,1);
 assert.match(compiled.warnings[0],/no target name/);
 const state=SwitchTimer.create(compiled);
 let events=[];
 for(let tick=0;tick<240;tick++)events=events.concat(SwitchTimer.beforeStep(state,{dt:1/60}).events);
 assert.deepEqual(events,[]);
 assert.equal(state.timers[0].firedTimeUp,true);
});

test('slots the original never reads for actor type 37 are reported',()=>{
 const base=only(stage('st_w_04_03'),'SwitchTimer1');
 base.playerCount=0;
 base.datas[16]={t:2,f:0,s:'DeadTimer-only packed table'};
 const compiled=SwitchTimer.compile([base],7);
 assert.equal(compiled.warnings.length,1);
 assert.match(compiled.warnings[0],/slot 16 is unread/);
});

// ---------------------------------------------------------------------------
// DeadTimer. Ten world stages author one. st_w_05_02's reads 10 s from datas[0]
// but the per-population override table (datas[6..12]) raises it to 15 s for
// every count, and the shipped bonus table is A=5 ('&'), C=2 ('#'), B=10 ('+').
// ---------------------------------------------------------------------------
const deadActors=()=>stage('st_w_05_02').filter(a=>a.typeName==='DeadTimer');

test('DeadTimer parses as TimerTimeUpType.Dead and never becomes a solid',()=>{
 const actors=deadActors();
 assert.equal(actors.length,1);
 const compiled=SwitchTimer.compile(actors,4);
 const t=named(compiled,'DeadTimer1');
 // ParseParameter 0x18172dd1b writes word 0x102 for actor type 0x0a: low byte
 // m_TimeUpType = Dead(2), high byte m_Type = TimeDown(1).
 assert.equal(t.actorType,10);
 assert.equal(t.timeUpType,2);
 assert.equal(t.timeUpTypeName,'Dead');
 assert.equal(t.timerTypeName,'TimeDown');
 // datas[0] is 10 but the population override wins for every count.
 for(let count=2;count<=8;count++)assert.equal(named(SwitchTimer.compile(actors,count),'DeadTimer1').sec,15);
 // TimerComponent has no InitCollision and no OnCollided.
 assert.deepEqual(SwitchTimer.solids(SwitchTimer.create(compiled)),[]);
});

test('DeadTimer time-up broadcasts Dead to every player, ignoring m_TargetName',()=>{
 const compiled=SwitchTimer.compile(deadActors(),4);
 assert.equal(named(compiled,'DeadTimer1').targetName,'','a Dead time-up needs no target');
 const state=SwitchTimer.create(compiled);
 const players=[{id:'p1'},{id:'p2'},{id:'p3'},{id:'p4'}];
 const step=()=>SwitchTimer.beforeStep(state,{dt:1/60,players});
 let fired=null,ticks=0;
 for(;ticks<60*20&&!fired;ticks++){const r=step();if(r.deadPlayerIds.length)fired=r;}
 assert.equal(ticks,900,'fifteen seconds at sixty ticks');
 // onTimeUp 0x18172e132 uses the param-only Frame.NotifyEvent 0x181749790,
 // which walks the whole actor list; m_TargetName is never consulted.
 assert.deepEqual(fired.deadPlayerIds,['p1','p2','p3','p4']);
 const dead=fired.events.find(e=>e.event===SwitchTimer.nativeConstants.eventDead);
 assert.ok(dead&&dead.broadcast===true,'a broadcast Dead event must be emitted');
 assert.equal(dead.causeDead,0,'QEventParamManager.Get zeroes the param, so CauseDead is Contact');
 // 0x18172e1cf clears StageComponent m_Flags bit9 and 0x18172e1ee starts the
 // TimeUp notice with the Move animation.
 assert.deepEqual(fired.stageFlags.map(f=>f.enableOpenWindow),[false]);
 assert.deepEqual(fired.notices.map(n=>[n.typeName,n.animName,n.isWait]),[['TimeUp','Move',false]]);
 // 0x18172e03a sets m_Flags bit3 so the time-up happens once per stage.
 let again=0;
 for(let i=0;i<120;i++)again+=step().deadPlayerIds.length;
 assert.equal(again,0,'the time-up must not repeat');
});

test('an immortal player survives the DeadTimer broadcast',()=>{
 const state=SwitchTimer.create(SwitchTimer.compile(deadActors(),4));
 // PlayerComponent.OnRecvEvent 0x1816c1758 returns early when CauseDead is not
 // Fall and IsImmortal 0x1816bcd20 is set. The param is zeroed, so CauseDead is
 // Contact and the immortal test applies.
 const players=[{id:'p1'},{id:'p2',immortal:true},{id:'p3'},{id:'p4'}];
 let fired=null;
 for(let i=0;i<60*20&&!fired;i++){const r=SwitchTimer.beforeStep(state,{dt:1/60,players});if(r.deadPlayerIds.length)fired=r;}
 assert.deepEqual(fired.deadPlayerIds,['p1','p3','p4']);
});

test('the game over bonus starts at A failures, adds C each and caps at B',()=>{
 // datas[16]='&'->A=5, datas[17]='#'->C=2, datas[18]='+'->B=10, each decoded as
 // (low byte - 0x21) per UTF-16 unit. 0x18172dbee..0x18172dc13 adds
 // min((n - A + 1) * C, B) after the population override, so the base is 15.
 const secFor=n=>named(SwitchTimer.compile(deadActors(),4,{gameOverCount:n}),'DeadTimer1').sec;
 for(const n of [0,1,2,3,4])assert.equal(secFor(n),15,'no bonus below five failures, n='+n);
 assert.equal(secFor(5),17);
 assert.equal(secFor(6),19);
 assert.equal(secFor(9),25);
 assert.equal(secFor(20),25,'the bonus is capped at B=10');
 const bonus=named(SwitchTimer.compile(deadActors(),4,{gameOverCount:6}),'DeadTimer1').bonus;
 assert.equal(bonus.fromGameOverCount,5);
 assert.equal(bonus.perGameOver,2);
 assert.equal(bonus.maxBonus,10);
 assert.equal(bonus.added,4);
});

test('the bonus block only runs when the mode selector is exactly 1',()=>{
 // 0x18172dadb compares floor(datas[15]) with 1; any other value skips the block.
 const off=JSON.parse(JSON.stringify(deadActors()));
 off[0].datas[15]={t:1,f:2};
 const skipped=named(SwitchTimer.compile(off,4,{gameOverCount:20}),'DeadTimer1');
 assert.equal(skipped.sec,15);
 assert.equal(skipped.bonus,null);
 assert.equal(named(SwitchTimer.compile(deadActors(),4,{gameOverCount:20}),'DeadTimer1').sec,25);
});

// B2 회귀: 스위치가 보내는 event 61 에 payload 가 실려야 한다. 빠지면 타이머는
// payload 0 을 "정지"로 읽어(OnRecvEvent 0x18172e35e) st_w_05_02 의 DeadTimer 가
// 첫 스위치에서 얼어붙는다. 값의 출처는 NormalSwitchComponent.ParseParameter
// 0x181888a15 가 읽는 datas[4] 로, 0x181888b80 이 m_TimerAddSecond(+0x20)에
// 그대로(sar 없이) 넣고 NotifyTarget 0x181714e02 가 이벤트에 싣는다.
test('a switch event without a payload must not be read as a stop',()=>{
 const actors=deadActors();
 const state=SwitchTimer.create(SwitchTimer.compile(actors,4));
 const t=live(state,'DeadTimer1');
 const run=n=>{for(let i=0;i<n;i++)SwitchTimer.beforeStep(state,{dt:1/60,players:[{id:'p1'}]});};
 run(60);
 const afterOneSecond=t.sec;
 assert.ok(afterOneSecond<15,'the timer must be counting down');
 // payload 를 실은 61 은 시간을 늘리고 멈추지 않는다.
 SwitchTimer.signal(state,{targetName:'DeadTimer1',eventType:61,event:61,on:true,timerAddSecond:2});
 assert.equal(t.stopped,false,'a payload-carrying switch must not stop the timer');
 assert.ok(t.sec>afterOneSecond,'the payload must extend the timer');
 const extended=t.sec;
 run(60);
 assert.ok(t.sec<extended,'the timer must keep running after the extension');
});

test('a payloadless event 61 still stops the timer, as the original does',()=>{
 // 같은 이벤트라도 payload 가 없으면 정지다. 이게 원작 동작이므로 유지한다 —
 // 버그는 "스위치가 payload 를 안 실었던 것"이지 이 분기가 아니었다.
 const state=SwitchTimer.create(SwitchTimer.compile(deadActors(),4));
 const t=live(state,'DeadTimer1');
 for(let i=0;i<60;i++)SwitchTimer.beforeStep(state,{dt:1/60,players:[{id:'p1'}]});
 SwitchTimer.signal(state,{targetName:'DeadTimer1',eventType:61,event:61,on:true});
 assert.equal(t.stopped,true);
 const frozen=t.sec;
 for(let i=0;i<60;i++)SwitchTimer.beforeStep(state,{dt:1/60,players:[{id:'p1'}]});
 assert.equal(t.sec,frozen,'a stopped timer must not advance');
 SwitchTimer.signal(state,{targetName:'DeadTimer1',eventType:60,event:60,on:false});
 assert.equal(t.stopped,false,'event 60 resumes it');
});
