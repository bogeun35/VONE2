'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('./source-pp1-devices.js');
const actor=(type,p,x=0,y=0)=>({id:type,type,parameters:p,sourcePosition:{x,y}});
test('PP1 contact rectangles use independently recovered native anchors',()=>{
 const p=D.compilePlayer(actor('Player',[],100,432));
 assert.deepEqual([p.x,p.y,p.w,p.h],[84,385,32,46]);
 const k=D.compileKey(actor('Key',[0],2352,192));
 assert.deepEqual([k.x,k.y,k.w,k.h],[2336,164,32,56]);
 const w=D.compileWarp(actor('Warp',[240,96,720,-48,0,-50],768,576));
 assert.deepEqual([w.x,w.y,w.w,w.h],[768,576,240,96]);
 assert.deepEqual(w.destination,{x:720,y:-48});
 const l=D.compileLift(actor('WeightedLift',[-184,100,-4,0,0,-0.1],2536,336),2);
 assert.deepEqual(l.collision,{x:2444,y:403,w:194,h:18});
 D.stepLift(l,{riderCount:2});assert.equal(l.collision.y,402);
});
test('native tile flags retain decorative collision and ignore overflow beyond declared dimensions',()=>{
 assert.equal(D.tileFlags(0),0);assert.equal(D.tileFlags(1),0);
 for(let i=2;i<=34;i++)assert.equal(D.tileFlags(i)&1,1);
 assert.equal(D.tileFlags(26),3);assert.equal(D.tileFlags(30),1);
 const cells=[1,3,1,3,3,3,3,3].map((code,index)=>({index,code}));
 const rects=D.terrainRects({width:3,height:2,tileSize:48,cells});
 assert.deepEqual(rects.map(({x,y,w,h})=>[x,y,w,h]),[[96,0,48,48],[0,48,144,48]]);
});
test('signed-width Rect keeps native right anchor and count offset',()=>{
 const r=D.compileRect(actor('Rect',[-48,48,-8,0,0,-8],720,144),8);
 assert.deepEqual([r.x,r.y,r.w,r.h],[624,48,96,48]);
});
test('original first lift requires every player and uses source travel scaling',()=>{
 for(let count=2;count<=8;count++){
  const lift=D.compileLift(actor('WeightedLift',[-184,100,-4,0,0,-0.1],2536,336),count);
  assert.equal(lift.requiredPlayers,count);assert.equal(lift.distance,-184-count*4);
  D.stepLift(lift,{riderCount:count-1});assert.equal(lift.y,336);
  D.stepLift(lift,{riderCount:count});assert.equal(lift.y,335);
  for(let i=0;i<400;i++)D.stepLift(lift,{riderCount:count});
  assert.equal(lift.y,336+lift.distance);
  const old=lift.offset;D.stepLift(lift,{riderCount:count-1});
  assert.ok(Math.abs(lift.offset-old-lift.returnPerTick)<0.00002);
 }
});
test('blocked lift movement cannot update displacement or carry riders',()=>{
 const lift=D.compileLift(actor('WeightedLift',[-100,100]),2);
 assert.deepEqual(D.stepLift(lift,{riderCount:2,canMove:()=>false}),{dy:0,moved:false});
 assert.equal(lift.offset,0);
 D.stepLift(lift,{riderCount:2,blockedContact:true});assert.equal(lift.offset,0);
 for(let i=0;i<5;i++)D.stepLift(lift,{riderCount:2});assert.ok(lift.offset<0);
});
test('bridge follows event 9/10 with native segment speed and reverses midway',()=>{
 const b=D.compileBridge(actor('Bridge',[20,-1,0,14,20],1872,432),8);
 assert.equal(b.initialSegments,0);assert.equal(b.segments.length,20);
 D.signalBridge(b,9);D.stepBridge(b);
 assert.equal(b.segments[0].x,1870);assert.equal(b.segments[1].x,1872);
 for(let i=0;i<200;i++)D.stepBridge(b);
 assert.equal(b.segments[0].x,1492);assert.ok(b.segments.every(s=>s.state===3));
 D.signalBridge(b,10);D.stepBridge(b);assert.equal(b.segments[0].x,1493);
 D.signalBridge(b,9);D.stepBridge(b);assert.equal(b.segments[0].x,1492);
});
test('native easier-population bridge preextension is visual-only on spawn',()=>{
 const b=D.compileBridge(actor('Bridge',[20,-1,0,14,20],1872,432),2);
 assert.equal(b.initialSegments,8);assert.equal(b.segments[0].x,1872);assert.equal(b.segments[0].visualX,1712);
 D.signalBridge(b,9);D.stepBridge(b);assert.equal(b.segments[1].x,1870);
});
