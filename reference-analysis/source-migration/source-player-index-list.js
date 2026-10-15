/* Native Stage.prepare3 player-index list helper, static reads only.
 * InitPlayerIndexList1816a6310: ordered GamePlayerInfo.PlayerRef raw+8 minus1
 * @1816a64b5..bf into static int[8] (.cctor1816a8dda); append LOW BYTE into
 * scene signed-byte QList @1816a66dd. Does NOT clear existing index list.
 * shuffle @1816a64e2..655d: ascending i=1..n-1, Next(0,i+1) @1816a6512,
 * swap i/result. Frame globals+0xb8 RNGSession pointer @1816a6503.
 * RNGSession.Next(int,int)181662090 is independently mapped via
 * PhotonDeterministic codegen182d54da0/table1832acad0/token06000396.
 * PCG multiplier5851f42d4c957f2d, raw inc|1, old>>45 XOR old>>27/rotate>>59,
 * uint32 rejection threshold(-span)%span. Exact pcg32 reuses Landmine core.
 * ctor1816621c0/token06000398: signextended int32 seed, two SplitMix64
 * steps(+9e3779b97f4a7c15,bf58476d1ce4e5b9,94d049bb133111eb).
 * Seed helper is ctor-boundary only, not an inferred stage-entry state.
 * Game.createGamePlayerInfoList18184f2d0: first8 join entries BEFORE filter;
 * Normal Func1 filters join bits2&3, Simple Func2 does not. Copies flags bit0
 * only; if resulting count<2 append ONE dummy from FIRST join entry @f53b..
 * f59b: rawRef>=8?1:rawRef+1, color>=7?0:color+1,flags4,other fieldszero.
 * Normal+IsOnline calls organizeJoinPlayerList BEFORE this method @184c3dd;
 * caller supplies actual post-organize roster. No networking state invented.
 * createPlayer1816a3ffc..4083: existing PlayerInfoList count is Index;
 * limit bit2 ->skip if count>=indexList.count; FindGamePlayerInfo compares
 * unsigned list byte+1 with raw PlayerRef @181746598..59e; first match wins.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-landmine-devices.js'):root.SourceLandmineDevices);if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerIndexList=api;})(globalThis,function(Random){
'use strict';
const ALGORITHM='Quantum.RNGSession.PCG32-XSH-RR',MASK=(1n<<64n)-1n,G=0x9e3779b97f4a7c15n,copy=x=>JSON.parse(JSON.stringify(x));
function integer(x,label,min,max){if(!Number.isInteger(x)||x<min||x>max)throw Error('PlayerIndexList explicit native '+label+' required');return x;}
const int32=(x,label)=>integer(x,label,-2147483648,2147483647),byte=(x,label)=>integer(x,label,0,255),short=(x,label)=>integer(x,label,0,65535),signedByte=x=>(x<<24)>>24;
function u64(s,label){if(typeof s!=='string'||!(/^(?:0x[0-9a-fA-F]+|[0-9]+)$/).test(s))throw Error('PlayerIndexList exact uint64 string required: '+label);const x=BigInt(s);if(x<0n||x>MASK)throw Error('PlayerIndexList uint64 out of range: '+label);return x;}
function rng(snapshot){if(snapshot?.algorithm!==ALGORITHM)throw Error('PlayerIndexList actual Quantum RNGSession snapshot required; generic/default PCG or seed-only input is not a stage snapshot');return {state:u64(snapshot.state,'state'),inc:u64(snapshot.increment,'increment')};}
const snapshot=r=>({algorithm:ALGORITHM,state:r.state.toString(),increment:r.inc.toString()});
function mix64(x){let z=x&MASK;z=((z^(z>>30n))*0xbf58476d1ce4e5b9n)&MASK;z=((z^(z>>27n))*0x94d049bb133111ebn)&MASK;return (z^(z>>31n))&MASK;}
function rngSnapshotFromNativeSeed(seed){int32(seed,'RNGSession ctor seed');const x=(BigInt(seed)+G)&MASK;return {...snapshot({state:mix64(x),inc:mix64((x+G)&MASK)}),origin:{methodVA:'0x1816621c0',seed,boundary:'constructor only; account for all earlier draws before stage entry'}};}
function nextRange(input,min,max){int32(min,'range min');int32(max,'range max');if(min===max)return {value:min,rngSnapshot:input==null?null:copy(input),drawCount:0,rawDraws:[],threshold:0};const r=rng(input);if(typeof Random?.pcg32!=='function'||Random.nativeConstants?.rng?.intVariant!=='0x181662090')throw Error('PlayerIndexList verified native pcg32 core required');const low=Math.min(min,max),span=Math.max(min,max)-low,threshold=(0x100000000%span)>>>0,rawDraws=[];let draw;do{draw=Random.pcg32(r);rawDraws.push(draw);}while(draw<threshold);return {value:low+draw%span,rngSnapshot:snapshot(r),drawCount:rawDraws.length,rawDraws,threshold};}
function gameInfo(x){if(!x||typeof x!=='object')throw Error('PlayerIndexList actual GamePlayerInfo required');return {playerRefRaw:int32(x.playerRefRaw,'PlayerRef raw'),colorIndex:byte(x.colorIndex,'ColorIndex byte'),battleWinCount:byte(x.battleWinCount,'BattleWinCount byte'),playerHatNo:byte(x.playerHatNo,'PlayerHatNo byte'),flags:short(x.flags,'GamePlayerInfo flags')};}
function joinInfo(x){if(!x||typeof x!=='object')throw Error('PlayerIndexList actual ordered JoinPlayerInfo required');return {playerRefRaw:int32(x.playerRefRaw,'Join PlayerRef raw'),colorIndex:byte(x.colorIndex,'Join ColorIndex byte'),battleWinCount:byte(x.battleWinCount,'Join BattleWinCount byte'),playerHatNo:byte(x.playerHatNo,'Join PlayerHatNo byte'),flags:short(x.flags,'JoinPlayerInfo flags')};}
function createGamePlayerInfoList(joinPlayerInfos,options={}){
 if(!Array.isArray(joinPlayerInfos)||typeof options.online!=='boolean'||![1,2].includes(options.gameFunc))throw Error('PlayerIndexList actual ordered join roster, IsOnline and native gameFunc1/2 required');
 if(options.online&&options.gameFunc===1&&options.postOnlineOrganizeVerified!==true)throw Error('PlayerIndexList Normal online roster must be actual post-organizeJoinPlayerList snapshot');
 const selected=[],filterReady=options.gameFunc===1,source=joinPlayerInfos.slice(0,8).map(joinInfo),trace=[];
 source.forEach((j,ordinal)=>{const accepted=!filterReady||((j.flags&4)!==0&&(j.flags&8)!==0);trace.push({joinOrdinal:ordinal,accepted});if(accepted)selected.push({playerRefRaw:j.playerRefRaw,colorIndex:j.colorIndex,battleWinCount:j.battleWinCount,playerHatNo:j.playerHatNo,flags:j.flags&1});});
 let dummyAdded=false;if(selected.length<2){const first=source[0];if(!first)throw Error('PlayerIndexList native dummy branch requires first join entry; empty join roster is invalid');selected.push({playerRefRaw:first.playerRefRaw>=8?1:(first.playerRefRaw+1)|0,colorIndex:first.colorIndex>=7?0:first.colorIndex+1,battleWinCount:0,playerHatNo:0,flags:4});dummyAdded=true;}
 return {gamePlayerInfos:selected,filterReady,dummyAdded,sourceConsidered:source.length,trace};
}
function initialize(gamePlayerInfos,options={}){
 if(!Array.isArray(gamePlayerInfos)||gamePlayerInfos.length>8)throw Error('PlayerIndexList native static scratch capacity8 / explicit GamePlayerInfo roster required');
 if(![0,1].includes(options.shufflePlayer)||![0,1].includes(options.limitPlayer)||!Array.isArray(options.existingIndexList))throw Error('PlayerIndexList actual shufflePlayer0/1, limitPlayer0/1 and existing index-list snapshot required');
 const flags=short(options.sceneFlags,'scene flags'),indexList=options.existingIndexList.map(x=>integer(x,'signed-byte scene index',-128,127)),infos=gamePlayerInfos.map(gameInfo),scratchPrefix=infos.map(x=>(x.playerRefRaw-1)|0),calls=[];let post=options.rngSnapshot==null?null:copy(options.rngSnapshot),drawCount=0;
 if(options.shufflePlayer)for(let i=1;i<scratchPrefix.length;i++){const out=nextRange(post,0,i+1);post=out.rngSnapshot;drawCount+=out.drawCount;const before=[scratchPrefix[i],scratchPrefix[out.value]];[scratchPrefix[i],scratchPrefix[out.value]]=[scratchPrefix[out.value],scratchPrefix[i]];calls.push({i,min:0,maxExclusive:i+1,j:out.value,before,rawDraws:out.rawDraws,drawCount:out.drawCount,threshold:out.threshold});}
 const appendedSignedIndices=scratchPrefix.map(signedByte);indexList.push(...appendedSignedIndices);
 return {indexList,appendedSignedIndices,scratchPrefix,sourceRosterCount:infos.length,sceneFlags:(options.limitPlayer?flags|4:flags&~4)&65535,rngSnapshot:post,rngAccessed:calls.length>0,rangeCalls:calls,drawCount,gamePlayerInfos:infos};
}
function selectPlayer(state,createdPlayerCount,gamePlayerInfos){
 integer(createdPlayerCount,'current PlayerInfoList count',0,2147483647);if(!state||!Array.isArray(state.indexList)||!Array.isArray(gamePlayerInfos))throw Error('PlayerIndexList actual scene index list and current game roster required');const flags=short(state.sceneFlags,'scene flags');if((flags&4)&&createdPlayerCount>=state.indexList.length)return {status:'limit-player-skip',createdPlayerCount};
 if(createdPlayerCount>=state.indexList.length)throw Error('PlayerIndexList native QList index out of range (unlimited createPlayer does not wrap)');
 const value=integer(state.indexList[createdPlayerCount],'signed-byte scene index',-128,127),nativePlayerIndexArgument=value&255,rawRef=(nativePlayerIndexArgument+1)|0,infos=gamePlayerInfos.map(gameInfo),ordinal=infos.findIndex(x=>x.playerRefRaw===rawRef);if(ordinal<0)return {status:'missing-game-player-info',createdPlayerCount,nativePlayerIndexArgument,lookupPlayerRefRaw:rawRef};const info=infos[ordinal];
 return {status:'selected',gamePlayerInfoOrdinal:ordinal,index:signedByte(createdPlayerCount),playerIndex:signedByte(nativePlayerIndexArgument),colorIndex:signedByte(info.colorIndex),nativeIndexArgument:createdPlayerCount,nativePlayerIndexArgument,nativeColorIndexArgument:info.colorIndex,playerRefRaw:info.playerRefRaw};
}
function toBootstrapGamePlayerInfos(infos){if(!Array.isArray(infos))throw Error('PlayerIndexList actual game roster required');return infos.map(gameInfo).map(x=>({playerIndex:signedByte((x.playerRefRaw-1)|0),colorIndex:signedByte(x.colorIndex)}));}
return {rngSnapshotFromNativeSeed,nextRange,createGamePlayerInfoList,initialize,selectPlayer,toBootstrapGamePlayerInfos,create:copy,supportedTypes:[],completePhysicsFidelity:false,nativeConstants:{algorithm:ALGORITHM,rangeVA:'0x181662090',seedConstructorVA:'0x1816621c0',scratchCapacity:8}};
});
