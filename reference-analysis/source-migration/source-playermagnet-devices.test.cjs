'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('./source-playermagnet-devices.js');
const F=65536,PR={heightRaw:46*F,widthRaw:32*F,xRaw:-16*F,yRaw:-47*F};
const local=path.join(__dirname,'installed-stage-decoded.local.json');

test('statics: hold distance 18.5 + 8.25, field rect (80,110,20,-44), cone 40 degrees',()=>{
 assert.equal(M.nativeConstants.holdXRaw,Math.trunc(26.75*F));
 assert.deepEqual(M.nativeConstants.rect,{heightRaw:80*F,widthRaw:110*F,xRaw:20*F,yRaw:-44*F});
 const s=M.coneLimitRaw()/F;assert.ok(Math.abs(s-Math.sin(40*Math.PI/180))<0.002,'native Sin(40deg) '+s);
});

test('destination: 26.75 in front of the owner minus the target rect, same feet level',()=>{
 const owner={xRaw:100*F,yRaw:300*F,facingLeft:false},t={rect:PR};
 assert.deepEqual(M.destOf(owner,t),{xRaw:100*F+Math.trunc(26.75*F)+16*F,yRaw:300*F});
 assert.deepEqual(M.destOf({...owner,facingLeft:true},t),{xRaw:100*F-Math.trunc(26.75*F)+16*F-32*F,yRaw:300*F});
});

test('approach: sign * max(threshold, |err| * rate) beyond the threshold, err within it, plus owner velocity',()=>{
 const owner={xRaw:0,yRaw:0,facingLeft:false,vxRaw:0,vyRaw:0},m={caught:false};
 const dest=M.destOf(owner,{rect:PR});
 // 44 px away: 44 * .03 = 1.32 > 1
 let r=M.approach(m,owner,{rect:PR,xRaw:dest.xRaw+44*F,yRaw:0});
 assert.equal(r.snap,false);assert.equal(r.dxRaw,-(44*1966),'44 px * .03 in FP');
 // 10 px away: 10 * .03 = .3 < 1 -> exactly 1
 r=M.approach(m,owner,{rect:PR,xRaw:dest.xRaw+10*F,yRaw:0});assert.equal(r.dxRaw,-F);
 // within 1 px on x and 2 px on y: a snap
 r=M.approach(m,owner,{rect:PR,xRaw:dest.xRaw+F/2,yRaw:F});assert.equal(r.snap,true);assert.deepEqual([r.dxRaw,r.dyRaw],[-F/2,-F]);
 // caught doubles the rates
 r=M.approach({caught:true},owner,{rect:PR,xRaw:dest.xRaw+44*F,yRaw:0});assert.equal(r.dxRaw,-(44*3932));
 // owner velocity is subtracted from the error and added back to the step
 r=M.approach(m,{...owner,vxRaw:3*F},{rect:PR,xRaw:dest.xRaw,yRaw:0});assert.equal(r.dxRaw,2*F,'err = -3 px -> step -1 px, then + 3 px of owner velocity');
});

test('cone: |n.y| < Sin(40deg) from the owner',()=>{
 const o={xRaw:0,yRaw:0};
 assert.equal(M.inCone(o,{xRaw:100*F,yRaw:0}),true);
 assert.equal(M.inCone(o,{xRaw:100*F,yRaw:-80*F}),true,'about 38.7 degrees');
 assert.equal(M.inCone(o,{xRaw:100*F,yRaw:-90*F}),false,'about 42 degrees');
});

test('5-3 compiles one magnet per live player, owner = actor index from slot 0',{skip:!fs.existsSync(local)},()=>{
 const T=require('./terrain-runtime.js'),source=JSON.parse(fs.readFileSync(local)),geometry=JSON.parse(fs.readFileSync(path.join(__dirname,'source-geometry.local.json')));
 for(let n=2;n<=8;n++){const c=M.compile(T.createTerrain({source,geometry,count:n,stageId:'st_w_05_03'}).actors,n);
  assert.deepEqual(c.magnets.map(m=>m.ownerIndex).sort(),Array.from({length:n},(_,i)=>i));}
});
