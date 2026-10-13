/* Partial source-derived Apple device recovery. NO playable-stage claim.
   ActorFactory.createTargetPlayer 0x1816a47f0 -> PlayerTarget.Creator 0x1816d6510;
   createBasketPlayer 0x1816a4910 -> PlayerBasket.Creator 0x1818904a0.
   Controller defaults: 0x1816abaf3 active max 8; 0x1816abaf6 goal 20;
   0x1816abaff/0x1816abb07 apple/bomb raw 0x30000 (3 seconds);
   0x1816abb0f speed 200; 0x1816abb17 height 100; 0x1816abb1f width 200.
   Controller ParseParameter 0x1816abc00: slots 1..7 override nonzero defaults;
   slot 8 is seven INT32 entries, not seven FP64 entries. Deserialiser
   0x180970830..0x180970868 subtracts 0x21 per UTF-16 unit; Find 0x181786950
   walks backwards from count-2 until nonzero; positive result overrides goal.
   Controller initial timer raw 0x10000: Creator 0x1816aba5e / InitPost 0x1816abe90.
   Controller selection and delay 0x1816ac225..0x1816ac327, delay raws
   0x8000..0x18000. PCG multiplier 0x1816620bc; FP shift 16 at 0x181662020.
   Catch goal events: event 1 to type 17 and event 47 to type 134
   at 0x1816ac793..0x1816ac7c7. Event 19 sets stopped bit at 0x1816ac407.
   Apple slots 0..4 are apple seconds, bomb seconds, sway width, height, speed;
   each nonzero slot sets override bits 0..4 (0x1816a9857..0x1816a98de).
   Slot 5 sets change-bomb bit5 (0x1816a98e3..0x1816a98f6).
   Apple rect width/height 24, offsets -12/-12: 0x1816ab2c6..0x1816ab353.
   Basket rect width 26 height 44 offsets -22/-30: 0x181890ed8..0x181890f11.
   Target shot cooldown: 0x1816d70c1 subtract dt; 0x1816d70f5 >0 blocks;
   0x1816d7150 input action9; 0x1816d7172 reload authored cooldown.
   FP unit 65536; static sine period raw 0x6487e at 0x18164664b is lookup-
   based. Its table and native jump/contact solver have NOT been reproduced.
   Therefore compile refuses every nonempty device configuration. Helpers below
   are recovered kernels for further work, not substitute game physics. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceAppleDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const supportedTypes=['TargetPlayer','BasketPlayer','AppleController','Apple'];
const FP_ONE=65536,MASK64=(1n<<64n)-1n,PCG_MULT=6364136223846793005n;
const EVENT={START:1,DEAD:19,SNIPE:22,RESET:47};
const DEFAULTS={activeAppleMax:8,appleMax:20,appleSecRaw:196608,bombSecRaw:196608,swaySpeedRaw:13107200,swayHeightRaw:6553600,swayWidthRaw:13107200};
const unresolved={
 TargetPlayer:'PlayerTarget native camera clamp, shot collision, return/wake state and scene player-index permutation are not integrated (0x1816d6d80, 0x1816d7700, 0x1816d7350)',
 BasketPlayer:'PlayerBasket native ear-length/scale/flip transform and sensor contact ordering are not integrated (0x1818908a0)',
 Apple:'Apple fixed-point sine lookup, RequestJump physics and explosion contact ordering are not recovered (0x1816465d0, 0x1816aa236, 0x1816aa530)',
 AppleController:'AppleController requires the unimplemented Apple activation/lifecycle (0x1816ac301)'
};
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function raw(v){if(!Number.isFinite(v))throw Error('Invalid FP parameter');const r=Math.trunc(Math.fround(v)*FP_ONE);if(!Number.isSafeInteger(r))throw Error('FP parameter exceeds exact JS range');return r;}
const slot=(a,i)=>{const d=(a.datas||a.parameters||[])[i];return d&&d.t===1?raw(d.f):0;};
function countTable(d){
 if(!d||d.t!==2||!d.s)return new Array(7).fill(0);
 let s=d.s;if(s.length===30&&s[0]==='"'&&s[29]==='"')s=s.slice(1,-1);
 if(s.length!==28)throw Error('AppleController goal table must contain seven int32 values (28 UTF-16 units)');
 const b=Array.from({length:28},(_,i)=>(s.charCodeAt(i)-33)&255),out=[];
 for(let i=0;i<7;i++)out.push((b[i*4]|b[i*4+1]<<8|b[i*4+2]<<16|b[i*4+3]<<24));
 return out;
}
function findCount(t,count){for(let i=Math.min(count,8)-2;i>=0;i--)if(t[i])return t[i];return 0;}
function decodeActor(a,count){
 const p=a.properties||a,pos=a.position||{x:a.x??a.posX,y:a.y??a.posY};
 const common={id:a.id||p.name,name:p.name||'',type:p.typeName,x:pos.x,y:pos.y};
 if(p.typeName==='AppleController'){
  const c={...common,...DEFAULTS,appleCount:0,timerRaw:65536,stopped:false,changeBomb:Math.floor(slot(a,7)/FP_ONE)!==0};
  const fields=['activeAppleMax','appleSecRaw','bombSecRaw','swaySpeedRaw','swayHeightRaw','swayWidthRaw'];
  fields.forEach((f,i)=>{const n=slot(a,i+1);if(n)c[f]=i===0?((Math.floor(n/FP_ONE)<<24)>>24):n;});
  c.goalTable=countTable((a.datas||a.parameters||[])[8]);const goal=findCount(c.goalTable,count);
  if(goal>0)c.appleMax=(goal<<16)>>16;
  return c;
 }
 if(p.typeName==='Apple'){
  const fields=['appleSecRaw','bombSecRaw','swayWidthRaw','swayHeightRaw','swaySpeedRaw'];
  const overrides={};fields.forEach((f,i)=>{const n=slot(a,i);if(n)overrides[f]=n;});
  return {...common,overrides,changeBomb:Math.floor(slot(a,5)/FP_ONE)!==0,collision:{x:-12,y:-12,w:24,h:24}};
 }
 if(p.typeName==='TargetPlayer')return {...common,shotIntervalRaw:slot(a,12),visibleGauge:Math.floor(slot(a,13)/FP_ONE)!==0};
 if(p.typeName==='BasketPlayer')return {...common,collision:{x:-22,y:-30,w:26,h:44}};
 return null;
}
function compile(actors,count,options){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Apple device count must be 2..8');
 const active=actors.filter(a=>supportedTypes.includes((a.properties||a).typeName)&&allowed((a.properties||a).playerCount,count));
 const missing=[...new Set(active.map(a=>(a.properties||a).typeName))];
 if(missing.length)throw Error('Apple devices incomplete: '+missing.map(t=>t+': '+unresolved[t]).join('; '));
 return {schemaVersion:1,count,devices:[],completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
const solids=()=>[];
const beforeStep=()=>({events:[],solids:[]});
const afterStep=()=>({events:[],deadPlayerIds:[],solids:[]});
const displays=()=>[];
function pcg32(rng){const old=BigInt(rng.state),inc=BigInt(rng.inc);rng.state=((old*PCG_MULT+(inc|1n))&MASK64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number((old>>59n)&31n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function rngRange(rng,min,max){if(min>max){const t=min;min=max;max=t;}const span=max-min;if(span<=0)return min;const threshold=(0x100000000%span)>>>0;let n;do{n=pcg32(rng);}while(n<threshold);return min+n%span;}
function tickRaw(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');return Math.trunc(dt*FP_ONE);}
// Recovered controller kernel. Returns activation request, not fake Apple physics.
function controllerUpdate(c,apples,rng,dt){
 if(c.stopped||c.appleCount>=c.appleMax)return null;
 c.timerRaw-=tickRaw(dt);if(c.timerRaw>0)return null;
 const inactive=apples.filter(a=>!a.active);
 if(!inactive.length||apples.length-inactive.length>=c.activeAppleMax)return null;
 const a=inactive[rngRange(rng,0,inactive.length)];
 // Apple.Activate consumes RNG between selection and the next delay; callers
 // must run the actual activation before sampling the delay. No combined RNG
 // shortcut is offered here because that would change the native stream.
 return {appleId:a.id,controllerId:c.id,appleSecRaw:c.appleSecRaw,bombSecRaw:c.bombSecRaw,swaySpeedRaw:c.swaySpeedRaw,swayHeightRaw:c.swayHeightRaw,swayWidthRaw:c.swayWidthRaw,changeBomb:c.changeBomb};
}
function controllerDelay(c,rng){c.timerRaw=32768+Math.floor((pcg32(rng)>>>16)*65536/65536);return c.timerRaw;}
function controllerCatch(c,apples){
 if(c.appleCount>=c.appleMax)return {events:[],inactivateIds:[]};
 c.appleCount++;if(c.appleCount<c.appleMax)return {events:[],inactivateIds:[]};
 return {events:[{broadcastActorType:17,eventType:1,senderId:c.id},{broadcastActorType:134,eventType:47,senderId:c.id}],inactivateIds:apples.filter(a=>a.active).map(a=>a.id)};
}
function controllerEvent(c,eventType){if(eventType===EVENT.DEAD){c.stopped=true;return true;}return false;}
function targetShot(t,pressAction9,dt){t.shot=false;t.timerRaw-=tickRaw(dt);t.cooling=t.timerRaw>0;if(t.cooling||!pressAction9)return false;t.shot=true;t.timerRaw=t.shotIntervalRaw;return true;}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,decodeActor,countTable,findCount,raw,tickRaw,pcg32,rngRange,controllerUpdate,controllerDelay,controllerCatch,controllerEvent,targetShot,
 nativeConstants:{defaults:DEFAULTS,event:EVENT},completePhysicsFidelity:false,
 integration:{status:'partial_do_not_register',roles:'createPlayer assigns the next player actor ordinal through ActorScene.m_PlayerIndexList (0x1816a4048). InitPlayerIndexList optionally shuffles this list using seeded ascending Fisher-Yates (0x1816a64d4..0x1816a655d). Both stages author shufflePlayer=1. Preserve role spawn ordinal separately from player index and supply the scene permutation, never re-roll a second role lottery.',target:'Create a separate crosshair actor tied to the owning player. control writes its position, shot sets a one-tick collision flag, OnCollided emits event22 only to Apple type136. Need camera view clamp and action9 press, native return/wake and collision hooks.',basket:'Create a separate Basket actor type135, collision kind3, following its owner with ear-length, scale and flip-dependent vertical offset. Apple catch accepts this actor, not the ordinary player body.',controller:'Helpers are partial native kernels. compile refuses nonempty device inputs; do not whitelist these types or claim either stage playable.'},unresolved};
});