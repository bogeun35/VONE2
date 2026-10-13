'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),api=require('./source-playerblock-devices.js');
const F=65536;
const p=()=>({id:'p',playerIndex:1,colorIndex:2,playerState:0,xRaw:100*F,yRaw:200*F,vxRaw:3*F,vyRaw:4*F,scaleXRaw:F,scaleYRaw:F,actorScaleRaw:F,rectRaw:{height:40*F,width:30*F,x:-15*F,y:-40*F},sortingOrder:9,flipH:true});
test('dynamic block copies height into width, player anchor and metadata; event65 payload',()=>{
 const s=api.create(api.compile([],2)),made=api.attach(s,p()),b=made.block;
 assert.deepEqual(b.rectRaw,{height:40*F,width:40*F,x:-20*F,y:-40*F});assert.deepEqual(b.probeRectRaw,{height:42*F,width:40*F,x:-20*F,y:-41*F});
 assert.equal(b.playerIndex,1);assert.equal(b.colorIndex,2);assert.equal(b.sortingOrder,9);assert.equal(b.flipH,true);
 assert.deepEqual(made.event,{targetId:'p',senderId:b.id,eventType:65,pause:true,visible:false,nativeFlag24:true,returnKey:true,playerBlock:true});
 const solid=api.solids(s)[0];assert.deepEqual([solid.x,solid.y,solid.width,solid.height],[80*F,160*F,40*F,40*F]);assert.equal(solid.layer,2);assert.equal(solid.collisionKind,3);
});
test('dead player refuses creation and unresolved geometry fails specifically',()=>{
 const s=api.compile([],2);assert.equal(api.attach(s,{playerState:3}),null);assert.equal(s.blocks.length,0);const unresolved=p();delete unresolved.rectRaw;assert.throws(()=>api.attach(s,unresolved),/rectRaw/);
 assert.throws(()=>api.compile([{typeName:'PlayerBlock'}],2),/dynamic/);
});
test('no active lifetime; input9 releases position/velocity and destroys after seven ticks',()=>{
 const s=api.create(api.compile([],2)),b=api.attach(s,p()).block;
 for(let i=0;i<600;i++)api.beforeStep(s,{players:[p()]});assert.equal(b.phase,0);assert.equal(b.visible,true);
 b.xRaw+=F;b.vxRaw=2*F;b.vyRaw=-3*F;
 const release=api.beforeStep(s,{players:[p()],pressed9:{p:true}});assert.equal(release.events[0].eventType,66);assert.equal(release.events[0].xRaw,101*F);assert.equal(release.events[0].vxRaw,2*F);assert.equal(release.events[0].vyRaw,-3*F);assert.equal(b.timerRaw,6553);assert.equal(b.visible,false);assert.equal(b.playerId,null);
 for(let i=0;i<6;i++)api.beforeStep(s);assert.equal(b.timerRaw,1);assert.equal(b.phase,1);assert.equal(api.solids(s).length,1);
 api.beforeStep(s);assert.equal(b.phase,2);assert.deepEqual(api.solids(s),[]);
});
test('post forces player to moved block; eye input6 has priority over7',()=>{
 const s=api.compile([],2),b=api.attach(s,p()).block;b.yRaw+=10*F;
 api.beforeStep(s,{players:[p()],heldInputs:{p:[6,7]}});assert.equal(b.eyeDirection,255);
 assert.deepEqual(api.afterStep(s).playerPositions,[{playerId:'p',xRaw:100*F,yRaw:210*F}]);
 api.beforeStep(s,{players:[p()],heldInputs:{p:[7]}});assert.equal(b.eyeDirection,1);assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
});
test('collision push is independent per axis, clamps to one pixel and compares quantized centers',()=>{
 const r={x:0,y:0,width:40*F,height:40*F};
 assert.deepEqual(api.collisionPush(r,{x:39*F,y:38*F,width:30*F,height:40*F},1),{xRaw:F,yRaw:F});
 assert.deepEqual(api.collisionPush(r,{x:-29*F,y:-39*F,width:30*F,height:40*F},1),{xRaw:-F,yRaw:-F});
 assert.deepEqual(api.collisionPush(r,{x:0,y:0,width:40*F,height:40*F},1),{xRaw:0,yRaw:0});
 assert.deepEqual(api.collisionPush(r,{x:39*F,y:38*F,width:30*F,height:40*F},2),{xRaw:0,yRaw:0});
 assert.equal(api.collisionPush(r,{x:40*F-1,y:0,width:30*F,height:40*F},1).xRaw,1);
});
