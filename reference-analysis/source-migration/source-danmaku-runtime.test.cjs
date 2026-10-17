'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('./source-danmaku-runtime.js'),S=require('./source-shooting-runtime.js'),R=require('./source-stage-runtime.js'),pop=require('./population-rules.cjs');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actorsFor=(id,n)=>pop.actorsForCount(pop.selectVariant(source.stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),n);
const mk=(n,id='st_w_11_01')=>R.create(R.compile({source,geometry,count:n,stageId:id}));

test('11-1 / 11-3 data: shared HP per count, phases, emitters, modifiers per count, four Through beams',()=>{
 assert.deepEqual([2,3,4,5,6,7,8].map(n=>D.compile(actorsFor('st_w_11_01',n),n).observer.hp),[2,2,3,3,3,4,4]);
 assert.deepEqual([2,3,4,5,6,7,8].map(n=>D.compile(actorsFor('st_w_11_03',n),n).observer.hp),[2,2,3,3,4,4,5]);
 const a=D.compile(actorsFor('st_w_11_01',2),2),b=D.compile(actorsFor('st_w_11_03',2),2);
 assert.deepEqual(a.observer.phases.map(p=>[p.timeRaw/F,p.targets.join('+')]),[[15,'E_P_1_1'],[15,'E_P_2_1+E_P_2_2'],[0,''],[0,'']]);
 assert.deepEqual(b.observer.phases.map(p=>[p.timeRaw/F,p.targets.join('+')]),[[15,'E_P_1_1+E_P_1_2'],[25,'E_P_2_1+E_P_2_2'],[0,''],[0,'']]);
 assert.equal(a.observer.targetName,'Key1');assert.deepEqual(a.observer.ui,{x:0,y:476,scale:a.observer.ui.scale});
 const e=a.emitters.find(q=>q.name==='E_P_2_2').param;
 assert.deepEqual([e.velocityRaw,e.sizeRaw,e.r,e.g,e.b,e.fireRateRaw,e.count,e.diffusionRaw,e.random,e.rotateMode,e.rotateValueRaw],[170*F,4*F,31,143,255,F,1,360*F,true,2,6553]);
 const m=a.modifiers.find(q=>q.name==='M_P_2_1');assert.deepEqual([m.mode,m.mul.velocity,m.mul.angVel,m.mul.fireRate,m.mul.count,m.mul.fireTime,m.locatorName],[1,F,78643,78643,F,F,'DanmakuLocator1']);
 assert.deepEqual(a.thunders.map(t=>[t.x,t.y,t.direction,t.through]),[[1392,1032,2,true],[600,1008,0,true],[624,216,3,true],[1416,240,1,true]]);
});
test('createBullet 0x181811380: the hit square 1 -> 3, 1.5 -> 4, 3.5 -> 11, 4 -> 13 px; 120 px/s is 2 px a frame',()=>{
 const P={r:1,g:2,b:3,angVelRaw:-10*F,sizeRaw:0,velocityRaw:120*F},l={x:5*F,y:6*F};
 assert.deepEqual([1,1.5,3.5,4].map(v=>D.bulletParam({...P,sizeRaw:Math.trunc(v*F)},l,{xRaw:0,yRaw:0}).sizePx),[3,4,11,13]);
 const q=D.bulletParam(P,l,{xRaw:120*F,yRaw:0});assert.deepEqual([q.veloRaw.xRaw,q.angVelRaw,q.xRaw,q.color.join()],[Math.trunc(120*F*1092/F),Math.trunc(-10*F*1092/F),5*F,'1,2,3']);
});
test('11-1 timeline (notes 8): warm-up to state 1 on update 301, E_P_1_1 fires 47 / 93 / 138 / 182 after enabling, 25 volleys, the last at 877',()=>{
 const s=mk(2),st=s.danmakuState,o=st.observer,L1=st.locators[0];o.hp=999;const fires=[],log=[];let prev=0,enable=-1;
 for(let f=1;f<=1210;f++){const t0=L1.rw.fireRateTimer;R.step(s,{});if(enable<0&&o.state===2)enable=f;
  if(o.phase===0&&o.state===2&&L1.rw.fireRateTimer===0&&t0>0)fires.push({k:f-enable,time:L1.time,rate:st.modifiers[0].param.fireRateRaw});
  if(o.state!==prev){log.push(f+':'+o.state);prev=o.state;}}
 assert.deepEqual(log.slice(0,5),['301:1','302:2','1203:3','1204:1','1205:2']);
 assert.equal(fires.length,25);assert.deepEqual(fires.slice(0,4).map(x=>x.k),[47,93,138,182]);assert.deepEqual([fires[0].time,fires[0].rate,fires[24].k,fires[24].rate],[52416,51088,877,26919]);
 assert.equal(D.baseRotation({rotateMode:2,rotateValueRaw:16384},{time:52416}),41167);
});
test('a volley of E_P_1_1: five bullets 82296 rad raw apart from -205740, 2 px a frame out of the centre',()=>{
 const st=D.create(D.compile(actorsFor('st_w_11_01',2),2));D.start(st);const P={...st.modifiers[0].param},l={...st.locators[0],time:0,rw:{enable:1,fireRateTimer:0,fireTimer:0}};
 const out=[];P.fireRateRaw=1;D.fire(l,P,1092,v=>out.push(v));assert.equal(out.length,5);
 out.forEach((v,i)=>{const want=D.rotate({xRaw:F,yRaw:0},i*82296-205740);assert.deepEqual(v,{xRaw:want.xRaw*120,yRaw:want.yRaw*120});
  assert.ok(Math.abs(Math.hypot(v.xRaw,v.yRaw)-120*F)<512);});
});
test('CreateRandom 0x181811140 is deterministic and in 0..65535; E_P_2_2 (Random) spreads by it',()=>{
 const xs=[0,1,F,123456,7*F+99].map(D.createRandom);assert.deepEqual(xs,[0,1,F,123456,7*F+99].map(D.createRandom));assert.ok(xs.every(v=>v>=0&&v<65536));
});
test('Modifier PhaseProgress: FireRate (o << 16) / 2 at the end, the multiplied count rounds up',()=>{
 const m={mode:1,mul:{velocity:F,angVel:78643,fireRate:131072,count:98304,fireTime:F},origin:{velocityRaw:120*F,angVelRaw:-25*F,fireRateRaw:52428,count:3,fireTimeRaw:F},param:{}};
 D.parameterUpdate(m,F);assert.deepEqual([m.param.fireRateRaw,m.param.count,m.param.angVelRaw],[26214,5,-1966075]);// >> 16 floors
 D.parameterUpdate(m,0);assert.deepEqual([m.param.fireRateRaw,m.param.count],[52428,3]);
 D.parameterUpdate(m,32768);assert.deepEqual([m.param.fireRateRaw,m.param.count],[39321,4]);
});
test('a bullet hit takes 1 shared HP while the Observer is below state 4; HP 0 -> everyone dies on the next update',()=>{
 const s=mk(3),st=s.danmakuState,o=st.observer;assert.equal(o.hp,2);
 assert.equal(D.bulletHit(st),true);assert.equal(o.hp,1);o.state=4;assert.equal(D.bulletHit(st),false);assert.equal(o.hp,1);
 const t=mk(3);t.danmakuState.observer.hp=0;R.step(t,{});assert.equal(t.status,'dead');assert.equal(t.failure.reason,'체력이 다 떨어졌어요');
});
test('DanmakuThunder: the beam takes 1 HP from a touching player, then 0.5 s of cooldown for that player only',()=>{
 const s=mk(4),st=s.danmakuState,o=st.observer;o.hp=50;const p=s.players[0];
 const hits=[];for(let i=0;i<100;i++){const hp=o.hp;R.step(s,{[p.id]:{left:true}});if(o.hp!==hp)hits.push(i);}
 assert.ok(hits.length>=3);assert.deepEqual(hits.slice(1).map((h,k)=>h-hits[k]),hits.slice(1).map(()=>31));// 32768 - 30 * 1092 > 0
});
test('bullets turn by AngularVelocity every frame (11-3 E_P_1_1: -10 deg/s) and the pool caps at its size',()=>{
 const st=S.create(S.compile(actorsFor('st_w_11_03',2),2));assert.equal(st.pool,70);
 const rng={state:'9600629759793949339',inc:'15726070495360670683'};
 S.createDanmakuBullet(st,{xRaw:1000*F,yRaw:600*F,veloRaw:{xRaw:2*F,yRaw:0},angVelRaw:Math.trunc(-10*1092),sizePx:4,color:[1,2,3]},rng);
 const host={dtRaw:1092,viewRaw:{x:0,w:2016*F},rng,players:[],mapBlocked:()=>false};for(let i=0;i<60;i++)S.step({...st,started:true,spawners:[]},host);
 const b=st.bullets[0];const ang=Math.atan2(b.veloRaw.yRaw,b.veloRaw.xRaw)*180/Math.PI;assert.ok(Math.abs(ang+10)<0.2,'turned '+ang);
 for(let i=0;i<80;i++)S.createDanmakuBullet(st,{xRaw:0,yRaw:0,veloRaw:{xRaw:0,yRaw:0},angVelRaw:0,sizePx:4,color:[0,0,0]},rng);assert.equal(st.bullets.length,70);
});
// HP raised for the walk (dodging is the players' part): the phases, the key on event 61,
// everyone to the door away from the beams.
for(const id of ['st_w_11_01','st_w_11_03'])test(id+' with 2 and 8 players (HP raised): phases run out, the key wakes, everyone enters the door',()=>{
 for(const n of [2,8]){const s=mk(n,id),st=s.danmakuState;st.observer.hp=9999;let i=0;
  for(;i<4000&&s.status==='play'&&!s.players.every(p=>p.exit);i++){const inp={};
   if(s.keyActive){const key=s.map.key,g=s.map.exit,held=s.keyState&&s.keyState.holderId;
    s.players.forEach((p,k)=>{if(p.exit)return;const t={};inp[p.id]=t;const fetch=!held&&!s.goalOpen;if(fetch&&k>0||!s.goalOpen&&held&&held!==p.id)return;// the others wait: touching the holder passes the key on
     const tx=fetch?key.x+16:g.x+g.w/2,ty=fetch?key.y+key.h:s.goalOpen?g.y+g.h-2:g.y+g.h+60,x=p.x+16,y=p.y+47;
     if(x<tx-3)t.right=true;else if(x>tx+3)t.left=true;if(y<ty-3)t.down=true;else if(y>ty+3)t.up=true;
     if(s.goalOpen&&p.x<g.x+g.w&&g.x<p.x+p.w&&p.y<g.y+g.h&&g.y+6<p.y+p.h){t.up=true;t.down=false;}});}// up moves first in top view: stay inside after it
   R.step(s,inp);}
  assert.equal(s.status,'clear',id+' count '+n+' '+(s.failure&&s.failure.reason)+' state '+st.observer.state);assert.equal(st.observer.state,5);assert.ok(9999-st.observer.hp>0,'bullets hit');}
});
