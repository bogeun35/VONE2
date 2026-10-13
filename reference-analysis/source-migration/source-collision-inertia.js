/* CollisionScene postPushBack/updateInertia/moveForInertia, static core.
 * Snapshot delta=(currentX-preX,0) @0x1817fc1c2..1d9, per-root visited list
 * @0x1817fc2ab, root flag0x400 camera policy @0x1817fc3b2.
 * Sources layers1/2/13, flag0x80 excludes @0x1817fc552..56b.
 * Gravity0x100 selects Down instead of Up; 0x200 adds opposite face and
 * permits different gravity @0x1817fc778..83d / 0x1817fcf47..58.
 * Snapshot contacts sorted leading X first @0x1818007d0..819.
 * Recipient layers1/2 only @0x1817fd257..272; Player wakeUpCount=0 skips
 * after attached-equipment processing @0x1817fd489..830. Native Initialize
 * sets wakeUpCount and wakeUpInitCount=1 @0x1816bd5e9; sleeping getter bf5e0.
 * Map.MoveMap slide=true @0x1817fd8aa; pair pushback uses movement-start
 * anchor and other current anchor @0x1817fd96b..da20, rescan max4 @da29.
 * Right camera clamp, left forceMoveSide @0x1817fda98..dba2.
 * fixPlayerPos: layers1/2/13 prePos=current, clear flag64 @0x1817fe2b4..e1.
 * Requires native ordered collision list/cache and explicit player facts.
 * Pair/force callbacks execute on this call's clone. They are never serialized.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-collision-map.js'):root.SourceCollisionMap);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCollisionInertia=api;})(typeof globalThis!=='undefined'?globalThis:this,function(MapMove){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),F=65536;
function apply(input,host={}){
 const world=clone(input),trace=[];
 if(typeof world.isEnableInertia!=='boolean'||!Array.isArray(world.collisions))throw Error('Native inertia enable flag and ordered collisions required');
 if(!world.isEnableInertia)return {world,trace};
 const list=world.collisions,find=id=>list.find(b=>b.id===id);
 if(new Set(list.map(b=>b.id)).size!==list.length)throw Error('Duplicate collision identity');
 for(const b of list)if(!Number.isSafeInteger(b.xRaw)||!Number.isSafeInteger(b.preXRaw)||!Number.isInteger(b.layer)||!Number.isInteger(b.flags)||!Array.isArray(b.contacts))throw Error('Native collision snapshot required');
 const deltas=list.map(b=>b.xRaw-b.preXRaw);
 function move(target,dx,restrict,seen,relatedId=null){
  if(target.flags&0x80||![1,2].includes(target.layer)||relatedId===null&&seen.has(target.id))return;
  if(target.layer===1){
   if(target.playerFacts===undefined)throw Error('Explicit native Player lookup result required');
   const p=target.playerFacts;
   if(p!==null){
    if(!Number.isInteger(p.wakeUpCount)||p.inertiaAttachmentId===undefined)throw Error('Native Player wakeUp/equipment facts required');
    const attached=p.inertiaAttachmentId===null?null:find(p.inertiaAttachmentId);
    if(p.inertiaAttachmentId!==null&&!attached)throw Error('Native attached collision missing');
    if(attached&&attached.id!==relatedId&&!seen.has(attached.id)){
     seen.add(attached.id);move(attached,dx,false,seen,target.id);visit(attached,dx,restrict,seen,false);
    }
    if(p.wakeUpCount===0)return;
   }
  }
  if(Math.abs(dx)<4)return;
  const before={x:target.xRaw,y:target.yRaw};
  const mapped=MapMove.moveMap(world.map,target,{xRaw:dx,yRaw:0});Object.assign(target,mapped.collision);
  let restarts=0;
  for(let i=0;i<list.length;){
   const other=list[i];
   if(other.id===target.id||!(other.pushBackTarget&2)){i++;continue;}
   if(typeof host.updatePushBack!=='function')throw Error('Native pair pushback callback required');
   const code=host.updatePushBack(world,target.id,other.id,{previousA:before,previousB:{x:other.xRaw,y:other.yRaw}});
   if(![0,1,2].includes(code))throw Error('Invalid native pair pushback result');
   if(code===0&&restarts<4){restarts++;i=0;}else i++;
  }
  if(restrict){
   const camera=world.cameraAreaRaw;
   if(!camera||!Number.isSafeInteger(camera.x)||!Number.isSafeInteger(camera.width))throw Error('Native camera area required for inertia');
   if(target.xRaw<camera.x){
    if(typeof host.forceMoveSide!=='function')throw Error('Native forceMoveSide callback required (0x1817fdc10)');
    host.forceMoveSide(world,target.id,{xRaw:camera.x-target.xRaw,yRaw:0});
   }else if(target.xRaw>camera.x+camera.width){
    target.xRaw=camera.x+camera.width;
    target.flags=(target.flags&~64)|((target.xRaw!==target.preXRaw||target.yRaw!==target.preYRaw)?64:0);
   }
  }
  trace.push({id:target.id,requestedXRaw:dx,xRaw:target.xRaw-before.x,yRaw:target.yRaw-before.y});
 }
 function face(source,faceIndex,dx,restrict,seen){
  if(!dx)return;
  const ny=faceIndex?1:-1;
  let contacts=source.contacts.filter(c=>c.normal.x===0&&c.normal.y===ny).map(c=>find(c.id)).filter(Boolean).map(b=>({id:b.id,x:b.xRaw}));
  contacts.sort((a,b)=>dx>0?b.x-a.x:a.x-b.x);
  if(contacts.some((b,i)=>i&&b.x===contacts[i-1].x)){
   if(typeof host.sortEqualContactPositions!=='function')throw Error('Native equal-position contact sort order required');
   contacts=host.sortEqualContactPositions(contacts,dx);
  }
  const gravity=!!(source.flags&0x100),different=!!(source.flags&0x200);
  for(const row of contacts){const target=find(row.id);
   if(!different&&!!(target.flags&0x100)!==gravity)continue;
   move(target,dx,restrict,seen);
   if(target.layer===1||target.layer===2)visit(target,dx,restrict,seen,true);
  }
 }
 function visit(source,dx,restrict,seen,addSelf){
  if(source.flags&0x80||![1,2,13].includes(source.layer))return;
  if(addSelf){if(seen.has(source.id))return;seen.add(source.id);}
  const first=source.flags&0x100?1:0;face(source,first,dx,restrict,seen);
  if(source.flags&0x200)face(source,first^1,dx,restrict,seen);
 }
 for(let i=0;i<list.length;i++)visit(list[i],deltas[i],!!(list[i].flags&0x400),new Set(),true);
 for(const b of list)if([1,2,13].includes(b.layer)){b.preXRaw=b.xRaw;b.preYRaw=b.yRaw;b.flags&=~64;}
 return {world,trace};
}
return {apply,completePhysicsFidelity:false};
});
