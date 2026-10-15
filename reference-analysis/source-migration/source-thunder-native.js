/* ThunderBase native collider/probe core. InitCollision18172aa50 ALWAYS
 * creates beam then probe. Beam priority127/layer7/push0; probe defaultlayer0,
 * push2 through, push3 otherwise, both sync=true. Static table18172b6ec..ba40:
 * width4,length2400, probe32x32(-16,-16), direction up/down/left/right.
 * getLengthToMap18172acc0: cached bit2 skip; reset probe cur/pre to Actor pos,
 * clear inactive0/moved6, native Map.Move output displacement -> FPSqrt +
 * half probe WIDTH. Probe stays at emitter (Map return position is ignored).
 * Hide probe afterwards unless ShootBlock bit1; set cached bit2.
 * OnUpdate18172ac00 visible only: get map length, reset live length, resize beam.
 * modifyCollision18172b380 modifies BASE rect, preserving scale history.
 */
'use strict';
const Factory=require('./source-native-collision-factory.js'),Broad=require('./source-collision-broadphase.js'),MapMove=require('./source-collision-map.js'),Gear=require('./source-gear-devices.js'),Rect=require('./source-collision-rect.js');
const F=65536,LENGTH=157286400,WIDTH=262144;
const rects=[{height:LENGTH,width:WIDTH,x:-131072,y:-LENGTH},{height:LENGTH,width:WIDTH,x:-131072,y:0},{height:WIDTH,width:LENGTH,x:-LENGTH,y:-131072},{height:WIDTH,width:LENGTH,x:0,y:-131072}];
const vectors=[{xRaw:0,yRaw:-LENGTH},{xRaw:0,yRaw:LENGTH},{xRaw:-LENGTH,yRaw:0},{xRaw:LENGTH,yRaw:0}];
function validate(t){if(!Number.isInteger(t.direction)||t.direction<0||t.direction>3||!Number.isInteger(t.flags)||t.flags<0||t.flags>65535)throw Error('Native ThunderBase direction/flags required');}
function createCollisions(world,actor,t){validate(t);if(actor.collisionHolders.length)throw Error('ThunderBase must create the first two Actor holders');const beam=Factory.createRect(world,actor,rects[t.direction],0,true);if(beam){beam.priority=127;beam.layer=7;}const probe=Factory.createRect(world,actor,{height:32*F,width:32*F,x:-16*F,y:-16*F},t.flags&1?2:3,true);return {beam,probe};}
function collider(world,actor,index){const h=actor.collisionHolders[index];if(!h)throw Error('Native Thunder collider holder missing');const c=Broad.getCollisionById(world.storage,h.collisionId);if(!c)throw Error('Native Thunder collider missing');return c;}
function raw(n){if(!Number.isSafeInteger(n))throw Error('Native Thunder exact raw required');return n;}
const product=(a,b)=>BigInt.asIntN(64,BigInt(raw(a))*BigInt(raw(b)))>>16n;
function getLengthToMap(world,actor,t){validate(t);if(t.flags&4)return;const probe=collider(world,actor,1),p=actor.positionRaw;raw(p?.xRaw);raw(p?.yRaw);probe.flags&=~65;probe.xRaw=probe.preXRaw=p.xRaw;probe.yRaw=probe.preYRaw=p.yRaw;
 probe.rectRaw=Rect.getRect(probe.baseRectRaw,probe.scaleRaw,probe.pivotRaw);
 const moved=MapMove.mapMove(world.map,probe,vectors[t.direction]);
 const square=BigInt.asIntN(64,product(moved.delta.xRaw,moved.delta.xRaw)+product(moved.delta.yRaw,moved.delta.yRaw)),distance=Gear.nativeSqrtRaw(square),width=Rect.getRect(probe.baseRectRaw,probe.scaleRaw,probe.pivotRaw).width;
 const halfWidth=Number(BigInt.asIntN(64,BigInt(raw(width))<<16n)/131072n),length=raw(distance+halfWidth);t.lengthRaw=t.lengthToMapRaw=length;if(!(t.flags&2))probe.flags|=1;t.flags|=4;
}
function modifyCollision(world,actor,t){validate(t);raw(t.lengthRaw);const beam=collider(world,actor,0),r={...beam.baseRectRaw};if(t.direction<2){r.height=t.lengthRaw;if(t.direction===0)r.y=-t.lengthRaw;}else {r.width=t.lengthRaw;if(t.direction===2)r.x=-t.lengthRaw;}beam.baseRectRaw=r;beam.rectRaw=Rect.getRect(r,beam.scaleRaw,beam.pivotRaw);beam.preRectRaw=Rect.getRect(r,beam.preScaleRaw,beam.pivotRaw);}
function update(world,actor,t){validate(t);if(!Number.isInteger(actor.flags))throw Error('Native Actor flags required');if(actor.flags&8)return;getLengthToMap(world,actor,t);t.lengthRaw=t.lengthToMapRaw;modifyCollision(world,actor,t);}
// ThunderComponent.OnCollided18172d030 forwards to Base18172b000.
// Probe collisionIndex1 returns before lookup. Player27 ignores deadbit9;
// ActorType173 gets event26 directly. Other actors shorten only when !Through.
function onCollided(world,actor,own,event,host){if(!Number.isInteger(own.collisionIndex))throw Error('Native collision holder index required');if(own.collisionIndex===1)return;const target=world.collisions.find(b=>b.id===event.targetId);if(!target)throw Error('Native Thunder target collision missing');if(typeof host?.actorById!=='function')throw Error('Native Thunder Actor lookup required');const other=host.actorById(world,target.entityId);if(other===null)return;if(!other||!Number.isInteger(other.actorType))throw Error('Resolved native target Actor required');if(other.actorType===27){if(typeof host.playerForActor!=='function')throw Error('Native Thunder Player lookup required');const p=host.playerForActor(world,other);if(p===null)return;if(!p||!Number.isInteger(p.flags))throw Error('Native Player flags required');if(p.flags&512)return;}else if(other.actorType!==173){const t=actor.thunder;validate(t);if(t.flags&1)return;if(typeof host.calcLengthCollided!=='function')throw Error('Native Thunder calcLengthCollided required');host.calcLengthCollided(world,actor,target);return;}if(typeof host.notifyActorEvent!=='function')throw Error('Native Thunder event26 dispatcher required');host.notifyActorEvent(world,actor,other,{eventType:26});}
module.exports={createCollisions,getLengthToMap,modifyCollision,update,onCollided,completePhysicsFidelity:false};
