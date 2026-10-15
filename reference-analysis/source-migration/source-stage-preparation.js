/* Stage preparation scheduler; original executable never loaded.
 * Update0x18170a570 state byte+2 cases1..5: one prepare, success increments
 * LIVE phase and returns@a5f0/a629/a662/a69b/a6d0. case6 bit2 gate@a6fa;
 * prepare1..5 require Frame.IsVerified byte+18 (getter0x18050ac60).
 * p1@a740: Manager/Scene/Factory GetOrAddSingleton, GetEntityRef0x1819756e0,
 * Scene.Initialize@a92e then Factory.Initialize@a9ec, even existing singletons.
 * GetOrAdd Manager0x180786e80: existing skips Create@eeb; absent/no supplied
 * entity calls Frame.Create0x181979090@f08 then zero-default component@f3c.
 * p2@aa20: Map/Camera/CollisionScene/StageNotice.CreateEntity in this order.
 * p3@aad0: scale/fail/ice writes@ab5f..ac93, Stage flag3@acb1, Scene flag2
 * @aced/acf3; InitPlayerIndexList(shuffle)@ad0f; count@ad1d; scroll@ad22..ad8a;
 * darkness flag4@ad9a; Camera.Request* then Factory.Update(threshold0)@ae0c.
 * QGameDefine.cctor0x181780766/77b/791: chip48F, failUp-2400F/down2400F.
 * failLeft=-480F@ac0a, right=(int32(width+10)*48)<<16@ac2c..3a if !unlimit;
 * gravity=i64(scaleRaw*42598)>>16@ac47..53; ice defaults64881/2621/98304
 * @ac42/ac69/ac80 only if supplied raw==0. Count products wrap64@ad4a/ad5a.
 * p4@ae40: input0 Normal(entity+0),1 Majority(+60),2 Multi(+8)+Initialize,
 * 3 Half(+20); other byte values returntrue@b1ed, no singleton branch.
 * p5@b220: initScroll@b298 -> CheckDarkness@b2a6 -> GetGame -> SetActive(false,
 * Game.entityRef)@b2e3. No onUpdate until a later Update call.
 * initScroll@b310: start0 playerCount>0 -> calcRange,GetCamera,ToPlayerCenter;
 * start1 ->GetCamera,ToMapCenter; other start bytes do nothing. No scroll write.
 * Darkness@d930 Stageflag4: Map invisible owner conditional write+flag0@d9cf..
 * d9f5, Camera flag5@da19, GetEventParam(type18)@da40 IsDarkness=true@da4d,
 * Frame.NotifyEvent@da57. Null event throws, no fake successful notification.
 * SetActive@ce00: flag0 is INACTIVE; propagate only when changed, Stage flag
 * write@ceb5 precedes Scene.SetActive@cef9 then Map.SetActive@cf36.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-stage-autoscroll.js'):root.SourceStageAutoScroll,c?require('./source-camera-native.js'):root.SourceCameraNative);if(c)module.exports=api;root.SourceStagePreparation=api;})(globalThis,function(Auto,Camera){
'use strict';
const F=65536,clone=x=>JSON.parse(JSON.stringify(x));
function raw(v,k){if(!Number.isSafeInteger(v))throw Error('StagePreparation exact safe native raw required: '+k);return v;}
function int(v,k){if(!Number.isInteger(v)||v<-2147483648||v>2147483647)throw Error('StagePreparation int32 required: '+k);return v;}
function byte(v,k){if(!Number.isInteger(v)||v<0||v>255)throw Error('StagePreparation byte required: '+k);return v;}
function flags(v,k,max=0xffffffff){if(!Number.isInteger(v)||v<0||v>max)throw Error('StagePreparation native flags required: '+k);return v;}
function i64(v){return raw(Number(BigInt.asIntN(64,v)),'signed64 result');}
const times=(a,n)=>i64(BigInt(raw(a,'product'))*BigInt(int(n,'multiplier'))),add=(a,b)=>i64(BigInt(raw(a,'add'))+BigInt(raw(b,'add')));
function call(h,k,...args){if(typeof h?.[k]!=='function')throw Error('StagePreparation required native host: '+k);const r=h[k](...args);if(r&&typeof r.then==='function')throw Error('StagePreparation synchronous native host required: '+k);return r;}
function object(o,k){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('StagePreparation native '+k+' required');return o;}
function ref(o,k='entityRef'){if(o?.[k]===undefined||o[k]===null)throw Error('StagePreparation explicit native EntityRef required: '+k);return o[k];}
function verified(f){if(typeof f?.isVerified!=='boolean')throw Error('StagePreparation Frame.IsVerified required');return f.isVerified;}
function authored(p,k,r){if(!Number.isFinite(p[k]))throw Error('StagePreparation authored parameter required: '+k);if(Object.hasOwn(r,k))return raw(r[k],k);const v=Math.fround(p[k]);if(!Number.isInteger(v))throw Error('StagePreparation nativeParamRaws.'+k+' required for nonintegral convertFP chain');return i64(BigInt(v)*BigInt(F));}
function compile(actors,count,options={}){if(!Array.isArray(actors))throw Error('StagePreparation actor parameter array required');const stage=object(options.stage,'selected stage parameter'),r=options.nativeParamRaws||{},raws={};for(const k of['scale','failUpY','failDownY','iceResistivity','iceFriction','iceSpeedUp','autoScrollDelayTime','autoScrollSpeed','autoScrollSpeedOffset','autoScrollEndOffset'])raws[k]=authored(stage,k,r);for(const k of['limitPlayer','shufflePlayer','darkness','unlimitScroll','unreturnScroll','zoomOut'])int(stage[k],k);byte(stage.cameraStartType,'cameraStartType');if(!Auto)throw Error('StagePreparation StageAutoScroll dependency required');Auto.compile(actors,count,{stage,nativeParamRaws:raws});int(stage.mapInitParam.height,'map.height');return{schemaVersion:1,count,stage:clone(stage),nativeParamRaws:raws};}
function create(compiled,options={}){if(compiled?.schemaVersion!==1)throw Error('StagePreparation compiled selected stage required');const s=clone(object(options.nativeStage,'existing initialized Stage snapshot'));byte(s.phase,'phase');byte(s.inputType,'inputType');flags(s.flags,'Stage.flags');ref(s);object(s.scrollPositionRaw,'existing scroll position');raw(s.scrollPositionRaw.xRaw,'scroll.x');raw(s.scrollPositionRaw.yRaw,'scroll.y');return s;}
function singleton(h,f,kind,site){const r=object(call(h,'getOrAddSingleton',f,kind,{suppliedEntityRef:0,site}),'singleton outcome');if(!['existing','created'].includes(r.branch))throw Error('StagePreparation explicit existing/created singleton outcome required');const c=object(r.component,kind);c.entityRef=call(h,'getSingletonEntityRef',f,kind);ref(c);return c;}
function prepare1(s,f,h){if(!verified(f))return false;singleton(h,f,'ActorManagerComponent','0x18170a7e8');const scene=singleton(h,f,'ActorSceneComponent','0x18170a8be');call(h,'initializeActorScene',scene,f);const factory=singleton(h,f,'ActorFactoryComponent','0x18170a994');call(h,'initializeActorFactory',factory,f);return true;}
function prepare2(s,f,h){if(!verified(f))return false;for(const k of['createMapEntity','createCameraEntity','createCollisionSceneEntity','createStageNoticeEntity'])call(h,k,f);return true;}
function nativeParam(h,f){const p=object(call(h,'getStageInitParam',f),'converted stage asset');object(p.stage,'authored selected stage');object(p.nativeParamRaws,'converted stage raws');return p;}
function prepare3(s,f,h){if(!verified(f))return false;const p=nativeParam(h,f),a=p.stage,r=p.nativeParamRaws;const get=k=>raw(r[k],k);s.baseScaleRaw=get('scale');s.failUpYRaw=get('failUpY')||-157286400;const down=get('failDownY')||157286400;const m=object(a.mapInitParam,'mapInitParam');s.failFallYRaw=add(times(3145728,int(m.height,'map.height')),down);s.failLeftXRaw=-31457280;const unlimit=int(a.unlimitScroll,'unlimitScroll');s.failRightXRaw=unlimit===0?Number(BigInt(((Math.imul((int(m.width,'map.width')+10)|0,3))<<4))<<16n):0;
 s.gravityRaw=i64(BigInt.asIntN(64,BigInt(s.baseScaleRaw)*42598n)>>16n);s.iceResistivityRaw=get('iceResistivity')||64881;s.iceFrictionRaw=get('iceFriction')||2621;s.iceSpeedUpRaw=get('iceSpeedUp')||98304;s.flags=(flags(s.flags,'Stage.flags')|8)>>>0;
 const scene=object(call(h,'getActorScene',f),'ActorScene');scene.flags=flags(scene.flags,'Scene.flags',65535);scene.flags=int(a.limitPlayer,'limitPlayer')!==0?scene.flags|4:scene.flags&~4;call(h,'initPlayerIndexList',scene,f,int(a.shufflePlayer,'shufflePlayer')!==0);const count=int(call(h,'getPlayerIndexCount',scene,f),'player index count');s.scrollParam=Auto.compile([],count,{stage:a,nativeParamRaws:r});s.scrollParam.cameraStartType=byte(a.cameraStartType,'cameraStartType');s.flags=(int(a.darkness,'darkness')!==0?s.flags|16:s.flags&~16)>>>0;
 const camera=object(call(h,'getCamera',f),'Camera');if(!Camera)throw Error('StagePreparation Camera dependency required');[Camera.requestStop,Camera.requestNormal,Camera.requestAuto][s.scrollParam.scrollType](camera);const factory=object(call(h,'getActorFactory',f),'ActorFactory');call(h,'updateActorFactory',factory,f,0);return true;}
function prepare4(s,f,h){if(!verified(f))return false;const type=byte(s.inputType,'inputType'),kind=['NormalInputComponent','MajorityInputComponent','MultiInputComponent','HalfInputComponent'][type];if(kind){const c=singleton(h,f,kind,['0x18170b19f','0x18170b0c9','0x18170afd3','0x18170af11'][type]);if(type===2)call(h,'initializeMultiInput',c,f);}return true;}
function initScroll(s,f,h){const start=byte(s.scrollParam?.cameraStartType,'cameraStartType');if(start===0){const count=int(call(h,'getPlayerActorCount',f),'player Actor count');if(count<=0)return;const range=object(call(h,'calcPlayerRange',s,f),'calculated native player range');for(const k of['left','right','top','bottom'])raw(range[k],k);s.playerRange=range;const camera=object(call(h,'getCamera',f),'Camera');Camera.toPlayerCenter(camera,range);}else if(start===1)Camera.toMapCenter(object(call(h,'getCamera',f),'Camera'));}
function checkDarkness(s,f,h){if(!(flags(s.flags,'Stage.flags')&16))return;const map=object(call(h,'getMap',f),'Map'),owner=ref(s);ref(map,'invisibleEntity');flags(map.flags,'Map.flags',65535);if(owner===0||map.invisibleEntity===0){map.invisibleEntity=owner;map.flags|=1;}const camera=object(call(h,'getCamera',f),'Camera');camera.flags=flags(camera.flags,'Camera.flags',65535)|32;const event=call(h,'getStageEventParam',s,18);object(event,'non-null darkness QEventParam (native null dereference)');event.IsDarkness=true;call(h,'notifyEvent',f,event);}
function setActive(s,f,active,owner,h){if(typeof active!=='boolean')throw Error('StagePreparation SetActive native boolean required');const inactive=!!(flags(s.flags,'Stage.flags')&1);if(inactive===!active)return false;s.flags=(active?s.flags&~1:s.flags|1)>>>0;const scene=object(call(h,'getActorScene',f),'ActorScene');call(h,'setActorSceneActive',scene,f,active,owner);const map=object(call(h,'getMap',f),'Map');call(h,'setMapActive',map,f,active,owner);return true;}
function prepare5(s,f,h){if(!verified(f))return false;initScroll(s,f,h);checkDarkness(s,f,h);const game=object(call(h,'getGame',f),'Game');setActive(s,f,false,ref(game),h);return true;}
const phases=[null,prepare1,prepare2,prepare3,prepare4,prepare5];
function update(s,f,h){const phase=byte(s?.phase,'phase');if(phase>=1&&phase<=5){const success=phases[phase](s,f,h);if(success)s.phase=(byte(s.phase,'live phase')+1)&255;return{phase,prepared:success,nextPhase:s.phase};}if(phase===6&&!(flags(s.flags,'Stage.flags')&4)){call(h,'onUpdate',s,f);return{phase,prepared:false,onUpdate:true,nextPhase:s.phase};}return{phase,prepared:false,onUpdate:false,nextPhase:s.phase};}
return{compile,create,update,prepare1,prepare2,prepare3,prepare4,prepare5,initScroll,checkDarkness,setActive,supportedTypes:[],completePhysicsFidelity:false};
});
