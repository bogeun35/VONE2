/* Static recovery of PlayerMagnetComponent; intentionally PARTIAL.
   Creator ordinal 72 -> 0x1816cf980 (creator-delegates-resolved.local.json).
   ParseParameter 0x1816cfe14..26: only datas[0] is read, FP->int sar 16.
   0x1816cfe37 resolves player by ACTOR index; absent player returns at
   0x1816cfea5. Eight pc0 magnets in assets do not mean eight live players.
   0x1816cfe8f Equip(slot 0); 0x1816cfea0 SetHoldGun(true).
   isInputOn 0x1816d0809: input enum 9; Actor flag bit3 disables it.
   Constants below are raw FP, named by quantum-field-offsets.json.
   .cctor FromString stores: +8 18.5 at 0x1816d2d85;
   +16 -17.5 at 0x1816d2da5; +96 .6 at 0x1816d2f75;
   +104 .03 at 0x1816d2f95; +120 .08 at 0x1816d2fcb.
   Inline: +24 20 at 0x1816d2db7; +32 -44 at 0x1816d2dcd;
   +40 110 at 0x1816d2de3; +48 80 at 0x1816d2df9;
   +112 1 at 0x1816d2fa9; +128 2 at 0x1816d2fdf;
   +144 0 at 0x1816d3034; +152 32 at 0x1816d304d;
   +160 40 at 0x1816d3066. +136 = +8 + literal 8.25
   (slot 0x1831c67a0, call 0x1816d3003, store 0x1816d301f).
   FP scale 65536: FP.FromFloat_UNSAFE 0x18163fc40.
   approachAxisRaw implements ONLY the uncaught approach arithmetic:
   suckTarget 0x1816d1581..160f / 0x1816d164a..16c8. The next displacement
   is old velocity plus sign(error)*min(axisThreshold,abs(error)*rate>>16),
   except an error within threshold snaps displacement to dest-position.
   Flag bit0 doubles the rate (0x1816d14b3..bf).
   This displacement is also added DIRECTLY to actor position at
   0x1816d1a4e..6e, then syncCollisionPos at 0x1816d1aae.
   Caught-relative / floating branches also alter velocities and gravity;
   therefore this helper is NOT a complete runtime hook.
   compile refuses an active magnet until capture event acceptance, candidate
   ordering and caught-relative physics are recovered. No approximate fallback. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceMagnetDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const nativeConstants=Object.freeze({magnetOffsetXRaw:1212416,magnetOffsetYRaw:-1146880,
 tractorXRaw:1310720,tractorYRaw:-2883584,tractorWRaw:7208960,tractorHRaw:5242880,
 intervalTimeRaw:39321,approachSpeedXRaw:1966,approachSpeedXMinRaw:65536,
 approachSpeedYRaw:5242,approachSpeedYMinRaw:131072,offsetXRaw:1753088,
 offsetYRaw:0,catchResetLengthRaw:2097152,limitAngleDegRaw:2621440,inputEnum:9});
// ActorFactoryComponent.Update 0x1816a30ee..0x1816a3147.
const allowed=(v,c)=>v===0||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function decodeParameters(raw){
 const data=raw.datas||raw.parameters||[];
 const value=data[0]?.t===1?data[0].f:0;
 if(!Number.isFinite(value))throw Error('PlayerMagnet datas[0] must be finite');
 // Arithmetic shift floors negative FP integers; do not use Math.trunc(value).
 return {playerActorIndex:Math.floor(Math.trunc(value*65536)/65536)};
}
const unresolvedMessage='PlayerMagnet capture is unresolved: native candidate ordering/event 16 acceptance and caught-relative gravity/velocity hooks are required (0x1816d1e00, 0x1816d13e0)';
function compile(actors,count,options){
 void options;
 if(!Number.isInteger(count)||count<2||count>8)throw Error('PlayerMagnet requires player count 2..8');
 for(const raw of actors){
  const a=raw.properties||raw;
  if(a.typeName!=='PlayerMagnet'||!allowed(a.playerCount??0,count))continue;
  const {playerActorIndex}=decodeParameters(raw);
  // Runtime binding is not implemented, even for an apparently absent index.
  void playerActorIndex; throw Error(unresolvedMessage);
 }
 return {schemaVersion:1,count,magnets:[],completePhysicsFidelity:false};
}
function create(compiled){
 if(!compiled||!Array.isArray(compiled.magnets)||compiled.magnets.length)throw Error(unresolvedMessage);
 return JSON.parse(JSON.stringify(compiled));
}
function solids(){return [];}
function beforeStep(state,ctx){void ctx;if(state.magnets.length)throw Error(unresolvedMessage);return {events:[],solids:[]};}
function afterStep(state,ctx){return beforeStep(state,ctx);}
function displays(state){if(state.magnets.length)throw Error(unresolvedMessage);return [];}
function approachAxisRaw(positionRaw,velocityRaw,destinationRaw,axis,boosted=false){
 for(const v of [positionRaw,velocityRaw,destinationRaw])if(!Number.isSafeInteger(v))throw Error('PlayerMagnet axis requires safe integer FP raws');
 if(axis!=='x'&&axis!=='y')throw Error('PlayerMagnet axis must be x or y');
 const rate=BigInt(axis==='x'?nativeConstants.approachSpeedXRaw:nativeConstants.approachSpeedYRaw)*(boosted?2n:1n);
 const threshold=BigInt(axis==='x'?nativeConstants.approachSpeedXMinRaw:nativeConstants.approachSpeedYMinRaw);
 const error=BigInt(destinationRaw)-BigInt(positionRaw)-BigInt(velocityRaw),abs=error<0n?-error:error;
 if(abs<=threshold)return {displacementRaw:Number(BigInt(destinationRaw)-BigInt(positionRaw)),arrived:true};
 const scaled=(abs*rate)>>16n,change=scaled<threshold?scaled:threshold;
 return {displacementRaw:Number(BigInt(velocityRaw)+(error<0n?-change:change)),arrived:false};
}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes:['PlayerMagnet'],
 decodeParameters,approachAxisRaw,nativeConstants,completePhysicsFidelity:false,
 integration:Object.freeze({status:'partial_refusal_do_not_register',
 input:'Map logical input enum 9 to the magnet action; Actor flag bit3 disables it (0x1816d0770).',
 players:'Resolve datas[0] by player actor index, equip slot 0 and SetHoldGun(true), not by authored magnet position (0x1816cfd90).',
 motion:'Native suckTarget writes target velocity AND adds displacement to position once per tick, then syncs collision (0x1816d18ce, 0x1816d1a6e, 0x1816d1aae). Do not multiply the displacement by dt or feed only vx/vy into ordinary integration.',
 capture:'Requires ordered native contact candidates, capturable Actor bit16, FP angle filter, synchronous event 16 return >0, release and caught-relative/floating state. The current runtime does not expose this contract; compile throws.'})};
});

