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
// Key.InitCollision18186bdb0; cctor18186d42e..464: H56,W32,X-16,Y-28.
function createKey(world,actor){const body=createRect(world,actor,{height:56*F,width:32*F,x:-16*F,y:-28*F},0,true);if(body)body.layer=10;return body;}
// Goal.InitCollision18185f750 extends height upwards by component+0x10.
// cctor18185fd22..5b base H32,W48,X-24,Y-32.
function createGoal(world,actor,extendHeightRaw){if(!Number.isSafeInteger(extendHeightRaw))throw Error('Native Goal extend height required');const height=32*F+extendHeightRaw;if(!Number.isSafeInteger(height))throw Error('Native Goal rectangle exceeds exact raw range');const body=createRect(world,actor,{height,width:48*F,x:-24*F,y:-height},0,true);if(body)body.layer=12;return body;}
// DamageRect.InitCollision18180dfc0: component rectangle, push2, layer6,
// fixed-size bit2 + static bit4. OnStart18180e0e0 separately disables it.
function createDamageRect(world,actor,baseRectRaw){const body=createRect(world,actor,baseRectRaw,2,true);if(body){body.layer=6;body.flags|=20;}return body;}
// Rect.InitCollision1816e6d90: only mode0 allocates. word[body]=0x0602
// means priority2/layer6. Same fixed-size/static bits as DamageRect.
function createSolidRect(world,actor,mode,baseRectRaw){if(!Number.isInteger(mode)||mode<0||mode>0xffffffff)throw Error('Native Rect mode uint required');if(mode!==0)return null;const body=createRect(world,actor,baseRectRaw,2,true);if(body){body.priority=2;body.layer=6;body.flags|=20;}return body;}
module.exports={createRect,createKey,createGoal,createDamageRect,createSolidRect,completePhysicsFidelity:false};
