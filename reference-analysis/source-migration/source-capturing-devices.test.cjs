'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./source-capturing-devices.js');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actors=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_09_02'}));

test('9-2 constraint tables: rope distance and capture time per population',()=>{
 const want={2:[200,2],3:[200,2],4:[200,2],5:[200,3],6:[200,5],8:[150,5]};
 for(const [n,[d,t]] of Object.entries(want)){const c=C.compile(actors('st_w_09_02'),+n).constraints[0];
  assert.equal(c.distanceRaw,d*F);assert.equal(c.captureTimeRaw,t*F);assert.equal(c.targetName,'Key1');assert.equal(c.targetIds.length,6);}
});
test('frame RNG range and the random walk direction are unit vectors from FPSinCos',()=>{
 const rng={state:'9600629759793949339',inc:'15726070495360670683'};
 for(let i=0;i<50;i++){const v=C.moveDirection(rng);assert.ok(Math.abs(Math.hypot(v.xRaw,v.yRaw)-F)<8);}
 for(let i=0;i<50;i++){const r=C.randomRange(rng,-32768,32768);assert.ok(r>=-32768&&r<32768);}
});
test('ring tension: neighbours beyond 2/3 of the distance pull, beyond it the stretch is taken out',()=>{
 const c=C.compile(actors('st_w_09_02'),2).constraints[0];
 assert.deepEqual(C.constraintForces(c,[{state:9,xRaw:0,yRaw:0},{state:9,xRaw:100*F,yRaw:0}]).map(f=>f.xRaw),[0,0]);
 const f=C.constraintForces(c,[{state:9,xRaw:0,yRaw:0},{state:9,xRaw:300*F,yRaw:0}]);
 // both neighbours are the same player: spring 300/200*3-2 = 2.5, stretch 100
 // native normalize rounds (300,0) to 65535 but (-300,0) to -65536 (arithmetic
 // shift), so the pair is 103 raw apart, exactly as the original computes it
 assert.deepEqual(f.map(v=>v.xRaw),[6717337,-6717440]);
 assert.deepEqual(C.constraintForces(c,[{state:5,xRaw:0,yRaw:0},{state:9,xRaw:300*F,yRaw:0}])[0],{xRaw:0,yRaw:0});
});
test('capture geometry: segment within 40 px, triangle inside by 1 px, polygon winding',()=>{
 const P=(x,y)=>({xRaw:x*F,yRaw:y*F});
 assert.equal(C.isCapturingTarget([P(0,0),P(100,0)],P(50,30)),true);
 assert.equal(C.isCapturingTarget([P(0,0),P(100,0)],P(50,45)),false);
 assert.equal(C.isCapturingTarget([P(0,0),P(100,0)],P(130,0)),false);
 assert.equal(C.isCapturingTarget([P(0,0),P(100,0),P(50,90)],P(50,30)),true);
 assert.equal(C.isCapturingTarget([P(0,0),P(100,0),P(50,90)],P(150,30)),false);
 const sq=[P(0,0),P(100,0),P(100,100),P(0,100)];
 assert.equal(C.isCapturingTarget(sq,P(50,50)),true);assert.equal(C.isCapturingTarget(sq,P(150,50)),false);
 // a twisted ring (bow tie) is not capturable
 assert.equal(C.capturable(null,[P(0,0),P(100,100),P(100,0),P(0,100)]),false);assert.equal(C.capturable(null,sq),true);
});
test('9-2: surrounding every target for its capture time sends event 61 to Key1',()=>{
 const s=mk(4);const st=s.capturingState;let first=-1,done=-1;assert.equal(s.keyActive,false);
 for(let i=0;i<1200&&s.status==='play';i++){const t=st.targets.find(x=>!x.isCaptured);if(t){const tx=t.xRaw/F-5,ty=t.yRaw/F+14;
   [[-60,-60],[60,-60],[60,60],[-60,60]].forEach(([dx,dy],k)=>{s.players[k].x=tx+dx-16;s.players[k].y=ty+dy-47;});}
  R.step(s,{});if(first<0&&st.targets.some(x=>x.isCaptured))first=i;if(done<0&&st.constraints[0].isCaptured)done=i;}
 assert.equal(first,121);// 2.0 s at 1092 per update, from the update after the first inside test
 assert.ok(done>0);assert.equal(s.keyActive,true);assert.ok(st.targets.every(t=>t.isDisappear));
});
