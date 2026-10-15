/* Static native projection, not a stage factory or a heap allocator.
 * View18/size8/flags0: Setup 1819372ba -> Add<View>180730710.
 * Frame.Create1819786c0: root1819786e1, materialize181978732, listeners18197875c,
 * callback181978783. Standard callback registration is audited separately.
 * Set<View>18078a6f0 validates capacity/version@a73e/a762; GetBufferEntry@a7ca,
 * writes Guid@a7cf BEFORE mask@a7fb; existing returns1@a8c2, new2@a8bb,
 * invalid0@a8c9. View_Prototype.AddToEntity1819f814f returns Set==2@1819f8161.
 * Buffer18193cb60: ushort index->slot0 means missing; count includes sentinel0;
 * append ref@cc07/map@cc0f, increment count@cbe6, no version increment.
 * Existing slot is reused without changing its physical order/ref.
 * Native growth18193d050/heap topology and singleton buffers are refused here.
 */
'use strict';
const A=require('./source-native-entity-allocator.js'),R=require('./native-materialization-report.json');
const clone=x=>JSON.parse(JSON.stringify(x)),BIT=1n<<18n,MAX=0xffffffffffffffffn;
const fail=s=>{throw Error('NativePrefabMaterializer: '+s);};
function guid(v){if(typeof v!=='string'||!/^(0|[1-9][0-9]*)$/.test(v)||BigInt(v)>MAX)fail('canonical uint64 decimal GUID string required');return v;}
const prefabs=R.assets.prefabs.map(p=>Object.freeze({name:p.name,prototypeGuid:p.prototypeRegistry.guid,viewGuid:p.viewRegistry.guid}));
const requiredProfile=Object.freeze({dllSha256:R.dllSha256,metadataSha256:R.metadataSha256,resourcesSha256:R.assets.resourcesSha256,activeResourceContainerPathId:R.assets.registryObject.pathId,activeDBLoaded:true,preparedContainersUnmodified:true,standardSystemSetup:true,viewComponentId:18,viewSize:8,viewFlags:0,globalViewOnAdded:null,frameViewOnAdded:null,framePrototypeMaterialized:null,prototypeSignalSystemsEmpty:true});
function profile(p){if(!p||Object.keys(p).length!==Object.keys(requiredProfile).length||Object.entries(requiredProfile).some(([k,v])=>p[k]!==v))fail('explicit verified standard profile required; custom callbacks/systems/resources/components unsupported');}
function prefab(request){if(!request||Object.keys(request).length!==1||!Object.hasOwn(request,'prototypeGuid'))fail('only exact prototypeGuid request supported; custom components unsupported');guid(request.prototypeGuid);const p=prefabs.find(p=>p.prototypeGuid===request.prototypeGuid);if(!p)fail('prototype outside audited 14 prefab allowlist');return p;}
const has=(s,i)=>(BigInt('0x'+s.allocator.masks[i][0])&BIT)!==0n;
function validate(s){
 if(!s||s.schemaVersion!==1)fail('explicit materializer snapshot schemaVersion1 required');A.validate(s.allocator);
 const p=s.viewPool,a=s.allocator;
 if(!p||p.componentId!==18||p.elementSize!==8||p.flags!==0)fail('existing typed View18 size8 flags0 pool required; singleton unsupported');
 for(const k of ['blockSize','blockCount'])if(!Number.isInteger(p[k])||p[k]<1||p[k]>65536)fail('explicit positive bounded pool '+k+' required');
 if(!Number.isInteger(p.version)||p.version<0||p.version>0xffffffff||!Array.isArray(p.slots)||p.slots[0]!==null||p.slots.length>65536||p.slots.length>p.blockSize*p.blockCount)fail('invalid physical pool count/version/reserved slot');
 if(!Array.isArray(p.entityToSlot)||p.entityToSlot.length!==a.allocatedCapacity||p.entityToSlot.some(v=>!Number.isInteger(v)||v<0||v>65535))fail('full ushort entityToSlot snapshot required');
 const seen=new Set();
 for(let j=1;j<p.slots.length;j++){
  const row=p.slots[j];if(!row)fail('missing dense physical View slot');guid(row.currentGuid);const d=A.decodeRef(row.ref);
  if(d.index<1||d.index>=a.nextUnused||d.rawVersion<0x80000000||seen.has(d.index)||p.entityToSlot[d.index]!==j||!has(s,d.index))fail('pool ref/index/map/mask mismatch');
  const e=a.entries[d.index],live=e.rawVersion===d.rawVersion&&!(e.flags&2),pending=a.pendingCommitOrder.includes(row.ref);
  if(!live&&!pending)fail('stale physical pool generation');seen.add(d.index);
 }
 for(let i=0;i<a.allocatedCapacity;i++)if((p.entityToSlot[i]!==0)!==seen.has(i)||has(s,i)!==seen.has(i))fail('pool mapping and View mask must agree for every entity');
 return s;
}
function fromSnapshot(s){return validate(clone(s));}
function write(s,entityRef,currentGuid){
 const d=A.decodeRef(entityRef);guid(currentGuid);
 if(d.index>=s.allocator.capacity||s.allocator.entries[d.index].rawVersion!==d.rawVersion)return {setResult:0,added:false,slot:null};
 // Native equality accepts forged low versions too; helper intentionally requires issued live roots.
 if(d.index<1||d.index>=s.allocator.nextUnused||d.rawVersion<0x80000000||s.allocator.entries[d.index].flags&2)fail('issued current live entity required');
 const p=s.viewPool,existed=has(s,d.index);let slot=p.entityToSlot[d.index];
 if(slot===0){
  if(p.slots.length>=65536)fail('native ushort slot limit requires unsupported overflow path');
  if(p.slots.length>=p.blockSize*p.blockCount)fail('View physical storage exhausted; native block/heap growth requires explicit upstream implementation');
  slot=p.slots.length;p.slots.push({ref:entityRef,currentGuid});p.entityToSlot[d.index]=slot;
 }else p.slots[slot].currentGuid=currentGuid;
 s.allocator.masks[d.index][0]=(BigInt('0x'+s.allocator.masks[d.index][0])|BIT).toString(16).padStart(16,'0');
 return {setResult:existed?1:2,added:!existed,slot};
}
function setView(snapshot,entityRef,currentGuid,standardProfile){profile(standardProfile);const state=fromSnapshot(snapshot),result=write(state,entityRef,currentGuid);validate(state);return {state,...result};}
function createFromPrefab(snapshot,request,standardProfile){
 profile(standardProfile);const p=prefab(request),state=fromSnapshot(snapshot),a=state.allocator;
 if(a.freeHead===0&&a.nextUnused===a.capacity)fail('allocator capacity growth requires upstream resizeDependentStorage implementation; no implicit resize');
 const entity=A.create(a);if(A.maskIds(a.masks[entity.index]).length)fail('new root has nonempty mask; unsupported materialization prestate');
 const set=write(state,entity.ref,p.viewGuid);if(set.setResult!==2)fail('fresh allocated root did not add View');validate(state);
 return {state,entity,prefab:{...p},...set,trace:[{op:'createRoot',ref:entity.ref},{op:'writeView',ref:entity.ref,slot:set.slot,currentGuid:p.viewGuid,componentId:18},{op:'setMask',ref:entity.ref,componentId:18},{op:'prototypeListeners',count:0},{op:'prototypeCallback',registered:false}]};
}
module.exports={fromSnapshot,validate,createFromPrefab,setView,prefabs:Object.freeze(prefabs),requiredProfile,completePhysicsFidelity:false,integration:{profile:'Caller must attest actual active loaded/unmodified ResourceContainer and standard registration path; requiredProfile is an assertion template, not runtime observation.',snapshot:'Explicit allocator snapshot plus existing physical View buffer, ushort entityToSlot, block size/count, version and payloads. No fresh/zero default. Pending destroyed slots retain old ref until native commit.',transaction:'Pure cloned draft; input unchanged on success/error. Caller atomically adopts returned state. No external hooks or heap side effects.',limits:'Only 14 audited View-only prefab materialization; setView models known typed primitive with arbitrary canonical uint64 payload. No Actor/Key/Player components, creator effects, culling, listeners, custom callbacks, singleton storage or allocator/physical heap growth. Growth explicitly refused before returning state.'}};
