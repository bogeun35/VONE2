'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const B=require('./source-blinkthunder-devices.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const stage=source.stages.find(s=>s.stageId==='st_w_04_04');
const variants=stage.json.stageInitParamList.map(p=>p.actorCreateParamList);
const clone=a=>JSON.parse(JSON.stringify(a));
const first=clone(variants[0].find(a=>a.typeName==='BlinkThunder'));
const withSlots=(slots,extra={})=>{const a=clone(first);for(const [i,v] of Object.entries(slots))a.datas[i]={t:1,f:v,s:null};return Object.assign(a,extra);};

test('st_w_04_04 source parameters map onto the native BlinkThunder fields',()=>{
 for(const actors of variants){
  const s=B.compile(actors,4);
  assert.equal(s.thunders.length,10);
  assert.deepEqual(s.thunders.map(t=>t.direction),[1,1,1,1,1,1,1,1,1,3]);
  assert.ok(s.thunders.every(t=>t.through===true&&t.shootBlock===false));
  assert.ok(s.thunders.every(t=>t.appearTime===3&&t.disappearTime===0.9));
  assert.ok(s.thunders.every(t=>t.appearAtStart===true&&t.visible===true));
  assert.ok(s.thunders.every(t=>t.appearRaw===196608&&t.disappearRaw===58982));
  assert.deepEqual(s.warnings,[]);
  assert.equal(s.completePhysicsFidelity,false);
 }
 // BlinkThunder12 carries playerCount -4, so it is dropped above four players.
 assert.deepEqual([2,3,4,5,6,7,8].map(c=>B.compile(variants[0],c).thunders.length),[10,10,10,9,9,9,9]);
});

test('OnStart picks the starting state and the matching duration',()=>{
 const on=B.compile([withSlots({5:1})],4).thunders[0];
 assert.deepEqual([on.visible,on.timerRaw],[true,196608]);
 const off=B.compile([withSlots({5:0})],4).thunders[0];
 assert.deepEqual([off.visible,off.timerRaw],[false,58982]);
});

test('blinkProc toggles only once the FP timer stops being positive',()=>{
 const s=B.create(B.compile([withSlots({})],4)),t=s.thunders[0],step=()=>B.beforeStep(s,{dt:1/60});
 // m_AppearTime 3 is raw 196608 and a 60 Hz DeltaTime is raw 1092, so the
 // remainder is still 48 after 180 updates and the flip lands on update 181.
 for(let i=0;i<180;i++)step();
 assert.deepEqual([t.visible,t.timerRaw,t.blinks],[true,48,0]);
 step();
 assert.deepEqual([t.visible,t.timerRaw,t.blinks],[false,58982,1]);
 for(let i=0;i<54;i++)step();
 assert.deepEqual([t.visible,t.timerRaw],[false,14]);
 step();
 assert.deepEqual([t.visible,t.timerRaw,t.blinks],[true,196608,2]);
 // One full cycle is 181 appeared plus 55 disappeared updates.
 let appeared=0;for(let i=0;i<236;i++){step();if(t.visible)appeared++;}
 assert.equal(appeared,181);
 assert.deepEqual([t.visible,t.timerRaw,t.blinks],[true,196608,4]);
});

test('beam rect follows the native direction table and stops at the map',()=>{
 const geometry={platforms:[],width:960,height:528};
 const rects=[0,1,2,3].map(direction=>{
  const s=B.create(B.compile([withSlots({0:direction})],4));
  B.beforeStep(s,{dt:1/60,...geometry});
  const b=B.hazards(s)[0];
  return [b.x,b.y,b.w,b.h];
 });
 // Emitter sits at (46,48); LASER_WIDTH 4 is centred, LASER_LEN caps at 2400.
 assert.deepEqual(rects,[
  [44,0,4,48],      // 0 up
  [44,48,4,480],    // 1 down
  [0,46,46,4],      // 2 left
  [46,46,914,4]     // 3 right
 ]);
 // Slot0 above three collapses to direction 0 (0x1817d27e6).
 const clamped=B.compile([withSlots({0:7})],4).thunders[0];
 assert.equal(clamped.direction,0);
});

