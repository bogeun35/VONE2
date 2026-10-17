/* Native factory entry preparation; not a complete Stage factory.
 * convertActorCreateParam threshold float@180554122 ->convertFP@12a ->raw@138.
 * sortActorCreateParamList180554390: pairwise priority swap@44d0/44d4,
 * then signed raw threshold swap@4585/4589/458d. Equal ties can move indirectly.
 * QActorTypeExtension.GetPriority1817803d0 / cctor181780540, fieldRefs89/90.
 * Frame.AddComponent<ActorComponent>1801f9ad0 requires absent component;
 * existing Has@1801f9c3d takes zero-pointer branch@1f9d30, not get-or-add.
 * Entity allocation, QString resolution, prototype materialization and scene
 * registration are explicit upstream facts, never inferred from array index.
 */
'use strict';
const Init=require('./source-actor-initialization.js'),PlayerInit=require('./source-player-collision-init.js');
const Bootstrap=require('./source-player-bootstrap.js'),Broad=require('./source-collision-broadphase.js'),Callbacks=require('./source-collision-callbacks.js'),QString=require('./source-native-qstring.js'),Allocator=require('./source-native-entity-allocator.js');
const Names=require('./source-native-scene-names.js');
const PlayerIndices=require('./source-player-index-list.js');
const Population=require('./population-rules.cjs');
const Thorn=require('./source-thorn-native.js'),EventPool=require('./source-native-event-pool.js');
const Thunder=require('./source-thunder-native.js'),ActorAdd=require('./source-native-actor-add.js');
const ActorData=require('./actor-runtime.js'),LinePath=require('./source-linepath-devices.js');
const Prefab=require('./source-native-prefab-materializer.js'),UniqueName=require('./source-factory-unique-name.js');
const Key=require('./source-key-lifecycle.js'),CollisionFactory=require('./source-native-collision-factory.js'),Bridge=require('./source-native-actor-bridge.js');
const ZERO=[27,59,26,107,21,24,19,132,133,144,145],ORDERED=[28,70,72,108,121,128,161,17,14,5,102,120,137,152,155,175,178];
function priority(type){if(!Number.isInteger(type)||type<0||type>65535)throw Error('Native factory supported ushort ActorType required');if(type===0)return 100000;if(ZERO.includes(type))return 0;const i=ORDERED.indexOf(type);return i<0?type+10000:i+1;}
function orderCreationParams(authored){
 if(!Array.isArray(authored))throw Error('Native factory authored parameter list required');
 const entries=authored.map((parameter,authoredIndex)=>{if(!parameter||typeof parameter!=='object')throw Error('Native factory parameter required');priority(parameter.type);return {authoredIndex,createThresholdRaw:PlayerInit.stageRaw(parameter.createThreshold),parameter:JSON.parse(JSON.stringify(parameter))};});
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(priority(entries[i].parameter.type)>priority(entries[j].parameter.type))[entries[i],entries[j]]=[entries[j],entries[i]];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(entries[i].createThresholdRaw>entries[j].createThresholdRaw)[entries[i],entries[j]]=[entries[j],entries[i]];
 return entries.map((e,convertedIndex)=>({...e,convertedIndex}));
}
function materializeActorPrefab(input,actorType){
 // Exact uint64 GUIDs from audited installed ResourceContainer; never Number.
 const guid={103:'2991712624845831119',93:'252681393109828677',38:'1049018996789292933',30:'3012907236034044674',9:'1028558524506428955',14:'1358310291138607793',17:'843619264496456878',27:'2433998748904079550'}[actorType];
 if(!guid)throw Error('Native factory audited prefab mapping required for ActorType '+actorType);
 const w=JSON.parse(JSON.stringify(input));
 const out=Prefab.createFromPrefab({schemaVersion:1,allocator:w.entityAllocator,viewPool:w.viewPool},{prototypeGuid:guid},w.materializationProfile);
 w.entityAllocator=out.state.allocator;w.viewPool=out.state.viewPool;
 return {world:w,entityId:out.entity.ref,prefab:out.prefab,trace:out.trace};
}
function addAndInitializeActor(input,entityId,authored,host={}){
 // Caller supplies authoritative native Actor pool/heap snapshot at this
 // boundary. No canonical Actor table insertion or typed-device Add here.
 const w=JSON.parse(JSON.stringify(input));
 const added=ActorAdd.addActor({schemaVersion:1,allocator:w.entityAllocator,actorPool:w.actorPool,heapSnapshot:w.heapSnapshot},entityId,w.actorRegistrationProfile);
 const initialized=ActorAdd.initializeAddedActor(added.state,entityId,{actorType:authored.type,name:authored.name,stageScaleRaw:w.stage?.baseScaleRaw},w.actorRegistrationProfile,{allocateCollisionHolders:host.allocateCollisionHolders});
 w.entityAllocator=initialized.state.allocator;w.actorPool=initialized.state.actorPool;w.heapSnapshot=initialized.state.heapSnapshot;
 return {world:w,actor:JSON.parse(JSON.stringify(w.actorPool.slots[initialized.slot].actor)),trace:[...added.trace,...initialized.trace]};
}
function initializeAbsentActor(facts){
 if(facts?.actorComponentAbsent!==true)throw Error('Native Actor AddComponent requires verified absence after materialization');
 const a=Init.initialize(Init.defaultMaterialized({actorComponentAbsent:true}),facts);
 // Convert native field names once at the factory boundary. No stale aliases
 // survive to bypass Lifecycle ownership writes.
 return canonicalActor(a);
}
function canonicalActor(a){for(const [native,canonical] of Object.entries({inactiveEntity:'activeOwner',invisibleEntity:'visibleOwner',pauseEntity:'pauseOwner',disableDisplayEntity:'displayOwner',disableAnimationEntity:'animationOwner'})){a[canonical]=a[native];delete a[native];}return a;}
function canonicalPlayer(snapshot){
 const a=canonicalActor(JSON.parse(JSON.stringify(snapshot.actor)));
 const {playerState,cachedActorType,jumpVelocityRaw,equipActors,...p}=JSON.parse(JSON.stringify(snapshot.player));
 a.player={...p,state:playerState,playerActorType:cachedActorType,forceJumpXRaw:jumpVelocityRaw.xRaw,forceJumpYRaw:jumpVelocityRaw.yRaw};
 a.equipmentIds=equipActors;a.jumpReceiver='player-default';return a;
}
function finishPlayerCreation(input,authored,actorAtPlayerInitialize,binding,options){
 // This boundary starts AFTER actual entity materialization, Actor.Initialize
 // and DamageManage.Initialize. It does not invent that earlier event stream.
 const w=JSON.parse(JSON.stringify(input));
 if(!Array.isArray(w.actors)||!w.storage)throw Error('Native factory complete Actor table/collision storage required');
 const ref=Allocator.decodeRef(binding.entityId);
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,binding.entityId))throw Error('Native factory allocated current EntityRef required');
 if(w.actors.some(a=>a.entityId===binding.entityId))throw Error('Native factory duplicate Actor identity');
 const name=QString.fromBytes(actorAtPlayerInitialize.nameQStringBytes);
 if(!QString.equals(name,QString.fromString(authored.name)))throw Error('Native factory resolved Actor name differs from authored name; unique-name conversion requires host');
 if(binding.id!==undefined)throw Error('Native factory collision ID must come from live storage');
 let allocated;
 const initialized=Bootstrap.bootstrap(authored,actorAtPlayerInitialize,{...binding,hasOnCollided:Callbacks.has(27,'OnCollided')},{...options,allocateCollision:()=>{
  allocated=Broad.createCollision(w.storage,{});if(!allocated)throw Error('Native Player initCollision capacity exhausted');return allocated.id;
 }});
 if(options?.beforeSceneRegistration){const result=options.beforeSceneRegistration(w,initialized);if(result&&typeof result.then==='function')throw Error('Native factory registration boundary must be synchronous');}
 Names.addUnique(w,initialized.actor);
 const registered=Bootstrap.register(initialized,{...options,uniqueNameVerified:true}),a=canonicalPlayer(registered);
 Object.assign(allocated,registered.collisions[0],{actorExists:true});w.actors.push(a);
 // Name registration consumes an explicit complete snapshot. Player lists and
 // typed pools still belong to their actual creation/materialization phases.
 return {world:w,actorId:a.entityId,snapshot:registered};
}
function initializePlayerIndices(input,selectedStage){
 const w=JSON.parse(JSON.stringify(input));
 const result=PlayerIndices.initialize(w.gamePlayerInfos,{sceneFlags:w.actorSceneFlags,limitPlayer:selectedStage.limitPlayer,shufflePlayer:selectedStage.shufflePlayer,existingIndexList:w.playerIndices?.indexList,rngSnapshot:w.rngSnapshot});
 w.actorSceneFlags=result.sceneFlags;w.playerIndices={indexList:result.indexList};if(result.rngAccessed)w.rngSnapshot=result.rngSnapshot;
 return {world:w,result};
}
function createNextPlayer(input,authored,host){
 const w=JSON.parse(JSON.stringify(input));if(!Array.isArray(w.scenePlayerRefs))throw Error('Native factory actual Scene PlayerInfoList required');
 const selected=PlayerIndices.selectPlayer({sceneFlags:w.actorSceneFlags,indexList:w.playerIndices?.indexList},w.scenePlayerRefs.length,w.gamePlayerInfos);
 if(selected.status!=='selected')return {world:w,result:selected};
 // createPlayerSub1816a3b7f gates checkpoint relocation on GameOverCount>0;
 // 1816a3dbf gates Actor.SetActive(false,factoryOwner) on GamePlayerInfo bit2.
 // Do not silently omit those creator-tail effects in this fresh-player path.
 if(w.checkpointInfo?.gameOverCount!==0)throw Error('Native factory restored checkpoint creator tail requires implementation');
 if(w.gamePlayerInfos[selected.gamePlayerInfoOrdinal].flags&4)throw Error('Native factory dummy inactive creator tail requires implementation');
 if(typeof host?.materializePlayerBeforeInitialize!=='function')throw Error('Native factory actual materialization/Actor/DamageManage initialization host required');
 const supplied=host.materializePlayerBeforeInitialize(w,authored,selected);
 if(supplied&&typeof supplied.then==='function')throw Error('Native factory materialization must be synchronous');
 if(!supplied?.actor||!supplied?.binding)throw Error('Native factory actual initialized Actor and AddPlayer facts required');
 const out=finishPlayerCreation(w,authored,supplied.actor,{...supplied.binding,index:selected.nativeIndexArgument,playerIndex:selected.nativePlayerIndexArgument,colorIndex:selected.nativeColorIndexArgument},{stageScaleRaw:w.stage?.baseScaleRaw,iceSpeedUpRaw:w.stage?.iceSpeedUpRaw,beforeSceneRegistration:(world,snapshot)=>{
  // Successful Player.CreateEntity -> PlayerInfoList.Add@1816a3b5d, BEFORE
  // outer ActorScene.AddActor@1816a3687. Failed creators never increment count.
  world.scenePlayerRefs.push(snapshot.actor.entityId);
 }});
 return {...out,result:{...selected,actorId:out.actorId}};
}
function finishKeyCreation(input,authored,actorAtKeyInitialize,binding){
 // Static Creator18186b470: AddKey@b544 -> Parse@b558 -> collision@b569
 // -> InitPost@b57a -> manager primary@b59c; outer AddActor1816a3687 follows.
 let w=JSON.parse(JSON.stringify(input));
 if(authored.type!==17||!authored.name)throw Error('Native Key resolved nonempty factory name required');
 if(binding?.keyComponentAbsent!==true||binding.keyAddDefaultVerified!==true)throw Error('Native Key actual absent-component Add/default facts required');
 const id=actorAtKeyInitialize.entityId,ref=Allocator.decodeRef(id);
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,id))throw Error('Native Key allocated current EntityRef required');
 if(!Array.isArray(w.actors)||w.actors.some(a=>a.entityId===id))throw Error('Native Key complete Actor table without duplicate identity required');
 if(actorAtKeyInitialize.actorType!==17||!QString.equals(QString.fromBytes(actorAtKeyInitialize.nameQStringBytes),QString.fromString(authored.name)))throw Error('Native Key Actor type/resolved name mismatch');
 const parsed=Key.compileActor(authored,w.playerIndices?.indexList?.length),a=canonicalActor(JSON.parse(JSON.stringify(actorAtKeyInitialize)));
 a.key=parsed.key;w.actors.push(a);CollisionFactory.createKey(w,a);
 w=Bridge.initializeKeyPost(w,id).world;const live=w.actors.find(a=>a.entityId===id);
 Key.writePrimaryKey(w.actorManager,live);Names.addUnique(w,live);
 const registered=Init.register(live,Bridge.allCollisions(w),parsed.initPositionRaw,w.stage?.baseScaleRaw,{uniqueNameVerified:true});
 Object.assign(live,registered.actor);
 for(const c of registered.collisions){const target=Broad.getCollisionById(w.storage,c.id);Object.assign(target,c);if(w.collisions){const overlay=w.collisions.find(b=>b.id===c.id);if(overlay)Object.assign(overlay,c);}}
 return {world:w,actorId:id};
}
function createKey(input,authored,host={}){
 const w=JSON.parse(JSON.stringify(input));
 if(typeof host.materializeKeyBeforeInitialize!=='function')throw Error('Native Key actual prefab/materialization and resolved-name host required');
 const supplied=host.materializeKeyBeforeInitialize(w,authored);
 if(supplied&&typeof supplied.then==='function')throw Error('Native Key materialization must be synchronous');
 if(!supplied?.actor||!supplied?.binding||!supplied?.resolvedAuthored)throw Error('Native Key initialized Actor, AddKey facts and resolved creation parameter required');
 // The host resolves only the name; geometry and parsed data remain authored.
 const expected={...authored,name:supplied.resolvedAuthored.name};
 if(JSON.stringify(expected)!==JSON.stringify(supplied.resolvedAuthored))throw Error('Native Key name resolution changed authored fields');
 if(authored.name&&authored.name!==expected.name)throw Error('Native Key authored name must be preserved');
 return finishKeyCreation(w,expected,supplied.actor,supplied.binding);
}
function finishGoalCreation(input,authored,actorAtGoalInitialize,binding){
 // Creator18185f5f0: Actor@f69b, AddGoal@f6bf, slot0 FP@f6ed..f6fe,
 // collision@f70b, manager+48@f728. Initialize/InitPost are bare returns.
 const w=JSON.parse(JSON.stringify(input)),id=actorAtGoalInitialize.entityId,ref=Allocator.decodeRef(id);
 if(authored.type!==14||!authored.name)throw Error('Native Goal resolved nonempty factory name required');
 if(binding?.goalComponentAbsent!==true||binding.goalAddDefaultVerified!==true)throw Error('Native Goal actual absent-component Add/default facts required');
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,id))throw Error('Native Goal allocated current EntityRef required');
 if(!Array.isArray(w.actors)||w.actors.some(a=>a.entityId===id))throw Error('Native Goal complete Actor table without duplicate identity required');
 if(actorAtGoalInitialize.actorType!==14||!QString.equals(QString.fromBytes(actorAtGoalInitialize.nameQStringBytes),QString.fromString(authored.name)))throw Error('Native Goal Actor type/resolved name mismatch');
 const slot=authored.datas?.[0];if(!slot||!Number.isInteger(slot.t))throw Error('Native Goal parameter slot0 required');
 const a=canonicalActor(JSON.parse(JSON.stringify(actorAtGoalInitialize))),offsetRaw=slot.t===1?PlayerInit.stageRaw(slot.f):0;
 a.goal={entityId:id,flags:0,offsetRaw};w.actors.push(a);CollisionFactory.createGoal(w,a,offsetRaw);
 if(!w.actorManager||!Object.hasOwn(w.actorManager,'goalEntityId'))throw Error('Native Goal actual ActorManager goalEntityId required');
 w.actorManager.goalEntityId=id;Names.addUnique(w,a);
 const registered=Init.register(a,Bridge.allCollisions(w),{xRaw:PlayerInit.stageRaw(authored.posX),yRaw:PlayerInit.stageRaw(authored.posY)},w.stage?.baseScaleRaw,{uniqueNameVerified:true});Object.assign(a,registered.actor);
 for(const c of registered.collisions){Object.assign(Broad.getCollisionById(w.storage,c.id),c);const overlay=w.collisions?.find(b=>b.id===c.id);if(overlay)Object.assign(overlay,c);}
 return {world:w,actorId:id};
}
function createGoal(input,authored,host={}){
 const w=JSON.parse(JSON.stringify(input));
 if(typeof host.materializeGoalBeforeInitialize!=='function')throw Error('Native Goal actual prefab/materialization host required');
 const supplied=host.materializeGoalBeforeInitialize(w,authored);
 if(supplied&&typeof supplied.then==='function')throw Error('Native Goal materialization must be synchronous');
 if(!supplied?.actor||!supplied?.binding)throw Error('Native Goal initialized Actor and AddGoal facts required');
 return finishGoalCreation(w,authored,supplied.actor,supplied.binding);
}
function finishDamageRectCreation(input,authored,actorAtInitialize,binding){
 // Creator18180dd70: Actor de20 -> Add de44 -> Parse de58 -> Collision de69
 // -> InitPost inlined Actor flag18 deb1. Parse width/height slots0/1;
 // negative width shifts creation X and uses NEG/SHL16/SAR16 (signed48).
 const w=JSON.parse(JSON.stringify(input)),id=actorAtInitialize.entityId,ref=Allocator.decodeRef(id);
 if(authored.type!==9||!authored.name)throw Error('Native DamageRect resolved factory name required');
 if(binding?.damageRectComponentAbsent!==true||binding.damageRectAddDefaultVerified!==true)throw Error('Native DamageRect actual absent-component Add/default facts required');
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,id))throw Error('Native DamageRect allocated current EntityRef required');
 if(!Array.isArray(w.actors)||w.actors.some(a=>a.entityId===id))throw Error('Native DamageRect complete Actor table without duplicate identity required');
 if(actorAtInitialize.actorType!==9||!QString.equals(QString.fromBytes(actorAtInitialize.nameQStringBytes),QString.fromString(authored.name)))throw Error('Native DamageRect Actor type/resolved name mismatch');
 const rawAt=i=>{const d=authored.datas?.[i];if(!d||!Number.isInteger(d.t))throw Error('Native DamageRect parameter slot'+i+' required');return d.t===1?PlayerInit.stageRaw(d.f):0;};
 const exact=n=>{const v=Number(BigInt.asIntN(64,n));if(!Number.isSafeInteger(v))throw Error('Native DamageRect exact signed raw required');return v;};
 let width=rawAt(0),height=rawAt(1),x=PlayerInit.stageRaw(authored.posX);if(width<0){x=exact(BigInt(x)+BigInt(width));width=exact(BigInt.asIntN(64,(-BigInt(width))<<16n)>>16n);}
 const decoded=LinePath.decodeDamageRect(authored),rect={...decoded.rectRaw,height,width,y:exact(-BigInt(height))},a=canonicalActor(JSON.parse(JSON.stringify(actorAtInitialize)));
 a.damageRect={entityId:id,rectRaw:rect};w.actors.push(a);CollisionFactory.createDamageRect(w,a,rect);a.flags=(a.flags|262144)>>>0;
 Names.addUnique(w,a);const registered=Init.register(a,Bridge.allCollisions(w),{xRaw:x,yRaw:PlayerInit.stageRaw(authored.posY)},w.stage?.baseScaleRaw,{uniqueNameVerified:true});Object.assign(a,registered.actor);
 for(const c of registered.collisions){Object.assign(Broad.getCollisionById(w.storage,c.id),c);const overlay=w.collisions?.find(b=>b.id===c.id);if(overlay)Object.assign(overlay,c);}
 return {world:w,actorId:id};
}
function createDamageRect(input,authored,host={}){
 const w=JSON.parse(JSON.stringify(input));if(typeof host.materializeDamageRectBeforeInitialize!=='function')throw Error('Native DamageRect actual prefab/materialization host required');
 const supplied=host.materializeDamageRectBeforeInitialize(w,authored);if(supplied&&typeof supplied.then==='function')throw Error('Native DamageRect materialization must be synchronous');
 if(!supplied?.actor||!supplied?.binding)throw Error('Native DamageRect initialized Actor and Add facts required');return finishDamageRectCreation(w,authored,supplied.actor,supplied.binding);
}
function finishRectCreation(input,authored,actorAtInitialize,binding){
 // Static Rect.Creator1816e677c/67a0/67b4/67d9. Parse69a0:
 // width/height0/1, count-2 FP growth2/3 and position4/5@6b85..6bb3;
 // packed offsets6/7 scan downward to first nonzero pair@6be9..6c72;
 // negative width shift/narrow@6cc4..6ccf. Type30 keeps both FPBool defaults0.
 const w=JSON.parse(JSON.stringify(input)),id=actorAtInitialize.entityId,ref=Allocator.decodeRef(id);
 if(authored.type!==30||!authored.name)throw Error('Native ordinary Rect resolved factory name required');
 if(binding?.rectComponentAbsent!==true||binding.rectAddDefaultVerified!==true)throw Error('Native Rect actual absent-component Add/default facts required');
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,id))throw Error('Native Rect allocated current EntityRef required');
 if(!Array.isArray(w.actors)||w.actors.some(a=>a.entityId===id))throw Error('Native Rect complete Actor table without duplicate identity required');
 if(actorAtInitialize.actorType!==30||!QString.equals(QString.fromBytes(actorAtInitialize.nameQStringBytes),QString.fromString(authored.name)))throw Error('Native Rect Actor type/resolved name mismatch');
 const count=w.playerIndices?.indexList?.length;if(!Number.isInteger(count)||count<2||count>8)throw Error('Native Rect actual player index count2..8 required');
 const exact=n=>{const v=Number(BigInt.asIntN(64,n));if(!Number.isSafeInteger(v))throw Error('Native Rect exact signed raw required');return v;},add=(a,b)=>exact(BigInt(a)+BigInt(b));
 const slot=i=>{const d=authored.datas?.[i];if(!d||!Number.isInteger(d.t))throw Error('Native Rect parameter slot'+i+' required');return d;},raw=i=>slot(i).t===1?PlayerInit.stageRaw(slot(i).f):0,growth=i=>exact(BigInt.asIntN(64,BigInt(raw(i))*(BigInt(count-2)<<16n))>>16n);
 const table=i=>{const d=slot(i),s=d.t===2?(d.s||''):'';return s===''?Array(7).fill(0):ActorData.decodePopulationOffsetTable(s);};
 let width=add(raw(0),growth(2)),height=add(raw(1),growth(3)),x=add(PlayerInit.stageRaw(authored.posX),growth(4)),y=add(PlayerInit.stageRaw(authored.posY),growth(5));
 const tx=table(6),ty=table(7);for(let i=count-2;i>=0;i--)if(tx[i]!==0||ty[i]!==0){x=add(x,tx[i]);y=add(y,ty[i]);break;}
 if(width<0){x=add(x,width);width=exact(BigInt.asIntN(64,(-BigInt(width))<<16n)>>16n);}
 const rect={height,width,x:0,y:exact(-BigInt(height))},a=canonicalActor(JSON.parse(JSON.stringify(actorAtInitialize)));a.rect={entityId:id,isDummy:0,isInDarkness:0,rectRaw:rect};w.actors.push(a);CollisionFactory.createSolidRect(w,a,0,rect);Names.addUnique(w,a);
 const registered=Init.register(a,Bridge.allCollisions(w),{xRaw:x,yRaw:y},w.stage?.baseScaleRaw,{uniqueNameVerified:true});Object.assign(a,registered.actor);
 for(const c of registered.collisions){Object.assign(Broad.getCollisionById(w.storage,c.id),c);const overlay=w.collisions?.find(b=>b.id===c.id);if(overlay)Object.assign(overlay,c);}
 return {world:w,actorId:id};
}
function createRect(input,authored,host={}){
 const w=JSON.parse(JSON.stringify(input));if(typeof host.materializeRectBeforeInitialize!=='function')throw Error('Native Rect actual prefab/materialization host required');
 const supplied=host.materializeRectBeforeInitialize(w,authored);if(supplied&&typeof supplied.then==='function')throw Error('Native Rect materialization must be synchronous');if(!supplied?.actor||!supplied?.binding)throw Error('Native Rect initialized Actor and Add facts required');return finishRectCreation(w,authored,supplied.actor,supplied.binding);
}
function finishThunderCreation(input,authored,actorAtInitialize,binding){
 // Creator18172bfe0: Actor c0b8 -> AddBase c0dc -> alpha=QFP1 c132
 // -> AddThunder c13d -> Parse c16f -> InitPost phase c174..c1ba -> collisions c1e4.
 const w=JSON.parse(JSON.stringify(input)),id=actorAtInitialize.entityId,ref=Allocator.decodeRef(id);
 if(authored.type!==38||!authored.name)throw Error('Native Thunder resolved factory name required');
 if(binding?.thunderBaseComponentAbsent!==true||binding.thunderComponentAbsent!==true||binding.thunderAddsDefaultVerified!==true)throw Error('Native Thunder actual two absent-component Add/default facts required');
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,id))throw Error('Native Thunder allocated current EntityRef required');
 if(!Array.isArray(w.actors)||w.actors.some(a=>a.entityId===id))throw Error('Native Thunder complete Actor table without duplicate identity required');
 if(actorAtInitialize.actorType!==38||!QString.equals(QString.fromBytes(actorAtInitialize.nameQStringBytes),QString.fromString(authored.name)))throw Error('Native Thunder Actor type/resolved name mismatch');
 const raw=i=>{const d=authored.datas?.[i];if(!d||!Number.isInteger(d.t))throw Error('Native Thunder parameter slot'+i+' required');return d.t===1?PlayerInit.stageRaw(d.f):0;},integer=i=>Number(BigInt.asIntN(32,BigInt(raw(i))>>16n));
 let direction=Number((BigInt.asUintN(32,BigInt(raw(0)))>>16n)&255n);if(direction>3)direction=0;
 const baseFlags=(integer(1)>0?1:0)|(integer(2)>0?2:0);let switchType=integer(3),vx=raw(4),vy=raw(5),distance=raw(6),repeat=integer(7);const disappear=raw(8);
 // QFP._0 comparison at c675/c696/c6b7, not epsilon. Inactive motion
 // clears switch/repeat too. Later disappear stores only positive raw@c84c.
 if((vx===0&&vy===0)||distance<=0){switchType=0;vx=vy=distance=repeat=0;}
 const a=canonicalActor(JSON.parse(JSON.stringify(actorAtInitialize)));
 a.thunder={entityId:id,direction,flags:baseFlags,alphaRaw:65536,lengthRaw:0,lengthToMapRaw:0};
 a.thunderState={entityId:id,lastPhase:0,phase:0,switchType:switchType>0?Number(BigInt.asIntN(8,BigInt(switchType))):0,flags:repeat!==0?1:0,disappearTimeRaw:disappear>0?disappear:0,disappearTimerRaw:0,distanceRaw:0,moveDistanceRaw:distance,speedRaw:0,timerRaw:0,moveVelocityRaw:{xRaw:vx,yRaw:vy},velocityRaw:{xRaw:0,yRaw:0}};
 if(!(a.thunderState.switchType&1)&&(Math.abs(vx)>=4||Math.abs(vy)>=4))a.thunderState.phase=1;
 w.actors.push(a);Thunder.createCollisions(w,a,a.thunder);Names.addUnique(w,a);
 const registered=Init.register(a,Bridge.allCollisions(w),{xRaw:PlayerInit.stageRaw(authored.posX),yRaw:PlayerInit.stageRaw(authored.posY)},w.stage?.baseScaleRaw,{uniqueNameVerified:true});Object.assign(a,registered.actor);
 for(const c of registered.collisions){Object.assign(Broad.getCollisionById(w.storage,c.id),c);const overlay=w.collisions?.find(b=>b.id===c.id);if(overlay)Object.assign(overlay,c);}
 return {world:w,actorId:id};
}
function createThunder(input,authored,host={}){
 const w=JSON.parse(JSON.stringify(input));if(typeof host.materializeThunderBeforeInitialize!=='function')throw Error('Native Thunder actual prefab/materialization host required');
 const supplied=host.materializeThunderBeforeInitialize(w,authored);if(supplied&&typeof supplied.then==='function')throw Error('Native Thunder materialization must be synchronous');if(!supplied?.actor||!supplied?.binding)throw Error('Native Thunder initialized Actor and Add facts required');return finishThunderCreation(w,authored,supplied.actor,supplied.binding);
}
function finishThornCreation(input,authored,actorAtInitialize,binding){
 // NormalThorn.Creator181889120: Actor91e1 -> AddThorn9205 -> Parse9219
 // -> Collision922a -> Reset923b -> AddNormalThorn925b (Initialize bare ret).
 // Parse1817206b0 slots0..12; Reset181720e60 sorting event54=-2100.
 const w=JSON.parse(JSON.stringify(input)),id=actorAtInitialize.entityId,ref=Allocator.decodeRef(id);
 if(authored.type!==93||!authored.name)throw Error('Native Thorn resolved factory name required');
 if(binding?.thornComponentAbsent!==true||binding.normalThornComponentAbsent!==true||binding.thornAddsDefaultVerified!==true)throw Error('Native Thorn actual two absent-component Add/default facts required');
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,id))throw Error('Native Thorn allocated current EntityRef required');
 if(!Array.isArray(w.actors)||w.actors.some(a=>a.entityId===id))throw Error('Native Thorn complete Actor table without duplicate identity required');
 if(actorAtInitialize.actorType!==93||!QString.equals(QString.fromBytes(actorAtInitialize.nameQStringBytes),QString.fromString(authored.name)))throw Error('Native Thorn Actor type/resolved name mismatch');
 const count=w.playerIndices?.indexList?.length;if(!Number.isInteger(count)||count<2||count>8)throw Error('Native Thorn actual player index count2..8 required');
 const slot=i=>{const d=authored.datas?.[i];if(!d||!Number.isInteger(d.t))throw Error('Native Thorn parameter slot'+i+' required');return d;},raw=i=>slot(i).t===1?PlayerInit.stageRaw(slot(i).f):0;
 const integer=i=>Number(BigInt.asIntN(32,BigInt(raw(i))>>16n)),byte=i=>Number((BigInt.asUintN(32,BigInt(raw(i)))>>16n)&255n);
 let direction=byte(0);if(direction>3)direction=0;
 const table=i=>{const d=slot(i),s=d.t===2?(d.s||''):'';return s===''?Array(7).fill(0):ActorData.decodePopulationOffsetTable(s);},tx=table(10),ty=table(11);
 const add=(x,y)=>{const n=Number(BigInt.asIntN(64,BigInt(x)+BigInt(y)));if(!Number.isSafeInteger(n))throw Error('Native Thorn exact signed position required');return n;};
 let x=PlayerInit.stageRaw(authored.posX),y=PlayerInit.stageRaw(authored.posY);for(let i=count-2;i>=0;i--)if(tx[i]!==0||ty[i]!==0){x=add(x,tx[i]);y=add(y,ty[i]);break;}
 const a=canonicalActor(JSON.parse(JSON.stringify(actorAtInitialize)));
 a.thorn={entityId:id,direction,moveDirection:integer(8)!==0?byte(9):direction,flags:integer(12)!==0?1:0,phase:0,beltPhase:0,alphaRaw:65536,beltDistanceRaw:0,beltMoveDistanceRaw:0,beltSpeedRaw:Math.abs(raw(7)),distanceRaw:0,moveDistanceRaw:0,speedRaw:Math.abs(raw(1)),timerRaw:0,waitTimeRaw:Math.abs(raw(2)),beltPosition0Raw:{xRaw:raw(3),yRaw:raw(4)},beltPosition1Raw:{xRaw:raw(5),yRaw:raw(6)},beltVelocityRaw:{xRaw:0,yRaw:0},velocityRaw:{xRaw:0,yRaw:0}};
 w.actors.push(a);Thorn.createCollisions(w,a,direction);a.flags=(a.flags|128)>>>0;
 const event=EventPool.getEventParam(w.eventPool,a,54);if(event===null)throw Error('Native Thorn sorting event pool exhausted');event.SortingOrder=-2100;
 EventPool.notifyEvent(a,event,(target,param)=>Bridge.sortingEventInPlace(w,target,param));
 // Reset0xf1d/f3b/f5d/f7b/f93: BOTH endpoint vectors and belt speed nonzero at epsilon4.
 const t=a.thorn,nonzero=v=>Math.abs(v.xRaw)>=4||Math.abs(v.yRaw)>=4;
 if(nonzero(t.beltPosition0Raw)&&nonzero(t.beltPosition1Raw)&&t.beltSpeedRaw>=4)t.beltPhase=1;
 a.normalThorn={entityId:id};Names.addUnique(w,a);
 const registered=Init.register(a,Bridge.allCollisions(w),{xRaw:x,yRaw:y},w.stage?.baseScaleRaw,{uniqueNameVerified:true});Object.assign(a,registered.actor);
 for(const c of registered.collisions){Object.assign(Broad.getCollisionById(w.storage,c.id),c);const overlay=w.collisions?.find(b=>b.id===c.id);if(overlay)Object.assign(overlay,c);}
 return {world:w,actorId:id};
}
function createThorn(input,authored,host={}){
 const w=JSON.parse(JSON.stringify(input));if(typeof host.materializeThornBeforeInitialize!=='function')throw Error('Native Thorn actual prefab/materialization host required');
 const supplied=host.materializeThornBeforeInitialize(w,authored);if(supplied&&typeof supplied.then==='function')throw Error('Native Thorn materialization must be synchronous');if(!supplied?.actor||!supplied?.binding)throw Error('Native Thorn initialized Actor and Add facts required');return finishThornCreation(w,authored,supplied.actor,supplied.binding);
}
function finishLinePathLiftCreation(input,authored,actorAtInitialize,binding){
 // Creator181878360/8384/8398/83a9/83ce. Actual Initialize allocates
 // path capacity10 and fake capacity2; host supplies verified empty QList state.
 const w=JSON.parse(JSON.stringify(input)),id=actorAtInitialize.entityId,ref=Allocator.decodeRef(id);
 if(authored.type!==103||!authored.name)throw Error('Native LinePathLift resolved factory name required');
 if(binding?.linePathLiftComponentAbsent!==true||binding.linePathLiftAddDefaultVerified!==true)throw Error('Native LinePathLift actual absent-component Add/default facts required');
 if(ref.index===0||ref.rawVersion<0x80000000||!Allocator.isCurrent(w.entityAllocator,id))throw Error('Native LinePathLift allocated current EntityRef required');
 if(!Array.isArray(w.actors)||w.actors.some(a=>a.entityId===id))throw Error('Native LinePathLift complete Actor table without duplicate identity required');
 if(actorAtInitialize.actorType!==103||!QString.equals(QString.fromBytes(actorAtInitialize.nameQStringBytes),QString.fromString(authored.name)))throw Error('Native LinePathLift Actor type/resolved name mismatch');
 const lists=binding.initializedPathLists;
 if(lists?.nativeInitializeVerified!==true)throw Error('Native LinePathLift actual initialized path lists required');
 for(const [key,capacity]of [['path',10],['fakePath',2]]){const l=lists[key];if(!Number.isInteger(l?.handle)||l.handle===0||l.handle< -2147483648||l.handle>2147483647||l.capacity!==capacity||!Array.isArray(l.items)||l.items.length!==0)throw Error('Native LinePathLift verified empty '+key+' allocation required');}
 if(lists.path.handle===lists.fakePath.handle)throw Error('Native LinePathLift distinct allocated list handles required');
 const count=w.playerIndices?.indexList?.length;
 // Reuse audited parameter arithmetic only in its exact non-overflow domain.
 for(const i of [4,5,6,7,8,9,30,31]){const d=authored.datas?.[i];if(!d||!Number.isInteger(d.t))throw Error('Native LinePathLift parameter slot'+i+' required');if(d.t===1){const raw=PlayerInit.stageRaw(d.f);if([5,6,7,8,9,30].includes(i)&&Math.abs(Math.floor(raw/65536))>0x7fffffff)throw Error('Native LinePathLift int32 parameter overflow unsupported');}}
 for(let i=10;i<30;i+=2){const pair=authored.datas?.slice(i,i+2);if(pair?.length!==2||pair.some(d=>!d||!Number.isInteger(d.t)))throw Error('Native LinePathLift path parameter pair required');if(pair.every(d=>d.t!==1||PlayerInit.stageRaw(d.f)===0))break;}
 const d=LinePath.decodeLinePathLift(authored,count),a=canonicalActor(JSON.parse(JSON.stringify(actorAtInitialize)));
 if(Object.values(d.rectRaw).some(n=>!Number.isSafeInteger(n))||Math.abs(d.rectRaw.width/65536)>0x7fffffff||!Number.isSafeInteger(d.speedRaw))throw Error('Native LinePathLift arithmetic overflow unsupported');
 a.linePathLift={entityId:id,flags:(d.disabled?1:0)|(d.loop?2:0)|(d.externalStart?8:0),moveContactCount:d.moveContactCount,needRideCount:d.needRideCount,targetPathIndex:0,absLoop:d.absLoop,enableLine:d.enableLine,isInertia:d.isInertia,returnDirection:0,waitInEndPoint:d.waitInEndPoint,pathPositions:{handle:lists.path.handle,capacity:10,items:d.paths},fakePathPositions:{handle:lists.fakePath.handle,capacity:2,items:[{xRaw:0,yRaw:0},{xRaw:0,yRaw:0}]},speedRaw:d.speedRaw,timerRaw:0,moveRaw:{xRaw:0,yRaw:0},offsetPositionRaw:{xRaw:0,yRaw:0},rectRaw:d.rectRaw};
 w.actors.push(a);const c=CollisionFactory.createRect(w,a,d.rectRaw,2,true);if(c){c.layer=13;c.flags=(c.flags|4|1024);c.flags=d.isInertia?c.flags&~128:c.flags|128;}
 Names.addUnique(w,a);const registered=Init.register(a,Bridge.allCollisions(w),{xRaw:d.xRaw,yRaw:d.yRaw},w.stage?.baseScaleRaw,{uniqueNameVerified:true});Object.assign(a,registered.actor);
 for(const c of registered.collisions){Object.assign(Broad.getCollisionById(w.storage,c.id),c);const overlay=w.collisions?.find(b=>b.id===c.id);if(overlay)Object.assign(overlay,c);}
 return {world:w,actorId:id};
}
function createLinePathLift(input,authored,host={}){
 const w=JSON.parse(JSON.stringify(input));if(typeof host.materializeLinePathLiftBeforeParse!=='function')throw Error('Native LinePathLift actual prefab/Add/Initialize host required');
 const supplied=host.materializeLinePathLiftBeforeParse(w,authored);if(supplied&&typeof supplied.then==='function')throw Error('Native LinePathLift materialization must be synchronous');if(!supplied?.actor||!supplied?.binding)throw Error('Native LinePathLift initialized Actor and path allocation facts required');return finishLinePathLiftCreation(w,authored,supplied.actor,supplied.binding);
}
function update(input,thresholdRaw,host={}){
 // ActorFactory.Update1816a2f50: count captured@2fe9, marked entry check@30a3
 // BEFORE threshold@30e4; population skip advances cursor without marking.
 // After any returned CreateActor (including null/limit skip), reread LIVE
 // cursor@315e, mark1@318e, then increment ushort@3193.
 let w=JSON.parse(JSON.stringify(input));if(!Number.isSafeInteger(thresholdRaw))throw Error('Native factory exact threshold required');
 const entries=orderCreationParams(w.stageInitParam?.stage?.actorCreateParamList),count=w.playerIndices?.indexList?.length;
 if(!Number.isInteger(count))throw Error('Native factory actual PlayerIndexCount required');
 const check=()=>{const f=w.actorFactory;if(!Number.isInteger(f?.cursor)||f.cursor<0||f.cursor>65535||!Array.isArray(f.createdEntries)||f.createdEntries.length>65535||f.createdEntries.some(v=>!Number.isInteger(v)||v< -2147483648||v>2147483647))throw Error('Native factory ushort cursor and actual QList FPBoolean entries required');return f;};
 const trace=[];for(;;){let f=check();const at=f.cursor;if(at>=f.createdEntries.length)break;
  if(f.createdEntries[at]!==0){trace.push({convertedIndex:at,action:'already-marked'});f.cursor=(f.cursor+1)&65535;continue;}
  const e=entries[at];if(!e)throw Error('Native factory cursor exceeds converted stage parameters');
  if(thresholdRaw<e.createThresholdRaw){trace.push({convertedIndex:at,action:'threshold-wait'});break;}
  let a=e.parameter;if(!Number.isInteger(a.playerCount)||a.playerCount< -2147483648||a.playerCount>2147483647||a.playerCount===-2147483648)throw Error('Native factory supported int32 population selector required');
  if(!Population.actorPopulationAllowed(a.playerCount,count)){trace.push({convertedIndex:at,action:'population-skip'});f.cursor=(f.cursor+1)&65535;continue;}
  // CreateActor1816a33a1 consumes blank names AFTER Update gates, BEFORE creator/Player limit.
  a={...a,name:UniqueName.resolveCreationName(w.actorFactory,a,host)};
  let result;if(a.type===27){const out=createNextPlayer(w,a,host);w=out.world;result=out.result;}
  else if(a.type===17&&typeof host.createActorByType!=='function'){const out=createKey(w,a,host);w=out.world;result={actorId:out.actorId};}
  else if(a.type===14&&typeof host.createActorByType!=='function'){const out=createGoal(w,a,host);w=out.world;result={actorId:out.actorId};}
  else if(a.type===9&&typeof host.createActorByType!=='function'){const out=createDamageRect(w,a,host);w=out.world;result={actorId:out.actorId};}
  else if(a.type===30&&typeof host.createActorByType!=='function'){const out=createRect(w,a,host);w=out.world;result={actorId:out.actorId};}
  else if(a.type===38&&typeof host.createActorByType!=='function'){const out=createThunder(w,a,host);w=out.world;result={actorId:out.actorId};}
  else if(a.type===93&&typeof host.createActorByType!=='function'){const out=createThorn(w,a,host);w=out.world;result={actorId:out.actorId};}
  else if(a.type===103&&typeof host.createActorByType!=='function'){const out=createLinePathLift(w,a,host);w=out.world;result={actorId:out.actorId};}
  else {if(typeof host.createActorByType!=='function')throw Error('Native factory creator required: '+a.typeName+' ('+a.type+')');result=host.createActorByType(w,a,{authoredIndex:e.authoredIndex,convertedIndex:at});if(result&&typeof result.then==='function')throw Error('Native factory creator must be synchronous');}
  f=check();if(f.cursor>=f.createdEntries.length)throw Error('Native factory live created-list index out of range after creator');
  const markedIndex=f.cursor;f.createdEntries[markedIndex]=1;f.cursor=(f.cursor+1)&65535;
  trace.push({convertedIndex:at,action:'creator-returned',markedIndex,result:result??null});
 }
 return {world:w,result:{trace,capturedPlayerIndexCount:count}};
}
module.exports={priority,orderCreationParams,materializeActorPrefab,addAndInitializeActor,initializeAbsentActor,canonicalPlayer,finishPlayerCreation,initializePlayerIndices,createNextPlayer,finishKeyCreation,createKey,finishGoalCreation,createGoal,finishDamageRectCreation,createDamageRect,finishRectCreation,createRect,finishThunderCreation,createThunder,finishThornCreation,createThorn,finishLinePathLiftCreation,createLinePathLift,update,completePhysicsFidelity:false};
