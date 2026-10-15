/* Player Default non-immediate effects, static native only.
 * SetAnim0x1816beac0 gates@beb0a..5d, Player.currentAnim@beb5d,
 * Playerbit14 remap1/2/4->10/12/11@beb7c..bb0,
 * Actor.requestAnimationId native+2@bebca (not playing+1).
 * LookLeft0x18169de75/96 &Right0x18169df25/46:
 * Actorbit14 gates Actorbit10 set/clear, independent Playerbit14.
 * PlaySe0x1816a2260: StageToWorldPoint@2306, camera view +/-2FP
 * cull@2334..23aa, subtractcamera.position@23be, divideActor.baseScale
 * @23eb..2412, signed64shiftleft15>>16 half@240e..2433.
 * EventPlaySe metadata: volume+60,pitch+68,disableBlankTime+70;
 * FrameEvents.PlaySe0x18174bd50 onlyverifiedframe@bda4 queues event7@bdc5.
 * Default jump passesvolume(.5/1),pitch1@0x1816c6107..611d.
 * Notify38landing@0x1816c37af/c0; Notify43Post causesDead1@c0efd/f00.
 * Reuses native Camera, EventPool; exactreceiver registry remainshost.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-camera-native.js'):root.SourceCameraNative,typeof module==='object'&&module.exports?require('./source-native-event-pool.js'):root.SourceNativeEventPool);if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerEffects=api;})(globalThis,function(Camera,Pool){
'use strict';const F=65536;
function raw(n){if(!Number.isSafeInteger(n))throw Error('PlayerEffects exact raw required');return n;}
const b=x=>BigInt(raw(x)),i=x=>BigInt.asIntN(64,x),num=x=>raw(Number(x)),add=(x,y)=>num(i(b(x)+b(y))),sub=(x,y)=>num(i(b(x)-b(y))),half=x=>num(i(b(x)<<15n)>>16n),div=(x,y)=>{if(!y)throw Error('PlayerEffects zero native Actor.baseScale');return num(i(b(x)<<16n)/b(y));};
function byte(n){if(!Number.isInteger(n)||n<0||n>255)throw Error('PlayerEffects native byte required');return n;}
function bits(a){if(!Number.isInteger(a?.flags)||a.flags<0||a.flags>0xffffffff)throw Error('PlayerEffects native flags required');return a.flags;}
function ordinary(a){if(a?.actorType!==27||!a.player||![a.player.state,a.player.playerState].includes(1))throw Error('PlayerEffects ordinary Player state1 required');bits(a);bits(a.player);}
function nativeSetAnim(player,actor,id,stop){byte(id);byte(player.currentAnimationId);bits(player);if(typeof stop!=='boolean')throw Error('PlayerEffects native SetAnim stop flag required');const old=player.currentAnimationId;if(old===id&&!stop)return false;if(old&&!stop){if(id===2&&old!==1&&old!==3)return false;if(id===3&&old!==1&&old!==2)return false;}player.currentAnimationId=id;actor.requestAnimationId=player.flags&16384?({1:10,2:12,4:11}[id]??id):id;return true;}
function look(actor,left){bits(actor);if(actor.flags&16384)actor.flags=(left?actor.flags|1024:actor.flags&~1024)>>>0;}
function playSePlan(actor,effect,camera,verified,frameNumber){byte(effect.id);raw(effect.startRaw);raw(effect.param9Raw);if(!Camera)throw Error('PlayerEffects native Camera helper required');if(![0,1,2].includes(camera?.function)||!Number.isInteger(camera.flags)||(camera.flags&3))throw Error('PlayerEffects unknown/unlimit/unreturn camera branch refused');raw(actor.positionRaw?.xRaw);raw(actor.positionRaw?.yRaw);const pos=Camera.stageToWorld(camera,actor.positionRaw),r=Camera.viewAreaRaw(camera),pad=131072;if(pos.xRaw<sub(r.x,pad)||pos.xRaw>add(add(r.x,r.width),pad)||pos.yRaw>add(r.y,pad)||pos.yRaw<sub(sub(r.y,r.height),pad))return{queued:false,reason:'camera-cull'};const relative={xRaw:half(div(sub(pos.xRaw,camera.positionRaw.xRaw),actor.baseScaleRaw)),yRaw:half(div(sub(pos.yRaw,camera.positionRaw.yRaw),actor.baseScaleRaw))};if(typeof verified!=='boolean')throw Error('PlayerEffects native frame Verified required');if(!verified)return{queued:false,reason:'unverified'};if(!Number.isInteger(frameNumber)||frameNumber<-2147483648||frameNumber>2147483647)throw Error('PlayerEffects native frame Number int32 required');return{queued:true,event:{type:'PlaySe',nativeEventId:7,frameNumber,entityId:actor.entityId,seId:effect.id,positionRaw:relative,volumeRaw:effect.param9Raw,pitchRaw:effect.startRaw,isDisableCheckBlankTime:false}};}
function synchronous(value){if(value&&typeof value.then==='function')throw Error('PlayerEffects synchronous native host required');if(!Number.isInteger(value)||value<-2147483648||value>2147483647)throw Error('PlayerEffects native receiver int32 required');return value;}
function notify(world,actor,effect,host){if(![38,43].includes(effect.id))throw Error('PlayerEffects Default NotifyEvent only38/43 supported');if(!Pool)throw Error('PlayerEffects native EventPool helper required');const event=Pool.getEventParam(world.eventPool,actor,effect.id);if(effect.id===43){if(effect.isOutMap!==true)throw Error('PlayerEffects native outmap CauseDead1 proof required');if(event===null)throw Error('PlayerEffects native Post43 event pool exhausted');event.CauseDead=1;}return Pool.notifyEvent(actor,event,(target,param)=>{if(typeof host?.invokeOnRecvEvent!=='function')throw Error('PlayerEffects native receiver registry required');return synchronous(host.invokeOnRecvEvent(world,target,param));});}
/* This consumes ACCEPTED records from frozenDefault afterstoreSnapshot.
 * Player.currentAnimationId already includes all native SetAnim writes: doNOT
 * rerun gates/remap orwritehistoricalcurrentAnim overfinalPlayer snapshot.
 * Only bridge flatActor.animationId -> canonical requestAnimationId missingwrite.
 */
