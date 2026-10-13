/* Player collision callbacks from static GameAssembly analysis; no native run.
 * OnContactAdded/Contacted dispatch only state1 @1816c1b50/1816c1c20.
 * Added_Default1816c6c50: gravity flag0x800000 selects ceiling sign; ordinary
 * upward hit against non-player calls NotifyJump37(vy/(UpDepth+1)), then vy0.
 * Contacted_Default1816c6df0: only velocity directed into a horizontal normal
 * triggers ice transfer or vx0, clears Actor accel/jump and Player forced jump.
 * resetForceJumpVelo1816c6150 clears Player+98 vector and flags bits4/5.
 * Ice1816c6f40 requires target layer1, both Actor flags0x800000 and input bits
 *0x0c or Actor position change >=4raw. Transfer factor QFP._0_75=49152
 * (static+0xb8); both velocities clamp to owner's maxOnIce(+0x90).
 * Collision.GetContactRecursiveMax181695110 matches exact normal/layer mask
 * and returns deepest edge count; absent targets do not contribute.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerContact=api;})(globalThis,function(){
'use strict';
const raw=n=>{if(!Number.isSafeInteger(n))throw Error('Player contact requires exact raw');return n;};
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(raw(a))*BigInt(raw(b)))>>16n);
const vector=v=>{raw(v?.xRaw);raw(v?.yRaw);return v;};
const actor=(w,id)=>{if(!Array.isArray(w.actors))throw Error('Native Actor lookup table required');return w.actors.find(a=>a.entityId===id);};
function recursiveDepth(w,b,normal={x:0,y:-1},mask=-1,active=new Set()){
 if(active.has(b.id))throw Error('Cyclic native contact graph');if(!Array.isArray(b.contacts))throw Error('Native contact cache required');active.add(b.id);let depth=0;
 for(const c of b.contacts){const other=w.collisions.find(q=>q.id===c.id);if(!other||!(mask&(1<<(other.layer&31)))||c.normal.x!==normal.x||c.normal.y!==normal.y)continue;depth=Math.max(depth,1+recursiveDepth(w,other,normal,mask,active));}
 active.delete(b.id);return depth;
}
function ice(w,a,other){
 if(!other||other.layer!==1||!(a.flags&0x800000))return false;
 const b=actor(w,other.entityId);if(!b||!(b.flags&0x800000))return false;
 const p=a.player;if(!Number.isInteger(p.inputBit))throw Error('Native Player inputBit required');
 if(!(p.inputBit&12)){
  const pos=vector(a.positionRaw),pre=vector(a.prePositionRaw);
  if(Math.abs(pre.xRaw-pos.xRaw)<4&&Math.abs(pre.yRaw-pos.yRaw)<4)return false;
 }
 let vx=vector(a.velocityRaw).xRaw,ovx=vector(b.velocityRaw).xRaw;
 if(mul(vx,ovx)<0){const original=vx;vx+=mul(ovx,49152);ovx+=mul(original,49152);}
 else if(Math.abs(ovx)<Math.abs(vx))ovx+=mul(vx,49152);
 const max=raw(p.walkSpeedMaxOnIceRaw),clamp=v=>Math.max(-max,Math.min(max,v));
 a.velocityRaw.xRaw=clamp(vx);b.velocityRaw.xRaw=clamp(ovx);return true;
}
// Mutates the owning pipeline clone so later callbacks observe these changes.
function onContact(w,e,host={}){
 const collision=w.collisions.find(b=>b.id===e.ownerId);if(!collision)throw Error('Player collision missing');
 const a=actor(w,collision.entityId);if(!a?.player)throw Error('Native Player/Actor facts required');
 const p=a.player;if(!Number.isInteger(p.state)||!Number.isInteger(p.flags)||!Number.isInteger(a.flags))throw Error('Native Player state/flags required');
 if(p.state!==1)return;
 const v=vector(a.velocityRaw),n={xRaw:raw(e.normal.x*65536),yRaw:raw(e.normal.y*65536)};
 const other=e.targetId===null?null:w.collisions.find(b=>b.id===e.targetId);
 if(e.type==='OnContactAdded'){
  if(p.flags&0x800000){if(n.yRaw>0&&v.yRaw>0)v.yRaw=0;return;}
  if(n.yRaw>=0||v.yRaw>=0)return;
  if(other&&other.layer!==1){
   const amount=Number(BigInt(v.yRaw)/BigInt(recursiveDepth(w,other)+1));
   if(typeof host.notifyJump!=='function')throw Error('Native Actor.NotifyJump dispatcher required');
   host.notifyJump(w,a,other,{eventType:37,velocityRaw:amount,incrementRaw:amount});
  }
  v.yRaw=0;return;
 }
 if(e.type!=='OnContacted')throw Error('Unsupported Player contact callback');
 if(!(n.xRaw<0&&v.xRaw<0||n.xRaw>0&&v.xRaw>0))return;
 if(!ice(w,a,other))v.xRaw=0;
 a.accelerationRaw={xRaw:0,yRaw:0};a.jumpVelocityRaw={xRaw:0,yRaw:0};
 p.jumpVelocityRaw={xRaw:0,yRaw:0};p.flags&=~48;
}
return {onContact,recursiveDepth,completePhysicsFidelity:false};
});
