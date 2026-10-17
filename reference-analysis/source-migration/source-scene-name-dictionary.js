/* Quantum QDictionary<QStringUtf8_32,EntityRef>, static native reconstruction.
 * Scene.Initialize1816a5b0e requests128 ->Allocate18001cbe0 ->18000fa30:
 * GetNextPrimeGreaterThanOrEqual18197edc0 ->193, NOT128/next power of2.
 * QCollectionsUtils.cctor18197f4e0 loads FieldRef342 (slot1831a1448),30 primes.
 * CalculateStrides18197f680: metadata12 aligned8->16,key32,value8; allocation
 * 18000fb17..99 sets header36,keyOffset16,valueOffset48,stride56.
 * IFrameHeap.AllocateAndClear/Ptr (metadata type8789 slots0/1) ->zero buckets,
 * freeHead,usedCount/freeCount and full entry capacity, not invented defaults.
 * Find180033880: hash kept as uint32 via EBP@38ab; unsigned32%capacity using
 * zero-extended RBP->RAX/idiv@392c..34; hashbits compare@395a, QString bytes
 * comparator181939ce0@39b1. No key normalization/JS Map/order substitute.
 * TryAdd180024500 checks duplicate first@245bd/c5 ->false; otherwise insert
 * 1807fb690: freeHead LIFO pop@b76a..76f/decrementfreeCount@76c or append
 * usedCount++@b7b3..7c5; full append invokes resize1807f9920@b799 (REFUSED here).
 * hash@b7e7,next buckethead@b823,state2@b825,key32@b830/834,head@b871;
 * EntityRef copied@180024666. Add wrapper180951fb4..2009 throws ArgumentException
 * on false; type token slot183164c08 resolves System.ArgumentException.
 * get_Item180033b03 exception type slot183190e60 resolves KeyNotFoundException.
 * Remove1807fc010: unlink chain@c189..1c3,next=freeHead@1ca,state1@1ce,
 * freeCount++@1d5,freeHead=removed entry@1d8; old hash/key/value retained.
 * Count180951c0d..10 =header.usedCount-freeCount, not usedCount alone.
 * No Clear in metadata QDictionary`2 methods57043..57054/QDictionaryInternal
 * 57071..57075. Scene.Initialize allocates new header; no guessed in-placeClear.
 * Links below are NORMALIZED physical slot indices/null, never fabricated heap
 * handles. Host supplies header identity; native heap allocator remains external.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-native-qstring.js'):root.SourceNativeQString,c?require('./source-scene-activation.js'):root.SourceSceneActivation);if(c)module.exports=api;root.SourceSceneNameDictionary=api;})(globalThis,function(Q,Activation){
'use strict';
const PRIMES=[3,7,17,29,53,97,193,389,769,1543,3079,6151,12289,24593,49157,98317,196613,393241,786433,1572869,3145739,6291469,12582917,25165843,50331653,100663319,201326611,402653189,805306457,1610612741];
function int(v,k){if(!Number.isInteger(v)||v<-2147483648||v>2147483647)throw Error('SceneNameDictionary native int32 required: '+k);return v;}
function object(o,k){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('SceneNameDictionary '+k+' object required');return o;}
function value(v){if((typeof v==='string'&&v.length)||Number.isSafeInteger(v))return v;throw Error('SceneNameDictionary explicit complete EntityRef value required (0 for none)');}
function normalizeCapacity(requested){int(requested,'requestedCapacity');const p=PRIMES.find(n=>n>=requested);if(p===undefined)throw Error('SceneNameDictionary native prime table exhausted');return p;}
function create({headerRef,requestedCapacity=128}={}){if(!Q||!Activation)throw Error('SceneNameDictionary NativeQString/SceneActivation dependencies required');if(typeof headerRef!=='string'||!headerRef)throw Error('SceneNameDictionary caller-supplied native header identity required');const capacity=normalizeCapacity(requestedCapacity);if(capacity>193)throw Error('SceneNameDictionary allocation above verified193-slot scope refused; native heap allocation host required');return{schema:Activation.SCHEMA,dictionaryKind:'QStringUtf8_32/EntityRef',completePhysicalSnapshotVerified:true,headerRef,requestedCapacity,capacity,headerBytes:36,keyOffsetBytes:16,valueOffsetBytes:48,slotStrideBytes:56,normalizedSlotLinks:true,usedCount:0,freeCount:0,freeHead:null,buckets:Array(capacity).fill(null),slots:Array.from({length:capacity},(_,physicalIndex)=>({physicalIndex,state:0,next:null,hashCode:0,key:{bytes:Array(32).fill(0)},valueEntityRef:0}))};}
function link(d,n,k){if(n!==null&&(!Number.isInteger(n)||n<0||n>=d.usedCount))throw Error('SceneNameDictionary normalized physical link invalid: '+k);return n;}
function validate(d){object(d,'physical dictionary');if(!Activation||!Q)throw Error('SceneNameDictionary native dependencies required');Activation.validatePhysicalSnapshot(d);if(d.dictionaryKind!=='QStringUtf8_32/EntityRef'||d.normalizedSlotLinks!==true)throw Error('SceneNameDictionary exact typed physical graph required');if(!PRIMES.includes(d.capacity)||d.capacity>193||d.usedCount>d.capacity||d.slots.length!==d.capacity||!Array.isArray(d.buckets)||d.buckets.length!==d.capacity)throw Error('SceneNameDictionary verified capacity/storage required');if(d.headerBytes!==36||d.keyOffsetBytes!==16||d.valueOffsetBytes!==48||d.slotStrideBytes!==56)throw Error('SceneNameDictionary verified native layout required');int(d.freeCount,'freeCount');if(d.freeCount<0||d.freeCount>d.usedCount)throw Error('SceneNameDictionary invalid freeCount');for(let i=d.usedCount;i<d.capacity;i++){const s=object(d.slots[i],'unused slot');if(s.physicalIndex!==i||s.state!==0||s.next!==null||s.hashCode!==0||s.valueEntityRef!==0||!Array.isArray(s.key?.bytes)||s.key.bytes.length!==32||s.key.bytes.some(x=>x!==0))throw Error('SceneNameDictionary unused allocated slot must remain cleared');}const seen=Array(d.usedCount).fill(false);let occupied=0,free=0;
 for(let bucket=0;bucket<d.capacity;bucket++){let i=link(d,d.buckets[bucket],'bucket');while(i!==null){if(seen[i])throw Error('SceneNameDictionary cycle/duplicate physical link');seen[i]=true;const s=d.slots[i];if(s.state!==2)throw Error('SceneNameDictionary bucket chain must contain occupied slots');int(s.hashCode,'hashCode');if(Q.getHashCode(s.key)!==s.hashCode||(s.hashCode>>>0)%d.capacity!==bucket)throw Error('SceneNameDictionary key hash/bucket mismatch');value(s.valueEntityRef);occupied++;i=link(d,s.next,'occupied next');}}
 let i=link(d,d.freeHead,'freeHead');while(i!==null){if(seen[i])throw Error('SceneNameDictionary cycle/overlapping free link');seen[i]=true;const s=d.slots[i];if(s.state!==1)throw Error('SceneNameDictionary free chain must contain deleted slots');free++;i=link(d,s.next,'free next');}if(free!==d.freeCount||occupied!==d.usedCount-d.freeCount||seen.some(x=>!x))throw Error('SceneNameDictionary incomplete physical graph/count');return d;}
function key(q){if(!Q)throw Error('SceneNameDictionary NativeQString dependency required');return Q.fromBytes(object(q,'QString key').bytes);}
function find(d,q,h){const bucket=(h>>>0)%d.capacity;let previous=null,i=d.buckets[bucket];while(i!==null){const s=d.slots[i];if(s.hashCode===h&&Q.equals(s.key,q))return{index:i,previous,bucket};previous=i;i=s.next;}return{index:null,previous,bucket};}
function findSlotIndex(d,q){validate(d);q=key(q);return find(d,q,Q.getHashCode(q)).index;}
function containsKey(d,q){return findSlotIndex(d,q)!==null;}
function getValue(d,q){const i=findSlotIndex(d,q);if(i===null){const e=Error('SceneNameDictionary native get_Item missing-key exception branch0x180033b03');e.name='KeyNotFoundException';throw e;}return d.slots[i].valueEntityRef;}
function getCount(d){validate(d);return d.usedCount-d.freeCount;}
function resize(){throw Error('SceneNameDictionary resize0x1807f9920 requires verified replacement heap buffers/handles; refused without mutation');}
function tryAdd(d,q,entityRef){validate(d);q=key(q);value(entityRef);const h=Q.getHashCode(q),found=find(d,q,h);if(found.index!==null)return false;let i;if(d.freeHead!==null){i=d.freeHead;d.freeHead=d.slots[i].next;d.freeCount--;}else{if(d.usedCount===d.capacity)resize();i=d.usedCount++;}const s=d.slots[i];s.hashCode=h;s.next=d.buckets[found.bucket];s.state=2;s.key=q;s.valueEntityRef=entityRef;d.buckets[found.bucket]=i;return true;}
function add(d,q,entityRef){if(!tryAdd(d,q,entityRef)){const e=Error('SceneNameDictionary native duplicate QString key');e.name='ArgumentException';throw e;}}
function remove(d,q){validate(d);q=key(q);const found=find(d,q,Q.getHashCode(q)),i=found.index;if(i===null)return false;const s=d.slots[i];if(found.previous===null)d.buckets[found.bucket]=s.next;else d.slots[found.previous].next=s.next;s.next=d.freeHead;s.state=1;d.freeCount++;d.freeHead=i;return true;}
function clear(){throw Error('SceneNameDictionary no verified native QDictionary.Clear method; in-place clear refused; Scene.Initialize requires a new allocated header identity');}
function physicalSnapshot(d){return validate(d);}
return{create,normalizeCapacity,validate,tryAdd,add,remove,containsKey,getValue,getCount,findSlotIndex,physicalSnapshot,resize,clear,nativeConstants:{sceneRequestedCapacity:128,sceneCapacity:193,headerBytes:36,keyOffsetBytes:16,valueOffsetBytes:48,slotStrideBytes:56,primeTable:PRIMES.slice()},supportedTypes:[],completePhysicsFidelity:false};
});
