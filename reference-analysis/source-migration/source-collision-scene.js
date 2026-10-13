/* Executable rectangle scene operations for an EXPLICIT native ordered chunk.
 * This does not invent quadtree candidate order or collect a chunk from AABBs.
 * moveCollisionForce @0x1817faf72..fb06a: static0x10 refuses, exact requested
 * Map.MoveMap displacement required, then moveCollidedCollision recursion.
 * moveCollidedCollision @0x1817fb171..5a3: max depth16, extend each moving
 * component by QFP._0_001=65 (cctor0x181780cc0 static+8), reject backwards
 * component projections, reject static source/target, require full Map move.
 * forceMoveSide @0x1817fdc10: ID dedup, Map move, recurse same delta into
 * overlapped layer1/2 candidates in movement direction (no layer matrix gate).
 * Native updateMap @0x1817f8fac..9029 rewinds moving map targets to prePos,
 * then runs Map.MoveMap. Cache callback order @0x1816940c1..197 is preserved.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-collision-map.js'):root.SourceCollisionMap,c?require('./source-collision-rect.js'):root.SourceCollisionRect,c?require('./source-move-contact.js'):root.SourceMoveContact,c?require('./source-collision-inertia.js'):root.SourceCollisionInertia);if(c)module.exports=api;root.SourceCollisionScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(MapMove,Rect,Contacts,Inertia){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
const find=(w,id)=>{const b=w.collisions.find(b=>b.id===id);if(!b)throw Error('Native collision missing: '+id);return b;};
function bounds(b,pre=false){const r=pre?b.preRectRaw:b.rectRaw;if(b.collisionType!==0||!r)throw Error('Only resolved rectangle bounds supported');return {x:(pre?b.preXRaw:b.xRaw)+r.x,y:(pre?b.preYRaw:b.yRaw)+r.y,width:r.width,height:r.height};}
function overlap(a,b,pre=false){if(a.entityId===b.entityId||((a.flags|b.flags)&1))return false;const x=bounds(a,pre),y=bounds(b,pre);return x.x<y.x+y.width&&y.x<x.x+x.width&&x.y<y.y+y.height&&y.y<x.y+x.height;}
function layer(w,a,b){const value=w.layerChecks?.[a.layer]?.[b.layer];if(typeof value!=='boolean')throw Error('Native collision layer matrix missing');return value;}
function mapMove(w,b,delta){const r=MapMove.moveMap(w.map,b,delta);Object.assign(b,r.collision);return r;}
function moveCollided(w,source,d,depth){
 if(depth>16)return false;if(!(source.pushBackTarget&2))return true;
 const move={xRaw:d.xRaw+(Math.abs(d.xRaw)>=4?Math.sign(d.xRaw)*65:0),yRaw:d.yRaw+(Math.abs(d.yRaw)>=4?Math.sign(d.yRaw)*65:0)};
 for(const b of w.collisions){
  if(b.id===source.id||!(b.pushBackTarget&2)||!layer(w,source,b)||!overlap(source,b)||overlap(source,b,true))continue;
  if(mul(b.xRaw-source.xRaw,move.xRaw)<0||mul(b.yRaw-source.yRaw,move.yRaw)<0)continue;
  if((source.flags|b.flags)&0x10)return false;
  const result=mapMove(w,b,move);
  if(result.delta.xRaw!==move.xRaw||result.delta.yRaw!==move.yRaw||!moveCollided(w,b,move,depth+1))return false;
 }
 return true;
}
function forceCollision(w,id,target){
 const b=find(w,id);if(b.flags&0x10)return {collision:clone(b),success:false};
 const d={xRaw:target.x-b.xRaw,yRaw:target.y-b.yRaw},r=mapMove(w,b,d);
 const success=r.delta.xRaw===d.xRaw&&r.delta.yRaw===d.yRaw&&(Math.abs(d.xRaw)<4&&Math.abs(d.yRaw)<4||moveCollided(w,b,d,0));
 return {collision:clone(b),success};
}
function add(w,c){
 const r=Contacts.addContactInfo({bodies:w.collisions},c.ownerId,c.targetId,c.face);
 find(w,c.ownerId).contacts=r.world.bodies.find(b=>b.id===c.ownerId).contacts;
}
function updatePair(w,aId,bId,options={}){
 const a=find(w,aId),b=find(w,bId),r=Rect.update(a,b,{...options,layerEnabled:layer(w,a,b),forceMove:(other,target,ctx)=>({...forceCollision(w,other.id,target),sourceCollision:clone(find(w,ctx.sourceId))})});
 Object.assign(a,r.a);Object.assign(b,r.b);for(const c of r.contacts)add(w,c);return r.code;
}
function forceSide(w,id,d,seen=new Set()){
 if(seen.has(id))return;seen.add(id);const source=find(w,id);mapMove(w,source,d);
 for(const b of w.collisions){
  if(b.id===id||!(b.pushBackTarget&2)||![1,2].includes(b.layer))continue;
  if((BigInt.asIntN(64,BigInt(b.xRaw-source.xRaw)*BigInt(d.xRaw))&-65536n)<=0n)continue;
  if(overlap(source,b))forceSide(w,b.id,d,seen);
 }
}
function updateMap(input){const w=clone(input);for(const b of w.collisions)if((b.flags&64)&&(b.pushBackTarget&1)){
 const d={xRaw:b.xRaw-b.preXRaw,yRaw:b.yRaw-b.preYRaw};b.xRaw=b.preXRaw;b.yRaw=b.preYRaw;b.flags&=~64;mapMove(w,b,d);
 }return w;}
function postPushBack(input,host={}){return Inertia.apply(input,{updatePushBack:updatePair,forceMoveSide:forceSide,...host});}
function applyPair(input,aId,bId,options={}){const world=clone(input),code=updatePair(world,aId,bId,options);return {world,code};}
// ForceSearchUp 0x181693c76..e89 halves X scale, searches along gravity's
// opposite face, restores scale, and ALWAYS appends face0 (@181693e03).
// SearchCollidedCollisions 0x1817f70a0..7280 scans the explicit chunk order,
// skips existing overlap, probes QFP._0_50=32768, then tests target center.
function discoverForcedContacts(w,b){
 if(!b.baseRectRaw||!b.scaleRaw||!b.pivotRaw)throw Error('ForceSearchUp requires native base rectangle, scale and pivot');
 const halfScale={...b.scaleRaw,xRaw:mul(b.scaleRaw.xRaw,32768)};
 const source={...b,rectRaw:Rect.getRect(b.baseRectRaw,halfScale,b.pivotRaw)};
 const a=bounds(source),down=!!(b.flags&256),probe={...a,y:a.y+(down?32768:-32768)};
 const intersect=(x,y)=>x.x<y.x+y.width&&y.x<x.x+x.width&&x.y<y.y+y.height&&y.y<x.y+x.height;
 if(!(b.pushBackTarget&2))return;
 for(const target of w.collisions){
  if(target.id===b.id||(target.flags&1)||!(target.pushBackTarget&2)||!layer(w,target,b)||target.entityId===b.entityId)continue;
  const t=bounds(target);
  if(intersect(a,t)||!intersect(probe,t))continue;
  const center=t.y+mul(t.height,32768);
  if(down?center>a.y+a.height:center<a.y)add(w,{ownerId:b.id,targetId:target.id,face:0});
 }
}
function refreshContacts(input,host={}){
 const w=clone(input),events=[];
 for(const b of w.collisions){
  if(b.flags&0x20)discoverForcedContacts(w,b);
  if(!Array.isArray(b.contacts))throw Error('Native contact cache required');
  const remove=[];const count=b.contacts.length;
  for(let i=0;i<count;i++){
   const c=b.contacts[i],target=w.collisions.find(q=>q.id===c.id);
   const fact=q=>({...q,collisionRectRaw:bounds(q)});
   if(!Contacts.retainsRectContact(fact(b),target?fact(target):null,c)){remove.push(i);continue;}
   if(!Number.isInteger(c.state))throw Error('Native contact State required');
   for(const type of c.state===0?['OnContactAdded','OnContacted']:['OnContacted']){
    if(type==='OnContactAdded')c.state=1;
    const event={type,ownerId:b.id,targetId:c.id,normal:{...c.normal},isCollision:true};
    if(typeof host.onContact!=='function')throw Error('Native contact callback adapter required');
    events.push(event);host.onContact(w,event);
   }
  }
  for(let i=remove.length-1;i>=0;i--)b.contacts.splice(remove[i],1);
 }
 return {world:w,events};
}
return {applyPair,postPushBack,updateMap,refreshContacts,completePhysicsFidelity:false};
});
