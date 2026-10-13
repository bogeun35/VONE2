/* KeyComponent.OnCollided0x18186cc20; explicit native state, not proximity pickup.
 * Layer1/11 attach; layer12 phase2 + flagbit2; other layers ignored.
 * Same target return precedes excluded-target reset, which precedes flagbit1.
 * Ghost ActorType55 gatebit4, first pickup/steal sound22, exclusion0.25.
 * EXCLUDE_TIME = QFP+0x70 @18186d447/459 =16384 @181780fde.
 * Nonempty switch name requires resolved native validity and event61 host.
 * excludeTargetProc0x18186c960 subtracts dt and clears target at <=0.
 * This does not initialize/update attachment position or implement Key phases.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceKeyContact=api;})(globalThis,function(){
'use strict';
const EXCLUDE_TIME_RAW=16384;
function state(k){if(!k||!Number.isInteger(k.flags)||k.flags<0||k.flags>65535||!Number.isSafeInteger(k.excludeTimerRaw))throw Error('Native Key flags/timer required');for(const name of ['attachTargetId','excludeTargetId'])if(k[name]!==null&&typeof k[name]!=='string')throw Error('Resolved native Key '+name+' required');}
function onCollided(world,keyActor,keyCollision,event,host){
 const k=keyActor.key;state(k);const target=world.collisions.find(b=>b.id===event.targetId);if(!target)throw Error('Native Key target collision required');
 if(target.layer===12){k.phase=2;k.flags|=4;return {changed:true,reason:'goal'};}
 if(target.layer!==1&&target.layer!==11)return {changed:false,reason:'other-layer'};
 if(typeof target.entityId!=='string')throw Error('Resolved collision entity required');
 if(target.entityId===k.attachTargetId)return {changed:false,reason:'same-target'};
 if(target.entityId===k.excludeTargetId){k.excludeTimerRaw=EXCLUDE_TIME_RAW;return {changed:true,reason:'excluded-target'};}
 if(k.flags&2)return {changed:false,reason:'already-transferred'};
 if(typeof host?.actorById!=='function')throw Error('Key native Actor lookup required');
 const a=host.actorById(world,target.entityId);if(a&&a.actorType===55&&(k.flags&16))return {changed:false,reason:'ghost-already-stolen'};
 const sound=()=>{if(typeof host.playSe!=='function')throw Error('Key PlaySe host required');host.playSe(world,keyActor,22);};
 if(k.attachTargetId!==null){const previous=host.actorById(world,k.attachTargetId);if(previous&&previous.actorType===55){k.flags|=16;sound();}k.excludeTargetId=k.attachTargetId;k.excludeTimerRaw=EXCLUDE_TIME_RAW;}
 else {
  sound();if(typeof k.switchTargetName!=='string')throw Error('Key native switch target name required');
  if(k.switchTargetName.length){if(typeof host.isValidSwitchTargetName!=='function')throw Error('Key native target-name validation required');if(host.isValidSwitchTargetName(world,k.switchTargetName)){if(typeof host.notifyEvent!=='function')throw Error('Key event61 host required');host.notifyEvent(world,{eventType:61,sourceId:keyActor.entityId,targetName:k.switchTargetName});}}
 }
 k.attachTargetId=target.entityId;k.attachTargetLayer=target.layer;k.flags|=2;
 return {changed:true,reason:'attached'};
}
function excludeTargetProc(k,dtRaw){state(k);if(!Number.isSafeInteger(dtRaw))throw Error('Key exact delta time required');const t=BigInt.asIntN(64,BigInt(k.excludeTimerRaw)-BigInt(dtRaw));if(t<=0n){k.excludeTimerRaw=0;k.excludeTargetId=null;}else {const value=Number(t);if(!Number.isSafeInteger(value))throw Error('Key timer exceeds safe JSON integer');k.excludeTimerRaw=value;}}
return {onCollided,excludeTargetProc,EXCLUDE_TIME_RAW,completePhysicsFidelity:false};
});
