'use strict';
/* ActorScene.AddActor1816a71d0 successful logical name registration:
 * ContainsKey@733b, duplicate branch@7342 ->Invoke_OnExit@7467/Destroy@7475;
 * Add@73b1, ActorType present-bit@73be..73e7, SetInitPos@73ee,
 * SetBaseScale@7422. This file handles the name/type part before position.
 * With a physical descriptor, that graph alone owns lookup/add/enumeration.
 * Legacy entries are a COMPLETE logical dictionary snapshot, not its physical heap
 * slots. No enumeration/allocation-order claims; exact QString hash/equality.
 * FindActor1816a7b80 rejects empty name then dictionary lookup then Frame.GetActor.
 */
const Physical=require('./source-scene-name-dictionary.js');
const Q=require('./source-native-qstring.js'),Allocator=require('./source-native-entity-allocator.js');
function physical(w){if(!Object.hasOwn(w,'sceneNameDictionaryPhysical'))return null;return Physical.validate(w.sceneNameDictionaryPhysical);}
function registeredEntries(w){const d=physical(w);return d?d.slots.slice(0,d.usedCount).filter(s=>s.state===2).map(s=>({key:s.key,entityId:s.valueEntityRef})):entries(w);}
function entries(w){const d=w.actorNames;if(d?.completeSnapshotVerified!==true||!Array.isArray(d.entries))throw Error('Native Scene complete logical name dictionary snapshot required');for(const e of d.entries){Q.byteCount(e.key);if(typeof e.entityId!=='string')throw Error('Native Scene name EntityRef required');}return d.entries;}
function lookup(w,key){const d=physical(w);if(d){const i=Physical.findSlotIndex(d,key);return i===null?null:{key:d.slots[i].key,entityId:d.slots[i].valueEntityRef};}const hash=Q.getHashCode(key);return entries(w).find(e=>Q.getHashCode(e.key)===hash&&Q.equals(e.key,key))||null;}
function addUnique(w,a){
 const key=Q.fromBytes(a.nameQStringBytes);if(lookup(w,key))throw Error('Native Scene duplicate-name branch requires actual OnExit and Destroy; no overwrite');
 if(!Number.isInteger(a.actorType)||a.actorType<0||a.actorType>255||!Array.isArray(w.presentOrdinals))throw Error('Native Scene supported ActorType/present bitset required');
 const d=physical(w);if(d){Physical.add(d,key,a.entityId);if(Object.hasOwn(w,'actorNames'))w.actorNames={completeSnapshotVerified:true,entries:registeredEntries(w)};}else entries(w).push({key,entityId:a.entityId});if(!w.presentOrdinals.includes(a.actorType))w.presentOrdinals.push(a.actorType);
}
function findActor(w,text){const key=Q.fromString(text);return Q.findActor(key,{containsKey:q=>lookup(w,q)!==null,getValue:q=>lookup(w,q).entityId,getActor:ref=>{if(!Allocator.isCurrent(w.entityAllocator,ref))return null;return w.actors.find(a=>a.entityId===ref)||null;}});}
// Same native header must remain the same descriptor during captured enumeration.
// A new header leaves old captures intact; never mutate its headerRef in place.
function adoptPhysical(w,next){const old=w.sceneNameDictionaryPhysical,d=next.sceneNameDictionaryPhysical;if(old&&d&&old.headerRef===d.headerRef){Physical.validate(old);Physical.validate(d);Object.assign(old,d);next.sceneNameDictionaryPhysical=old;}return next;}
function statusDictionary(w){const d=physical(w);if(!d)throw Error('Native Scene typed physical dictionary required for sorting');return {get usedCount(){return d.usedCount;},get entries(){return d.slots.map(s=>({state:s.state,entityRef:s.valueEntityRef}));}};}
module.exports={registeredEntries,adoptPhysical,statusDictionary,addUnique,findActor,lookup,completePhysicsFidelity:false};
