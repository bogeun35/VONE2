'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const O=require('./source-planeobstacle-runtime.js'),R=require('./source-stage-runtime.js'),pop=require('./population-rules.cjs');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actorsFor=(id,n)=>pop.actorsForCount(pop.selectVariant(source.stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),n);
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_06_03'}));
const rngOf=()=>({state:'9600629759793949339',inc:'15726070495360670683'});

test('6-3 data: four breakable roads (kind 8 -> level 4), width 480, Random 100; DamageRect for 2..4, Rect for 5..8 (slot 6)',()=>{
 for(let n=2;n<=8;n++){const c=O.compile(actorsFor('st_w_06_03',n),n);
  assert.deepEqual(c.obstacles.map(o=>[o.xRaw/F,o.yRaw/F]),[[1656,336],[2616,240],[3624,216],[4536,312]],'count '+n);
  assert.ok(c.obstacles.every(o=>o.breakable===4&&o.widthRaw===480*F&&o.randomRaw===100*F&&o.rectType===(n<=4?0:1)),'count '+n);}
});
test('randomY 0x181890120: Next(0, 4) -> 25 * lane - 50; GenerateRoad floors to 48 and opens 192 px',()=>{
 const want=[[240,288,336,336],[144,192,240,240],[144,144,192,240],[240,240,288,336]];// gap centres per lane (spec 2.2)
 const c=O.compile(actorsFor('st_w_06_03',2),2);
 c.obstacles.forEach((o,i)=>{for(let lane=0;lane<4;lane++){const st=O.create({...c,obstacles:[{...o}]});
  // a stream whose first Next(0, 4) is this lane (small PCG states all start with 0)
  const seedOf=k=>String((BigInt(k+1)*0x9E3779B97F4A7C15n)&((1n<<64n)-1n));let seed=0;
  while(O.nextInt({state:seedOf(seed),inc:'1'},0,4)!==lane)seed++;
  O.start(st,{rng:{state:seedOf(seed),inc:'1'},playerCount:2,colors:[0,1]});
  const top=st.obstacles[0].top/F;assert.equal(top+96,want[i][lane],'obstacle '+i+' lane '+lane);
  const [a,b]=st.walls;assert.deepEqual([a.yRaw/F,a.hRaw/F,b.yRaw/F,b.hRaw/F,a.xRaw/F,a.wRaw/F],[-1000,1000+top,top+192,1000,o.xRaw/F,480]);}});
});
test('colour blocks: shuffled gun colours, top two cells colours[0], bottom two colours[1 % n], at column (480 - 24 + x) / 48',()=>{
 const c=O.compile(actorsFor('st_w_06_03',3),3),st=O.create(c),rng=rngOf();
 const probe={...rngOf()};const lanes=[],cols=[];
 for(let i=0;i<4;i++){lanes.push(O.nextInt(probe,0,4));const a=[0,1,2];for(let k=1;k<3;k++){const j=O.nextInt(probe,0,k+1);[a[k],a[j]]=[a[j],a[k]];}cols.push(a);}
 O.start(st,{rng,playerCount:3,colors:[0,1,2]});
 st.obstacles.forEach((o,i)=>{const col=[44,64,85,104][i],row0=(o.top/F+24)/48|0;
  assert.deepEqual([0,1,2,3].map(k=>st.chips[col+','+(row0+k)]),[cols[i][0],cols[i][0],cols[i][1],cols[i][1]].map(v=>0x1e+v),'obstacle '+i);});
});
test('a bullet clears only a chip of its own colour (chip 1 is empty)',()=>{
 const st=O.create(O.compile(actorsFor('st_w_06_03',2),2));O.start(st,{rng:rngOf(),playerCount:2,colors:[0,1]});
 const [k,v]=Object.entries(st.chips)[0],[gx,gy]=k.split(',').map(Number),own=v-0x1e;
 assert.equal(O.breakChip(st,{gx,gy},1-own),false);assert.equal(st.chips[k],v);
 assert.equal(O.breakChip(st,{gx,gy},own),true);assert.equal(st.chips[k],undefined);
});
test('ObstacleComponent.OnPost: a piece goes once its right edge is left of the camera view',()=>{
 const st=O.create(O.compile(actorsFor('st_w_06_03',2),2));O.start(st,{rng:rngOf(),playerCount:2,colors:[0,1]});
 O.post(st,{x:2136*F,w:853*F});assert.equal(st.walls.length,8);O.post(st,{x:2137*F,w:853*F});assert.equal(st.walls.length,6);
});
test('2..4 players: touching a wall is event 43; 5..8: the wall is only solid',()=>{
 const s=mk(2);R.step(s,{});const w=s.planeObstacleState.walls[1],p=s.players[0];p.x=w.xRaw/F-32;p.y=w.yRaw/F+10;R.step(s,{});
 assert.equal(s.status,'dead');assert.equal(s.failure.reason,'벽에 부딪혔어요');
 const t=mk(5);R.step(t,{});const w5=t.planeObstacleState.walls[1],q=t.players[0];assert.equal(w5.type,'Rect');q.x=w5.xRaw/F-32;q.y=w5.yRaw/F+10;
 for(let i=0;i<10;i++)R.step(t,{[q.id]:{right:true}});assert.equal(t.status,'play');assert.ok(q.x+q.w<=w5.xRaw/F+0.01,'blocked');
});
// 2 players: hold left of the next road, line up on an own-colour chip and shoot; pass
// when the road is open; pick the key up between roads; enter the door.
test('6-3 with two players: shoot every own-colour block, take the key, both enter the door',()=>{
 const s=mk(2),st=s.planeObstacleState,n=2;let i=0;
 for(;i<5000&&s.status==='play'&&!s.players.every(p=>p.exit);i++){const inp={},cam=s.autoScrollState.cameraAreaRaw.x/F;
  const obs=st.obstacles.find(o=>o.xRaw/F+o.widthRaw/F>Math.min(...s.players.filter(p=>!p.exit).map(p=>p.x)));
  s.players.forEach((p,k)=>{if(p.exit)return;const x=p.x+16,y=p.y+47,t={};inp[p.id]=t;let ty,hold=false;
   const key=s.map.key,held=s.keyState&&s.keyState.holderId,keyAhead=!held&&!s.goalOpen&&key.x+16>x-40&&(!obs||key.x<obs.xRaw/F-40);
   if(k===0&&keyAhead){ty=key.y+51;t.right=true;}
   else if(obs){const top=obs.top/F,col=Math.trunc((obs.widthRaw/F-24+obs.xRaw/F)/48);
    const mine=Object.entries(st.chips).filter(([q,v])=>v-0x1e===k&&q.startsWith(col+',')).map(([q])=>+q.split(',')[1]);
    const any=Object.keys(st.chips).some(q=>q.startsWith(col+','));
    if(mine.length){ty=Math.max(...mine)*48+44;hold=true;}else if(any){ty=top+119+(k%2?-30:30);hold=true;}else ty=top+119+(k-(n-1)/2)*48;
    const aligned=Math.abs(y-ty)<6,colX=cam+110+k*70,wantX=hold?(aligned?colX:Math.min(colX,obs.xRaw/F-50)):1e9;
    if(x>wantX+4)t.left=true;else if(x<wantX-4)t.right=true;
    if(mine.length&&aligned&&i%2===0&&!s.players.some((q,j)=>j!==k&&!q.exit&&q.x>p.x&&Math.abs(q.y-p.y)<30))t.shot=true;}
   else{const g=s.map.exit,tg=!s.goalOpen&&!held?{x:key.x+16,y:key.y+51}:{x:g.x+g.w/2,y:g.y+g.h};ty=tg.y;
    if(x<tg.x-4)t.right=true;else if(x>tg.x+4)t.left=true;else if(s.goalOpen)t.up=true;}
   if(y<ty-3)t.down=true;else if(y>ty+3)t.up=true;});
  R.step(s,inp);}
 assert.equal(s.status,'clear',s.failure&&s.failure.reason);assert.equal(Object.keys(st.chips).length,0);assert.ok(i<2000,'frames '+i);
});
