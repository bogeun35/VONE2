/* Stage input0 is NOT another packet/timestamp updater.
 * Stage.updateInput18170b720: type0/default ->ret18170b78e; only1/2/3
 * look up Majority/Multi/Half and call native updater when singleton exists.
 * prepare4 Normal: verified-frame gate18170ae7f; GetOrAddSingletonPointer
 * 180026af0 @18170b19f; get singleton ref1819756e0 @b1e5; store raw+0 @b1ea.
 * NormalInputComponent has ONLY EntityRef, Initialize180476130 is bare RET,
 * and no Update method. Allocator/entity identity stays with actual host.
 * Player.IsEnableInput1816be1d0 checks Player bit7,Stage bit3 on/bit1 off;
 * wakeCount!=0 is separate IsOn/Press/Release precondition @be2f8 etc.
 * Input0 reader requires Normal pointer @be44a/44f, uses PLAYER INDEX(+e)
 * @be454, then Frame.GetGamePlayerInput menu mask(Stage raw+0) @174a69c..
 * 6ad. Menu shift uses low5 bits BEFORE slot range check, zero Button onnull.
 * Button predicates and storage validation reuse PlayerNativeInput unchanged.
 * onUpdate18170b460..603: flags14/0/1 skip factory/input; otherwise factory
 * then updateInput then ActorScene.Update. Packet producer runs before systems.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-player-native-input.js'):root.SourcePlayerNativeInput);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceStageInputUpdate=api;})(globalThis,function(Native){
'use strict';
const specs={0:{component:'NormalInputComponent',entityOffset:0,getterVA:'0x18174aa20',prepareHelperVA:'0x180026af0',initializeVA:'0x180476130',initializeCalled:false,updateVA:null},1:{component:'MajorityInputComponent',entityOffset:0x60,getterVA:'0x18174a900',prepareHelperVA:'0x180787790',initializeVA:'0x180476130',initializeCalled:false,updateVA:'0x18187b270'},2:{component:'MultiInputComponent',entityOffset:8,getterVA:'0x18174a990',prepareHelperVA:'0x180786d10',initializeVA:'0x1818865b0',initializeCalled:true,updateVA:'0x181886800'},3:{component:'HalfInputComponent',entityOffset:0x20,getterVA:'0x18174a5b0',prepareHelperVA:'0x180787600',initializeVA:'0x180476130',initializeCalled:false,updateVA:'0x181861cd0'}};
function integer(x,label,min,max){if(!Number.isInteger(x)||x<min||x>max)throw Error('StageInputUpdate explicit native '+label+' required');return x;}
const type=x=>integer(x,'inputType byte',0,255),flags=x=>integer(x,'flags uint32',0,0xffffffff),signedByte=(x,label)=>integer(x,label,-128,127),copy=x=>JSON.parse(JSON.stringify(x));
function call(host,key,...args){if(typeof host?.[key]!=='function')throw Error('StageInputUpdate actual host '+key+' required');const out=host[key](...args);if(out&&typeof out.then==='function')throw Error('StageInputUpdate synchronous native host required: '+key);return out;}
function describe(inputType){return copy(specs[type(inputType)]||{component:null,entityOffset:null,initializeCalled:false,updateVA:null});}
function prepare4(stage,verifiedFrame,host){
 if(typeof verifiedFrame!=='boolean')throw Error('StageInputUpdate actual DeterministicFrame.Verified required');if(!verifiedFrame)return {ready:false,branch:'unverified-frame',component:null};const t=type(stage?.inputType);if(t>=4)return {ready:true,branch:'native-default-no-singleton',component:null};if(t!==0)throw Error('StageInputUpdate prepare4 '+specs[t].component+' body/initialization outside verified Normal scope: '+specs[t].prepareHelperVA);
 const component=call(host,'getOrAddSingleton','NormalInputComponent',null);if(!component||typeof component!=='object')throw Error('StageInputUpdate actual NormalInput singleton pointer required');const entityId=call(host,'getSingletonEntityRef','NormalInputComponent');if(typeof entityId!=='string'||!entityId)throw Error('StageInputUpdate actual allocated NormalInput singleton EntityRef required');component.entityId=entityId;return {ready:true,branch:'NormalInput.EntityRef',component};
}
function updateInput(stage,host){const t=type(stage?.inputType);if(t===0||t>=4)return {nativeNoOp:true,branch:t===0?'NormalInput-no-update':'native-default-no-update'};const spec=specs[t],component=call(host,'lookupInputSingleton',spec.component);if(component===null)return {nativeNoOp:true,branch:'missing-'+spec.component};if(!component||typeof component!=='object'||Array.isArray(component))throw Error('StageInputUpdate actual singleton component or explicit null required');throw Error('StageInputUpdate unverified '+spec.component+'.Update body required: '+spec.updateVA);}
function planOnUpdateInput(stageFlags){const f=flags(stageFlags);if(f&16384)return {runFactoryAndInput:false,reason:'stage-bit14',relativeOrder:[]};if(f&1)return {runFactoryAndInput:false,reason:'stage-bit0',relativeOrder:['ActorScene.Update']};if(f&2)return {runFactoryAndInput:false,reason:'stage-bit1',relativeOrder:['ActorScene.Update']};return {runFactoryAndInput:true,reason:null,relativeOrder:['ActorFactory.Update','Stage.updateInput','ActorScene.Update']};}
function setEnableInput(player,enabled){if(typeof enabled!=='boolean')throw Error('StageInputUpdate explicit enable boolean required');const f=flags(player?.flags);player.flags=(enabled?f&~128:f|128)>>>0;}
function createHost(host){
 if(!Native)throw Error('StageInputUpdate shared PlayerNativeInput required');
 function stage(){const s=call(host,'getStage');if(!s||typeof s!=='object')throw Error('StageInputUpdate actual Stage component required');return s;}
 function isEnableInput(player){const f=flags(player?.flags);if(f&128)return false;const s=stage(),sf=flags(s.flags);return !!(sf&8)&&!(sf&2);}
 function buttonsForPlayer(player){if(signedByte(player?.wakeUpCount,'Player.WakeUpCount signed byte')===0)return null;if(!isEnableInput(player))return null;const t=type(stage().inputType);if(t!==0){if(t>=1&&t<=3){const spec=specs[t],component=call(host,'lookupInputSingleton',spec.component);if(component===null)return null;if(!component||typeof component!=='object'||Array.isArray(component))throw Error('StageInputUpdate actual singleton component or explicit null required');}throw Error('StageInputUpdate only Normal Player input reader verified; type'+t+' caller contract requires native mode body');}
 const normal=call(host,'lookupInputSingleton','NormalInputComponent');if(normal===null)return null;if(!normal||typeof normal!=='object'||Array.isArray(normal))throw Error('StageInputUpdate actual NormalInput component or explicit null required');
 const playerIndex=signedByte(player.playerIndex,'Player.PlayerIndex signed byte'),s=stage(),mask=integer(s.operatingMenuMask,'Stage operating-menu byte',0,255);
 // Frame menu gate precedes native slot access. Do not fetch/synthesize packets here.
 if(mask&(1<<(playerIndex&31)))return null;
 return Native.getButtons(call(host,'getNativeInputState'),playerIndex,0);
 }
 function query(player,inputId,kind){integer(inputId,'input enum byte',0,255);if(!['on','press','release'].includes(kind))throw Error('StageInputUpdate native Button predicate required');const buttons=buttonsForPlayer(player);return buttons===null?false:Native.buttonTest(inputId<12?buttons[inputId]:[0,0,0],kind);}
 return {isEnableInput,buttonsForPlayer,isOnInput:(p,id)=>query(p,id,'on'),isPressInput:(p,id)=>query(p,id,'press'),isReleaseInput:(p,id)=>query(p,id,'release')};
}
return {describe,prepare4,updateInput,planOnUpdateInput,setEnableInput,createHost,supportedTypes:[],completePhysicsFidelity:false};
});
