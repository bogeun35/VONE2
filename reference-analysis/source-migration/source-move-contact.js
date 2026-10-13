/* Pure ActorComponent contact transport, statically recovered; no registration.
 * FP=65536; epsilon=4 raws @0x1816a1694/16b2. Face table
 * Up=0 Down=1 Left=2 Right=3 @0x18177e46c..4f6.
 * Defaults sync=true, recursive=true, other bools=false, index/mask=0
 * @0x18177e252..25d / GetMoveContactOption 0x18169dce6.
 * Contact selection is EXACT normal equality in cached contact records,
 * NOT a new overlap/sweep @0x181691a55..a88. Supply these records explicitly.
 * flags 0x10 blocks preflight if faceNormal dot direction >=0
 * @0x1816a196d,1a0a..1a30; transport skips flags 0x10 and 0x80
 * @0x1816a0f96..faa. Layer mask @0x1816a0fb0..fce.
 * Velocity subtraction, position add, sync, type callback, recursion:
 * @0x1816a1208..12d2,1324..1377,13fa..1517,151a..157d.
 * This helper never moves the root, and transport never invokes preflight.
 * Coordinates are top-left, +y down. x/y/w/h are pixel AABBs; calculations
 * use safe integer FP raws. contacts:[{id,normal:{x,y}}], mapNormals:[{x,y}]
 * must be supplied by the collision adapter even when empty. AABB-only
 * contact generation and arbitrary type callbacks are intentionally refused.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceMoveContact=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP=65536,EPSILON=4;
const NORMALS=Object.freeze([{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].map(Object.freeze));
const DEFAULT_OPTION=Object.freeze({isEnableSyncCollisionPos:true,isEnableIgnoreTargetVelo:false,isEnableRecursive:true,isEnableAttached:false,recursiveFaceIsMov:false,calcScreenEnd:false,collisionIndex:0,targetCollisionLayerMask:0,face:0});
function raw(v){const r=v*FP;if(!Number.isSafeInteger(r))throw Error('Coordinate is not an exact safe FP raw');return r;}
function vector(v){return {x:v.xRaw===undefined?raw(v.x):v.xRaw,y:v.yRaw===undefined?raw(v.y):v.yRaw};}
function axis(v){if(v.x&&v.y)throw Error('Unresolved native diagonal normalization (0x1816463a0)');return {x:Math.sign(v.x),y:Math.sign(v.y)};}
function normal(face){if(typeof face==='object')return face;return NORMALS[face]||{x:0,y:0};}
const equal=(a,b)=>a.x===b.x&&a.y===b.y;
function setup(world,mover,option){
 const o={...DEFAULT_OPTION,...option};
 if(o.collisionIndex!==0)throw Error('Multiple collision-index adapter is unresolved');
 const bodies=world.bodies;if(!Array.isArray(bodies))throw Error('world.bodies is required');
 const root=bodies.find(b=>b.id===(typeof mover==='object'?mover.id:mover));
 const contacts=b=>{if(!Array.isArray(b.contacts))throw Error('Native cached contacts required for '+b.id);return b.contacts;};
 return {o,bodies,root,contacts,find:id=>bodies.find(b=>b.id===id)};
}
function isEnableMoveContactActor(world,mover,direction,option){
 const d=vector(direction);if(Math.abs(d.x)<EPSILON&&Math.abs(d.y)<EPSILON)return false;
 const n=axis(d),s=setup(world,mover,option);if(!s.root||s.root.hasCollision===false)return false;
 const face=normal(s.o.face),active=new Set();
 function visit(b){
  if(active.has(b.id))throw Error('Cyclic native preflight contact graph is unresolved');active.add(b.id);
  for(const c of s.contacts(b).filter(c=>equal(c.normal,n))){
   const target=s.find(c.id);if(!target)continue;
   if((target.flags||0)&0x10){if(face.x*n.x+face.y*n.y>=0)return false;continue;}
   if(!Array.isArray(target.mapNormals))throw Error('Native cached map normals required for '+target.id);
   if(target.mapNormals.some(q=>equal(q,n)))return false;
   if(target.actor===false)continue;
   // Recursive preflight always uses collision index zero; options do not filter it.
   if(target.hasCollision===false)return false;
   if(!visit(target))return false;
  }
  active.delete(b.id);return true;
 }
 return visit(s.root);
}
function moveContactActor(world,mover,delta,option){
 const d=vector(delta),s=setup(world,mover,option),moved=[],synced=[],seen=new Set();
 const out=JSON.parse(JSON.stringify(world));const targetOut=id=>out.bodies.find(b=>b.id===id);
 if(!s.root||s.root.hasCollision===false)return {world:out,moved,synced};
 if(s.o.calcScreenEnd)throw Error('CalcScreenEndWalkVeloX adapter is unresolved');
 function transport(b,amount,face){
  for(const c of s.contacts(b).filter(c=>equal(c.normal,face))){
   const t=s.find(c.id);if(!t||((t.flags||0)&0x90)||t.actor===false)continue;
   const mask=s.o.targetCollisionLayerMask;if(mask&&!(mask&(1<<((t.layer||0)&31))))continue;
   if(seen.has(t.id))continue;seen.add(t.id); // native per-call entity list @0x1816a1182..11d5
   if(t.contactResponse!=='none')throw Error('Unresolved actor-type MoveByContact callback for '+t.id+' (0x1816a1517)');
   let a={...amount};
   if(s.o.isEnableIgnoreTargetVelo){
    const n=axis(amount),v=vector(t.velocity||{x:0,y:0}),dot=n.x*v.x+n.y*v.y;
    if(dot<0)a={x:a.x-n.x*dot,y:a.y-n.y*dot};
   }
   const q=targetOut(t.id);q.x=(raw(q.x)+a.x)/FP;q.y=(raw(q.y)+a.y)/FP;
   moved.push({id:t.id,xRaw:a.x,yRaw:a.y,x:a.x/FP,y:a.y/FP});
   if(s.o.isEnableSyncCollisionPos){q.collisionX=q.x;q.collisionY=q.y;synced.push(t.id);}
   if(s.o.isEnableRecursive)transport(t,amount,s.o.recursiveFaceIsMov?axis(amount):face);
  }
 }
 transport(s.root,d,normal(s.o.face));return {world:out,moved,synced};
}
return {isEnableMoveContactActor,moveContactActor,NORMALS,DEFAULT_OPTION,completePhysicsFidelity:false};
});
