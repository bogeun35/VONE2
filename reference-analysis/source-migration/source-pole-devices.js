/* Statically recovered PP2 PoleLadder and FloatingThorn, image base 0x180000000.
 * No original code executed. This is a deliberately PARTIAL port.
 * FloatingThorn creator ordinal 126/token 0x60008d2 -> 0x181849990;
 * 0x181849ae0 is a dynamic overload requesting factory type 0x7e (the SAME
 * FloatingThorn type), using the smaller collision table and Disappear.
 * Defaults: swing height raw 0xa0000 and speed raw 0x10000 (0x181849a81,
 * 0x181849a89). ParseParameter 0x181849d88/91 substitutes NONZERO slots 0/1;
 * slot 2 substitutes both actor scale axes (0x181849daf/0x181849db6).
 * updateFloating 0x18184a10e accumulates FP delta; 0x18184a116 multiplies
 * by swing speed, calls FPMath.Sin 0x1816465d0, then multiplies by height.
 * That helper indexes an int32 LUT modulo raw 0x6487e (0x18164664b).
 * The LUT has not been recovered: compile refuses every nonzero swing height.
 * CollisionTable: w16,h40,x-20,y-8 and w40,h16,x-8,y-20
 * (0x18184a5da..0x18184a656). InitCollision uses category 8 (0x18184a00b).
 * OnCollided accepts category 1 or 8 and sends event 43 (0x18184a1bf..1fd).
 * PoleLadder height uses seven signed FP raws from Deserialize 0x18096f720;
 * count selection walks DOWN to nonzero (0x1816da690..0x1816da6f8).
 * slot1 speed, slot2 move distance (0x1816da702/70a/713).
 * OnUpdate adds sign(distance)*speed per TICK, no delta, then clamps using
 * signed >= distance (0x1816da8f1..0x1816da936).
 * POLE_WIDTH=4, PLAYER_POS_X_OFFSET=12 (0x1816daf3f/0x1816daf55).
 * Sensor category4, size height x width, x offset -width/2
 * (0x1816da7c0..0x1816da848). OnPost forces next state10 for all player
 * states except3..5; on subsequent posts clamps y to [poleY,poleY+height]
 * and sets x=poleX-12+(lookingLeft ? PLAYER_H+4 : 0)
 * (0x1816dabfa..0x1816dad95). PLAYER_H=48: Player..cctor 0x1816cba37.
 * FP_ONE=65536 is the native 16.16 representation, not a tuning parameter.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePoleDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536;
const supportedTypes=['FloatingThorn','PoleLadder'];
const raw=n=>Math.trunc(n*F);
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function heightTable(slot){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('PoleLadder height table missing');
 let s=slot.s;if(s.length===58&&s[0]==='"'&&s[57]==='"')s=s.slice(1,57);
 if(s.length!==56)throw Error('PoleLadder height table must contain 56 units');
 const out=[];
 for(let i=0;i<7;i++){let n=0n;for(let b=7;b>=0;b--)n=(n<<8n)|BigInt((s.charCodeAt(i*8+b)-33)&255);
  n=BigInt.asIntN(64,n);const v=Number(n);if(!Number.isSafeInteger(v))throw Error('PoleLadder FP raw exceeds safe integer');out.push(v);}
 return out;
}
function compile(actors,count,options){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Pole devices require 2..8 players');
 const poles=[],thorns=[];
 actors.forEach((a,i)=>{
  const p=a.properties||a,type=p.typeName;if(!supportedTypes.includes(type)||!allowed(p.playerCount,count))return;
  const pos=a.position||{x:a.x??a.posX,y:a.y??a.posY},d=a.datas||a.parameters||[];
  const n=j=>d[j]?.t===1?d[j].f:0;
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||[0,1,2].some(j=>d[j]?.t===1&&!Number.isFinite(n(j))))throw Error('Invalid pole device numeric parameter');
  const common={id:a.id||'source:a'+i,name:p.name||'',type,xRaw:raw(pos.x),yRaw:raw(pos.y)};
  if(type==='FloatingThorn'){
   const swingHeightRaw=raw(n(0))||0xa0000,swingSpeedRaw=raw(n(1))||0x10000;
   if(swingHeightRaw!==0)throw Error('Unverified FloatingThorn FPMath.Sin lookup table (0x1816465d0); refusing '+common.id);
   thorns.push({...common,swingHeightRaw,swingSpeedRaw});
  }else{
   const table=heightTable(d[0]);let heightRaw=0;for(let j=count-2;j>=0;j--)if(table[j]){heightRaw=table[j];break;}
   poles.push({...common,heightRaw,speedRaw:raw(n(1)),distanceRaw:raw(n(2)),initXRaw:common.xRaw,moveXRaw:0});
  }
 });
 return {schemaVersion:1,count,poles,thorns,completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
const solids=()=>[];
function beforeStep(state){
 for(const p of state.poles){p.moveXRaw+=(p.distanceRaw<0?-1:1)*p.speedRaw;
  if(p.moveXRaw>=p.distanceRaw)p.moveXRaw=p.distanceRaw;
  p.xRaw=p.initXRaw+p.moveXRaw;}
 return {events:[],deadPlayerIds:[],solids:[]};
}
function afterStep(state,{players=[]}={}){
 const playerConstraints=[];
 if(state.poles.length>1)throw Error('Multiple PoleLadders require native actor post order');
 for(const pole of state.poles)for(const p of players){
  if([3,4,5].includes(p.nativeState))continue;
  if(!Number.isInteger(p.nativeState))throw Error('PoleLadder requires player nativeState');
  if(p.nativeState!==10){playerConstraints.push({playerId:p.id,nextNativeState:10,lookRight:true});continue;}
  if(typeof p.lookingRight!=='boolean'||!Number.isSafeInteger(p.anchorYRaw))throw Error('PoleLadder requires lookingRight and anchorYRaw');
  playerConstraints.push({playerId:p.id,anchorXRaw:pole.xRaw-12*F+(p.lookingRight?0:52*F),
   anchorYRaw:Math.max(pole.yRaw,Math.min(p.anchorYRaw,pole.yRaw+pole.heightRaw))});
 }
 return {events:[],deadPlayerIds:[],playerConstraints};
}
function displays(state){return {poles:state.poles.map(p=>({id:p.id,x:p.xRaw/F,y:p.yRaw/F,height:p.heightRaw/F,width:4})),thorns:[]};}
const integration=Object.freeze({
 status:'Partial; FloatingThorn compilation intentionally refused until the native sine LUT is recovered.',
 coordinates:'All playerConstraints are native ActorComponent anchors in FP raws. Convert to runtime top-left coordinates using the existing player anchor transform.',
 order:'beforeStep is native OnUpdate. afterStep is native OnPost; apply playerConstraints after player simulation. State3..5 skip, other states request state10 and LookRight, state10 snaps x and clamps y. This affects every player, without contact gating.',
 player:'Implement Player OnInitialize_PoleLadder 0x1816c9380: animation13 and Player static collision rect +0xe8, mirrored under Actor bit10. OnFinalize 0x1816c9550 clears word +0x14 bit0. OnUpdate 0x1816c95b0: input4 takes priority over input5, directions -1/+1, idle0; animations14/15/13; velocityY=direction*m_PoleLadderSpeed (+0x88), gated by Collision.IsContactedMapOrRect. This speed and collision rect are unresolved here; do not invent defaults.',
 search:'Player OnUpdate also invokes calcSerchLength 0x1816c9b90, queries category8, updates word +0x14 bit0 and may apply PCG32 wobble x=-2..1 (0x1816c9af0..0x1816c9b75). These player mechanics remain required before stage fidelity can be claimed.',
 thorn:'Native collision callback sends event43 to category1 or8; do not replace with event19 without tracing receiver. Exact sine LUT required; Math.sin is not accepted as native evidence.',
 sensor:'Pole category4 sensor is native width=height, height=4, offsetX=-2,offsetY=0. It produces no pushback solids.'
});
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,heightTable,integration,completePhysicsFidelity:false};
});
