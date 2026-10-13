'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const m=require('./source-pole-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(__dirname+'/installed-stage-decoded.local.json')).stages;
const actors=(id,c)=>pop.actorsForCount(pop.selectVariant(stages.find(x=>x.stageId===id).json.stageInitParamList,c,true),c);
const pole=c=>actors('st_w_11_02',c).filter(a=>a.typeName==='PoleLadder');
test('real population variants compile with exact thorn counts',()=>{
 const expected=[36,30,24,18,18,12,12];
 for(let c=2;c<=8;c++){
  const a=actors('st_w_11_02',c);assert.equal(a.filter(x=>x.typeName==='FloatingThorn').length,expected[c-2]);
  assert.equal(m.compile(a,c).thorns.length,expected[c-2]);
  assert.equal(actors('st_w_07_04',c).filter(x=>x.typeName==='FloatingThorn').length,8);
  assert.equal(m.compile(actors('st_w_07_04',c),c).thorns.length,8);
 }
});
test('real pole positions, speeds, distances and selected heights',()=>{
 for(let c=2;c<=8;c++){
  const p=m.compile(pole(c),c).poles[0];
  assert.deepEqual([p.xRaw,p.yRaw,p.speedRaw,p.distanceRaw,p.heightRaw],
   [168,48,3,4775,[480,480,480,480,540,505,515][c-2]].map(v=>v*65536));
 }
});
test('real height table is signed FP, not a player-count integer table',()=>{
 assert.deepEqual(m.heightTable(pole(2)[0].datas[0]).map(v=>v/65536),[480,480,480,480,480,505,480]);
});
test('pole advances per tick regardless of delta and stops exactly at tick1592',()=>{
 const s=m.create(m.compile(pole(2),2));
 for(let i=0;i<1591;i++)m.beforeStep(s,{dt:0});
 assert.equal(s.poles[0].xRaw,(168+4773)*65536);
 m.beforeStep(s,{dt:100});assert.equal(s.poles[0].xRaw,(168+4775)*65536);
 m.beforeStep(s);assert.equal(s.poles[0].moveXRaw,4775*65536);
});
test('native post skips states3..5 and requests state10 without contact',()=>{
 const s=m.create(m.compile(pole(2),2));
 assert.deepEqual(m.afterStep(s,{players:[{id:'a',nativeState:0},{id:'b',nativeState:3},{id:'c',nativeState:4},{id:'d',nativeState:5}]}).playerConstraints,
  [{playerId:'a',nextNativeState:10,lookRight:true}]);
});
test('native post right/left anchors and both Y endpoints',()=>{
 const s=m.create(m.compile(pole(2),2));m.beforeStep(s);
 assert.deepEqual(m.afterStep(s,{players:[{id:'r',nativeState:10,lookingRight:true,anchorYRaw:0},{id:'l',nativeState:10,lookingRight:false,anchorYRaw:600*65536}]}).playerConstraints,
  [{playerId:'r',anchorXRaw:159*65536,anchorYRaw:48*65536},{playerId:'l',anchorXRaw:211*65536,anchorYRaw:528*65536}]);
});
test('JSON round trip preserves native movement and constraints',()=>{
 const a=m.create(m.compile(pole(7),7));for(let i=0;i<10;i++)m.beforeStep(a);
 const b=JSON.parse(JSON.stringify(a));m.beforeStep(a);m.beforeStep(b);assert.deepEqual(a,b);
 assert.equal(b.poles[0].xRaw,201*65536);
});
test('pole has no solids and view retains exact authored height',()=>{
 const s=m.create(m.compile(pole(8),8));assert.deepEqual(m.solids(s),[]);
 assert.deepEqual(m.displays(s).poles[0],{id:'source:a0',x:168,y:48,height:515,width:4});
});
test('invalid player adapter and malformed table refuse rather than guess',()=>{
 const s=m.create(m.compile(pole(2),2));assert.throws(()=>m.afterStep(s,{players:[{id:'a'}]}),/nativeState/);
 assert.throws(()=>m.afterStep(s,{players:[{id:'a',nativeState:10}]}),/lookingRight and anchorYRaw/);
 assert.throws(()=>m.heightTable({t:2,s:'short'}),/56 units/);
 assert.throws(()=>m.compile(pole(2),1),/2..8/);
});
test('zero thorn parameters preserve native nonzero defaults',()=>{
 const a=structuredClone(actors('st_w_07_04',2).find(x=>x.typeName==='FloatingThorn'));
 a.datas[0].f=0;a.datas[1].f=0;const t=m.compile([a],2).thorns[0];assert.deepEqual([t.swingHeightRaw,t.swingSpeedRaw],[10*65536,65536]);
 assert.deepEqual(m.supportedTypes,['FloatingThorn','PoleLadder']);
});

