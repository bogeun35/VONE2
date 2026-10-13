/* Source-derived PP2 RallyController + RallyMallet, PARTIAL, not registerable.
   Native code was never executed. All simulation constants below have evidence.
   Creator ordinals 192/189: creator-delegates-resolved.local.json.
   Controller Initialize 0x1816dfc84: rallyMax=10, speedUpRallyCount=2.
   Initialize 0x1816dfcb0..0x1816dfd60 reads QFP static offsets:
   ballScale=_1, ballSpeed=_6, ballSpeedInc=_0_10, ballSpeedMax=_16,
   malletScale=_1, malletSpeed=_10, malletSpeedInc=_0_10, malletSpeedMax=_20.
   ParseParameter 0x1816dfe40..0x1816e0276:
   slots 0 rallyMax; 1/2 ballStartPos; 3 ballSpeed; 4 ballSpeedInc;
   5 malletSpeedInc; 6 speedUpRallyCount; 7 malletSpeed; 8 ballSpeedMax;
   9 malletSpeedMax; 10 ballScale; 11 malletScale. Positive overrides only,
   except startPos which is stored unconditionally. Integers narrow to a byte.
   QFP._0_10 raw=6553 (QFP cctor; resolver verify), FP_ONE=65536
   (FP.FromFloat_UNSAFE 0x18163fc40). Stage slot conversion is unresolved for
   non-exact decimals; diagnostic decoding preserves them rather than guessing.
   OnUpdate=bare ret 0x180476130. OnPost 0x1816e03a9 skips flag bit0.
   updatePhase: 0 -> 1 with QFP._0_50 raw32768 (0x1816e058f);
   phase1 countdown, request ball creation then phase2 (0x1816e04df..557);
   phase2 missing ball -> phase1 with QFP._0_25 raw16384 (0x1816e04c5);
   phase3 clear once then phase4 (0x1816e047d..482).
   Event9 hit / Event7 disappeared: OnRecvEvent 0x1816e0abb..b48.
   Hit increments count until max, then phase3; every speedUpRallyCount hits
   before max: event57 to actor191 ball and actor189 mallets with speedInc
   (0x1816e0bba..c8b). No phase2-only guard: accepts phase0/1 hits too.
   Disappeared clears ball reference, resets count ONLY below max, broadcasts
   event58 to mallets (0x1816e0cf2..d6a). Does not directly change phase.
   clearProc 0x1816e09b4..a44: event1 to actor17 Key, event35 to current ball,
   event35 to actor189 mallets, ChangeAllPlayerState(1), controller flag bit0.
   Mallet Initialize: speed10/max20; default length256 at 0x1816e4e64.
   ParseParameter 0x1816e4f17..5081: slot0 actor index, slot1 angle with one
   wrap by QFP._360, slot2 positive rail length; player/color resolved from
   Frame.GetPlayerByActorIndex, NOT assumed identical to the authored index.
   InitPost 0x1816e5237..246: railLimit=(length/QFP._2)^2 in FP;
   rotation uses raw0x477 radians/degree (0x1816e5219), native quaternion
   functions 0x181644e70 / 0x181645b90. Math.sin/cos are NOT substitutes.
   .cctor 0x1816e6263: circle radius raw0x190000=25; offsets zero.
   InitCollision 0x1816e515a..517d: collision type2, flag1, layer3.
   move 0x1816e5f1d..ff9: speed=min(base+increment,max), scaled by actor
   timeScale, multiply input by native rotation vector; reject entire proposed
   position if squared distance exceeds railLimit. It does not clamp endpoints.
   Mallet events at 0x1816e607e..6111: 35 stop,57 add speed,58 reset increment.
   createBall 0x1816e06fe picks registered mallet via RNGSession.Next(int,int);
   angle toward that mallet uses native atan 0x1816407f0 then raw0x394bb8
   degrees/radian; RNGSession.Next(FP,FP) at 0x1816e085f adds -20..20 degrees;
   RallyBallComponent.Creator 0x1816dda50 invoked at 0x1816e091d.
   Missing RallyBall simulation and exact native rotation prevent execution.
   inspectActors/controllerPost/controllerEvent are analysis-only helpers.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceRallyDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const supportedTypes=['RallyController','RallyMallet'];
const FP_ONE=65536,INITIAL_WAIT_RAW=32768,RETRY_WAIT_RAW=16384;
const EVENT={HIT:9,DISAPPEARED:7,SPEED_ADD:57,SPEED_RESET:58,STOP:35,START:1};
const TYPE={BALL:191,MALLET:189,KEY:17};
const unresolved='Rally physics unresolved: missing RallyBall simulation (Creator 0x1816dda50), native FP rotation/atan and player input mapping; do not register this partial module';
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function inspectActors(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Rally player count must be 2..8');
 const controllers=[],mallets=[];
 actors.forEach((raw,i)=>{
  const a=raw.properties||raw,d=raw.datas||raw.parameters||[];
  if(!supportedTypes.includes(a.typeName)||!allowed(a.playerCount,count))return;
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  const n=j=>d[j]?.t===1?d[j].f:0;
  const common={id:raw.id||'source:a'+i,name:a.name||'',type:a.typeName,x:pos.x,y:pos.y};
  if(a.typeName==='RallyController'){
   const positive=(j,def)=>n(j)>0?n(j):def;
   const byte=(j,def)=>n(j)>0?(Math.floor(n(j))&255):def;
   controllers.push({...common,rallyMax:byte(0,10),speedUpRallyCount:byte(6,2),
    ballStartPos:{x:n(1),y:n(2)},ballSpeed:positive(3,6),
    ballSpeedInc:positive(4,6553/FP_ONE),malletSpeedInc:positive(5,6553/FP_ONE),
    malletSpeed:positive(7,10),ballSpeedMax:positive(8,16),malletSpeedMax:positive(9,20),
    ballScale:positive(10,1),malletScale:positive(11,1),
    phase:0,rallyCount:0,timerRaw:0,ballId:null,cleared:false});
  }else{
   let angle=n(1);if(angle<0)angle+=360;else if(angle>=360)angle-=360;
   mallets.push({...common,authoredActorIndex:Math.floor(n(0)),railAngle:angle,
    railLength:n(2)>0?n(2):256,speedIncrementRaw:0,stopped:false});
  }
 });
 return {schemaVersion:1,count,controllers,mallets,analysisOnly:true,completePhysicsFidelity:false};
}
function compile(actors,count,options){
 const decoded=inspectActors(actors,count);
 if(decoded.controllers.length||decoded.mallets.length)throw Error(unresolved);
 return {...decoded,analysisOnly:false};
}
const create=compiled=>JSON.parse(JSON.stringify(compiled));
function solids(state){if(state.analysisOnly)throw Error(unresolved);return [];}
function beforeStep(state,ctx){if(state.analysisOnly)throw Error(unresolved);return {events:[],solids:[]};}
function afterStep(state,ctx){if(state.analysisOnly)throw Error(unresolved);return {events:[],solids:[]};}
function displays(state){return {analysisOnly:state.analysisOnly,controllers:create(state.controllers),mallets:create(state.mallets)};}
// Controller helpers return semantic commands, not runnable stage events.
function controllerEvent(c,eventType){
 const commands=[];
 if(eventType===EVENT.DISAPPEARED){
  c.ballId=null;
  if(c.rallyCount<c.rallyMax){c.rallyCount=0;commands.push({eventType:EVENT.SPEED_RESET,broadcastActorType:TYPE.MALLET});}
 }else if(eventType===EVENT.HIT&&c.phase<3&&c.rallyCount<c.rallyMax){
  c.rallyCount++;
  if(c.rallyCount>=c.rallyMax)c.phase=3;
  else {
   if(c.speedUpRallyCount===0)throw Error('Native signed-byte speed divisor is zero');
   if(c.rallyCount%c.speedUpRallyCount===0){
    commands.push({eventType:EVENT.SPEED_ADD,broadcastActorType:TYPE.BALL,value:c.ballSpeedInc},
     {eventType:EVENT.SPEED_ADD,broadcastActorType:TYPE.MALLET,value:c.malletSpeedInc});
   }
  }
 }
 return commands;
}
function controllerPost(c,dt){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid Rally delta');
 if(c.cleared)return [];
 const commands=[];
 switch(c.phase){
  case 0:c.timerRaw=INITIAL_WAIT_RAW;c.phase=1;break;
  case 1:c.timerRaw-=Math.trunc(dt*FP_ONE);if(c.timerRaw<=0){commands.push({kind:'createBallRequired'});c.phase=2;}break;
  case 2:if(c.ballId===null){c.phase=1;c.timerRaw=RETRY_WAIT_RAW;}break;
  case 3:
   commands.push({eventType:EVENT.START,broadcastActorType:TYPE.KEY},
    {eventType:EVENT.STOP,targetId:c.ballId},
    {eventType:EVENT.STOP,broadcastActorType:TYPE.MALLET},
    {kind:'changeAllPlayerState',state:1});
   c.cleared=true;c.phase=4;break;
 }
 return commands;
}
function malletEvent(m,eventType,valueRaw){
 if(eventType===EVENT.STOP)m.stopped=true;
 else if(eventType===EVENT.SPEED_RESET)m.speedIncrementRaw=0;
 else if(eventType===EVENT.SPEED_ADD){
  if(!Number.isSafeInteger(valueRaw))throw Error('Mallet speed event requires exact FP raw');
  m.speedIncrementRaw+=valueRaw;
 }
}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,
 inspectActors,controllerEvent,controllerPost,malletEvent,completePhysicsFidelity:false,
 nativeConstants:{fpOne:FP_ONE,initialWaitRaw:INITIAL_WAIT_RAW,retryWaitRaw:RETRY_WAIT_RAW,event:EVENT,actorType:TYPE}};
});
