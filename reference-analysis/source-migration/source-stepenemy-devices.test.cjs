'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./source-stepenemy-devices.js');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const mk=(n,src=source)=>R.create(R.compile({source:src,geometry,count:n,stageId:'st_w_02_01'}));
const noRope=()=>{const src=JSON.parse(JSON.stringify(source));const v=src.stages.find(x=>x.stageId==='st_w_02_01').json.stageInitParamList[0];v.actorCreateParamList=v.actorCreateParamList.filter(a=>a.typeName!=='DistanceConstraint');return src;};

test('StepEnemy slot0 >= 1 walks left at SPEED 1.0 per update and turns at walls',()=>{
 const e=E.compile([{typeName:'StepEnemy',posX:100,posY:100,datas:[{t:1,f:1}]}],2).enemies[0];
 assert.equal(e.dirXRaw,-F);e.grounded=true;E.update(e,{gravityRaw:42598});
 assert.deepEqual(e.veloRaw,{xRaw:-F,yRaw:42598});
 E.contactMap(e,{xRaw:-F,yRaw:0});assert.equal(e.dirXRaw,F);
 E.contactMap(e,{xRaw:0,yRaw:F});assert.equal(e.dirXRaw,F);// a floor normal does not turn it
});
test('StepEnemy contacts: from above a jump request of -334234, otherwise event 43',()=>{
 const e=E.compile([{typeName:'StepEnemy',posX:0,posY:0,datas:[{t:1,f:0}]}],2).enemies[0];
 assert.deepEqual(E.contactActor(e,{xRaw:0,yRaw:-F},{layer:1,veloXRaw:0}),{eventType:36,jumpRaw:{xRaw:0,yRaw:-334234}});
 assert.deepEqual(E.contactActor(e,{xRaw:F,yRaw:0},{layer:1,veloXRaw:0}),{eventType:43});
 // the side hit also turns it unless the other moves the same way at least as fast
 e.veloRaw.xRaw=F;e.dirXRaw=F;E.contactActor(e,{xRaw:F,yRaw:0},{layer:2,veloXRaw:2*F});assert.equal(e.dirXRaw,F);
 E.contactActor(e,{xRaw:F,yRaw:0},{layer:2,veloXRaw:0});assert.equal(e.dirXRaw,-F);
});
test('2-1: the enemy walks into an idle 8-player group, stomping bounces (no rope)',()=>{
 const s=mk(8);for(let i=0;i<300&&s.status==='play';i++)R.step(s,{});
 assert.equal(s.status,'dead');assert.equal(s.failure.reason,'적에게 닿았어요');
 const t=mk(2,noRope()),e=t.stepEnemyState.enemies[0];R.step(t,{});const r=E.rect(e);
 t.players[0].x=r.x+8;t.players[0].y=r.y-86;t.players[1].x=r.x+68;t.players[1].y=r.y-146;
 const ys=[];for(let i=0;i<30;i++){R.step(t,{});ys.push(t.players[0].y);}
 assert.equal(t.status,'play');assert.ok(Math.min(...ys.slice(10))<Math.max(...ys)-15);// bounced ~20 px
});
test('2-1 WarpAll sends every player to the destination with accumulating offsets',()=>{
 const s=mk(4),w=s.map.warps[0];assert.ok(w.targetAll);
 s.players.forEach((p,k)=>{p.x=w.x+50+k*40;p.y=w.y+50;});R.step(s,{});
 assert.deepEqual(s.players.map(q=>[Math.round(q.x+16),Math.round(q.y+47)]),[[1262,-48],[1262,-98],[1262,-198],[1262,-348]]);
});
