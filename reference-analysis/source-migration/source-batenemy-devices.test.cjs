'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('./source-batenemy-devices.js');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actors=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_09_01'}));
// top-view body (-16,-29,32,28) from Pos (p.x+16, p.y+47) centred on the switch
function onSwitch(p,sw){p.x=sw.x+sw.w/2-16;p.y=sw.y+sw.h/2-18-14;}
const park=p=>{p.x=40;p.y=600;};

test('9-1 cage switch counts follow the QPlayerCountParam tables for every population',()=>{
 for(let n=2;n<=8;n++){const c=B.compile(actors('st_w_09_01'),n,{chipSize:48});
  // FallingCage1 "#!!!$!!!..." = 2..8, FallingCage2 "\"!!!#!!!..." = 1..7
  assert.deepEqual(c.cages.map(x=>x.needSwitchCount),[n,n-1]);
  assert.deepEqual(c.bats.map(b=>[b.direction,b.attackSpeedRaw,b.searchRangeRaw,b.searchAngleRaw]),[[1,5*F,250*F,35*F],[2,5*F,250*F,35*F]]);}
});
test('QPlayerCountParam decode and the walk-down lookup',()=>{
 const t=B.countTable({datas:[{t:2,s:'#!!!$!!!%!!!&!!!\'!!!(!!!)!!!'}]},0);
 assert.deepEqual(t,[2,3,4,5,6,7,8]);
 assert.equal(B.findCount([1,0,0,0,0,0,0],5),1);assert.equal(B.findCount(t,1),0);
 assert.deepEqual(B.countTable({datas:[{t:2,s:'#!!!'}]},0),[0,0,0,0,0,0,0]);
});
test('9-3 bats patrol their QLinePath: one way, 1 s rest, back again',()=>{
 const c=B.compile(actors('st_w_09_03'),2,{chipSize:48}),b=c.bats[0];
 assert.deepEqual(b.path.paths,[{xRaw:0,yRaw:60*F}]);// slots 12/13, stopped at the (0,0) pair
 assert.equal(b.path.totalLengthRaw,60*F);
 const ys=[];for(let i=0;i<200;i++){B.update(b,{dtRaw:1092,chipSize:48,players:[]});B.post(b);ys.push(b.yRaw/F);}
 assert.equal(Math.max(...ys),156);
 // back at ratio 0 the patrol vector is (0,0) and phase 0 skips the SetPos
 // (0x1816bb000..012), so the bat keeps its last step short of the start
 assert.ok(Math.min(...ys)>96&&Math.min(...ys)<97);
 // the update that reaches the end sets the 1.0 s idle before phase 0 would
 // SetPos, so the bat rests one step short (155.2) for 61 updates, shows the
 // end point once when the idle runs out, then flies back
 const far=ys.indexOf(156);assert.ok(far>60);
 assert.ok(ys.slice(far-61,far).every(y=>Math.abs(y-155.2)<0.01));assert.ok(ys[far+1]<156);
});
const mk3=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_09_03'}));
test('9-3: only player 1 (slot8 0) owns a Cardboard; Shot toggles it and covers a player inside',()=>{
 const s=mk3(2);const [a,b]=s.players;b.x=a.x+10;b.y=a.y;R.step(s,{});
 assert.equal(s.batState.cardboards.length,1);assert.equal(s.batState.cardboards[0].playerId,a.id);
 assert.equal(a.tv.flags&0x40000,0);assert.ok(b.tv.flags&0x40000);
 R.step(s,{[a.id]:{shot:true}});for(let i=0;i<20;i++)R.step(s,{[a.id]:{shot:true,right:true},[b.id]:{right:true}});
 const cb=s.batState.cardboards[0];
 assert.equal(cb.phase,1);assert.ok(a.tv.flags&0x80000);assert.equal(b.tv.cardboardCoveredFlags,1);
 assert.equal(Math.round(a.x),80);assert.equal(Math.round(b.x),90);// equipped / covered players do not walk
 R.step(s,{});R.step(s,{[a.id]:{shot:true}});for(let i=0;i<20;i++)R.step(s,{});
 assert.equal(cb.phase,0);assert.equal(a.tv.flags&0x80000,0);assert.equal(b.tv.cardboardCoveredFlags,0);
});
test('9-3: a hidden player is neither seen nor touched by a patrolling bat',()=>{
 for(const hide of [false,true]){const s=mk3(2);const [a,b]=s.players;b.x=40;b.y=300;a.x=1100;a.y=67;R.step(s,{});
  if(hide)R.step(s,{[a.id]:{shot:true}});
  let found=false;for(let i=0;i<240&&s.status==='play';i++){R.step(s,{});if(s.batState.bats.some(x=>x.phase===1))found=true;}
  if(hide){assert.equal(s.status,'play');assert.equal(found,false);}else{assert.equal(s.status,'dead');assert.equal(s.failure.reason,'박쥐에게 잡혔어요');}}
});
test('the first update turns the light to QDirectionVector[direction]',()=>{
 const c=B.compile(actors('st_w_09_01'),2,{chipSize:48}),b=c.bats[0];
 assert.deepEqual(b.lookRaw,{xRaw:0,yRaw:-F});// InitPost vector for direction 1
 B.update(b,{dtRaw:1092,chipSize:48,players:[]});
 assert.deepEqual(b.lookRaw,{xRaw:0,yRaw:F});// snapped: dot -1 < -0.75
 assert.equal(b.light.mulBrightnessRaw,0);
 assert.deepEqual([b.light.xRaw,b.light.yRaw],[456*F,72*F]);// pos + look*20 - (0,20)
});
test('cage falls on its switches, lands for four frames, then waits while held',()=>{
 const s=mk(2);onSwitch(s.players[0],s.map.switches.find(w=>w.name==='Switch9'));park(s.players[1]);
 const cage=()=>s.batState.cages[1];let landedAt=-1,offAt=-1;
 for(let i=0;i<60;i++){R.step(s,{});if(landedAt<0&&cage().collisionActive)landedAt=i;if(landedAt>=0&&offAt<0&&!cage().collisionActive)offAt=i;}
 assert.equal(s.status,'play');assert.equal(cage().phase,3);assert.equal(cage().cageYRaw,0);
 assert.equal(offAt-landedAt,4);// OneFrame*4 timer, decremented by 1092
 assert.ok(landedAt>20&&landedAt<30);// 400 px at 1000 px/s
});
test('a player in the light is found after 0.2 s, alerted 0.3 s, chased and caught',()=>{
 const s=mk(2);const p=s.players[0];p.x=1152-16-150;p.y=128-47+10;park(s.players[1]);
 let found=-1,moved=-1;for(let i=0;i<200&&s.status==='play';i++){R.step(s,{});const b=s.batState.bats[1];if(found<0&&b.phase===1)found=i;if(moved<0&&b.xRaw!==1152*F)moved=i;}
 assert.equal(s.status,'dead');assert.equal(s.failure.reason,'박쥐에게 잡혔어요');
 assert.ok(found>=11&&found<=13,'found at '+found);// 13107 / 1092 = 12 updates
 // 19660 - 19*1092 < 0: 19 shake updates while the timer is > 0, the chase
 // velocity on the 20th, and OnUpdate2 moves the bat in that same update
 assert.equal(moved-found,20);
});
test('the cage captures the bat under it, the bat goes dark and the cage becomes a wall',()=>{
 const s=mk(2);onSwitch(s.players[0],s.map.switches.find(w=>w.name==='Switch1'));onSwitch(s.players[1],s.map.switches.find(w=>w.name==='Switch2'));
 for(let i=0;i<40;i++)R.step(s,{});
 const b=s.batState.bats[0],c=s.batState.cages[0];
 assert.equal(s.status,'play');assert.ok(b.paused&&b.flags&2);assert.ok(c.flags&4);
 assert.deepEqual([b.xRaw,b.yRaw],[456*F,94*F]);// cage pos - (0, QFP._4)
 assert.deepEqual(B.solids(s.batState),[{id:c.id,type:'FallingCage',x:424,y:72,w:64,h:12}]);
 for(let i=0;i<80;i++)R.step(s,{});assert.equal(b.light.phase,3);// bright 0 / dark 1: off after 1 s
 const p=s.players[0];p.x=500;p.y=42;for(let i=0;i<20;i++)R.step(s,{[p.id]:{left:true}});
 assert.equal(Math.round(p.x),488);
});
