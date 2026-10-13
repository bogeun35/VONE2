/* Native storage/chunk adapter. active slots0x181800370 -> signed priority
 * sort0x1818007b0 -> checkChunk0x1817f86c0. Broadphase supplies CLR/Morton.
 * Late collision0x1817ff510 captures owner flag2 once and target flag2 before
 * callbacks; owner then target, followed by two descriptor updates.
 * Input storage is actual ordered dictionary state, never supportId contacts.
 * Actor callbacks and dictionary initialization capacity remain explicit.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-collision-broadphase.js'):root.SourceCollisionBroadphase,c?require('./source-collision-scene.js'):root.SourceCollisionScene);if(c)module.exports=api;root.SourceCollisionPipeline=api;})(globalThis,function(Broad,Scene){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function treeObject(config,b){const r=b.rectRaw;if(!r)throw Error('Resolved native GetRect required');return Broad.descriptor(config,{id:b.id,xRaw:b.xRaw,yRaw:b.yRaw,rect:{xRaw:r.x,yRaw:r.y,widthRaw:r.width,heightRaw:r.height}});}
function sortContactPositions(rows,dx){return Broad.nativeSort(rows.map(r=>({...r,xRaw:r.x})),Broad.xCompare(dx)).map(({xRaw,...r})=>r);}
function lateCollided(w,events,config,host){
 const list=w.collisions,descriptors=list.map(b=>treeObject(config,b));
 for(let i=0;i<list.length-1;i++){
  const a=list[i];if(a.flags&1)continue;const enabledA=!!(a.flags&2);
  for(let j=i+1;j<list.length;j++){
   const b=list[j];if(!Broad.relation(descriptors[i],descriptors[j])||(b.flags&1)||!(enabledA||(b.flags&2)))continue;
   const enabledLayer=w.layerChecks?.[a.layer]?.[b.layer];if(typeof enabledLayer!=='boolean')throw Error('Native collision layer matrix required');
   if(!enabledLayer||!Scene.isCollided(a,b))continue;
   const enabled=[enabledA,!!(b.flags&2)];
   for(const [k,self,other]of [[0,a,b],[1,b,a]])if(enabled[k]){
    if(typeof host.onCollided!=='function')throw Error('Native OnCollided callback dispatcher required');
    const e={type:'OnCollided',ownerId:self.id,targetId:other.id};events.push(e);host.onCollided(w,self,other,e);
   }
   descriptors[i]=treeObject(config,a);descriptors[j]=treeObject(config,b);
  }
 }
}
function step(input,host={}){
 const state=clone(input);if(!state.storage||!state.map?.tileFlags?.length)throw Error('Native collision storage and map required');
 const config=Broad.initialize(state.map.tileFlags[0].length,state.map.tileFlags.length);
 const ordered=Broad.nativeSort(Broad.active(state.storage),Broad.priorityCompare);
 for(const b of ordered)if(!Number.isInteger(b.priority))throw Error('Native signed collision priority required');
 const world={...state,collisions:ordered};delete world.storage;
 const result=Scene.checkChunk(world,{...host,treeObject:(_,b)=>treeObject(config,b),candidateCheck:Broad.relation,sortContactPositions,lateCollided:(w,events)=>lateCollided(w,events,config,host)});
 const byId=new Map(result.world.collisions.map(b=>[b.id,b]));
 for(const d of [state.storage.primary,state.storage.secondary])for(const e of d.entries)if(e.state===2&&byId.has(e.key))e.collision=byId.get(e.key);
 const {collisions,...worldFields}=result.world;Object.assign(state,worldFields);
 return {state,orderedIds:collisions.map(b=>b.id),events:result.events,pushTrace:result.pushTrace,inertiaTrace:result.inertiaTrace};
}
return {step,treeObject,sortContactPositions,lateCollided,completePhysicsFidelity:false};
});
