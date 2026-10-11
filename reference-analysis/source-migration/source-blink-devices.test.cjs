'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Blink=require('./source-blink-devices.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const stage=id=>{
 const found=data.stages.find(s=>s.stageId===id);
 assert.ok(found,'missing source stage '+id);
 return found.json.stageInitParamList[0].actorCreateParamList;
};
const TILE=48; // terrain-runtime.js TILE, matching variant.worldTileSize.
const named=(state,name)=>{const b=state.blocks.find(x=>x.name===name);assert.ok(b,'missing '+name);return b;};
const step=(state,ticks,options)=>{for(let i=0;i<ticks;i++)Blink.beforeStep(state,{dt:1/60,...options});};

test('st_w_04_03 keeps every small block for all populations with native one second timers',()=>{
 const actors=stage('st_w_04_03');
 for(let count=2;count<=8;count++){
  const compiled=Blink.compile(actors,count);
  assert.equal(compiled.blocks.length,8);
  assert.deepEqual(compiled.warnings,[]);
  for(const block of compiled.blocks){
   assert.equal(block.blockTypeName,'Small');
   assert.deepEqual([block.w,block.h],[30,30]);
   assert.equal(block.appearTime,1);
   assert.equal(block.disappearTime,1);
   assert.equal(block.appearAtStart,true);
   assert.equal(block.funcTypeName,'default');
   assert.equal(block.showEffect,false);
  }
 }
});

test('native COLLISION_RECT offsets centre the box inside its source tile cell',()=>{
 // Small 30x30 at +1,+1 of an anchor the editor placed at cell+8 on X.
 const small=named(Blink.compile(stage('st_w_04_03'),4),'BlinkBlock1');
 assert.deepEqual([small.anchor.x,small.anchor.y],[104,144]);
 assert.deepEqual([small.x,small.y,small.w,small.h],[105,145,30,30]);
 const cellX=Math.floor(small.anchor.x/TILE)*TILE;
 assert.equal(small.x+small.w/2,cellX+TILE/2);
 // Large 46x46 at +1,+1 of a cell corner is centred on both axes.
 const large=named(Blink.compile(stage('st_b_01_08'),4),'BlinkBlock1');
 assert.deepEqual([large.anchor.x,large.anchor.y],[96,144]);
 assert.deepEqual([large.x,large.y,large.w,large.h],[97,145,46,46]);
 assert.equal(large.x+large.w/2,large.anchor.x+TILE/2);
 assert.equal(large.y+large.h/2,large.anchor.y+TILE/2);
});

test('st_b_01_08 spawn platforms hold five seconds then leave for a thousand',()=>{
 const compiled=Blink.compile(stage('st_b_01_08'),8);
 assert.equal(compiled.blocks.length,8);
 for(const block of compiled.blocks){
  assert.equal(block.blockTypeName,'Large');
  assert.equal(block.appearTime,5);
  assert.equal(block.disappearTime,1000);
  assert.equal(block.appearAtStart,true);
  assert.equal(block.showEffect,false);
 }
 const state=Blink.create(compiled);
 step(state,299);
 assert.equal(state.blocks.every(b=>b.visible),true);
 step(state,1);
 assert.equal(state.blocks.every(b=>b.visible),false);
});

test('an unset duration slot falls back to the native INTERVAL_TIME of one second',()=>{
 const block=Blink.compile(stage('st_b_01_04'),4).blocks[0];
 assert.equal(block.appearTime,1);
 assert.equal(block.disappearTime,1);
 assert.equal(block.appearAtStart,false);
 assert.equal(block.funcTypeName,'default');
});

