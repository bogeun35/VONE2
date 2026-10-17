/* Thunder motion/receiver, static native only; no original executable run.
 * OnUpdate18172c8f0: resolve Base via motion.entityRef@c986; Base flag3
 * bypasses BOTH disappear/phase@c9a3, still Base.update last@ca66.
 * disappear phase signed<4 and native abs(time)>=4raw@c9c2..de:
 * timer+=DeltaTime@c9eb..ca08; live time compare, setphase4@ca12.
 * updatePhase18172cb00 jump table18172d018:[cf0a,cbbe,cd82,cc1e,cd0c,cf41].
 * 0/default:return.1:copy moveVelo->privateVelo,speed=Length181640c40,
 * distance0,++phase then immediate dispatch@cbbe..cc19/cd6d.
 * 2:Base cache bit2 clear@cd97..a8; abs(moveDistance-distance)<=speed clips
 * via exact normalized(privateVelo)*remaining@cdad..ce7f. Move Actor.Pos ONLY
 * @ce99..cebe, distance+=speed@ceca; repeatbit0 ->wait1,++phase andRETURN;
 * otherwisephase0@cf3b. Actor.Velo/privateVelo not overwritten by final clip.
 * 3:timer-=dt@cc1e..44, <=0 ->privateVelo*Minus_1,Length,distance0,
 * --LIVEphase@cd03 and immediate redispatch@cd0a.
 * 4:SetCollisionActive(false,Actor.entityRef)@cd21..37, timer1@cd69,
 * ++LIVEphase/redispatch@cd6d.5:timer-=dt*SPEED@cf41..98;<=0 sets Actor
 * ExitScene bit13@cfe0,++phase andreturns, DOES NOTwrite alpha0. Else alpha=timer.
 * cctor18172d260: SPEED=QFP._4@d2ca..d1,WAIT=QFP._1@d2f0..f7;
 * QFP.cctor181780cc0 constants0xf0=65536,0x138=262144,0x240=-65536.
 * All vector products low64wrap before arithmetic>>16. Reuse frozen numeric
 * sqrt/normalization LUT helper, never float sqrt/epsilon/dt-scaled movement.
 * OnRecvEvent18172d120:61 intercept@d17b. phase0 switchbit0 ->resume saved
 * lastPhase(clear saved) orphase1; phase1..3 switchbit1 ->savephase then0.
 * phase4+/negative no switch action,return0. No timer/velocity/cache reset.
 * Other events resolve Base@d1cb ->Base.OnRecvEvent18172af10:53 writesBase
 * pretendPausebit3@af9b..b4 then SetEnableAnimation(!IsPause,NotifiedActor)
 * @afee,return0; NO Actor pause event. Other types Actor.OnRecvEvent@af81 host.
 * Receiver does not release caller's event. Native Actor.ExitScene bit13
 * setter18169df60 confirmed; Scene exit/destruction remains upstream.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceThunderMotion=api;})(globalThis,function(MathNative){
'use strict';
const F=65536,FADE=262144;
function raw(n,k){if(!Number.isSafeInteger(n))throw Error('ThunderMotion exact safe native raw required: '+k);return n;}
function number(n){return raw(Number(n),'signed64 result');}
const i64=n=>BigInt.asIntN(64,n),add=(a,b)=>number(i64(BigInt(raw(a,'add'))+BigInt(raw(b,'add')))),sub=(a,b)=>number(i64(BigInt(raw(a,'sub'))-BigInt(raw(b,'sub')))),mul=(a,b)=>number(i64(BigInt(raw(a,'product'))*BigInt(raw(b,'product')))>>16n);
function abs(n){n=BigInt(raw(n,'abs'));return number(i64(n<0n?-n:n));}
function signed(n,k){if(!Number.isInteger(n)||n<-128||n>127)throw Error('ThunderMotion native signed phase byte required: '+k);return n;}
function byteAdd(n,d){return ((signed(n,'live phase')+d+128)&255)-128;}
function flags(n,k,max=65535){if(!Number.isInteger(n)||n<0||n>max)throw Error('ThunderMotion native flags required: '+k);return n;}
function object(o,k){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('ThunderMotion native '+k+' required');return o;}
function point(v,k){object(v,k);raw(v.xRaw,k+'.x');raw(v.yRaw,k+'.y');return v;}
function call(h,k,...args){if(typeof h?.[k]!=='function')throw Error('ThunderMotion exact native host required: '+k);const r=h[k](...args);if(r&&typeof r.then==='function')throw Error('ThunderMotion synchronous native host required: '+k);return r;}
function state(a){object(a,'Actor');if(a.actorType!==38)throw Error('ThunderMotion native Thunder38 Actor required');const t=object(a.thunderState,'Thunder motion component');if(t.entityId===undefined||t.entityId===null)throw Error('ThunderMotion actual motion EntityRef required');return t;}
function getBase(w,t,h){return object(call(h,'getThunderBase',w,t.entityId),'resolved ThunderBase pointer');}
function dt(w,h){return raw(call(h,'getDeltaTime',w),'Frame.DeltaTime');}
function create(snapshot){const t=JSON.parse(JSON.stringify(object(snapshot,'motion snapshot')));signed(t.phase,'phase');signed(t.lastPhase,'lastPhase');signed(t.switchType,'switchType');flags(t.flags,'motion.flags');for(const k of['disappearTimeRaw','disappearTimerRaw','distanceRaw','moveDistanceRaw','speedRaw','timerRaw'])raw(t[k],k);point(t.moveVelocityRaw,'moveVelocityRaw');point(t.velocityRaw,'velocityRaw');if(t.entityId===undefined||t.entityId===null)throw Error('ThunderMotion actual motion EntityRef required');return t;}
function updateDisappear(w,t,h={}){if(signed(t.phase,'phase')>=4||abs(t.disappearTimeRaw)<4)return;const before=raw(t.disappearTimerRaw,'disappearTimer');t.disappearTimerRaw=add(before,dt(w,h));if(t.disappearTimerRaw>=raw(t.disappearTimeRaw,'live disappearTime'))t.phase=4;}
function updatePhase(w,a,t,base,h={}){for(;;){const phase=signed(t.phase,'phase');if(phase<0||phase>5||phase===0)return;if(phase===1){t.velocityRaw={...point(t.moveVelocityRaw,'moveVelocityRaw')};if(!MathNative)throw Error('ThunderMotion exact native FP math dependency required');t.speedRaw=MathNative.lengthRaw(t.velocityRaw);t.distanceRaw=0;t.phase=byteAdd(t.phase,1);continue;}
 if(phase===2){base.flags=flags(base.flags,'Base.flags')&~4;const remaining=abs(sub(t.moveDistanceRaw,t.distanceRaw));let velocity={...point(t.velocityRaw,'private velocity')},reached=false;if(remaining<=raw(t.speedRaw,'speed')){if(!MathNative)throw Error('ThunderMotion native normalization dependency required');const unit=MathNative.normalizeRaw(velocity);t.speedRaw=remaining;velocity={xRaw:mul(unit.xRaw,remaining),yRaw:mul(unit.yRaw,remaining)};reached=true;}const p=point(a.positionRaw,'Actor.Pos');a.positionRaw={xRaw:add(p.xRaw,velocity.xRaw),yRaw:add(p.yRaw,velocity.yRaw)};t.distanceRaw=add(t.distanceRaw,t.speedRaw);if(reached){if(flags(t.flags,'motion.flags')&1){t.timerRaw=F;t.phase=byteAdd(t.phase,1);}else t.phase=0;}return;}
 if(phase===3){const before=raw(t.timerRaw,'wait timer');t.timerRaw=sub(before,dt(w,h));if(t.timerRaw>0)return;const v=point(t.velocityRaw,'private velocity');t.velocityRaw={xRaw:mul(v.xRaw,-F),yRaw:mul(v.yRaw,-F)};if(!MathNative)throw Error('ThunderMotion native Length dependency required');t.speedRaw=MathNative.lengthRaw(t.velocityRaw);t.distanceRaw=0;t.phase=byteAdd(t.phase,-1);continue;}
 if(phase===4){if(a.entityId===undefined||a.entityId===null)throw Error('ThunderMotion Actor EntityRef required');call(h,'setCollisionActive',w,a,false,a.entityId);t.timerRaw=F;t.phase=byteAdd(t.phase,1);continue;}
 const before=raw(t.timerRaw,'fade timer');t.timerRaw=sub(before,mul(dt(w,h),FADE));if(t.timerRaw<=0){a.flags=(flags(a.flags,'Actor.flags',0xffffffff)|8192)>>>0;t.phase=byteAdd(t.phase,1);}else base.alphaRaw=t.timerRaw;return;}}
function onUpdate(w,a,h={}){const t=state(a),base=getBase(w,t,h);if(!(flags(base.flags,'Base.flags')&8)){updateDisappear(w,t,h);updatePhase(w,a,t,base,h);}call(h,'baseUpdate',w,a,base);}
function onRecvEvent(w,a,event,h={}){const t=state(a);object(event,'QEventParam');if(!Number.isInteger(event.EventType)||event.EventType<-2147483648||event.EventType>2147483647)throw Error('ThunderMotion native EventType int32 required');if(event.EventType===61){const phase=signed(t.phase,'phase');if(phase===0){if(signed(t.switchType,'switchType')&1){const saved=signed(t.lastPhase,'lastPhase');if(saved!==0){t.phase=saved;t.lastPhase=0;}else t.phase=1;}}else if(phase>=1&&phase<=3&&(signed(t.switchType,'switchType')&2)){t.lastPhase=phase;t.phase=0;}return 0;}const base=getBase(w,t,h);if(event.EventType===53){if(typeof event.IsPause!=='boolean')throw Error('ThunderMotion native IsPause boolean required');base.flags=event.IsPause?flags(base.flags,'Base.flags')|8:flags(base.flags,'Base.flags')&~8;if(event.NotifiedActor===undefined)throw Error('ThunderMotion actual event owner required');call(h,'setEnableAnimation',w,a,!event.IsPause,event.NotifiedActor);return 0;}const r=call(h,'actorOnRecvEvent',w,a,event);if(!Number.isInteger(r)||r<-2147483648||r>2147483647)throw Error('ThunderMotion native Actor receiver int32 result required');return r;}
return{create,onUpdate,updateDisappear,updatePhase,onRecvEvent,nativeConstants:{waitRaw:F,fadeSpeedRaw:FADE,epsilonRaw:4,exitFlag:8192,phaseTargets:['0x18172cf0a','0x18172cbbe','0x18172cd82','0x18172cc1e','0x18172cd0c','0x18172cf41']},supportedTypes:[],completePhysicsFidelity:false};
});
