/* Thorn/NormalThorn Update only; read-only native reconstruction.
 * NormalThorn181889505 resolves common Thorn by NormalThorn.EntityRef,
 * calls common OnUpdate181889537 with reusable=false.
 * Common181721013 belt first ->181721042 phase. Belt raw+2 cleared if phase!=0
 * @181721081..87; phase1 native LUT normalize@181721206 and length@1259;
 * phase2 per-call min(abs(total-distance),beltSpeed)@10f4..10f7,
 * snap to endpoint0 and redispatch@1182..118e; no dt or leftover budget.
 * Phase table181721704:0wait132e,1start13a7,2move1561,3return1537,
 * 4disable14db,5fade15ec. 0->1->2 and4->5 same call;2->4 returns.
 * sort54=1100@18172140d; first two holders push3@181721448;
 * direction*speed@1498/14ab THEN velocity*speed@1587/159d each call.
 * distance+=speed@15d1; no remaining-distance clamp; no Actor.Velo write.
 * fadeSpeed262144@1817227b1; timer1@181721522; timer-=dt*4@1639..1644.
 * expired normal sets Actor bit13@166e, timer0/phase0; pooled calls Actor
 * SetActive(false,componentEntity)@16c1 then Pos0/clear Thorn flag1/timer0/phase0.
 * Alpha is ONLY written for positive remaining timer@16ee; never forcezero.
 * event61 phase0 & abs(speed)>=4 ->phase1@181721ad8..1b0b, no immediate move.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath,c?require('./source-native-event-pool.js'):root.SourceNativeEventPool,c?require('./source-thorn-native.js'):root.SourceThornNative,c?require('./source-actor-motion.js'):root.SourceActorMotion,c?require('./source-collision-broadphase.js'):root.SourceCollisionBroadphase);if(c)module.exports=api;root.SourceThornUpdate=api;})(globalThis,function(MathCore,Pool,Native,Motion,Broad){
'use strict';
const F=65536,FADE=262144,MARGIN=13107200,CHIP=3145728,DIRECTIONS=Object.freeze([{xRaw:0,yRaw:-F},{xRaw:0,yRaw:F},{xRaw:-F,yRaw:0},{xRaw:F,yRaw:0}].map(Object.freeze)),clone=x=>JSON.parse(JSON.stringify(x));
const fail=s=>{throw Error('ThornUpdate: '+s);};
function raw(v){if(!Number.isSafeInteger(v))fail('exact safe signed FP raw required');return v;}
function num(v){return raw(Number(BigInt.asIntN(64,v)));}
const add=(a,b)=>num(BigInt(raw(a))+BigInt(raw(b))),sub=(a,b)=>num(BigInt(raw(a))-BigInt(raw(b))),mul=(a,b)=>num(BigInt.asIntN(64,BigInt(raw(a))*BigInt(raw(b)))>>16n),abs=v=>raw(Math.abs(raw(v)));
function vec(v){raw(v?.xRaw);raw(v?.yRaw);return v;}
function byte(v,label){if(!Number.isInteger(v)||v<0||v>255)fail('native byte '+label+' required');return v;}
function state(a,t=a?.thorn){if(!a||typeof a.entityId!=='string'||!Number.isInteger(a.flags)||a.flags<0||a.flags>0xffffffff)fail('actual Actor identity/flags required');vec(a.positionRaw);if(!t||typeof t.entityId!=='string')fail('actual common Thorn component required');for(const k of ['direction','moveDirection','phase','beltPhase'])byte(t[k],k);if(!Number.isInteger(t.flags)||t.flags<0||t.flags>65535)fail('Thorn flags ushort required');for(const k of ['alphaRaw','beltDistanceRaw','beltMoveDistanceRaw','beltSpeedRaw','distanceRaw','moveDistanceRaw','speedRaw','timerRaw','waitTimeRaw'])raw(t[k]);for(const k of ['beltPosition0Raw','beltPosition1Raw','beltVelocityRaw','velocityRaw'])vec(t[k]);return t;}
function call(h,n,...args){if(typeof h?.[n]!=='function')fail('actual native host required: '+n);const r=h[n](...args);if(r&&typeof r.then==='function')fail('synchronous native host required: '+n);return r;}
function intResult(r){if(!Number.isInteger(r)||r< -2147483648||r>2147483647)fail('native receiver int32 return required');return r;}
function startMove(t){if(abs(t.speedRaw)<4)return false;t.phase=1;return true;}
function updateBeltPhase(world,a,t){
 state(a,t);const trace=[];if(t.phase!==0)t.beltPhase=0;
 const seen=new Set();for(;;){
  if(t.beltPhase!==1&&t.beltPhase!==2)return trace;
  const key=JSON.stringify([t.beltPhase,a.positionRaw,t.beltDistanceRaw,t.beltMoveDistanceRaw,t.beltVelocityRaw]);if(seen.has(key))fail('native nonterminating belt cycle refused; no artificial frame cutoff');seen.add(key);
  if(t.beltPhase===1){
   const delta={xRaw:sub(t.beltPosition1Raw.xRaw,a.positionRaw.xRaw),yRaw:sub(t.beltPosition1Raw.yRaw,a.positionRaw.yRaw)};
   t.beltVelocityRaw=MathCore.normalizeRaw(delta);t.beltMoveDistanceRaw=MathCore.lengthRaw(delta);t.beltDistanceRaw=0;t.beltPhase=2;trace.push({op:'prepareBeltSegment',lengthRaw:t.beltMoveDistanceRaw});continue;
  }
  const remaining=abs(sub(t.beltMoveDistanceRaw,t.beltDistanceRaw)),speed=raw(t.beltSpeedRaw),step=remaining<=speed?remaining:speed;
  a.positionRaw={xRaw:add(a.positionRaw.xRaw,mul(t.beltVelocityRaw.xRaw,step)),yRaw:add(a.positionRaw.yRaw,mul(t.beltVelocityRaw.yRaw,step))};t.beltDistanceRaw=add(t.beltDistanceRaw,step);trace.push({op:'moveBelt',remainingRaw:remaining,stepRaw:step});
  if(remaining>speed)return trace;
  a.positionRaw={...t.beltPosition0Raw};t.beltPhase=1;trace.push({op:'wrapBeltToStart'});
 }
}
function setCollisionPushBackTarget(world,a,value,host){byte(value,'pushBackTarget');if(!Array.isArray(a.collisionHolders))fail('actual holder order required');for(let i=0;i<2;i++){if(i>=a.collisionHolders.length)continue;const id=a.collisionHolders[i]?.collisionId;if(!Number.isInteger(id)||id< -2147483648||id>2147483647)fail('native collision ID required');const c=call(host,'collisionById',world,id);if(c!==null){if(!c)fail('collision lookup must return actual pointer or null');c.pushBackTarget=value;}}}
function calcMoveDistance(world,a,t,host){byte(t.direction,'direction');vec(a.positionRaw);const m=call(host,'mapDimensions',world);for(const k of ['width','height'])if(!Number.isInteger(m?.[k])||m[k]<0||m[k]>65535)fail('actual Map UInt16 dimensions required');let distance=0;switch(t.direction){case 0:distance=a.positionRaw.yRaw;break;case 1:distance=sub(m.height*CHIP,a.positionRaw.yRaw);break;case 2:distance=a.positionRaw.xRaw;break;case 3:distance=sub(m.width*CHIP,a.positionRaw.xRaw);break;}return add(abs(distance),MARGIN);}
function sorting(world,a,host){const e=Pool.getEventParam(world.eventPool,a,54);if(e===null)fail('native phase1 sorting54 null event parameter failure');e.SortingOrder=1100;return Pool.notifyEvent(a,e,(target,param)=>intResult(call(host,'invokeOnRecvEvent',world,target,param)));}
function updatePhase(world,a,t,dtRaw,reusable,host){
 state(a,t);raw(dtRaw);if(dtRaw<0||typeof reusable!=='boolean')fail('nonnegative native dt and explicit reusable boolean required');const trace=[];
 for(;;){
  switch(t.phase){
   case 0:if(t.waitTimeRaw<=0)return trace;t.timerRaw=add(t.timerRaw,dtRaw);trace.push({op:'wait',timerRaw:t.timerRaw});if(t.timerRaw<t.waitTimeRaw||!startMove(t))return trace;continue;
   case 1:{
    trace.push({op:'sorting54',sortingOrder:1100});sorting(world,a,host);
    setCollisionPushBackTarget(world,a,3,host);trace.push({op:'setCollisionPushBackTarget',value:3,holderLimit:2});
    const dir=DIRECTIONS[byte(t.moveDirection,'moveDirection')];if(!dir)fail('native direction vector array bounds failure after sorting/push changes');
    t.velocityRaw={xRaw:mul(dir.xRaw,t.speedRaw),yRaw:mul(dir.yRaw,t.speedRaw)};t.moveDistanceRaw=calcMoveDistance(world,a,t,host);t.distanceRaw=0;t.phase=2;trace.push({op:'startMove',velocityRaw:{...t.velocityRaw},moveDistanceRaw:t.moveDistanceRaw});continue;
   }
   case 2:a.positionRaw={xRaw:add(a.positionRaw.xRaw,mul(t.velocityRaw.xRaw,t.speedRaw)),yRaw:add(a.positionRaw.yRaw,mul(t.velocityRaw.yRaw,t.speedRaw))};t.distanceRaw=add(t.distanceRaw,t.speedRaw);trace.push({op:'move',distanceRaw:t.distanceRaw});if(t.distanceRaw>=t.moveDistanceRaw)t.phase=4;return trace;
   case 3:return trace;
   case 4:call(host,'setCollisionActive',world,a,false,t.entityId);trace.push({op:'disableCollisions',owner:t.entityId});t.phase=(t.phase+1)&255;t.timerRaw=F;continue;
   case 5:t.timerRaw=sub(t.timerRaw,mul(dtRaw,FADE));trace.push({op:'fade',timerRaw:t.timerRaw});if(t.timerRaw>0){t.alphaRaw=t.timerRaw;return trace;}
    if(!reusable){a.flags=(a.flags|8192)>>>0;t.timerRaw=0;t.phase=0;trace.push({op:'requestExitBit13'});return trace;}
    call(host,'setActive',world,a,false,t.entityId);a.positionRaw={xRaw:0,yRaw:0};t.flags&=~2;t.timerRaw=0;t.phase=0;trace.push({op:'deactivateReusable',owner:t.entityId});return trace;
   default:return trace;
  }
 }
}
function onUpdate(world,a,dtRaw,host,options={}){const t=state(a,options.thorn??a.thorn);if(typeof options.reusable!=='boolean')fail('explicit common Thorn reusable argument required');const trace=updateBeltPhase(world,a,t);trace.push(...updatePhase(world,a,t,dtRaw,options.reusable,host));return trace;}
function commonForNormal(world,a,host){if(!a?.normalThorn||typeof a.normalThorn.entityId!=='string')fail('actual NormalThorn component required');const t=call(host,'thornByEntity',world,a.normalThorn.entityId);if(t===null)fail('native NormalThorn common Thorn lookup null dereference');if(!t||t.entityId!==a.normalThorn.entityId)fail('exact common Thorn lookup required');return t;}
function normalOnUpdate(world,a,dtRaw,host){return onUpdate(world,a,dtRaw,host,{thorn:commonForNormal(world,a,host),reusable:false});}
function receive(world,a,t,event,host){state(a,t);if(!Number.isInteger(event?.EventType))fail('native QEventParam required');if(event.EventType!==61)return intResult(call(host,'commonActorReceive',world,a,event));if(t.phase===0)startMove(t);return 0;}
function normalReceive(world,a,event,host){return receive(world,a,commonForNormal(world,a,host),event,host);}
function createHost(options={}){
 const current=w=>typeof options.getWorld==='function'?call(options,'getWorld',w):w;
 function lookup(w,id){const v=current(w);if(!v?.storage)fail('complete collision storage required');const stored=Broad.getCollisionById(v.storage,id);return stored?(v.collisions?.find(c=>c.id===id)||stored):null;}
 function view(w){const v=current(w);if(!v?.storage)fail('complete collision storage required');const collisions=[];for(const name of ['primary','secondary']){const d=v.storage[name];if(!d||!Array.isArray(d.entries)||!Number.isInteger(d.usedCount))fail('physical collision dictionary required');for(let i=0;i<d.usedCount;i++)if(d.entries[i]?.state===2)collisions.push(lookup(w,d.entries[i].key));}return {...v,collisions};}
 return {collisionById:lookup,setCollisionActive:(w,a,active,owner)=>Motion.setCollisionActive(view(w),a,active,owner),mapDimensions:w=>call(options,'mapDimensions',current(w)),thornByEntity:(w,ref)=>call(options,'thornByEntity',current(w),ref),invokeOnRecvEvent:(w,a,e)=>call(options,'invokeOnRecvEvent',current(w),a,e),setActive:(w,a,active,owner)=>call(options,'setActive',current(w),a,active,owner),commonActorReceive:(w,a,e)=>call(options,'commonActorReceive',current(w),a,e)};
}
function update(input,entityRef,dtRaw,options){const world=clone(input),a=call(options,'actorByEntity',world,entityRef);if(a===null)fail('NormalThorn Actor missing');return {world,trace:normalOnUpdate(world,a,dtRaw,createHost(options))};}
return {onUpdate,normalOnUpdate,updateBeltPhase,updatePhase,startMove,calcMoveDistance,setCollisionPushBackTarget,receive,normalReceive,createHost,update,nativeCallbacks:Object.freeze({requestDisappear:Native.requestDisappear,onCollided:Native.onCollided,onContacted:Native.onContacted,onPushedBack:Native.onPushedBack,killPlayer:Native.killPlayer}),constants:Object.freeze({fadeSpeedRaw:FADE,directionVectors:DIRECTIONS,moveDistanceMarginRaw:MARGIN,chipSizeRaw:CHIP,speedEpsilonRaw:4}),supportedTypes:[93],completePhysicsFidelity:false,integration:{scope:'Common Thorn update and NormalThorn wrapper/receiver only. No Reset/Parse/creator copy. Normal wrapper resolves common Thorn through actual NormalThorn.entityId typed lookup, false reusable argument. Other Thorn wrappers must pass their exact reusable argument explicitly.',timing:'Belt first, phase second. Wait/fade use raw Frame.DeltaTime; both movement paths are per callback, no dt. Same-call phase redispatch0->1->2 and4->5; distance completion2->4 returns until next Update. ActorMotion.Update1/Update2/Post and collision cache commit remain caller phase schedule; this helper does not sync cache or execute Actor motion again.',math:'Existing exact extracted FPSqrt LUT/normalize from DistanceConstraintMath; signed64 wrap/multiply/arithmetic shifts, safe integer projection only. Belt complete wraps to endpoint0 and starts full next leg same call, no unused-budget model. Native nonterminating belt cycles detected/refused instead of hanging or truncating iterations.',events:'Shared NativeEventPool54 sorting1100 before push3 and velocity/distance work. Null pool explicitly fails (native null check); synchronous receiver can mutate live Thorn before later reads, phase2 tail overwrites callback phase mutations. Event61 idle+epsilon4 setsphase1 only, no alpha/timer/reset/collision owner changes; other events exact base host.',owners:'First TWO holders pushBackTarget3, no flags/active/cache changes. Phase4 Motion.SetCollisionActive(false,componentEntity) uses actual owner gate and ALL holders; reusable fade expiration requires exact pooled Actor.SetActive host before Pos0/flag1 clear. Normal expiration sets Actor exitbit13, not immediate Destroy. Alpha retains last positive sample on expiration.',callbacks:'nativeCallbacks are EXACT existing source-thorn-native function references; no collision/kill/requestDisappear duplication. Caller supplies their existing actor/player/damage/audio hosts. requestDisappear clears Actor velocity and setsphase4; this update phase2 writes Actor position directly and stores separate Thorn velocity.',transaction:'In-place native callbacks preserve mutations/leases on exception; update() clones whole world. Host effects must mutate only supplied draft and share actual event pool/typed objects; no duplicated Thorn authority or snapshot copies returned by live lookup. Physical heap, allocator/pool snapshots and lifecycle exit remain external.'}};
});
