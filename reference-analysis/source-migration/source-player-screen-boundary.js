/* Player.calcScreenEndWalkVeloX0x1816c61b0, static DLL bytes only.
 * Player cached actorType==19 bypass @6202..6207; Initialize copies Actor.type
 * @0x1816bd5d3/5d7. Others query Camera.CalcCameraViewStageArea@622b.
 * upperEdgeX0x1816c6300 reads Actor.posX@63b0; depth>=64 returns ownanchor
 * @63b7..65d5. Collision0@6404, UP face0@640c/6415, onlylayer1@6492;
 * missing collision/Actor skipped. vx>=0 max; vx<0 min recursively@64e4..65a9.
 * predicted=edge+vx (signed64 add)@6279; right=x+width@62a1..62ab;
 * strict >right / <left returns QFP0@62c9..62ef; equality unchanged.
 * No dt, body-width/scale offset, scroll-mode or gravity branch exists here.
 * Reuses read-only SourceCameraNative.stageAreaRaw (both corner transforms,
 * two FP divisions) instead of recomputing aspect as floating point.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-camera-native.js'):root.SourceCameraNative);if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerScreenBoundary=api;})(globalThis,function(Camera){
'use strict';
const MAX_DEPTH=64,BYPASS_TYPE=19;
function raw(v,label){if(!Number.isSafeInteger(v))throw Error('PlayerScreenBoundary exact safe raw required: '+label);return v;}
function add(a,b){return raw(Number(BigInt.asIntN(64,BigInt(raw(a,'add.a'))+BigInt(raw(b,'add.b')))),'signed64 sum');}
function need(ctx,name,...args){if(typeof ctx?.[name]!=='function')throw Error('PlayerScreenBoundary native scene operation required: '+name);return ctx[name](...args);}
function actorX(actor){return raw(actor?.xRaw,'Actor.posX');}
function actorType(player){const t=player?.playerActorType;if(!Number.isInteger(t)||t<0||t>65535)throw Error('PlayerScreenBoundary cached Player.playerActorType uint16 required');return t;}
function area(camera){if(!Camera)throw Error('PlayerScreenBoundary SourceCameraNative required');if(![0,1,2].includes(camera?.scrollType)||![0,1,2].includes(camera?.function))throw Error('PlayerScreenBoundary native camera mode0/1/2 required');if(camera.flags&3)throw Error('PlayerScreenBoundary unlimit/unreturn camera snapshot unsupported');const r=Camera.stageAreaRaw(camera);for(const k of['x','y','width','height'])raw(r[k],'cameraArea.'+k);return r;}
function upperEdgeX(actor,vxRaw,scene,depth=0){raw(vxRaw,'vx');if(!Number.isInteger(depth)||depth<0)throw Error('PlayerScreenBoundary nonnegative native recursion depth required');/* memo only within this immutable scene query: cycles retain native depth cap */const memo=new Map();function walk(a,d){let edge=actorX(a);if(d>=MAX_DEPTH)return edge;let values=memo.get(a);if(values?.has(d))return values.get(d);if(!values){values=new Map();memo.set(a,values);}const c=need(scene,'getCollision',a,0);if(!c)throw Error('PlayerScreenBoundary native Actor collision0 required');const ids=need(scene,'contactIds',c,0);if(!Array.isArray(ids))throw Error('PlayerScreenBoundary ordered UP contact ID array required');for(const id of ids){const o=need(scene,'collisionById',id);if(!o)continue;if(!Number.isInteger(o.layer)||o.layer<0||o.layer>255)throw Error('PlayerScreenBoundary native collision layer byte required');if(o.layer!==1)continue;const other=need(scene,'actorByEntity',o.entityId);if(!other)continue;const x=actorX(other);edge=vxRaw>=0?Math.max(edge,x):Math.min(edge,x);const recursive=walk(other,d+1);edge=vxRaw>=0?Math.max(edge,recursive):Math.min(edge,recursive);}values.set(d,edge);return edge;}return walk(actor,depth);}
function evaluate(player,actor,vxRaw,options){raw(vxRaw,'vx');if(actorType(player)===BYPASS_TYPE)return{velocityRaw:vxRaw,bypassed:true};const cameraAreaRaw=area(options?.camera),edgeRaw=upperEdgeX(actor,vxRaw,options?.scene),predictedRaw=add(edgeRaw,vxRaw),leftRaw=cameraAreaRaw.x,rightRaw=add(leftRaw,cameraAreaRaw.width),blocked=vxRaw<0?predictedRaw<leftRaw:predictedRaw>rightRaw;return{velocityRaw:blocked?0:vxRaw,bypassed:false,edgeRaw,predictedRaw,leftRaw,rightRaw,cameraAreaRaw,blocked};}
function screenEndWalkVelocityX(player,actor,vxRaw,options){return evaluate(player,actor,vxRaw,options).velocityRaw;}
function createHost({getCamera,getScene,getPlayerActorType}){for(const [name,value]of Object.entries({getCamera,getScene,getPlayerActorType}))if(typeof value!=='function')throw Error('PlayerScreenBoundary host provider required: '+name);return(player,actor,vxRaw)=>{const type=getPlayerActorType(player,actor),p={...player,playerActorType:type};/* native type19 must not query camera orscene */if(actorType(p)===BYPASS_TYPE)return raw(vxRaw,'vx');return screenEndWalkVelocityX(p,actor,vxRaw,{camera:getCamera(),scene:getScene()});};}
return{upperEdgeX,evaluate,screenEndWalkVelocityX,createHost,cameraAreaRaw:area,nativeConstants:{maxDepth:MAX_DEPTH,bypassPlayerActorType:BYPASS_TYPE,upFace:0,playerCollisionLayer:1},supportedTypes:[],completePhysicsFidelity:false};
});
