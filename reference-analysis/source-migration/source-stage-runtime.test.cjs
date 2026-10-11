'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const compile=count=>R.compile({source,geometry,count});
function frames(s,n,input={}){for(let i=0;i<n;i++)R.step(s,input);return s;}
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
