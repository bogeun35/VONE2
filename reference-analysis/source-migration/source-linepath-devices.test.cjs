'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('./source-linepath-devices.js');
const stages=require('./installed-stage-decoded.local.json');
const pop=require('./population-rules.cjs');
const fs=require('node:fs'),crypto=require('node:crypto');
function actors(id,count){const stage=stages.stages.find(s=>s.stageId===id);assert.ok(stage, id+' extracted stage exists');return pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,count,true),count);}
function device(id,count,type){return actors(id,count).filter(a=>a.typeName===type);}
test('loader float32 multiply and signed truncate, including authored fractional obstacle',()=>{
 assert.equal(Math.fround(2.3335),2.3334999084472656);
 assert.equal(api.stageFpRaw(2.3335),152928);
 assert.equal(api.stageFpRaw(-0.2),-13107);
 assert.equal(api.fpFromFloatRaw(0.1),6553);
 assert.equal(api.fpFromFloatRaw(-0.1),-6553);
 assert.equal(api.fpFromFloatRaw(1/60),1092);
 assert.equal(api.stageFpRaw(1.23456789),80908);
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
test('03-02 compiles at2..8 with native segment lengths and inactive DamageRects',()=>{
 for(let c=2;c<=8;c++){
  const s=api.create(api.compile(actors('st_w_03_02',c),c));
  assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
  const d=s.devices.find(d=>d.type==='LinePathLift');
  assert.deepEqual(d.lengthsRaw,[1091997,409497,492155,341248,409497,395847,409497,458637,341248]);
  assert.equal(s.devices.filter(d=>d.collisionInactive).length,c===2?6:4);
  assert.deepEqual(api.solids(s)[0],{id:d.id,type:'LinePathLift',x:656-(c-2)*15,y:401,w:118+(c-2)*30,h:18,collisionType:13});
 }
 // indexes outside the sparse subset now read the full FPSqrt table
 assert.equal(api.nativeSqrtRaw(1),require('./source-distanceconstraint-math.js').sqrtRaw(1));
});
test('03-03 external start: event 61 with nobody aboard runs the 20px fake path and back',()=>{
 const s=api.create(api.compile(actors('st_w_03_03',2),2)),d=s.devices.find(d=>d.type==='LinePathLift');
 assert.equal(d.externalStart,true);assert.equal(d.moving,false);
 for(let i=0;i<30;i++)api.advanceLift(d,1092,0,true);
 assert.equal(d.moving,false,'riders alone never start an external-start lift');
 assert.equal(api.receiveEvent(d,61,0),true);
 assert.equal(d.fake,true);assert.deepEqual(d.fakePoints[0],{xRaw:0,yRaw:0});
 const len=Math.hypot(d.fakePoints[1].xRaw,d.fakePoints[1].yRaw)/65536;
 assert.ok(Math.abs(len-20)<0.01,'QFP._20 along the first segment: '+len);
 let ticks=0;while(d.moving&&ticks<2000){api.advanceLift(d,1092,0,true);ticks++;}
 assert.equal(d.moving,false);assert.equal(d.fake,false);assert.equal(d.reversed,false,'a fake trip does not reverse the lift');
 assert.ok(Math.abs(d.offsetRaw.xRaw)<=4&&Math.abs(d.offsetRaw.yRaw)<=4,'back at the start');
 assert.equal(api.receiveEvent(d,60,0),false,'only event 61');
});
test('03-03 external start with a rider runs the whole path, then waits reversed for the next event',()=>{
 const s=api.create(api.compile(actors('st_w_03_03',2),2)),d=s.devices.find(d=>d.type==='LinePathLift');
 api.receiveEvent(d,61,1);assert.equal(d.fake,false);
 let ticks=0;while(d.moving&&ticks<20000){api.advanceLift(d,1092,1,true);ticks++;}
 const last=d.paths[d.paths.length-1];
 assert.equal(d.reversed,true);assert.equal(d.finished,false);assert.deepEqual(d.offsetRaw,last);
 assert.equal(api.receiveEvent(d,61,1),true);
 ticks=0;while(d.moving&&ticks<20000){api.advanceLift(d,1092,1,true);ticks++;}
 assert.equal(d.reversed,false);assert.deepEqual(d.offsetRaw,{xRaw:0,yRaw:0});
});
test('compile ignores actors excluded by population, preserves required interface and JSON state',()=>{
 const a={typeName:'LinePathLift',playerCount:4};
 const c=api.compile([a,{typeName:'Other',playerCount:0}],2,{}),s=api.create(c);
 assert.deepEqual(s,{schemaVersion:1,count:2,devices:[],completePhysicsFidelity:false});
 assert.deepEqual(api.solids(s),[]);assert.deepEqual(api.beforeStep(s,{}),{events:[],solids:[],carryCalls:[],activatedIds:[]});
 assert.deepEqual(api.afterStep(s,{}),{events:[],deadPlayerIds:[]});assert.deepEqual(api.displays(s),{devices:[]});
 assert.deepEqual(api.supportedTypes,['DamageRect','LinePathLift']);
});
test('FPSqrt sparse values agree with installed native resource bytes, without executing game',()=>{
 const bytes=fs.readFileSync('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets');
 const name=bytes.indexOf(Buffer.from('FPSqrt')),header=(name+6+3)&~3;
 assert.equal(name,11384396);assert.equal(bytes.readUInt32LE(name-4),6);
 const table=bytes.subarray(header+4,header+4+bytes.readUInt32LE(header));
 assert.equal(table.length,262148);
 assert.equal(crypto.createHash('sha256').update(table).digest('hex'),'de5265f651730f20b54cc24bdcd3047e61320be44a5ae54796d290a189f4bca5');
 // Segment800 stage pixels -> 800*1365 raw world units; native two-bit reduction.
 assert.equal(table.readInt32LE(17769*4),2183994);
 assert.equal(api.segmentLengthRaw({xRaw:0,yRaw:0},{xRaw:800*65536,yRaw:0},48),1091997);
});
test('real03-02 exact segment arrival ticks and final stopped state at every population',()=>{
 const expected=[
  [251,345,458,537,631,722,816,921,1000],
  [335,460,611,716,841,962,1087,1227,1332],
  [430,591,785,919,1080,1236,1397,1577,1711]];
 for(let c=2;c<=8;c++){
  let d=api.compile(actors('st_w_03_02',c),c).devices.find(d=>d.type==='LinePathLift');
  const arrival=[];
  for(let tick=1;tick<=1711&&!d.finished;tick++){
   const j=d.targetPathIndex;api.advanceLift(d,1092,c,true);
   if(j!==d.targetPathIndex||d.finished)arrival.push(tick);
   if(tick===100)d=JSON.parse(JSON.stringify(d));
  }
  assert.deepEqual(arrival,expected[Math.min(c-2,2)]);
  assert.deepEqual(d.offsetRaw,{xRaw:122945536,yRaw:-16384000});
  assert.equal(d.moving,false);assert.equal(d.finished,true);assert.equal(d.returnDirection,1);
  assert.equal(d.timerRaw,0);assert.equal(d.targetPathIndex,8);
 }
});
test('all riders start on separate tick; losing riders does not stop inertia; collision gate freezes distance',()=>{
 const d=api.compile(device('st_w_03_02',2,'LinePathLift'),2).devices[0];
 api.advanceLift(d,1092,1,true);assert.equal(d.needRideCount,1);assert.equal(d.moving,false);
 api.advanceLift(d,1092,2,true);assert.equal(d.moving,true);assert.deepEqual(d.offsetRaw,{xRaw:0,yRaw:0});
 api.advanceLift(d,1092,0,false);assert.equal(d.timerRaw,0);
 api.advanceLift(d,1092,0,true);assert.equal(d.timerRaw,4368);assert.deepEqual(d.offsetRaw,{xRaw:209600,yRaw:0});
});
test('carry interface moves only vertical contacts; negative segment probes native up vector',()=>{
 const s=api.create(api.compile(device('st_w_03_02',2,'LinePathLift'),2)),d=s.devices[0],calls=[];
 const ctx={getRideCount:(id,face,mask)=>{assert.equal(face,1);assert.equal(mask,6);return 2;},
  isEnableMoveContactActor:(id,vector)=>{calls.push(['probe',vector]);return true;},
  moveLinePathLiftContactActors:(id,vector)=>calls.push(['carry',vector])};
 api.beforeStep(s,ctx);api.beforeStep(s,ctx);
 assert.deepEqual(calls,[['probe',{xRaw:52428800,yRaw:0}]]);
 d.targetPathIndex=1;d.timerRaw=0;d.offsetRaw={...d.paths[0]};calls.length=0;
 const result=api.beforeStep(s,ctx);
 assert.deepEqual(calls,[['probe',{xRaw:0,yRaw:-65536}],['carry',{xRaw:0,yRaw:-209700}]]);
 assert.deepEqual(result.carryCalls,[{deviceId:d.id,xRaw:0,yRaw:-209700}]);
});
test('DamageRect remains inactive while push-back targets overlap, then activates exactly once',()=>{
 const d=api.compile(device('st_w_03_02',2,'DamageRect'),2).devices[0];
 assert.equal(api.updateDamageActivation(d,{pushBackTargetCollided:true}),false);
 assert.equal(d.collisionInactive,true);
 assert.equal(api.updateDamageActivation(d,{actorPaused:true,pushBackTargetCollided:false}),false);
 assert.equal(api.updateDamageActivation(d,{pushBackTargetCollided:false}),true);
 assert.equal(d.collisionInactive,false);
 assert.equal(api.updateDamageActivation(d,{}),false);
});
test('DamageRect dispatch retains first-pass collider order and deduplicates reverse contacts',()=>{
 const d={id:'hazard'},own=[{entityId:'a',collisionType:1},{entityId:'a',collisionType:1},{entityId:'box',collisionType:2}];
 const reverse=[{entityId:'a',flags:0,contactsDamageRect:true},{entityId:'b',flags:0,contactsDamageRect:true},
  {entityId:'c',flags:0x200,contactsDamageRect:true},{entityId:'d',flags:0,contactsDamageRect:false}];
 assert.deepEqual(api.damageContactEvents(d,own,reverse),['a','a','b'].map(targetId=>({targetId,eventType:43,senderId:'hazard'})));
});
test('event43 respects immortal unless forced; force invincibility branch kills; shared HP may survive',()=>{
 const player={life:1,flags:0,invincibleTimerRaw:0};
 assert.equal(api.playerEvent43Outcome(player),'dead');
 assert.equal(api.playerEvent43Outcome({...player,flags:0x100}),'ignored');
 assert.equal(api.playerEvent43Outcome({...player,flags:0x100},{force:true}),'dead');
 assert.equal(api.playerEvent43Outcome({...player,life:0},{force:true}),'ignored');
 assert.equal(api.playerEvent43Outcome(player,{sharedHitPointActive:true,dealDamageSurvived:true}),'shared-damage');
 assert.equal(api.playerEvent43Outcome({...player,invincibleTimerRaw:1},{force:true,sharedHitPointActive:true,dealDamageSurvived:true}),'dead');
 assert.equal(api.playerEvent43Outcome({...player,invincibleTimerRaw:1},{sharedHitPointActive:true,dealDamageSurvived:true}),'shared-damage');
});
test('runtime adapter cannot silently turn unavailable native collision data into safe empty contacts',()=>{
 const s=api.create(api.compile(device('st_w_03_02',2,'DamageRect'),2));
 assert.throws(()=>api.beforeStep(s),/requires ctx.isCollidedByPushBackTarget/);
 const calls=[],ctx={isCollidedByPushBackTarget:(id,mask)=>{assert.equal(mask,3);return false;},
  setCollisionActive:(id,on)=>calls.push([id,on]),damageRectOwnContacts:()=>[{entityId:'p',collisionType:1}],damageRectReversePlayers:()=>[]};
 const r=api.beforeStep(s,ctx);
 assert.deepEqual(calls,s.devices.map(d=>[d.id,true]));
 assert.equal(r.events.length,6);assert.deepEqual(r.activatedIds,s.devices.map(d=>d.id));
 calls.length=0;api.beforeStep(s,ctx);assert.deepEqual(calls,[]);
});
