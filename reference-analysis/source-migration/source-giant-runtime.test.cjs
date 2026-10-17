'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('./source-giant-runtime.js'),R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const acts=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_14_04'}));
const pl=(index,x,y,o={})=>({index,xRaw:Math.round(x*F),yRaw:Math.round(y*F),lookLeft:false,state1:true,shotHeld:false,alive:true,...o});

test('14-4 data: life 5(n-1)+1, speed 3, attack every 2 s, hand 500 px at 3 + 1.8, scale 1.1, no punch for player 1',()=>{
 for(const n of [2,3,4,5,6,7,8]){const c=G.compile(acts('st_w_14_04'),n),g=c.giants[0];
  assert.equal(g.life,5*(n-1)+1,'count '+n);
  const st=G.create(c,{playerCount:n});assert.deepEqual(st.punches.map(p=>p.actorIndex).sort(),[...Array(n).keys()].slice(1));}
 const g=G.compile(acts('st_w_14_04'),2).giants[0];
 assert.deepEqual([g.speedRaw,g.attackRaw,g.rangeRaw,g.extraRaw,g.scaleXRaw,g.turnRaw,g.flags],[3*F,2*F,500*F,0x1cccc,72089,98304,0]);
 const t=G.compile(acts('st_w_14_04'),2).timers[0];assert.deepEqual([t.timerRaw,t.target],[5*F,'GiantEnemy1']);
 const h=G.create(G.compile(acts('st_w_14_04'),2),{playerCount:2}).giants[0].hand;
 assert.deepEqual([h.offBaseXRaw,h.offBaseYRaw,h.scaleRaw,h.speedMaxRaw],[Math.trunc(72089*-80),Math.trunc(72089*-88),72089,3*F+0x1cccc]);
});
test('FPMath.Atan2 0x181640930 quadrants; EulerZ on (56, 0, 0)',()=>{
 assert.equal(G.atan2Raw(0,-5*F),0x3243f);assert.equal(G.atan2Raw(0,5*F),0);assert.equal(G.atan2Raw(3*F,0),0x1921f);assert.equal(G.atan2Raw(-3*F,0),-0x1921f);
 assert.ok(G.atan2Raw(-F,-F)<-0x1921f);
 const r=G.rotateX(56*F,0);assert.deepEqual(r,{xRaw:56*F,yRaw:0});
 const l=G.rotateX(56*F,180*F);assert.ok(Math.abs(l.xRaw+56*F)<256&&Math.abs(l.yRaw)<0.2*F);// 180 deg * 0x477 is not exactly PI
});
test('DamageManage 0x18180d5c0: one entry per (sender, event); refused until its age reaches 8/60 s',()=>{
 const st=G.create(G.compile(acts('st_w_14_04'),2),{playerCount:2});st.timeRaw=0;
 assert.equal(G.damageCheck(st,'g','a',20),true);assert.equal(G.damageCheck(st,'g','a',20),false);assert.equal(G.damageCheck(st,'g','b',20),true);
 st.timeRaw=8*1092;assert.equal(G.damageCheck(st,'g','a',20),false);// 8736 < 8738
 st.timeRaw=9*1092;assert.equal(G.damageCheck(st,'g','a',20),true);
});
test('the giant sleeps until the 5 s timer (event 61), then walks 3 px a frame toward the players',()=>{
 const s=mk(2),g=s.giantState.giants[0];let woke=-1;
 for(let i=0;i<400&&woke<0;i++){R.step(s,{});if(g.phase>=1)woke=i;}
 assert.ok(woke>=299&&woke<=301,'woke '+woke);
 const x0=g.baseXRaw;R.step(s,{});assert.equal(g.baseXRaw-x0,196560);// mul(mul(1092, 3), 60)
});
test('the key rides on the giant at (key - giant), and stays where it is once the giant is gone',()=>{
 const s=mk(2),g=s.giantState.giants[0];R.step(s,{});
 assert.equal(s.keyState.holderId,g.id);assert.deepEqual(g.keyOffset,{xRaw:-169*F,yRaw:-79*F});
 for(let i=0;i<400;i++)R.step(s,{});
 const k=s.keyState;assert.ok(Math.abs(k.xRaw-(g.xRaw-169*F))<40*F,'key follows');// eases 0x1999 a frame: ~27 px behind at 3 px a frame
 g.life=1;g.dead=false;const st=s.giantState;
 // a punch lands: life 0 -> phase 3, gone 1 s later
 G.step(st,{dtRaw:1092,players:[]});
 st.punches[0].attacking=true;st.punches[0].hit=true;st.punches[0].synced=true;st.punches[0].frame=2;st.punches[0].lookLeft=true;
 st.punches[0].xRaw=g.xRaw+180*F;st.punches[0].yRaw=g.yRaw-100*F;// reaches collision 1 (right edge +132, y -310..-20)
 G.step(st,{dtRaw:1092,players:[]});assert.equal(g.dead,true);assert.equal(g.collisionsOn,false);assert.equal(g.hand.phase>=4,true);
 let n=0;while(!g.gone&&n<100){R.step(s,{});n++;}assert.ok(n>=60&&n<=62,'gone after '+n);
 const kx=k.xRaw;for(let i=0;i<30;i++)R.step(s,{});assert.equal(k.xRaw,kx);// no holder: the key waits in the air
});
test('touching the giant is event 43',()=>{
 const s=mk(2),g=s.giantState.giants[0];R.step(s,{});
 const p=s.players[0];p.x=g.xRaw/F+100;p.y=g.yRaw/F-47;R.step(s,{});
 assert.equal(s.status,'dead');assert.equal(s.failure.reason,'거인에게 닿았어요');
});
test('a punch: shot press, 4 hit frames, one life off per punch, recharge 1.5 s',()=>{
 const st=G.create(G.compile(acts('st_w_14_04'),2),{playerCount:2}),g=st.giants[0];
 const at=(shot)=>[pl(0,900,480),pl(1,g.xRaw/F+170,g.yRaw/F+17,{lookLeft:true,shotHeld:shot})];
 G.step(st,{dtRaw:1092,players:at(false)});
 let hits=[],lives=[];for(let i=0;i<12;i++){G.step(st,{dtRaw:1092,players:at(i===0)});hits.push(st.punches[0].hit&&st.punches[0].attacking?1:0);lives.push(g.life);}
 assert.deepEqual(hits.slice(0,5),[1,1,1,1,0]);assert.deepEqual(lives.slice(0,3),[6,5,5]);assert.equal(g.life,5);
 // pressing again while recharging does nothing
 for(let i=0;i<60;i++)G.step(st,{dtRaw:1092,players:at(i%2===0)});assert.equal(g.life,5);
 let again=-1;for(let i=0;i<60&&again<0;i++){G.step(st,{dtRaw:1092,players:at(i%2===0)});if(g.life===4)again=i;}
 assert.ok(again>=0,'punches again after the recharge');
});
test('a punch on another player is event 27: (8, -4) away from the puncher',()=>{
 const s=mk(2);R.step(s,{});s.giantState.giants[0].baseXRaw=-5000*F;
 const a=s.players[1],b=s.players[0];a.x=1500;a.y=432.5;b.x=1450;b.y=432.5;a.facingLeft=true;
 R.step(s,{});R.step(s,{[a.id]:{shot:true}});R.step(s,{});
 assert.equal(b.forcedVx,-8*60);assert.ok(b.vy<0);
});
test('the hand flies 500 px at 4.8 px a frame, then eases back',()=>{
 const st=G.create(G.compile(acts('st_w_14_04'),2),{playerCount:2}),g=st.giants[0],h=g.hand;
 const ps=[pl(0,g.xRaw/F+400,g.yRaw/F+17),pl(1,g.xRaw/F+600,g.yRaw/F+17)];
 G.step(st,{dtRaw:1092,players:ps});g.phase=1;g.attackTimerRaw=2*F;
 let fly=-1,back=-1,x0=0;
 for(let i=0;i<300&&back<0;i++){G.step(st,{dtRaw:1092,players:ps.map(p=>({...p,xRaw:p.xRaw+(g.baseXRaw-st.giants[0].baseXRaw)}))});
  if(fly<0&&h.phase===2){fly=i;x0=h.xRaw;}if(fly>=0&&h.phase===3&&back<0)back=i;}
 assert.ok(fly>=0&&back>fly);assert.ok(Math.abs(back-fly-Math.ceil(500/4.8))<=2,'frames '+(back-fly));
 assert.equal(h.speedRaw,h.speedMaxRaw);
});
test('14-4 with two players: the one puncher brings life 6 down while backing off, then the key opens the door',()=>{
 const s=mk(2),st=s.giantState,g=st.giants[0];R.step(s,{});assert.equal(g.life,6);let i=0,minD=1e9;
 for(;i<4000&&!g.gone&&s.status==='play';i++){const inp={};
  s.players.forEach((pl,k)=>{const p=st.punches.find(q=>q.actorIndex===k),d=pl.x+16-g.xRaw/F;
   if(!p){inp[pl.id]=d<260?{right:true}:{};return;}minD=Math.min(minD,d);
   // left + shot on one frame (Player Update looks left before the punch's OnUpdate); the hit
   // lands next frame on the rect synced at this OnPost, so backing off right away is safe.
   // Collision 0 at scale 1.1 ends 123.2 px in front, collision 1 145.2 px: 167.2 < d < 202.2.
   if(p.attacking){inp[pl.id]=d<198?{right:true}:{};return;}
   if(p.chargeRaw>=F&&d<202&&d>168){inp[pl.id]={left:true,shot:true};return;}
   if(d<198)inp[pl.id]={right:true};else if(d>215)inp[pl.id]={left:true};});
  R.step(s,inp);}
 assert.equal(s.status,'play',s.failure&&s.failure.reason);assert.equal(g.gone,true);assert.ok(minD>161.2,'kept clear of collision 1 at scale 1.1 ('+minD+')');
 const k=s.keyState,other=s.players[0];other.x=k.xRaw/F-16;other.y=k.yRaw/F-30;other.vy=0;R.step(s,{});R.step(s,{});
 assert.equal(k.holderId,other.id);assert.equal(s.keyTaken,true);
 other.x=s.map.exit.x;other.y=s.map.exit.y+s.map.exit.h-46;for(let j=0;j<120&&!s.goalOpen;j++)R.step(s,{});
 assert.equal(s.goalOpen,true);
});
test('AddActor -> SetBaseScale: the giant and hand collisions take the actor scale (1.1), the key copy does not',()=>{
 const st=G.create(G.compile(acts('st_w_14_04'),2),{playerCount:2}),g=st.giants[0];G.step(st,{dtRaw:1092,players:[]});
 const d=G.displays(st),r1=d.giants[0].rects[1],x=g.xRaw/F;
 assert.ok(Math.abs(r1.x-(x-134.2))<0.01&&Math.abs(r1.w-279.4)<0.01,JSON.stringify(r1));
 assert.ok(Math.abs(d.hands[0].circle.r-52.8)<0.01);
 G.attachKey(st,'GiantEnemy1',{xRaw:g.xRaw-169*F,yRaw:g.yRaw-79*F});assert.deepEqual(G.keyBoxes(st)[0].w,222);
});
