'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('./source-throwball-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
const expectedTargets=[[7],[8],[9],[6,5],[4,4,4],[5,4,4],[6,4,4]];
for(const id of ['st_w_08_02','st_w_08_04'])for(let count=2;count<=8;count++)test(`${id} ${count}p real parameters and explicit compile refusal`,()=>{
 const stage=stages.find(s=>s.stageId===id),actors=pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,count,true),count);
 const p=api.inspectParameters(actors,count),b=p.filter(x=>x.type==='ThrowBallBasket'),c=p.filter(x=>x.type==='CannonPlayer'),controller=p.find(x=>x.type==='ThrowBallController');
 assert.deepEqual(b.map(x=>x.target),expectedTargets[count-2]);
 assert.deepEqual(b.map(x=>[x.heightRaw,x.scaleRaw]),b.map(()=>[655360,98304]));
 assert.equal(c.length,8);assert.deepEqual(c.map(x=>[x.angleSpeedRaw,x.powerSpeedRaw]),Array.from({length:8},()=>[5898240,5898240]));
 assert.deepEqual([controller.ballSpeedRaw,controller.ballAccelRaw,controller.ballIntervalRaw,controller.bombRate],[65536,131072,32768,id==='st_w_08_02'?0:25]);
 assert.throws(()=>api.compile(actors,count),/Unverified CannonPlayer: PlayerCannon FP aiming/);
 for(const type of ['ThrowBallBasket','ThrowBallController'])assert.throws(()=>api.compile(actors.filter(a=>a.typeName===type),count),new RegExp('Unverified '+type+':'));
});
test('basket collision rectangles preserve native FP scaling and height shift',()=>{
 assert.deepEqual(api.basketRects({heightRaw:655360,scaleRaw:98304}),[
  {wRaw:3538944,hRaw:4128768,xRaw:-2064384,yRaw:-15302656},
  {wRaw:786432,hRaw:1966080,xRaw:-983040,yRaw:-15400960}]);
});
test('sensor consumes scoring balls, clamps score and disables on target',()=>{
 const b={score:0,target:2,sensorDisabled:false},ball={actorType:147,destroyRequested:false};
 const hit={added:true,category:5,sensor:true};
 assert.equal(api.basketSensorContact(b,ball,hit),true);assert.equal(ball.destroyRequested,true);
 assert.deepEqual(b,{score:1,target:2,sensorDisabled:false});assert.equal(api.isBasketCleared(b),false);
 api.basketSensorContact(b,{actorType:147},hit);assert.deepEqual(b,{score:2,target:2,sensorDisabled:true});assert.equal(api.isBasketCleared(b),true);
 api.basketSensorContact(b,{actorType:147},hit);assert.equal(b.score,2);
});
test('falling ThrowBall, removed contacts and walls never score',()=>{
 const b={score:0,target:7},hit={added:true,category:5,sensor:true};
 for(const [ball,contact] of [[{actorType:148},hit],[{actorType:147},{...hit,added:false}],[{actorType:147},{...hit,category:4}],[{actorType:147},{...hit,sensor:false}]]){
  assert.equal(api.basketSensorContact(b,ball,contact),false);assert.equal(ball.destroyRequested,undefined);assert.equal(b.score,0);
 }
});
test('int32 table decoding is signed and Find falls back over zero entries',()=>{
 const encode=values=>values.map(v=>Array.from({length:4},(_,i)=>String.fromCharCode(((v>>>(i*8))&255)+33)).join('')).join('');
 const table=[-2,0,9,0,0,0,0];assert.deepEqual(api.tableInts({t:2,s:encode(table)}),table);
 assert.equal(api.findCount(table,3),-2);assert.equal(api.findCount(table,8),9);
 assert.throws(()=>api.tableInts({t:2,s:'bad'}),/28 units/);
});
test('unrelated actors produce inert state that survives JSON serialization',()=>{
 const c=api.compile([{typeName:'Block'}],2),s=JSON.parse(JSON.stringify(api.create(c)));
 assert.deepEqual(s,c);assert.deepEqual(api.solids(s),[]);assert.deepEqual(api.beforeStep(s,{}),{events:[],solids:[]});
 assert.deepEqual(api.afterStep(s,{}),{events:[],deadPlayerIds:[]});assert.deepEqual(api.displays(s),[]);
 s.cannons.push({});assert.throws(()=>api.beforeStep(s,{}),/Unverified throwball state/);
});
test('native cannon cooldown stays in phase2 for 30 ticks and exits on tick31',()=>{
 let c={phase:2,timerRaw:32768};
 for(let i=0;i<30;i++)api.cannonCooldown(c,1/60);
 assert.deepEqual(c,{phase:2,timerRaw:8});c=JSON.parse(JSON.stringify(c));
 api.cannonCooldown(c,1/60);assert.deepEqual(c,{phase:0,timerRaw:-1084});
 api.cannonCooldown(c,1/60);assert.deepEqual(c,{phase:0,timerRaw:-1084});
 assert.throws(()=>api.cannonCooldown(c,-1),/Invalid cannon delta/);
});
