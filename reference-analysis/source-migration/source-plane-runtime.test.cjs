'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./source-plane-runtime.js'),L=require('./source-fplut-math.js');
const source=require('./installed-stage-decoded.local.json');
const F=65536;
const acts=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const view={x:0,w:960*F};
const v=(input,o={})=>P.planeVelocity({input,posXRaw:400*F,speedRaw:P.planeSpeedRaw(F),viewRaw:view,scrollRaw:0,scrollType2:false,...o});

test('OnInitialize_Plane: speed = 1.5 * stage scale * walk 3',()=>{
 assert.equal(P.planeSpeedRaw(F),mul(98304,3*F));assert.equal(P.planeSpeedRaw(98304),mul(mul(98304,98304),3*F));
 function mul(a,b){return Number((BigInt(a)*BigInt(b))>>16n);}
});
test('OnUpdate_Plane: eight directions from the FP radian table; right before left; scroll step added',()=>{
 const s=P.planeSpeedRaw(F);
 assert.deepEqual(v({right:true}),{vxRaw:s,vyRaw:0,look:'right',carriedRaw:0,dead:false});
 const ul=v({left:true,up:true}),[si,co]=L.sincosRaw(0x3ec97);assert.equal(ul.vyRaw,Number((BigInt(si)*BigInt(s))>>16n));assert.equal(ul.look,'left');assert.ok(ul.vxRaw<0);
 assert.equal(v({left:true,right:true}).look,'right');
 assert.equal(v({left:true},{leftContact:true}).vxRaw,0);// the left face is touching
 assert.equal(v({},{scrollRaw:3*F}).vxRaw,3*F);
});
test('CalcScreenEndWalkVeloX 0x1816a1ad0: no step past the view edges, |v| <= 3 raw is 0',()=>{
 assert.equal(P.screenEndWalkVeloX(958*F,4*F,view),0);assert.equal(P.screenEndWalkVeloX(956*F,4*F,view),4*F);
 assert.equal(P.screenEndWalkVeloX(2*F,-4*F,view),0);assert.equal(P.screenEndWalkVeloX(400*F,3,view),0);
});
test('ScrollType 2: carried to the left edge, more than 32 px behind is event 43',()=>{
 const r=v({},{posXRaw:90*F,viewRaw:{x:100*F,w:960*F},scrollRaw:3*F,scrollType2:true});
 assert.equal(r.carriedRaw,10*F);assert.equal(r.dead,false);
 const far=v({},{posXRaw:20*F,viewRaw:{x:100*F,w:960*F},scrollRaw:3*F,scrollType2:true});assert.equal(far.dead,true);
});
test('BattlePlane life: 2, a hit -> phase 1 -> shake 0.5 s -> 0; recovery to full after 3 s; 0 -> event 43',()=>{
 const rng={state:'9600629759793949339',inc:'15726070495360670683'},Lf=P.createLife();
 assert.equal(P.lifeDamage(Lf),true);assert.deepEqual([Lf.life,Lf.phase],[1,1]);assert.equal(P.lifeDamage(Lf),false);// not in phase 0
 P.lifeUpdate(Lf,1092,rng);assert.equal(Lf.phase,2);let n=0;while(Lf.phase===2&&n<60){P.lifeUpdate(Lf,1092,rng);n++;}assert.ok(n>=29&&n<=31,'shake '+n);
 assert.equal(Lf.anim,9);n=0;while(Lf.life<2&&n<400){P.lifeUpdate(Lf,1092,rng);n++;}assert.ok(n>=180&&n<=182,'recover '+n);// the 3 s timer is set at the hit and only runs in phase 0
 P.lifeDamage(Lf);P.lifeUpdate(Lf,1092,rng);while(Lf.phase!==0)P.lifeUpdate(Lf,1092,rng);P.lifeDamage(Lf);assert.equal(Lf.phase,3);
 assert.equal(P.lifeUpdate(Lf,1092,rng).dead,true);
});
test('PlayerGun data (6-3): one gun per player, interval 0.175, speed 25, three bullets',()=>{
 const g=P.compileGuns(acts('st_w_06_03'),4);assert.deepEqual(g.map(x=>x.playerIndex),[0,1,2,3]);
 assert.deepEqual([g[0].intervalRaw,g[0].speedRaw,g[0].hold,g[0].bullets.length],[Math.trunc(Math.fround(Math.fround(0.175)*F)),25*F,false,3]);
});
test('createBullet: plane muzzle (30, -12) + (14, -8), then 25 px this frame; a map hit stops it for 0.2 s; own colour chip breaks',()=>{
 const st={guns:P.compileGuns(acts('st_w_06_03'),2)},broke=[];
 const host=o=>({dtRaw:1092,viewRaw:view,players:[{index:0,xRaw:100*F,yRaw:300*F,lookLeft:false,plane:true,shotHeld:false,alive:true,colorIndex:0},{index:1,xRaw:100*F,yRaw:200*F,plane:true,alive:true,colorIndex:1}],
  blocked:()=>false,sweep:(b,dx,dy)=>({dxRaw:dx,dyRaw:dy,hit:null}),breakChip:(c,col)=>broke.push([c,col]),...o});
 const h=host();h.players[0].shotHeld=true;P.gunStep(st,h);const b=st.guns[0].bullets[0];
 assert.equal(b.active,true);assert.deepEqual(b.veloRaw,{xRaw:25*F,yRaw:0});
 assert.deepEqual([b.xRaw,b.yRaw],[(100+30+14+25)*F,(300-12-8)*F]);// Resume, then this frame's Pos += Velo
 P.gunStep(st,host());assert.equal(b.xRaw,(144+50)*F);
 P.gunStep(st,host({sweep:(bx,dx,dy)=>({dxRaw:5*F,dyRaw:0,hit:{kind:'map',chip:{gx:3,gy:2}}})}));
 assert.deepEqual([b.active,b.waiting],[false,true]);assert.deepEqual(broke,[[{gx:3,gy:2},0]]);
 let n=0;while(b.waiting&&n<30){P.gunStep(st,host());n++;}assert.ok(n>=12&&n<=13,'wait '+n);
});
test('the interval: a new shot after 0.175 s; held does not fire without slot 3',()=>{
 const st={guns:P.compileGuns(acts('st_w_06_03'),2)};let shots=0;
 for(let i=0;i<40;i++){const r=P.gunStep(st,{dtRaw:1092,viewRaw:view,players:[{index:0,xRaw:100*F,yRaw:300*F,plane:true,alive:true,shotHeld:i%2===0,colorIndex:0}],blocked:()=>false,sweep:(b,dx,dy)=>({dxRaw:0,dyRaw:0,hit:null}),breakChip:()=>{}});shots+=r.sounds.length;}
 assert.ok(shots>=3&&shots<=4,'shots '+shots);// presses every 2 frames, fires every 11
});
