'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('./source-warpinit-devices.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const stage=id=>data.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
// st_w_10_02 owns the only WarpInitPos in the shipped data; st_select owns the
// only WarpAllInitPos. Both are read straight from the decoded source actors.
const world=stage('st_w_10_02'),select=stage('st_select');
const player=(init,over={})=>({id:'p'+(over.n||1),x:init.x-16,y:init.y-47,w:32,h:46,vx:0,vy:0,
 grounded:true,ground:true,supportId:'terrain:0',jumpFrame:0,forcedVx:0,initPos:init,...over});

test('the only WarpInitPos is source actor type 44 with the native volume and offset', () => {
 for(let n=2;n<=8;n++){
  const c=W.compile(world,n);
  assert.equal(c.warps.length,1);
  const w=c.warps[0];
  assert.equal(w.name,'WarpInitPos1');
  assert.equal(w.actorType,44);
  assert.equal(w.warpType,2);
  assert.equal(w.targetAll,false);
  // Actor position is the volume's top-left corner, slots 0/1 are width/height.
  assert.deepEqual([w.x,w.y,w.w,w.h],[-100,1387,1500,400]);
  assert.deepEqual(w.offset,{x:0,y:-600});
  assert.deepEqual(w.unusedDestination,{x:0,y:0});
  assert.equal(w.usesOrdinalCounter,false);
  assert.equal(w.disableCorrectWarpPos,true);
  assert.equal(w.layer,14);
  assert.deepEqual(c.warnings,[]);
  // Warp volumes are notification sensors, never solids.
  assert.deepEqual(W.solids(W.create(c)),[]);
  assert.deepEqual(W.beforeStep(W.create(c),{}).solids,[]);
 }
});

test('compiled init positions follow the population spawn selection', () => {
 const expected=[481,1536,384,1632,288,1728,192,1824];
 for(let n=2;n<=8;n++){
  const c=W.compile(world,n);
  assert.equal(c.initPositions.length,n);
  assert.deepEqual(c.initPositions.map(p=>p.x),expected.slice(0,n));
  assert.ok(c.initPositions.every(p=>p.y===576));
 }
});

test('WarpInitPos moves only the contacted player to its own spawn plus the offset', () => {
 const c=W.compile(world,4),s=W.create(c);
 const players=c.initPositions.map((init,i)=>player(init,{n:i+1}));
 const faller=players[2];
 faller.x=300;faller.y=1400;faller.vx=7*60;faller.vy=19.5*60;faller.forcedVx=7*60;
 faller.grounded=false;faller.ground=false;faller.supportId=null;faller.jumpFrame=5;
 const rider=players[3];rider.supportId=faller.id;rider.grounded=true;rider.ground=true;
 const out=W.afterStep(s,{players});
 assert.equal(out.warped.length,1);
 assert.deepEqual(out.warped[0].anchor,{x:384,y:-24});
 // SetPosForce receives the anchor; the collision box sits at anchor+(-16,-47).
 assert.deepEqual([faller.x,faller.y],[384-16,-24-47]);
 // ResetVeloAll zeroes velocity, acceleration and jump velocity.
 assert.deepEqual([faller.vx,faller.vy,faller.forcedVx,faller.jumpFrame],[0,0,0,0]);
 assert.equal(faller.grounded,false);
 assert.equal(faller.supportId,null);
 // ClearCollisionContactInfo drops the riders that stood on the warped actor.
 assert.equal(rider.supportId,null);
 assert.equal(rider.grounded,false);
 // Everybody else keeps standing where they were.
 assert.deepEqual([players[0].x,players[0].y],[481-16,576-47]);
 assert.deepEqual([players[1].x,players[1].y],[1536-16,576-47]);
 assert.equal(s.warps[0].triggers,1);
 assert.equal(s.warps[0].contacting,true);
});

