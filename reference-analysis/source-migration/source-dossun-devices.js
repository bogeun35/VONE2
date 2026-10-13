/* Static recovery, GameAssembly.dll base 0x180000000; no native execution.
 * Dossun.ParseParameter 0x18181ccc0: slots 1 accel, 2 wait, 3 return,
 * slot 4 integer flag. Initialize 0x18181cc70/90/a9: QFP[140]/[f0]/[120]
 * = 5/1/2.5 (quantum-field-offsets.json).
 * updatePhase 0x18181d3c0: phases 0..4; accel is PER UPDATE, return is
 * PER UPDATE, only waiting subtracts Frame.DeltaTime (0x18181d4b3).
 * Native rectangles are four FP fields, not assumed screen AABBs:
 * .cctor 0x18181d9c8..da45: [170,458,-229,-182], [194,442,-221,-194].
 * Gun.ParseParameter 0x1818932f0: actor index slot 0, speed slot 1;
 * Initialize 0x1818932e0 defaults QFP[150] = 6.
 * Gun.OnUpdate 0x181893630/63a/67e: inactive bit 3, outstanding bullet,
 * press input 9. createBullet 0x181893962 spawns actor type 162.
 * Bullet.OnCollided 0x181892b25..bc0: actor 27, different player index,
 * then PlayerBlockComponent.Creator 0x181891200. This dependency is absent.
 * Compile intentionally refuses nonempty devices until native collision and
 * PlayerBlock integration are implemented; this file is NOT playable support.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceDossunDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP=65536; // Quantum FP 16.16, FP.FromFloat_UNSAFE 0x18163fc40.
const supportedTypes=['Dossun','PlayerBlockGun'];
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10; // ActorFactory.Update 0x1816a2fe9.
function decodeActor(raw){
 const a=raw.properties||raw,d=raw.datas||raw.parameters||[],p=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
 const n=i=>d[i]&&d[i].t===1?d[i].f:0;
 const common={type:a.typeName,name:a.name||'',x:p.x,y:p.y};
 if(a.typeName==='Dossun')return {...common,accelRaw:Math.trunc((n(1)||5)*FP),waitRaw:Math.trunc((n(2)||1)*FP),returnRaw:Math.trunc((n(3)||2.5)*FP),retriggerOnReturn:Math.floor(n(4))!==0};
 if(a.typeName==='PlayerBlockGun')return {...common,actorIndex:Math.floor(n(0)),bulletSpeedRaw:Math.trunc((n(1)||6)*FP)};
 return null;
}
function compile(actors,count,options){
 const selected=actors.filter(raw=>allowed((raw.properties||raw).playerCount,count)).map(decodeActor).filter(Boolean);
 if(selected.some(a=>a.type==='PlayerBlockGun'))throw Error('PlayerBlockGun unresolved: PlayerBlockComponent (0x181891200), input 9 and dynamic bullet collision lifecycle are not integrated');
 if(selected.some(a=>a.type==='Dossun'))throw Error('Dossun unresolved: native Map.Move sensor geometry (0x18181d070) and collision/contact routing (0x18181d560, 0x18181d760) are not integrated');
 return {devices:[],completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
function solids(){return [];}
function beforeStep(state){if(state.devices.length)throw Error('Unintegrated Dossun state');return {events:[],solids:[]};}
function afterStep(state){if(state.devices.length)throw Error('Unintegrated Dossun state');return {events:[],deadPlayerIds:[]};}
function displays(state){return state.devices;}
// Exact component-only phase update; caller supplies native actor FP fields.
// It deliberately does not implement ActorComponent movement or collisions.
function updatePhase(d,actor,dtRaw){
 switch(d.phase){
  case 1:actor.vyRaw+=d.accelRaw;break; // 0x18181d535
  case 2:actor.vxRaw=0;actor.vyRaw=0;d.timerRaw=d.waitRaw;d.phase=3;d.face=1;break; // 0x18181d502..517
  case 3:d.timerRaw-=dtRaw;if(d.timerRaw<=0){d.phase=4;d.face=0;}break; // 0x18181d490..4e8
  case 4:actor.yRaw=Math.max(actor.initialYRaw,actor.yRaw-d.returnRaw);if(actor.yRaw===actor.initialYRaw)d.phase=0;break; // 0x18181d451..484
 }
}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,decodeActor,updatePhase,
 nativeConstants:{collisionRectFields:[170,458,-229,-182],thornCollisionRectFields:[194,442,-221,-194]},
 integration:{status:'partial_do_not_register',input:'PlayerComponent.Equip and SetHoldGun; input 9 edge; one outstanding bullet per gun.',dependency:'PlayerBlockComponent has no source module. Bullet contact invokes its Creator on another player; do not replace this with terrain block spawning.',collision:'Dossun needs native Map.Move-derived sensor and collision kind/normal routing, including entity-targeted event 19. No broad overlap kill is justified.'},completePhysicsFidelity:false};
});

