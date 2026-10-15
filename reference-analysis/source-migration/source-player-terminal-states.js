/* Native Player Clear5/Dead3 bodies, static DLL only.
 * ClearInit0x1816c2690: subState0@26da,velo0@26f6,SetVisible(false,
 * Player.entityRef)@2728,ClearCollisionContactInfo@2745; Finalize@27dd true.
 * ClearPost0x1816c2800: phase0 wait65536,++@2a9e;phase1dt@2a7c;
 * phase2Press4@289c,collision0@28ca,IsCollidedByPushBackTarget3@2920.
 * clear ONLYfirstcatch flag Player11 / flags2bit2 / flags2bit3@294e..2986;
 * choose request1/9/6/7 viaPlayer12/17,flags2bit4@2990..2a46.
 * DeadInit0x1816c2ad0: Player9,sub0,wait0,flags2bit1clear@2b11..4b;
 * first GamePlayerInfo.PlayerRefRaw == signedPlayerIndex+1 flagsbit1@2bdb..c0d.
 * DeadUpdate0x1816c2c20: phase0sort=(signedIndex+592)*10@2e73..89,
 * velo0,collisionfalse,animation7,wait65536,++@2e9a..2f4b;
 * phase1dt<=0 ->vy-589824,++@2de7..e40;phase2gravity@2cda,
 * comparecurrentPosY >= unsignedMap.tileHeight*6291456@2d0f..23;
 * SetPause(true,self)@2d6c,Actor24clear,request4,Stageflags8gate@2d71..daf.
 * CountGameOver0x18170dd60 bit15guard ->Frame._globals+f0 increment@ddc8;
 * metadata _globals_.CheckPointInfo(100-16),GameOverCount(10-16).
 * afterCount Stagebit9clear/bit10set@2dd1..df,thenPlayer.subState++.
 * Existing Pool/Motion/Warp cores reused; actualregistry/query/map/roster
 * remain explicit host snapshots. No fake roster, guessedclear-overlap, orI/O.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-native-event-pool.js'):root.SourceNativeEventPool,typeof module==='object'&&module.exports?require('./source-actor-motion.js'):root.SourceActorMotion,typeof module==='object'&&module.exports?require('./source-actor-warp-jump.js'):root.SourceActorWarpJump);if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerTerminalStates=api;})(globalThis,function(Pool,Motion,Warp){
'use strict';
function raw(v){if(!Number.isSafeInteger(v))throw Error('PlayerTerminalStates exact raw required');return v;}
const add=(a,b)=>raw(Number(BigInt.asIntN(64,BigInt(raw(a))+BigInt(raw(b)))));
function flags(v){if(!Number.isInteger(v)||v<0||v>0xffffffff)throw Error('PlayerTerminalStates actual uint32 flags required');return v;}
function signedByte(v,label){if(!Number.isInteger(v)||v<-128||v>127)throw Error('PlayerTerminalStates signed byte required: '+label);return v;}
const inc=v=>((v+129)&255)-128;
function player(a){if(a?.actorType!==27||!a.player)throw Error('PlayerTerminalStates ordinary Actor27 required');flags(a.flags);flags(a.player.flags);if(!Number.isInteger(a.player.flags2)||a.player.flags2<0||a.player.flags2>65535)throw Error('PlayerTerminalStates actual flags2 ushort required');if(a.player.entityId===undefined)throw Error('PlayerTerminalStates actual Player.entityRef required');return a.player;}
function sync(v){if(v&&typeof v.then==='function')throw Error('PlayerTerminalStates native host must be synchronous');return v;}
function need(host,name,...args){if(typeof host?.[name]!=='function')throw Error('PlayerTerminalStates exact native host required: '+name);return sync(host[name](...args));}
function event(w,a,type,field,value,owner,host){if(!Pool)throw Error('PlayerTerminalStates native event pool required');const e=Pool.getEventParam(w.eventPool,a,type);if(e===null)throw Error('PlayerTerminalStates native control event pool exhausted');if(owner!==undefined)e.NotifiedActor=owner;e[field]=value;return Pool.notifyEvent(a,e,(target,param)=>{const n=need(host,'invokeOnRecvEvent',w,target,param);if(!Number.isInteger(n)||n<-2147483648||n>2147483647)throw Error('PlayerTerminalStates native event int32 return required');return n;});}
function initializeClear(w,a,host={}){let p=player(a);p.subState=0;a.velocityRaw={xRaw:0,yRaw:0};event(w,a,55,'IsVisible',false,p.entityId,host);if(!Warp)throw Error('PlayerTerminalStates native contactclear helper required');Warp.clearCollisionContactInfo(w,a);}
function finalizeClear(w,a,host={}){const p=player(a);event(w,a,55,'IsVisible',true,p.entityId,host);}
function postClear(w,a,host={}){const p=player(a),phase=signedByte(p.subState,'subState');if(phase===0){p.waitTimerRaw=65536;p.subState=inc(phase);return;}if(phase===1){p.waitTimerRaw=add(p.waitTimerRaw,-raw(w.deltaTimeRaw));if(p.waitTimerRaw<=0)p.subState=inc(phase);return;}if(phase!==2)return;const press=need(host,'isPressInput',w,a,4);if(typeof press!=='boolean')throw Error('PlayerTerminalStates native Press4 boolean required');if(!press)return;const c=need(host,'getCollision',w,a,0);if(!c)return;const blocked=need(host,'isCollidedByPushBackTarget',w,c,3);if(typeof blocked!=='boolean')throw Error('PlayerTerminalStates native pushback collision result required');if(blocked)return;if(p.flags&2048)p.flags=(p.flags&~2048)>>>0;else if(p.flags2&4)p.flags2&=~4;else if(p.flags2&8)p.flags2&=~8;p.requestedPlayerState=!(p.flags&4096)?(p.flags&131072?9:1):(p.flags2&16?7:6);}
function initializeDead(w,a){const p=player(a);p.flags=(p.flags|512)>>>0;p.subState=0;p.waitTimerRaw=0;p.flags2&=~2;const index=signedByte(p.playerIndex,'playerIndex');if(!Array.isArray(w.gamePlayerInfos))throw Error('PlayerTerminalStates actual Frame.GamePlayerInfoList required; no fabricated roster');for(const info of w.gamePlayerInfos){if(!info||!Number.isInteger(info.playerRefRaw)||info.playerRefRaw<-2147483648||info.playerRefRaw>2147483647)throw Error('PlayerTerminalStates actual GamePlayerInfo.PlayerRef raw required');if(info.playerRefRaw===index+1){if(!Number.isInteger(info.flags)||info.flags<0||info.flags>65535)throw Error('PlayerTerminalStates actual GamePlayerInfo flags ushort required');info.flags|=2;break;}}}
function countGameOver(w){flags(w.stage?.flags);if(w.stage.flags&32768)return false;const checkpoint=w.checkpointInfo;if(!checkpoint||!Number.isInteger(checkpoint.gameOverCount)||checkpoint.gameOverCount<-2147483648||checkpoint.gameOverCount>2147483647)throw Error('PlayerTerminalStates actual globals.CheckPointInfo.GameOverCount required');checkpoint.gameOverCount=(checkpoint.gameOverCount+1)|0;w.stage.flags=(w.stage.flags|32768)>>>0;return true;}
function updateDead(w,a,host={}){let p=player(a);const phase=signedByte(p.subState,'subState');if(phase===0){const index=signedByte(p.index,'m_Index'),sorting=(index+592)*10;event(w,a,54,'SortingOrder',sorting,undefined,host);p=player(a);a.velocityRaw={xRaw:0,yRaw:0};if(!Motion)throw Error('PlayerTerminalStates native collisionactive helper required');Motion.setCollisionActive(w,a,false,p.entityId);p=player(a);if(p.currentAnimationId!==7){p.currentAnimationId=7;a.requestAnimationId=7;}p.waitTimerRaw=65536;p.subState=inc(signedByte(p.subState,'subState'));return;}
 if(phase===1){p.waitTimerRaw=add(p.waitTimerRaw,-raw(w.deltaTimeRaw));if(p.waitTimerRaw<=0){raw(a.velocityRaw?.xRaw);a.velocityRaw.yRaw=-589824;p.subState=inc(phase);}return;}
 if(phase!==2)return;raw(a.velocityRaw?.yRaw);a.velocityRaw.yRaw=add(a.velocityRaw.yRaw,w.gravityRaw);raw(a.positionRaw?.yRaw);const height=w.map?.tileHeight;if(!Number.isInteger(height)||height<0||height>65535)throw Error('PlayerTerminalStates actual Map.tileHeight ushort required');if(a.positionRaw.yRaw<height*6291456)return;event(w,a,53,'IsPause',true,p.entityId,host);p=player(a);a.flags=(a.flags&~16777216)>>>0;p.requestedPlayerState=4;flags(w.stage?.flags);if(!(w.stage.flags&256)){countGameOver(w);w.stage.flags=((w.stage.flags&~512)|1024)>>>0;}p.subState=inc(signedByte(p.subState,'subState'));}
function createCallbacks(host={}){return{OnInitialize_Clear:(w,a)=>initializeClear(w,a,host),OnFinalize_Clear:(w,a)=>finalizeClear(w,a,host),OnPost_Clear:(w,a)=>postClear(w,a,host),OnInitialize_Dead:(w,a)=>initializeDead(w,a),OnUpdate_Dead:(w,a)=>updateDead(w,a,host)};}
return{initializeClear,finalizeClear,postClear,initializeDead,updateDead,countGameOver,createCallbacks,nativeConstants:{clearState:5,deadState:3,deadFinishedRequest:4,waitRaw:65536,deadLaunchYRaw:-589824,deadThresholdPerTileRaw:6291456},supportedTypes:[],completePhysicsFidelity:false};
});
