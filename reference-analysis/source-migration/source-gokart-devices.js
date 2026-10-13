/* Source-derived PP2 GoKart + Stick, static analysis only, image base 0x180000000.
 * PARTIAL: compile refuses both actors until the unresolved simulation is restored.
 * No original code executed. No fabricated collider or runnable approximation.
 * Creator ordinals: GoKart 173 (0x181775c09 -> 0x18185c330),
 * Stick 224 (creator-delegates-resolved.local.json -> 0x18170f650).
 * FP_ONE=65536: 16.16 shifts at 0x18185ec4c..0x18185ec56.
 * Table: 7 entries (counts 2..8), descending nonzero fallback at
 * 0x18185c7c3..0x18185c825 and 0x18185c844..0x18185c8ab;
 * byte encoding / 8-byte entries: QPlayerCountParamUtility 0x18096f720.
 * Defaults: INPUT_INTERVAL=10, JUMP_VELO=20, MAX_SPEED=4 from QFP
 * offsets 0x170/0x188/0x138 copied at 0x18185f1e3/251/27d.
 * Rect FP tuples in native memory order (axis semantics unresolved), .cctor 0x18185f1a7..2d3:
 * body (16,248,-34,-16), head (40,40,-20,-56), head2 (40,40,-20,-114).
 * Head second tuple entry grows 56 per additional rider, third shifts by
 * (4-min(count,4))*56: InitCollision 0x18185cafd..cb40;
 * head2 second tuple entry grows (count-5)*56: 0x18185cbd2..cc04.
 * Driver count min(count,4): 0x18185cfcc..cfda. Next index is
 * (index+count-4) modulo count ONLY above 4: 0x18185efb9..efdf.
 * Seats: (168,-10),(112,-10),(56,-10),(0,-10),(0,-68),(56,-68),
 * (112,-68),(168,-68), stores at 0x18185f2e3..f442.
 * Jump: (1-(1-inputCount/driverCount)^2)*jumpVelo*actorScale,
 * FP divide truncation and arithmetic shifts: 0x18185ec3c..ecc0.
 * Gravity: per-update raw 0xa666, cap 0x138000 (19.5), then actor scale:
 * 0x18185ea87..eb0d. It is NOT dt-scaled.
 * Stick ParseParameter 0x1816f93b0 validates non-null and returns: no stores.
 * Stick Creator 0x18170f703 creates an actor from a resource prototype;
 * absent InitCollision does not prove that prototype has no collision.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceGoKartDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP_ONE=65536;
const supportedTypes=['GoKart','Stick'];
const nativeConstants=Object.freeze({inputIntervalRaw:655360,jumpVeloRaw:1310720,maxSpeedRaw:262144,
 gravityRaw:0xa666,fallCapRaw:0x138000,seatPositions:[[168,-10],[112,-10],[56,-10],[0,-10],[0,-68],[56,-68],[112,-68],[168,-68]]});
const allowed=(v,c)=>v===0||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function validateCount(c){if(!Number.isInteger(c)||c<2||c>8)throw Error('GoKart player count must be 2..8');}
function decodeTable(slot){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('GoKart QPlayerCountParam must be a string slot');
 let s=slot.s;if(s.length===58&&s[0]==='"'&&s[57]==='"')s=s.slice(1,-1);
 if(s.length!==56)throw Error('GoKart QPlayerCountParam must contain 56 UTF-16 units');
 const raws=[];
 for(let i=0;i<7;i++){
  let raw=0n;for(let j=7;j>=0;j--)raw=(raw<<8n)|BigInt((s.charCodeAt(i*8+j)-0x21)&255);
  raw=BigInt.asIntN(64,raw);
  if(raw>BigInt(Number.MAX_SAFE_INTEGER)||raw<BigInt(Number.MIN_SAFE_INTEGER))throw Error('GoKart FP raw exceeds safe integer range');
  raws.push(Number(raw));
 }
 return raws;
}
function resolveTable(table,count){validateCount(count);for(let i=count-2;i>=0;i--)if(table[i]!==0)return table[i];return 0;}
function parameters(actor,count){
 validateCount(count);
 const data=actor.datas||actor.parameters||[];
 const jumpTable=decodeTable(data[0]),speedTable=decodeTable(data[1]);
 return {jumpTable,speedTable,jumpVeloRaw:resolveTable(jumpTable,count)||nativeConstants.jumpVeloRaw,
  maxSpeedRaw:resolveTable(speedTable,count)||nativeConstants.maxSpeedRaw};
}
function collisionRects(count){
 validateCount(count);const first=Math.min(count,4);
 // Native FPRect tuple names are not yet resolved. Return raw tuple below;
 // do not expose these as solids with guessed axis semantics.
 return {body:[16,248,-34,-16],head:[40,40+(first-1)*56,-20+(4-first)*56,-56],
  head2:count>4?[40,40+(count-5)*56,-20,-114]:null};
}
function drivers(count,index=0){validateCount(count);if(!Number.isInteger(index)||index<0||index>=count)throw Error('Invalid driver index');return Array.from({length:Math.min(count,4)},(_,i)=>(index+i)%count);}
function nextDriverIndex(count,index){drivers(count,index);return count>4?(index+count-4)%count:index;}
function mulRaw(a,b){return Number((BigInt(a)*BigInt(b))>>16n);}
function jumpRaw(inputCount,driverCount,jumpVeloRaw,scaleRaw=FP_ONE){
 if(!Number.isInteger(inputCount)||!Number.isInteger(driverCount)||driverCount<=0||inputCount<0||inputCount>driverCount)throw Error('Invalid GoKart jump input count');
 const fraction=Number((BigInt(inputCount)<<32n)/(BigInt(driverCount)<<16n));
 const complement=FP_ONE-fraction;
 return mulRaw(mulRaw(FP_ONE-mulRaw(complement,complement),jumpVeloRaw),scaleRaw);
}
function gravityDeltaRaw(vyRaw,scaleRaw=FP_ONE){return mulRaw(Math.min(vyRaw+nativeConstants.gravityRaw,nativeConstants.fallCapRaw)-vyRaw,scaleRaw);}
function compile(actors,count,options){
 validateCount(count);
 for(const raw of actors){const a=raw.properties||raw;if(!supportedTypes.includes(a.typeName)||!allowed(a.playerCount||0,count))continue;
  if(a.typeName==='GoKart'){
   parameters(raw,count);
   throw Error('GoKart simulation unresolved: native auto-scroll/camera boundary, input timing and dismount/key transfer require restoration; see gokart-device-report.json');
  }
  throw Error('Stick collision unresolved: resource prototype collision and contact dispatch have not been established; see gokart-device-report.json');
 }
 return {schemaVersion:1,count,karts:[],sticks:[],completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
function assertEmpty(s){if(!s||!Array.isArray(s.karts)||!Array.isArray(s.sticks)||s.karts.length||s.sticks.length)throw Error('Unresolved GoKart/Stick state cannot be simulated');}
function solids(s){assertEmpty(s);return [];}
function beforeStep(s,ctx){assertEmpty(s);return {events:[],solids:[]};}
function afterStep(s,ctx){assertEmpty(s);return {events:[],deadPlayerIds:[]};}
function displays(s){assertEmpty(s);return [];}
const integration=Object.freeze({
 status:'partial; do not register as playable',
 riding:'OnStart 0x18185cd5a/cd6b/cd7c prepares drivers and seats. Player mode becomes 11 (0x18185cf21); disable ordinary player collision (0x1816c7882) and movement while ridden. Driver changes above four players update grayscale (0x1816c79ce..79d8).',
 order:'OnUpdate writes kart velocity; native actor collision resolves movement; OnPost 0x18185ee29 forces passenger positions after collision. Seat Y also includes abs(native FP sine) chassis displacement (0x18185d4bd..4d7).',
 contacts:'Floating is inverse body down contact (0x18185da8d). Head test checks collision indices 2,1,0 upward (0x18185eb6b..ebc7). Do not infer these contacts from rider overlap.',
 events:'61 with param+0x70 nonzero rotates driver index; zero sets Stop (0x18185eed3..ef37). Events 26/43 notify all riders of death (0x18185ee94..ef67). Dismount disables kart collision, restores player mode and transfers attached key to nearest rider (0x18185e370).',
 camera:'calcSpeed 0x18185dfc0 uses StageComponent.CalcAutoScrollSpeed, camera left boundary, and m_CenterX; crossing that boundary kills all riders. OnStart writes camera+0x90 raw 0x1200000 (288) at 0x18185cd9a.',
 stick:'Creator constructs a resource actor; ParseParameter has no stores. Resource collider and consumer contact logic remain unresolved.'});
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,nativeConstants,integration,
 decodeTable,resolveTable,parameters,collisionRects,drivers,nextDriverIndex,jumpRaw,gravityDeltaRaw,completePhysicsFidelity:false};
});

