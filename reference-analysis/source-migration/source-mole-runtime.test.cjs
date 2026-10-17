'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('./source-mole-runtime.js'),G=require('./source-giant-runtime.js'),R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const acts=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_14_02'}));
const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;

test('14-2 data: moles per count, the boss mole (scale 6, life 8, stay 12/8/5/5/5/5/2 s), group modes',()=>{
 const c=M.compile(acts('st_w_14_02'),2);
 assert.deepEqual(c.moles.map(m=>m.name),['Mole1','Mole2','Mole5','Mole6','Mole9','Mole10','Mole17']);
 const boss=c.moles.find(m=>m.name==='Mole17');assert.deepEqual([boss.scaleRaw,boss.life,boss.flags&1,boss.riseRaw],[6*F,8,1,2*F]);
 assert.deepEqual([2,3,4,5,6,7,8].map(n=>M.compile(acts('st_w_14_02'),n).moles.find(m=>m.name==='Mole17').stayRaw/F),[12,8,5,5,5,5,2]);
 assert.deepEqual(c.groups.map(g=>g.flags),[1,0,1]);// slot 16: 0 = in order
 assert.equal(c.groups[2].entries[0].timeRaw,2*F);assert.equal(c.groups[0].entries[0].timeRaw,32768);
 assert.equal(M.compile(acts('st_w_14_02'),8).moles.length,17);
 assert.deepEqual(c.nests.find(n=>n.name==='MoleNest5').dir,2);
});
test('calcPos 0x181880d70: hidden 42 px into the nest, up at 2 px, times the actor scale',()=>{
 const st=M.create(M.compile(acts('st_w_14_02'),2)),m=st.moles[6];m.initXRaw=3048*F;m.initYRaw=672*F;m.dir=0;
 m.progressRaw=0;M.calcPos(m);assert.ok(near(m.yRaw/F,672+42*6,0.5)&&near(m.xRaw/F,3048,0.5),m.xRaw/F+','+m.yRaw/F);// cos/sin of 90 deg * 0x477 is not exact
 m.progressRaw=F;M.calcPos(m);assert.ok(near(m.yRaw/F,672+12,0.05));
 m.rect={...M.nativeConstants.MOLE.rects[0]};const r=M.moleRect(m);assert.deepEqual([r.w/F,r.h/F,r.x/F-m.xRaw/F,r.y/F-m.yRaw/F],[216,228,-108,-228]);
});
test('MoleGroup in order: one mole at a time after 0.5 s, it rises in 0.5 s and stays 1 s',()=>{
 const s=mk(2),ms=s.moleState;let up=-1,top=-1,sink=-1;const m=ms.moles.find(q=>q.name==='Mole1');
 for(let i=0;i<200&&sink<0;i++){R.step(s,{});if(up<0&&m.visible)up=i;if(top<0&&m.phase===3)top=i;if(top>=0&&sink<0&&m.phase===4)sink=i;}
 assert.ok(up>=29&&up<=32,'up '+up);assert.ok(top-up>=29&&top-up<=31,'rise '+(top-up));assert.ok(sink-top>=59&&sink-top<=61,'stay '+(sink-top));
 assert.equal(ms.moles.filter(q=>q.visible&&['Mole1','Mole2','Mole5','Mole6'].includes(q.name)).length<=1,true);
});
test('a punch takes one life through DamageManage; the last one plays 0.333 s and counts as killed',()=>{
 const s=mk(2),ms=s.moleState,m=ms.moles.find(q=>q.name==='Mole1');
 for(let i=0;i<90&&m.phase!==3;i++)R.step(s,{});assert.equal(m.phase,3);
 const p=s.players[0],r=M.moleRect(m);p.x=r.x/F-50-16;p.y=(r.y+r.h/2)/F+15-47;p.vy=0;p.facingLeft=false;
 R.step(s,{});R.step(s,{[p.id]:{shot:true}});p.x=r.x/F-50-16;p.y=(r.y+r.h/2)/F+15-47;p.vy=0;R.step(s,{});
 assert.equal(m.phase>=5,true);let n=0;while(m.visible&&n<40){R.step(s,{});n++;}assert.ok(n>=19&&n<=22,'dying '+n);
 const e=ms.groups[0].entries.find(q=>q.mole==='Mole1');assert.equal(e.killed,1);
});
test('a mole that sinks unhit resets its group (resetMoleInfos)',()=>{
 const st=M.create(M.compile(acts('st_w_14_02'),2)),g=st.groups[0];M.start(st);
 g.entries[0].killed=1;g.entries[1].killed=1;const out={keyEvents:[],shakes:[],sounds:[]};
 g.orderIndex=4;g.orderPhase=1;g.entries[4].appearing=0;g.entries[4].killed=0;M.post(st,1092,out);
 assert.deepEqual(g.entries.filter(e=>e.valid).map(e=>e.killed),[0,0,0,0]);assert.equal(g.orderIndex,0);
});
test('touching a mole is event 25: (d.x * 8, d.y * 4 - 8), a faint',()=>{
 const s=mk(2),ms=s.moleState,m=ms.moles.find(q=>q.name==='Mole1');
 for(let i=0;i<90&&m.phase!==3;i++)R.step(s,{});
 const p=s.players[0];p.x=m.xRaw/F-16-10;p.y=m.yRaw/F-47;p.vy=0;R.step(s,{});R.step(s,{});
 assert.ok(p.faint,'fainted');assert.ok(p.faint.vxRaw<0&&p.faint.vxRaw>=-8*F,'pushed left');
});
test('every group done: event 35 sinks the rest and event 1 lights the key',()=>{
 const s=mk(2),ms=s.moleState;R.step(s,{});assert.equal(s.keyActive,false);
 for(const g of ms.groups)for(const e of g.entries)if(e.valid)e.killed=1;R.step(s,{});
 assert.equal(s.keyActive,true);assert.ok(ms.moles.every(m=>m.flags&8));
});
test('14-2 with two players: whack every group (teleporting punchers), then the key opens the door',()=>{
 const s=mk(2),ms=s.moleState,gs=s.giantState;let i=0;
 for(;i<12000&&!s.keyActive&&s.status==='play';i++){const inp={};
  // one group at a time (a mole that escapes resets only its own group): together, boss, in order
  const focus=[1,2,0].map(k=>ms.groups[k]).find(g=>!g.done);
  const live=ms.moles.filter(m=>m.visible&&m.collisionOn&&!(m.flags&0x10)&&focus&&m.group===focus.id).map(m=>({m,r:M.moleRect(m)}));
  // one charged puncher per standing mole (charge 3 s, so the two take turns)
  const free=s.players.map((p,k)=>({p,k,pu:gs.punches.find(q=>q.actorIndex===k)})).filter(o=>o.pu&&o.pu.chargeRaw>=F&&!o.pu.attacking);
  s.players.forEach((p,k)=>{inp[p.id]={};p.x=40+k*60;p.y=600;p.vx=0;p.vy=0;p.faint=null;p.faintRequest=null;});
  for(const t of live){const o=free.shift();if(!o)break;const p=o.p;
   p.x=t.r.x/F-50-16;p.y=(t.r.y+t.r.h/2)/F+15-47;p.facingLeft=false;if(i%2===0)inp[p.id]={shot:true};}
  R.step(s,inp);}
 assert.equal(s.keyActive,true,'groups '+JSON.stringify(M.displays(ms).groups));
 const k=s.keyState||null;R.step(s,{});const key=s.map.key,other=s.players[0];
 other.x=key.x;other.y=key.y;other.vy=0;R.step(s,{});R.step(s,{});
 other.x=s.map.exit.x;other.y=s.map.exit.y+s.map.exit.h-46;for(let j=0;j<120&&!s.goalOpen;j++)R.step(s,{});
 assert.equal(s.goalOpen,true);
});
