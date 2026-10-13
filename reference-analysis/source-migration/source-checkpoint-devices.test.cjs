const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('./source-checkpoint-devices.js'),pop=require('./population-rules.cjs');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
const expected={
 st_w_03_01:{position:[2289,432],points:[[2349,432],[2229,432],[2179,432],[2129,432],[2079,432],[2029,432],[1979,432],[1929,432]]},
 st_w_07_04:{position:[3004,384],points:[[2500,384],[2550,384],[2600,384],[2650,384],[2700,384],[2750,384],[2800,384],[2850,384],[2300,250]]},
 st_w_15_01:{position:[1920,240],points:[[1632,432],[1582,432],[1532,432],[1482,432],[1416,384],[1368,336],[1320,288],[1272,240]]},
 st_w_15_02:{position:[2141,240],points:[[1584,288],[1634,288],[1684,288],[1734,288],[1584,238],[1634,238],[1684,238],[1734,238]]}
};
function actors(id,count=2){const s=source.stages.find(x=>x.stageId===id);return pop.actorsForCount(pop.selectVariant(s.json.stageInitParamList,count,true),count);}
const fixture=()=>D.create(D.compile(actors('st_w_03_01'),2));
const activate=(s,time=32768)=>D.afterStep(s,{contacts:[{checkpointId:s.checkpoints[0].id,otherLayer:1}],playTimeRaw:time});
for(const [id,e] of Object.entries(expected))test(id+' exact authored coordinates for all populations and selected variants',()=>{
 for(let count=2;count<=8;count++)for(const online of [false,true]){
  const stage=source.stages.find(x=>x.stageId===id),as=pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,count,online),count);
  const s=D.compile(as,count);assert.equal(s.checkpoints.length,1);
  assert.deepEqual([s.checkpoints[0].x,s.checkpoints[0].y],e.position);
  assert.deepEqual(s.checkpointInfo.respawnPositions.map(p=>[p.xRaw/65536,p.yRaw/65536]),e.points);
  assert.equal(s.checkpointInfo.isActive,false);assert.equal(D.respawn(s,0),null);
 }
});
test('exact native rectangle and collision layer',()=>{const s=fixture();assert.deepEqual(D.displays(s)[0].collision,{x:2273,y:368,w:32,h:64,layer:10,trigger:true});assert.deepEqual(D.solids(s),[]);});
test('first layer 1 contact activates immediately and preserves authored positions',()=>{
 const s=fixture(),saved=structuredClone(s.checkpointInfo.respawnPositions),r=activate(s,123456);
 assert.equal(s.checkpoints[0].checked,true);assert.equal(s.checkpointInfo.isActive,true);assert.equal(s.checkpointInfo.playTimeRaw,123456);
 assert.deepEqual(s.checkpointInfo.respawnPositions,saved);assert.deepEqual(r.sounds,[{checkpointId:s.checkpoints[0].id,seId:24}]);assert.equal(r.activations.length,1);
 assert.deepEqual(activate(s,999999).sounds,[]);assert.equal(s.checkpointInfo.playTimeRaw,123456);
});
test('nonplayer layers cannot activate',()=>{for(const layer of [0,2,10]){const s=fixture();assert.equal(D.contact(s,s.checkpoints[0].id,layer,32768),false);assert.equal(s.checkpointInfo.isActive,false);}});
test('no contact or beforeStep never ticks or activates',()=>{const s=fixture(),old=structuredClone(s);for(let i=0;i<600;i++){D.beforeStep(s,{dt:1/60});D.afterStep(s,{contacts:[]});}assert.deepEqual(s,old);});
test('missing exact play time refuses activation without mutation',()=>{const s=fixture(),old=structuredClone(s);assert.throws(()=>activate(s,null),/exact StageComponent playTimeRaw/);assert.deepEqual(s,old);});
test('activation cannot infer play time from dt',()=>{const s=fixture(),old=structuredClone(s);assert.throws(()=>D.afterStep(s,{contacts:[{checkpointId:s.checkpoints[0].id,otherLayer:1}],dt:1/60}),/exact StageComponent playTimeRaw/);assert.deepEqual(s,old);});
test('player rectangle adapter activates once and explicit empty contacts takes precedence',()=>{
 const s=fixture(),p={id:'p1',x:2280,y:400,w:32,h:46};
 D.afterStep(s,{players:[p],contacts:[],playTimeRaw:100});assert.equal(s.checkpointInfo.isActive,false);
 assert.equal(D.afterStep(s,{players:[p],playTimeRaw:100}).activations.length,1);
});
test('dead, exited and separated player rectangles do not activate adapter',()=>{
 for(const p of [{x:2000,y:400,w:32,h:46},{x:2280,y:400,w:32,h:46,dead:true},{x:2280,y:400,w:32,h:46,exit:true}]){
 const s=fixture();assert.deepEqual(D.afterStep(s,{players:[p],playTimeRaw:100}).activations,[]);}
});
test('respawn selects exact slot and applies native minus one; saves time and scroll',()=>{
 const s=fixture();activate(s,456789);
 for(let i=0;i<8;i++)assert.deepEqual(D.respawn(s,i),{actorPosition:{x:expected.st_w_03_01.points[i][0],y:431},playTimeRaw:456789,scrollX:2109});
 assert.deepEqual(D.respawn(s,8,2),{actorPosition:{x:2289,y:335},playTimeRaw:456789,scrollX:2109});
 assert.deepEqual(D.respawn(s,-1,1).actorPosition,{x:2289,y:383});
});
test('ninth authored vector is decoded independently of party count',()=>{
 const s=D.create(D.compile(actors('st_w_07_04'),2));activate(s);assert.deepEqual(D.respawn(s,8).actorPosition,{x:2300,y:249});
});
test('zero vector terminates list; missing/nonfloat components become zero',()=>{
 const a=structuredClone(actors('st_w_03_01').find(x=>x.typeName==='CheckPoint'));
 a.datas[0]={t:2,s:'ignored'};a.datas[1]={t:1,f:5};a.datas[2]={t:0};a.datas[3]={t:0};
 assert.deepEqual(D.compile([a],2).checkpointInfo.respawnPositions,[{xRaw:0,yRaw:327680}]);
});
test('JSON roundtrip and restored retry state retain saved data but recreate local checked',()=>{
 const s=fixture();s.checkpointInfo.gameOverCount=3;activate(s,109200);
 const restored=D.create(D.compile(actors('st_w_03_01'),2,{checkpointInfo:JSON.parse(JSON.stringify(s.checkpointInfo))}));
 assert.deepEqual(restored.checkpointInfo,s.checkpointInfo);assert.equal(restored.checkpoints[0].checked,false);
 assert.deepEqual(D.respawn(restored,0),D.respawn(s,0));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
 assert.equal(activate(restored,109201).sounds.length,1);
});
test('unsupported multiple checkpoint creation order, rounding and wrong-stage restore refuse',()=>{
 const a=actors('st_w_03_01').find(x=>x.typeName==='CheckPoint');assert.throws(()=>D.compile([a,a],2),/global creation order/);
 const b=structuredClone(a);b.datas[0].f=0.1;assert.throws(()=>D.compile([b],2),/float-to-FP/);
 const s=fixture();activate(s);assert.throws(()=>D.compile(actors('st_w_15_01'),2,{checkpointInfo:s.checkpointInfo}),/does not match/);
});

