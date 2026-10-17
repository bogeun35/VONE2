/* DamageRect9 native Update/checkDamage/receiver, no game executed.
 * OnUpdate18180e190: Actor hiddenbit3@e208 gates activation ONLY;
 * collision0 inactivebit0@e242 ->PushBackTarget(mask3)@e291 ->enable@e2e1;
 * ALWAYS tail checkDamage@e31c. Pausebit4 is outer Lifecycle gate.
 * checkDamage18180e330 clears SHARED QUtility EntityList@get1817871c0:
 * get incrementsversion/size0@181787225/228; finalclear@18180eb01/eb05.
 * Own cache count captured@e555; live bounds@e5b1; target byID@e611,
 * type1 only@e61e; pooled43@e648/notify@e65a BEFORE appendref@e676.
 * Reverse Scene.PlayerList raw+30@e738: capturedcount@e775, livebounds@e7d7;
 * skip shared first-passref@e8d4; Player deadbit9@e952; collision0@e99a;
 * cached target EntityRef==DamageRect.entityRef@eaa0 ->43@eae3, firstmatchonly.
 * No active/layer/geometry/normal check on either cache pass, no cooldown.
 * Receiver4@18180ec3a compares signed64 actor.PosX+component.rect.X+Width
 * >= Camera.CalcCameraViewStageArea.X@ecc2..ecdb; others base Actor@ec61.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-native-event-pool.js'):root.SourceNativeEventPool,c?require('./source-pushback-target-query.js'):root.SourcePushBackTargetQuery,c?require('./source-actor-motion.js'):root.SourceActorMotion,c?require('./source-collision-broadphase.js'):root.SourceCollisionBroadphase,c?require('./source-camera-native.js'):root.SourceCameraNative,c?require('./source-actor-lifecycle.js'):root.SourceActorLifecycle);if(c)module.exports=api;root.SourceDamageRectUpdate=api;})(globalThis,function(Pool,Push,Motion,Broad,Camera,Lifecycle){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function fail(s){throw Error('DamageRectUpdate: '+s);}
function sync(v,name){if(v&&typeof v.then==='function')fail('synchronous native host required: '+name);return v;}
function call(h,n,...args){if(typeof h?.[n]!=='function')fail('actual native host required: '+n);return sync(h[n](...args),n);}
function i32(v,label){if(!Number.isInteger(v)||v< -2147483648||v>2147483647)fail('int32 '+label+' required');return v;}
function u32(v,label){if(!Number.isInteger(v)||v<0||v>0xffffffff)fail('uint32 '+label+' required');return v;}
function raw(v){if(!Number.isSafeInteger(v))fail('exact safe FP raw required');return v;}
function entity(v){if(typeof v!=='string'||!v.length)fail('resolved exact EntityRef key required');return v;}
function component(a){if(!a||a.actorType!==9)fail('actual Actor9 required');entity(a.entityId);u32(a.flags,'Actor flags');if(!a.damageRect||a.damageRect.entityId!==a.entityId)fail('actual matching DamageRect component required');return a.damageRect;}
function collision(c){if(!c||!Number.isInteger(c.flags)||c.flags<0||c.flags>65535)fail('native collision flags required');i32(c.id,'collision ID');entity(c.entityId);return c;}
function records(c){if(!Array.isArray(c?.contacts))fail('actual live contact cache required (empty must be explicit)');return c.contacts;}
function at(list,index,label){if(index>=list.length||list[index]===undefined)fail('native live QList bounds failure: '+label);return list[index];}
function scratch(world,host){const s=call(host,'entityListScratch',world);if(!s||!Array.isArray(s.items))fail('shared QUtility EntityList snapshot required');u32(s.version,'EntityList version');return s;}
function clear(s){s.items.length=0;s.version=(s.version+1)>>>0;}
function append(s,ref){entity(ref);s.version=(s.version+1)>>>0;s.items.push(ref);}
function notify43(world,a,targetId,host,trace){
 entity(targetId);const event=Pool.getEventParam(world.eventPool,a,43),mark={op:'notify43',targetId,sourceId:a.entityId,phase:trace.phase,pooledSlot:event===null?null:Pool.slotIndex(world.eventPool,event)};trace.push(mark);
 if(event===null){call(host,'nullEventDiagnostic',world,{eventType:43,targetId,sourceId:a.entityId});mark.returnValue=Pool.notifyEvent(null,null);return;}
 const target=call(host,'actorByEntity',world,targetId);if(target!==null&&(!target||target.entityId!==targetId))fail('Actor lookup must resolve exact ref or null');
 mark.returnValue=Pool.notifyEvent(target,event,(current,p)=>i32(call(host,'invokeOnRecvEvent',world,current,p),'receiver return'));
}
function checkDamage(world,a,host){
 component(a);const trace=[],list=scratch(world,host);clear(list);trace.push({op:'clearEntityList',phase:'entry'});
 const own=call(host,'collision0',world,a);if(own===null)fail('native checkDamage null collision0 dereference at0x18180e526');collision(own);
 const ownCache=records(own),ownCount=ownCache.length;
 for(let i=0;i<ownCount;i++){
  const record=at(ownCache,i,'DamageRect contacts'),id=i32(record?.id,'cached collision ID'),target=call(host,'collisionById',world,id);
  if(target===null)continue;collision(target);if(target.collisionType!==1)continue;
  trace.phase='own';notify43(world,a,entity(target.entityId),host,trace);
  // Re-read collider EntityRef AFTER synchronous callback, just like e66f.
  append(list,entity(target.entityId));trace.push({op:'appendFirstPassEntity',entityRef:target.entityId});
 }
 const players=call(host,'scenePlayerRefs',world);if(!Array.isArray(players))fail('actual live Scene.PlayerList required');const playerCount=players.length;
 for(let i=0;i<playerCount;i++){
  const ref=entity(at(players,i,'Scene.PlayerList'));
  // Fresh List enumerator for EACH player, against the current shared list.
  const version=list.version;let seen=false;for(let j=0;j<list.items.length;j++){if(list.version!==version)fail('native EntityList enumerator invalidated');if(entity(list.items[j])===ref){seen=true;break;}}
  if(list.version!==version)fail('native EntityList enumerator invalidated');if(seen)continue;
  const p=call(host,'playerByEntity',world,ref);if(p===null)continue;if(!p)fail('Player lookup must resolve component or null');u32(p.flags,'Player flags');if(p.flags&512)continue;
  const actor=call(host,'actorByEntity',world,ref);if(actor===null)continue;if(!actor||actor.entityId!==ref)fail('Actor lookup must resolve exact ref or null');
  const c=call(host,'collision0',world,actor);if(c===null)continue;collision(c);const cache=records(c),count=cache.length;
  for(let j=0;j<count;j++){
   const target=call(host,'collisionById',world,i32(at(cache,j,'Player contacts')?.id,'cached collision ID'));if(target===null)continue;collision(target);
   if(target.entityId!==a.damageRect.entityId)continue;
   trace.phase='reverse';notify43(world,a,ref,host,trace);break;
  }
 }
 clear(list);trace.push({op:'clearEntityList',phase:'exit'});delete trace.phase;return trace;
}
function onUpdate(world,a,host){
 component(a);const trace=[];
 if(!(a.flags&8)){
  const c=call(host,'collision0',world,a);
  if(c!==null){collision(c);if(c.flags&1){const blocked=call(host,'isCollidedByPushBackTarget',world,c,3);if(typeof blocked!=='boolean')fail('native PushBackTarget query boolean required');trace.push({op:'activationProbe',blocked,mask:3});if(!blocked)trace.push({op:'setCollisionActive',accepted:call(host,'setCollisionActive',world,a,true,a.damageRect.entityId)});}}
 }
 trace.push(...checkDamage(world,a,host));return trace;
}
function receive(world,a,event,host){const d=component(a),type=i32(event?.EventType,'QEventParam.EventType');if(type!==4)return i32(call(host,'commonActorReceive',world,a,event),'base receiver return');const area=call(host,'cameraStageArea',world);const right=BigInt.asIntN(64,BigInt(raw(d.rectRaw?.x))+BigInt(raw(d.rectRaw?.width))+BigInt(raw(a.positionRaw?.xRaw)));return right>=BigInt(raw(area?.x))?1:0;}
function planPlayerEvent43(a,event,shared){if(a?.actorType!==27||!a.player||event?.EventType!==43||event.CauseDead!==0)fail('actual Player and native DamageRect CauseDead0 event43 required');if(!Lifecycle)fail('shared Lifecycle Player death helper required');return Lifecycle.playerDeath({...a.player,actorId:a.entityId},{eventType:43,causeDead:0},shared);}
function createHost(options={}){
 function current(w){return typeof options.getWorld==='function'?sync(options.getWorld(w),'getWorld'):w;}
 function lookup(w,id){const v=current(w);if(!v?.storage)fail('complete collision storage required');const stored=Broad.getCollisionById(v.storage,i32(id,'collision ID'));if(!stored)return null;if(v.collisions!==undefined&&!Array.isArray(v.collisions))fail('live collision overlay array required');return v.collisions?.find(c=>c.id===id)||stored;}
 function collView(w){const v=current(w);if(!v?.storage)fail('complete collision storage required');const collisions=[];for(const name of ['primary','secondary']){const dict=v.storage[name];if(!dict||!Array.isArray(dict.entries)||!Number.isInteger(dict.usedCount))fail('physical collision dictionaries required');for(let i=0;i<dict.usedCount;i++){const row=dict.entries[i];if(row?.state===2){const c=lookup(w,row.key);if(!c)fail('native stored collision missing');collisions.push(c);}}}return {...v,collisions};}
 return {
  collisionById:lookup,
  collision0:(w,a)=>{if(!Array.isArray(a.collisionHolders))fail('actual Actor holder list required');if(a.collisionHolders.length===0)return null;return lookup(w,a.collisionHolders[0]?.collisionId);},
  scenePlayerRefs:w=>current(w)?.scenePlayerRefs,
  entityListScratch:w=>current(w)?.entityListScratch,
  actorByEntity:(w,ref)=>call(options,'actorByEntity',current(w),ref),
  playerByEntity:(w,ref)=>call(options,'playerByEntity',current(w),ref),
  isCollidedByPushBackTarget:(w,c,mask)=>Push.isCollidedByPushBackTarget(current(w),c,mask),
  setCollisionActive:(w,a,active,owner)=>Motion.setCollisionActive(collView(w),a,active,owner),
  invokeOnRecvEvent:(w,a,event)=>call(options,'invokeOnRecvEvent',current(w),a,event),
  nullEventDiagnostic:(w,detail)=>call(options,'nullEventDiagnostic',current(w),detail),
  commonActorReceive:(w,a,event)=>call(options,'commonActorReceive',current(w),a,event),
  cameraStageArea:w=>typeof options.cameraStageArea==='function'?call(options,'cameraStageArea',current(w)):Camera.stageAreaRaw(current(w)?.camera)
 };
}
function update(input,entityRef,options={}){const world=clone(input),host=createHost(options),a=call(host,'actorByEntity',world,entityRef);if(a===null)fail('DamageRect Actor missing');return {world,trace:onUpdate(world,a,host)};}
return {onUpdate,checkDamage,receive,planPlayerEvent43,createHost,update,supportedTypes:[9],completePhysicsFidelity:false,integration:{scope:'In-place native component callbacks, no creator/OnStart/ticks/render/AABB. Outer Lifecycle owns pausebit4 and phase order; this OnUpdate checks hiddenbit3 only for activation, then always checkDamage.',caches:'Live contacts arrays from actual committed native cache, in order. Count captured at loop entry; subsequent record/bounds/target lookups remain live. Scene.PlayerList explicitly supplied, never actors.filter or geometric scan. createHost reuses Broadphase lookup, PushBackTargetQuery and ActorMotion owner gates.',scratch:'entityListScratch {items:exact logical EntityRef[],version:uint32} is the SAME QUtility static List across all calls and reentrant callbacks. Explicit singleton snapshot required; getter clears size/increments version, append after notify increments, final clear only on successful tail. Reentrant checkDamage clears outer dedup contents; do not replace with a local Set.',events:'Shared NativeEventPool8 with actual source Actor, EventType43, reset CauseDead0/all payload defaults. Frame.NotifyEvent resolves target live, synchronously invokes exact receiver, then releases same leased object. Missing actor releases; exhausted pool diagnostics required, no throw/null dereference in native Frame.NotifyEvent; first-pass dedup append still occurs. Exceptions retain leased InUse and omit final scratch clear.',receivers:'Exact actorByEntity/playerByEntity must generation-check independent typed lookups. Full event dispatcher mandatory for actual targets. planPlayerEvent43 reuses Lifecycle.playerDeath CauseDead0 plan only; host must apply all patches/shared damage/nested events/audio/shake in native order. No implicit Player receiver or dropped effects. Receiver4 uses component rect and raw actor anchor vs actual native Camera stage left edge; other events go to base Actor host.',transaction:'update clones a whole world and returns only on success; in-place callbacks preserve native mutations on failure and permit synchronous reentrancy. External static scratch/eventpool/host effects must join caller transaction. JSON scratch projection does not emulate List backing capacity/managed OOM or heap topology.'}};
});