test('the volume is a finite band: a fall outside its bounds is not caught', () => {
 const c=W.compile(world,2),s=W.create(c);
 const players=c.initPositions.map((init,i)=>player(init,{n:i+1}));
 const faller=players[0];
 // Right of x=1400 and below y=1787 are both outside the authored rectangle.
 for(const [x,y] of [[1400,1400],[300,1340],[300,1787],[-132,1400]]){
  faller.x=x;faller.y=y;faller.grounded=false;faller.supportId=null;
  assert.deepEqual(W.afterStep(s,{players}).warped,[],'expected no warp at '+x+','+y);
 }
 assert.equal(s.warps[0].triggers,0);
 assert.equal(s.warps[0].contacting,false);
 // One pixel inside each edge does trigger.
 faller.x=1399-32+1;faller.y=1387-46+1;
 assert.equal(W.afterStep(s,{players}).warped.length,1);
});

test('every player keeps its own destination, so warping is not a shared point', () => {
 const c=W.compile(world,8),s=W.create(c);
 const seen=[];
 for(let i=0;i<8;i++){
  const players=c.initPositions.map((init,n)=>player(init,{n:n+1}));
  const faller=players[i];faller.x=200;faller.y=1500;faller.grounded=false;faller.supportId=null;
  const out=W.afterStep(s,{players});
  assert.equal(out.warped.length,1);
  seen.push(out.warped[0].anchor.x);
  assert.equal(out.warped[0].anchor.y,-24);
 }
 assert.deepEqual(seen,[481,1536,384,1632,288,1728,192,1824]);
});

test('a layer2 PushBox is returned to its own spawn rectangle', () => {
 const c=W.compile(world,2),s=W.create(c);
 assert.deepEqual(c.boxes,[{name:'PushBox1',sourceIndex:11,w:48,h:48,initX:342,initY:382}]);
 const players=c.initPositions.map((init,i)=>player(init,{n:i+1}));
 const box={id:'device:11',name:'PushBox1',type:'PushBox',x:700,y:1400,w:48,h:48,vx:1,vy:12,grounded:false,pushCount:2};
 const out=W.afterStep(s,{players,boxes:[box]});
 assert.equal(out.warped.length,1);
 assert.equal(out.warped[0].kind,'box');
 assert.deepEqual([box.x,box.y],[342,382-600]);
 assert.deepEqual([box.vx,box.vy,box.grounded,box.pushCount],[0,0,false,0]);
 // A box resting on the floor is untouched, and omitting ctx.boxes is allowed.
 box.x=342;box.y=382;
 assert.deepEqual(W.afterStep(s,{players,boxes:[box]}).warped,[]);
 assert.deepEqual(W.afterStep(s,{players}).warped,[]);
});

test('WarpAllInitPos is actor type 43 and broadcasts to every live player', () => {
 // st_select spawns MainMenuPlayer actors, which this port does not model, so
 // its real WarpAllInitPos actor is replayed against real world-stage spawns.
 const actors=[...world.filter(a=>a.typeName==='Player'),...select.filter(a=>a.typeName==='WarpAllInitPos')];
 const c=W.compile(actors,3);
 assert.equal(c.warps.length,1);
 const w=c.warps[0];
 assert.equal(w.type,'WarpAllInitPos');
 assert.equal(w.actorType,43);
 assert.equal(w.warpType,3);
 assert.equal(w.targetAll,true);
 // st_select leaves every numeric slot after width/height empty, which the
 // native parser reads as zero, so the destination is the exact spawn.
 assert.deepEqual([w.x,w.y,w.w,w.h],[1140,300,200,200]);
 assert.deepEqual(w.offset,{x:0,y:0});
 const s=W.create(c),players=c.initPositions.map((init,i)=>player(init,{n:i+1}));
 players[0].x=1200;players[0].y=350;
 for(const p of players){p.vx=180;p.vy=90;}
 const out=W.afterStep(s,{players});
 assert.equal(out.warped.length,3);
 for(const [i,p] of players.entries()){
  assert.deepEqual([p.x,p.y],[c.initPositions[i].x-16,c.initPositions[i].y-47]);
  assert.deepEqual([p.vx,p.vy],[0,0]);
 }
});

