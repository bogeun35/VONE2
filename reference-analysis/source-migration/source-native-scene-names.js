'use strict';
/* ActorScene.AddActor1816a71d0 successful logical name registration:
 * ContainsKey@733b, duplicate branch@7342 ->Invoke_OnExit@7467/Destroy@7475;
 * Add@73b1, ActorType present-bit@73be..73e7, SetInitPos@73ee,
 * SetBaseScale@7422. This file handles the name/type part before position.
 * Entries are a COMPLETE logical dictionary snapshot, not its physical heap
 * slots. No enumeration/allocation-order claims; exact QString hash/equality.
 * FindActor1816a7b80 rejects empty name then dictionary lookup then Frame.GetActor.
 */
const Q=require('./source-native-qstring.js'),Allocator=require('./source-native-entity-allocator.js');
function entries(w){const d=w.actorNames;if(d?.completeSnapshotVerified!==true||!Array.isArray(d.entries))throw Error('Native Scene complete logical name dictionary snapshot required');for(const e of d.entries){Q.byteCount(e.key);if(typeof e.entityId!=='string')throw Error('Native Scene name EntityRef required');}return d.entries;}
function lookup(w,key){const hash=Q.getHashCode(key);return entries(w).find(e=>Q.getHashCode(e.key)===hash&&Q.equals(e.key,key))||null;}
function addUnique(w,a){
 const key=Q.fromBytes(a.nameQStringBytes);if(lookup(w,key))throw Error('Native Scene duplicate-name branch requires actual OnExit and Destroy; no overwrite');
 if(!Number.isInteger(a.actorType)||a.actorType<0||a.actorType>255||!Array.isArray(w.presentOrdinals))throw Error('Native Scene supported ActorType/present bitset required');
 entries(w).push({key,entityId:a.entityId});if(!w.presentOrdinals.includes(a.actorType))w.presentOrdinals.push(a.actorType);
}
function findActor(w,text){const key=Q.fromString(text);return Q.findActor(key,{containsKey:q=>lookup(w,q)!==null,getValue:q=>lookup(w,q).entityId,getActor:ref=>{if(!Allocator.isCurrent(w.entityAllocator,ref))return null;return w.actors.find(a=>a.entityId===ref)||null;}});}
module.exports={addUnique,findActor,lookup,completePhysicsFidelity:false};
