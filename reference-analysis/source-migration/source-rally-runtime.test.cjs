'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Y=require('./source-rally-runtime.js'),L=require('./source-fplut-math.js');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const variant=n=>source.stages.find(s=>s.stageId==='st_w_13_03').json.stageInitParamList.find(v=>v.needPlayerCount===(n===2?0:n)).actorCreateParamList;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_13_03'}));
// Moves every mallet toward the point of its rail nearest to the ball.
function botInputs(s){const st=s.rallyState,b=st.balls[0],inputs={};
 for(const m of st.mallets){const p=s.players[m.actorIndex];if(!p)continue;inputs[p.id]={};if(!b||b.phase>=3)continue;
  const dx=m.dirRaw.xRaw,dy=m.dirRaw.yRaw,t=((b.xRaw-m.initXRaw)*dx+(b.yRaw-m.initYRaw)*dy)/F,cur=((m.xRaw-m.initXRaw)*dx+(m.yRaw-m.initYRaw)*dy)/F;
  if(Math.abs(t-cur)<4*F)continue;let best=null;
  for(const [k,v] of [['right',{xRaw:F,yRaw:0}],['left',{xRaw:-F,yRaw:0}],['down',{xRaw:0,yRaw:F}],['up',{xRaw:0,yRaw:-F}]]){
   const q=Y.railInput(m.angleRaw,v),along=(q.xRaw*dx/F*dx+q.yRaw*dy/F*dy)/F;if(along*Math.sign(t-cur)>0&&(!best||Math.abs(along)>best[1]))best=[k,Math.abs(along)];}
  if(best)inputs[p.id][best[0]]=true;}
 return inputs;}

