/* Ordinary Player collider birth + numeric dynamic scale, static native only.
 * Reuses collision-bootstrap-evidence.json: pivot(0,-65536),unit scales,
 * zero200byte allocation0x1817f64fa. Rect regular46x32(-16,-47): Player
 * cctor0x1816cba8f..bb10. TopView/other states are outside this helper.
 * EarLength8*(earScale-1):0x1816bc850 (static+a0); initialear1:bd61c/620.
 * setCollisionScale0x1816bf700: BigBody thresholdear1.25,earDiff.25,
 * modifier57671(.88),diff7865(1-.88),height3014656;cctorcbedec..bf44.
 * Masks low16 of signed64 products BEFORE adding/dividing height @bf8b1..cb.
 * AddScale0x1816bf5f0 clampsbody26214(.4)..229376(3.5),writesActorXY;
 * only CURRENT collision scale is changed @bf8e4/ec. Pre/expected unchanged.
 * initCollision0x1816bde50: rect,priority-1,layer1,push3,syncPos=true,
 * forceSearchflag5; callbackflag1 supplied by host ActorType27 registry.
 * initialscale setCollisionScale(base1,Actor.scaleY1) @be00f;copy toprevious
 * andexpected @be014..020. Position fields remainzero at this phase.
 * Player.CreateEntity0x1816bd4e8 mutablefactoryY-=32768; CreateActor0x1816a3658
 * readsupdatedparam beforeAddActor0x1816a3687;SetInitPos0x18169d41f/423
 * writescurrent/precollisionposition andclearsflag6, leavesexpected0.
 * SetBaseScale0x1816a08c0 ->setAllCollisionScale0x1816a0370 multiplies
 * pre/current/expected scalevectors byActorXY*stagebase, not assignment.
 * Actor.Initialize0x18169cd02/06 baseStageScale + bodyXY1. State1 init
 * OnInitialize_Default0x1816c2f70 doesnotcreateanothercollider.
 * Exact FP and JS representation guards only; no generic Player movement.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-collision-rect.js'):root.SourceCollisionRect);if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerCollisionInit=api;})(globalThis,function(Rect){
'use strict';
const F=65536,H=3014656,BASE={height:H,width:2097152,x:-1048576,y:-3080192},C={earDefaultLengthRaw:524288,earMinRaw:F,bigBodyEarLimitRaw:81920,bigBodyEarDiffRaw:16384,collisionModifyScaleRaw:57671,collisionModifyScaleDiffRaw:7865,bodyMinRaw:26214,bodyMaxRaw:229376};
const clone=x=>JSON.parse(JSON.stringify(x));
function raw(v,label='raw'){if(!Number.isSafeInteger(v))throw Error('PlayerCollisionInit exact safe integer required: '+label);return v;}
const i64=v=>BigInt.asIntN(64,v),num=v=>raw(Number(v)),b=v=>BigInt(raw(v));
const add=(x,y)=>num(i64(b(x)+b(y))),mul=(x,y)=>num(i64(b(x)*b(y))>>16n),div=(x,y)=>{if(!y)throw Error('PlayerCollisionInit zero native denominator');return num(i64(b(x)<<16n)/b(y));};
function stageRaw(v){if(!Number.isFinite(v))throw Error('PlayerCollisionInit authored float invalid');return raw(Math.trunc(Math.fround(Math.fround(v)*F)));}
function earLengthRaw(earScaleRaw){return add(mul(C.earDefaultLengthRaw,earScaleRaw),-C.earDefaultLengthRaw);}
function dynamicScale(earScaleRaw,baseScaleRaw,bodyScaleRaw){raw(earScaleRaw);raw(baseScaleRaw);raw(bodyScaleRaw);let modified=bodyScaleRaw;if(bodyScaleRaw>F&&earScaleRaw<C.bigBodyEarLimitRaw){const ratio=div(add(earScaleRaw,-F),C.bigBodyEarDiffRaw),mod=add(C.collisionModifyScaleRaw,mul(ratio,C.collisionModifyScaleDiffRaw));modified=add(F,mul(add(bodyScaleRaw,-F),mod));}
 const bodyProduct=i64(b(modified)*b(H))&-65536n,earProduct=i64(b(earLengthRaw(earScaleRaw))*b(bodyScaleRaw))&-65536n,heightScale=num(i64(bodyProduct+earProduct)/b(H));return{xRaw:mul(baseScaleRaw,bodyScaleRaw),yRaw:mul(heightScale,baseScaleRaw)};
}
function resolveRect(c){if(!Rect)throw Error('PlayerCollisionInit shared native rectangle helper required');c.rectRaw=Rect.getRect(c.baseRectRaw,c.scaleRaw,c.pivotRaw);c.preRectRaw=Rect.getRect(c.baseRectRaw,c.preScaleRaw,c.pivotRaw);return c;}
function createBody(binding,actor,earScaleRaw=F){if(!binding||binding.id===undefined||binding.entityId===undefined||typeof binding.hasOnCollided!=='boolean')throw Error('PlayerCollisionInit native collision id/entity/callback registration required');raw(actor.scaleYRaw);const scale=dynamicScale(earScaleRaw,F,actor.scaleYRaw);return resolveRect({id:binding.id,entityId:binding.entityId,actorType:27,collisionIndex:0,collisionType:0,baseRectRaw:clone(BASE),pivotRaw:{xRaw:0,yRaw:-F},attribute:0,layer:1,priority:-1,pushBackTarget:3,isEnableSyncPos:true,flags:32|(binding.hasOnCollided?2:0),xRaw:0,yRaw:0,preXRaw:0,preYRaw:0,expectedXRaw:0,expectedYRaw:0,scaleRaw:{...scale},preScaleRaw:{...scale},expectedScaleRaw:{...scale},contacts:[],mapNormals:[],requestMapNormals:[]});}
function setInitPosition(collisions,position){raw(position.xRaw);raw(position.yRaw);return collisions.map(input=>{const c=clone(input);if(c.isEnableSyncPos){c.xRaw=c.preXRaw=position.xRaw;c.yRaw=c.preYRaw=position.yRaw;c.flags&=~64;}return c;});}
function applyBaseScale(collisions,actor,stageScaleRaw){const factor={xRaw:mul(actor.scaleXRaw,stageScaleRaw),yRaw:mul(actor.scaleYRaw,stageScaleRaw)};return collisions.map(input=>{const c=clone(input);for(const key of['preScaleRaw','scaleRaw','expectedScaleRaw'])c[key]={xRaw:mul(c[key].xRaw,factor.xRaw),yRaw:mul(c[key].yRaw,factor.yRaw)};return resolveRect(c);});}
function updateScale(player,actor,collision){const c=clone(collision);c.scaleRaw=dynamicScale(player.earScaleRaw,actor.baseScaleRaw,actor.scaleYRaw);return resolveRect(c);}
function addBodyScale(player,input,collision,deltaRaw){const actor={...input},previous=raw(actor.scaleYRaw),desired=add(previous,deltaRaw),value=Math.max(C.bodyMinRaw,Math.min(C.bodyMaxRaw,desired));actor.scaleXRaw=value;actor.scaleYRaw=value;return{actor,collision:updateScale(player,actor,collision),appliedDeltaRaw:add(value,-previous)};}
function params(a){if(a.typeName!=='Player'||a.type!==undefined&&a.type!==27||a.datas?.length<17)throw Error('PlayerCollisionInit requires ordinary Player27 with17native slots');const read=i=>a.datas[i]?.t===1?stageRaw(a.datas[i].f):0;for(const i of[1,2,3,4,6,7,8,9,10,11,16])if(read(i)!==0)throw Error('PlayerCollisionInit nondefault Player state/size/ear branch outside scope, slot'+i);return{initDir:Math.floor(read(0)/F)&255,parseFlagsSet:Math.floor(read(5)/F)!==0?1<<22:0,initialPlayerState:0,requestedPlayerState:1,enteredPlayerState:1,earScaleRaw:F,preEarScaleRaw:F,wakeUpCount:1,wakeUpInitCount:1,currentAnimationId:1};}
function bootstrap(a,binding,stageScaleRaw){raw(stageScaleRaw);const player=params(a),actor={entityId:binding.entityId,actorType:27,baseScaleRaw:stageScaleRaw,scaleXRaw:F,scaleYRaw:F};const initialized=[createBody(binding,actor,player.earScaleRaw)],position={xRaw:stageRaw(a.posX),yRaw:add(stageRaw(a.posY),-32768)},positioned=setInitPosition(initialized,position),registered=applyBaseScale(positioned,actor,stageScaleRaw);return{player,actor:{...actor,xRaw:position.xRaw,yRaw:position.yRaw,initXRaw:position.xRaw,initYRaw:position.yRaw},mutableFactoryPosition:position,phases:{playerInitCollision:initialized,actorSetInitPos:positioned,actorSetBaseScale:registered},collisions:registered};}
function allowed(v,n){return v===0||(v<0?n<=-v:v<10?n>=v:n>=Math.trunc(v/10)&&n<=v%10);}
function compile(actors,count,options={}){if(!Number.isInteger(count)||count<2||count>8)throw Error('PlayerCollisionInit population2..8 required');const aa=actors.map(a=>a.properties||a).filter(a=>a.typeName==='Player'&&allowed(a.playerCount,count));if(!aa.length)return{schemaVersion:1,count,players:[]};if(!Number.isInteger(options.actorSceneFlags)||(options.actorSceneFlags&4)===0)throw Error('PlayerCollisionInit requires native fresh-stage limit-player flagbit2');if(!Array.isArray(options.bindings)||options.bindings.length!==count)throw Error('PlayerCollisionInit exact native factory-created bindings required');if(aa.length<count)throw Error('PlayerCollisionInit authored player slots below native count');return{schemaVersion:1,count,players:aa.slice(0,count).map((a,i)=>({name:a.name,...bootstrap(a,options.bindings[i],options.stageScaleRaw)}))};}
const create=clone;
function solids(){return [];}
function beforeStep(s){return{collisionDescriptors:collisionDescriptors(s)};}
function afterStep(){}
function displays(){return [];}
function collisionDescriptors(s){return s.players.flatMap(p=>clone(p.collisions));}
return{compile,create,solids,beforeStep,afterStep,displays,collisionDescriptors,params,bootstrap,createBody,setInitPosition,applyBaseScale,dynamicScale,earLengthRaw,updateScale,addBodyScale,stageRaw,nativeConstants:{...C,baseRectRaw:BASE},supportedTypes:[],completePhysicsFidelity:false};
});
