'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('./source-dossun-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
for(let count=2;count<=8;count++)test(`real stages, ${count} players: exact decode and component compile`,()=>{
 for(const id of ['st_w_14_01','st_w_14_03']){
  const st=stages.find(s=>s.stageId===id),actors=pop.actorsForCount(pop.selectVariant(st.json.stageInitParamList,count,true),count);
  const guns=actors.filter(a=>a.typeName==='PlayerBlockGun').map(api.decodeActor);
  assert.equal(guns.length,8);assert.deepEqual(guns.map(g=>g.actorIndex),[0,1,2,3,4,5,6,7]);assert.deepEqual(guns.map(g=>g.bulletSpeedRaw),Array(8).fill(393216));
  const compiled=api.compile(actors,count);assert.equal(compiled.devices.filter(a=>a.type==='PlayerBlockGun').length,8);assert.deepEqual(api.create(compiled),compiled);
  if(id==='st_w_14_03'){
   const blocks=actors.filter(a=>a.typeName==='Dossun');assert.equal(blocks.length,1);
   assert.deepEqual(api.decodeActor(blocks[0]),{type:'Dossun',name:'Dossun1',x:1032,y:192,accelRaw:65536,waitRaw:65536,returnRaw:131072,retriggerOnReturn:false});
   assert.equal(api.compile(blocks,count).devices.length,1);
  }
 }
});
test('phase acceleration is per update; landing clears velocity on following update',()=>{
 const d={phase:1,accelRaw:65536,waitRaw:65536},a={vxRaw:200,vyRaw:0};
 api.updatePhase(d,a,1092);api.updatePhase(d,a,1092);assert.equal(a.vyRaw,131072);
 d.phase=2;api.updatePhase(d,a,1092);assert.deepEqual(a,{vxRaw:0,vyRaw:0});assert.equal(d.phase,3);assert.equal(d.timerRaw,65536);assert.equal(d.face,1);
});
test('one second wait uses 61 FP ticks, then return clamps to original height',()=>{
 const d={phase:3,timerRaw:65536,returnRaw:131072,face:1},a={yRaw:393216,initialYRaw:65536};
 for(let i=0;i<60;i++)api.updatePhase(d,a,1092);assert.equal(d.phase,3);assert.equal(d.timerRaw,16);
 api.updatePhase(d,a,1092);assert.equal(d.phase,4);assert.equal(d.face,0);
 api.updatePhase(d,a,1092);assert.equal(a.yRaw,262144);api.updatePhase(d,a,1092);assert.equal(a.yRaw,131072);api.updatePhase(d,a,1092);assert.equal(a.yRaw,65536);assert.equal(d.phase,0);
});
test('empty compilation round trips and interface is inert',()=>{
 const s=api.create(api.compile([],2));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);assert.deepEqual(api.solids(s),[]);assert.deepEqual(api.beforeStep(s),{events:[],sounds:[],equipment:[],solids:[]});assert.deepEqual(api.afterStep(s),{events:[],sounds:[],shakes:[],actorPushes:[],playerPositions:[],solids:[]});assert.deepEqual(api.displays(s),[]);
});
const FP=65536;
const player=(id,index,x=100)=>({id,actorIndex:index,playerIndex:index,colorIndex:index,playerState:0,xRaw:x*FP,yRaw:200*FP,vxRaw:0,vyRaw:0,scaleXRaw:FP,scaleYRaw:FP,actorScaleRaw:FP,rectRaw:{height:40*FP,width:30*FP,x:-15*FP,y:-40*FP},sortingOrder:0});
test('FP authored values follow float32/truncation including negative integer slot',()=>{
 assert.equal(api.fp(1.1),72089);assert.equal(api.fp(0.1),6553);
 assert.equal(api.decodeActor({typeName:'PlayerBlockGun',datas:[{t:1,f:-0.1}]}).actorIndex,-1);
});
test('sensor uses native Map.Move output, scale division and zero clamp',()=>{
 assert.deepEqual(api.sensorFromMove(300*FP,2*FP),{height:158*FP,width:458*FP,x:-229*FP,y:0});
 assert.equal(api.sensorFromMove(-FP,FP).height,8*FP);assert.throws(()=>api.sensorFromMove(FP,0),/nonzero/);
 const s=api.create(api.compile([{typeName:'Dossun',posX:1032,posY:192,datas:[]}],2,{actorScaleRaw:FP}));
 assert.throws(()=>api.beforeStep(s),/mapMoveDossunSensor/);
 let request;api.beforeStep(s,{mapMoveDossunSensor:r=>(request=r,{moveYRaw:300*FP})});
 assert.equal(request.dyRaw,655360000);assert.equal(request.dxRaw,0);assert.equal(s.devices[0].sensorRectRaw.height,308*FP);
 assert.deepEqual(api.solids(s).map(s=>[s.collisionIndex,s.collisionKind,s.layer]),[[0,3,8],[1,0,8],[2,1,14]]);
});
test('sensor triggers player/block only within half-height, return needs authored flag',()=>{
 const d={id:'d',phase:0,yRaw:51*FP,initialYRaw:0,sensorRectRaw:{height:100*FP},retriggerOnReturn:false};
 api.collideDossun(d,{collisionIndex:2,otherActorType:27});assert.equal(d.phase,0);
 d.yRaw=50*FP;api.collideDossun(d,{collisionIndex:2,otherActorType:17});assert.equal(d.phase,0);
 api.collideDossun(d,{collisionIndex:2,otherActorType:163});assert.equal(d.phase,1);
 d.phase=4;api.collideDossun(d,{collisionIndex:2,otherActorType:27});assert.equal(d.phase,4);
 d.retriggerOnReturn=true;api.collideDossun(d,{collisionIndex:2,otherActorType:27});assert.equal(d.phase,1);
});
test('thorn index kills layer1 regardless phase; contact lands only while falling',()=>{
 const d={id:'d',phase:0};assert.deepEqual(api.collideDossun(d,{collisionIndex:1,otherLayer:1,otherId:'p'}).events,[{targetId:'p',senderId:'d',eventType:19}]);
 assert.deepEqual(api.collideDossun(d,{collisionIndex:0,otherLayer:1,otherId:'p'}).events,[]);
 api.contactDossun(d,{contactYRaw:FP});assert.equal(d.phase,0);
 d.phase=1;assert.deepEqual(api.contactDossun(d,{otherId:'p',otherLayer:1,contactYRaw:1}).events,[{targetId:'p',senderId:'d',eventType:19}]);assert.equal(d.phase,2);
 d.phase=1;assert.deepEqual(api.contactDossun(d,{otherId:'p',otherLayer:2,contactYRaw:FP}).events,[]);assert.equal(d.phase,2);
});
test('gun edge, owner lookup, one outstanding bullet and 31-tick disappearance',()=>{
 const s=api.create(api.compile([{typeName:'PlayerBlockGun',posX:0,posY:0,datas:[{t:1,f:0}]}],2)),p=player('p0',0),g=s.devices[0];
 const tick=input9=>api.beforeStep(s,{players:[p],input9:{p0:input9},cameraAreaRaw:{x:0,width:1000*FP}});
 const first=tick(true);assert.deepEqual(first.equipment,[{playerId:'p0',gunId:g.id,holdGun:true}]);assert.equal(s.bullets.length,1);
 const b=s.bullets[0];assert.equal(b.xRaw,110*FP);assert.equal(b.yRaw,193*FP);assert.equal(b.vxRaw,6*FP);assert.equal(g.xRaw,121*FP);assert.equal(g.yRaw,190*FP);
 tick(true);tick(false);tick(true);assert.equal(s.bullets.length,1);
 api.requestDisappear(b);for(let i=0;i<30;i++)tick(false);assert.equal(b.timerRaw,8);assert.equal(g.bulletId,b.id);
 tick(false);assert.equal(s.bullets.length,0);assert.equal(g.bulletId,null);tick(true);assert.equal(s.bullets.length,1);
});
test('bullet hit creates other player block once, own player hit only fades',()=>{
 const s=api.create(api.compile([],2)),g={id:'gun',bulletSpeedRaw:6*FP},p=player('p0',0),q=player('p1',1);
 const b=api.spawnBullet(s,g,p);const hit=api.collideBullet(s,b,{otherActorType:27,otherId:q.id},[p,q]);assert.equal(hit.events[0].eventType,65);assert.equal(hit.events[0].targetId,q.id);assert.equal(s.playerBlocks.blocks.length,1);
 assert.deepEqual(api.collideBullet(s,b,{otherActorType:27,otherId:q.id},[p,q]).events,[]);assert.equal(s.playerBlocks.blocks.length,1);
 const own=api.spawnBullet(s,g,p);assert.deepEqual(api.collideBullet(s,own,{otherActorType:27,otherId:p.id},[p,q]).events,[]);assert.equal(own.disappearing,true);
});
test('camera exit is horizontal only and right boundary exclusive; owner unlocks on exit',()=>{
 const s=api.create(api.compile([{typeName:'PlayerBlockGun',posX:0,posY:0,datas:[]}],2)),p=player('p0',0),g=s.devices[0],b=api.spawnBullet(s,g,p);
 b.xRaw=-10*FP;b.yRaw=10000*FP;api.beforeStep(s,{cameraAreaRaw:{x:0,width:100*FP}});assert.equal(s.bullets.length,1);
 b.xRaw=110*FP;api.beforeStep(s,{cameraAreaRaw:{x:0,width:100*FP}});assert.equal(s.bullets.length,0);assert.equal(g.bulletId,null);
});
test('runtime move hook owns travel and afterStep preserves ordered callbacks',()=>{
 const s=api.create(api.compile([],2)),p=player('p0',0),q=player('p1',1),b=api.spawnBullet(s,{id:'g',bulletSpeedRaw:6*FP},p);
 assert.throws(()=>api.moveActors(s),/moveDeviceActor/);let descriptors;
 api.moveActors(s,(a,ds)=>{descriptors=ds;a.xRaw+=a.vxRaw;});assert.equal(b.xRaw,116*FP);assert.equal(descriptors[0].width,10*FP);
 const result=api.afterStep(s,{players:[p,q],contacts:[{actorId:b.id,callback:'OnContacted'},{actorId:b.id,callback:'OnCollided',otherActorType:27,otherId:q.id}]});assert.deepEqual(result.events,[]);assert.equal(s.playerBlocks.blocks.length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
});
test('missing stage scale and camera fail explicitly; restored input cannot fire twice',()=>{
 const d=api.create(api.compile([{typeName:'Dossun',posX:0,posY:0,datas:[]}],2));
 assert.throws(()=>api.beforeStep(d,{mapMoveDossunSensor:()=>({moveYRaw:0})}),/actorScaleRaw/);
 const p=player('p0',0),s=api.create(api.compile([{typeName:'PlayerBlockGun',posX:0,posY:0,datas:[]}],2));
 api.beforeStep(s,{players:[p],input9:{p0:true},cameraAreaRaw:{x:0,width:1000*FP}});
 const restored=JSON.parse(JSON.stringify(s));api.exitBullet(restored,restored.bullets[0]);
 api.beforeStep(restored,{players:[p],input9:{p0:true}});assert.equal(restored.bullets.length,0);
 api.spawnBullet(restored,restored.devices[0],p);assert.throws(()=>api.beforeStep(restored,{players:[p]}),/cameraAreaRaw/);
});
test('zero slots preserve Initialize QFP defaults verified by field names',()=>{
 const d=api.decodeActor({typeName:'Dossun',posX:0,posY:0,datas:[]});assert.equal(d.accelRaw,327680);assert.equal(d.waitRaw,65536);assert.equal(d.returnRaw,163840);
 assert.equal(api.decodeActor({typeName:'PlayerBlockGun',datas:[]}).bulletSpeedRaw,393216);
});
