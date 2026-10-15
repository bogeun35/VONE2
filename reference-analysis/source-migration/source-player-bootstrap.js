/* Ordinary Player.Initialize/bootstrap; static native only.
 * Add<Player>1801f9f00 calls Activator<Player>1806894f0 (spec83109/type4786,
 * no instance ctor), writes EntityRef+28 @1801fa167. Duplicate Add is invalid.
 * Initialize1816bd5a8/5b0/5bb: index/playerIndex/colorIndex signed byte fields;
 * cache ActorType ushort @bd5d7 BEFORE Creator later writes ActorType27 @bd4e1.
 * current0/request1 @bd5db; life1 @5e1; battleHP2 @5e5; wake1/1 @5e9;
 * ear/preEar1 @bd61c/620; QColor.White @bd652/659; Player flags OR8 @bd663.
 * walk=(1*stageScale)*3 @bd6f9..73d, ice max*=stageIce @bd744..74d.
 * Actor bits7,9,11,15,16,18,24 @bd75f..7ce; Weight100 @bd7bb (QPlayerDefine
 * WEIGHT_MAX <-QFP._100 @18177e2da; raw6553600). Sorting event54 signed
 * (playerIndex-8)*10 @bd76c..77a; common Actor receiver @18169ea20.
 * initCollision @bd81b reuses PlayerCollisionInit. updatePlayerState(true)
 * tail @bd847 reuses StateDispatch: final Default1/request0, Player anim1,
 * Actor REQUEST anim1, PLAYING untouched. No OnUpdate body or timer decrement.
 * Creator y-=32768 @bd4e8; registration delegates ActorInitialization.register.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-player-collision-init.js'):root.SourcePlayerCollisionInit,c?require('./source-actor-initialization.js'):root.SourceActorInitialization,c?require('./source-player-state-dispatch.js'):root.SourcePlayerStateDispatch,c?require('./source-player-default.js'):root.SourcePlayerDefault,c?require('./source-actor-lifecycle.js'):root.SourceActorLifecycle,c?require('./population-rules.cjs'):root.SourcePopulationRules);if(c)module.exports=api;root.SourcePlayerBootstrap=api;})(globalThis,function(Collision,ActorInit,State,Default,Life,Population){
'use strict';
const F=65536,ACTOR_MASK=0x1058a80,copy=x=>JSON.parse(JSON.stringify(x));
function raw(x,label){if(!Number.isSafeInteger(x))throw Error('PlayerBootstrap exact integer required: '+label);return x;}
function uint(x,label,max){if(!Number.isInteger(x)||x<0||x>max)throw Error('PlayerBootstrap native '+label+' required');return x;}
function signedByte(x,label){raw(x,label);if(x< -2147483648||x>2147483647)throw Error('PlayerBootstrap native int32 argument required: '+label);return (x<<24)>>24;}
function mul(x,y){return raw(Number(BigInt.asIntN(64,BigInt(raw(x,'FP operand'))*BigInt(raw(y,'FP operand')))>>16n),'FP result');}
function vectorZero(){return {xRaw:0,yRaw:0};}
function addedPlayer(entityId,options){
 if(options?.playerComponentAbsent!==true)throw Error('PlayerBootstrap Frame.AddComponent requires verified absent Player; existing component is not get-or-add');
 if(options.playerAddDefaultVerified!==true)throw Error('PlayerBootstrap verified zero default after new Player Add required; unmodeled OnAdded effects need host snapshot/core');
 if(typeof entityId!=='string'||!entityId)throw Error('PlayerBootstrap actual EntityRef required');
 return {entityId,battlePlaneState:0,cardboardCoveredFlags:0,currentAnimationId:0,playerState:0,requestedPlayerState:0,battlePlaneHitPoint:0,battlePlanePrevHitPoint:0,colorIndex:0,index:0,initDir:0,jumpContinueCount:0,jumpCount:0,jumpFrame:0,life:0,playerIndex:0,subState:0,topViewFunc:0,wakeUpCount:0,wakeUpInitCount:0,flags2:0,inputBit:0,cachedActorType:0,isFlashing:0,flags:0,equipActors:[null,null],battlePlaneHealTimerRaw:0,battlePlaneInvTimerRaw:0,earScaleRaw:0,enableJumpSecRaw:0,flashTimerRaw:0,invincibleTimerRaw:0,preEarHeightRaw:0,preEarScaleRaw:0,waitTimerRaw:0,walkSpeedRaw:0,walkSpeedMaxOnIceRaw:0,jumpVelocityRaw:vectorZero(),pushBackRaw:vectorZero(),baseColorRaw:{aRaw:0,bRaw:0,gRaw:0,rRaw:0}};
}
function actorBeforePlayer(a,entityId,stageScaleRaw){
 if(!a||a.entityId!==entityId||a.actorType!==27)throw Error('PlayerBootstrap actual pre-PlayerInitialize ordinary Actor27/EntityRef snapshot required; cached type is not inferred');
 uint(a.flags,'Actor flags',0xffffffff);if(!(a.flags&16384)||a.scaleXRaw!==F||a.scaleYRaw!==F||a.baseScaleRaw!==stageScaleRaw||!Array.isArray(a.collisionHolders)||a.collisionHolders.length!==0)throw Error('PlayerBootstrap Actor.Initialize must precede Player.Initialize (unit scale, stage scale, empty fresh holders)');
 for(const k of ['inactiveEntity','invisibleEntity','pauseEntity','disableDisplayEntity','disableAnimationEntity'])if(a[k]!==null&&typeof a[k]!=='string')throw Error('PlayerBootstrap explicit Actor owner required: '+k);
 uint(a.requestAnimationId,'Actor request animation byte',255);uint(a.playingAnimationId,'Actor playing animation byte',255);
 return copy(a);
}
function sortingEvent(a,value){
 if(!Life)throw Error('PlayerBootstrap shared ActorLifecycle event54 core required');
 const view={flags:a.flags,activeOwner:a.inactiveEntity,visibleOwner:a.invisibleEntity,pauseOwner:a.pauseEntity,displayOwner:a.disableDisplayEntity,animationOwner:a.disableAnimationEntity};
 const result=Life.commonEvent(view,{eventType:54,value,sourceId:a.entityId});
 if(!result.accepted||result.calls.length)throw Error('PlayerBootstrap unexpected common sorting event result');
 a.sortingOrder=(view.sortingOrder<<16)>>16;
}
function bootstrap(authored,actorInput,binding,options={}){
 if(!Collision||!ActorInit||!State||!Default)throw Error('PlayerBootstrap shared native initialization/state cores required');
 raw(options.stageScaleRaw,'Stage.BaseScale');raw(options.iceSpeedUpRaw,'Stage.IceSpeedUp');
 const checkCollisionId=id=>{raw(id,'native collision ID');if(id< -2147483648||id>2147483647)throw Error('PlayerBootstrap native signed int32 collision ID required');};
 if(options.allocateCollision===undefined)checkCollisionId(binding?.id);
 else if(typeof options.allocateCollision!=='function'||binding?.id!==undefined)throw Error('PlayerBootstrap one synchronous collision allocation source required');
 if(binding?.damageManageInitialized!==true)throw Error('PlayerBootstrap native DamageManage.Initialize must precede Player.Initialize');
 const a=actorBeforePlayer(actorInput,binding?.entityId,options.stageScaleRaw),p=addedPlayer(binding.entityId,binding),params=Collision.params(authored),phases={addedComponent:{player:copy(p),actor:copy(a)}},trace=['AddPlayer.EntityRef'];
 p.index=signedByte(binding.index,'Index');p.playerIndex=signedByte(binding.playerIndex,'PlayerIndex');p.colorIndex=signedByte(binding.colorIndex,'ColorIndex');p.cachedActorType=a.actorType;
 p.playerState=0;p.requestedPlayerState=1;p.life=1;p.battlePlaneHitPoint=2;p.wakeUpCount=p.wakeUpInitCount=1;p.earScaleRaw=p.preEarScaleRaw=F;p.baseColorRaw={aRaw:F,bRaw:F,gRaw:F,rRaw:F};p.flags=(p.flags|8)>>>0;
 p.walkSpeedRaw=mul(mul(F,options.stageScaleRaw),Default.nativeConstants.walkSpeedRaw);p.walkSpeedMaxOnIceRaw=mul(p.walkSpeedRaw,options.iceSpeedUpRaw);
 phases.beforeParseParameter={player:copy(p),actor:copy(a)};trace.push('Player.InitializeFields','Player.InitializeSpeed');
 // params is the existing exact ordinary/default branch; unsupported size/state slots refuse.
 p.initDir=signedByte(params.initDir,'InitDir');p.jumpContinueCount=0;p.flags=(p.flags|params.parseFlagsSet)>>>0;trace.push('Player.parseParameter');
 a.flags=(a.flags|128)>>>0;const order=(p.playerIndex-8)*10;sortingEvent(a,order);trace.push('Actor.SetSortingOrder54');
 a.flags=(a.flags|512|2048)>>>0;a.weightRaw=6553600;a.flags=(a.flags|32768|65536|262144|16777216)>>>0;if(p.initDir!==0&&(a.flags&16384))a.flags=(a.flags|1024)>>>0;
 trace.push('Actor.InitializePlayerFlagsWeightDirection');
 // Lead integration: allocate at the native initCollision call boundary, after
 // sorting/flags/weight and before initializeOnly. Pure snapshot callers retain
 // explicit bindings. The enclosing whole-world transaction owns rollback.
 if(options.allocateCollision){const id=options.allocateCollision(a,p);checkCollisionId(id);binding={...binding,id};}
 let collisions=[Collision.createBody(binding,a,p.earScaleRaw)];a.collisionHolders.push({collisionId:binding.id,syncPos:true});trace.push('Player.initCollision');
 phases.beforeStateTransition={player:copy(p),actor:copy(a),collisions:copy(collisions)};
 // StateDispatch.state aliases m_PlayerState; m_State(+f) stays separate as subState.
 const view={actorType:a.actorType,requestAnimationId:a.requestAnimationId,player:{...copy(p),state:p.playerState}};
 const stateTrace=State.updatePlayerState({},view,{},true);const {state,...updated}=view.player;Object.assign(p,updated,{playerState:state});a.requestAnimationId=view.requestAnimationId;
 trace.push('Player.updatePlayerState.initializeOnly');phases.afterStateTransition={player:copy(p),actor:copy(a),collisions:copy(collisions),stateTrace};
 // This is Player.CreateEntity's return tail, preceding ActorScene.AddActor.
 a.actorType=27;const mutableFactoryPosition={xRaw:Collision.stageRaw(authored.posX),yRaw:raw(Number(BigInt.asIntN(64,BigInt(Collision.stageRaw(authored.posY))-32768n)),'creator position')};trace.push('Creator.ActorType27','Creator.OffsetY');
 return {player:p,actor:a,collisions,mutableFactoryPosition,phases,trace};
}
function register(snapshot,options={}){
 if(!snapshot?.player||snapshot.player.playerState!==1||snapshot.player.requestedPlayerState!==0)throw Error('PlayerBootstrap completed Player.Initialize required before AddActor');
 const out=copy(snapshot),registered=ActorInit.register(out.actor,out.collisions,out.mutableFactoryPosition,options.stageScaleRaw,{uniqueNameVerified:options.uniqueNameVerified});out.actor=registered.actor;out.collisions=registered.collisions;out.phases.actorSetInitPos=registered.phases.actorSetInitPos;out.phases.actorSetBaseScale=registered.phases.actorSetBaseScale;out.trace.push('ActorScene.SetInitPos','ActorScene.SetBaseScale');return out;
}
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('PlayerBootstrap native population2..8 required');
 if(!Number.isInteger(options.actorSceneFlags)||(options.actorSceneFlags&4)===0||options.freshPlayerListVerified!==true)throw Error('PlayerBootstrap fresh native limited scene player list required');
 if(!Array.isArray(options.nativePlayerIndexList)||options.nativePlayerIndexList.length!==count||!Array.isArray(options.gamePlayerInfos)||!Array.isArray(options.bindings)||options.bindings.length!==count)throw Error('PlayerBootstrap actual native player-index list, GamePlayerInfos and allocated bindings required; no shuffle/name inference');
 const list=options.nativePlayerIndexList;for(const value of list)if(signedByte(value,'player-index list')!==value)throw Error('PlayerBootstrap signed-byte native index list required');if(new Set(list).size!==count)throw Error('PlayerBootstrap duplicate player-index list entries unsupported');
 if(!Population)throw Error('PlayerBootstrap shared population rules required');
 const accepted=actors.map(x=>x.properties||x).filter(x=>x.typeName==='Player'&&Population.actorPopulationAllowed(x.playerCount,count));if(accepted.length<count)throw Error('PlayerBootstrap insufficient authored Player slots');
 const ids=new Set(),collisionIds=new Set();const players=accepted.slice(0,count).map((authored,index)=>{const binding=options.bindings[index];if(binding.index!==index||binding.playerIndex!==list[index])throw Error('PlayerBootstrap binding must match actual native scene index/player-index list');const infos=options.gamePlayerInfos.filter(x=>x.playerIndex===list[index]);if(infos.length!==1||infos[0].colorIndex!==binding.colorIndex)throw Error('PlayerBootstrap actual GamePlayerInfo color binding required');if(ids.has(binding.entityId)||collisionIds.has(binding.id))throw Error('PlayerBootstrap duplicate actual EntityRef/collision ID');ids.add(binding.entityId);collisionIds.add(binding.id);let snapshot=bootstrap(authored,binding.actorAtPlayerInitialize,binding,options);if(options.register===true)snapshot=register(snapshot,options);return {authoredName:authored.name,...snapshot};});
 return {schemaVersion:1,count,nativePlayerIndexList:copy(list),players};
}
return {addedPlayer,bootstrap,register,compile,create:copy,supportedTypes:[],completePhysicsFidelity:false,nativeConstants:{actorPlayerMask:ACTOR_MASK,weightMaxRaw:6553600}};
});
