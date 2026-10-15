/* Actor.CreateCollision0x18169f4d0 -> Scene.CreateCollision0x1817f6370:
 * zeroed200-byte body, unit scales0x181690b00, base rectangle copied.
 * setupCollision0x18169f790: entity, byte holder index, callback flag1 from
 * HasOnCollided, append [syncPos,id]. Defaults layer/priority/attribute/pivot0.
 * This is allocation only: creation position and base-scale stages are separate.
 */
'use strict';
const Broad=require('./source-collision-broadphase.js'),Rect=require('./source-collision-rect.js'),Callbacks=require('./source-collision-callbacks.js');
const F=65536,clone=x=>JSON.parse(JSON.stringify(x));
function createRect(world,actor,baseRectRaw,pushBackTarget,syncPos){
 if(!world.storage||!Array.isArray(actor.collisionHolders)||typeof actor.entityId!=='string'||!Number.isInteger(pushBackTarget)||pushBackTarget<0||pushBackTarget>3||typeof syncPos!=='boolean')throw Error('Native collision allocation inputs required');
 for(const key of ['height','width','x','y'])if(!Number.isSafeInteger(baseRectRaw?.[key]))throw Error('Native RectFP required');
 if(actor.collisionHolders.length>255)throw Error('Native byte collision index overflow outside supported scope');
 const base=clone(baseRectRaw),scale={xRaw:F,yRaw:F},pivot={xRaw:0,yRaw:0};
 const body=Broad.createCollision(world.storage,{entityId:actor.entityId,actorType:actor.actorType,actorExists:true,collisionIndex:actor.collisionHolders.length,collisionType:0,isEnableSyncPos:syncPos,attribute:0,priority:0,layer:0,flags:Callbacks.has(actor.actorType,'OnCollided')?2:0,pushBackTarget,xRaw:0,yRaw:0,preXRaw:0,preYRaw:0,expectedXRaw:0,expectedYRaw:0,baseRectRaw:base,rectRaw:Rect.getRect(base,scale,pivot),preRectRaw:Rect.getRect(base,scale,pivot),scaleRaw:{...scale},preScaleRaw:{...scale},expectedScaleRaw:{...scale},pivotRaw:pivot,contacts:[],mapNormals:[],requestMapNormals:[]});
 if(body)actor.collisionHolders.push({syncPos,collisionId:body.id});return body;
}
module.exports={createRect,completePhysicsFidelity:false};
