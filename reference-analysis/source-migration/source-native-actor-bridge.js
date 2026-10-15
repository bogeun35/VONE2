/* Shared native Actor schema bridge. Capture receiver plans preserve their
 * original field names; translate raw+f0 WorldVelo to velocityRaw and raw+60
 * MoveVelo to accelerationRaw (Actor metadata offsets256/112 minus16).
 * Lifecycle receives actorType through its ordinal adapter. Execute returned
 * collision/equipment calls synchronously before later capture operations.
 * All operations use a cloned whole-world transaction. Hooks must mutate only
 * that provided world; external audio/network delivery belongs after commit.
 * Default/Input/Boundary/Queries/Jump are connected through explicit schema
 * views. It remains unregistered into the legacy stage runtime.
 */
'use strict';
const Lifecycle=require('./source-actor-lifecycle.js'),Capture=require('./source-player-capture.js'),Warp=require('./source-actor-warp-jump.js'),Motion=require('./source-actor-motion.js'),Broad=require('./source-collision-broadphase.js');
const Default=require('./source-player-default.js'),Input=require('./source-player-native-input.js'),Boundary=require('./source-player-screen-boundary.js'),Queries=require('./source-player-contact-queries.js'),Jump=require('./source-player-jump-notify.js');
const Pool=require('./source-native-event-pool.js');
const GoalQuery=require('./source-player-goal-query.js');
const Effects=require('./source-player-effects.js');
const StateDispatch=require('./source-player-state-dispatch.js');
const StageInput=require('./source-stage-input-update.js');
const Terminal=require('./source-player-terminal-states.js');
const Key=require('./source-key-lifecycle.js'),CollisionFactory=require('./source-native-collision-factory.js'),Rect=require('./source-collision-rect.js');
const PushBackQuery=require('./source-pushback-target-query.js');
const SceneNames=require('./source-native-scene-names.js'),QString=require('./source-native-qstring.js');
const Pipeline=require('./source-collision-pipeline.js'),Callbacks=require('./source-collision-callbacks.js'),PlayerContact=require('./source-player-contact.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function actor(world,id){const a=world.actors.find(a=>a.entityId===id);if(!a)throw Error('Native bridge Actor missing: '+id);return a;}
function allCollisions(world){if(!world.storage)throw Error('Native bridge complete collision storage required');const out=[];for(const dict of [world.storage.primary,world.storage.secondary])for(const e of dict.entries)if(e.state===2){const c=Broad.getCollisionById(world.storage,e.key);if(!c)throw Error('Native bridge invalid collision storage');out.push(world.collisions?.find(b=>b.id===e.key)||c);}return out;}
function view(world){return {...world,collisions:allCollisions(world)};}
function syncResult(result){if(result&&typeof result.then==='function')throw Error('Native bridge callbacks must be synchronous');if(!Number.isInteger(result)||result< -2147483648||result>2147483647)throw Error('Native event int32 return required');return result;}
function required(host,name,...args){if(typeof host?.[name]!=='function')throw Error('Native bridge '+name+' required');return host[name](...args);}
function jumpHost(world,host){return {
 dispatchEvent37:(_,source,target,e)=>dispatch(world,target.entityId,e,host),
 notifyEvent37:(_,source,target,velocity,invoke)=>{
  const event=Pool.getEventParam(world.eventPool,source,37);
  // NotifyJump checks GetEventParam null at1816a1f3b and reaches the native
  // exception helper1816a21a0, unlike generic NotifyEvent(null)'s return0.
  if(event===null)throw Error('Native NotifyJump event pool exhausted');
  if(event){event.Velo.yRaw=velocity;
   // Non-enumerable aliases keep the exact leased object's identity, including
   // reuse after return. Rebind after JSON restoration; never retain copies.
   for(const [key,native] of Object.entries({eventType:'EventType',sourceId:'NotifiedActor',velocityRaw:'Velo',inUse:'InUse'}))Object.defineProperty(event,key,{configurable:true,get(){return this[native];},set(value){this[native]=value;}});
  }
  return Pool.notifyEvent(target,event,(_,param)=>{const result=invoke(param);return typeof result==='object'?result.handled:result;});
 }
};}
function dispatch(world,id,event,host){
 const a=actor(world,id),type=event.eventType;
 if(a.actorType===17)return syncResult(Key.receive(view(world),a,event,keyHost(world,host)));
 if(type===37&&(a.jumpReceiver==='actor-base'||a.jumpReceiver==='player-default'&&a.player?.state===1))return Jump.receive37(a,event).handled;
 if(a.actorType===27&&[30,65,66].includes(type)){
  if(!a.player)throw Error('Native Player component required');
  const plan=Capture.plan({actor:{...a,id:a.entityId},player:a.player},event);
  for(const op of plan.operations){
   if(op.kind==='dispatch'){
    if(op.broadcastActorType!==undefined){
     const ids=required(host,'queryActorIds',world,op.broadcastActorType);
     if(!Array.isArray(ids))throw Error('Native broadcast query order required');
     for(const target of ids)dispatch(world,target,{eventType:op.eventType,sourceId:op.senderId},host);
    }else dispatch(world,op.targetId,{eventType:op.eventType,sourceId:op.ownerId,value:op.eventType===55?op.visible:op.paused},host);
   }else{
    const [group,sourceKey]=op.path.split('.'),target=group==='actor'?a:a.player;
    const key=group==='actor'?({worldVelocityRaw:'velocityRaw',moveVelocityRaw:'accelerationRaw'}[sourceKey]||sourceKey):sourceKey;
    if(op.kind==='write')target[key]=clone(op.value);
    else target[key]=(op.value?target[key]|(1<<op.bit):target[key]&~(1<<op.bit))>>>0;
   }
  }
  return plan.returnValue;
 }
 if([49,51,52,53,54,55].includes(type)){
  const receiver=Lifecycle.registry.events.find(r=>r.ordinal===a.actorType);
  if(receiver&&!['Player','Blackout','BlackoutController'].includes(receiver.actorType))return syncResult(required(host,'receiveCustomEvent',world,a,event));
  // Work on the actual Actor so nested callbacks observe owner/flag writes.
  const previous=a.ordinal;a.ordinal=a.actorType;let result;
  try {result=Lifecycle.receiveControl(a,event);}finally {if(previous===undefined)delete a.ordinal;else a.ordinal=previous;}
  for(const call of result.calls){if(call.kind==='setCollisionActive')Motion.setCollisionActive(view(world),a,call.value,call.sourceId);else if(call.kind==='notifyEvent')dispatch(world,call.targetId,{eventType:call.eventType,sourceId:call.sourceId,value:call.value},host);else throw Error('Native lifecycle call not implemented: '+call.kind);}
  return 0;
 }
 return syncResult(required(host,'receiveCustomEvent',world,a,event));
}
function motionHost(world,host){return {
 warpProc:(w,a)=>Warp.warpProc(w,a,{setVisible:(_,a,value,sourceId)=>dispatch(world,a.entityId,{eventType:55,value,sourceId},host)}),
 // Scene mapNormals are FP raw vectors; the query adapter preserves their
 // representation instead of interpreting them as normalized actor contacts.
 jumpProc:(w,a)=>{const q=Queries.createHost({lookupMode:'scene',getWorld:()=>w});Jump.jumpProc(w,a,{getCollision:(_,a,index)=>w.collisions.find(c=>c.id===a.collisionHolders[index]?.collisionId)||null,isContacted:(_,c,face)=>q.contactProbe(c,face).contacted,getGravity:()=>w.gravityRaw});},checkOutMap:Motion.checkOutMap,setCollisionActive:Motion.setCollisionActive
};}
function transaction(input,operation){const world=clone(input);if(!Array.isArray(world.actors))throw Error('Native bridge Actor table required');const result=operation(world);return {world,result};}
function receive(input,id,event,host={}){return transaction(input,w=>dispatch(w,id,event,host));}
function post1(input,id,host={}){return transaction(input,w=>{const a=actor(w,id),v=view(w);Motion.post1(v,a,motionHost(w,host));return null;});}
function post2(input,id){return transaction(input,w=>{const a=actor(w,id),v=view(w);Motion.post2(v,a,{setCollisionActive:Motion.setCollisionActive});return null;});}
function applyInputs(input,simulationFrameNumber,packets){return transaction(input,w=>{Input.applySimulationInputs(w.inputs,simulationFrameNumber,packets);return null;});}
function flatActor(a){return {...clone(a),xRaw:a.positionRaw.xRaw,yRaw:a.positionRaw.yRaw};}
function storeSnapshot(a,c,p,flat,body){
 const {playerState,...player}=p;a.player={...player,state:playerState};
 const {xRaw,yRaw,...fields}=flat;Object.assign(a,fields);a.positionRaw={xRaw,yRaw};
 // Actor contains the Player reference in the canonical model; do not let
 // the old nested reference inside a flat snapshot undo Player updates.
 a.player={...player,state:playerState};Object.assign(c,body);
}
function refreshSnapshot(a,c,p,flat,body){Object.assign(p,{...a.player,playerState:a.player.state});delete p.state;Object.assign(flat,flatActor(a));Object.assign(body,clone(c));}
function deliverEffect(w,a,c,e,p,flat,body,host){
 if(['SetPosForce','MoveContactActor','notifyJumpUpward'].includes(e.type))return;
 storeSnapshot(a,c,p,flat,body);
 const result=typeof host.applyPlayerEffect==='function'?host.applyPlayerEffect(w,a,e):Effects.applyPlayerEffect(w,a,e,{invokeOnRecvEvent:(world,target,param)=>required(host,'invokeOnRecvEvent',world,target,param)});
 if(result&&typeof result.then==='function')throw Error('Native Player effects must be synchronous');
 refreshSnapshot(a,c,p,flat,body);
}
function playerStage(w){return w.stage?.inputType!==undefined?{...w.stage,scrollType:w.stage.scrollParam?.scrollType}:w.playerStage;}
function playerButtons(w,p){
 if(w.stage?.inputType===undefined)return Input.getButtons(w.inputs,p.playerIndex,w.operatingMenuMask);
 return StageInput.createHost({getStage:()=>w.stage,getNativeInputState:()=>w.inputs,lookupInputSingleton:kind=>{
  if(!w.singletons||!Object.hasOwn(w.singletons,kind))throw Error('Native bridge explicit input singleton snapshot required: '+kind);
  return w.singletons[kind];
 }}).buttonsForPlayer(p);
}
function updatePlayerInPlace(w,id,dtRaw,host){
 const a=actor(w,id);if(a.actorType!==27||!a.player)throw Error('Native ordinary Player required');
 const c=Broad.getCollisionById(w.storage,a.collisionHolders[0]?.collisionId);if(!c)throw Error('Native Player collision0 required');
 const q=Queries.createHost({lookupMode:'storage',getWorld:()=>w,getMapData:()=>w.nativeMapData});
 const scene={getCollision:(a,index)=>q.collisionById(a.collisionHolders[index]?.collisionId),contactIds:q.contactIds,collisionById:q.collisionById,actorByEntity:id=>{const a=w.actors.find(a=>a.entityId===id);return a?flatViews.get(a):null;}};
 let flatViews;
 const boundary=(p,flat,vx)=>{flatViews=new Map(w.actors.map(a=>[a,flatActor(a)]));flatViews.set(a,flat);return Boundary.screenEndWalkVelocityX(p,flat,vx,{camera:w.camera,scene});};
 const immediate=(action,p,flat,body)=>{
  storeSnapshot(a,c,p,flat,body);
  if(action.type==='SetPosForce')Warp.setPosForce(view(w),a,action.positionRaw);
  else if(action.type==='notifyJumpUpward'){
   Jump.applyDefaultAction(view(w),a,c,action,jumpHost(w,host));
  }else {const r=required(host,'applyImmediatePlayerAction',w,a,c,action);if(r&&typeof r.then==='function')throw Error('Native immediate Player action must be synchronous');}
  refreshSnapshot(a,c,p,flat,body);
 };
 const snapshot={player:{...clone(a.player),playerState:a.player.state},actor:flatActor(a),collision:clone(c)};delete snapshot.player.state;
 const buttons=playerButtons(w,a.player);
 const goal=GoalQuery.createHost({getManagerGoalRef:()=>w.actorManager?.goalEntityId,goalByEntity:id=>w.actors.find(a=>a.entityId===id)?.goal||null,actorByEntity:id=>w.actors.find(a=>a.entityId===id)||null,collisionById:q.collisionById});
 const out=Default.step(snapshot,playerStage(w),buttons,dtRaw,{...q,playerByEntity:id=>w.actors.find(a=>a.entityId===id)?.player||null,screenEndWalkVelocityX:boundary,openGoalOverlap:goal.openGoalOverlap,applyImmediate:immediate,onEffect:(e,p,flat,body)=>deliverEffect(w,a,c,e,p,flat,body,host)});
 storeSnapshot(a,c,out.player,out.actor,out.collision);
 return {effects:out.effects,earlyReturn:out.earlyReturn||null};
}
function postPlayerInPlace(w,id,host){
 const a=actor(w,id),c=Broad.getCollisionById(w.storage,a.collisionHolders[0]?.collisionId);if(a.actorType!==27||!a.player||!c)throw Error('Native ordinary Player and collision0 required');
 const snapshot={player:{...clone(a.player),playerState:a.player.state},actor:flatActor(a),collision:clone(c)};delete snapshot.player.state;
 const out=Default.post(snapshot,{checkOutMap:flat=>Motion.checkOutMap(w,flat),onEffect:(e,p,flat,body)=>deliverEffect(w,a,c,e,p,flat,body,host)});storeSnapshot(a,c,out.player,out.actor,out.collision);
 return {effects:out.effects};
}
function stepPlayer(input,id,dtRaw,host={}){return transaction(input,w=>updatePlayerInPlace(w,id,dtRaw,host));}
function postPlayer(input,id,host={}){return transaction(input,w=>postPlayerInPlace(w,id,host));}
function keyHost(w,host){return {
 actorById:(_,id)=>w.actors.find(a=>a.entityId===id)||null,
 collision0:(_,a)=>Broad.getCollisionById(w.storage,a.collisionHolders[0]?.collisionId),
 getRect:(_,c)=>Rect.getRect(c.baseRectRaw,c.scaleRaw,c.pivotRaw),
 createAttachmentCollision:(_,a,rect,push,sync)=>CollisionFactory.createRect(w,a,rect,push,sync),
 findActor:(_,name)=>typeof host.findActorByNativeName==='function'?host.findActorByNativeName(w,name):SceneNames.findActor(w,name),
 isValidAttachTargetName:(_,name)=>QString.isFindActorKey(QString.fromString(name)),
 mapHeight:()=>w.map?.tileHeight,
 outMapDiagnostic:(_,a)=>required(host,'keyOutMapDiagnostic',w,a),
 framePlaySe:(_,id)=>required(host,'keyFramePlaySe',w,id),
 setCollisionActive:(_,a,value,source)=>Motion.setCollisionActive(view(w),a,value,source),
 setVisible:(_,a,value,source)=>{
  const e=Pool.getEventParam(w.eventPool,a,55);if(e===null)throw Error('Native Key visibility event pool exhausted');e.NotifiedActor=source;e.IsVisible=value;
  return Pool.notifyEvent(a,e,(target,param)=>dispatch(w,target.entityId,{eventType:param.EventType,sourceId:param.NotifiedActor,value:param.IsVisible},host));
 },
 notifyEvent:(_,e)=>{
  const source=actor(w,e.sourceId),target=w.actors.find(a=>a.entityId===e.targetId)||null,param=Pool.getEventParam(w.eventPool,source,e.eventType);
  return Pool.notifyEvent(target,param,(a,p)=>syncResult(required(host,'invokeOnRecvEvent',w,a,p)));
 },
 commonActorReceive:(_,a,e)=>{
  const out=Lifecycle.commonEvent(a,e);for(const call of out.calls){if(call.kind!=='setCollisionActive')throw Error('Native Key common control call unsupported');Motion.setCollisionActive(view(w),a,call.value,call.sourceId);}return 0;
 }
};}
function terminalCallbacks(w,frame,host){
 const callbacks=Terminal.createCallbacks({
  invokeOnRecvEvent:(_,a,param)=>{
   const field={53:'IsPause',54:'SortingOrder',55:'IsVisible'}[param.EventType];
   if(!field)throw Error('Native terminal control parameter unsupported: '+param.EventType);
   return dispatch(w,a.entityId,{eventType:param.EventType,sourceId:param.NotifiedActor,value:param[field]},host);
  },
  isPressInput:(_,a,id)=>Default.input(a.player,playerStage(w),playerButtons(w,a.player),id,'press'),
  getCollision:(_,a,index)=>Broad.getCollisionById(w.storage,a.collisionHolders[index]?.collisionId),
  isCollidedByPushBackTarget:(_,c,mask)=>PushBackQuery.isCollidedByPushBackTarget(view(w),c,mask)
 });
 // Keep full/inactive storage and canonical Actor identity visible during the
 // synchronous state body. DeltaTime belongs to this frame, never a fallback.
 return Object.fromEntries(Object.entries(callbacks).map(([name,call])=>[name,(_,a)=>call({...view(w),deltaTimeRaw:frame.dtRaw},a)]));
}
function componentPost(w,a,frame,host){
 // OnPost1816c0dd0: flag3 pushBack addition@e2f..e80, state Post@ea8,
 // outmap@ecb then pooled43 CauseDead1@efd..f0d. Table1816c1058 has
 // state1 no-op,2/3/4 return,5 Clear,6 Plane,7 BattlePlane; others return.
 const p=a.player;
 if(!p||!Number.isInteger(p.state)||p.state<0||p.state>255||!Number.isInteger(p.flags))throw Error('Native Player Post state/flags required');
 const add=(x,y)=>{if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw Error('Native Player Post exact vector required');const n=Number(BigInt.asIntN(64,BigInt(x)+BigInt(y)));if(!Number.isSafeInteger(n))throw Error('Native Player Post vector overflow');return n;};
 if(p.flags&8)a.velocityRaw={xRaw:add(a.velocityRaw.xRaw,p.pushBackRaw?.xRaw),yRaw:add(a.velocityRaw.yRaw,p.pushBackRaw?.yRaw)};
 if(p.state===5)terminalCallbacks(w,frame,host).OnPost_Clear(w,a);
 else if(p.state===6||p.state===7){const name=p.state===6?'OnPost_Plane':'OnPost_BattlePlane',result=required(host.playerStateCallbacks,name,w,a,{name,va:p.state===6?'0x1816c8af0':'0x1816c2400'});if(result&&typeof result.then==='function')throw Error('Native Player Post must be synchronous');}
 if(Motion.checkOutMap(w,a)){
  const e=Pool.getEventParam(w.eventPool,a,43);if(e===null)throw Error('Native Player Post43 event pool exhausted');e.CauseDead=1;
  Pool.notifyEvent(a,e,(target,param)=>syncResult(required(host,'invokeOnRecvEvent',w,target,param)));
 }
}
function runPhaseInPlace(w,phase,frame,host){
 if(typeof frame?.verified!=='boolean'||!Number.isSafeInteger(frame.dtRaw))throw Error('Native frame Verified/DeltaTime required');
 const state={sceneFlags:w.actorSceneFlags,presentOrdinals:w.presentOrdinals,actors:Object.fromEntries(w.actors.map(a=>[a.entityId,a]))};
 const syncActors=()=>{state.actors=Object.fromEntries(w.actors.map(a=>[a.entityId,a]));};
 return Lifecycle.runPhase(state,phase,{
  queryFactory:row=>{syncActors();return required(host,'queryFactory',row,w,phase);},
  exitActors:()=>{const result=required(host,'exitActors',w);if(result&&typeof result.then==='function')throw Error('Native exitActors must be synchronous');},
  dispatch:(a,name,meta)=>{
   const v=view(w),mh=motionHost(w,host);
   if(name==='Actor.Update1')Motion.update1(a,frame.verified);
   else if(name==='Actor.Update2')Motion.update2(v,a,mh);
   else if(name==='Actor.Post1')Motion.post1(v,a,mh);
   else if(name==='Actor.Post2')Motion.post2(v,a,mh);
   else if(name==='PlayerComponent.OnUpdate'){
    StateDispatch.onUpdate(w,a,frame.dtRaw,{
     ...host.playerStateCallbacks,
     ...terminalCallbacks(w,frame,host),
     isPressInput:(world,current,id)=>Default.input(current.player,playerStage(world),playerButtons(world,current.player),id,'press'),
     OnUpdate_Default:(world,current)=>updatePlayerInPlace(world,current.entityId,frame.dtRaw,host)
    });
    syncActors();
   }
   else if(name==='PlayerComponent.OnPost')componentPost(w,a,frame,host);
   else if(name==='KeyComponent.OnStart')Key.onStart(view(w),a,keyHost(w,host));
   else if(name==='KeyComponent.OnUpdate')Key.onUpdate(view(w),a,frame.dtRaw,keyHost(w,host));
   else if(name==='KeyComponent.OnPost')Key.onPost(view(w),a,keyHost(w,host));
   else {
    // Other component callbacks still require their complete native bodies.
    const operations={updateDefault:()=>updatePlayerInPlace(w,a.entityId,frame.dtRaw,host),postDefault:()=>postPlayerInPlace(w,a.entityId,host),receive:(id,event)=>dispatch(w,id,event,host)};
    const result=required(host,'dispatchComponent',w,a,name,meta,operations);
    if(result&&typeof result.then==='function')throw Error('Native component callback must be synchronous');
    syncActors();
   }
  }
 });
}
function runPhase(input,phase,frame,host={}){return transaction(input,w=>runPhaseInPlace(w,phase,frame,host));}
function collisionHost(host){
 const contact=(w,a,b,event)=>{
  const p=a.player;if(!p)throw Error('Native Player collision component required');
  if(!Number.isSafeInteger(p.forceJumpXRaw)||!Number.isSafeInteger(p.forceJumpYRaw))throw Error('Native Player force-jump vector required');
  const previous=p.jumpVelocityRaw;p.jumpVelocityRaw={xRaw:p.forceJumpXRaw,yRaw:p.forceJumpYRaw};
  try {PlayerContact.onContact(view(w),event,Jump.createContactHost(jumpHost(w,host)));p.forceJumpXRaw=p.jumpVelocityRaw.xRaw;p.forceJumpYRaw=p.jumpVelocityRaw.yRaw;}
  finally {if(previous===undefined)delete p.jumpVelocityRaw;else p.jumpVelocityRaw=previous;}
 };
 return Callbacks.createHost({...host.collisionCallbacks,'PlayerComponent.OnContactAdded':contact,'PlayerComponent.OnContacted':contact},{
  actorForCollision:(w,b)=>w.actors.find(a=>a.entityId===b.entityId)||null,
  syncActorPosition:(w,b,p)=>{actor(w,b.entityId).positionRaw={xRaw:p.xRaw,yRaw:p.yRaw};}
 });
}
function collide(input,host={}){const w=clone(input);for(const c of allCollisions(w))c.actorExists=w.actors.some(a=>a.entityId===c.entityId);const out=Pipeline.step(w,collisionHost(host));return {world:out.state,result:{events:out.events,orderedIds:out.orderedIds,pushTrace:out.pushTrace,inertiaTrace:out.inertiaTrace}};}
function stepScene(input,frame,host={}){
 // A native stage host must supply the range/auto-scroll and camera phases.
 // Their placement is fixed; no silent omission or legacy per-player solver.
 let w=clone(input);w.frameNumber=frame.number;w.verified=frame.verified;Input.applySimulationInputs(w.inputs,frame.number,frame.packets);
 const update=runPhaseInPlace(w,'Update',frame,host),collision=collide(w,host);w=collision.world;
 const afterCollision=required(host,'afterCollisionBeforePost',w,frame);if(afterCollision&&typeof afterCollision.then==='function')throw Error('Native stage phase must be synchronous');
 const post=runPhaseInPlace(w,'Post',frame,host);
 const afterPost=required(host,'afterPost',w,frame);if(afterPost&&typeof afterPost.then==='function')throw Error('Native stage phase must be synchronous');
 return {world:w,result:{update,collision:collision.result,post}};
}
function initializeKeyPost(input,id,host={}){return transaction(input,w=>{const a=actor(w,id);Key.initPost(w,a,keyHost(w,host));return null;});}
module.exports={initializeKeyPost,receive,post1,post2,applyInputs,stepPlayer,postPlayer,runPhase,collide,stepScene,allCollisions,completePhysicsFidelity:false};
