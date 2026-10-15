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
 for(const [native,canonical] of Object.entries({inactiveEntity:'activeOwner',invisibleEntity:'visibleOwner',pauseEntity:'pauseOwner',disableDisplayEntity:'displayOwner',disableAnimationEntity:'animationOwner'})){a[canonical]=a[native];delete a[native];}
 return a;
}
module.exports={priority,orderCreationParams,initializeAbsentActor,completePhysicsFidelity:false};
