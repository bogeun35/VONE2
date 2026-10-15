/* ActorSceneComponent.SetActive0x1816a74f0, static native bytes only.
 * No same-state/owner/verified gate. Scene ushort flags native+24 bit0
 * inactive written FIRST@7592..75b2, even before Frame null check@7604.
 * Resolve name QDictionary pointer native Scene+28 ONCE@760d..7619;
 * captured header local rsi@76e2, heap/frame r14@76d8. Cursor starts-1
 * @7661, increment@7716; compare LIVE header+0c usedCount@7725.
 * Each slot resolved using live entry handle/stride@776f..7782; state int32
 * native entry+8==2@778b only. Value EntityRef at entry+header.ValueOffset
 * @7791..779b. No hash/key/alphabetic/player/active/type filter or dedup.
 * Frame.GetActor@77ba; null skips@77c5; Actor.SetActive@77f2 receives same
 * captured active byte r13 and owner rdi@77e0..77ef on every valid actor.
 * Actor.SetActive18169ed70 ALWAYS obtains event49@edd1, overwrites event
 * NotifiedActor=owner@edde /IsActive=active@ede5 then NotifyEvent@ee03.
 * Actor common owner gates/registry/equipment/collision remain mandatory host.
 * AddActor1816a73b1->QDictionary.Add180024500 ->insert1807fb690@2463e:
 * freeHead pop@7fb76a..76f or append index usedCount++@7fb7b3..7c5;
 * slot.state2@7fb825. exitActors1816a6f60 ->remove1807fc010:
 * mark state1@7fc1ce, link slot into freeHead@1c7..1d8; usedCount not compacted.
 * Thus logical name insertion order is not a general physical slot order.
 * This module consumes explicit verified physical descriptors; no hash table,
 * allocator, key lookup, insert/remove/resize reconstruction or implicit sort.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceSceneActivation=api;})(globalThis,function(){
'use strict';
const SCHEMA='SceneNameDictionaryPhysicalV1';
function object(x,k){if(!x||typeof x!=='object'||Array.isArray(x))throw Error('SceneActivation native '+k+' object required');return x;}
function int32(n,k){if(!Number.isInteger(n)||n<-2147483648||n>2147483647)throw Error('SceneActivation native int32 required: '+k);return n;}
function ownerRef(r){if(r===null||r===0||(typeof r==='string'&&r.length>0)||Number.isSafeInteger(r))return r;throw Error('SceneActivation explicit captured owner EntityRef required');}
function valueRef(r){if(r===0||(typeof r==='string'&&r.length>0)||Number.isSafeInteger(r))return r;throw Error('SceneActivation explicit physical EntityRef value required (0 for none)');}
function flags(scene){object(scene,'Scene');if(!Number.isInteger(scene.flags)||scene.flags<0||scene.flags>65535)throw Error('SceneActivation Scene.flags ushort required');return scene.flags;}
function call(h,k,...args){if(typeof h?.[k]!=='function')throw Error('SceneActivation required native host: '+k);const r=h[k](...args);if(r&&typeof r.then==='function')throw Error('SceneActivation synchronous native host required: '+k);return r;}
function bound(d){object(d,'captured physical dictionary header');if(d.schema!==SCHEMA||d.completePhysicalSnapshotVerified!==true)throw Error('SceneActivation verified physical dictionary required; logical name projection is not enumeration evidence');if(typeof d.headerRef!=='string'||!d.headerRef.length)throw Error('SceneActivation actual captured dictionary headerRef required');if(!Array.isArray(d.slots))throw Error('SceneActivation complete physical slot array required');const n=int32(d.usedCount,'header.usedCount');if(n<0||n>d.slots.length)throw Error('SceneActivation all physical slots below usedCount required');return n;}
function slot(d,index){const e=object(d.slots[index],'physical slot');if(e.physicalIndex!==index)throw Error('SceneActivation physicalIndex must equal enumerated slot index; no compacted/reordered logical entries');int32(e.state,'slot.state');if(e.state===2)valueRef(e.valueEntityRef);return e;}
function validatePhysicalSnapshot(d){const n=bound(d);for(let i=0;i<n;i++)slot(d,i);return d;}
function setActive(scene,frame,active,owner,host={}){if(typeof active!=='boolean')throw Error('SceneActivation native active boolean required');ownerRef(owner);const before=flags(scene);scene.flags=active?before&~1:before|1;/* Native write happens before dictionary/Frame failure; do not roll back. */object(frame,'Frame');const d=validatePhysicalSnapshot(call(host,'getNameDictionaryPhysical',frame,scene)),headerRef=d.headerRef,visited=[];let attempted=0,missing=0;for(let i=0;i<bound(d);i++){if(d.headerRef!==headerRef)throw Error('SceneActivation captured header identity invalidated; replacement header requires separate native call');const e=slot(d,i);if(e.state!==2)continue;const entityRef=e.valueEntityRef;const actor=call(host,'getActor',frame,entityRef);if(actor===null){visited.push({physicalIndex:i,entityRef,foundActor:false});missing++;continue;}object(actor,'resolved Actor');visited.push({physicalIndex:i,entityRef,foundActor:true});call(host,'setActorActive',frame,actor,active,owner);attempted++;}return{headerRef,requestedActive:active,attempted,missing,visited};}
function createStageHost(nativeHost){object(nativeHost,'activation host');return{setActorSceneActive:(scene,frame,active,owner)=>setActive(scene,frame,active,owner,nativeHost)};}
return{SCHEMA,validatePhysicalSnapshot,setActive,createStageHost,supportedTypes:[],completePhysicsFidelity:false};
});
