'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const B=require('./source-bridge-devices.js'),D=require('./source-devices-runtime.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'))),actors=source.stages.find(s=>s.stageId==='st_w_04_01').json.stageInitParamList[0].actorCreateParamList;
test('04-01 preserves source 2..8 population variants and native parameters',()=>{for(let count=2;count<=8;count++){const s=B.compile(actors,count);assert.equal(s.thunders.length,Math.max(1,count-4));assert.equal(s.bridges.length,s.thunders.length);assert.deepEqual(s.keyTargets,['Thunder1']);assert.deepEqual([s.bridges[0].w,s.bridges[0].h,s.bridges[0].target.h],[32,32,160]);assert.equal(s.thunders[0].vy,.3);assert.equal(s.thunders[0].phase,0);assert.equal(s.thunders[0].direction,3);}});
test('key activates bridge extension and Thunder1 once; native movement clamps at280',()=>{const s=B.create(B.compile(actors,8));for(let i=0;i<60;i++)B.beforeStep(s);assert.equal(s.thunders[0].y,20);assert.equal(s.bridges[0].h,32);let events=[];for(let i=0;i<128;i++)events.push(...B.beforeStep(s,{keyTaken:true}).events);assert.deepEqual(events,[{targetName:'Thunder1',eventType:61}]);assert.equal(s.bridges[0].h,160);assert.equal(s.bridges[0].phase,3);assert.ok(Math.abs(s.thunders[0].y-58.4)<1e-8);assert.equal(s.thunders[1].y,20);for(let i=0;i<900;i++)B.beforeStep(s,{keyTaken:true});assert.ok(Math.abs(s.thunders[0].y-300)<1e-8);assert.equal(s.thunders[0].phase,0);B.signal(s,{target:'Bridge1',event:60});for(let i=0;i<256;i++)B.beforeStep(s);assert.equal(s.bridges[0].h,32);});
test('source CollisionSwitch starts only its named Thunder for extra players',()=>{const s=B.create(B.compile(actors,8)),triggers=D.create(D.compile(actors.filter(a=>a.typeName==='CollisionSwitch'),8));let events=[];for(let i=0;i<3;i++)events.push(...D.afterStep(triggers,{players:[{id:'p',x:1376,y:44,w:32,h:46}]}).events);assert.equal(events.length,3);for(const e of events)B.signal(s,e);B.beforeStep(s);assert.equal(s.thunders[0].y,20);for(const t of s.thunders.slice(1))assert.equal(t.y,20.3);});
test('electric beam is four pixels thick and stops at protecting geometry',()=>{const s=B.create(B.compile(actors,2)),t=s.thunders[0];const wall={x:1200,y:0,w:32,h:100};const beam=B.hazards(s,{platforms:[wall],width:1600,height:480})[0];assert.deepEqual([beam.x,beam.y,beam.w,beam.h],[1008,18,192,4]);const before={id:'danger',x:1150,y:20,w:20,h:20},behind={id:'protected',x:1240,y:20,w:20,h:20},above={id:'above',x:1150,y:0,w:20,h:18};assert.deepEqual(B.afterStep(s,{players:[before,behind,above],platforms:[wall],width:1600,height:480}).deadPlayerIds,['danger']);});
test('bridge expansion waits at blocking player then resumes safely',()=>{const s=B.create(B.compile(actors,2)),b=s.bridges[0],p={id:'p',x:b.x,y:b.y+32,w:32,h:46};B.beforeStep(s,{players:[p],keyTaken:true});assert.equal(b.h,32);assert.equal(b.blocked,true);B.beforeStep(s);assert.equal(b.h,33);assert.equal(b.blocked,false);});
test('unverified timing variants fail closed instead of inventing a rule',()=>{const a=JSON.parse(JSON.stringify(actors.find(a=>a.typeName==='Thunder')));a.datas[7].f=1;assert.throws(()=>B.compile([a],2),/not verified/);});

