'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('./source-motion-devices.js'),T=require('./terrain-runtime.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const geometry=JSON.parse(fs.readFileSync(path.join(__dirname,'source-geometry.local.json')));
const compile=count=>M.compile(T.createTerrain({source,geometry,count,stageId:'st_w_01_03'}).actors,count);
test('all original populations compile exact dash, wall hit counts and source rectangles',()=>{
 for(let count=2;count<=8;count++){
  const c=compile(count);assert.equal(c.rects.length,4);assert.equal(c.walls.length,1);assert.equal(c.dashBoards.length,1);
  assert.deepEqual(c.rects.map(r=>[r.x,r.y,r.w,r.h]),[[840,240,96,48],[720,392,144,88],[672,344,144,88],[0,296,768,88]]);
  assert.equal(c.walls[0].x,count<4?1152:1248);assert.equal(c.walls[0].hitsRequired,count===2?8:count===3?9:10);
  assert.equal(c.walls[0].blockCount,10);assert.equal(c.walls[0].blockSize,50);
  assert.deepEqual(M.triggerDash(c.dashBoards[0]),{vx:40,vy:-10,forceJump:true,clearHorizontalOnLanding:true});
  assert.deepEqual([c.dashBoards[0].x,c.dashBoards[0].y,c.dashBoards[0].w,c.dashBoards[0].h],[854,232,64,8]);
 }
});
test('wall does not fall without hits and insufficient sequences recover',()=>{
 const s=M.create(compile(8)),w=s.walls[0];for(let i=0;i<600;i++)M.step(s);
 assert.equal(w.angle,0);assert.equal(w.fallen,false);assert.equal(M.hitWall(s,w.id,-2),true);
 for(let i=0;i<90;i++)M.step(s);assert.ok(w.angle>0);assert.equal(w.hits,1);
 for(let i=0;i<150;i++)M.step(s);assert.equal(w.hits,0);assert.equal(w.targetAngle,0);
 for(let i=0;i<150;i++)M.step(s);assert.ok(w.angle<.001);
});
test('pre-contact velocity threshold, reflection and per-wall cooldown prevent duplicate impacts',()=>{
 const s=M.create(compile(2)),w=s.walls[0];
 assert.equal(M.contactWall(s,w.id,{vx:3,vy:0}).hit,false);
 assert.equal(M.contactWall(s,w.id,{vx:-40,vy:0}).hit,false);
 const first=M.contactWall(s,w.id,{vx:40,vy:-10});assert.equal(first.hit,true);assert.ok(first.impulse.vx<0);assert.ok(first.impulse.vy<0);assert.equal(w.hits,1);
 assert.equal(M.contactWall(s,w.id,{vx:40,vy:-10}).hit,false);assert.equal(w.hits,1);
 for(let i=0;i<13;i++)M.step(s);assert.equal(M.contactWall(s,w.id,{vx:40,vy:-10}).hit,true);assert.equal(w.hits,2);
});
test('all seven populations fall after required coordinated hits and retain solid bridge blocks',()=>{
 for(let count=2;count<=8;count++){
  const s=M.create(compile(count)),w=s.walls[0];
  for(let h=0;h<w.hitsRequired;h++){assert.equal(M.contactWall(s,w.id,{vx:40,vy:0}).hit,true);for(let i=0;i<13;i++)M.step(s);}
  for(let i=0;i<600&&!w.fallen;i++)M.step(s);
  assert.equal(w.fallen,true,'count '+count);assert.equal(w.hits,w.hitsRequired);
  const blocks=M.solids(s).filter(b=>b.wallId===w.id);assert.equal(blocks.length,10);assert.ok(blocks[9].x>blocks[0].x+449);assert.ok(Math.abs(blocks[9].y-blocks[0].y)<.02);
  assert.equal(M.hitWall(s,w.id,-2),false);
 }
});
test('wall step state can serialize/replay identically',()=>{
 const s=M.create(compile(8));M.contactWall(s,s.walls[0].id,{vx:40,vy:0});for(let i=0;i<30;i++)M.step(s);
 const copy=JSON.parse(JSON.stringify(s));for(let i=0;i<120;i++){M.step(s);M.step(copy);}assert.deepEqual(copy,s);
});
test('a malformed offset table still fails closed rather than shifting geometry',()=>{
 // The table is seven 8 byte entries, one per player count 2..8. Anything that is
 // not 56 units long is not this grammar and must not be guessed at.
 const actor={typeName:'Rect',name:'unsupported',posX:0,posY:0,datas:Array.from({length:8},()=>({t:1,f:0}))};actor.datas[0].f=10;actor.datas[1].f=10;actor.datas[6]={t:2,s:'not decoded'};
 assert.throws(()=>M.compile([actor],2),/must be 56 units/);
});
test('a population offset table shifts the rect per player count',()=>{
 // st_w_07_03's Rect at (1752,505) authors slot6 = 0,0,0,12,24,12,0 px. The
 // decoder (native 0x18096f720, byte loop 0x18096f80c) subtracts 0x21 from the
 // low byte of each UTF-16 unit and reads seven little-endian FP raws.
 const encode=values=>values.map(v=>{const raw=BigInt(Math.round(v*65536));
  return Array.from({length:8},(_,k)=>String.fromCharCode(Number((raw>>BigInt(8*k))&0xFFn)+0x21)).join('');}).join('');
 const actor={typeName:'Rect',name:'shifted',posX:1752,posY:505,datas:Array.from({length:8},()=>({t:1,f:0}))};
 actor.datas[0].f=240;actor.datas[1].f=73;
 actor.datas[6]={t:2,s:encode([0,0,0,12,24,12,0])};
 actor.datas[7]={t:2,s:'!'.repeat(56)};
 const xFor=count=>M.compile([actor],count).rects[0].x;
 assert.equal(xFor(2),1752);
 assert.equal(xFor(5),1764);
 assert.equal(xFor(6),1776);
 assert.equal(xFor(7),1764);
 assert.equal(xFor(8),1752);
});
