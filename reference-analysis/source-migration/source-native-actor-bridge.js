/* Shared native Actor schema bridge. Capture receiver plans preserve their
 * original field names; translate raw+f0 WorldVelo to velocityRaw and raw+60
 * MoveVelo to accelerationRaw (Actor metadata offsets256/112 minus16).
 * Lifecycle receives actorType through its ordinal adapter. Execute returned
 * collision/equipment calls synchronously before later capture operations.
 * All operations use a cloned whole-world transaction. Hooks must mutate only
 * that provided world; external audio/network delivery belongs after commit.
 * This bridge is not registered into the legacy stage runtime yet.
 */
'use strict';
const Lifecycle=require('./source-actor-lifecycle.js'),Capture=require('./source-player-capture.js'),Warp=require('./source-actor-warp-jump.js'),Motion=require('./source-actor-motion.js'),Broad=require('./source-collision-broadphase.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function actor(world,id){const a=world.actors.find(a=>a.entityId===id);if(!a)throw Error('Native bridge Actor missing: '+id);return a;}
function allCollisions(world){if(!world.storage)throw Error('Native bridge complete collision storage required');const out=[];for(const dict of [world.storage.primary,world.storage.secondary])for(const e of dict.entries)if(e.state===2){const c=Broad.getCollisionById(world.storage,e.key);if(!c)throw Error('Native bridge invalid collision storage');out.push(c);}return out;}
function view(world){return {...world,collisions:allCollisions(world)};}
function syncResult(result){if(result&&typeof result.then==='function')throw Error('Native bridge callbacks must be synchronous');if(!Number.isInteger(result)||result< -2147483648||result>2147483647)throw Error('Native event int32 return required');return result;}
function required(host,name,...args){if(typeof host?.[name]!=='function')throw Error('Native bridge '+name+' required');return host[name](...args);}
function dispatch(world,id,event,host){
 const a=actor(world,id),type=event.eventType;
 if(a.actorType===27&&[30,65,66].includes(type)){
  if(!a.player)throw Error('Native Player component required');
  const plan=Capture.plan({actor:{...a,id:a.entityId},player:a.player},event);
  for(const op of plan.operations){
   if(op.kind==='dispatch'){
    if(op.broadcastActorType!==undefined){
     const ids=required(host,'queryActorIds',world,op.broadcastActorType);
     if(!Array.isArray(ids))throw Error('Native broadcast query order required');
     for(const target of ids)dispatch(world,target,{eventType:op.eventType,sourceId:op.senderId},host);
    }else dispatch(world,op.targetId,{eventType:op.eventType,sourceId:op.ownerId,value:op.eventType===55?op.visible:op.paused},host);
   }else{
    const [group,sourceKey]=op.path.split('.'),target=group==='actor'?a:a.player;
    const key=group==='actor'?({worldVelocityRaw:'velocityRaw',moveVelocityRaw:'accelerationRaw'}[sourceKey]||sourceKey):sourceKey;
    if(op.kind==='write')target[key]=clone(op.value);
    else target[key]=(op.value?target[key]|(1<<op.bit):target[key]&~(1<<op.bit))>>>0;
   }
  }
  return plan.returnValue;
 }
 if([49,51,52,53,54,55].includes(type)){
  const receiver=Lifecycle.registry.events.find(r=>r.ordinal===a.actorType);
  if(receiver&&!['Player','Blackout','BlackoutController'].includes(receiver.actorType))return syncResult(required(host,'receiveCustomEvent',world,a,event));
  // Work on the actual Actor so nested callbacks observe owner/flag writes.
  const previous=a.ordinal;a.ordinal=a.actorType;let result;
  try {result=Lifecycle.receiveControl(a,event);}finally {if(previous===undefined)delete a.ordinal;else a.ordinal=previous;}
  for(const call of result.calls){if(call.kind==='setCollisionActive')Motion.setCollisionActive(view(world),a,call.value,call.sourceId);else if(call.kind==='notifyEvent')dispatch(world,call.targetId,{eventType:call.eventType,sourceId:call.sourceId,value:call.value},host);else throw Error('Native lifecycle call not implemented: '+call.kind);}
  return 0;
 }
 return syncResult(required(host,'receiveCustomEvent',world,a,event));
}
function motionHost(world,host){return {
 warpProc:(w,a)=>Warp.warpProc(w,a,{setVisible:(_,a,value,sourceId)=>dispatch(world,a.entityId,{eventType:55,value,sourceId},host)}),
 jumpProc:Warp.jumpProc,checkOutMap:Motion.checkOutMap,setCollisionActive:Motion.setCollisionActive
};}
function transaction(input,operation){const world=clone(input);if(!Array.isArray(world.actors))throw Error('Native bridge Actor table required');const result=operation(world);return {world,result};}
function receive(input,id,event,host={}){return transaction(input,w=>dispatch(w,id,event,host));}
function post1(input,id,host={}){return transaction(input,w=>{const a=actor(w,id),v=view(w);Motion.post1(v,a,motionHost(w,host));return null;});}
function post2(input,id){return transaction(input,w=>{const a=actor(w,id),v=view(w);Motion.post2(v,a,{setCollisionActive:Motion.setCollisionActive});return null;});}
module.exports={receive,post1,post2,allCollisions,completePhysicsFidelity:false};
