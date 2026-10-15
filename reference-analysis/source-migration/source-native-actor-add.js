/* Native Actor Add: read-only reconstruction, original game never executed.
 * ComponentTypeId Setup19builtins (View18,MapEntityLink19) -> custom@181937368;
 * first custom Actor Add: MethodSpec94637 slot1831d5700@18174ef9f,
 * flags0@18174efef; count->Id@18072ab03/ab26; size336@18072ab48.
 * Frame.Add<Actor>1801f9ad0: zero Activator@b2f; Has@c3d; duplicate@c44;
 * Set@cef ->1807881a0: write pool@8312 ->mask@8354 ->global@83b8
 * ->Frame listener@83fd. Wrapper then EntityRef raw+20@1801f9d5e.
 * Buffer append18193cb60 count@cbe6/ref@cc07/map@cc0f; no version increment.
 * Actor.Initialize18169cc10: QString@ccae ->scale/weight@cd02..cd0d
 * ->QList<CollisionHolder> capacity4@cd41/call@cd4a ->handle@cdc5 ->bit14@cdd4.
 * QList allocate18001ce80 ->1807fda40: header16@1807fdaac,
 * data capacity*elementSize@1807fdb09, elementSize8@18001ced0, count0@fdb34.
 * No entity creation, guessed pristine pools, heap allocation, or pool growth.
 */
