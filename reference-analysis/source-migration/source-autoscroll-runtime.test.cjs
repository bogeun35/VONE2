'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const mk=(id,n)=>R.create(R.compile({source,geometry,count:n,stageId:id}));
test('auto scroll speed per population follows prepare3 (base + (count-2) * offset, convertFP)',()=>{
 const cfp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
 for(const n of [2,5,8]){const s=mk('st_w_12_02',n);assert.equal(s.autoScrollState.scroll.autoScrollSpeedRaw,cfp(1.42)+cfp(-0.14)*(n-2));}
 assert.equal(mk('st_w_12_04',3).autoScrollState.scroll.autoScrollSpeedRaw,5*F);
});
test('the camera follows Stage.scrollPosition (funcAuto) and players are carried by its left edge',()=>{
 const s=mk('st_w_12_02',2),a=s.autoScrollState;
 for(let i=0;i<120&&s.status==='play';i++)R.step(s,{});
 // the area goes world->stage through the chip matrices, so it rounds a little
 assert.ok(Math.abs(a.cameraAreaRaw.x-a.scroll.scrollPositionRaw.xRaw)<F);
 assert.ok(a.scroll.scrollPositionRaw.xRaw>100*F);
 // both players were carried (the one in front by MoveContactActor), none left behind
 // a carried pair can trail by one scroll step: the walk-chain carry blocks where
 // the native pushback would shove the teammate (named approximation)
 const step=a.scroll.autoScrollSpeedRaw/F;
 assert.equal(s.status,'play');assert.ok(s.players.every(p=>p.x+16>=a.cameraAreaRaw.x/F-step-1));
});
test('a player held behind the left edge by more than 32 px is out (event 43)',()=>{
 const s=mk('st_w_12_02',2),a=s.autoScrollState;for(let i=0;i<60;i++)R.step(s,{});
 const p=s.players[0];p.x=a.cameraAreaRaw.x/F-16-40;R.step(s,{});
 assert.equal(s.status,'dead');assert.equal(s.failure.reason,'화면 밖으로 밀려났어요');
});
