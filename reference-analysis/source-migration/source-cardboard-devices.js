/* Cardboard companion gate for shipped 9-4; no native executable run.
 * Player.parseParameter slot8 sets flags bit18:0x1816bdca1..cc4.
 * Cardboard.Creator(player overload)0x1817ebcd0 obtains Player at0x1817ebd8a;
 * nullPlayer0x1817ebd95 or flags0x40000 at0x1817ebdb0 returns0x1817ebece
 * BEFORE factoryparam154 lookup0x1817ebdcb,entity0x1817ebe24,InitCollision
 * 0x1817ebe63,InitPost0x1817ebe74 and AddActor0x1817ebec4.
 * IsDisableEquipCardboard0x1816bcf60 independently confirms mask262144.
 * IsForTopView is DIFFERENT bit17:0x1816bcf30. Equip is bit19:
 * 0x1816bcf90; covered flags are a byte atPlayer+1, IsEquipOrCover
 * 0x1816cb8b0 tests nonzero byte thenbit19. TopView input gate0x1816ca190..1a5
 * uses equipbit19/coveredbyte. A skipped creator changes neither.
 * TopView factory0x1816a4b05 calls generalPlayer (initialization/parse/state),
 * then0x1816a4b30 calls Cardboard;9-4 all8 authoredslot8=1.
 * Non-disabled Cardboard creation/phase/collision behavior is outside this
 * scoped extraction and is refused; supportedTypes is intentionally empty.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCardboardDevices=api;})(globalThis,function(){
'use strict';
const DISABLE=262144,EQUIP=524288;
const clone=x=>JSON.parse(JSON.stringify(x));
function uint32(v){if(!Number.isInteger(v)||v<0||v>0xffffffff)throw Error('Cardboard requires native Player flags uint32');return v;}
function creationDecision(player){if(player===null)return{create:false,reason:'player-not-found'};if(!player||typeof player!=='object')throw Error('Cardboard requires resolved native Player or explicit null');const flags=uint32(player.flags);return(flags&DISABLE)?{create:false,reason:'disable-equip-cardboard'}:{create:true,reason:'creation-path-needs-native-cardboard-host'};}
function inspectPlayerState(player){const flags=uint32(player.flags),covered=player.cardboardCoveredFlags;if(!Number.isInteger(covered)||covered<0||covered>255)throw Error('Cardboard requires native covered flags byte');return{disableEquip:!!(flags&DISABLE),isForTopView:!!(flags&131072),equipped:!!(flags&EQUIP),coveredFlags:covered,equipOrCover:covered!==0||!!(flags&EQUIP),topViewInputBlocked:covered!==0||!!(flags&EQUIP)};}
function createAttached(player){const decision=creationDecision(player);if(decision.create)throw Error('Cardboard active attachment outside verified 9-4 suppressed path: entity/collision/equip/remove lifecycle not implemented');return{decision,cardboard:null,actions:[],player:clone(player)};}
function correctTopViewRequirement(compiled,players){if(!compiled||!Array.isArray(compiled.players)||!Array.isArray(players)||compiled.players.length!==players.length)throw Error('Cardboard requires matching compiled TopView bindings and native Player snapshots');const rows=compiled.players.map((row,i)=>{if(row.id!==players[i].id)throw Error('Cardboard native snapshot binding order mismatch');const r=createAttached(players[i]);return{...row,requiresCardboard:false,cardboardCreationReason:r.decision.reason};});return{...clone(compiled),players:rows};}
function allowed(v,n){return v===0||(v<0?n<=-v:v<10?n>=v:n>=Math.trunc(v/10)&&n<=v%10);}
function compile(actors,count,options={}){if(!Number.isInteger(count)||count<2||count>8)throw Error('Cardboard population2..8 required');const inputs=actors.map(a=>a.properties||a).filter(a=>allowed(a.playerCount,count));if(inputs.some(a=>a.typeName==='Cardboard'))throw Error('Authored Cardboard actor path outside scoped 9-4 extraction');const top=inputs.filter(a=>a.typeName==='TopViewPlayer');if(!top.length)return{schemaVersion:1,count,attempts:[],cardboards:[]};for(const a of top){const p=a.datas?.[8];if(!p||p.t!==1||!Number.isFinite(p.f)||Math.floor(Math.trunc(Math.fround(Math.fround(p.f)*65536))/65536)===0)throw Error('Cardboard suppression requires native TopView slot8!=0');}const players=options.nativeCreatedPlayers;if(!Array.isArray(players)||players.length!==count||players.length>top.length)throw Error('Cardboard requires exact nativeCreatedPlayers after actual factory population limiting');const attempts=players.map(p=>{if(typeof p.id!=='string')throw Error('Cardboard native actor binding id required');const r=createAttached(p);return{playerId:p.id,playerIndex:p.playerIndex,decision:r.decision,actions:r.actions};});return{schemaVersion:1,count,attempts,cardboards:[]};}
const create=clone;
function ensureSuppressed(state){if(!state||!Array.isArray(state.cardboards)||state.cardboards.length)throw Error('Cardboard runtime active lifecycle outside verified scoped path');for(const a of state.attempts||[])if(a.decision.create)throw Error('Cardboard unsuppressed attempt cannot execute');}
function solids(s){ensureSuppressed(s);return [];}
function beforeStep(s){ensureSuppressed(s);return{events:[],actions:[],solids:[]};}
function afterStep(s){ensureSuppressed(s);return{events:[],actions:[]};}
function displays(s){ensureSuppressed(s);return [];}
return{compile,create,solids,beforeStep,afterStep,displays,supportedTypes:[],creationDecision,inspectPlayerState,createAttached,correctTopViewRequirement,nativeConstants:{disableEquipFlag:DISABLE,equipFlag:EQUIP},completePhysicsFidelity:false};
});
