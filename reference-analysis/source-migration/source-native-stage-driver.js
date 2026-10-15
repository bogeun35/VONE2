'use strict';
/* Whole-world Stage.Update preparation adapter. Native scheduler is the
 * independently verified StagePreparation core, one phase per verified Update.
 * Actor creation/materialization and phase6 onUpdate are explicit hosts until
 * all of their native side effects are implemented. Never infer a fresh boot.
 */
const Preparation=require('./source-stage-preparation.js'),Factory=require('./source-native-actor-factory.js'),Camera=require('./source-camera-native.js'),Allocator=require('./source-native-entity-allocator.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function need(host,name,...args){if(typeof host?.[name]!=='function')throw Error('Native Stage driver '+name+' required');const result=host[name](...args);if(result&&typeof result.then==='function')throw Error('Native Stage driver synchronous host required: '+name);return result;}
function adopt(w,next){const stage=w.stage;Object.assign(stage,next.stage);next.stage=stage;Object.assign(w,next);}
function playerRange(w){
 if(!Array.isArray(w.scenePlayerRefs)||w.actorNames?.completeSnapshotVerified!==true||!Array.isArray(w.actorNames.entries))throw Error('Native Stage range actual player list and registered name dictionary required');
 const actor=id=>Allocator.isCurrent(w.entityAllocator,id)?w.actors.find(a=>a.entityId===id)||null:null;
 return Camera.calculatePlayerRange({stageFlags:w.stage.flags,previousRange:w.stage.playerRange,players:w.scenePlayerRefs.map(id=>actor(id)?.player||null),actors:w.actorNames.entries.map(e=>actor(e.entityId))});
}
function update(input,frame,host={}){
 const w=clone(input);if(typeof frame?.verified!=='boolean')throw Error('Native Stage driver Frame.IsVerified required');
 const f={...frame,isVerified:frame.verified,world:w},hooks={};
 for(const name of ['getOrAddSingleton','getSingletonEntityRef','initializeActorScene','initializeActorFactory','createMapEntity','createCameraEntity','createCollisionSceneEntity','createStageNoticeEntity','initializeMultiInput','getStageEventParam','notifyEvent','setActorSceneActive','setMapActive'])hooks[name]=(...args)=>need(host,name,w,...args);
 Object.assign(hooks,{
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
  updateActorFactory:(_factory,_f,threshold)=>need(host,'updateActorFactory',w,w.actorFactory,threshold,f),
  getPlayerActorCount:()=>{if(!Array.isArray(w.scenePlayerRefs))throw Error('Native Stage actual PlayerInfoList required');return w.scenePlayerRefs.length;},
  calcPlayerRange:()=>playerRange(w),
  onUpdate:()=>need(host,'onActiveStageUpdate',w,f)
 });
 const result=Preparation.update(w.stage,f,hooks);
 if(w.actorScene&&(result.prepared||result.onUpdate))w.actorSceneFlags=w.actorScene.flags;
 return {world:w,result};
}
module.exports={update,playerRange,completePhysicsFidelity:false};
