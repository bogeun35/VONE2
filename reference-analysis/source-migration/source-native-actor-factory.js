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
const ZERO=[27,59,26,107,21,24,19,132,133,144,145],ORDERED=[28,70,72,108,121,128,161,17,14,5,102,120,137,152,155,175,178];
function priority(type){if(!Number.isInteger(type)||type<0||type>65535)throw Error('Native factory supported ushort ActorType required');if(type===0)return 100000;if(ZERO.includes(type))return 0;const i=ORDERED.indexOf(type);return i<0?type+10000:i+1;}
function orderCreationParams(authored){
 if(!Array.isArray(authored))throw Error('Native factory authored parameter list required');
 const entries=authored.map((parameter,authoredIndex)=>{if(!parameter||typeof parameter!=='object')throw Error('Native factory parameter required');priority(parameter.type);return {authoredIndex,createThresholdRaw:PlayerInit.stageRaw(parameter.createThreshold),parameter:JSON.parse(JSON.stringify(parameter))};});
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(priority(entries[i].parameter.type)>priority(entries[j].parameter.type))[entries[i],entries[j]]=[entries[j],entries[i]];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(entries[i].createThresholdRaw>entries[j].createThresholdRaw)[entries[i],entries[j]]=[entries[j],entries[i]];
 return entries.map((e,convertedIndex)=>({...e,convertedIndex}));
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
  const a=e.parameter;if(!Number.isInteger(a.playerCount)||a.playerCount< -2147483648||a.playerCount>2147483647||a.playerCount===-2147483648)throw Error('Native factory supported int32 population selector required');
  if(!Population.actorPopulationAllowed(a.playerCount,count)){trace.push({convertedIndex:at,action:'population-skip'});f.cursor=(f.cursor+1)&65535;continue;}
  let result;if(a.type===27){const out=createNextPlayer(w,a,host);w=out.world;result=out.result;}
  else {if(typeof host.createActorByType!=='function')throw Error('Native factory creator required: '+a.typeName+' ('+a.type+')');result=host.createActorByType(w,a,{authoredIndex:e.authoredIndex,convertedIndex:at});if(result&&typeof result.then==='function')throw Error('Native factory creator must be synchronous');}
  f=check();if(f.cursor>=f.createdEntries.length)throw Error('Native factory live created-list index out of range after creator');
  const markedIndex=f.cursor;f.createdEntries[markedIndex]=1;f.cursor=(f.cursor+1)&65535;
  trace.push({convertedIndex:at,action:'creator-returned',markedIndex,result:result??null});
 }
 return {world:w,result:{trace,capturedPlayerIndexCount:count}};
}
module.exports={priority,orderCreationParams,initializeAbsentActor,canonicalPlayer,finishPlayerCreation,initializePlayerIndices,createNextPlayer,update,completePhysicsFidelity:false};
