/* ThornComponent native collision allocation and late overlap callback.
 * InitCollision181720c10 loops TWO rectangles, push0/sync1/layer7; table
 * cctor1817227c5..28c6 is shared with the frozen ceiling module.
 * KillPlayer181722350 returns true for ActorType27 even if Player is absent
 * or not state1; only state1 receives event43. Type173 always receives43.
 * requestDisappear1817221d0 only accepts phases1..3, sets phase4 and Velo0;
 * flag0 additionally sets flag1 and disables collisions using component entity.
 * OnCollided181722050 skips flags0+1, calls KillPlayer, then type28 handling.
 * Contacted181721b20: map ignored on belt, collision KillPlayer suppresses
 * sound even for non-default Players, then disappearance; sound only normalY>0.
 * PushedBack181721c90 replays holder0 cached contacts at -sign(correction).
 * Update/parameter parsing are not implemented here.
 */
'use strict';
const Factory=require('./source-native-collision-factory.js');
const Broad=require('./source-collision-broadphase.js');
const table=require('./source-thorn-ceiling-devices.js').nativeConstants.thornCollision;
const F=65536;
function state(actor){const t=actor.thorn;if(!t||!Number.isInteger(t.flags)||!Number.isInteger(t.phase)||!Number.isInteger(t.beltPhase))throw Error('Native Thorn state required');return t;}
function requireHost(host,name){if(typeof host?.[name]!=='function')throw Error('Native Thorn '+name+' required');return host[name];}
function collision(world,id){return world.collisions?.find(c=>c.id===id)||(world.storage?Broad.getCollisionById(world.storage,id):null);}
function createCollisions(world,actor,direction){
 if(!Number.isInteger(direction)||direction<0||direction>3)throw Error('Native Thorn direction required');
 return table[direction].map(r=>{const body=Factory.createRect(world,actor,{height:r.h*F,width:r.w*F,x:r.x*F,y:r.y*F},0,true);if(body)body.layer=7;return body;});
}
function killPlayer(world,actor,target,host){
 const other=requireHost(host,'actorById')(world,target.entityId);if(other===null)return false;
 if(!other||!Number.isInteger(other.actorType))throw Error('Resolved native target Actor required');
 if(other.actorType===27){
  const p=requireHost(host,'playerForActor')(world,other);if(p===null)return true;
  if(!p||!Number.isInteger(p.state))throw Error('Native Player state required');
  if(p.state!==1)return true;
  // Native Frame.NotifyEvent targets Player.m_EntityRef (+0x28), not a guess
  // that Player and Actor references always match. The host owns that dispatch.
  requireHost(host,'notifyPlayerEvent')(world,actor,p,{eventType:43});return true;
 }
 if(other.actorType!==173)return false;
 requireHost(host,'notifyActorEvent')(world,actor,other,{eventType:43});return true;
}
function requestDisappear(world,actor,host){
 const t=state(actor);if(t.phase<1||t.phase>3)return;
 if(t.flags&1){if(typeof t.entityId!=='string')throw Error('Native Thorn component entity required');t.flags|=2;requireHost(host,'setCollisionActive')(world,actor,false,t.entityId);}
 actor.velocityRaw={xRaw:0,yRaw:0};t.phase=4;
}
function onCollided(world,actor,own,event,host){
 const t=state(actor);if((t.flags&3)===3)return;
 const target=collision(world,event.targetId);if(!target)throw Error('Native Thorn target collision missing');
 killPlayer(world,actor,target,host);
 // Native performs a second lookup after synchronous damage dispatch.
 const other=requireHost(host,'actorById')(world,target.entityId);if(other===null)return;
 if(!other||!Number.isInteger(other.actorType))throw Error('Resolved native target Actor required');
 if(other.actorType!==28)return;
 requestDisappear(world,actor,host);
 if(t.beltPhase===0)requireHost(host,'playDisappearSe')(world,actor);
}
function onContacted(world,actor,own,event,host){
 const t=state(actor);if((t.flags&3)===3)return;
 if(typeof event.isCollision!=='boolean')throw Error('Native Thorn contact kind required');
 let sound=true;
 if(!event.isCollision){if(t.beltPhase!==0)return;}
 else {const target=collision(world,event.targetId);if(!target)throw Error('Native Thorn target collision missing');sound=!killPlayer(world,actor,target,host);}
 requestDisappear(world,actor,host);
 // QFP TypeInfo slot1831d0a40 static+0 is QFP._0.
 if(sound){if(!Number.isSafeInteger(event.normal?.y*F))throw Error('Native Thorn contact normal required');if(event.normal.y>0)requireHost(host,'playDisappearSe')(world,actor);}
}
function onPushedBack(world,actor,own,event,host){
 const holder=actor.collisionHolders[0];if(!holder)return;
 const lookup=id=>collision(world,id);
 const first=lookup(holder.collisionId);if(!first)return;
 const delta=event.correctionRaw;if(!Number.isSafeInteger(delta?.xRaw)||!Number.isSafeInteger(delta?.yRaw)||!Array.isArray(first.contacts))throw Error('Native Thorn correction and cached contacts required');
 const normal={x:-Math.sign(delta.xRaw)||0,y:-Math.sign(delta.yRaw)||0};
 // Native GetContactCollisionList materializes ordered IDs before callbacks.
 const ids=first.contacts.filter(c=>c.normal.x===normal.x&&c.normal.y===normal.y).map(c=>c.id);
 for(const id of ids){const target=lookup(id);if(!target)continue;onContacted(world,actor,first,{isCollision:true,targetId:id,normal},host);}
}
module.exports={createCollisions,killPlayer,requestDisappear,onCollided,onContacted,onPushedBack,completePhysicsFidelity:false};
