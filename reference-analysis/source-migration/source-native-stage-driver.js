'use strict';
/* Whole-world Stage.Update adapter. Native preparation scheduler is the
 * independently verified StagePreparation core, one phase per verified Update.
 * Phase6 orders factory/input/typed scene/collision/range/scroll/post/camera
 * and status tail. Missing creator, typed query, Notice/audio and boot facts
 * remain explicit host boundaries. Never infer a fresh boot.
 */
const Preparation=require('./source-stage-preparation.js'),Factory=require('./source-native-actor-factory.js'),Camera=require('./source-camera-native.js'),Allocator=require('./source-native-entity-allocator.js');
const Bridge=require('./source-native-actor-bridge.js'),Auto=require('./source-stage-autoscroll.js'),InputUpdate=require('./source-stage-input-update.js'),Status=require('./source-stage-game-status.js'),Activation=require('./source-scene-activation.js');
const ActorStorage=require('./source-native-actor-storage.js');
const Names=require('./source-native-scene-names.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function need(host,name,...args){if(typeof host?.[name]!=='function')throw Error('Native Stage driver '+name+' required');const result=host[name](...args);if(result&&typeof result.then==='function')throw Error('Native Stage driver synchronous host required: '+name);return result;}
function adopt(w,next){Names.adoptPhysical(w,next);const stage=w.stage;Object.assign(stage,next.stage);next.stage=stage;Object.assign(w,next);}
function playerRange(w){
 if(!Array.isArray(w.scenePlayerRefs))throw Error('Native Stage range actual player list and registered name dictionary required');
 const actor=id=>Allocator.isCurrent(w.entityAllocator,id)?w.actors.find(a=>a.entityId===id)||null:null;
 return Camera.calculatePlayerRange({stageFlags:w.stage.flags,previousRange:w.stage.playerRange,players:w.scenePlayerRefs.map(id=>actor(id)?.player||null),actors:Names.registeredEntries(w).map(e=>actor(e.entityId))});
}
function activateSceneInPlace(w,scene,frame,active,owner,host={}){
 const result=Activation.setActive(scene,frame,active,owner,{
  getNameDictionaryPhysical:()=>{w.actorSceneFlags=scene.flags;return w.sceneNameDictionaryPhysical;},
  getActor:(_f,id)=>id===0||id===null?null:Allocator.isCurrent(w.entityAllocator,id)?w.actors.find(a=>a.entityId===id)||null:null,
  setActorActive:(_f,a,value,source)=>Bridge.setActorActiveInPlace(w,a,value,source,host.scene)
 });w.actorSceneFlags=scene.flags;return result;
}
function setActorSceneActive(input,frame,active,owner,host={}){const w=clone(input);return {world:w,result:activateSceneInPlace(w,w.actorScene,frame,active,owner,host)};}
function activeFrameInPlace(w,f,host){
 // Stage.onUpdate18170b3e0 captures entry flags. Inactive still runs scene
 // Update/Collision/Post; bit14 skips those plus Notice, but not verified time.
 const flags=w.stage.flags;if(!Number.isInteger(flags)||flags<0||flags>0xffffffff)throw Error('Native Stage flags required');
 const gates={suspendedAtEntry:!!(flags&16384),phaseEligibleAtEntry:!(flags&0x4003)},result={};
 w.frameNumber=f.number;w.verified=f.verified;
 const actor=id=>id===0||id===null?null:Allocator.isCurrent(w.entityAllocator,id)?w.actors.find(a=>a.entityId===id)||null:null;
 if(!gates.suspendedAtEntry){
  if(gates.phaseEligibleAtEntry){
   const out=Factory.update(w,w.stage.scrollPositionRaw.xRaw,host.factory);adopt(w,out.world);result.factory=out.result;
   result.input=InputUpdate.updateInput(w.stage,{lookupInputSingleton:kind=>{if(!w.singletons||!Object.hasOwn(w.singletons,kind))throw Error('Native Stage actual input singleton snapshot required');return w.singletons[kind];}});
  }
  w.actorSceneFlags=w.actorScene.flags;let out=Bridge.runPhase(w,'Update',f,host.scene);adopt(w,out.world);result.update=out.result;
  out=Bridge.collide(w,host.scene);adopt(w,out.world);result.collision=out.result;
  if(gates.phaseEligibleAtEntry){
   w.stage.playerRange=playerRange(w);
   const scroll={...w.stage.scrollParam,scrollPositionRaw:w.stage.scrollPositionRaw};
   result.autoScroll=Auto.updateAutoScroll(scroll,{dtRaw:f.dtRaw,stageFlags:w.stage.flags,cameraAreaRaw:Camera.stageAreaRaw(w.camera),players:w.scenePlayerRefs.map(id=>actor(id)?.player||null)});
   w.stage.scrollParam.delayTimerRaw=scroll.delayTimerRaw;w.stage.scrollPositionRaw=scroll.scrollPositionRaw;
  }
  w.actorSceneFlags=w.actorScene.flags;out=Bridge.runPhase(w,'Post',f,host.scene);adopt(w,out.world);result.post=out.result;
  if(gates.phaseEligibleAtEntry){const camera=Camera.update(w.camera,w.stage.playerRange,f.dtRaw,w.stage.scrollPositionRaw);w.cameraAreaRaw=camera.cameraAreaRaw;if(camera.scrollPositionRaw)w.stage.scrollPositionRaw=camera.scrollPositionRaw;result.camera=camera;}
 }
 const statusHost={getActorScene:()=>w.actorScene,getScenePlayerRefs:()=>w.scenePlayerRefs,getActor:(_f,id)=>actor(id),getPlayer:(_f,id)=>actor(id)?.player||null,
  getActorDictionary:()=>{if(Object.hasOwn(w,'sceneNameDictionaryPhysical'))return Names.statusDictionary(w);if(!w.actorDictionary)throw Error('Native Stage actual physical Actor dictionary required');return w.actorDictionary;},
  getEquip:(_f,p,index)=>{const a=w.actors.find(a=>a.player===p);if(!Array.isArray(a?.equipmentIds)||!(index in a.equipmentIds))throw Error('Native Stage actual Player equipment required');return a.equipmentIds[index]===null?0:a.equipmentIds[index];},
  getWarpGun:(_f,id)=>actor(id)?.warpGun||null,getMap:()=>w.map,getCamera:()=>w.camera,getStageNotice:()=>w.stageNotice,getDeltaTime:()=>f.dtRaw,
  invokeOnRecvEvent:(_f,a,param)=>Bridge.sortingEventInPlace(w,a,param,host.scene)};
 for(const name of ['sortEqualYInfos','notifyEvent','playSe','pollingNoticeCommands','updateNoticePhase'])statusHost[name]=(...args)=>need(host.status,name,w,...args);
 result.tail=Status.finishFrame(w,w.stage,f,statusHost,gates);return result;
}
function activeFrame(input,frame,host={}){if(input.actorStorageMode==='raw336')return ActorStorage.run(input,w=>activeFrame(w,frame,host));const w=clone(input);if(typeof frame?.verified!=='boolean')throw Error('Native Stage driver Frame.IsVerified required');const f={...frame,isVerified:frame.verified,world:w};return {world:w,result:activeFrameInPlace(w,f,host)};}
function update(input,frame,host={}){
 if(input.actorStorageMode==='raw336')return ActorStorage.run(input,w=>update(w,frame,host));
 const w=clone(input);if(typeof frame?.verified!=='boolean')throw Error('Native Stage driver Frame.IsVerified required');
 const f={...frame,isVerified:frame.verified,world:w},hooks={};
 for(const name of ['getOrAddSingleton','getSingletonEntityRef','initializeActorScene','initializeActorFactory','createMapEntity','createCameraEntity','createCollisionSceneEntity','createStageNoticeEntity','initializeMultiInput','getStageEventParam','notifyEvent','setActorSceneActive','setMapActive'])hooks[name]=(...args)=>need(host,name,w,...args);
 Object.assign(hooks,{
  setActorSceneActive:(scene,f,active,owner)=>typeof host.setActorSceneActive==='function'?need(host,'setActorSceneActive',w,scene,f,active,owner):activateSceneInPlace(w,scene,f,active,owner,host),
  getStageInitParam:()=>w.stageInitParam,
  getActorScene:()=>w.actorScene,
  getActorFactory:()=>w.actorFactory,
  getCamera:()=>w.camera,
  getMap:()=>w.map,
  getGame:()=>w.game,
  initPlayerIndexList:(scene,_f,shuffle)=>{
   const p=w.stageInitParam?.stage;if(!p||!!p.shufflePlayer!==shuffle)throw Error('Native Stage selected shuffle parameter mismatch');
   w.actorSceneFlags=scene.flags;const out=Factory.initializePlayerIndices(w,p);adopt(w,out.world);w.actorScene.flags=w.actorSceneFlags;
  },
  getPlayerIndexCount:()=>{if(!Array.isArray(w.playerIndices?.indexList))throw Error('Native Stage actual index list required');return w.playerIndices.indexList.length;},
  updateActorFactory:(_factory,_f,threshold)=>{
   if(typeof host.updateActorFactory==='function')return need(host,'updateActorFactory',w,w.actorFactory,threshold,f);
   const out=Factory.update(w,threshold,host.factory);adopt(w,out.world);return out.result;
  },
  getPlayerActorCount:()=>{if(!Array.isArray(w.scenePlayerRefs))throw Error('Native Stage actual PlayerInfoList required');return w.scenePlayerRefs.length;},
  calcPlayerRange:()=>playerRange(w),
  onUpdate:()=>typeof host.onActiveStageUpdate==='function'?need(host,'onActiveStageUpdate',w,f):activeFrameInPlace(w,f,host)
 });
 const result=Preparation.update(w.stage,f,hooks);
 if(w.actorScene&&(result.prepared||result.onUpdate))w.actorSceneFlags=w.actorScene.flags;
 return {world:w,result};
}
module.exports={update,activeFrame,setActorSceneActive,playerRange,completePhysicsFidelity:false};