test('13-3 parameters per population: 16 hits, faster every 5, mallet circle 25 * malletScale',()=>{
 const two=Y.compile(variant(2),2),c=two.controllers[0];
 assert.deepEqual([c.rallyMax,c.speedUpCount,c.ballSpeedRaw,c.ballSpeedIncRaw,c.ballSpeedMaxRaw,c.malletSpeedRaw,c.malletSpeedIncRaw,c.malletSpeedMaxRaw],[16,5,6.5*F,32768,16*F,8*F,6553,20*F]);
 assert.deepEqual([c.ballScaleRaw,c.malletScaleRaw,c.startXRaw,c.startYRaw],[98304,85196,696*F,288*F]);// 1.5 and 1.3 through the float stage loader
 assert.equal(Y.compile(variant(3),3).controllers[0].ballSpeedRaw,314572);// 4.8
 assert.deepEqual(two.mallets.map(m=>[m.actorIndex,m.angleRaw/F,m.lengthRaw/F,m.railLimitRaw]),[[0,90,400,40000*F],[1,90,400,40000*F]]);
 assert.deepEqual(Y.compile(variant(6),6).mallets.map(m=>m.angleRaw/F),[120,240,240,120,0,0]);// -120 wrapped once by 360
 assert.equal(Y.compile(variant(8),8).mallets.length,8);
 const s=mk(2);R.step(s,{});assert.equal(s.rallyState.mallets[0].collisionScaleRaw,85196);assert.equal(Y.displays(s.rallyState).mallets[0].radius,2129900/F);
});
test('rail direction: EulerZ with the truncated 0x477 deg-to-rad and the FPLut tables',()=>{
 assert.deepEqual(Y.rotX(0),{xRaw:F,yRaw:0});
 assert.deepEqual(Y.rotX(90*F),{xRaw:77,yRaw:65534});
 assert.deepEqual(Y.compile(variant(8),8).mallets[1].dirRaw,{xRaw:46368,yRaw:46313});// 45 degrees
});
test('createBall angle: FPMath.Atan quadrants (+-pi left, +-pi/2 straight up/down)',()=>{
 assert.equal(L.atanRaw(F),51472);assert.equal(L.atanRaw(-F),-51472);assert.equal(L.atanRaw(0x27100001),L.atanRaw(0x7fffffff));
 assert.equal(Y.aimAngle(F,F),51472);
 assert.equal(Y.aimAngle(-F,F),-51472+0x3243f);
 assert.equal(Y.aimAngle(-F,-F),51472-0x3243f);
 assert.deepEqual([Y.aimAngle(0,F),Y.aimAngle(0,-F),Y.aimAngle(0,0)],[0x1921f,-0x1921f,0]);
});
test('controller: first ball after the 0.5 s wait, aimed at a mallet with the frame RNG +-20 degrees',()=>{
 const st=Y.create(Y.compile(variant(2),2)),host={dtRaw:1092,terrain:[],beams:[],inputVector:()=>({xRaw:0,yRaw:0})};
 const rng={state:'9600629759793949339',inc:'15726070495360670683'};
 let born=-1;for(let i=0;i<40&&born<0;i++){Y.step(st,host);if(st.balls.length)born=i;}
 assert.equal(born,31);// phase entry + 31 countdown updates of 1092
 const index=Y.nextInt(rng,0,2),m=st.mallets[index],offset=Y.nextFP(rng,-20*F,20*F);
 const rad=Y.aimAngle(m.initXRaw-696*F,m.initYRaw-288*F),b=st.balls[0];
 assert.equal(b.angleRaw,Number((BigInt(rad)*0x394bb8n)>>16n)+offset);
 assert.deepEqual([b.xRaw,b.yRaw,b.speedRaw,b.speedMaxRaw,b.scaleRaw],[696*F,288*F,6.5*F,16*F,98304]);
 assert.ok(Math.abs(offset)<=20*F);
});
test('mallet rails: one input axis per rail, the whole step refused past the rail limit',()=>{
 assert.deepEqual(Y.railInput(0,{xRaw:F,yRaw:-F}),{xRaw:F,yRaw:0});
 assert.deepEqual(Y.railInput(90*F,{xRaw:F,yRaw:-F}),{xRaw:0,yRaw:-F});
 assert.deepEqual(Y.railInput(120*F,{xRaw:-F,yRaw:0}),{xRaw:F,yRaw:F});// 90..180: x dominant -> -x
 assert.deepEqual(Y.railInput(240*F,{xRaw:0,yRaw:F}),{xRaw:-F,yRaw:-F});// 180..270: y -> -y
 assert.deepEqual(Y.railInput(315*F,{xRaw:F,yRaw:F}),{xRaw:-F,yRaw:-F});// a tie goes to y
 const m=Y.compile(variant(4),4).mallets[2];// 0 degrees, length 320
 Y.malletMove(m,{xRaw:F,yRaw:0});assert.equal(m.xRaw-m.initXRaw,10*F);// speed 10 before setParameter
 for(let i=0;i<40;i++)Y.malletMove(m,{xRaw:F,yRaw:0});assert.equal(m.xRaw-m.initXRaw,160*F);// 16 steps fit, the 17th would end at 170 > 160
 m.flags|=1;Y.malletMove(m,{xRaw:-F,yRaw:0});assert.equal(m.xRaw-m.initXRaw,160*F);// stopped (event 35)
});
test('wall bounce: mirrored, and within 30 degrees of the normal turned to 1.5 x the angle',()=>{
 const ball=v=>({veloRaw:v,speedRaw:6*F,speedIncRaw:0,baseScaleRaw:F});
 const a=ball({xRaw:-6*F,yRaw:6*F});Y.contactMap(a,{xRaw:-F,yRaw:0});assert.deepEqual(a.veloRaw,{xRaw:6*F,yRaw:6*F});
 const b=ball({xRaw:-6*F,yRaw:0});Y.contactMap(b,{xRaw:-F,yRaw:0});assert.deepEqual(b.veloRaw,{xRaw:393084,yRaw:10266});// 0 -> 1 -> 1.5 degrees
 const c=ball({xRaw:-6*F,yRaw:-F});Y.contactMap(c,{xRaw:-F,yRaw:0});assert.ok(c.veloRaw.yRaw<0);
 assert.ok(Math.abs(Math.atan2(c.veloRaw.yRaw,c.veloRaw.xRaw)*180/Math.PI+14.19)<0.05);// 9.46 * 1.5
 const d=ball({xRaw:0,yRaw:-6*F});Y.contactMap(d,{xRaw:0,yRaw:-F});assert.ok(d.veloRaw.yRaw>0&&d.veloRaw.xRaw<0);// ceiling: base 90, sign from x
});
test('mallet hit: one-dimensional bounce off the heavy mallet, none while separating',()=>{
 const m={collisionVeloRaw:{xRaw:0,yRaw:0},weightRaw:100*F},b={collisionVeloRaw:{xRaw:6*F,yRaw:0},veloRaw:{xRaw:6*F,yRaw:0},weightRaw:F,speedRaw:6*F,speedIncRaw:32768,baseScaleRaw:F};
 assert.equal(Y.contactMallet(b,m,{xRaw:F,yRaw:0}),true);assert.deepEqual(b.veloRaw,{xRaw:-6.5*F,yRaw:0});// speed + inc, no max clamp here
 b.collisionVeloRaw={xRaw:-6*F,yRaw:0};b.veloRaw={xRaw:-6*F,yRaw:0};assert.equal(Y.contactMallet(b,m,{xRaw:F,yRaw:0}),false);
 m.collisionVeloRaw={xRaw:-8*F,yRaw:0};b.collisionVeloRaw={xRaw:0,yRaw:0};assert.equal(Y.contactMallet(b,m,{xRaw:F,yRaw:0}),true);assert.ok(b.veloRaw.xRaw<0);// a still ball struck by the mallet
});
test('hits count once per mallet in turn; a lost ball resets the count and the mallet speed',()=>{
 const st=Y.create(Y.compile(variant(2),2));Y.start(st);const c=st.controllers[0];
 for(let i=0;i<5;i++)Y.ballHit(st,c);assert.equal(c.rallyCount,5);assert.deepEqual(st.mallets.map(m=>m.speedIncRaw),[6553,6553]);
 Y.ballDisappeared(st,c);assert.equal(c.rallyCount,0);assert.deepEqual(st.mallets.map(m=>m.speedIncRaw),[0,0]);
 for(let i=0;i<20;i++)Y.ballHit(st,c);assert.equal(c.rallyCount,16);assert.equal(c.phase,3);
 Y.ballDisappeared(st,c);assert.equal(c.rallyCount,16);
});
test('13-3: a ball lost on the Thunder fades 0.5 s; the next comes 0.25 s after it is gone',()=>{
 const s=mk(2),st=s.rallyState;let lost=-1,gone=-1,next=-1;
 for(let i=0;i<400&&next<0;i++){R.step(s,{});const b=st.balls[0];if(lost<0&&b&&b.phase===3)lost=i;if(lost>=0&&gone<0&&!b)gone=i;if(gone>=0&&b)next=i;}
 assert.ok(lost>63);assert.equal(gone-lost,32);assert.equal(next-gone,17);
 assert.ok(s.players.every(p=>p.rallyTarget));assert.equal(s.keyActive,false);
});
test('13-3: sixteen hits clear it for every population: key appears, players are released',()=>{
 for(const n of [2,5,8]){const s=mk(n),st=s.rallyState,c=st.controllers[0];const start=s.players.map(p=>[p.x,p.y]);
  let cleared=-1;for(let i=0;i<4000&&cleared<0;i++){R.step(s,botInputs(s));if(c.flags&1)cleared=i;}
  assert.ok(cleared>0,'cleared '+n);assert.equal(c.rallyCount,16);assert.equal(s.keyActive,true);
  assert.deepEqual(s.players.map(p=>[p.x,p.y]),start);// state 8: nobody moved during the rally
  assert.ok(s.players.every(p=>p.rallyTarget));R.step(s,{});assert.ok(s.players.every(p=>!p.rallyTarget));// state 1 in the next update
  assert.ok(st.mallets.every(m=>m.flags&1));
  const x=s.players[0].x;for(let i=0;i<20;i++)R.step(s,{[s.players[0].id]:{right:true}});assert.ok(s.players[0].x>x);}
});
