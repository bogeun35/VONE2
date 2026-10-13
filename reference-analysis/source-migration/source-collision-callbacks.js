/* CollisionCallbacks.initCallbacks0x18177baa0: 115 static registrations.
 * Evidence extracted from method slots/MethodSpecs, not inferred from names.
 * Invoke ContactAdded/Contacted/Collided/MoveByContact skip Actor pause bit4
 * @0x18177d518/d728/d2a0/d90a. PushedBack/ChangeScale have no pause gate.
 * Missing Actor or missing dictionary entry returns before dispatch.
 * Registered but unimplemented callbacks MUST throw, never act as a no-op.
 */
'use strict';
const evidence=require('./collision-callback-registry.json');
const kinds=['OnContactAdded','OnContacted','OnCollided','OnMoveByContact','OnPushedBack','OnChangeScale'];
const rows=new Map();
for(const r of evidence.registrations){const kind=r.method.split('add_')[1],key=r.ordinal+':'+kind;if(!kinds.includes(kind)||rows.has(key))throw Error('Invalid native collision registration '+key);rows.set(key,Object.freeze({...r,components:Object.freeze([...r.components])}));}
function lookup(ordinal,kind){if(!Number.isInteger(ordinal)||ordinal<0||ordinal>65535)throw Error('Native ActorType ushort required');if(!kinds.includes(kind))throw Error('Unknown collision callback '+kind);return rows.get(ordinal+':'+kind)||null;}
function has(ordinal,kind){return lookup(ordinal,kind)!==null;}
function invoke(world,actor,collision,event,implementations){
 if(actor===null)return {invoked:false,reason:'actor-absent'};
 if(!actor||!Number.isInteger(actor.flags))throw Error('Resolved native Actor and flags required');
 if(['OnContactAdded','OnContacted','OnCollided','OnMoveByContact'].includes(event.type)&&(actor.flags&16))return {invoked:false,reason:'actor-paused'};
 const row=lookup(actor.actorType,event.type);if(!row)return {invoked:false,reason:'unregistered'};
 const name=row.components[0]+'.'+event.type,callback=implementations?.[name];
 if(typeof callback!=='function')throw Error('Native collision callback not implemented: '+name+' @'+row.callbackVA);
 callback(world,actor,collision,event,row);return {invoked:true,callback:name,va:row.callbackVA};
}
function createHost(implementations,host){
 if(typeof host?.actorForCollision!=='function'||typeof host?.syncActorPosition!=='function')throw Error('Resolved Actor lookup and position synchronization required');
 const owner=(w,id)=>{const b=w.collisions.find(c=>c.id===id);if(!b)throw Error('Collision owner missing: '+id);return b;};
 const dispatch=(w,b,e)=>invoke(w,host.actorForCollision(w,b),b,e,implementations);
 return {...host,
  hasOnChangeScale:b=>has(b.actorType,'OnChangeScale'),hasOnPushedBack:b=>has(b.actorType,'OnPushedBack'),
  onContact:(w,e)=>dispatch(w,owner(w,e.ownerId),e),
  onCollided:(w,b,other,e)=>dispatch(w,b,e),
  onChangeScale:(w,b,e)=>dispatch(w,b,{...e,type:'OnChangeScale'}),
  onPushedBack:(w,b,e)=>dispatch(w,b,{...e,type:'OnPushedBack'})};
}
module.exports={lookup,has,invoke,createHost,kinds:Object.freeze(kinds),registrationCount:rows.size,completePhysicsFidelity:false};