test('the 32 px probe shortens the beam at the first map face only',()=>{
 const floor={x:0,y:240,w:960,h:48},aside={x:0,y:300,w:960,h:48};
 const s=B.create(B.compile([withSlots({0:1})],4));
 B.beforeStep(s,{dt:1/60,platforms:[floor,aside],width:960,height:528});
 assert.equal(s.thunders[0].length,192);
 // A platform outside the 32 px wide probe band is ignored.
 const off={x:200,y:100,w:48,h:48};
 const s2=B.create(B.compile([withSlots({0:1})],4));
 B.beforeStep(s2,{dt:1/60,platforms:[off],width:960,height:528});
 assert.equal(s2.thunders[0].length,480);
 // Through is set, so a non-map blocker never shortens the beam.
 const s3=B.create(B.compile([withSlots({0:1})],4));
 B.beforeStep(s3,{dt:1/60,platforms:[],blockers:[floor],width:960,height:528});
 assert.equal(s3.thunders[0].length,480);
 const s4=B.create(B.compile([withSlots({0:1,1:0})],4));
 B.beforeStep(s4,{dt:1/60,platforms:[],blockers:[floor],width:960,height:528});
 assert.equal(s4.thunders[0].length,192);
});

test('only an appeared BlinkThunder has a live collider',()=>{
 const s=B.create(B.compile([withSlots({0:1})],4));
 const geometry={platforms:[],width:960,height:528};
 const inBeam={id:'hit',x:30,y:200,w:32,h:46},clear={id:'safe',x:200,y:200,w:32,h:46};
 B.beforeStep(s,{dt:1/60,...geometry});
 assert.deepEqual(B.afterStep(s,{players:[inBeam,clear],...geometry}).deadPlayerIds,['hit']);
 for(let i=0;i<181;i++)B.beforeStep(s,{dt:1/60,...geometry});
 assert.equal(s.thunders[0].visible,false);
 assert.deepEqual(B.hazards(s),[]);
 assert.deepEqual(B.afterStep(s,{players:[inBeam,clear],...geometry}).deadPlayerIds,[]);
 // A cleared or dead player is not reported again.
 for(let i=0;i<55;i++)B.beforeStep(s,{dt:1/60,...geometry});
 assert.equal(s.thunders[0].visible,true);
 assert.deepEqual(B.afterStep(s,{players:[{...inBeam,exit:true}],...geometry}).deadPlayerIds,[]);
});

test('pretend pause event 0x35 freezes the blink timer',()=>{
 const s=B.create(B.compile([withSlots({})],4)),t=s.thunders[0];
 assert.equal(B.signal(s,{eventType:0x35,targetName:t.name,pause:true}),true);
 for(let i=0;i<400;i++)B.beforeStep(s,{dt:1/60});
 assert.deepEqual([t.visible,t.timerRaw,t.blinks],[true,196608,0]);
 B.signal(s,{eventType:0x35,targetName:t.name,pause:false});
 for(let i=0;i<181;i++)B.beforeStep(s,{dt:1/60});
 assert.equal(t.visible,false);
 assert.equal(B.signal(s,{eventType:61,targetName:t.name}),false);
});

test('only the shoot-block emitter contributes a solid body',()=>{
 assert.deepEqual(B.solids(B.create(B.compile(variants[0],4))),[]);
 const s=B.compile([withSlots({2:1})],4);
 assert.equal(s.warnings.length,1);
 assert.deepEqual(B.solids(B.create(s)),[{id:'source:a0:body',type:'BlinkThunderBody',x:30,y:32,w:32,h:32}]);
});

test('unverified BlinkThunder inputs fail closed instead of inventing a rule',()=>{
 assert.throws(()=>B.compile([withSlots({3:0})],4),/not verified/);
 assert.throws(()=>B.compile([withSlots({4:0})],4),/not verified/);
 assert.throws(()=>B.compile([withSlots({0:-1})],4),/not verified/);
 assert.throws(()=>B.compile([withSlots({},{createThreshold:1})],4),/not verified/);
 const s=B.create(B.compile([withSlots({})],4));
 assert.throws(()=>B.beforeStep(s,{dt:-1}),/Invalid blink thunder delta/);
 assert.throws(()=>B.beforeStep(s,{dt:1/70000}),/FP\(16\.16\) resolution/);
});

test('state is a plain serialisable snapshot and stepping is reproducible',()=>{
 const compiled=B.compile(variants[0],4),a=B.create(compiled),b=B.create(compiled);
 const geometry={platforms:[{x:0,y:480,w:960,h:48}],width:960,height:528};
 for(let i=0;i<500;i++){B.beforeStep(a,{dt:1/60,...geometry});B.beforeStep(b,{dt:1/60,...geometry});}
 assert.deepEqual(a,b);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),a);
 assert.notDeepEqual(a.thunders[0],compiled.thunders[0]);
});