// st_w_11_04's two Thunders are the only actors in the game that use slot8:
// slots[0..8] = [3,1,0,0,0,0,0,0,20], i.e. a stationary right-facing beam that
// stops killing 20 seconds in and then fades. Evidence: m_DisappearTime stored at
// 0x18172c826, aged by OnUpdate 0x18172c9c2, phase 4 handler 0x18172cd0c calls
// SetCollisionActive(false) immediately, phase 5 handler 0x18172cf41 fades with
// SPEED = QFP._4 = 4 from ThunderComponent..cctor 0x18172d260.
test('slot8 retires the beam on the native schedule and it stops killing at once',()=>{
 const a=JSON.parse(JSON.stringify(actors.find(a=>a.typeName==='Thunder')));
 for(let i=0;i<=8;i++)a.datas[i]={t:1,f:[3,1,0,0,0,0,0,0,20][i]};
 const compiled=B.compile([a],2),state=B.create(compiled);
 const thunder=state.thunders[0];
 assert.equal(thunder.disappearTime,20);
 assert.equal(thunder.lethal,true);
 const step=(seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)B.beforeStep(state,{dt:1/60,nativeTickRate:60,players:[]});};
 step(19.5);
 assert.equal(thunder.lethal,true,'the beam must still kill before its time');
 assert.ok(B.hazards(state,{}).every(b=>b.lethal!==false));
 step(0.6); // just past the 20 second mark, 0.1s into the quarter-second fade
 assert.equal(thunder.lethal,false,'collision goes inactive the moment the timer expires');
 assert.equal(thunder.phase,5);
 assert.ok(B.hazards(state,{}).every(b=>b.lethal===false));
 // A retired beam must not kill, even while it is still fading on screen.
 const beam=B.hazards(state,{})[0];
 const victim={id:'p1',x:beam.x+1,y:beam.y,w:32,h:46};
 assert.deepEqual(B.afterStep(state,{players:[victim]}).deadPlayerIds,[]);
 assert.ok(thunder.alpha>0&&thunder.alpha<=1,'the fade is still running');
 step(0.25);
 assert.equal(thunder.phase,6,'the actor ends after the quarter-second fade');
 assert.equal(thunder.alpha,0);
});
test('a switch signal cannot revive a retired Thunder',()=>{
 const a=JSON.parse(JSON.stringify(actors.find(a=>a.typeName==='Thunder')));
 for(let i=0;i<=8;i++)a.datas[i]={t:1,f:[3,1,0,0,0,0,0,0,1][i]};
 const state=B.create(B.compile([a],2)),thunder=state.thunders[0];
 for(let i=0;i<70;i++)B.beforeStep(state,{dt:1/60,nativeTickRate:60,players:[]});
 assert.equal(thunder.lethal,false);
 const phase=thunder.phase;
 B.signal(state,{targetName:thunder.name,eventType:61,on:true});
 assert.equal(thunder.phase,phase,'a retired Thunder ignores its switch');
 assert.equal(thunder.lethal,false);
});

// datas[4] head start, BridgeComponent.ParseParameter 0x1817dd7df..0x1817dd89a.
// st_w_07_03's only Bridge: 20 segments of 20px leftward from (1856,432), datas[4]=14.
const headStartBridge=()=>({typeName:'Bridge',name:'Bridge',posX:1856,posY:432,playerCount:0,
 datas:[20,-1,0,20,14].map(f=>({t:1,f,s:null}))});
test('a Bridge with datas[4] starts the round already extended, more so for a small party',()=>{
 const expected={2:160,3:120,4:100,5:80,6:40,7:20,8:0};
 for(let count=2;count<=8;count++){
  const b=B.compile([headStartBridge()],count).bridges[0];
  assert.equal(b.headStart,expected[count],count+' players');
  // Negative direction: the head start grows the rect leftward off the anchor.
  assert.deepEqual([b.x,b.w],[1856-expected[count],20+expected[count]]);
  // init and target are untouched, so a retract still returns to one unit.
  assert.deepEqual([b.init.x,b.init.w],[1856,20]);
  assert.deepEqual([b.target.x,b.target.w],[1476,400]);
 }
});
test('the head start floors in fixed point, so 70*0.1 is 6 segments and not 7',()=>{
 // (8-3)*14 = 70. 0x1999/65536 is 0.09999084, so 70 scales to 6.99936.
 assert.equal(B.compile([headStartBridge()],3).bridges[0].headStart,6*20);
});
test('datas[4] <= 0 leaves the bridge at one unit',()=>{
 for(const f of [0,-14]){
  const a=headStartBridge();a.datas[4]={t:1,f,s:null};
  for(let count=2;count<=8;count++){
   const b=B.compile([a],count).bridges[0];
   assert.equal(b.headStart,0);
   assert.deepEqual([b.x,b.w],[1856,20]);
  }
 }
});
test('a head start longer than the bridge is rejected rather than clamped',()=>{
 const a=headStartBridge();a.datas[0]={t:1,f:3,s:null};
 assert.throws(()=>B.compile([a],2),/head start longer/);
});
test('an unverified push mode is still rejected',()=>{
 const a=headStartBridge();a.datas[5]={t:1,f:1,s:null};
 assert.throws(()=>B.compile([a],2),/Unverified Bridge/);
});
