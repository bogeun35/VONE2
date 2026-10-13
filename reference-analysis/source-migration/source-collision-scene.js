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
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-collision-map.js'):root.SourceCollisionMap,c?require('./source-collision-rect.js'):root.SourceCollisionRect,c?require('./source-move-contact.js'):root.SourceMoveContact,c?require('./source-collision-inertia.js'):root.SourceCollisionInertia,c?require('./source-gear-collision.js'):root.SourceGearCollision);if(c)module.exports=api;root.SourceCollisionScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(MapMove,Rect,Contacts,Inertia,Gear){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
const position=(b,x,y)=>{b.xRaw=x;b.yRaw=y;b.flags=(b.flags&~64)|((x!==b.preXRaw||y!==b.preYRaw)?64:0);};
const find=(w,id)=>{const b=w.collisions.find(b=>b.id===id);if(!b)throw Error('Native collision missing: '+id);return b;};
function bounds(b,pre=false){const r=pre?b.preRectRaw:b.rectRaw;if(![0,1].includes(b.collisionType)||!r)throw Error('Resolved native GetRect bounds required');return {x:(pre?b.preXRaw:b.xRaw)+r.x,y:(pre?b.preYRaw:b.yRaw)+r.y,width:r.width,height:r.height};}
function overlap(a,b,pre=false){if(a.entityId===b.entityId||((a.flags|b.flags)&1))return false;if(a.collisionType===1&&b.collisionType===1)return Gear.isCollided(circleAdapter(a,0),circleAdapter(b,1),{pre});const x=bounds(a,pre),y=bounds(b,pre);return x.x<y.x+y.width&&y.x<x.x+x.width&&x.y<y.y+y.height&&y.y<x.y+x.height;}
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
// Adapter IDs are temporary local indices only; canonical IDs/caches stay intact.
function circleAdapter(b,index){
 if(b.collisionType!==1||!b.circleRaw||!b.scaleRaw||!b.preScaleRaw||!b.pivotRaw)throw Error('Native circle/scale/pivot facts required');
 return {collisionId:index,actorId:typeof b.entityId+':'+String(b.entityId),shape:'circle',flags:b.flags,layer:b.layer,pushBackTarget:b.pushBackTarget,
  xRaw:b.xRaw,yRaw:b.yRaw,preXRaw:b.preXRaw,preYRaw:b.preYRaw,scaleXRaw:b.scaleRaw.xRaw,scaleYRaw:b.scaleRaw.yRaw,preScaleXRaw:b.preScaleRaw.xRaw,preScaleYRaw:b.preScaleRaw.yRaw,pivotXRaw:b.pivotRaw.xRaw,pivotYRaw:b.pivotRaw.yRaw,circle:{...b.circleRaw},contacts:[]};
}
function updatePair(w,aId,bId,options={}){
 const a=find(w,aId),b=find(w,bId);
 if(a.collisionType===1&&b.collisionType===1){
  const ca=circleAdapter(a,0),cb=circleAdapter(b,1);
  const r=Gear.pushBackPair({collisions:[ca,cb]},0,1,{isEnableCheck:()=>layer(w,a,b),
   preOverrideA:options.previousA&&{xRaw:options.previousA.x,yRaw:options.previousA.y},preOverrideB:options.previousB&&{xRaw:options.previousB.x,yRaw:options.previousB.y}});
  if(r.code===0){position(a,r.positionA.xRaw,r.positionA.yRaw);position(b,r.positionB.xRaw,r.positionB.yRaw);
   add(w,{ownerId:a.id,targetId:b.id,face:{x:r.normal.xRaw/65536,y:r.normal.yRaw/65536}});
   add(w,{ownerId:b.id,targetId:a.id,face:{x:-r.normal.xRaw/65536||0,y:-r.normal.yRaw/65536||0}});
  }return r.code;
 }
 // Native mixed pairs use the already scaled circle bounding rectangle.
 const ta=a.collisionType,tb=b.collisionType;
 const r=Rect.update({...a,collisionType:0},{...b,collisionType:0},{...options,layerEnabled:layer(w,a,b),forceMove:(other,target,ctx)=>({...forceCollision(w,other.id,target),sourceCollision:clone(find(w,ctx.sourceId))})});
 Object.assign(a,r.a,{collisionType:ta});Object.assign(b,r.b,{collisionType:tb});for(const c of r.contacts)add(w,c);return r.code;
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
 const source={...b,scaleRaw:halfScale,rectRaw:Rect.getRect(b.baseRectRaw,halfScale,b.pivotRaw)};
 const a=bounds(source),down=!!(b.flags&256),probe={...source,yRaw:source.yRaw+(down?32768:-32768)};
 if(!(b.pushBackTarget&2))return;
 for(const target of w.collisions){
  if(target.id===b.id||(target.flags&1)||!(target.pushBackTarget&2)||!layer(w,target,b)||target.entityId===b.entityId)continue;
  const t=bounds(target);
  if(overlap(source,target)||!overlap(probe,target))continue;
  const center=t.y+mul(t.height,32768);
  if(down?center>a.y+a.height:center<a.y)add(w,{ownerId:b.id,targetId:target.id,face:0});
 }
}
function refreshActorInPlace(w,b,host,events){
  if(b.flags&0x20)discoverForcedContacts(w,b);
  if(!Array.isArray(b.contacts))throw Error('Native contact cache required');
  const remove=[];const count=b.contacts.length;
  for(let i=0;i<count;i++){
   const c=b.contacts[i],target=w.collisions.find(q=>q.id===c.id);
   const fact=q=>({...q,collisionType:0,collisionRectRaw:bounds(q)});
   const retained=target&&b.collisionType===1&&target.collisionType===1
    ?Gear.isCollided(circleAdapter(b,0),circleAdapter(target,1),{offsetA:{xRaw:Number(BigInt(c.normal.x*65536)>>1n),yRaw:Number(BigInt(c.normal.y*65536)>>1n)}})
    :Contacts.retainsRectContact(fact(b),target?fact(target):null,c);
   if(!retained){remove.push(i);continue;}
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
function refreshContacts(input,host={}){
 const w=clone(input),events=[];
 for(const b of w.collisions)refreshActorInPlace(w,b,host,events);
 return {world:w,events};
}
function refreshMapInPlace(w,b,host,events){
 if(!Array.isArray(b.mapNormals)||!Array.isArray(b.requestMapNormals))throw Error('Native map cache and request queue required');
 const notify=(type,n,cell)=>{
  if(typeof host.onContact!=='function')throw Error('Native map contact callback adapter required');
  const event={type,ownerId:b.id,targetId:null,normal:{x:n.xRaw/65536,y:n.yRaw/65536},isCollision:false,mapCell:{...cell}};
  events.push(event);host.onContact(w,event);
 };
 const remove=[],count=b.mapNormals.length;
 for(let i=0;i<count;i++){
  const n=b.mapNormals[i],cell=b.flags&1?null:MapMove.isContacted(w.map,b,n);
  if(cell)notify('OnContacted',n,cell);else remove.push(i);
 }
 for(let i=remove.length-1;i>=0;i--)b.mapNormals.splice(remove[i],1);
 // Unlike retained normals, request processing has no inactive-flag gate.
 // 0x1816949ce..a24 probes, invokes callbacks, then appends @0x181694abe.
 const requests=b.requestMapNormals.length;
 for(let i=0;i<requests;i++){
  const n=b.requestMapNormals[i],cell=MapMove.isContacted(w.map,b,n);if(!cell)continue;
  notify('OnContactAdded',n,cell);notify('OnContacted',n,cell);b.mapNormals.push({...n});
 }
 b.requestMapNormals.length=0;
}
function refreshMapContacts(input,id,host={}){const world=clone(input),events=[];refreshMapInPlace(world,find(world,id),host,events);return {world,events};}
function pushPass(w,forced,host,trace){
 const list=w.collisions;if(list.length<2)return 2;
 const saved=forced?list.map(b=>({id:b.id,x:b.xRaw,y:b.yRaw})):[];
 if(forced&&!list.some(b=>b.flags&64))return 2;
 if(typeof host.treeObject!=='function'||typeof host.candidateCheck!=='function')throw Error('Native quadtree descriptor/candidate adapter required');
 const descriptors=list.map(b=>host.treeObject(w,b));let code=2;
 const fixed=b=>!!(b.flags&4)&&!(b.flags&8);
 for(let i=0;i<list.length-1;i++){
  const a=list[i];if(!(a.pushBackTarget&2)||!forced&&fixed(a))continue;
  for(let j=i+1;j<list.length;j++){
   const b=list[j];if(!host.candidateCheck(descriptors[i],descriptors[j])||!(b.pushBackTarget&2)||(forced?!(fixed(a)||fixed(b)):fixed(b)))continue;
   const next=updatePair(w,a.id,b.id);if(next===2)continue;code=next;trace.push({forced,a:a.id,b:b.id,code});
   if(code===1){for(const p of saved)position(find(w,p.id),p.x,p.y);return code;}
   descriptors[i]=host.treeObject(w,a);descriptors[j]=host.treeObject(w,b);
  }
 }
 return code;
}
function pushBackPass(input,forced,host={}){const world=clone(input),trace=[];return {world,code:pushPass(world,forced,host,trace),trace};}
function solvePushBack(input,host={}){
 const world=clone(input),trace=[];let code=2,outer=0;
 do{
  for(let i=0;i<8;i++){code=pushPass(world,false,host,trace);if(code!==0)break;}
  for(let i=0;i<8;i++){code=pushPass(world,true,host,trace);if(code!==0)break;}
  outer++;
 }while(code===1&&outer<8);
 return {world,trace,code,outerPasses:outer};
}
function setScale(b,scale){
 b.scaleRaw={...scale};b.rectRaw=Rect.getRect(b.baseRectRaw,b.scaleRaw,b.pivotRaw);
}
// updateScale0x1817fe370: shrink directly; growth >QFP._0_001(65)
// tests four corner deltas TL,BL,TR,BR with old shape. Map trials do not
// slide; positions are restored but requested map normals survive.
// Result ratios clamp0..1; partial growth subtracts QFP._0_02(1310).
function scaleInPlace(w,b){
 for(const name of ['scaleRaw','preScaleRaw','expectedScaleRaw','pivotRaw'])for(const k of ['xRaw','yRaw'])if(!Number.isSafeInteger(b[name]?.[k]))throw Error('Native scale/pivot facts required');
 const old={...b.scaleRaw},desired=b.expectedScaleRaw;
 if(desired.xRaw<=old.xRaw&&desired.yRaw<=old.yRaw){setScale(b,desired);return;}
 if(Math.abs(old.xRaw-desired.xRaw)<=65&&Math.abs(old.yRaw-desired.yRaw)<=65)return;
 const start={x:b.xRaw,y:b.yRaw},before=bounds(b);setScale(b,desired);
 if(!(b.pushBackTarget&2))return;
 const after=bounds(b);setScale(b,b.preScaleRaw);
 const corners=r=>[{x:r.x,y:r.y},{x:r.x,y:r.y+r.height},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height}];
 const prior=corners(before),next=corners(after),moves=next.map((p,i)=>({xRaw:p.x-prior[i].x,yRaw:p.y-prior[i].y}));
 const fractions={xRaw:65536,yRaw:65536},clipped=[];
 const ratio=(actual,requested)=>Number(BigInt.asIntN(64,BigInt(actual)<<16n)/BigInt(requested));
 function limit(actual,requested){for(const k of ['xRaw','yRaw'])if(Math.abs(requested[k])>65)fractions[k]=Math.max(0,Math.min(fractions[k],ratio(actual[k],requested[k])));}
 for(const d of moves){
  const r=MapMove.moveMap(w.map,b,d,{slide:false});Object.assign(b,r.collision);clipped.push(r.delta);position(b,start.x,start.y);limit(r.delta,d);
 }
 for(const other of w.collisions){
  if(other.id===b.id||!(other.pushBackTarget&2)||!layer(w,b,other)||overlap(b,other))continue;
  for(let i=0;i<4;i++){
   const shape=b.collisionType,r=Rect.moveAgainst({...b,collisionType:0},{...other,collisionType:0},clipped[i],{isCollided:(a,t)=>overlap({...a,collisionType:shape},{...t,collisionType:other.collisionType})});Object.assign(b,r.collision,{collisionType:shape});position(b,start.x,start.y);limit(r.delta,moves[i]);
  }
 }
 const result={};for(const k of ['xRaw','yRaw']){
  const delta=desired[k]-b.preScaleRaw[k];result[k]=b.scaleRaw[k]+mul(desired[k]-b.scaleRaw[k],Math.max(0,Math.min(65536,fractions[k])));
  if(Math.abs(fractions[k]-65536)>4)result[k]=delta>0?Math.max(b.preScaleRaw[k],result[k]-1310):Math.min(b.preScaleRaw[k],result[k]+1310);
 }setScale(b,result);
}
function updateScale(input,id){const world=clone(input);scaleInPlace(world,find(world,id));return {world};}
function finishInPlace(w,b,host,events){
 if(typeof b.actorExists!=='boolean')throw Error('Native Actor lookup result required');
 for(const k of ['expectedXRaw','expectedYRaw'])if(!Number.isSafeInteger(b[k]))throw Error('Native expected collision position required');
 if(!b.scaleRaw||!b.expectedScaleRaw)throw Error('Native expected collision scale required');
 b.preXRaw=b.xRaw;b.preYRaw=b.yRaw;b.flags&=~64;
 const invoke=(type,extra={})=>{
  if(typeof host[type]!=='function')throw Error('Native '+type+' adapter required');
  const e={type,ownerId:b.id,...extra};events.push(e);host[type](w,b,e);
 };
 const registered=type=>{if(typeof host[type]!=='function')throw Error('Native '+type+' registry required');return host[type](b);};
 if(b.actorExists&&(b.scaleRaw.xRaw!==b.expectedScaleRaw.xRaw||b.scaleRaw.yRaw!==b.expectedScaleRaw.yRaw)&&registered('hasOnChangeScale'))invoke('onChangeScale',{scaleRaw:{...b.scaleRaw}});
 b.preScaleRaw={...b.scaleRaw};b.expectedScaleRaw={...b.scaleRaw};b.preRectRaw={...b.rectRaw};
 const d={xRaw:b.xRaw-b.expectedXRaw,yRaw:b.yRaw-b.expectedYRaw};
 if(Math.abs(mul(d.xRaw,d.xRaw)+mul(d.yRaw,d.yRaw))>=4){
  if(b.actorExists){invoke('syncActorPosition',{xRaw:b.xRaw,yRaw:b.yRaw});if(registered('hasOnPushedBack'))invoke('onPushedBack',{correctionRaw:d});}
  b.expectedXRaw=b.xRaw;b.expectedYRaw=b.yRaw;
 }
 refreshActorInPlace(w,b,host,events);refreshMapInPlace(w,b,host,events);
}
function finishCollision(input,id,host={}){const world=clone(input),events=[];finishInPlace(world,find(world,id),host,events);return {world,events};}
function checkChunk(input,host={}){
 let world=clone(input);const changed=[];
 for(const b of world.collisions){
  b.flags&=~8;b.expectedXRaw=b.xRaw;b.expectedYRaw=b.yRaw;
  if(!b.scaleRaw||!b.preScaleRaw)throw Error('Native current/previous collision scale required');
  if(b.scaleRaw.xRaw!==b.preScaleRaw.xRaw||b.scaleRaw.yRaw!==b.preScaleRaw.yRaw){
   b.expectedScaleRaw={...b.scaleRaw};setScale(b,b.preScaleRaw);changed.push(b.id);
  }
 }
 world=updateMap(world);const push=solvePushBack(world,host);world=push.world;
 const inertia=postPushBack(world,host);world=inertia.world;
 for(const id of changed)scaleInPlace(world,find(world,id));
 const events=[];for(const b of world.collisions)finishInPlace(world,b,host,events);
 if(typeof host.lateCollided!=='function')throw Error('Native late OnCollided dispatcher required');
 host.lateCollided(world,events);
 return {world,events,pushTrace:push.trace,inertiaTrace:inertia.trace};
}
return {isCollided:overlap,applyPair,postPushBack,updateMap,refreshContacts,refreshMapContacts,pushBackPass,solvePushBack,updateScale,finishCollision,checkChunk,completePhysicsFidelity:false};
});