test('every native sine entry has extracted low32 digest; sign and modulus match',()=>{
 const crypto=require('node:crypto'),buf=Buffer.alloc(411775*4);
 for(let i=0;i<411775;i++)buf.writeInt32LE(i===411774?0:m.nativeSin(i),i*4);
 // Final resource entry is0; modulus also returns0 at that index.
 assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),'df5d19c35ac2594ef98c6a5924efdb7eeea75d0f936e91314f98f6a05891781c');
 assert.deepEqual([0,1,1092,65536,102943,205887,308830,411773].map(m.nativeSin),[0,1,1091,55146,65536,0,-65536,-1]);
 assert.equal(m.nativeSin(-1092),-1091);assert.equal(m.nativeSin(411774+1092),1091);
});
test('real thorn FP timers exact first and60th ticks and JSON replay',()=>{
 const s=m.create(m.compile(actors('st_w_11_02',2),2));m.beforeStep(s);
 assert.equal(s.thorns[0].timeRaw,1092);assert.equal(s.thorns[0].yRaw,5253790);
 for(let i=1;i<60;i++)m.beforeStep(s);assert.equal(s.thorns[0].timeRaw,65520);assert.equal(s.thorns[0].yRaw,5794250);
 const clone=JSON.parse(JSON.stringify(s));m.beforeStep(s);m.beforeStep(clone);assert.deepEqual(clone,s);
 m.beforeStep(clone,{dt:0});assert.equal(clone.thorns[0].timeRaw,66612);
});
test('thorn collision is native HEIGHT then WIDTH and sends43 only to1/8',()=>{
 const s=m.create(m.compile(actors('st_w_07_04',2),2)),t=s.thorns[0];
 assert.deepEqual(m.thornRects(t),[{category:8,xRaw:304*65536,yRaw:82*65536,widthRaw:40*65536,heightRaw:16*65536},{category:8,xRaw:316*65536,yRaw:70*65536,widthRaw:16*65536,heightRaw:40*65536}]);
 assert.deepEqual(m.afterStep(s,{collisions:[{thornId:t.id,targetId:'p',category:1},{thornId:t.id,targetId:'t',category:8},{thornId:t.id,targetId:'wall',category:4}]}).events,[{senderId:t.id,targetId:'p',eventType:43},{senderId:t.id,targetId:'t',eventType:43}]);
 const scaled={...t,scaleRaw:32768};assert.equal(m.thornRects(scaled)[0].widthRaw,20*65536);
});
const nativePlayer=()=>({id:'p',nativeState:0,lookingRight:true,anchorXRaw:156*65536,anchorYRaw:100*65536,vxRaw:7*65536,vyRaw:9*65536,walkSpeedRaw:3*65536,flags2:6});
const context={contactedMapOrRect:false,searchLength:0};
test('pure enter/exit use exact rect and finalizer only clears flags2 bit0',()=>{
 const p=nativePlayer(),copy=structuredClone(p),entered=m.poleEnter(p);
 assert.deepEqual(p,copy);assert.equal(entered.nativeState,10);assert.equal(entered.animation,13);
 assert.deepEqual(entered.collisionRectRaw,{height:44*65536,width:20*65536,x:-10*65536,y:-47*65536});
 assert.deepEqual(m.poleEnter({...p,lookingRight:false}).collisionRectRaw,{height:44*65536,width:40*65536,x:-30*65536,y:-47*65536});
 const exit=m.poleExit({...entered,flags2:7});assert.equal(exit.flags2,6);assert.equal(exit.nativeState,10);
});
test('up priority/down/idle and contact retains both previous velocities',()=>{
 const p=m.poleEnter(nativePlayer()),copy=structuredClone(p);
 const up=m.poleStep(p,{up:true,down:true},context);assert.deepEqual([up.animation,up.vxRaw,up.vyRaw],[14,0,-3*65536]);
 const down=m.poleStep(p,{down:true},context);assert.deepEqual([down.animation,down.vxRaw,down.vyRaw],[15,0,3*65536]);
 const idle=m.poleStep(p,{},context);assert.deepEqual([idle.animation,idle.vxRaw,idle.vyRaw,idle.flags2],[13,0,0,6]);
 const blocked=m.poleStep(p,{up:true},{...context,contactedMapOrRect:true});assert.deepEqual([blocked.vxRaw,blocked.vyRaw],[7*65536,9*65536]);
 assert.deepEqual(p,copy);assert.equal(up.anchorYRaw,p.anchorYRaw);
});
test('positive observer search rectangle, flags and PCG wobble preserve serialization',()=>{
 const p=m.poleEnter(nativePlayer());assert.deepEqual(m.poleSearchRect(p,100),{category:8,height:44*65536,width:120*65536,x:181*65536,y:53*65536});
 const rng={state:'42',inc:'55'},copy=structuredClone(rng);
 const hit=m.poleStep(p,{}, {...context,searchLength:100,hit:{anchorXRaw:p.anchorXRaw},rng});
 assert.equal(hit.flags2,7);assert.equal(hit.positionOffsetXRaw,-2*65536);assert.equal(hit.positionOffsetYRaw,0);
 assert.equal(hit.rng.state,'9039304369631583641');assert.deepEqual(rng,copy);
 const edge=m.poleStep(p,{}, {...context,searchLength:100,hit:{anchorXRaw:p.anchorXRaw+255*65536}});assert.equal(edge.flags2,7);assert.equal(edge.rng,undefined);
 const miss=m.poleStep({...p,flags2:7},{},{...context,searchLength:100,hit:null});assert.equal(miss.flags2,6);
 assert.deepEqual(JSON.parse(JSON.stringify(hit)),hit);
});
test('runtime inputs are required instead of guessing collision/speed/search',()=>{
 const p=m.poleEnter(nativePlayer());assert.throws(()=>m.poleStep(p,{},{}),/Collision/);
 assert.throws(()=>m.poleStep({...p,walkSpeedRaw:undefined},{},context),/m_WalkSpeed/);
 assert.throws(()=>m.poleStep(p,{},{...context,searchLength:1}),/query result/);
 assert.throws(()=>m.poleStep(p,{},{...context,searchLength:1,hit:{anchorXRaw:p.anchorXRaw}}),/PCG32/);
});
test('browser decoder without Buffer agrees with extracted native sine',()=>{
 const vm=require('node:vm');const sandbox={atob:s=>Buffer.from(s,'base64').toString('binary')};
 vm.runInNewContext(fs.readFileSync(__dirname+'/source-pole-devices.js','utf8'),sandbox);
 assert.equal(sandbox.SourcePoleDevices.nativeSin(65536),55146);
 assert.equal(sandbox.SourcePoleDevices.nativeSin(-308830),65536);
});
test('authored float32 FP conversion and scaled query rect are exact',()=>{
 const a=structuredClone(actors('st_w_07_04',2).find(x=>x.typeName==='FloatingThorn'));a.datas[0].f=1.1;
 assert.equal(m.compile([a],2).thorns[0].swingHeightRaw,72089);
 const p=m.poleEnter(nativePlayer());
 assert.deepEqual(m.poleSearchRect(p,10,{height:22*65536,width:10*65536,x:-5*65536,y:-23.5*65536}),{height:22*65536,width:20*65536,x:176*65536,y:76.5*65536,category:8});
});
