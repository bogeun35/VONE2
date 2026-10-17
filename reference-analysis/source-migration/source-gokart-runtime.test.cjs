'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('./source-gokart-runtime.js');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_12_01'}));
const actors=()=>source.stages.find(s=>s.stageId==='st_w_12_01').json.stageInitParamList[0].actorCreateParamList;
test('12-1 kart tables, seats and colliders per population',()=>{
 for(const [n,jump] of [[2,17],[3,20],[8,20]]){const k=K.compile(actors(),n).karts[0];assert.equal(k.jumpVeloRaw,jump*F);assert.equal(k.maxSpeedRaw,5*F);
  assert.equal(k.rects.length,n>4?3:2);assert.equal(k.rects[1].widthRaw,(40+(Math.min(n,4)-1)*56)*F);}
 assert.equal(K.compile(actors(),8).sticks.length,5);assert.equal(K.compile(actors(),4).sticks.length,0);
});
test('jump vote: (1 - (1 - inputs/drivers)^2) * jump; drivers rotate back by four above four players',()=>{
 const k=K.compile(actors(),6).karts[0];K.start(k);k.inputCount=2;
 assert.equal(K.jumpVelo(k),15*F);// 4 drivers, 2 pressing: 1 - 0.25
 assert.deepEqual(k.infos.map(f=>f.isDriver),[1,1,1,1,0,0]);
 K.changeNextDriverIndex(k);assert.equal(k.driverIndex,2);assert.deepEqual(k.infos.map(f=>f.isDriver),[0,0,1,1,1,1]);
});
test('12-1: the kart drives the riders and a stop (event 61 value 0) lets them off',()=>{
 const s=mk(3),k=s.goKartState.karts[0];for(let i=0;i<70;i++)R.step(s,{});// MAX*dt per update: full speed after 60.01 updates
 assert.equal(k.veloRaw.xRaw,5*F);assert.ok(s.players.every(p=>p.riding===k.id));
 const q=K.ridePosition(k,0);assert.ok(Math.abs(s.players[0].x-(q.xRaw/F-16))<6);
 K.receiveEvent(k,{event:61,value:0});for(let i=0;i<120;i++)R.step(s,{});
 assert.equal(k.flags&1,0);assert.ok(s.players.every(p=>!p.riding));
});
