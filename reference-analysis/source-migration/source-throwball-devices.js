/* Static recovery of CannonPlayer / ThrowBallBasket / ThrowBallController.
   PARTIAL: compile refuses these devices; recovered helpers are analysis units,
   not a playable implementation. No original native code was executed.

   ActorFactory.createCannonPlayer 0x1816a49ea calls createPlayer, then reads
   datas[14]/[15] at 0x1816a4a28/48 and calls PlayerCannon.Creator 0x181895360.
   That creator spawns actor 0x92 (146) at 0x1818953ec; Initialize equips its
   owner through PlayerComponent.Equip(1) at 0x1818956b2. CannonPlayer is thus
   an ordinary player plus a separately equipped cannon, not an extra player.

   Basket Initialize 0x181726d9a: target=100; QFP+0x140=5 height and
   QFP+0xf0=1 scale (metadata QFP field names). Parse 0x181726e6e decodes
   seven little-endian int32s, char byte minus 0x21 (0x180970857..868).
   Find 0x181786950 scans down from count-2 to the first nonzero int.
   0x181726f16 stores the low uint16 target, only when Find is nonzero.
   Positive datas[1] replaces height (0x181726f42); datas[2] replaces scale
   (0x181726f6e). FP raw unit=65536, Quantum 16.16 representation.

   Basket .cctor 0x1817277fc..884 constructs rectangles (w,h,x,y):
   (36,42,-21,-49) and (8,20,-10,-50). InitCollision 0x181727095..0e8
   multiplies all four components by scale and subtracts 16*height from y;
   16 is the inline static raw 0x100000 at 0x181727907 (literal resolver).
   These are native local rectangles; runtime anchor conversion is unresolved.

   OnContactAdded 0x18172740d requires added contact, collision category 5,
   actor type 0x93=147. A sensor contact at 0x181727486 marks the ball for
   destruction (Actor flags bit13, 0x1817274a1), increments score iff below
   target (0x1817274c7), and disables the sensor at target (0x18172752e).
   Non-sensor contacts call CalcReflectVeloX/Y, not an invented bounce.
   IsCleared 0x1817276e0 is unsigned score >= target.

   Controller Initialize 0x181729015..02d: speed raw 65536, acceleration
   raw 131072, interval raw 32768, bomb percentage byte 10.
   Parse 0x181729268..288 replaces each FP only if nonzero, and replaces
   percentage when its signed integer value is nonnegative (low byte).
   ballProc 0x181729700 subtracts dt from timer, creates actor 0x94=148
   at y=-10 (0x1817298d2), then reloads interval at 0x181729ad2.
   RNG is PCG32 (multiplier 0x5851f42d4c957f2d at 0x1817298fb), region
   selection then FP x selection then optional bomb draw. No RNG runs here.
   basketProc 0x181729670 compares each score to target; when all cleared,
   sends event 1 to actor type 17 (Key) at 0x181729695..6b3, sets flags bit1.

   UNRESOLVED: cannon FP trigonometric table (call 0x1816465d0), firing
   and pickup/contact sequencing, both projectile lifecycles, region bounds,
   native-to-web collision coordinates, and owner/index selection hooks.
   Do not register this module as functional until those are recovered. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceThrowBallDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const supportedTypes=['CannonPlayer','ThrowBallBasket','ThrowBallController'];
const FP_ONE=65536;
const reasons={
 CannonPlayer:'PlayerCannon FP aiming, firing, pickup and PlayerCannonBall physics unresolved (0x181895890, 0x181895d30, 0x181894750)',
 ThrowBallBasket:'PlayerCannonBall reflection and native collision anchor conversion unresolved (0x18172754f, 0x181894ac0, 0x181894b70)',
 ThrowBallController:'ThrowBall spawn regions, projectile lifecycle and collision physics unresolved (0x181729b10, 0x181727fc0, 0x181728300)'
};
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function raw(value){if(!Number.isFinite(value))throw Error('Invalid FP parameter');return Math.trunc(value*FP_ONE);}
function tableInts(slot){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('ThrowBallBasket integer table missing');
 let s=slot.s;if(s.length===30&&s[0]==='"'&&s[29]==='"')s=s.slice(1,-1);
 if(s.length!==28)throw Error('ThrowBallBasket integer table must contain 28 units');
 const out=[];
 for(let i=0;i<7;i++){let v=0;for(let j=0;j<4;j++)v|=((s.charCodeAt(i*4+j)-0x21)&255)<<(j*8);out.push(v);}
 return out;
}
function findCount(table,count){for(let i=count-2;i>=0;i--)if(table[i])return table[i];return 0;}
function inspectParameters(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Throwball count must be 2..8');
 return actors.flatMap((a,i)=>{
  const p=a.properties||a,type=p.typeName;
  if(!supportedTypes.includes(type)||!allowed(p.playerCount,count))return [];
  const d=a.datas||a.parameters||[],n=j=>d[j]?.t===1?d[j].f:0;
  const common={id:a.id||'source:a'+i,name:p.name||'',type};
  if(type==='CannonPlayer')return [{...common,angleSpeedRaw:raw(n(14)),powerSpeedRaw:raw(n(15))}];
  if(type==='ThrowBallController')return [{...common,ballSpeedRaw:raw(n(0))||65536,ballAccelRaw:raw(n(1))||131072,ballIntervalRaw:raw(n(2))||32768,bombRate:n(3)<0?10:(Math.floor(raw(n(3))/FP_ONE)&255)}];
  const table=tableInts(d[0]),target=findCount(table,count);
  return [{...common,target:target?(target&65535):100,table,heightRaw:n(1)>0?raw(n(1)):5*FP_ONE,scaleRaw:n(2)>0?raw(n(2)):FP_ONE}];
 });
}
function basketRects(b){
 const mul=(a,c)=>Number((BigInt(a)*BigInt(c))>>16n);
 return [[36,42,-21,-49],[8,20,-10,-50]].map(([w,h,x,y])=>({wRaw:mul(w*FP_ONE,b.scaleRaw),hRaw:mul(h*FP_ONE,b.scaleRaw),xRaw:mul(x*FP_ONE,b.scaleRaw),yRaw:mul(y*FP_ONE,b.scaleRaw)-16*b.heightRaw}));
}
// Recovered sensor branch only. Wall reflection is deliberately excluded.
function basketSensorContact(b,ball,contact){
 if(!contact.added||contact.category!==5||ball.actorType!==147||!contact.sensor)return false;
 ball.destroyRequested=true;
 if(b.score<b.target){b.score++;if(b.score>=b.target)b.sensorDisabled=true;}
 return true;
}
const isBasketCleared=b=>b.score>=b.target;
// OnUpdate phase2 0x1818959dd..a03, reloaded with raw 0x8000 at a62.
// Called only for an eligible owner's phase2; owner eligibility is not guessed.
function cannonCooldown(c,dt){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid cannon delta');
 if(c.phase!==2)return;
 c.timerRaw-=raw(dt);if(c.timerRaw<=0)c.phase=0;
}
function compile(actors,count,options){
 const params=inspectParameters(actors,count);
 if(params.length)throw Error('Unverified '+params[0].type+': '+reasons[params[0].type]);
 return {schemaVersion:1,count,baskets:[],cannons:[],controllers:[],completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
function assertEmpty(s){if(s.baskets.length||s.cannons.length||s.controllers.length)throw Error('Unverified throwball state cannot run');}
function solids(s){assertEmpty(s);return [];}
function beforeStep(s,ctx){assertEmpty(s);return {events:[],solids:[]};}
function afterStep(s,ctx){assertEmpty(s);return {events:[],deadPlayerIds:[]};}
function displays(s){assertEmpty(s);return [];}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,inspectParameters,tableInts,findCount,basketRects,basketSensorContact,isBasketCleared,cannonCooldown,
 integration:{status:'partial_do_not_register',player:'Treat CannonPlayer as a player spawn using the existing createPlayer population/index rules, and equip a separately owned PlayerCannon. Native createCannonPlayer 0x1816a49a0 calls createPlayer first; never append a second player. Raw stages contain eight candidate CannonPlayer spawns even for two players. Their final index selection remains unresolved.',projectiles:'PlayerCannonBall (147) is the scoring projectile. ThrowBall (148) is generated by the controller, including bombs in 08-04. Neither projectile has a verified web implementation here.'},completePhysicsFidelity:false};
});
