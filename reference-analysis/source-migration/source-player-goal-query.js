/* PlayerDefault Press8+Press4 Goal suppression query, static native recovery.
 * checkReverse0x1816c40a2..41bd: Frame.GetGoal, Goal.flags bit0, goal's stored
 * EntityRef+8 -> Actor.GetCollision(index0), Collision.IsCollided(current,
 * zero offsets, ignoreInactive=false). Not a scan over Goal actor types.
 * Frame.GetGoal0x181748590 reads ActorManager.m_Goal raw+0x48 and TryGet.
 * Goal.Creator0x18185f728 stores each completed Goal actor ref into m_Goal;
 * last completed creation wins, even if closed/non-overlapping. No ID sort.
 * Flags0/m_EntityRef8 confirmed Goal metadata; IsOpen0x18172f170 tests bit0.
 * Collision.IsCollided0x181691f1b..39 rejects same entity/inactivebit0.
 * GetRect0x181690610 uses CURRENT base rectangle/scale/pivot then collision
 * position. Strict comparisons0x18169223e/24b/258/265 reject touching edges.
 * Reuse source-collision-rect.GetRect and source-collision-scene.IsCollided;
 * never use actor position, assumed stage coordinates or arbitrary bounds.
 * Goal.InitCollision0x18185f750 is rect0/layer12; factory already exists.
 * Goal contact opening remains source-goal-contact ownership, not duplicated.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-collision-rect.js'):root.SourceCollisionRect,c?require('./source-collision-scene.js'):root.SourceCollisionScene);if(c)module.exports=api;root.SourcePlayerGoalQuery=api;})(globalThis,function(Rect,Scene){
'use strict';
function raw(v,name){if(!Number.isSafeInteger(v))throw Error('PlayerGoalQuery exact safe raw required: '+name);return v;}
function entity(v){if(v!==null&&typeof v!=='string'&&!Number.isSafeInteger(v))throw Error('PlayerGoalQuery resolved native EntityRef key or null required');return v;}
function collision(c,label){if(!c||c.entityId===null||c.entityId===undefined)throw Error('PlayerGoalQuery '+label+' native collision entity required');entity(c.entityId);if(!Number.isInteger(c.flags)||c.flags<0||c.flags>65535)throw Error('PlayerGoalQuery '+label+' native collision flags required');if(![0,1].includes(c.collisionType))throw Error('PlayerGoalQuery unsupported collision shape');raw(c.xRaw,label+' collisionX');raw(c.yRaw,label+' collisionY');return c;}
function getCurrentRect(c){if(typeof Rect?.getRect!=='function')throw Error('PlayerGoalQuery SourceCollisionRect required');const r=Rect.getRect(c.baseRectRaw,c.scaleRaw,c.pivotRaw);if(r.width<0||r.height<0)throw Error('PlayerGoalQuery negative scaled rectangle unresolved');for(const k of ['x','y','width','height'])raw(r[k],'current GetRect.'+k);raw(c.xRaw+r.x,'world left');raw(c.yRaw+r.y,'world top');raw(c.xRaw+r.x+r.width,'world right');raw(c.yRaw+r.y+r.height,'world bottom');return {...c,rectRaw:r};}
function overlapCurrent(playerCollision,goalCollision){const p=collision(playerCollision,'Player'),g=collision(goalCollision,'Goal');if(p.entityId===g.entityId||((p.flags|g.flags)&1))return false;if(g.collisionType!==0)throw Error('PlayerGoalQuery only native Goal rectangle collider is verified');if(typeof Scene?.isCollided!=='function')throw Error('PlayerGoalQuery SourceCollisionScene required');return Scene.isCollided(getCurrentRect(p),getCurrentRect(g));}
function createHost(options={}){for(const key of ['getManagerGoalRef','goalByEntity','actorByEntity','collisionById'])if(typeof options[key]!=='function')throw Error('PlayerGoalQuery actual native host lookup required: '+key);
 function openGoalOverlap(player,actor,playerCollision){const ref=entity(options.getManagerGoalRef());if(ref===null)return false;const goal=options.goalByEntity(ref);if(goal===null)return false;if(!goal||!Number.isInteger(goal.flags)||goal.flags<0||goal.flags>65535)throw Error('PlayerGoalQuery actual Goal flags required');if(!(goal.flags&1))return false;const ownerRef=entity(goal.entityId);if(ownerRef===null)return false;const goalActor=options.actorByEntity(ownerRef);if(goalActor===null)return false;if(!goalActor||!Array.isArray(goalActor.collisionHolders))throw Error('PlayerGoalQuery actual Actor collision holder order required');if(goalActor.collisionHolders.length===0)return false;const id=goalActor.collisionHolders[0]?.collisionId;if(typeof id!=='string'&&!Number.isSafeInteger(id))throw Error('PlayerGoalQuery native collision index0 holder ID required');const goalCollision=options.collisionById(id);if(goalCollision===null)return false;if(!goalCollision)throw Error('PlayerGoalQuery collision lookup must resolve snapshot or null');return overlapCurrent(playerCollision,goalCollision);}
 return {openGoalOverlap};
}
return {createHost,overlapCurrent,supportedTypes:[],completePhysicsFidelity:false};
});