'use strict';
const A=require('./source-native-entity-allocator.js'),Init=require('./source-actor-initialization.js'),Q=require('./source-native-qstring.js'),Materialization=require('./native-materialization-report.json');
const clone=x=>JSON.parse(JSON.stringify(x)),ID=20,SIZE=336,BIT=1n<<20n;
const fail=s=>{throw Error('NativeActorAdd: '+s);};
const requiredProfile=Object.freeze({dllSha256:Materialization.dllSha256,metadataSha256:Materialization.metadataSha256,standardComponentRegistration:true,standardSystemSetup:true,actorComponentId:ID,actorSize:SIZE,actorFlags:0,globalActorOnAdded:null,frameActorOnAdded:null});
const holderRequest=Object.freeze({capacity:4,elementSize:8,headerSize:16,initialCount:0});
function profile(p){if(!p||Object.keys(p).length!==Object.keys(requiredProfile).length||Object.entries(requiredProfile).some(([k,v])=>p[k]!==v))fail('explicit verified standard Actor registration/callback profile required');}
const has=(s,i)=>(BigInt('0x'+s.allocator.masks[i][0])&BIT)!==0n;
function actor(a,ref){
 if(!a||a.entityId!==ref)fail('full Actor projection with matching EntityRef required');
 const shape=Init.defaultMaterialized({actorComponentAbsent:true});
 for(const [k,v] of Object.entries(shape)){
  const x=a[k];
  if(v===null){if(x!==null)A.decodeRef(x);}
  else if(Array.isArray(v)){if(!Array.isArray(x))fail('Actor field required: '+k);}
  else if(typeof v==='number'){if(!Number.isSafeInteger(x))fail('exact Actor integer required: '+k);}
  else if(!x||!Number.isSafeInteger(x.xRaw)||!Number.isSafeInteger(x.yRaw))fail('exact Actor vector required: '+k);
 }
 if(a.flags<0||a.flags>0xffffffff||a.actorType<0||a.actorType>65535||a.collisionHolderListHandle< -2147483648||a.collisionHolderListHandle>2147483647)fail('Actor fields outside native widths');Q.fromBytes(a.nameQStringBytes);
}
function validate(s){
 if(!s||s.schemaVersion!==1)fail('explicit snapshot schemaVersion1 required');A.validate(s.allocator);const p=s.actorPool,a=s.allocator;
 if(!p||p.componentId!==ID||p.elementSize!==SIZE||p.flags!==0)fail('existing Actor20 size336 flags0 typed pool required');
 for(const k of ['blockSize','blockCount'])if(!Number.isInteger(p[k])||p[k]<1||p[k]>65536)fail('explicit positive bounded pool '+k+' required');
 if(!Number.isInteger(p.version)||p.version<0||p.version>0xffffffff||!Array.isArray(p.slots)||p.slots[0]!==null||p.slots.length>65536||p.slots.length>p.blockSize*p.blockCount)fail('invalid dense pool count/version/sentinel');
 if(!Array.isArray(p.entityToSlot)||p.entityToSlot.length!==a.allocatedCapacity||p.entityToSlot.some(v=>!Number.isInteger(v)||v<0||v>65535))fail('full ushort entityToSlot snapshot required');
 const seen=new Set();for(let slot=1;slot<p.slots.length;slot++){
  const row=p.slots[slot];if(!row)fail('missing dense Actor slot');const d=A.decodeRef(row.ref);
  if(d.index<1||d.index>=a.nextUnused||d.rawVersion<0x80000000||seen.has(d.index)||p.entityToSlot[d.index]!==slot||!has(s,d.index))fail('pool ref/map/mask mismatch');
  if(!(a.entries[d.index].rawVersion===d.rawVersion&&!(a.entries[d.index].flags&2))&&!a.pendingCommitOrder.includes(row.ref))fail('stale physical Actor generation');actor(row.actor,row.ref);seen.add(d.index);
 }
 for(let i=0;i<a.allocatedCapacity;i++)if((p.entityToSlot[i]!==0)!==seen.has(i)||has(s,i)!==seen.has(i))fail('Actor map/mask must agree for every entity');return s;
}
function fromSnapshot(s){return validate(clone(s));}
function live(s,ref){const d=A.decodeRef(ref);if(d.index>=s.allocator.capacity||s.allocator.entries[d.index].rawVersion!==d.rawVersion)fail('native Add null pointer then write+20: invalid EntityRef');if(d.index<1||d.index>=s.allocator.nextUnused||d.rawVersion<0x80000000||s.allocator.entries[d.index].flags&2)fail('issued current live entity required');return d;}
function addActor(snapshot,entityRef,standardProfile){
 profile(standardProfile);const state=fromSnapshot(snapshot),d=live(state,entityRef),p=state.actorPool;
 if(has(state,d.index))fail('native Add null pointer then write+20: duplicate Actor; reuse forbidden');
 if(p.slots.length>=65536)fail('native ushort slot overflow path unsupported');
 if(p.slots.length>=p.blockSize*p.blockCount)fail('Actor storage exhausted; NativePoolGrowth upstream implementation required');
 const slot=p.slots.length,a=Init.defaultMaterialized({actorComponentAbsent:true});
 p.slots.push({ref:entityRef,actor:a});p.entityToSlot[d.index]=slot;
 state.allocator.masks[d.index][0]=(BigInt('0x'+state.allocator.masks[d.index][0])|BIT).toString(16).padStart(16,'0');
 // Both standard OnAdded boundaries see zero Actor.EntityRef. SetEntityRef is later.
 a.entityId=entityRef;validate(state);
 return {state,entityRef,slot,trace:[{op:'writeImplicitZeroActor',componentId:ID,slot,size:SIZE},{op:'setMask',componentId:ID},{op:'globalOnAdded',registered:false,actorEntityRef:null},{op:'frameOnAdded',registered:false,actorEntityRef:null},{op:'setEntityRef',entityRef}]};
}
function initializeAddedActor(snapshot,entityRef,param,standardProfile,host){
 profile(standardProfile);const state=fromSnapshot(snapshot),d=live(state,entityRef),slot=state.actorPool.entityToSlot[d.index],row=state.actorPool.slots[slot];
 if(!row||row.ref!==entityRef)fail('actual previously added Actor required');
 const expected=Init.defaultMaterialized({actorComponentAbsent:true});expected.entityId=entityRef;
 if(Object.keys(expected).some(k=>JSON.stringify(expected[k])!==JSON.stringify(row.actor[k])))fail('fresh Add result required; repeated Initialize/existing payload refused');
 if(!(param?.name===null||typeof param?.name==='string'))fail('explicit managed creation name required');
 if(!Number.isSafeInteger(param.stageScaleRaw)||!Number.isInteger(param.actorType)||param.actorType<0||param.actorType>0xffffffff)fail('exact Stage scale and uint32 creation ActorType required');
 if(!state.heapSnapshot||typeof state.heapSnapshot!=='object'||Array.isArray(state.heapSnapshot))fail('explicit actual heap snapshot required; no fresh heap inferred');
 if(typeof host?.allocateCollisionHolders!=='function')fail('actual synchronous allocateCollisionHolders host required');
 // QString conversion may throw before the allocation host. No rescue shortening.
 const nameQStringBytes=Q.fromString(param.name).bytes,base={entityId:entityRef,actorType:param.actorType,stageScaleRaw:param.stageScaleRaw,nameQStringBytes};
 const oldFlags=row.actor.flags;row.actor=Init.initialize(row.actor,{...base,collisionHolderListHandle:0});row.actor.flags=oldFlags;
 const trace=[{op:'writeEntityAndType'},{op:'writeQString'},{op:'writeScaleAndWeight'},{op:'allocateCollisionHolders',...holderRequest}];
 const out=host.allocateCollisionHolders(clone(state.heapSnapshot),{...holderRequest},{entityRef,actor:clone(row.actor),allocator:clone(state.allocator),slot});
 if(out&&typeof out.then==='function')fail('synchronous holder allocation required');
 if(!out||!out.heapSnapshot||typeof out.heapSnapshot!=='object'||Array.isArray(out.heapSnapshot)||!Number.isInteger(out.handle)||out.handle===0||out.handle< -2147483648||out.handle>2147483647||!out.allocation||Object.entries(holderRequest).some(([k,v])=>out.allocation[k]!==v))fail('actual nonzero int32 holder handle, post heap snapshot and exact allocation facts required');
 state.heapSnapshot=clone(out.heapSnapshot);row.actor=Init.initialize(row.actor,{...base,collisionHolderListHandle:out.handle});
 trace.push({op:'writeHolderHandle',handle:out.handle},{op:'setInitializedBit14'});validate(state);return {state,entityRef,slot,trace};
}
module.exports={fromSnapshot,validate,addActor,initializeAddedActor,requiredProfile,holderRequest,completePhysicsFidelity:false,integration:{snapshot:'Require full authoritative allocator and existing Actor physical pool (including pending slots, all payload fields, ushort entityToSlot, blockSize/count/version). No inferred pristine state. Add requires issued current live EntityRef from prior actual materialization, not authored index.',callbacks:'Only explicit standard installed registration profile: Actor20/size336/flags0; global OnAdded null; Actor.OnRemoved registered but not called by Add; Frame component-added signal listener null under unchanged standard SystemSetup. Custom callbacks rejected. Trace records boundaries; no fabricated callback execution.',holder:'initializeAddedActor requires exact post-Add zero payload, resolved managed name and actual Stage scale. Heap snapshot is opaque to this helper; mandatory host implements actual heap allocations (header16, data4*8, count0), returns post snapshot and actual nonzero signed32 header handle. This is a protocol, not heap implementation or attestation from the helper. Never call holder host before native QString/scale writes.',separation:'addActor returns before Actor.Initialize. initializeAddedActor stops after common Actor initialized bit14, before Player DamageManage/Player.Initialize or AddKey/AddGoal, collision creation, manager/scene/list registration. No OnStart, entity allocation or typed device components.',transaction:'All operations work on JSON drafts; input unchanged on success/error. Caller adopts returned state atomically. Holder host receives clones; external side effects require caller rollback. Native null dereference failures represented as explicit errors, not get-or-add reuse.',growth:'Physical capacity exhaustion and ushort overflow refused before adoption. NativePoolGrowth owns growth; no duplicate allocator/heap/pool growth implementation.'}};
