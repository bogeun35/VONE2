'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('./source-boss-runtime.js'),P=require('./source-plane-runtime.js'),S=require('./source-shooting-runtime.js'),R=require('./source-stage-runtime.js'),pop=require('./population-rules.cjs');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actorsFor=(id,n)=>pop.actorsForCount(pop.selectVariant(source.stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),n);
const mk=(id,n,opts)=>R.create(R.compile({source,geometry,count:n,stageId:id}),opts);
const immortal=s=>{for(const p of s.players)p.immortal=true;return s;};
// run until the boss wakes (k), then record its three states every update
function timeline(id,n,frames){const s=immortal(mk(id,n)),st=s.bossState,ev=[],shots=[];let k=-1;
 for(let i=1;i<=frames&&s.status==='play';i++){const before=s.shootingState.bullets.map(b=>b.active);R.step(s,{});
  if(k<0&&st.bosses[0].behaviour.state>=1)k=i;
  for(const b of st.bosses)ev.push({i,k,kind:b.kind,b:b.behaviour.state,a:b.attack.state,m:b.move.state});
  s.shootingState.bullets.forEach((b,j)=>{if(b.active&&!before[j]&&b.timerRaw===6*F-1092&&st.bosses.some(q=>q.pos&&Math.abs(b.xRaw-b.veloRaw.xRaw-q.pos.xRaw-(q.kind==='boss'?-199:155)*F)<2))shots.push({rel:i-k,velo:b.veloRaw,target:b.target});});}
 const first=(kind,f)=>{const e=ev.find(x=>x.kind===kind&&x.k>0&&f(x));return e?e.i-e.k:null;};
 return {s,k,ev,shots,first};}

