/* Player.OnUpdate prelude/state dispatch, static native only.
 * OnUpdate0x1816c0010: flag28 damage@0065..88 ->invincible@00ae
 * ->updatePlayerState@00c8 ->Player.pushBack vector(+a8)=0@00d5.
 * Invincible0x1816c06c0: timer!=0 subtractFrame.dt@0755; <=0 calls
 * SetInvincible(false)@07a4, clearsinvincibleTimer/flashTimer/isFlashing
 * @0x1816bfe90..feb0. Zero timer leavesflash untouched.
 * State goalbit16@0828: requested0 & current1/6/7/9/10 ->Press4@0873
 * requestsClear5@0891; bit16 consumed regardlesseligibility@08b1.
 * Three 12-entry tables0x1816c0d40(finalize),d70(initialize),da0(update).
 * requested!=0 triggersfinalizeeven same state@08bf; Init selector rereads
 * live requested@09f2; commit rereadsafterInit@0bba,clearsrequest@0bc1.
 * initializeOnly skipsUpdateONLYaftertransition@0bc5; no pendingrequest
 * reachesUpdate evenwheninitializeOnly=true. No implicit state timers.
 * OnInitialize_Default0x1816c2ff1/3046: Player.currentAnim1,Actor.request1
 * (10ifPlayerbit14). Dead/Clear/special bodies delegated by exactmethodVA.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerStateDispatch=api;})(globalThis,function(){
'use strict';
const row=(name,va)=>({name,va});
const STATES={0:{name:'Initial',finalize:null,initialize:null,update:null},1:{name:'Default',finalize:null,initialize:row('OnInitialize_Default','0x1816c2f70'),update:row('OnUpdate_Default','0x1816c3060')},2:{name:'Faint',finalize:row('OnFinalize_Faint','0x1816c7440'),initialize:row('OnInitialize_Faint','0x1816c7250'),update:row('OnUpdate_Faint','0x1816c74d0')},3:{name:'Dead',finalize:null,initialize:row('OnInitialize_Dead','0x1816c2ad0'),update:row('OnUpdate_Dead','0x1816c2c20')},4:{name:'NativeNoCallback4',finalize:null,initialize:null,update:null},5:{name:'Clear',finalize:row('OnFinalize_Clear','0x1816c2750'),initialize:row('OnInitialize_Clear','0x1816c2690'),update:null},6:{name:'Plane',finalize:null,initialize:row('OnInitialize_Plane','0x1816c81c0'),update:row('OnUpdate_Plane','0x1816c8400')},7:{name:'BattlePlane',finalize:null,initialize:row('OnInitialize_BattlePlane','0x1816c1cf0'),update:row('OnUpdate_BattlePlane','0x1816c1d80')},8:{name:'Target',finalize:null,initialize:row('OnInitialize_Target','0x1816c9c40'),update:null},9:{name:'TopView',finalize:row('OnFinalize_TopView','0x1816c9ed0'),initialize:row('OnInitialize_TopView','0x1816c9d20'),update:row('OnUpdate_TopView','0x1816c9f60')},10:{name:'PoleLadder',finalize:row('OnFinalize_PoleLadder','0x1816c9550'),initialize:row('OnInitialize_PoleLadder','0x1816c9380'),update:row('OnUpdate_PoleLadder','0x1816c95b0')},11:{name:'GoKart',finalize:row('OnFinalize_GoKart','0x1816c78a0'),initialize:row('OnInitialize_GoKart','0x1816c77f0'),update:null},12:{name:'Graph',finalize:row('OnFinalize_Graph','0x1816c7ad0'),initialize:row('OnInitialize_Graph','0x1816c7a70'),update:row('OnUpdate_Graph','0x1816c7b30')}};
function raw(n){if(!Number.isSafeInteger(n))throw Error('PlayerStateDispatch exact raw required');return n;}
function state(n){if(!Number.isInteger(n)||!STATES[n])throw Error('PlayerStateDispatch unsupported native state outside0..12');return n;}
function player(a){if(!a?.player||a.actorType!==27)throw Error('PlayerStateDispatch ordinary Actor27/Player required');const p=a.player;state(p.state);state(p.requestedPlayerState);if(!Number.isInteger(p.flags)||p.flags<0||p.flags>0xffffffff)throw Error('PlayerStateDispatch native Player flags required');return p;}
function sync(result){if(result&&typeof result.then==='function')throw Error('PlayerStateDispatch native callback must be synchronous');return result;}
function initializeDefault(p,a){p.currentAnimationId=1;a.requestAnimationId=p.flags&16384?10:1;}
function invincibleProc(p,dtRaw){raw(p.invincibleTimerRaw);raw(dtRaw);if(p.invincibleTimerRaw!==0){p.invincibleTimerRaw=raw(Number(BigInt.asIntN(64,BigInt(p.invincibleTimerRaw)-BigInt(dtRaw))));if(p.invincibleTimerRaw<=0){p.invincibleTimerRaw=0;p.isFlashing=0;p.flashTimerRaw=0;return true;}}return false;}
function updatePlayerState(world,a,host={},initializeOnly=false){let p=player(a);const trace=[];if(typeof initializeOnly!=='boolean')throw Error('PlayerStateDispatch native initializeOnly boolean required');const call=(phase,s)=>{state(s);const spec=STATES[s][phase];trace.push({phase,state:s,name:spec?.name||null,va:spec?.va||null,nativeNoCallback:spec===null});if(spec===null)return;if(spec.name==='OnInitialize_Default'){initializeDefault(p,a);return;}if(typeof host[spec.name]!=='function')throw Error('PlayerStateDispatch exact native host callback required: '+spec.name+' '+spec.va);sync(host[spec.name](world,a,{...spec,phase,state:s}));p=player(a);};
 if(p.flags&65536){if(p.requestedPlayerState===0&&[1,6,7,9,10].includes(p.state)){if(typeof host.isPressInput!=='function')throw Error('PlayerStateDispatch native IsPressInput4 host required forgoalenter');const pressed=sync(host.isPressInput(world,a,4));if(typeof pressed!=='boolean')throw Error('PlayerStateDispatch native Press4 result required');if(pressed)p.requestedPlayerState=5;}p.flags=(p.flags&~65536)>>>0;trace.push({phase:'consumeGoalEnter',requestedPlayerState:p.requestedPlayerState});}
 if(p.requestedPlayerState!==0){call('finalize',p.state);call('initialize',p.requestedPlayerState);p.state=state(p.requestedPlayerState);p.requestedPlayerState=0;trace.push({phase:'commit',state:p.state});if(initializeOnly)return trace;}
 call('update',p.state);return trace;
}
function onUpdate(world,a,dtRaw,host={}){const p=player(a);raw(dtRaw);/* body unverified: no silentbattlePlaneDamage skipping */if(p.flags&268435456)throw Error('PlayerStateDispatch battlePlaneDamageProc0x1816c00f0 flag28 requires verified implementation');const expired=invincibleProc(p,dtRaw),trace=[{phase:'invincibleProc',expired}];trace.push(...updatePlayerState(world,a,host,false));player(a).pushBackRaw={xRaw:0,yRaw:0};trace.push({phase:'clearPushBack'});return trace;}
return{onUpdate,updatePlayerState,invincibleProc,initializeDefault,stateTable:JSON.parse(JSON.stringify(STATES)),supportedTypes:[],completePhysicsFidelity:false};
});