test('st_l_03_04 packed slot five adds half a second from five players up',()=>{
 const actors=stage('st_l_03_04');
 for(let count=2;count<=8;count++){
  const compiled=Blink.compile(actors,count);
  const block=named(compiled,'BlinkBlock1');
  assert.equal(block.appearTime,count>=5?1.5:1);
  assert.equal(block.disappearTime,0.1);
  assert.equal(block.funcTypeName,'keep');
  assert.equal(block.showEffect,count>=5);
  // Population gating: BlinkBlock7 is playerCount -4, the upper row is 5.
  assert.equal(compiled.blocks.length,count>=5?10:6);
  assert.equal(compiled.blocks.some(b=>b.name==='BlinkBlock7'),count<=4);
  assert.equal(compiled.blocks.some(b=>b.name==='BlinkBlock2'),count>=5);
 }
});

test('func_default toggles on its own timer and only visible blocks are solid',()=>{
 const state=Blink.create(Blink.compile(stage('st_w_04_03'),2));
 const block=named(state,'BlinkBlock1');
 assert.equal(Blink.solids(state).length,8);
 step(state,59);
 assert.equal(block.visible,true);
 step(state,1);
 assert.equal(block.visible,false);
 assert.equal(Blink.solids(state).some(s=>s.id===block.id),false);
 step(state,59);
 assert.equal(block.visible,false);
 step(state,1);
 assert.equal(block.visible,true);
 const solid=Blink.solids(state).find(s=>s.id===block.id);
 assert.deepEqual([solid.x,solid.y,solid.w,solid.h,solid.solid],[105,145,30,30,true]);
});

test('a player in the slot blocks reappearance, and func_default restarts the whole appear time',()=>{
 const state=Blink.create(Blink.compile(stage('st_w_04_03'),2));
 const block=named(state,'BlinkBlock1');
 const standing=[{id:'p1',x:block.x,y:block.y,w:32,h:46}];
 step(state,60);
 assert.equal(block.visible,false);
 step(state,120,{players:standing});
 assert.equal(block.visible,false);
 assert.equal(block.blocked,true);
 // A cleared player, and a dead or exited one, never hold the slot.
 step(state,1,{players:[{id:'p1',x:block.x,y:block.y,w:32,h:46,exit:true}]});
 assert.equal(block.visible,true);
 assert.equal(block.timer,block.appearTime);
 step(state,59);
 assert.equal(block.visible,true);
 step(state,1);
 assert.equal(block.visible,false);
});

test('func_keep loses the blocked slot of the cycle but never drifts',()=>{
 const state=Blink.create(Blink.compile(stage('st_l_03_04'),2));
 const block=named(state,'BlinkBlock1');
 assert.deepEqual([block.appearTime,block.disappearTime],[1,0.1]);
 assert.equal(block.visible,false);
 step(state,5);
 assert.equal(block.visible,false);
 step(state,1); // 0.1 s hidden = 6 native ticks.
 assert.equal(block.visible,true);
 assert.equal(block.timer,block.appearTime);
 const standing=[{id:'p1',x:block.x,y:block.y,w:32,h:46}];
 step(state,59,{players:standing});
 assert.equal(block.visible,true);
 // Hiding is never blocked, so the block vanishes under the player on cue.
 step(state,1,{players:standing});
 assert.deepEqual([block.visible,block.visibleTiming],[false,false]);
 step(state,5,{players:standing});
 assert.equal(block.visibleTiming,false);
 step(state,1,{players:standing});
 assert.deepEqual([block.visible,block.visibleTiming,block.blocked],[false,true,true]);
 // Freeing the space mid cycle lets it appear with the remaining time only.
 step(state,1);
 assert.equal(block.visible,true);
 assert.ok(block.timer<block.appearTime);
 step(state,58);
 assert.equal(block.visible,true);
 step(state,1);
 assert.equal(block.visible,false);
});

test('a visible neighbour or any actor collider blocks reappearance',()=>{
 const state=Blink.create(Blink.compile(stage('st_w_04_03'),2));
 const block=named(state,'BlinkBlock1');
 const neighbour=named(state,'BlinkBlock2');
 neighbour.x=block.x;neighbour.y=block.y;neighbour.visible=true;neighbour.timer=1e6;
 step(state,60);
 assert.equal(block.visible,false);
 step(state,60);
 assert.deepEqual([block.visible,block.blocked],[false,true]);
 neighbour.visible=false;
 const crate={id:'pushbox:1',x:block.x,y:block.y,w:TILE,h:TILE};
 step(state,1,{obstacles:[crate]});
 assert.deepEqual([block.visible,block.blocked],[false,true]);
 step(state,1);
 assert.equal(block.visible,true);
});