test('st_select cannot be compiled, because its spawns are MainMenuPlayer actors', () => {
 assert.ok(select.some(a=>a.typeName==='MainMenuPlayer'));
 assert.ok(!select.some(a=>a.typeName==='Player'));
 assert.throws(()=>W.compile(select,2),/no spawn for every player/);
});

test('exited and dead players are never warped', () => {
 const c=W.compile(world,2),s=W.create(c);
 const players=c.initPositions.map((init,i)=>player(init,{n:i+1}));
 for(const flag of ['exit','dead']){
  players[0].x=300;players[0].y=1400;players[0][flag]=true;
  assert.deepEqual(W.afterStep(s,{players}).warped,[]);
  delete players[0][flag];
 }
});

test('a player without a native m_InitPos fails loudly instead of guessing', () => {
 const c=W.compile(world,2),s=W.create(c);
 const players=[{id:'p1',x:300,y:1400,w:32,h:46,vx:0,vy:0},player(c.initPositions[1],{n:2})];
 assert.throws(()=>W.afterStep(s,{players}),/no native m_InitPos/);
});

test('compile rejects malformed input and stays a no-op for stages without the device', () => {
 assert.throws(()=>W.compile(world,1),/2\.\.8/);
 assert.throws(()=>W.compile(world,9),/2\.\.8/);
 assert.throws(()=>W.compile(null,2),/actor list/);
 assert.throws(()=>W.create({schemaVersion:2}),/Compiled WarpInitPos data required/);
 assert.throws(()=>W.afterStep(W.create(W.compile(world,2)),{dt:-1}),/Invalid warp delta/);
 const bad=world.map(a=>a.typeName==='WarpInitPos'?{...a,datas:a.datas.map((d,i)=>i===0?{t:1,f:0}:d)}:a);
 assert.throws(()=>W.compile(bad,2),/Unsupported WarpInitPos dimensions/);
 const plain=stage('st_w_01_01');
 const empty=W.compile(plain,2);
 assert.deepEqual([empty.warps,empty.boxes,empty.initPositions,empty.warnings],[[],[],[],[]]);
});

test('the authored destination slots are reported, never used', () => {
 const patched=world.map(a=>a.typeName==='WarpInitPos'
  ?{...a,datas:a.datas.map((d,i)=>i===2?{t:1,f:999}:i===3?{t:1,f:888}:d)}:a);
 const c=W.compile(patched,2),s=W.create(c);
 assert.deepEqual(c.warps[0].unusedDestination,{x:999,y:888});
 assert.equal(c.warnings.length,1);
 assert.match(c.warnings[0],/destination slots 2\/3 are ignored/);
 const players=c.initPositions.map((init,i)=>player(init,{n:i+1}));
 players[0].x=300;players[0].y=1400;
 assert.deepEqual(W.afterStep(s,{players}).warped[0].anchor,{x:481,y:-24});
});

test('a destination that lands on the FP origin leaves the actor alone', () => {
 // warpProc only applies |m_WarpPos| >= 4 raw FP units, so an exact zero
 // destination is indistinguishable from "no warp pending".
 const patched=world.map(a=>a.typeName==='WarpInitPos'
  ?{...a,datas:a.datas.map((d,i)=>i===4?{t:1,f:-481}:i===5?{t:1,f:-576}:d)}:a);
 const c=W.compile(patched,2),s=W.create(c);
 const players=c.initPositions.map((init,i)=>player(init,{n:i+1}));
 players[0].x=300;players[0].y=1400;players[0].grounded=false;players[0].supportId=null;
 assert.deepEqual(W.afterStep(s,{players}).warped,[]);
 assert.deepEqual([players[0].x,players[0].y],[300,1400]);
 assert.ok(W.pendingEpsilon>0&&W.pendingEpsilon<1);
});
