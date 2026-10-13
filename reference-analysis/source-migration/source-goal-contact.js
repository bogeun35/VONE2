/* GoalComponent.OnCollided0x18185f970. Goal flags raw+0, Player flags raw+0x20.
 * Layer1 while Goal bit0 set: GetComponent<Player> MethodSpec96393 from
 * slot0x1831d2918, set Player bit16 @18185fa15..1c; no Player => return.
 * Layer10 while closed: FrameEvents.PlaySe(EntityRef.None,9,(0,0),1,1,false), then bit0.
 * The callback does not clear the stage or request a Player state directly.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceGoalContact=api;})(globalThis,function(){
'use strict';
function onCollided(world,actor,collision,event,host){
 const goal=actor.goal;if(!goal||!Number.isInteger(goal.flags)||goal.flags<0||goal.flags>65535)throw Error('Native Goal flags required');
 const target=world.collisions.find(b=>b.id===event.targetId);if(!target)throw Error('Native Goal target collision required');
 if(target.layer===1&&(goal.flags&1)){
  if(typeof host?.playerByEntityId!=='function')throw Error('Native Goal Player component lookup required');
  const p=host.playerByEntityId(world,target.entityId);if(p===null)return;
  if(!p||!Number.isInteger(p.flags))throw Error('Resolved native Player flags required');p.flags=(p.flags|65536)>>>0;
 }else if(target.layer===10&&!(goal.flags&1)){
  if(typeof host?.playSe!=='function')throw Error('Native Goal FrameEvents.PlaySe required');
  host.playSe(world,{entityId:null,seId:9,positionRaw:{xRaw:0,yRaw:0},volumeRaw:65536,pitchRaw:65536,isDisableCheckBlankTime:false});
  goal.flags|=1;
 }
}
return {onCollided,completePhysicsFidelity:false};
});