function applyPlayerEffect(world,actor,effect,host={}){ordinary(actor);switch(effect?.type){case 'SetAnim':byte(effect.id);byte(effect.actorAnimationId);if(typeof effect.stop!=='boolean')throw Error('PlayerEffects accepted SetAnim stop required');actor.requestAnimationId=effect.actorAnimationId;return{kind:'state',field:'requestAnimationId',value:effect.actorAnimationId};case 'LookLeft':case 'LookRight':look(actor,effect.type==='LookLeft');return{kind:'state',field:'flags',value:actor.flags};case 'PlaySe':{const plan=playSePlan(actor,effect,world.camera,world.verified,world.frameNumber);if(plan.queued){if(!Array.isArray(world.pendingFrameEvents))throw Error('PlayerEffects transactional pendingFrameEvents queue required');world.pendingFrameEvents.push(plan.event);}return{kind:'frame-event',...plan};}case 'NotifyEvent':return{kind:'receiver',returnValue:notify(world,actor,effect,host)};default:throw Error('PlayerEffects unsupported/immediate effect; correct native host required');}}
function createHost(host={}){return(world,actor,effect)=>applyPlayerEffect(world,actor,effect,host);}
return{nativeSetAnim,look,playSePlan,applyPlayerEffect,createHost,nativeConstants:{actorLookEnableBit:14,actorLookLeftBit:10,playerAnimRemapBit:14,audioCameraPaddingRaw:131072,framePlaySeEventId:7},supportedTypes:[],completePhysicsFidelity:false};
});
