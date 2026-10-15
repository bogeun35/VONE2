/* Stage.onUpdate post-camera tail, static native reconstruction only.
 * sortActors0x18170b960: flag5 gate@bafe; shared SortInfoList.Clear@bb5b;
 * flag6 topview@bb7f: full physical Scene dictionary(state2@bd85), valid Actor
 * +flag22@bdda; ordinary Scene PlayerInfo refs: Player !flag9 &&state!=5
 * @c360/c36d. Capture Actor.Pos.Y(native+b8)@be41/c3df. Sort normal ascending
 * lambda18170e010 /top descending18170e050; delegate slots1831cd4e0/d4d8.
 * Sort kernel181197a20: <=16@a6a;2/3 SwapIfGreater@d3c..e92;4..16 insertion
 * @c60..d14 (strict less); >16 equal-key introsort permutation requires host.
 * Send pooled Actor event54 SortingOrder0,-10,-20@c0e9/c101/c193 or
 * c699/c6b1/c743. Synchronous NotifyEvents then release only normal return.
 * Clear shared list at end@c770..78c. Exceptions/reentry do not roll it back.
 * checkGameStatus18170c840: IsRequestedAny(mask0x1c00)@c8d4 ->skip; otherwise
 * Scene player-list COUNT includes missing refs/components@c9da..cb15.
 * Each existing Player.state5@cabb adds1+calcWarpGunPlayerCount@caf3.
 * count>0 && sum>=count ->ResetDarkness@cb34, Stage bit11@cb3f, PlaySe15
 * entity0/pos0/volumeF/pitchF/disableBlankfalse@cb46..cb79. No dead-count test.
 * Warp helper18170cc20: equip slot0@ccc8 ->Actor type70@cd11 ->WarpGun
 * component target(native+20)@cd4f ->Actor type27@cd83 ->Player ->recurse+1.
 * ResetDarkness18170da70: Stage bit4 clear BEFORE calls@dae9; conditional
 * Map invisible owner reset/flag0 clear@db29..4b; Camera bit5clear@db65;
 * Stage pooled event18.IsDarkness=false ->Frame.NotifyEvent@db77..98.
 * GetStageResult18170dbb0: clear bit11 wins, retry bit10 next, return bit12.
 * ordinary dead retry already in Player.OnUpdate_Dead1816c2d89..ddf:
 * unless Stage bit8, CountGameOver +clearbit9/setbit10. Not invented here.
 * tail18170b63e sort ->b64c status ->Notice.phase!=0 poll@b66d/update@b67b;
 * suspend entrybit14 skips all this but reaches elapsed. Entry eligible is
 * captured BEFORE Actor.Update; do not recompute current Stage flags.
 * verified elapsed@b68b: capture Stage+58 before virtual DeltaTime@b6a9,
 * signed64 wrapped add/store@b6ab/ae, signed >= QGameDefine.PLAY_TIME_MAX
 * clamps@b6d5..fb. Same type slot1831c3b18 atb6b2 and QGameDefine.cctor
 * 181780799; static+18=0x151800000=5662310400=86400*65536@7807a7/b1.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-native-event-pool.js'):root.SourceNativeEventPool);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceStageGameStatus=api;})(globalThis,function(Pool){
'use strict';
const PLAY_TIME_MAX_RAW=5662310400;
function flags(v,k,max=0xffffffff){if(!Number.isInteger(v)||v<0||v>max)throw Error('StageGameStatus native flags required: '+k);return v;}
function int(v,k){if(!Number.isInteger(v)||v<-2147483648||v>2147483647)throw Error('StageGameStatus int32 required: '+k);return v;}
function byte(v,k){if(!Number.isInteger(v)||v<0||v>255)throw Error('StageGameStatus byte required: '+k);return v;}
function raw64(v,k){let n;if(Number.isSafeInteger(v))n=BigInt(v);else if(typeof v==='string'&&/^(0|-?[1-9][0-9]*)$/.test(v))n=BigInt(v);else throw Error('StageGameStatus exact int64 raw required: '+k);if(n!==BigInt.asIntN(64,n))throw Error('StageGameStatus int64 range required: '+k);return n;}
function scalar(n){return n>=BigInt(Number.MIN_SAFE_INTEGER)&&n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):n.toString();}
function object(v,k){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('StageGameStatus native '+k+' required');return v;}
function array(v,k){if(!Array.isArray(v))throw Error('StageGameStatus native '+k+' array required');return v;}
function ref(v,k){if(v===undefined||v===null)throw Error('StageGameStatus explicit EntityRef (0 for none) required: '+k);return v;}
function call(h,k,...args){if(typeof h?.[k]!=='function')throw Error('StageGameStatus required native host: '+k);const v=h[k](...args);if(v&&typeof v.then==='function')throw Error('StageGameStatus synchronous native host required: '+k);return v;}
function createGlobals(){return{sortInfoList:{items:[],version:0}};}
function list(w){const l=object(w?.sortInfoList,'shared static SortInfoList');array(l.items,'SortInfoList.items');int(l.version,'SortInfoList.version');return l;}
function clear(l){l.version=(l.version+1)|0;l.items.length=0;}
function compare(a,b,descending=false){const x=raw64(a.yRaw,'SortInfo.PosY'),y=raw64(b.yRaw,'SortInfo.PosY');return (x<y?-1:x>y?1:0)*(descending?-1:1);}
function sortInfos(l,descending,h){const a=l.items,n=a.length,cmp=(x,y)=>compare(x,y,descending),swap=(i,j)=>{if(cmp(a[i],a[j])>0)[a[i],a[j]]=[a[j],a[i]];};if(n===2)swap(0,1);else if(n===3){swap(0,1);swap(0,2);swap(1,2);}else if(n<=16){for(let i=1;i<n;i++){const v=a[i];let j=i-1;while(j>=0&&cmp(v,a[j])<0){a[j+1]=a[j];j--;}a[j+1]=v;}}else{const seen=new Set();let tie=false;for(const info of a){const key=raw64(info.yRaw,'PosY').toString();if(seen.has(key))tie=true;seen.add(key);}if(tie){const before=a.slice(),out=call(h,'sortEqualYInfos',before.slice(),descending);array(out,'native introsort permutation');if(out.length!==before.length||new Set(out).size!==before.length||out.some(v=>!before.includes(v)))throw Error('StageGameStatus native introsort permutation must preserve SortInfo identities');for(let i=1;i<out.length;i++)if(cmp(out[i-1],out[i])>0)throw Error('StageGameStatus native introsort result is not ordered');a.splice(0,n,...out);}else a.sort(cmp);}l.version=(l.version+1)|0;}
function scenePlayers(h,f,scene){return array(call(h,'getScenePlayerRefs',f,scene),'complete Scene player EntityRef list');}
function captureInfo(l,actor){object(actor,'Actor pointer');raw64(actor.positionRaw?.yRaw,'Actor.Pos.Y');l.items.push({actor,yRaw:actor.positionRaw.yRaw});}
function sortActors(w,s,f,h={}){if(!(flags(s.flags,'Stage.flags')&32))return{sorted:false};const l=list(w);clear(l);const descending=!!(s.flags&64),scene=object(call(h,'getActorScene',f),'ActorScene');if(descending){const storage=object(call(h,'getActorDictionary',f,scene),'complete physical Actor dictionary');array(storage.entries,'dictionary slots');if(int(storage.usedCount,'usedCount')<0||storage.usedCount>storage.entries.length)throw Error('StageGameStatus complete dictionary used slots required');for(let i=0;i<int(storage.usedCount,'usedCount');i++){if(storage.usedCount<0||storage.usedCount>storage.entries.length)throw Error('StageGameStatus complete dictionary used slots required');const e=object(storage.entries[i],'dictionary entry');if(int(e.state,'entry.state')!==2)continue;const a=call(h,'getActor',f,ref(e.entityRef,'dictionary entity'));if(a===null)continue;object(a,'Actor');if(flags(a.flags,'Actor.flags')&4194304)captureInfo(l,a);}}else{const refs=scenePlayers(h,f,scene),n=refs.length;for(let i=0;i<n;i++){if(i>=refs.length)throw Error('StageGameStatus native Player list index invalidated');const r=ref(refs[i],'Scene player');const p=r===0?null:call(h,'getPlayer',f,r);object(p,'Player pointer (native normal sort null dereference)');if((flags(p.flags,'Player.flags')&512)||byte(p.state,'Player.state')===5)continue;captureInfo(l,call(h,'getActor',f,r));}}
 sortInfos(l,descending,h);let order=0,notified=0;for(let i=0;i<l.items.length;i++){const actor=object(l.items[i]?.actor,'SortInfo Actor');if(!Pool)throw Error('StageGameStatus NativeEventPool dependency required');const e=Pool.getEventParam(w.eventPool,actor,54);if(e===null)throw Error('StageGameStatus native sorting QEventParam exhausted (null dereference)');e.SortingOrder=order;Pool.notifyEvent(actor,e,(a,p)=>int(call(h,'invokeOnRecvEvent',f,a,p),'OnRecvEvent return'));order=(order-10)|0;notified++;}clear(l);return{sorted:true,descending,notified};}
function isRequestedAny(s){return !!(flags(s.flags,'Stage.flags')&7168);}
function getStageResult(s){const n=flags(s.flags,'Stage.flags');return n&2048?1:n&1024?2:n&4096?3:0;}
function calcWarpGunPlayerCount(s,f,scene,p,h={},seen=new Set()){object(p,'Player');if(seen.has(p))throw Error('StageGameStatus cyclic native WarpGun recursion refused');seen.add(p);const equip=ref(call(h,'getEquip',f,p,0),'Player equip0');if(equip===0){seen.delete(p);return 0;}const a=call(h,'getActor',f,equip);if(a===null||byteActor(a)!==70){seen.delete(p);return 0;}const gun=call(h,'getWarpGun',f,equip);if(gun===null){seen.delete(p);return 0;}const target=ref(object(gun,'WarpGun').targetRef,'WarpGun target');if(target===0){seen.delete(p);return 0;}const targetActor=call(h,'getActor',f,target);if(targetActor===null||byteActor(targetActor)!==27){seen.delete(p);return 0;}const next=call(h,'getPlayer',f,target);if(next===null){seen.delete(p);return 0;}const count=(calcWarpGunPlayerCount(s,f,scene,next,h,seen)+1)|0;seen.delete(p);return count;}
function byteActor(a){object(a,'Actor');if(!Number.isInteger(a.actorType)||a.actorType<0||a.actorType>65535)throw Error('StageGameStatus native ushort ActorType required');return a.actorType;}
function resetDarkness(w,s,f,h={}){if(!(flags(s.flags,'Stage.flags')&16))return false;s.flags=(s.flags&~16)>>>0;const map=object(call(h,'getMap',f),'Map'),owner=ref(s.entityRef,'Stage.entityRef');ref(map.invisibleEntity,'Map.invisibleEntity');flags(map.flags,'Map.flags',65535);if(owner===0||map.invisibleEntity===owner){map.invisibleEntity=0;map.flags&=~1;}const camera=object(call(h,'getCamera',f),'Camera');camera.flags=flags(camera.flags,'Camera.flags',65535)&~32;if(!Pool)throw Error('StageGameStatus NativeEventPool dependency required');const e=Pool.getEventParam(w.eventPool,{entityId:owner},18);if(e===null)throw Error('StageGameStatus native darkness QEventParam exhausted (null dereference)');e.IsDarkness=false;call(h,'notifyEvent',f,e);return true;}
function checkGameStatus(w,s,f,h={}){if(isRequestedAny(s))return{checked:false};const scene=object(call(h,'getActorScene',f),'ActorScene'),refs=scenePlayers(h,f,scene),n=refs.length;if(n===0)return{checked:true,players:0,clearCount:0,requestedClear:false};let count=0;for(let i=0;i<n;i++){if(i>=refs.length)throw Error('StageGameStatus native Player list index invalidated');const r=ref(refs[i],'Scene player');if(r===0)continue;const p=call(h,'getPlayer',f,r);if(p===null)continue;object(p,'Player');if(byte(p.state,'Player.state')===5)count=(count+((calcWarpGunPlayerCount(s,f,scene,p,h)+1)|0))|0;}if(count<n)return{checked:true,players:n,clearCount:count,requestedClear:false};resetDarkness(w,s,f,h);s.flags=(flags(s.flags,'Stage.flags')|2048)>>>0;call(h,'playSe',f,{EntityRef:0,SeId:15,Position:{xRaw:0,yRaw:0},Volume:65536,Pitch:65536,IsDisableCheckBlankTime:false});return{checked:true,players:n,clearCount:count,requestedClear:true};}
function advancePlayTime(s,f,h={}){if(typeof f?.isVerified!=='boolean')throw Error('StageGameStatus Frame.IsVerified required');if(!f.isVerified)return false;const old=raw64(s.playTimeRaw,'Stage.playTimeRaw'),dt=raw64(call(h,'getDeltaTime',f),'Frame.DeltaTime');let value=BigInt.asIntN(64,old+dt);s.playTimeRaw=scalar(value);if(value>=BigInt(PLAY_TIME_MAX_RAW))s.playTimeRaw=PLAY_TIME_MAX_RAW;return true;}
function finishFrame(w,s,f,h={},gates={}){for(const k of['suspendedAtEntry','phaseEligibleAtEntry'])if(typeof gates[k]!=='boolean')throw Error('StageGameStatus captured Stage entry gate required: '+k);const result={};if(!gates.suspendedAtEntry){if(gates.phaseEligibleAtEntry){result.sort=sortActors(w,s,f,h);result.status=checkGameStatus(w,s,f,h);}const notice=object(call(h,'getStageNotice',f),'StageNotice');if(byte(notice.phase,'StageNotice.phase')!==0){call(h,'pollingNoticeCommands',notice,f);call(h,'updateNoticePhase',notice,f);}}result.timeAdvanced=advancePlayTime(s,f,h);return result;}
return{createGlobals,sortActors,sortInfos,compare,isRequestedAny,getStageResult,calcWarpGunPlayerCount,resetDarkness,checkGameStatus,advancePlayTime,finishFrame,nativeConstants:{playTimeMaxRaw:PLAY_TIME_MAX_RAW,playTimeMaxSeconds:86400},supportedTypes:[],completePhysicsFidelity:false};
});
