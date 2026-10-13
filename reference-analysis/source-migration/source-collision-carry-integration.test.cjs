// Isolated native scene integration, not full R.create/R.step or stage fidelity.
// Shipped rail/camera configuration; both empty and shipped tile-grid cases.
// Synthetic stacked starts isolate cache generation, next-tick inertia, Player
// contacts and Actor sync. Other authored actors/hazards are not created here.
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('./source-collision-pipeline.js'),B=require('./source-collision-broadphase.js'),C=require('./source-camera-native.js'),PC=require('./source-player-contact.js'),L=require('./source-linepath-devices.js'),pop=require('./population-rules.cjs'),data=require('./installed-stage-decoded.local.json');
const Motion=require('./source-actor-motion.js'),PlayerInit=require('./source-player-collision-init.js');
const Callbacks=require('./source-collision-callbacks.js'),Terrain=require('./terrain-runtime.js'),geometry=require('./source-geometry.local.json');
const F=65536;
function body(entityId,xRaw,yRaw,rectRaw,extra={}){return {entityId,xRaw,yRaw,preXRaw:xRaw,preYRaw:yRaw,priority:0,layer:6,flags:0,pushBackTarget:3,collisionType:0,rectRaw,baseRectRaw:{...rectRaw},preRectRaw:{...rectRaw},scaleRaw:{xRaw:F,yRaw:F},preScaleRaw:{xRaw:F,yRaw:F},expectedScaleRaw:{xRaw:F,yRaw:F},pivotRaw:{xRaw:0,yRaw:0},contacts:[],mapNormals:[],requestMapNormals:[],actorExists:true,...extra};}
const host=Callbacks.createHost({
 'PlayerComponent.OnContactAdded':(w,a,b,e)=>PC.onContact(w,e),
 'PlayerComponent.OnContacted':(w,a,b,e)=>PC.onContact(w,e)
},{
 actorForCollision:(w,b)=>w.actors.find(a=>a.entityId===b.entityId)||null,
 syncActorPosition:(w,b,e)=>{const a=w.actors.find(a=>a.entityId===b.entityId);assert.ok(a);a.positionRaw={xRaw:e.xRaw,yRaw:e.yRaw};}
});
function riderIds(w,lift){const list=B.active(w.storage),seen=new Set();function up(b){for(const c of b.contacts){if(c.normal.x!==0||c.normal.y!==-1||seen.has(c.id))continue;const next=list.find(b=>b.id===c.id);if(next&&((1<<next.layer)&6)){seen.add(c.id);up(next);}}}up(lift);return [...seen];}
function setup(count,actualTerrain=false){
 const stage=pop.selectVariant(data.stages.find(s=>s.stageId==='st_w_03_02').json.stageInitParamList,count,true),rail=L.create(L.compile(pop.actorsForCount(stage,count),count)).devices.find(d=>d.type==='LinePathLift');
 const cam=C.create(C.compile(stage),null),w={storage:P.createStorage(),isEnableInertia:true,layerChecks:P.createLayerChecks(),cameraAreaRaw:C.stageAreaRaw(cam),map:{tileFlags:Array.from({length:stage.mapInitParam.height},()=>Array(stage.mapInitParam.width).fill(0))},actors:[]};
 if(actualTerrain){const terrain=Terrain.createTerrain({source:data,geometry,stageId:'st_w_03_02',count,online:true}),attrs=new Map(geometry.tileAttributes.map(a=>[a.id,a.flags]));w.map.tileFlags=terrain.grid.map(row=>row.map(id=>{assert.ok(attrs.has(id));return attrs.get(id);}));assert.ok(w.map.tileFlags.flat().some(f=>f&1));}
 w.stage=Motion.compileStageBounds(stage);
 const authoredPlayers=pop.actorsForCount(stage,count).filter(a=>a.typeName==='Player');
 const cols=Math.min(count,4);
 for(let i=0;i<count;i++){
  const x=rail.xRaw+(i%cols-(cols-1)/2)*32*F,y=rail.yRaw+rail.rectRaw.y+F-Math.floor(i/cols)*46*F;
  const b=B.createCollision(w.storage,{}),created=PlayerInit.bootstrap(authoredPlayers[i],{id:b.id,entityId:'player:'+i,hasOnCollided:Callbacks.has(27,'OnCollided')},PlayerInit.stageRaw(stage.scale));
  assert.equal(created.collisions[0].yRaw,28278784);assert.equal(created.collisions[0].expectedYRaw,0);
  // Explicitly relocate the real initialized body to this synthetic stack.
  Object.assign(b,PlayerInit.setInitPosition(created.collisions,{xRaw:x,yRaw:y})[0],{actorExists:true,playerFacts:{wakeUpCount:created.player.wakeUpCount,inertiaAttachmentId:null}});
  w.actors.push({entityId:b.entityId,actorType:27,flags:0,positionRaw:{xRaw:x,yRaw:y},prePositionRaw:{xRaw:x,yRaw:y},velocityRaw:{xRaw:0,yRaw:F},player:{state:1,flags:0,inputBit:0}});
 }
 const b=B.createCollision(w.storage,body(rail.id,rail.xRaw,rail.yRaw,{...rail.rectRaw},{actorType:103,layer:13,pushBackTarget:2,flags:4|1024|(rail.isInertia?0:128)}));
 w.actors.push({entityId:b.entityId,actorType:103,flags:0,positionRaw:{xRaw:b.xRaw,yRaw:b.yRaw}});
 for(const a of w.actors){const c=B.active(w.storage).find(b=>b.entityId===a.entityId);a.warpPositionRaw={xRaw:0,yRaw:0};a.inactiveCollisionEntity=null;a.velocityRaw=a.velocityRaw||{xRaw:0,yRaw:0};a.accelerationRaw={xRaw:0,yRaw:0};a.requestAnimationId=0;a.playingAnimationId=0;a.collisionHolders=[{syncPos:true,collisionId:c.id}];}
 return {w,rail};
}
for(const actualTerrain of [false,true])for(let count=2;count<=8;count++)test(`shipped3-2 rail ${count} players ${actualTerrain?"shipped terrain":"empty terrain"}: empty cache -> native contacts -> inertia -> Actor sync`,()=>{
 let {w,rail}=setup(count,actualTerrain);assert.ok(B.active(w.storage).every(b=>b.contacts.length===0));let firstMovement=null;
 for(let tick=1;tick<=5;tick++){
  const bodies=B.active(w.storage),lift=bodies.find(b=>b.entityId===rail.id),players=bodies.filter(b=>b.layer===1),before=players.map(b=>b.xRaw),riders=riderIds(w,lift),oldX=lift.xRaw;
  // Open horizontal fixture makes the obstruction decision explicitly true;
  // this is not a substitute for the full runtime MoveContact host contract.
  const phaseWorld={...w,collisions:bodies};
  for(const a of w.actors)Motion.update1(a,false);
  L.advanceLift(rail,1092,riders.length,true);
  w.actors.find(a=>a.entityId===rail.id).positionRaw={xRaw:rail.xRaw+rail.offsetRaw.xRaw,yRaw:rail.yRaw+rail.offsetRaw.yRaw};
  // Controlled per-tick velocity is fixture input; actual ordinary Player
  // input/gravity is not substituted. Shared Actor integration handles it.
  for(const a of w.actors)Motion.update2(phaseWorld,a);
  const out=P.step(w,host);w=JSON.parse(JSON.stringify(out.state));
  for(const a of w.actors){const pw={...w,collisions:B.active(w.storage)};Motion.post1(pw,a,{warpProc:Motion.idleWarpProc,checkOutMap:Motion.checkOutMap});Motion.post2(pw,a,{setCollisionActive:Motion.setCollisionActive});}
  if(tick===1){assert.equal(riderIds(w,B.active(w.storage).find(b=>b.entityId===rail.id)).length,count);assert.ok(out.events.some(e=>e.type==='OnContactAdded'));}
  const delta=lift.xRaw-oldX;
  if(delta){firstMovement=tick;assert.equal(riders.length,count);assert.equal(delta,count===2?209600:count===3?156800:121600);
   assert.equal(new Set(out.inertiaTrace.map(t=>t.id)).size,count);
   for(const [i,p]of B.active(w.storage).filter(b=>b.layer===1).entries()){assert.equal(p.xRaw-before[i],delta);assert.equal(w.actors.find(a=>a.entityId===p.entityId).positionRaw.xRaw,p.xRaw);}
   break;
  }
 }
 assert.equal(firstMovement,3);
});
