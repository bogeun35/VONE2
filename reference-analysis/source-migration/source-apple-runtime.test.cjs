'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('./source-apple-runtime.js'),R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const acts=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const mk=(id,n)=>R.create(R.compile({source,geometry,count:n,stageId:id}));
const host=(over)=>({dtRaw:1092,players:[{xRaw:144*F,yRaw:335*F,visible:true,layer1Rect:null},{xRaw:1272*F,yRaw:1008*F,visible:true,layer1Rect:null}],
 viewRaw:{x:0,y:0,w:2016*F,h:1104*F},moveVector:()=>({xRaw:0,yRaw:0}),pressed:()=>false,mapBoundsRaw:{left:-480*F,right:2496*F,up:-2400*F,fall:3504*F},...over});

test('8-1 / 8-3 data: catches per count, controller slots, apple overrides, roles in actor order',()=>{
 assert.deepEqual([2,3,4,5,6,7,8].map(n=>A.compile(acts('st_w_08_01'),n).controller.needed),[12,14,21,21,23,24,26]);
 assert.deepEqual([2,3,4,5,6,7,8].map(n=>A.compile(acts('st_w_08_03'),n).controller.needed),[12,14,20,22,25,27,30]);
 const c=A.compile(acts('st_w_08_01'),8);
 assert.deepEqual([c.controller.max,c.controller.appleRaw,c.controller.bombRaw,c.controller.xAmpRaw,c.controller.yAmpRaw,c.controller.speedRaw,c.controller.flags],[10,3.5*F,3*F,200*F,100*F,150*F,0]);
 assert.equal(A.compile(acts('st_w_08_03'),8).controller.flags,1);// slot 7: apples alternate with bombs
 assert.deepEqual([c.apples[2].xAmpRaw,c.apples[2].flags,c.apples[3].yAmpRaw,c.apples[3].flags],[50*F,4,20*F,8]);
 assert.deepEqual([c.targets.length,c.baskets.length,c.targets[0].intervalRaw,c.targets[0].flags],[4,4,F,1]);
 const two=A.compile(acts('st_w_08_01'),2);assert.deepEqual([two.targets.map(t=>t.playerIndex),two.baskets.map(b=>b.playerIndex)],[[0],[1]]);
});
test('a TargetPlayer stands in state 8; its crosshair starts 500 px toward the view centre',()=>{
 const s=mk('st_w_08_01',2);R.step(s,{});
 const p0=s.players[0];// stage scale 1.5: the body is 48 x 69, Pos stays (144, 335.5)
 assert.deepEqual([p0.x+p0.w/2,p0.y+p0.h+1,p0.w,p0.h,p0.rallyTarget],[144,335.5,48,69,true]);
 assert.equal(s.players[1].rallyTarget,undefined);
 assert.equal(s.appleState.targets[0].xRaw,Math.round((128+16)*F)+500*F);
 for(let i=0;i<30;i++)R.step(s,{[s.players[0].id]:{right:true}});assert.equal(s.players[0].x,120);// the crosshair moves, not the player
 assert.ok(s.appleState.targets[0].xRaw>Math.round(144*F)+500*F);
});
test('controller: the first apple after 1 s, the next after RandomRange(0.5, 1.5)',()=>{
 const st=A.create(A.compile(acts('st_w_08_01'),2));let first=-1;
 for(let i=0;i<200&&first<0;i++){A.step(st,host());if(st.apples.some(a=>a.flags&0x40))first=i;}
 assert.equal(first,60);// 61 updates of 1092
 assert.ok(st.controller.timerRaw>=32768&&st.controller.timerRaw<98304);
 const ap=st.apples.find(a=>a.flags&0x40);assert.deepEqual([ap.phase,ap.state,ap.count],[1,1,0]);
 A.step(st,host());assert.equal(ap.visible,true);assert.equal(ap.timerRaw,3.5*F-0);// apple time shown
});
test('shot down: event 22 -> jump (dir.x * 3, -20) plus gravity, caught by a basket',()=>{
 const st=A.create(A.compile(acts('st_w_08_01'),2)),ap=st.apples[0];
 A.activate(st,ap,st.controller,false);A.appleUpdate(st,ap,1092,{shakes:[],sounds:[]});
 A.appleEvent(ap,22,{xRaw:ap.xRaw-10*F,yRaw:ap.yRaw});assert.deepEqual([ap.phase,ap.state],[7,3]);
 const out={shakes:[],sounds:[]};A.appleUpdate(st,ap,1092,out);assert.deepEqual(ap.jumpRaw,{xRaw:196605,yRaw:-20*F});// native normalize gives 65535 for (10,0)assert.deepEqual(out.shakes,[4915]);
 const y0=ap.yRaw;A.step(st,host());assert.equal(ap.veloRaw.yRaw,-20*F+0xa666);// Post1 jumpProc: velo = jump, then + gravity
 // a basket right under it catches it
 const b=st.baskets[0];let caught=false;
 for(let i=0;i<200&&!caught;i++){const h=host({players:[{xRaw:144*F,yRaw:335*F,visible:true,layer1Rect:null},{xRaw:ap.xRaw,yRaw:ap.yRaw+60*F,visible:true,layer1Rect:null}]});A.step(st,h);caught=b.count===1;}
 assert.ok(caught);assert.equal(st.controller.caught,1);assert.equal(ap.flags&0x40,0);assert.ok(ap.yRaw<y0);
});
test('a falling bomb knocks a player out (event 25: dir.x * 8, -2) and blasts to 250 px',()=>{
 const st=A.create(A.compile(acts('st_w_08_03'),2)),ap=st.apples[0];
 A.activate(st,ap,st.controller,true);ap.phase=3;ap.state=2;A.appleUpdate(st,ap,1092,{shakes:[],sounds:[]});
 A.appleEvent(ap,22,{xRaw:ap.xRaw,yRaw:ap.yRaw-5*F});assert.equal(ap.state,4);
 const r=A.step(st,host({players:[{xRaw:ap.xRaw+20*F,yRaw:ap.yRaw+30*F,visible:true,layer1Rect:{x:ap.xRaw/F-16+20,y:ap.yRaw/F-17,w:32,h:46}},null]}));
 assert.equal(r.faints.length,1);assert.equal(r.faints[0].veloRaw.yRaw,-2*F);assert.ok(r.faints[0].veloRaw.xRaw>0);
 let n=0;while(ap.flags&0x40&&n<60){A.step(st,host());n++;}assert.ok(n>=37&&n<=40);// 250 / 400 s of growth after the blast starts
});
test('the last catch: key event 1, crosshairs fly back over 1.5 s, the player wakes up',()=>{
 const s=mk('st_w_08_01',2),st=s.appleState;R.step(s,{});st.controller.caught=11;
 const ap=st.apples[0];A.activate(st,ap,st.controller,false);ap.phase=8;ap.state=3;ap.veloRaw={xRaw:0,yRaw:0};
 const b=s.players[1];ap.xRaw=Math.round((b.x+16)*F);ap.yRaw=Math.round((b.y+47-60)*F);ap.visible=true;
 R.step(s,{});assert.equal(st.controller.caught,12);assert.equal(s.keyActive,true);assert.equal(st.targets[0].phase,1);
 let woke=-1;for(let i=0;i<200&&woke<0;i++){R.step(s,{});if(!s.players[0].rallyTarget)woke=i;}
 assert.ok(woke>=90&&woke<=94);// prepareMove, 1.5 s of moveRaw, wakeUpPlayer, then the player's next update
 assert.equal(st.targets[0].visible,false);
});
test('Frame.Random 0x181747ad0: PCG32 without 0, modulo 0xffffffff minus 2^31',()=>{
 const rng={state:'9600629759793949339',inc:'15726070495360670683'},raw={...rng};
 const x=A.pcg32(raw);assert.equal(A.frameRandom(rng),((x%0xffffffff)-0x80000000)|0);
});
test('8-1 with four and eight players: two crosshair players and their basket mates fill the count',()=>{
 for(const n of [4,8]){const s=mk('st_w_08_01',n),st=s.appleState;let i=0;
  for(;i<3000&&!s.keyActive&&s.status==='play';i++){const inputs={},falling=st.apples.filter(a=>a.state===3);
   s.players.forEach((p,k)=>{const inp={};inputs[p.id]=inp;const t=st.targets.find(q=>q.playerIndex===k);
    if(t&&t.phase===0){const bs=st.baskets.map(b=>b.xRaw/F),near=x=>Math.min(...bs.map(b=>Math.abs(b-x)));
     const ap=st.apples.filter(a=>a.state===1&&near(a.xRaw/F)<200).sort((a,b)=>near(a.xRaw/F)-near(b.xRaw/F))[0];
     if(ap){const dx=(ap.xRaw-t.xRaw)/F,dy=(ap.yRaw-t.yRaw)/F;if(dx>8)inp.right=true;if(dx<-8)inp.left=true;if(dy>8)inp.down=true;if(dy<-8)inp.up=true;if(Math.abs(dx)<10&&Math.abs(dy)<10&&i%2)inp.shot=true;}return;}
    const b=st.baskets.find(q=>q.playerIndex===k);if(!b)return;
    const land=a=>{let x=a.xRaw/F,y=a.yRaw/F,vx=a.veloRaw.xRaw/F,vy=a.veloRaw.yRaw/F;if(a.jumpRaw.xRaw||a.jumpRaw.yRaw){vx=a.jumpRaw.xRaw/F;vy=a.jumpRaw.yRaw/F;}let m=0;while(y<p.y-50&&m<300){vy+=0.65;x+=vx;y+=vy;m++;}return {x,m};};
    const mine=falling.map(a=>({l:land(a)})).filter(q=>!st.baskets.filter(o=>o!==b).some(o=>Math.abs(o.xRaw/F-q.l.x)<Math.abs(p.x+16-q.l.x))).sort((q,r)=>q.l.m-r.l.m)[0];
    if(mine){const x=p.x+16;if(mine.l.x>x+3)inp.right=true;else if(mine.l.x<x-3)inp.left=true;}});
   R.step(s,inputs);}
  assert.equal(s.keyActive,true,'count '+n);assert.equal(st.controller.caught,st.controller.needed);assert.ok(i<3300);}
});
