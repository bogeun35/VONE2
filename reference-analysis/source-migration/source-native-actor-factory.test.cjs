'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),F=require('./source-native-actor-factory.js'),Lifecycle=require('./source-actor-lifecycle.js'),Pop=require('./population-rules.cjs'),R=require('./native-creation-order-report.json'),stages=require('./installed-stage-decoded.local.json').stages;
for(const id of ['st_w_03_02','st_w_10_04'])test(id+' converter matches independently audited28 population selections before filtering',()=>{
 for(const row of R.actualPopulations.filter(r=>r.stageId===id)){const v=Pop.selectVariant(stages.find(s=>s.stageId===id).json.stageInitParamList,row.count,row.online),before=JSON.stringify(v),out=F.orderCreationParams(v.actorCreateParamList);assert.deepEqual(out.map(x=>[x.authoredIndex,x.parameter.typeName,x.parameter.name]),row.attempts.map(x=>[x.authoredIndex,x.typeName,x.name]));assert.deepEqual(out.map(x=>x.convertedIndex),out.map((_,i)=>i));assert.equal(out.filter(x=>x.parameter.type===27).length,8);assert.equal(JSON.stringify(v),before);}
});
test('priority pass moves equal-priority pairs indirectly rather than using stable sort',()=>{
 const out=F.orderCreationParams([{type:30,name:'a',createThreshold:0},{type:30,name:'b',createThreshold:0},{type:27,name:'c',createThreshold:0}]);assert.deepEqual(out.map(x=>x.parameter.name),['c','b','a']);
});
test('threshold second pass also swaps indirectly after priority pass and uses converted FP ties',()=>{
 const out=F.orderCreationParams([{type:30,name:'a',createThreshold:2},{type:30,name:'b',createThreshold:2},{type:30,name:'c',createThreshold:-1}]);assert.deepEqual(out.map(x=>x.parameter.name),['c','b','a']);assert.deepEqual(out.map(x=>x.createThresholdRaw),[-65536,131072,131072]);
 const tied=F.orderCreationParams([{type:30,name:'first',createThreshold:0.000001},{type:30,name:'second',createThreshold:0}]);assert.deepEqual(tied.map(x=>x.parameter.name),['first','second']);assert.deepEqual(tied.map(x=>x.createThresholdRaw),[0,0]);
});
test('priority constants and explicit malformed parameter refusal',()=>{assert.equal(F.priority(0),100000);assert.equal(F.priority(27),0);assert.equal(F.priority(17),8);assert.equal(F.priority(178),17);assert.equal(F.priority(30),10030);assert.throws(()=>F.orderCreationParams([{type:27}]),/float/);assert.throws(()=>F.priority(-1),/ActorType/);assert.throws(()=>F.orderCreationParams([null]),/parameter/);});
function facts(){return {actorComponentAbsent:true,entityId:'actual-host-ref',actorType:27,stageScaleRaw:98304,collisionHolderListHandle:51,nameQStringBytes:Array(32).fill(0)};}
test('factory requires absent Actor and maps zero owner fields into actual lifecycle schema',()=>{
 const a=F.initializeAbsentActor(facts());assert.equal(a.flags,16384);assert.equal(a.collisionHolderListHandle,51);assert.equal(a.baseScaleRaw,98304);assert.equal(a.scaleXRaw,65536);assert.deepEqual(a.positionRaw,{xRaw:0,yRaw:0});assert.deepEqual(a.prePositionRaw,{xRaw:0,yRaw:0});assert.deepEqual(Lifecycle.actorState(a),a);assert.equal('inactiveEntity' in a,false);assert.equal('invisibleEntity' in a,false);Lifecycle.commonEvent(a,{eventType:53,value:true,sourceId:'owner'});assert.equal(a.pauseOwner,'owner');assert.equal(a.animationOwner,'owner');assert.equal(a.flags&80,80);
 assert.throws(()=>F.initializeAbsentActor({...facts(),actorComponentAbsent:false}),/verified absence/);assert.throws(()=>F.initializeAbsentActor({...facts(),entityId:undefined}),/allocated EntityRef/);assert.throws(()=>F.initializeAbsentActor({...facts(),nameQStringBytes:undefined}),/QString/);
});
