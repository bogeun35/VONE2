/* Actor.Initialize verified pure patch, not the factory AddComponent operation.
 * Factory helper1801f9ad0 is Frame.AddComponent<ActorComponent> (spec95521),
 * not get-or-add: an existing Actor takes a null/invalid branch. Only verified
 * absent-component defaults match ordinary factory creation. Preserving input
 * bytes below describes Initialize itself, not existing-component creation.
 * EntityRef +20 @18169cc8e; type ushort +6 @18169cc9c; QString +130 @18169ccbd.
 * BaseScale @18169cd02; Scale(65536,65536) @18169ccfa/cd06, data182e87af0;
 * Weight65536 @18169cd0d; fresh holder capacity4 @18169cd41, handle @18169cdc5;
 * existing Flags OR bit14 @18169cdd4. Other component bytes are preserved.
 * AddActor: SetInitPos18169d230 then SetBaseScale1816a08c0; collision operations
 * are delegated to the existing PlayerCollisionInit core. PrePos is untouched.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-player-collision-init.js'):root.SourcePlayerCollisionInit);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceActorInitialization=api;})(globalThis,function(Core){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function integer(x,label){if(!Number.isSafeInteger(x))throw Error('ActorInitialization exact integer required: '+label);return x;}
function point(p){integer(p?.xRaw,'position.x');integer(p?.yRaw,'position.y');return copy(p);}
// Frame.AddComponent calls Activator.CreateInstance<ActorComponent> @1801f9b2f.
// Generic MethodSpec82962 -> method3377, method-inst486 -> value type4490;
// ActorComponent has no instance .ctor. Only the ABSENT-component branch adds it.
function defaultMaterialized(options){
 if(options?.actorComponentAbsent!==true)throw Error('ActorInitialization verified absent Actor component required; existing prototype is preserved');
 const a={flags:0,actorType:0,entityId:null,collisionHolderListHandle:0,collisionHolders:[],nameQStringBytes:Array(32).fill(0),angleRaw:0,baseScaleRaw:0,weightRaw:0,scaleXRaw:0,scaleYRaw:0,jumpEventType:0,playingAnimationId:0,requestAnimationId:0,sortingOrder:0};
 for(const k of ['disableAnimationEntity','disableDisplayEntity','inactiveCollisionEntity','inactiveEntity','invisibleEntity','pauseEntity'])a[k]=null;
 for(const k of ['accelerationRaw','collisionVelocityRaw','initPositionRaw','jumpVelocityRaw','offsetDrawPositionRaw','positionRaw','prePositionRaw','preVelocityRaw','velocityRaw','warpPositionRaw','warpVelocityRaw','windRaw'])a[k]={xRaw:0,yRaw:0};
 return a;
}
function initialize(materialized,param){
 if(!materialized||!Number.isInteger(materialized.flags)||materialized.flags<0||materialized.flags>0xffffffff)throw Error('ActorInitialization materialized Actor flags required; zero defaults are not inferred');
 if(typeof param?.entityId!=='string'||!param.entityId)throw Error('ActorInitialization actual allocated EntityRef required');
 integer(param.actorType,'ActorType');integer(param.stageScaleRaw,'Stage.BaseScale');integer(param.collisionHolderListHandle,'allocated holder handle');
 if(param.actorType<0||param.actorType>0xffffffff)throw Error('ActorInitialization uint32 creation ActorType required');
 if(param.collisionHolderListHandle< -2147483648||param.collisionHolderListHandle>2147483647)throw Error('ActorInitialization int32 holder handle required');
 if(!Array.isArray(param.nameQStringBytes)||param.nameQStringBytes.length!==32||param.nameQStringBytes.some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('ActorInitialization resolved QStringUtf8_32 bytes required; unique name/truncation not inferred');
 const actor=copy(materialized);
 Object.assign(actor,{entityId:param.entityId,actorType:param.actorType&65535,nameQStringBytes:copy(param.nameQStringBytes),baseScaleRaw:param.stageScaleRaw,scaleXRaw:65536,scaleYRaw:65536,weightRaw:65536,collisionHolderListHandle:param.collisionHolderListHandle,collisionHolders:[],flags:(actor.flags|16384)>>>0});
 return actor;
}
function register(actor,collisions,position,stageScaleRaw,options){
 if(options?.uniqueNameVerified!==true)throw Error('ActorInitialization AddActor unique-name branch required; duplicate exits/destroys need host');
 if(!Core)throw Error('ActorInitialization shared PlayerCollisionInit required');
 const p=point(position);integer(stageScaleRaw,'Stage.BaseScale');
 if(!Array.isArray(actor.collisionHolders)||!Array.isArray(collisions))throw Error('ActorInitialization ordered holders and resolved collisions required');
 // Native lookup skips missing IDs and uses the holder sync flag, not a collider hint.
 if(new Set(actor.collisionHolders.map(h=>h.collisionId)).size!==actor.collisionHolders.length||new Set(collisions.map(c=>c.id)).size!==collisions.length)throw Error('ActorInitialization duplicate collision IDs require native repeated-lookup handling');
 const selected=actor.collisionHolders.map(h=>{if(typeof h.syncPos!=='boolean')throw Error('ActorInitialization explicit holder syncPos required');const c=collisions.find(c=>c.id===h.collisionId);return c?{...copy(c),isEnableSyncPos:h.syncPos}:null;}).filter(Boolean);
 const positioned=Core.setInitPosition(selected,p),scaled=Core.applyBaseScale(positioned,actor,stageScaleRaw),out=copy(actor);
 out.initPositionRaw=copy(p);out.positionRaw=copy(p);out.baseScaleRaw=stageScaleRaw;
 return {actor:out,collisions:collisions.map(c=>{const i=scaled.findIndex(s=>s.id===c.id);if(i<0)return copy(c);const value=scaled[i];if(Object.hasOwn(c,'isEnableSyncPos'))value.isEnableSyncPos=c.isEnableSyncPos;else delete value.isEnableSyncPos;return value;}),phases:{actorSetInitPos:positioned,actorSetBaseScale:scaled}};
}
return {defaultMaterialized,initialize,register,supportedTypes:[],completePhysicsFidelity:false};
});
