'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const mod=require('./source-movewall-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
const actors=(id,count)=>JSON.parse(JSON.stringify(pop.actorsForCount(pop.selectVariant(stages.find(s=>s.stageId===id).json.stageInitParamList,count,true),count)));
const state=(id='st_w_12_04',count=2)=>mod.create(mod.compile(actors(id,count),count,{nativeContactFacts:true}));
const adapter={isEnableMoveContactActor:q=>Math.abs(q.delta.xRaw)>=4,moveContactActor:()=>{}};
const tick=(s,ctx={})=>mod.beforeStep(s,{...adapter,...ctx});
const advance=(s,n)=>{for(let i=0;i<n;i++)tick(s);};
test('actual 12-4 population gates, slots and collision rectangles at every count',()=>{
 for(let count=2;count<=8;count++){const s=state('st_w_12_04',count),w=s.walls[0],sw=s.switches[0];
  assert.equal(s.walls.length,1);assert.equal(s.switches.length,1);assert.equal(w.name,count<=4?'MoveWall1':'MoveWall2');
  assert.equal(w.moveWidthRaw,-300*65536);assert.equal(w.triggerWidthRaw,(count<=4?-500:-230)*65536);
  assert.equal(w.heightRaw,200*65536);assert.deepEqual(mod.solids(s)[0],{id:w.id,type:'MoveWall',x:3880,y:89,w:16,h:198,layer:4});
  const trigger=mod.displays(s).walls[0].trigger;assert.equal(trigger.x,count<=4?3380:3650);assert.equal(trigger.w,count<=4?516:246);
  assert.equal(sw.xRaw,695*65536);assert.equal(sw.yRaw,432*65536);assert.equal(sw.speedScaleRaw,131072);assert.equal(sw.allPlayers,true);assert.equal(sw.direction,0);
 }
});
test('actual 2-4 wall and 12-3 speed values across selected variants',()=>{
 for(let count=2;count<=8;count++){const s=state('st_w_02_04',count);assert.equal(s.walls[0].moveWidthRaw,-500*65536);assert.equal(s.walls[0].triggerWidthRaw,-600*65536);assert.equal(s.walls[0].heightRaw,256*65536);
  const q=mod.compile(actors('st_w_12_03',count),count);assert.equal(q.switches.length,1);assert.equal(q.switches[0].speedScaleRaw,196608);assert.equal(q.switches[0].xRaw,3168*65536);assert.equal(q.switches[0].allPlayers,true);}
});
test('unavailable contact solver is refused at compile and before mutation',()=>{
 assert.throws(()=>mod.compile(actors('st_w_12_04',2),2),/verified native recursive contact adapter/);
 const s=state(),snapshot=JSON.stringify(s);assert.throws(()=>mod.beforeStep(s),/callbacks are required/);assert.equal(JSON.stringify(s),snapshot);
});
test('idle never moves and trigger ignores nonplayer and young timer',()=>{
 const s=state(),w=s.walls[0];advance(s,90);assert.equal(w.timerRaw,98280);mod.afterStep(s,{wallContacts:[{wallId:w.id,layer:1}]});assert.equal(w.state,0);
 tick(s);mod.afterStep(s,{wallContacts:[{wallId:w.id,layer:2}]});assert.equal(w.state,0);
 mod.afterStep(s,{wallContacts:[{wallId:w.id,layer:1}]});assert.equal(w.state,2);assert.equal(w.timerRaw,0);assert.equal(w.offsetXRaw,0);
});
test('outward strict overshoot, 91 return delay ticks and exact zero clamp',()=>{
 const s=state(),w=s.walls[0];advance(s,91);mod.afterStep(s,{wallContacts:[{wallId:w.id,layer:1}]});
 advance(s,150);assert.equal(w.offsetXRaw,-300*65536);assert.equal(w.state,2);tick(s);assert.equal(w.offsetXRaw,-302*65536);assert.equal(w.state,3);assert.equal(w.timerRaw,0);
 advance(s,90);assert.equal(w.offsetXRaw,-302*65536);tick(s);assert.equal(w.offsetXRaw,-300.5*65536);
 advance(s,200);assert.equal(w.offsetXRaw,-0.5*65536);tick(s);assert.equal(w.offsetXRaw,0);assert.equal(w.state,1);assert.equal(w.timerRaw,0);
 advance(s,90);assert.equal(w.state,1);tick(s);assert.equal(w.state,2);assert.equal(w.offsetXRaw,0);tick(s);assert.equal(w.offsetXRaw,-2*65536);
});
test('preflight blocks trapped player without kill and preserves advanced state',()=>{
 const s=state(),w=s.walls[0];w.state=2;w.offsetXRaw=-300*65536;let called=false;
 const out=tick(s,{isEnableMoveContactActor:()=>false,moveContactActor:()=>{called=true;}});
 assert.equal(w.offsetXRaw,-300*65536);assert.equal(w.state,3);assert.equal(w.timerRaw,0);assert.equal(w.blocked,true);assert.equal(called,false);assert.deepEqual(out.deadPlayerIds,[]);
});
test('native motion uses init position, recursive options and signed faces',()=>{
 const s=state(),w=s.walls[0];w.state=2;w.offsetXRaw=-20*65536;const a=[];
 tick(s,{moveContactActor:q=>a.push(q)});assert.equal(a[0].position.xRaw,(3888-22)*65536);assert.equal(a[0].delta.xRaw,-131072);assert.equal(a[0].face,2);assert.equal(a[0].options.isEnableRecursive,true);assert.equal(a[0].options.isEnableIgnoreTargetVelo,true);
 w.state=3;w.timerRaw=98304;tick(s,{moveContactActor:q=>a.push(q)});assert.equal(a[1].delta.xRaw,98304);assert.equal(a[1].face,3);
});
test('positive movement has the same strict overshoot and reverses face',()=>{
 const a=actors('st_w_12_04',2).filter(a=>a.typeName==='MoveWall');a[0].datas[0].f=4;
 const s=mod.create(mod.compile(a,2,{nativeContactFacts:true})),w=s.walls[0];w.state=2;assert.equal(tick(s).motions[0].face,3);tick(s);assert.equal(w.offsetXRaw,262144);assert.equal(w.state,2);tick(s);assert.equal(w.offsetXRaw,393216);assert.equal(w.state,3);
});
test('pushback resolved position and exactly one skipped update',()=>{
 const s=state(),w=s.walls[0];w.state=2;
 mod.afterStep(s,{wallPushBacks:[{wallId:w.id,positionXRaw:(3888-10)*65536,positionYRaw:288*65536}]});assert.equal(w.offsetXRaw,-655360);assert.equal(w.pushBackCount,1);
 tick(s);assert.equal(w.pushBackCount,2);assert.equal(w.offsetXRaw,-655360);tick(s);assert.equal(w.pushBackCount,0);assert.equal(w.offsetXRaw,-786432);
});
test('speed notification reads prior contacts, repeats while held, and never resets on release',()=>{
 const s=state('st_w_12_03'),sw=s.switches[0],contact={switchId:sw.id,actorId:'p1',layer:1,attributeFlags:3};
 assert.deepEqual(mod.beforeStep(s).events,[]);mod.afterStep(s,{switchContacts:[contact]});
 const e=mod.beforeStep(s).events;assert.deepEqual(e,[{senderId:sw.id,eventType:57,speedScaleRaw:196608,speedScale:3,broadcastActorType:27}]);
 mod.afterStep(s,{switchContacts:[contact]});assert.equal(mod.beforeStep(s).events.length,1);assert.deepEqual(mod.beforeStep(s).events,[]);
});
test('contacting player only mode and last accepted collision semantics',()=>{
 const s=state('st_w_12_03'),sw=s.switches[0];sw.allPlayers=false;
 mod.afterStep(s,{switchContacts:[{switchId:sw.id,actorId:'p1',layer:1,attributeFlags:3},{switchId:sw.id,actorId:'box',layer:2,attributeFlags:3}]});assert.deepEqual(mod.beforeStep(s).events,[]);
 mod.afterStep(s,{switchContacts:[{switchId:sw.id,actorId:'p2',layer:1,attributeFlags:3}]});assert.equal(mod.beforeStep(s).events[0].targetId,'p2');
 for(const c of [{layer:1,attributeFlags:1},{layer:4,attributeFlags:3}]){mod.afterStep(s,{switchContacts:[{switchId:sw.id,actorId:'p1',...c}]});assert.deepEqual(mod.beforeStep(s).events,[]);}
});
test('reset47 suppresses pending boost and collisions for two update phases',()=>{
 const s=state('st_w_12_03'),sw=s.switches[0],c={switchId:sw.id,actorId:'p1',layer:1,attributeFlags:3};
 mod.afterStep(s,{switchContacts:[c]});assert.equal(mod.signal(s,{targetId:sw.id,eventType:47}),true);
 mod.afterStep(s,{switchContacts:[c]});assert.deepEqual(mod.beforeStep(s).events,[]);
 mod.afterStep(s,{switchContacts:[c]});assert.deepEqual(mod.beforeStep(s).events,[]);
 mod.afterStep(s,{switchContacts:[c]});assert.equal(mod.beforeStep(s).events.length,1);
});
function encode(values){return values.map(v=>{let n=BigInt.asUintN(64,BigInt(v)),s='';for(let i=0;i<8;i++){s+=String.fromCharCode(Number(n&255n)+33);n>>=8n;}return s;}).join('');}
test('paired population offset chooses a pair rather than independent fallback',()=>{
 const xs=[65536,0,0,-131072,0,0,0],ys=[0,196608,0,0,0,0,0];assert.deepEqual(mod.table({t:2,s:encode(xs)}),xs);
 assert.deepEqual(mod.pairedOffset(xs,ys,4),{xRaw:0,yRaw:196608});assert.deepEqual(mod.pairedOffset(xs,ys,8),{xRaw:-131072,yRaw:0});
 const a=actors('st_w_12_03',2).filter(a=>a.typeName==='SpeedSwitch');a[0].datas[3]={t:2,s:encode(xs)};a[0].datas[4]={t:2,s:encode(ys)};
 const sw=mod.compile(a,4).switches[0];assert.equal(sw.xRaw,3168*65536);assert.equal(sw.yRaw,435*65536);
});
test('default parameters, sub-epsilon values, malformed inputs',()=>{
 const a=actors('st_w_12_04',2).filter(a=>a.typeName==='MoveWall');for(let i=0;i<3;i++)a[0].datas[i].f=3/65536;
 const w=mod.compile(a,2,{nativeContactFacts:true}).walls[0];assert.equal(w.moveWidthRaw,3276800);assert.equal(w.triggerWidthRaw,3276800);assert.equal(w.heightRaw,17039360);
 a[0].datas[0].f=-4/65536;assert.equal(mod.compile(a,2,{nativeContactFacts:true}).walls[0].moveWidthRaw,-4);
 assert.throws(()=>mod.table({t:2,s:'!'}),/56 units/);assert.throws(()=>mod.compile([],1),/2 through 8/);assert.throws(()=>tick(state(),{dt:-1}),/Invalid device delta/);
 assert.throws(()=>mod.compile([],2,{topView:true}),/top-view/);
});
test('JSON round trip preserves contact, timer and future transitions exactly',()=>{
 const a=state(),w=a.walls[0];w.state=2;advance(a,22);mod.afterStep(a,{switchContacts:[{switchId:a.switches[0].id,actorId:'p1',layer:1,attributeFlags:3}]});
 const b=JSON.parse(JSON.stringify(a));for(let i=0;i<200;i++){assert.deepEqual(tick(a),tick(b));assert.deepEqual(a,b);}
});