test('6-4 / 15-3 data: HP per count, the low-HP thresholds (IsLowHP 0x1816f8d80), cores per count',()=>{
 const low=(id,kind)=>[2,3,4,5,6,7,8].map(n=>{const b=B.compile(actorsFor(id,n),n).bosses.find(q=>q.kind===kind);let lo=0;for(let hp=b.hpMax;hp>0;hp--){b.hp=hp;if(B.isLowHP(b)){lo=hp;break;}}return lo;});
 assert.deepEqual(low('st_w_06_04','boss'),[36,48,78,99,102,114,126]);
 assert.deepEqual(low('st_w_15_03','boss'),[30,51,72,78,84,90,96]);
 assert.deepEqual(low('st_w_15_03','ex'),[30,51,81,81,93,93,105]);
 assert.deepEqual([2,3,4,5,6,7,8].map(n=>B.compile(actorsFor('st_w_06_04',n),n).bosses[0].cores),[1,1,2,2,2,3,3]);
 const c=B.compile(actorsFor('st_w_15_03',2),2),ex=c.bosses.find(b=>b.kind==='ex');
 assert.deepEqual([ex.attackSpeedRaw,ex.moveHeightRaw/F,ex.entry.xRaw/F,ex.activeScrollXRaw/F,ex.easyCount,ex.targetName],[6553,45,385,800,30,'SwitchTargetGroup1']);
 assert.deepEqual(c.guards.map(g=>[g.playerIndex,g.type,g.direction,g.flip]),[[1,1,3,true]]);
 assert.deepEqual([2,3,4,8].map(n=>B.compile(actorsFor('st_w_06_04',n),n).apples.map(a=>a.validCount).join()),['5,15','5,15,15','5,15,15,5','5,5,15,15,15,15,5,5']);// actor order: Apple1, 8, 7, 3, 5, 2, 6, 4
});
test('6-4 boss timeline (notes 12): wakes on update 801, arrives k + 198, first pair k + 324 straight up / down, then -30051 at k + 346, 14 pairs',()=>{
 const T=timeline('st_w_06_04',2,1500);assert.equal(T.k,801);
 assert.equal(T.first('boss',x=>x.m===2),198);assert.equal(T.first('boss',x=>x.b===3&&x.a===8),229);assert.equal(T.first('boss',x=>x.a===1),291);assert.equal(T.first('boss',x=>x.a===2),323);
 const pairs=T.shots.filter(q=>q.rel>=324&&q.rel<624);assert.equal(pairs.length,28);
 assert.deepEqual(pairs.slice(0,4).map(q=>[q.rel,q.velo.xRaw,q.velo.yRaw]),[[324,0,196608],[324,0,-196608],[346,-30051,194295],[346,-30051,-194295]]);
 assert.equal(T.first('boss',x=>x.a===8&&x.i-x.k>300),624);
 assert.equal(T.first('boss',x=>x.m===4&&x.i-x.k>324),383);// 120 px up in 60 moves
});
test('the special attack: out by C + 198, volleys of nine missiles at C + 260 / 381 / 502 from 18, cores open at C + 560',()=>{
 const s=immortal(mk('st_w_06_04',2)),st=s.bossState,b=()=>st.bosses[0];let C=-1;const volleys=[];let shown=0,coreAt=-1;
 for(let i=1;i<=4200&&s.status==='play';i++){R.step(s,{});const bb=b();if(!bb.attack)continue;
  if(C<0&&bb.attack.state===3)C=i;const now=bb.missiles.filter(m=>!m.hidden&&!m.exploding).length;if(now>shown)volleys.push([i-C,now-shown]);shown=now;
  if(C>0&&coreAt<0&&bb.behaviour.state===4)coreAt=i-C;}
 assert.ok(C>0);assert.deepEqual(volleys.slice(0,1),[[260,9]]);assert.equal(volleys[1][0],381);assert.equal(volleys.filter(v=>v[0]<560).reduce((a,v)=>a+v[1],0)<=27,true);
 assert.equal(coreAt,560);
});
test('15-3 BossEx (notes 12): arrives k + 193, Ex 1 at k + 224, the first homing bullet at k + 347 at 2.5 px a frame toward the gun player',()=>{
 const T=timeline('st_w_15_03',2,1000);assert.equal(T.k,535);
 assert.equal(T.first('ex',x=>x.m===2),193);assert.equal(T.first('ex',x=>x.b===3&&x.a===1),224);assert.equal(T.first('ex',x=>x.a===2),346);
 const h=T.shots.find(q=>q.target!=null);assert.equal(h.rel,347);assert.equal(h.target,0);assert.ok(Math.abs(Math.hypot(h.velo.xRaw,h.velo.yRaw)-163840)<8);
});
test('damage (OnRecvEvent 21): 1 anywhere in state 3; in 4..6 only a core, 2 at once; easy mode from 30 game overs any part 2',()=>{
 const st=B.create(B.compile(actorsFor('st_w_06_04',2),2));B.start(st,{rng:{state:'1',inc:'1'},players:[],guns:[],addReusableEnemies(){}});const b=st.bosses[0];
 b.behaviour.state=2;assert.deepEqual(B.hitBoss(st,b.id,'body',0,{}),[]);assert.equal(b.hp,120);
 b.behaviour.state=3;B.hitBoss(st,b.id,'hatch',0,{});assert.equal(b.hp,119);
 b.behaviour.state=5;assert.deepEqual(B.hitBoss(st,b.id,'hatch',1,{}),[{se:1}]);assert.equal(b.hp,119);B.hitBoss(st,b.id,'core',0,{});assert.equal(b.hp,117);
 B.hitBoss(st,b.id,'body',2,{gameOverCount:30});assert.equal(b.hp,115);
});
test('death: HP 0 -> state 7 next update, 8 after 301, event 61 to SwitchTargetGroup1 31 later -> Key1 appears',()=>{
 const s=immortal(mk('st_w_06_04',2)),st=s.bossState;for(let i=0;i<1100;i++)R.step(s,{});const b=st.bosses[0];assert.equal(b.behaviour.state,3);
 b.hp=0;const N=s.ticks;let at7=-1,at8=-1,gone=-1;
 for(let i=0;i<400;i++){R.step(s,{});if(at7<0&&b.behaviour.state===7)at7=s.ticks-N;if(at8<0&&b.behaviour.state===8)at8=s.ticks-N;if(gone<0&&b.removed)gone=s.ticks-N;}
 assert.deepEqual([at7,at8,gone],[1,302,333]);assert.equal(s.keyActive,true);
});
test('missile: 1 px a frame + 6552 raw each update up to 12 px; a guard stops it; it kills a plane, a barrier (life > 2) takes 1',()=>{
 const st=B.create(B.compile(actorsFor('st_w_06_04',2),2)),rng={state:'5',inc:'3'};B.start(st,{rng,players:[],guns:[],addReusableEnemies(){}});
 const ms=st.bosses[0].missiles[0];Object.assign(ms,{hidden:false,collision:true,xRaw:2000*F,yRaw:300*F,veloRaw:{xRaw:-F,yRaw:0}});st.bosses[0].removed=true;
 const host=(players,extra={})=>({dtRaw:1092,rng,scrollXRaw:0,scrollStepRaw:0,viewRaw:{x:0,y:0,w:2832*F,h:720*F},players,guns:[],mapBlocked:()=>false,createBullet(){},resumeHomingEnemy(){},addReusableEnemies(){},barrierDeployed:P.barrierDeployed,...extra});
 const speeds=[];for(let i=0;i<112;i++){B.step(st,host([]));speeds.push(ms.speedNow);}// s = FPSqrt(|v|^2) + dt * 6
 // notes 12 lists 85188 third: our FPVector2 * FP floors the negative x (normalize gives -65538),
 // which leaves 3 raw more; the first two and the cap match
 assert.deepEqual(speeds.slice(0,2),[72088,78638]);const cap=speeds.indexOf(786432);assert.ok(cap>=109&&cap<=110,'12 px at update '+(cap+1));
 const body=x=>({x:(x-16)*F,y:(300-47)*F,w:32*F,h:46*F});
 const shot=(players)=>{Object.assign(ms,{hidden:false,exploding:false,collision:true,xRaw:1000*F,yRaw:300*F,veloRaw:{xRaw:-F,yRaw:0}});return B.step(st,host(players));};
 const plain=P.createLife();let r=shot([{index:0,xRaw:900*F,yRaw:300*F,alive:true,visible:true,plane:true,life:plain,bodyRaw:body(900)}]);assert.equal(r.kill.length,1);
 const strong=P.equipBarrier(P.createLife(),false);r=shot([{index:0,xRaw:900*F,yRaw:300*F,alive:true,visible:true,plane:true,life:strong,bodyRaw:body(900)}]);assert.deepEqual([r.kill.length,r.damage.length,strong.life],[0,1,3]);
 // the guard player stands right of the missile tip: the guard (x + 27..33) meets it first
 st.guards=[{playerIndex:0,type:1,direction:3,flip:false}];r=shot([{index:0,xRaw:830*F,yRaw:300*F,alive:true,visible:true,plane:true,lookingRight:true,life:P.createLife(),bodyRaw:body(830)}]);
 assert.deepEqual([r.kill.length,r.sounds.some(q=>q.se===3)],[0,true]);
});
test('PlayerGuard: VerticalLong 6 x 84 at (+30, -24), flipped to (-28, -24) when it may and the player looks left',()=>{
 const g={type:1,direction:3,flip:true},p={xRaw:500*F,yRaw:400*F,visible:true,lookingRight:true};
 assert.deepEqual(B.guardRect(g,p),{x:527*F,y:334*F,w:6*F,h:84*F});assert.deepEqual(B.guardRect(g,{...p,lookingRight:false}),{x:469*F,y:334*F,w:6*F,h:84*F});
 assert.deepEqual(B.guardRect({...g,flip:false},{...p,lookingRight:false}),{x:527*F,y:334*F,w:6*F,h:84*F});
});
test('a pool bullet meets player i\'s guard before its body (checkContact 0x18188c230): gone, no damage',()=>{
 const st={...S.create(S.compile(actorsFor('st_w_06_04',2),2)),started:true,spawners:[]};const rng={state:'7',inc:'9'};
 S.createEnemyBullet(st,{xRaw:540*F,yRaw:380*F},{xRaw:-3*F,yRaw:0},rng);
 const players=[{index:0,xRaw:500*F,yRaw:400*F,alive:true,guardRaw:{x:527*F,y:334*F,w:6*F,h:84*F},bodyRaw:{x:484*F,y:353*F,w:32*F,h:46*F}}];
 let dmg=0;for(let i=0;i<10;i++)dmg+=S.step(st,{dtRaw:1092,viewRaw:{x:0,w:2000*F},rng,players,mapBlocked:()=>false}).damage.length;
 assert.equal(dmg,0);assert.equal(st.bullets[0].fading||!st.bullets[0].active,true);
});
test('ShootingSuperApple: none before 5 game overs; from 5 it gives a 3-life barrier, from 25 an easy 5-life one',()=>{
 assert.equal(mk('st_w_06_04',2,{gameOverCount:4}).bossState.apples.length,2);
 const s0=mk('st_w_06_04',2,{gameOverCount:4});R.step(s0,{});assert.deepEqual(s0.bossState.apples.map(a=>a.removed),[true,true]);
 for(const [count,life] of [[5,3],[25,5]]){const s=mk('st_w_06_04',2,{gameOverCount:count});R.step(s,{});const a=s.bossState.apples.find(q=>!q.removed),p=s.players[0];
  p.x=a.xRaw/F-16;p.y=a.yRaw/F-30;R.step(s,{});assert.equal(p.plane.life.max,life);assert.equal(p.plane.life.barrier,true);}
});
// immortal planes (dodging is the players' part): shooters line up with an open core
function clear(id,n){const s=immortal(mk(id,n)),st=s.bossState,guns=s.planeState.guns.map(g=>g.playerIndex).sort((a,b)=>a-b);let i=0;
 const aimY=(b,slot)=>{const sh=B.nativeConstants.SHAPES[b.kind],open=sh.cores.map((r,k)=>b.parts.cores[k]?r:null).filter(Boolean),r=open.length?open[slot%open.length]:sh.hatches[0];return b.pos.yRaw/F+(r.y+r.h/2)/F+20;};
 for(;i<13000&&s.status==='play'&&!s.players.every(p=>p.exit);i++){const inp={},cam=s.autoScrollState.cameraAreaRaw.x/F;
  const live=st.started?st.bosses.filter(b=>!b.removed&&b.behaviour.state>=2):[],target=live.find(b=>b.kind==='boss')||live[0];
  s.players.forEach((p,k)=>{if(p.exit)return;const t={};inp[p.id]=t;const x=p.x+16,y=p.y+47;let tx,ty,face=null;
   if(target){const gi=guns.indexOf(k);
    if(gi>=0){tx=cam+560+(gi%3)*40;ty=aimY(target,gi);face=target.kind==='boss'?'right':'left';if((p.facingLeft?'left':'right')!==face)t[face]=true;else if(Math.abs(y-ty)<6&&i%2===0)t.shot=true;}
    else{tx=cam+460;ty=110+70*k;}}
   else{const key=s.map.key,g=s.map.exit,held=s.keyState&&s.keyState.holderId;
    if(!s.goalOpen&&(held?held!==p.id:k>0)){tx=x;ty=y;}else{const tg=!s.goalOpen&&!held?{x:key.x+16,y:key.y+51}:{x:g.x+g.w/2,y:g.y+g.h};tx=tg.x;ty=tg.y;if(s.goalOpen&&Math.abs(x-tx)<5&&Math.abs(y-ty)<4)t.up=true;}}
   if(!t.left&&!t.right){if(x<tx-4&&face!=='left')t.right=true;else if(x>tx+4&&face!=='right')t.left=true;}
   if(!t.up){if(y<ty-3)t.down=true;else if(y>ty+3)t.up=true;}});
  R.step(s,inp);}
 return {s,i};}
for(const id of ['st_w_06_04','st_w_15_03'])test(id+' with 2, 4 and 8 (immortal) planes: every boss falls, Key1 appears, everyone enters the door',()=>{
 for(const n of [2,4,8]){const {s,i}=clear(id,n);assert.equal(s.status,'clear',id+' count '+n+' '+(s.failure&&s.failure.reason)+' frames '+i);assert.ok(s.bossState.bosses.every(b=>b.removed));}
});
