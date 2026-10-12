'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('./source-stage-runtime.js');
const Relay=require('./spring-switch-runtime.js');
const Terrain=require('./terrain-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const compile=count=>R.compile({source,geometry,count});
function frames(s,n,input={}){for(let i=0;i<n;i++)R.step(s,input);return s;}
// Extracted original actors, straight out of the decoded stage file.
function sourceActors(stageId,variant=0){
 return source.stages.find(s=>s.stageId===stageId).json.stageInitParamList[variant].actorCreateParamList;
}
function sourceActor(stageId,name,variant=0){
 const a=sourceActors(stageId,variant).find(x=>x.name===name);
 assert.ok(a,'extracted actor '+name+' must exist in '+stageId);
 return a;
}
// Tiles the rectangle touches, from the imported original tile grid.
function touchedTiles(rect,t){
 const tiles=[];
 for(let gx=Math.floor(rect.x/t.tileSize);gx<=Math.ceil((rect.x+rect.w)/t.tileSize)-1;gx++)
  for(let gy=Math.floor(rect.y/t.tileSize);gy<=Math.ceil((rect.y+rect.h)/t.tileSize)-1;gy++)
   tiles.push({gx,gy,solid:!!t.cells.find(c=>c.gridX===gx&&c.gridY===gy)});
 return tiles;
}
test('compile original 01-01 for all 2..8 populations without source mutation or reflected coordinates',()=>{
 const before=JSON.stringify(source),gBefore=JSON.stringify(geometry);
 for(let count=2;count<=8;count++){
  const c=compile(count);assert.equal(c.map.width,2976);assert.equal(c.map.height,960);
  assert.equal(c.map.spawns.length,count);assert.deepEqual(c.map.spawns[0],{x:84,y:864.5});
  assert.equal(c.map.exit.y,64);assert.equal(c.map.springs.length,15);assert.equal(c.map.switches.length,2);
  assert.equal(c.map.springs[0].y,874);assert.equal(c.map.springs[0].h,38);
  assert.ok(c.status.missingMechanics.some(x=>x.includes('tick frequency')));
  const restored=JSON.parse(JSON.stringify(c));assert.equal(R.create(restored).players.length,count);
 }
 assert.equal(JSON.stringify(source),before);assert.equal(JSON.stringify(geometry),gBefore);
});
test('source player walk, source collision and held-jump accumulation produce distinct real trajectories',()=>{
 const short=R.create(compile(2)),long=R.create(compile(2));frames(short,5);frames(long,5);
 short.players[1].exit=true;long.players[1].exit=true;
 const start=short.players[0].x;frames(short,10,{p1:{right:true}});assert.equal(short.players[0].x-start,30);
 assert.equal(short.players[0].y+46,912);
 // Remove the unrelated second player from these trajectory measurements.
 short.players[1].exit=true;long.players[1].exit=true;
 R.step(short,{p1:{jump:true}});R.step(long,{p1:{jump:true}});
 let shortApex=short.players[0].y,longApex=long.players[0].y;
 for(let i=0;i<35;i++){R.step(short);R.step(long,{p1:{jump:true}});shortApex=Math.min(shortApex,short.players[0].y);longApex=Math.min(longApex,long.players[0].y);}
 assert.ok(longApex<shortApex-25);assert.equal(long.players[0].w,32);assert.equal(long.players[0].h,46);
});
test('fixed source ticks remain consistent under browser frame subdivision',()=>{
 const a=R.create(compile(2)),b=R.create(compile(2));
 frames(a,60,{p1:{left:true}});for(let i=0;i<120;i++)R.step(b,{p1:{left:true}},1/120);
 assert.equal(a.ticks,b.ticks);assert.deepEqual(a.players,b.players);
});
test('actual top collision triggers original switch mediator and spring after native windup',()=>{
 const s=R.create(compile(2)),button=s.map.switches.find(b=>b.type==='Switch'),spring=s.map.springs[0];
 Object.assign(s.players[0],{x:spring.x,y:spring.y-46,grounded:true,supportId:spring.id});
 Object.assign(s.players[1],{x:button.x-4,y:button.y+button.h-46,grounded:true,supportId:null});
 R.step(s);assert.equal(s.map.switches[0].pressed,true);assert.equal(s.relayState.relays.filter(r=>r.type==='JumpStand'&&r.parent==='JumpStandMediator1').every(r=>r.phase===2),true);
 let fired=false;for(let i=0;i<20;i++){R.step(s);if(s.lastImpulses.some(i=>i.actorId==='p1')){fired=true;assert.equal(s.players[0].vy,-26*60);break;}}
 assert.equal(fired,true);assert.equal(s.players[0].grounded,false);
});
test('standing stack suppresses bottom player jump and spring top-contact launch',()=>{
 const s=R.create(compile(2)),spring=s.map.springs[0];
 Object.assign(s.players[0],{x:spring.x,y:spring.y-46,grounded:true,supportId:spring.id});
 Object.assign(s.players[1],{x:spring.x,y:spring.y-92,grounded:true,supportId:'p1'});
 const mediator=s.relayState.relays.find(r=>r.name==='JumpStandMediator1');
 // Use the recovered relay event protocol, then actual solver-generated contacts.
 require('./spring-switch-runtime.js').step(s.relayState,0,{externalEvents:[{targetId:mediator.id,senderType:'Switch',senderName:'test',on:true}]});
 R.step(s,{p1:{jump:true}});assert.equal(s.players[0].jumpBlocked,true);
 for(let i=0;i<20;i++){R.step(s);assert.equal(s.lastImpulses.some(e=>e.actorId==='p1'),false);}
 assert.equal(s.lastContacts.springContacts[0].upContactCount,1);
});
test('key overlap opens goal; each player must press Up; entered bodies no longer block remaining team',()=>{
 for(let count=2;count<=8;count++){
  const s=R.create(compile(count));
  Object.assign(s.players[0],{x:s.map.key.x,y:s.map.key.y});R.step(s);assert.equal(s.keyTaken,true);
  const goal=s.map.exit;
  for(let i=0;i<count;i++){
   const p=s.players[i];Object.assign(p,{x:goal.x+8,y:goal.y-14,vy:0});
   R.step(s);assert.equal(p.exit,false,'overlap alone cannot enter');
   R.step(s,{[p.id]:{up:true}});assert.equal(p.exit,true);assert.equal(p.visible,false);assert.equal(p.vx,0);assert.equal(p.vy,0);
   assert.equal(s.status,i===count-1?'clear':'play');
  }
 }
});
test('closed goal rejects Up and unsupported stages fail explicitly',()=>{
 const s=R.create(compile(2)),p=s.players[0];Object.assign(p,{x:s.map.exit.x,y:s.map.exit.y});
 R.step(s,{p1:{up:true}});assert.equal(p.exit,false);
 assert.throws(()=>R.compile({source,geometry,count:2,stageId:'st_w_99_99'}),/does not support/);
 assert.throws(()=>R.step(s,{},NaN),/dt/);
});
// The authored fail line, not a guess: StageComponent.prepare3 0x18170aad0 adds
// stageInitParam.failDownY (0.0 on every World stage) to mapHeight*chipSize and
// otherwise falls back to QGameDefine..cctor 0x181780720 statics+0x10 = 2400.
// Cross-check: with a 144 margin only 2 of the game's 16 authored Warp volumes
// are reachable, with 2400 it is 15 of 16.
test('the source fail line sits 2400 below the floor, so the floor gap reaches the original Warp',()=>{
 const s=R.create(compile(2)),p=s.players[0],q=s.players[1],warp=s.map.warps[0];
 assert.deepEqual({x:warp.x,y:warp.y,w:warp.w,h:warp.h},{x:768,y:1056,w:240,h:96});
 assert.equal(s.map.failFallY,s.map.height+2400);
 assert.equal(s.map.killY,s.map.height+2400-47);
 assert.ok(s.map.killY>warp.y+warp.h,'the fail line must sit below the warp volume');
 Object.assign(p,{x:872,y:866,vy:0});
 let warped=false;
 for(let i=0;i<90&&s.status==='play';i++){R.step(s);if(warp.counter===1){warped=true;break;}}
 assert.equal(warped,true,'the floor gap must deliver the faller to the Warp');
 assert.equal(s.status,'play');
 assert.equal(p.x,720-16);assert.equal(p.y,432-47);
 assert.equal(p.vx,0);assert.equal(p.vy,0);assert.equal(p.supportId,null);
 const second=s.players[1];Object.assign(second,{x:872,y:1056,vy:30});R.step(s);
 assert.equal(second.x,720-16);assert.equal(second.y,432-50-47);
 assert.equal(second.vy,0);assert.equal(warp.counter,0);
 assert.ok(q);
});
test('a fall outside every Warp volume loses the round for the whole party',()=>{
 const s=R.create(compile(2)),p=s.players[0],q=s.players[1];
 // x=2000 is clear of the only volume, which spans x768..1008.
 Object.assign(p,{x:2000,y:s.map.height,vy:0});
 for(let i=0;i<600&&s.status==='play';i++)R.step(s,{});
 assert.equal(s.status,'dead');
 assert.equal(s.failure.reason,'fall');
 assert.equal(s.failure.playerId,p.id);
 assert.ok(p.y>s.map.killY,'the party only loses once the fail line is crossed');
 assert.equal(s.map.warps[0].counter,0);
 const frozen={x:q.x,y:q.y};
 frames(s,30,{p2:{right:true,jump:true}});
 assert.deepEqual({x:q.x,y:q.y},frozen,'the lost round stops for everyone');
});
test('a player can jump from a real teammate stack on the original spring row onto the first original stair',()=>{
 const s=R.create(compile(2)),spring=s.map.springs[8],bottom=s.players[0],top=s.players[1];
 Object.assign(bottom,{x:spring.x,y:spring.y-46,grounded:true,supportId:spring.id});
 Object.assign(top,{x:spring.x,y:spring.y-92,grounded:true,supportId:bottom.id});
 frames(s,35,{p2:{jump:true,right:true}});
 assert.equal(top.grounded,true);assert.equal(top.y+top.h,768);
 assert.ok(top.x>=1584);assert.equal(s.status,'play');
});
test('original delay switch counts five seconds before launching second spring group',()=>{
 const s=R.create(compile(2)),button=s.map.switches.find(b=>b.type==='DelaySwitch'),spring=s.map.springs[9];
 Object.assign(s.players[0],{x:spring.x,y:spring.y-46,grounded:true,supportId:spring.id});
 Object.assign(s.players[1],{x:button.x,y:button.y+button.h-46,grounded:true,supportId:null});
 R.step(s);assert.equal(s.relayState.relays.find(r=>r.id===button.id).remaining,5);
 frames(s,299);assert.equal(s.players[0].grounded,true);assert.equal(s.lastImpulses.length,0);
 let fired=false;for(let i=0;i<25;i++){R.step(s);if(s.lastImpulses.some(e=>e.actorId==='p1')){assert.equal(s.players[0].vy,-30*60);fired=true;break;}}
 assert.equal(fired,true);
});

test('Switch sensors can be crossed and held inside the original 48-pixel-high corridor',()=>{
 const s=R.create(R.compile({source,geometry,count:8,stageId:'st_w_01_04'})),p=s.players[0],button=s.map.switches.find(b=>b.name==='Switch9');
 Object.assign(p,{x:1480,y:1346,vy:0,grounded:true,supportId:null});
 frames(s,16,{p1:{right:true}});
 assert.equal(p.x,1528);assert.equal(p.y,1346);assert.equal(p.grounded,true);
 assert.equal(s.relayState.relays.find(r=>r.id===button.id).pressed,true);
 assert.equal(R.solids(s).some(b=>b.id===button.id),false);
});

// ---------------------------------------------------------------------------
// Switch direction support. The sensor rectangles come from
// SwitchComponent..cctor 0x181715330 through GetCollisionByDirection
// 0x1817145a0; see switch-direction-report.json.
// ---------------------------------------------------------------------------

test('the decoded direction table is the native one, and any other byte falls back to direction 0', () => {
 assert.deepEqual(Relay.SWITCH_RECTS[0], {x:-9,y:-9,w:18,h:9});
 assert.deepEqual(Relay.SWITCH_RECTS[1], {x:-9,y:2,w:18,h:9});
 assert.deepEqual(Relay.SWITCH_RECTS[2], {x:-9,y:-7,w:9,h:18});
 assert.deepEqual(Relay.SWITCH_RECTS[3], {x:0,y:-7,w:9,h:18});
 assert.deepEqual(Relay.SWITCH_RECT_FOR_TOPVIEW, {x:-9,y:-14,w:18,h:14});
 // Directions 1,2,3 are the only ones GetCollisionByDirection branches on.
 for (const d of [4,5,255,-1]) assert.deepEqual(Relay.switchRect(Relay.switchDirection(d)), Relay.SWITCH_RECTS[0]);
 // ParseParameter stores a byte, so 256 wraps to 0 and 259 wraps to 3.
 assert.equal(Relay.switchDirection(256), 0);
 assert.equal(Relay.switchDirection(259), 3);
 assert.equal(Relay.switchDirection(3.9), 3);
});

test('direction 0 switches keep the original 18x9 sensor above the anchor', () => {
 // The world01-01 Switch is unnamed, so match the extracted actor by anchor.
 const c = compile(2), button = c.map.switches.find(b => b.type === 'Switch');
 const actor = sourceActors('st_w_01_01').find(a => a.typeName === 'Switch');
 assert.deepEqual({x:actor.posX, y:actor.posY}, {x:1962, y:480});
 assert.equal(actor.datas[5].f, 0);
 assert.equal(button.direction, 0);
 assert.deepEqual({x:button.x, y:button.y, w:button.w, h:button.h},
  {x:actor.posX-9, y:actor.posY-9, w:18, h:9});
 // Every switch of every connected round that has one is direction 0 and keeps
 // the exact box this runtime used before direction support was widened. The
 // direction slot is 5 on a Switch and 2 on a DelaySwitch
 // (NormalSwitchComponent.ParseParameter 0x181888b89 /
 // DelaySwitchComponent.ParseParameter 0x1818193b0).
 let checked = 0;
 for (const stageId of ['st_w_01_01', 'st_w_01_04']) for (let count = 2; count <= 8; count++)
  for (const b of R.compile({source, geometry, count, stageId}).map.switches) {
   const a = sourceActors(stageId).find(x => x.typeName === b.type &&
    x.posX === b.x + 9 && x.posY === b.y + 9 && (x.name || '') === b.name);
   assert.ok(a, 'every compiled switch must come from an extracted actor');
   assert.equal(a.datas[b.type === 'DelaySwitch' ? 2 : 5].f, 0);
   assert.equal(b.direction, 0);
   assert.deepEqual({x:b.x, y:b.y, w:b.w, h:b.h}, {x:a.posX-9, y:a.posY-9, w:18, h:9});
   checked++;
  }
 assert.equal(checked, 7 * (2 + 7));
});

test('original 05-02 compiles for every population with its four authored directions', () => {
 const before = JSON.stringify(source);
 const expected = {2:1, 3:2, 4:3, 5:4, 6:4, 7:4, 8:4};
 for (let count = 2; count <= 8; count++) {
  const c = R.compile({source, geometry, count, stageId:'st_w_05_02'});
  assert.equal(c.map.id, 'st_w_05_02');
  assert.equal(c.map.width, 2400); assert.equal(c.map.height, 480);
  assert.equal(c.map.spawns.length, count);
  const trigger = c.map.switches.filter(b => b.name.startsWith('TriggerSwitch'));
  assert.equal(trigger.length, expected[count], count + ' players must see ' + expected[count] + ' wall switches');
  for (const b of trigger) {
   const actor = sourceActor('st_w_05_02', b.name);
   assert.equal(actor.datas[5].f, 3);
   assert.equal(b.direction, 3);
   // RectFP X=0 W=9 Y=-7 H=18 from statics+0x80/+0x90.
   assert.deepEqual({x:b.x, y:b.y, w:b.w, h:b.h}, {x:actor.posX, y:actor.posY-7, w:9, h:18});
  }
  // The DeadTimer buttons on the same stage are direction 0 and must not move.
  for (const b of c.map.switches.filter(x => !x.name.startsWith('TriggerSwitch'))) {
   const actor = sourceActor('st_w_05_02', b.name);
   assert.equal(actor.datas[5].f, 0);
   assert.deepEqual({x:b.x, y:b.y, w:b.w, h:b.h}, {x:actor.posX-9, y:actor.posY-9, w:18, h:9});
  }
  assert.equal(R.create(c).players.length, count);
 }
 assert.equal(JSON.stringify(source), before);
});

test('the direction 3 sensor sits on the open +X side of the wall it is mounted on, not inside it', () => {
 const t = Terrain.createTerrain({source, geometry, count:2, stageId:'st_w_05_02'});
 const actor = sourceActor('st_w_05_02', 'TriggerSwitch1');
 assert.deepEqual({x:actor.posX, y:actor.posY}, {x:48, y:408});
 const direction3 = {x:actor.posX + 0, y:actor.posY - 7, w:9, h:18};
 const direction2 = {x:actor.posX - 9, y:actor.posY - 7, w:9, h:18};
 // Shipped data cannot contain an unreachable device: the mirror-image
 // direction 2 rectangle is buried in the solid left wall, while the authored
 // direction 3 rectangle is in open space.
 assert.ok(touchedTiles(direction2, t).every(x => x.solid), 'direction 2 would be inside the wall');
 assert.ok(touchedTiles(direction3, t).every(x => !x.solid), 'direction 3 must be reachable');
});

test('a direction 3 wall switch answers a body on its +X side and ignores one on the -X side', () => {
 const c = R.compile({source, geometry, count:2, stageId:'st_w_05_02'});
 const button = c.map.switches.find(b => b.name === 'TriggerSwitch1');
 // A 32x46 player flush against the wall face reaches the sensor.
 assert.equal(R.overlap({x:48, y:386, w:32, h:46}, button), true);
 // The same body mirrored to the other side of the anchor does not.
 assert.equal(R.overlap({x:48-32, y:386, w:32, h:46}, button), false);
 // Nor does one that only shares the anchor column, from above or from below.
 assert.equal(R.overlap({x:48, y:button.y-46, w:32, h:46}, button), false);
 assert.equal(R.overlap({x:48, y:button.y+button.h, w:32, h:46}, button), false);
 // Switch.InitCollision 0x18171484c builds a sensor, never a solid.
 assert.equal(R.solids(R.create(c)).some(b => b.id === button.id), false);
});

test('the original 05-02 push box holds the direction 3 wall switch down and the observer unlocks the key', () => {
 const s = R.create(R.compile({source, geometry, count:2, stageId:'st_w_05_02'}));
 const button = s.map.switches.find(b => b.name === 'TriggerSwitch1');
 const relay = () => s.relayState.relays.find(r => r.id === button.id);
 const box = () => s.deviceState.devices.find(d => d.name === 'PushBox3');
 // PushBox3 starts clear of the sensor and the key starts locked.
 assert.equal(box().x, 96); assert.equal(R.overlap(box(), button), false);
 assert.equal(relay().pressed, false); assert.equal(s.keyActive, false);
 let pressedAt = -1;
 for (let i = 0; i < 600 && s.status === 'play'; i++) {
  R.step(s, {p1:{left:true}, p2:{left:true}});
  if (relay().pressed && pressedAt < 0) pressedAt = i;
 }
 assert.ok(pressedAt > 0, 'pushing the box left must press the wall switch');
 // It is the box, not a player, inside the sensor: PushBox collisions are
 // layer2 / attribute3 (0x1816db651 / 0x1816db625), both accepted by
 // SwitchComponent.OnCollided 0x181714f80.
 assert.equal(R.overlap(box(), button), true);
 assert.ok(s.lastContacts.switchContacts.some(c => c.relayId === button.id && c.actorId === box().id && c.layer === 2));
 assert.ok(!s.players.some(p => R.overlap(p, button)), 'the box blocks the players from the wall');
 assert.equal(s.keyActive, true, 'the SwitchObserver must unlock Key1');
});

test('the 05-02 DeadTimer loses the round after its authored countdown when nobody moves', () => {
 for (let count = 2; count <= 8; count++) {
  const c = R.compile({source, geometry, count, stageId:'st_w_05_02'});
  const timer = c.switchTimers.timers.find(t => t.type === 'DeadTimer');
  assert.equal(timer.timeUpTypeName, 'Dead');
  assert.equal(timer.sec, 15);
  const s = R.create(c);
  for (let i = 0; i < 60 * 20 && s.status === 'play'; i++) R.step(s, {});
  assert.equal(s.status, 'dead');
  assert.ok(Math.abs(s.elapsed - timer.sec) <= 1/60, 'the round must end on the authored second');
 }
});

test('the extracted st_w_10_04 direction 1 switch takes the sensor below its anchor', () => {
 const actor = sourceActor('st_w_10_04', 'Switch2');
 assert.deepEqual({x:actor.posX, y:actor.posY}, {x:1904, y:46});
 assert.equal(actor.datas[5].f, 1);
 assert.equal(actor.datas[3].s, 'Bridge2');
 const relay = Relay.create([actor], 2).relays[0];
 assert.equal(relay.direction, 1);
 // RectFP X=-9 W=18 Y=2 H=9 from statics+0x40/+0x50.
 assert.deepEqual(relay.rect, {x:-9, y:2, w:18, h:9});
 const t = Terrain.createTerrain({source, geometry, count:2, stageId:'st_w_10_04'});
 const direction1 = {x:actor.posX - 9, y:actor.posY + 2, w:18, h:9};
 const direction0 = {x:actor.posX - 9, y:actor.posY - 9, w:18, h:9};
 assert.deepEqual(direction1, {x:1895, y:48, w:18, h:9});
 // Same reachability argument: an upward sensor here would be sealed inside the
 // ceiling tile the switch is mounted in; the authored downward one is not.
 assert.ok(touchedTiles(direction0, t).every(x => x.solid), 'direction 0 would be inside the ceiling');
 assert.ok(touchedTiles(direction1, t).every(x => !x.solid), 'direction 1 must be reachable');
});

test('a direction 1 ceiling switch answers a body below it, not one above it, and signals its target', () => {
 const actor = sourceActor('st_w_10_04', 'Switch2');
 const fresh = () => Relay.create([actor], 2);
 const state = fresh(), relay = state.relays[0];
 const button = {x:actor.posX + relay.rect.x, y:actor.posY + relay.rect.y, w:relay.rect.w, h:relay.rect.h};
 // A jumping player whose head enters the strip under the ceiling.
 assert.equal(R.overlap({x:1888, y:button.y - 40, w:32, h:46}, button), true);
 // A player standing on top of the ceiling tile, where direction 0 would sense.
 assert.equal(R.overlap({x:1888, y:actor.posY - 46, w:32, h:46}, button), false);
 const contact = {relayId:relay.id, actorId:'p1', layer:1, attributeFlags:3};
 const on = Relay.step(state, 1/60, {switchContacts:[contact]});
 assert.ok(on.events.some(e => e.targetName === 'Bridge2' && e.eventType === 61));
 // Attribute bit1 and layers 1,2,3,8 are the whole filter; everything else is
 // ignored (SwitchComponent.OnCollided 0x18171502a..0x181715042).
 assert.equal(Relay.step(fresh(), 1/60, {switchContacts:[{...contact, attributeFlags:1}]}).events.length, 0);
 assert.equal(Relay.step(fresh(), 1/60, {switchContacts:[{...contact, layer:5}]}).events.length, 0);
 assert.equal(Relay.step(fresh(), 1/60, {switchContacts:[{...contact, layer:8}]}).events.length, 1);
});

// st_w_01_02 는 상자를 머리에 이고 가시를 막는 라운드다. 상자가 사람을 따라오지
// 않으면 방패가 성립하지 않는다. 엔진은 접촉 액터를 일반적으로 옮기지만
// (ActorComponent.MoveContactActor 0x1816a0980 등) 그 시스템 전체는 미해독이라,
// 연결된 라운드가 필요로 하는 이 한 경우만 재현한다.
test('a box carried on a player shields them from the thorns of 01-02',()=>{
 const compiled=R.compile({source,geometry,count:2,stageId:'st_w_01_02'});
 const walkRight=(setup)=>{
  const s=R.create(compiled,{ids:['p1','p2']});
  setup(s);
  let ticks=0;
  for(;ticks<60*25&&s.status==='play';ticks++)R.step(s,{p1:{right:true}},1/60);
  return {status:s.status,ticks,x:Math.round(s.players[0].x)};
 };
 const shielded=walkRight(s=>{
  const box=s.deviceState.devices.find(d=>d.type==='PushBox'),p=s.players[0];
  Object.assign(p,{x:box.x+8,y:box.y+box.h,vy:0});
  for(let i=0;i<30;i++)R.step(s,{},1/60);
  assert.equal(box.supportId,'p1','the box must settle on the carrier');
 });
 const bare=walkRight(s=>{
  const box=s.deviceState.devices.find(d=>d.type==='PushBox');
  Object.assign(box,{x:-9999,y:-9999});
  s.players[0].x=424;
 });
 assert.equal(bare.status,'dead','without the box the thorns must kill');
 assert.ok(bare.ticks<240,'and quickly: saw tick '+bare.ticks);
 assert.equal(shielded.status,'play','the carried box must block them');
 assert.ok(shielded.x>bare.x+1000,'the shielded run must get much further: '+shielded.x+' vs '+bare.x);
});
