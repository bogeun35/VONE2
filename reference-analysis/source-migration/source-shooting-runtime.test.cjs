'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('./source-shooting-runtime.js'),R=require('./source-stage-runtime.js'),pop=require('./population-rules.cjs');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actorsFor=(id,n)=>pop.actorsForCount(pop.selectVariant(source.stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),n);
const mk=(n,id='st_w_06_01')=>R.create(R.compile({source,geometry,count:n,stageId:id}));
const rngOf=()=>({state:'9600629759793949339',inc:'15726070495360670683'});
const host=o=>({dtRaw:1092,viewRaw:{x:0,w:1280*F},rng:rngOf(),players:[],mapBlocked:()=>false,...o});

test('6-1 spawners: path of three points, 3 enemies, 1 s apart, stop offset 50, nearest player, attack 1.5, active',()=>{
 const c=S.compile(actorsFor('st_w_06_01',2),2),sp=c.spawners[0];
 assert.deepEqual(sp.path.map(p=>[p.xRaw/F,p.yRaw/F]),[[-500,0],[0,432],[-1200,432]]);
 assert.deepEqual([sp.count,sp.intervalRaw,sp.stopOffset,sp.timing,sp.direction,sp.attackSpeedRaw,sp.bulletVelocityRaw,sp.active,sp.rangeRaw],[3,F,50,0,3,98304,F,true,0]);
 assert.equal(c.pool,32);
});
test('createCache: enemy i stops 50 * i px before the end; interval (1.5 << 16) / 1.5 = 1 s, bullets 3 px a frame',()=>{
 const st=S.create(S.compile(actorsFor('st_w_06_01',2),2));S.start(st,{rng:rngOf(),colors:[0,1],validColors:[0,1]});
 assert.equal(st.enemies.length,6);
 const ends=st.enemies.slice(0,3).map(e=>{const p=e.path[e.path.length-1];return [Math.round(p.xRaw/F),Math.round(p.yRaw/F)];});
 assert.deepEqual(ends,[[-1200,432],[-1150,432],[-1100,432]]);
 assert.deepEqual([st.enemies[0].intervalRaw,st.enemies[0].bulletSpeedRaw,st.enemies[0].life],[F,3*F,2]);
});
test('spawner OnUpdate: the first enemy on the first update, then every 61; segments 209 / 276 / 500 frames',()=>{
 const st=S.create(S.compile(actorsFor('st_w_06_01',2),2));S.start(st,{rng:rngOf(),colors:[0,1],validColors:[0,1]});
 const on=[];const e0=st.enemies[0];let seg=[],last=0;
 for(let i=1;i<=1100;i++){S.step(st,host({viewRaw:{x:e0.xRaw-600*F,w:1280*F}}));st.enemies.slice(0,3).forEach((e,k)=>{if(e.active&&on[k]===undefined)on[k]=i;});if(e0.idx!==last){seg.push(i);last=e0.idx;}}
 assert.deepEqual(on,[1,62,123]);assert.deepEqual([seg[0],seg[1]-seg[0],seg[2]-seg[1]],[209,276,500]);
});
test('shootAttackUpdate: the first shot 61 updates after switching on, aimed at the nearest player',()=>{
 const st=S.create(S.compile(actorsFor('st_w_06_01',2),2));S.start(st,{rng:rngOf(),colors:[0,1],validColors:[0,1]});
 const near={index:0,xRaw:1000*F,yRaw:144*F,alive:true,bodyRaw:null},far={index:1,xRaw:200*F,yRaw:600*F,alive:true,bodyRaw:null};let shot=-1;
 for(let i=1;i<=80&&shot<0;i++){S.step(st,host({players:[near,far]}));if(st.bullets.some(b=>b.active))shot=i;}
 assert.equal(shot,61);const b=st.bullets[0],e=st.enemies[0];assert.ok(b.veloRaw.xRaw<0&&Math.abs(b.veloRaw.yRaw)<F,'towards the near player');
 assert.ok(Math.abs(Math.hypot(b.veloRaw.xRaw,b.veloRaw.yRaw)-3*F)<8);
});
test('two player bullets (event 21) -> life 0 -> a 0.5 s blast -> gone; a touch damages the player and blasts the enemy',()=>{
 const st=S.create(S.compile(actorsFor('st_w_06_01',2),2));S.start(st,{rng:rngOf(),colors:[0,1],validColors:[0,1]});S.step(st,host());
 const e=st.enemies[0];assert.equal(S.enemyHit(st,e.id),true);assert.equal(e.life,1);S.enemyHit(st,e.id);S.step(st,host());
 assert.equal(e.disappear,true);let n=0;while(!e.gone&&n<60){S.step(st,host());n++;}assert.ok(n>=29&&n<=31,'blast '+n);
 const st2=S.create(S.compile(actorsFor('st_w_06_01',2),2));S.start(st2,{rng:rngOf(),colors:[0,1],validColors:[0,1]});S.step(st2,host());
 const e2=st2.enemies[0],body={x:e2.xRaw-10*F,y:e2.yRaw-10*F,w:32*F,h:46*F};const r=S.step(st2,host({players:[{index:0,xRaw:e2.xRaw,yRaw:e2.yRaw,alive:true,bodyRaw:body}]}));
 assert.deepEqual(r.damage,[{player:0}]);assert.equal(e2.disappear,true);
});
test('OptimizedBullet: 6 s of life, out at view x +- 10, gone without moving on the map, a 0.1 s fade',()=>{
 const st={...S.create(S.compile(actorsFor('st_w_06_01',2),2)),started:true,spawners:[]};
 const shoot=(x,vx)=>{st.bullets=[{active:true,fading:false,timerRaw:6*F,xRaw:x,yRaw:300*F,veloRaw:{xRaw:vx,yRaw:0}}];return st.bullets[0];};
 let b=shoot(600*F,0);let n=0;while(!b.fading&&n<400){S.step(st,host());n++;}assert.equal(n,361);
 b=shoot(1285*F,3*F);S.step(st,host());assert.deepEqual([b.fading,b.xRaw],[false,1288*F]);// 1288 < 1280 + 10
 S.step(st,host());assert.deepEqual([b.fading,b.xRaw],[true,1288*F]);// 1291 is out: gone where it was
 b=shoot(-7*F,-3*F);S.step(st,host());assert.equal(b.fading,false);S.step(st,host());assert.equal(b.fading,true);// -10 in, -13 out
 b=shoot(600*F,3*F);S.step(st,host({mapBlocked:()=>true}));assert.deepEqual([b.fading,b.xRaw],[true,600*F]);
 n=0;while(b.active&&n<20){S.step(st,host());n++;}assert.equal(n,7);// 6553 - 7 * 1092 <= 0
});
test('MapBlockReplacer: the k-th colour met becomes gun colours[k % n]; MapBreakBlockRect paints a random gun colour',()=>{
 const s=mk(2),st=s.shootingState;R.step(s,{});
 const col=x=>st.chips[x+',5']-0x1e;assert.deepEqual([39,40,41,42,43,44,45,46].map(col),[0,1,0,1,0,1,0,1]);
 assert.deepEqual([3,4,5].map(n=>{const t=mk(n);R.step(t,{});return [39,40,41,42,43,44,45,46].map(x=>t.shootingState.chips[x+',5']-0x1e).join('');}),['01201201','01230123','01234012']);
 assert.ok([0,1].includes(st.chips['53,1']-0x1e)&&st.chips['53,1']===st.chips['54,13']);
});
test('6-1 with two (immortal) planes: tunnel through the colour pillars, take the key, both enter the door',()=>{
 const s=mk(2),st=s.shootingState;for(const p of s.players)p.immortal=true;const ROWS=[2,3];let i=0;
 const head=r=>{let best=null;for(const [k,v] of Object.entries(st.chips)){const [x,y]=k.split(',').map(Number);if(y===r&&(best===null||x<best.x))best={x,c:v-30};}return best;};
 for(;i<4000&&s.status==='play'&&!s.players.every(p=>p.exit);i++){const inp={},cam=s.autoScrollState.cameraAreaRaw.x/F,heads=ROWS.map(r=>({r,h:head(r)})),open=heads.every(h=>!h.h);
  s.players.forEach((p,k)=>{if(p.exit)return;const x=p.x+16,y=p.y+47,t={};inp[p.id]=t;let ty,tx;const other=s.players.find((q,j)=>j!==k&&!q.exit);
   if(!open){const mine=heads.filter(h=>h.h&&h.h.c===k).sort((a,b)=>a.h.x-b.h.x)[0],oh=heads.filter(h=>h.h&&h.h.c!==k).sort((a,b)=>a.h.x-b.h.x)[0];
    if(mine&&(!oh||mine.h.x<=oh.h.x||k===0)){ty=mine.r*48+44;tx=Math.min(cam+200,mine.h.x*48-120);if(Math.abs(y-ty)<3&&i%2===0&&!(other&&other.x>p.x&&Math.abs(other.y-p.y)<40))t.shot=true;}
    else{const busy=oh?oh.r:ROWS[0],free=ROWS.find(r=>r!==busy);ty=free*48+48;tx=other?Math.min(other.x+16-60,cam+150):cam+150;}}
   else{const key=s.map.key,g=s.map.exit,held=s.keyState&&s.keyState.holderId;
    if(x<62*48+40){ty=ROWS[k%2]*48+48;tx=1e9;}else{const tg=!s.goalOpen&&!held?{x:key.x+16,y:key.y+51}:{x:g.x+g.w/2,y:g.y+g.h};ty=tg.y;tx=tg.x;if(Math.abs(x-tx)<5&&s.goalOpen)t.up=true;}}
   if(x<tx-4)t.right=true;else if(x>tx+4)t.left=true;if(y<ty-1)t.down=true;else if(y>ty+1)t.up=true;});
  R.step(s,inp);}
 assert.equal(s.status,'clear',s.failure&&s.failure.reason);assert.ok(i<2500,'frames '+i);
});
test('6-2 rider: the walker standing on a battle plane rises, sinks and slides with it',()=>{
 const s=mk(2,'st_w_06_02'),[pl,w]=s.players;for(const p of s.players)p.immortal=true;
 for(let i=0;i<40;i++)R.step(s,{});assert.equal(w.supportId,pl.id);
 const gap=()=>pl.y-(w.y+w.h),dx=()=>w.x-pl.x,d0=dx();
 for(const dir of ['up','down','right','left']){for(let i=0;i<20;i++)R.step(s,{[pl.id]:{[dir]:true}});assert.ok(Math.abs(gap())<0.01&&w.supportId===pl.id,dir+' gap '+gap());assert.ok(Math.abs(dx()-d0)<0.01,dir+' slid '+(dx()-d0));}
});
test('6-2 with one battle plane and its rider (immortal): dig rows 6-7, fetch the key from the ledge, both enter the door',()=>{
 const s=mk(2,'st_w_06_02'),st=s.shootingState,[plane,walker]=s.players;for(const p of s.players)p.immortal=true;let i=0,phase='dig';
 const chipsIn=(r,c0,c1)=>Object.keys(st.chips).filter(k=>{const [x,y]=k.split(',').map(Number);return y===r&&x>=c0&&x<=c1;}).length;
 for(;i<4000&&s.status==='play'&&!s.players.every(p=>p.exit);i++){const cam=s.autoScrollState.cameraAreaRaw.x/F,P={},W={};
  const feet=walker.y+walker.h,wx=walker.x+16,px=plane.x+16,onPlane=walker.grounded&&walker.supportId===plane.id;let pty=null,ptx=null;
  if(phase==='dig'&&!onPlane&&i<60){}
  else if(phase==='dig'){const r6=chipsIn(6,39,46),r7=chipsIn(7,39,46);// from left of the pillar: a bullet clears the first chip of its row
   if(!r6&&!r7)phase='fly';else{pty=r6?336:384;ptx=Math.min(cam+260,1832);if(onPlane&&Math.abs(feet-pty)<2&&i%2===0)W.shot=true;}}
  if(phase==='fly'){pty=336;ptx=Math.max(cam+300,2372);if(px>3200)phase='ledge';}
  if(phase==='ledge'){pty=140;ptx=3583;const left=chipsIn(2,75,76);
   if(onPlane&&Math.abs(feet-140)<3&&Math.abs(px-ptx)<4){if(left){if(i%2===0)W.shot=true;}else W.right=true;}
   if(!onPlane){if(s.keyState&&s.keyState.holderId)phase='back';else W.right=true;}}
  if(phase==='back'){pty=147;ptx=3583;if(!onPlane)W.left=true;else if(Math.abs(wx-px)<6)phase='goal';else if(wx>px)W.left=true;else W.right=true;}
  if(phase==='goal'){const g=s.map.exit,gx=g.x+g.w/2;
   if(!walker.exit){pty=g.y+g.h;ptx=(px<3860&&walker.y<200)?px:gx;if(onPlane&&Math.abs(wx-gx)<6&&Math.abs(feet-pty)<2&&s.goalOpen)W.up=true;if(onPlane&&wx<px-4)W.right=true;else if(onPlane&&wx>px+4)W.left=true;}
   else{pty=g.y+g.h-47;ptx=gx;if(Math.abs(px-gx)<5&&Math.abs(plane.y+47-(g.y+g.h))<3)P.up=true;}}
  if(pty!==null){if(plane.y<pty-1)P.down=true;else if(plane.y>pty+1)P.up=true;}
  if(ptx!==null){if(px<ptx-3)P.right=true;else if(px>ptx+3)P.left=true;}
  R.step(s,{[plane.id]:P,[walker.id]:W});}
 assert.equal(s.status,'clear',s.failure&&s.failure.reason);assert.ok(i<2600,'frames '+i);
});
