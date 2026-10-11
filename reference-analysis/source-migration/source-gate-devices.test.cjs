'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const G=require('./source-gate-devices.js'),Relay=require('./spring-switch-runtime.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const actors=data.stages.find(s=>s.stageId==='st_w_01_04').json.stageInitParamList[0].actorCreateParamList;
test('all populations select seven switches, while simultaneous-switch count grows with players',()=>{
 for(let n=2;n<=8;n++){
  const s=G.compile(actors,n),r=Relay.create(actors,n);assert.equal(s.gates.length,3);assert.equal(s.observers[0].total,7);assert.equal(s.keys[0].active,false);
  assert.equal(r.relays.filter(x=>x.type==='Switch'&&x.repeat).length,n-1);
 }
});
test('source Gate1 starts at exact native 32x160 and opens in64 native ticks',()=>{
 const s=G.create(G.compile(actors,2)),g=s.gates[0];assert.deepEqual([g.x,g.y,g.w,g.h],[1488,640,32,160]);
 G.signal(s,{targetName:'Gate1',eventType:61});for(let i=0;i<64;i++)G.beforeStep(s);
 assert.deepEqual([g.x,g.y,g.w,g.h,g.phase],[1488,768,32,32,3]);
 G.signal(s,{targetName:'Gate1',eventType:60});for(let i=0;i<128;i++)G.beforeStep(s);
 assert.deepEqual([g.x,g.y,g.w,g.h,g.phase],[1488,640,32,160,0]);
});
test('closing gate rolls back its current step when it would overlap player',()=>{
 const s=G.create(G.compile(actors,2)),g=s.gates[0];G.signal(s,{targetName:'Gate1',eventType:61});for(let i=0;i<64;i++)G.beforeStep(s);
 G.signal(s,{targetName:'Gate1',eventType:60});G.beforeStep(s,{players:[{id:'p',x:g.x,y:g.y-46,w:32,h:46}]});assert.equal(g.y,768);assert.equal(g.blocked,true);
});
test('latching switches stay active, held switch releases and observer enables/hides uncollected key',()=>{
 const s=G.create(G.compile(actors,2)),r=Relay.create(actors,2),switches=r.relays.filter(x=>x.type==='Switch');
 const contact=x=>({relayId:x.id,actorId:'p',layer:1,attributeFlags:2});
 for(const sw of switches.filter(x=>!x.repeat)){
  const out=Relay.step(r,1/60,{switchContacts:[contact(sw)]});G.afterStep(s,{relayState:r,events:out.events});
  Relay.step(r,1/60,{});assert.equal(sw.pressed,true);
 }
 assert.equal(s.keys[0].active,false);
 const held=switches.find(x=>x.repeat),out=Relay.step(r,1/60,{switchContacts:[contact(held)]});
 const all=G.afterStep(s,{relayState:r,events:out.events});assert.equal(all.keyActive,true);assert.equal(s.observers[0].pushedCount,7);
 const release=Relay.step(r,1/60,{}),off=G.afterStep(s,{relayState:r,events:release.events});assert.equal(off.keyActive,false);assert.equal(s.observers[0].pushedCount,6);
});
