/* Static reconstruction of DamageRect and LinePathLift parameter parsing.
 * This is a PARTIAL module: compile refuses every applicable device rather
 * than substitute unverified collision / movement behaviour. No game ran.
 *
 * Loader: convertActorCreateParam 0x180554274 copies tag; 0x18055427c
 * loads authored f as float32; 0x180554281 calls convertFP 0x180554310;
 * 0x180554291 stores the returned qword at entry+0x18.
 * convertFP 0x180554369 formats that float with null format and culture;
 * 0x180554373 calls FP.FromString_UNSAFE 0x18163fcb0. Its Double.Parse
 * call 0x18163fd41 is followed by cvtsd2ss 0x18163fd46 and the tail call
 * to FromFloat_UNSAFE 0x18163fd51. mulss 0x18163fc6d multiplies by
 * 65536.0f (0x182e87660), cvttss2si 0x18163fc7e truncates toward zero.
 * FormatSingle 0x18148f360 uses default precision 7 at 0x18148f3f6;
 * formatting ties / unusual magnitudes are NOT claimed to be reproduced.
 * Only the exact integer and two fractional authored values in this task
 * are accepted by stageFpRaw; they reparse to the same float32 under G7.
 *
 * Creator table: DamageRect ordinal 9, site 0x181775d9a;
 * LinePathLift ordinal 103, site 0x181776446 (resolved delegates JSON).
 * DamageRect ParseParameter 0x18180df1a / 0x18180df40 reads width/height;
 * negative width shifts create X at 0x18180df69 and becomes positive.
 * RectFP order is Height, Width, X, Y. Stores 0x18180dfa3/0x18180dfa8
 * give (height, abs(width), 0, -height).
 *
 * LinePathLift ParseParameter 0x1818785b0:
 * [4] speed raw 0x1818786f6; [5] mode sar 0x181878746;
 * [6] external start sar 0x181878777; [7] ride percent sar 0x1818787ca;
 * [8] line flag sar 0x1818787a4; [9] width growth sar 0x1818786d1;
 * [30] base width sar 0x1818786a2; [31] speed growth raw 0x181878722.
 * count = GetPlayerIndexCount, 0x1818787e7. Speed defaults to raw 65536
 * if abs(base)<4, else max(0,base+(count-2)*growth), 0x181878992..9b4.
 * Width defaults to 118 if <1 (0x181878841), then adds (count-2)*[9]
 * at 0x181878a75. Height 18, offsetY -9: 0x181878a55/0x181878a63.
 * OffsetX = -floor(baseWidth/2)-floor(widthGrowth/2), stores 0x181878ac4.
 * Mode 0..5: remainder by 3 (0x181878800..815), inertia = mode<3.
 * Mode 6: remainder 2, waitInEndPoint 1, inertia 1 (0x181878825..82c).
 * Mode>6: native retains authored mode (0x181878830).
 * Ride requirement: default 1 if [7]<=0 (0x181878a0c), otherwise
 * ceil(count*trunc(percent*65536/100)/65536), 0x181878a13..a4e;
 * storage truncates to a byte at 0x181878a4e.
 * Paths: UnpackVector2ArrayParam 0x181786800 invoked with start/max 10/10
 * at 0x1818788a5..8cb; reads pairs, stops at first (0,0), 0x1817868e6..8f2.
 * Initialize allocates 10 path and 2 fake entries, 0x181878471/0x181878523.
 * cctor 0x18187a460: SIGN_OFFSET_Y raw -7208960 (-110);
 * GUIDE_LINE_WIDTH '0.075' raw 4915 (literal 0x1831c3b78).
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceLinepathDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP_ONE=65536;
const supportedTypes=['DamageRect','LinePathLift'];
// The safe-number restriction is a JS representation guard, not a game constant.
function fpFromFloatRaw(value){
 if(!Number.isFinite(value))throw Error('Non-finite FP input');
 const raw=Math.trunc(Math.fround(Math.fround(value)*FP_ONE));
 if(!Number.isSafeInteger(raw))throw Error('FP raw exceeds exact JavaScript integer range');
 return raw===0?0:raw;
}
function stageFpRaw(value){
 // All task-authored integer parameters fit Single exactly. Fractional literals
 // 2.3335 / -0.2 were individually checked through the native G7 round trip.
 if(!Number.isFinite(value)||!((Number.isInteger(value)&&Math.fround(value)===value)||value===2.3335||value===-0.2))
  throw Error('Unverified stage float string round trip: '+value);
 return fpFromFloatRaw(value);
}
const slotRaw=(a,i)=>a.datas?.[i]?.t===1?stageFpRaw(a.datas[i].f):0;
// sar 16 is signed floor, including -0.2 -> -1, not truncation to zero.
const slotInt=(a,i)=>Math.floor(slotRaw(a,i)/FP_ONE);
function decodeDamageRect(a){
 let xRaw=stageFpRaw(a.posX),yRaw=stageFpRaw(a.posY),widthRaw=slotRaw(a,0),heightRaw=slotRaw(a,1);
 if(widthRaw<0){xRaw+=widthRaw;widthRaw=-widthRaw;}
 return {type:'DamageRect',name:a.name||'',xRaw,yRaw,
  rectRaw:{height:heightRaw,width:widthRaw,x:0,y:-heightRaw}};
}
function decodeLinePathLift(a,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Expected player count 2..8');
 let width=slotInt(a,30);if(width<1)width=118;
 const growth=(count-2)*slotInt(a,9),base=slotRaw(a,4),speedGrowth=slotRaw(a,31);
 const mode=slotInt(a,5),modeRemainder=mode>=0&&mode<=5?mode%3:mode===6?2:mode;
 const inertia=mode>=0&&mode<=5?mode<3:mode===6;
 const percent=slotInt(a,7),percentRaw=Math.trunc(percent*FP_ONE/100);
 const moveContactCount=(percent<=0?1:Math.ceil(percentRaw*count/FP_ONE))&255;
 const paths=[];
 for(let i=10;i<30;i+=2){const x=slotRaw(a,i),y=slotRaw(a,i+1);if(x===0&&y===0)break;paths.push({xRaw:x,yRaw:y});}
 const externalStart=slotInt(a,6)>0;
 return {type:'LinePathLift',name:a.name||'',xRaw:stageFpRaw(a.posX),yRaw:stageFpRaw(a.posY),
  speedRaw:Math.abs(base)<4?FP_ONE:Math.max(0,base+(count-2)*speedGrowth),
  baseSpeedRaw:base,speedGrowthRaw:speedGrowth,paths,
  mode,absLoop:modeRemainder===2?1:0,loop:modeRemainder>0,isInertia:inertia?1:0,
  waitInEndPoint:mode===6?1:0,externalStart,enableLine:slotInt(a,8)===1?1:0,
  moveContactCount,needRideCount:externalStart?0:moveContactCount,
  disabled:paths.length===0,targetPathIndex:0,returnDirection:0,timerRaw:0,
  rectRaw:{height:18*FP_ONE,width:(width+growth)*FP_ONE,
   x:(-Math.trunc(width/2)-Math.trunc(growth/2))*FP_ONE,y:-9*FP_ONE}};
}
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function compile(actors,count,options){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Expected player count 2..8');
 for(const raw of actors){const a=raw.properties||raw;if(!supportedTypes.includes(a.typeName)||!allowed(a.playerCount,count))continue;
  if(a.typeName==='LinePathLift')throw Error('Unverified LinePathLift runtime: native segment length (0x181640c40), recursive contact movement (0x1816a15c0), and fake-path switch motion (0x1818798e0) are not ported; '+(a.name||raw.id||''));
  throw Error('Unverified DamageRect runtime: inactive startup 0x18180e16c and push-back activation 0x18180e291 require CollisionScene contact flags; event 43 recipient semantics not ported; '+(a.name||raw.id||''));
 }
 return {schemaVersion:1,count,devices:[],completePhysicsFidelity:false};
}
const create=compiled=>JSON.parse(JSON.stringify(compiled));
const solids=()=>[];
const beforeStep=()=>({events:[],solids:[]});
const afterStep=()=>({events:[],deadPlayerIds:[]});
const displays=()=>({devices:[]});
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,
 fpFromFloatRaw,stageFpRaw,decodeDamageRect,decodeLinePathLift,completePhysicsFidelity:false};
});
