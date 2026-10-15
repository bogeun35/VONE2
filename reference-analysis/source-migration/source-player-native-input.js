/* Player NormalInput button producer, static GameAssembly recovery only.
 * quantum.core Button fields metadata: _frameUp/_frameDown/_frameCurrent,
 * raw0/4/8 signed int32. IsDown0x181933e30: down>up; Press0x181933e40:
 * down==current && down>0; Release0x181933e60: up==current && up>down.
 * op_Implicit(bool)0x181933ed0: false[1,0,1], true[0,1,1].
 * Button.Update0x181933e80: stamp current=N; if off && down>up set up=N;
 * if on && (up>down || both0) set down=N; else keep timestamps.
 * Frame.SetPlayerInput0x181739350 inlines same rule for12 Buttons and
 * uses DeterministicFrame.Number at class offset0x1c, NOT render/poll tick.
 * Input raw layout160 bytes,12x12-byte Buttons then16-byte LeftStick.
 * GetGamePlayerInputButton jump table0x18174a8c8 maps enum0..11 to
 * Decision,Cancel,Menu1,Menu2,Up,Down,Left,Right,Jump,Shot,Action1,Action2.
 * Globals eight160-byte inputs at+0x1c0 (0x1817393ed..40d). New Frame
 * allocates/clears0x7e8 bytes at0x18173a68f..6c9; explicit fresh-only opt-in.
 * GameInputManager.pollInput0x18052c140 matches Callback.Player against
 * Session._localPlayerIndices, using found local-list position (not slot).
 * No match leaves callback unchanged. DisableQuantumInput+0x59 produces
 * zero Input; otherwise resolved ActionInputInfo.IsPressed produces bool
 * Buttons. Callback IsInputSet=true and raw input flags1 at0x18052c805..810.
 * QuantumGame.OnSimulate0x181765970..a35 applies every supplied deterministic
 * player's Input through SetPlayerInput before systems; no offline/online
 * distinction in timestamp conversion. Missing remote packets/replay/rollback
 * policy stays with native-session host; never synthesize a release packet.
 * Frame.GetGamePlayerInput0x18174a640 returns null for Stage operating-menu
 * bit indexed by player; producer still updates storage. No Player gates here.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerNativeInput=api;})(globalThis,function(){
'use strict';
const names=['Decision','Cancel','Menu1','Menu2','Up','Down','Left','Right','Jump','Shot','Action1','Action2'];
const offsets=[36,24,84,96,132,48,72,108,60,120,0,12];
function int32(v,label){if(!Number.isInteger(v)||v< -2147483648||v>2147483647)throw Error('PlayerNativeInput explicit signed int32 required: '+label);return v;}
function words(v){if(!Array.isArray(v)||v.length!==3)throw Error('PlayerNativeInput three native Button words required');return Array.from(v,(x,i)=>int32(x,'Button word'+i));}
function buttonTest(v,kind){const [a,b,t]=words(v);if(kind==='on')return b>a;if(kind==='press')return b===t&&b>0;if(kind==='release')return a===t&&a>b;throw Error('PlayerNativeInput unknown predicate');}
function fromBoolean(v){if(typeof v!=='boolean')throw Error('PlayerNativeInput resolved native IsPressed boolean required');return v?[0,1,1]:[1,0,1];}
function updateButton(v,frameNumber,isDown){let [a,b]=words(v);int32(frameNumber,'DeterministicFrame.Number');if(typeof isDown!=='boolean')throw Error('PlayerNativeInput resolved native IsDown required');if(!isDown){if(b>a)a=frameNumber;}else if(a>b||(a===0&&b===0))b=frameNumber;return [a,b,frameNumber];}
function buttonSet(v){if(!Array.isArray(v)||v.length!==12)throw Error('PlayerNativeInput all12 enum-ordered native Buttons required');return Array.from(v,words);}
function slot(index){if(!Number.isInteger(index)||index<0||index>=8)throw Error('PlayerNativeInput native player slot0..7 required');return index;}
function zeroPacket(){return {buttons:Array.from({length:12},()=>[0,0,0])};} // explicit cleared Input; not implicit false.
function packetFromPressed(pressed){if(!Array.isArray(pressed)||pressed.length!==12)throw Error('PlayerNativeInput all12 resolved IsPressed values required');return {buttons:Array.from(pressed,fromBoolean)};}
function create(options={}){if(options.freshZeroedGlobals===true)return {schemaVersion:1,players:Array.from({length:8},()=>zeroPacket())};if(!Array.isArray(options.players)||options.players.length!==8)throw Error('PlayerNativeInput fresh-zero opt-in or all8 existing global snapshots required');return {schemaVersion:1,players:Array.from(options.players,p=>({buttons:buttonSet(p?.buttons)}))};}
function applyPlayerInput(state,playerIndex,frameNumber,packet){slot(playerIndex);int32(frameNumber,'DeterministicFrame.Number');if(!Array.isArray(state.players)||state.players.length!==8)throw Error('PlayerNativeInput eight actual global slots required');const previous=buttonSet(state.players[playerIndex]?.buttons),incoming=buttonSet(packet?.buttons);const buttons=previous.map((v,i)=>updateButton(v,frameNumber,buttonTest(incoming[i],'on')));state.players[playerIndex]={buttons};return {buttons:buttons.map(v=>[...v])};}
function applySimulationInputs(state,frameNumber,packets){int32(frameNumber,'DeterministicFrame.Number');if(!Array.isArray(packets)||packets.length<1||packets.length>8)throw Error('PlayerNativeInput complete native session player Input array1..8 required');for(const p of packets)buttonSet(p?.buttons);return packets.map((p,i)=>applyPlayerInput(state,i,frameNumber,p));}
function pollLocal({requestedPlayer,localPlayerIndices,pressedByLocalIndex,disableQuantumInput}){slot(requestedPlayer);if(!Array.isArray(localPlayerIndices)||localPlayerIndices.length>8)throw Error('PlayerNativeInput actual Session localPlayerIndices required');for(const index of localPlayerIndices)slot(index);const localIndex=localPlayerIndices.indexOf(requestedPlayer);if(localIndex<0)return {isInputSet:false,localIndex:null,input:null,flags:null};if(typeof disableQuantumInput!=='boolean')throw Error('PlayerNativeInput explicit DisableQuantumInput required');const input=disableQuantumInput?zeroPacket():packetFromPressed(pressedByLocalIndex?.[localIndex]);return {isInputSet:true,localIndex,input,flags:1};}
function getButtons(state,playerIndex,operatingMenuMask){slot(playerIndex);if(!Number.isInteger(operatingMenuMask)||operatingMenuMask<0||operatingMenuMask>255)throw Error('PlayerNativeInput actual Stage operating-menu byte required');if(operatingMenuMask&(1<<playerIndex))return null;return buttonSet(state.players[playerIndex]?.buttons);}
return {names,offsets,create,words,buttonTest,fromBoolean,updateButton,zeroPacket,packetFromPressed,applyPlayerInput,applySimulationInputs,pollLocal,getButtons,supportedTypes:[],completePhysicsFidelity:false};
});
