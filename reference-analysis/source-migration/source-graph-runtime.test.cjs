'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('./source-graph-runtime.js'),R=require('./source-stage-runtime.js'),pop=require('./population-rules.cjs');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actorsFor=(id,n)=>pop.actorsForCount(pop.selectVariant(source.stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),n);
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_13_02'}));
const rngOf=()=>({state:'9600629759793949339',inc:'15726070495360670683'});
const fresh=n=>{const st=G.create(G.compile(actorsFor('st_w_13_02',n),n));G.start(st,{});return st;};
const host=(n,inputs=[])=>({dtRaw:1092,rng:rngOf(),playerCount:n,players:Array.from({length:n},(_,i)=>({input:inputs[i]||{}}))});

test('13-2 tables: ClearMax 10, CircleGraphMax 10 / 10 / 4.., FailureMax 15, UI at (432, 464) and (960, 464)',()=>{
 for(let n=2;n<=8;n++){const c=G.compile(actorsFor('st_w_13_02',n),n).gc;
  assert.deepEqual([c.clearMax,c.circleMax,c.failureMax,c.numbers.x,c.numbers.y,c.playersUI.x,c.playersUI.y,c.uiScale],[10,n<=3?10:4,15,432,464,960,464,1],'count '+n);}
});
test('OnStart: the first round is a bar (prepareGraph sets m_Mode 1), players to state 12, the hint at GameOverCount >= 15',()=>{
 const st=G.create(G.compile(actorsFor('st_w_13_02',3),3));assert.deepEqual(G.start(st,{gameOverCount:14}),{playerState:12});assert.equal(st.gc.mode,1);assert.equal(st.gc.hint,false);
 const h=G.create(G.compile(actorsFor('st_w_13_02',3),3));G.start(h,{gameOverCount:15});assert.equal(h.gc.hint,true);
 G.step(st,host(3));assert.deepEqual([st.gc.phase,st.bar.phase,st.circle.phase,st.bar.shown,st.circle.shown],[1,1,0,true,false]);
});
test('bar decideGoal: left + right = n, jump 0..n; a and c always differ from the previous goal',()=>{
 for(let n=2;n<=8;n++){const st=fresh(n),rng=rngOf();let prev=[0,0,0];
  for(let k=0;k<200;k++){G.decideBar(st,st.bar,false,rng,n);const [a,b,c]=st.bar.goal;assert.ok(a+b===n&&c>=0&&c<=n,'n '+n);assert.ok(a!==prev[0]&&c!==prev[2]);prev=[a,b,c];}}
});
test('circle decideGoal: [jump, right, left], sum <= n from 5 players unless left + right = n, the 6..8 exclusion patterns never come out',()=>{
 for(let n=2;n<=8;n++){const st=fresh(n),rng=rngOf();
  for(let k=0;k<300;k++){G.decideCircle(st,st.circle,false,rng,n);const [c,b,a]=st.circle.goal;
   assert.ok(a>=0&&a<n&&b>=0&&c>=0&&c<=n&&a+b+c>0,'n '+n+' '+st.circle.goal);if(n>=5&&a+b<n)assert.ok(a+b+c<=n);// a + b = n keeps the last c (0x1817efa20)
   if(a===0)assert.ok(b>=1&&c!==b);assert.equal(G.excluded(n,[a,b,c]),false);
   const tot=a+b+c;assert.deepEqual(st.circle.goalRaw,[c,b,a].map(v=>Math.floor(v*0x4000000/tot)));}}
 assert.equal(G.excluded(8,[2,2,3]),true);assert.equal(G.excluded(8,[2,3,2]),true);assert.equal(G.excluded(5,[1,2,2]),false);
});
test('circle checkMatch: +-4 raw below 7 players; 7..8 allow 2012160 raw unless a goal is a quarter',()=>{
 const c={kind:'circle',goalRaw:[0x2000000,0x1000000,0x1000000],nowRaw:[0x2000000+5,0x1000000,0x1000000-5]};
 assert.equal(G.checkMatch(c,6),false);c.nowRaw=[0x2000000+4,0x1000000,0x1000000-4];assert.equal(G.checkMatch(c,6),true);
 c.nowRaw=[0x2000000+40,0x1000000,0x1000000];assert.equal(G.checkMatch(c,8),false,'a half: strict');
 const d={kind:'circle',goalRaw:[Math.floor(3*0x4000000/7),Math.floor(2*0x4000000/7),Math.floor(2*0x4000000/7)]};
 d.nowRaw=[Math.floor(3*0x4000000/8),Math.floor(3*0x4000000/8),Math.floor(2*0x4000000/8)];// 3/8 vs 3/7: 8.0 %
 assert.equal(G.checkMatch(d,8),false);d.nowRaw=d.goalRaw.map((v,i)=>v+[2012160,-2012160,0][i]);assert.equal(G.checkMatch(d,8),true);
});
test('jump button: a tap counts on release and 9 frames more; held for 32 frames it stops at once',()=>{
 const run=(hold,total)=>{const st=fresh(2),out=[];st.bar.phase=1;st.bar.flags=0;st.bar.goal=[9,9,9];
  for(let f=0;f<total;f++){G.step({...st,gc:{...st.gc,flags:1}},host(2,[{jump:f<hold}]));out.push(st.bar.values[2]);}return out.lastIndexOf(1)+1;};
 assert.equal(run(1,40),11);assert.equal(run(31,60),41);assert.equal(run(32,60),32);
});
test('bar round: values match the next update, SE 24 then 0.6 s (37 updates), the next round starts on the update after',()=>{
 const st=fresh(4);G.step(st,host(4));const [a,b,c]=st.bar.goal;
 const inp=Array.from({length:4},(_,i)=>({left:i<a,right:i>=a&&i<a+b,jump:i<c}));
 let f=1,won=-1,next=-1;for(;f<200&&next<0;f++){const r=G.step(st,host(4,inp));if(r.sounds.some(q=>q.se===24))won=f;if(won>0&&st.gc.clearCount===1&&st.gc.phase===0&&next<0)next=f;}
 assert.equal(won,3,'controll on update 1, checkMatch on 2 (GraphClear), GC sees it on 3: it runs before the controllers');
 assert.equal(next-won,37);
});
test('decideNextGraph: 50:50 while circle rounds < CircleGraphMax, then only bars',()=>{
 const st=fresh(4),rng=rngOf();let circles=0;for(let k=0;k<200;k++){const before=st.gc.circleCount;
  st.gc.mode===0;G.step({...st,gc:st.gc},{dtRaw:1092,rng,playerCount:4,players:[]});}
 const t=G.create(G.compile(actorsFor('st_w_13_02',4),4));G.start(t,{});const modes=[];
 for(let k=0;k<30;k++){t.gc.phase=2;t.gc.timerRaw=1;t.gc.clearCount=0;G.step(t,{dtRaw:1092,rng,playerCount:4,players:[]});modes.push(t.gc.mode);}
 assert.equal(t.gc.circleCount,4);assert.equal(modes.filter(m=>m===0).length,4);assert.ok(modes.slice(modes.lastIndexOf(0)+1).every(m=>m===1));
});
test('hover (OnUpdate_Graph): press -> -3, below refY speed up to -1.5 by 0.25, above slow down; let go -> gravity, 0 on the ground',()=>{
 assert.equal(G.hoverVelocity({posYRaw:720*F,vyRaw:0,refYRaw:672*F,grounded:true,held:true,pressed:true}),-3*F);
 assert.equal(G.hoverVelocity({posYRaw:700*F,vyRaw:-F,refYRaw:672*F,grounded:false,held:true,pressed:false}),-F-16384);
 assert.equal(G.hoverVelocity({posYRaw:700*F,vyRaw:-98304,refYRaw:672*F,grounded:false,held:true,pressed:false}),-98304);
 assert.equal(G.hoverVelocity({posYRaw:660*F,vyRaw:-F,refYRaw:672*F,grounded:false,held:true,pressed:false}),-F+16384);
 assert.equal(G.hoverVelocity({posYRaw:660*F,vyRaw:-F,refYRaw:672*F,grounded:false,held:false,pressed:false}),null);
 assert.equal(G.hoverVelocity({posYRaw:720*F,vyRaw:F,refYRaw:672*F,grounded:true,held:false,pressed:false}),0);
 const s=mk(2),p=s.players[0],x0=p.x;let lo=1e9,hi=-1e9;for(let i=0;i<300;i++){R.step(s,{[p.id]:{jump:true,right:true}});if(i>60){lo=Math.min(lo,p.y+p.h+1);hi=Math.max(hi,p.y+p.h+1);}}
 assert.equal(p.x,x0,'no walk');assert.equal(p.lookingRight,true);assert.ok(lo<672&&hi>672&&hi<720,'about refY '+lo+'..'+hi);
});
// every round: the first a players hold left, the next b right, the first c jump (bar);
// circle: the same with its [jump, right, left] goal; then walk to the key and the door.
function clear13(n){const s=mk(n),st=s.graphState;let i=0;const rounds=[];
 for(;i<4000&&s.status==='play'&&!s.players.every(p=>p.exit);i++){const inp={};
  if(st.gc.phase<4){const c=st.gc.mode===1?st.bar:st.circle;const [L,Rt,J]=c.kind==='bar'?c.goal:[c.goal[2],c.goal[1],c.goal[0]];
   if(c.phase===1&&(rounds.length===0||rounds[rounds.length-1].goal!==c.goal.join()))rounds.push({kind:c.kind,goal:c.goal.join()});
   s.players.forEach((p,k)=>{inp[p.id]={left:k<L,right:k>=L&&k<L+Rt,jump:k<J};});}
  else{const key=s.map.key,g=s.map.exit,held=s.keyState&&s.keyState.holderId;
   s.players.forEach((p,k)=>{if(p.exit)return;const x=p.x+16,t={};inp[p.id]=t;const fetch=!s.goalOpen&&!held;if(fetch&&k>0)return;// one player fetches the key
    const tx=fetch?key.x+16:g.x+g.w/2;if(x<tx-6)t.right=true;else if(x>tx+6)t.left=true;else if(fetch)t.jump=p.grounded||!!(p.vy<0);
    if(!fetch&&p.x<g.x+g.w&&g.x<p.x+p.w)t.up=true;});}
  R.step(s,inp);}
 return {s,i,rounds};}
test('13-2 with 2, 4 and 8 players: ten graph rounds, the key wakes up, everyone enters the door',()=>{
 for(const n of [2,4,8]){const {s,i,rounds}=clear13(n);
  assert.equal(s.status,'clear','count '+n+' '+(s.failure&&s.failure.reason)+' rounds '+s.graphState.gc.clearCount);
  assert.equal(rounds.length,10);assert.equal(rounds[0].kind,'bar');assert.ok(rounds.filter(r=>r.kind==='circle').length<=(n<=3?10:4));assert.ok(i<2500,'frames '+i);}
});