test('the view effect fill follows the native shader formula only when enabled',()=>{
 const off=Blink.create(Blink.compile(stage('st_w_04_03'),2));
 assert.equal(Blink.effectFill(off.blocks[0]),null);
 const on=Blink.create(Blink.compile(stage('st_l_03_04'),5));
 const block=named(on,'BlinkBlock1');
 block.timer=block.appearTime;
 assert.equal(Blink.effectFill(block),0);
 block.timer=block.appearTime/4;
 assert.equal(Blink.effectFill(block),0.75);
 block.timer=-5;
 assert.equal(Blink.effectFill(block),1);
});

test('unverified parameter shapes are rejected instead of guessed',()=>{
 const base={typeName:'BlinkBlock',name:'x',posX:0,posY:0,playerCount:0,createThreshold:0,datas:[]};
 const withSlots=slots=>[{...base,datas:slots}];
 assert.throws(()=>Blink.compile(withSlots([{t:1,f:2}]),2),/Unknown BlinkBlockType/);
 assert.throws(()=>Blink.compile(withSlots([{t:2,s:'Small'}]),2),/numeric slot 0/);
 assert.throws(()=>Blink.compile(withSlots([{t:1,f:1},{t:2,s:'!!'}]),2),/numeric slot 1/);
 assert.throws(()=>Blink.compile(withSlots([{t:1,f:1},{t:0},{t:0},{t:0},{t:0},{t:2,s:'!!!'}]),2),/exactly seven packed values/);
 assert.throws(()=>Blink.compile(withSlots([{t:1,f:1},{t:1,f:-3}]),2),/Negative BlinkBlock duration/);
 assert.throws(()=>Blink.compile([{...base,createThreshold:2}],2),/Deferred BlinkBlock creation/);
 assert.throws(()=>Blink.compile(withSlots([]),1),/player count must be 2\.\.8/);
 assert.throws(()=>Blink.create({schemaVersion:2,blocks:[]}),/Compiled BlinkBlock set required/);
 assert.throws(()=>Blink.beforeStep(Blink.create(Blink.compile([],2)),{dt:NaN}),/Invalid BlinkBlock delta/);
 const extra=Blink.compile(withSlots([{t:1,f:1},{t:0},{t:0},{t:0},{t:0},{t:0},{t:0},{t:0},{t:1,f:9}]),2);
 assert.match(extra.warnings[0],/slot 8 is unread/);
});

test('the packed table decoder reproduces the raw little endian FP longs',()=>{
 const pack=raws=>raws.map(raw=>{let s='';let v=BigInt(raw)&((1n<<64n)-1n);for(let b=0;b<8;b++){s+=String.fromCharCode(Number(v&255n)+0x21);v>>=8n;}return s;}).join('');
 const table=pack([0,0,0,0x8000,0x8000,0x8000,0x8000]);
 const build=count=>Blink.compile([{typeName:'BlinkBlock',name:'t',posX:0,posY:0,playerCount:0,createThreshold:0,
  datas:[{t:1,f:1},{t:1,f:2},{t:0},{t:0},{t:0},{t:2,s:table},{t:0},{t:0}]}],count).blocks[0];
 for(let count=2;count<=4;count++)assert.equal(build(count).appearTime,2);
 for(let count=5;count<=8;count++)assert.equal(build(count).appearTime,2.5);
 // The real st_l_03_04 string must decode to exactly that table.
 const live=stage('st_l_03_04').find(a=>a.typeName==='BlinkBlock');
 assert.equal(live.datas[5].s.length,56);
 assert.equal(Blink.compile([{...live,playerCount:0}],5).blocks[0].appearTime-Blink.compile([{...live,playerCount:0}],2).blocks[0].appearTime,0.5);
});
