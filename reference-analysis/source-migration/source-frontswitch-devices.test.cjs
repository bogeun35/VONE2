'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('./source-frontswitch-devices.js');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const mk=(id,n)=>R.create(R.compile({source,geometry,count:n,stageId:id}));
test('FrontSwitch: latched (slot2 0) stays on, momentary (slot2 1) follows the touch',()=>{
 const [latched]=S.compile([{typeName:'FrontSwitch',posX:0,posY:0,datas:[{t:2,s:'A'},{t:2,s:''},{t:1,f:0}]}],2).switches;
 S.touch(latched);assert.deepEqual(S.switchUpdate(latched).map(e=>e.eventType),[61]);
 assert.deepEqual(S.switchUpdate(latched),[]);assert.equal(latched.isOn,1);
 const [mom]=S.compile([{typeName:'FrontSwitch',posX:0,posY:0,datas:[{t:2,s:'A'},{t:2,s:'B'},{t:1,f:1}]}],2).switches;
 S.touch(mom);assert.deepEqual(S.switchUpdate(mom).map(e=>[e.eventType,e.targetName]),[[61,'A'],[61,'B']]);
 assert.deepEqual(S.switchUpdate(mom).map(e=>e.eventType),[60,60]);
});
test('SwitchRect types 0..3 with the delay, refused to appear onto a body',()=>{
 const mk1=type=>S.compile([{typeName:'SwitchRect',posX:0,posY:100,datas:[{t:1,f:48},{t:1,f:48},{t:1,f:type},{t:1,f:3}]}],2).rects[0];
 const r0=mk1(0);assert.equal(r0.visible,false);S.receiveEvent(r0,61);S.rectUpdate(r0,1092,()=>true);assert.equal(r0.visible,false);// blocked
 S.rectUpdate(r0,1092,()=>false);assert.equal(r0.visible,true);S.receiveEvent(r0,60);
 for(let i=0;i<179;i++)S.rectUpdate(r0,1092,()=>false);assert.equal(r0.visible,true);// 3 s delay
 for(let i=0;i<2;i++)S.rectUpdate(r0,1092,()=>false);assert.equal(r0.visible,false);
 const r1=mk1(1);assert.equal(r1.visible,true);S.receiveEvent(r1,61);S.rectUpdate(r1,1092,()=>false);assert.equal(r1.visible,false);
 const r3=mk1(3);S.receiveEvent(r3,61);S.rectUpdate(r3,1092,()=>false);S.receiveEvent(r3,60);S.rectUpdate(r3,1092,()=>false);assert.equal(r3.visible,false);// keep
 assert.deepEqual(S.rectOf(r0),{x:0,y:52,w:48,h:48});
});
test('ice: walking builds up to walk*IceSpeedUp and coasts by IceResistivity',()=>{
 const s=mk('st_w_15_04',2),p=s.players[0];const v=[];
 for(let i=0;i<100;i++){R.step(s,{[p.id]:{right:i<60},[s.players[1].id]:{right:i<60}});v.push(p.vx/60);}
 assert.equal(s.status,'play');assert.ok(Math.abs(Math.max(...v)-4.5)<0.01);
 assert.ok(v[70]<v[61]&&v[70]>2);// coasting, not stopping at once
 const t=mk('st_w_02_02',2);assert.ok(t.map.ice&&t.map.ice.cells.length>0);// connected 2-2 has ice chips too
});
