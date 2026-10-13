'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('./source-apple-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
function stage(id,count){const st=stages.find(x=>x.stageId===id);return {variant:pop.selectVariant(st.json.stageInitParamList,count,true),actors:pop.actorsForCount(pop.selectVariant(st.json.stageInitParamList,count,true),count)};}
const goals={'st_w_08_01':[12,14,21,21,23,24,26],'st_w_08_03':[12,14,20,22,25,27,30]};
for(const id of Object.keys(goals))for(let count=2;count<=8;count++)test(id+' '+count+'p real decoded values and honest compile refusal',()=>{
 const {variant,actors}=stage(id,count),c=A.decodeActor(actors.find(a=>a.typeName==='AppleController'),count);
 assert.equal(variant.shufflePlayer,1);assert.equal(c.appleMax,goals[id][count-2]);assert.deepEqual(c.goalTable,goals[id]);
 assert.equal(c.activeAppleMax,10);assert.equal(c.appleSecRaw,229376);assert.equal(c.bombSecRaw,196608);
 assert.equal(c.swaySpeedRaw,13107200);assert.equal(c.swayHeightRaw,6553600);assert.equal(c.swayWidthRaw,id==='st_w_08_01'?9830400:13107200);
 assert.equal(c.changeBomb,id==='st_w_08_03');assert.equal(c.timerRaw,65536);
 assert.equal(actors.filter(a=>a.typeName==='Apple').length,12);
 assert.equal(actors.filter(a=>a.typeName==='TargetPlayer').length,4);assert.equal(actors.filter(a=>a.typeName==='BasketPlayer').length,4);
 assert.throws(()=>A.compile(actors,count),/Apple devices incomplete:.*TargetPlayer.*BasketPlayer.*AppleController.*Apple/);
});
test('Apple per-actor overrides retain authored width/height only',()=>{
 const actors=stage('st_w_08_01',2).actors;
 assert.deepEqual(A.decodeActor(actors.find(a=>a.name==='Apple3'),2).overrides,{swayWidthRaw:3276800});
 assert.deepEqual(A.decodeActor(actors.find(a=>a.name==='Apple6'),2).overrides,{swayWidthRaw:3276800,swayHeightRaw:1310720});
 assert.deepEqual(A.decodeActor(actors.find(a=>a.name==='Apple11'),2).overrides,{swayHeightRaw:1966080});
 assert.deepEqual(A.decodeActor(actors.find(a=>a.name==='Apple1'),2).collision,{x:-12,y:-12,w:24,h:24});
});
test('Target slots12/13 are cooldown/gauge, not player index',()=>{
 const t=A.decodeActor(stage('st_w_08_01',2).actors.find(a=>a.typeName==='TargetPlayer'),2);
 assert.equal(t.shotIntervalRaw,65536);assert.equal(t.visibleGauge,true);
 assert.deepEqual(A.decodeActor(stage('st_w_08_01',2).actors.find(a=>a.typeName==='BasketPlayer'),2).collision,{x:-22,y:-30,w:26,h:44});
});
test('Controller missing/zero parameters preserve proven defaults; table fallback is signed int32',()=>{
 const c=A.decodeActor({typeName:'AppleController',datas:[]},2);
 assert.equal(c.appleMax,20);assert.equal(c.activeAppleMax,8);assert.equal(c.appleSecRaw,196608);
 assert.equal(A.findCount([12,0,0,22,0,0,0],4),12);assert.equal(A.findCount([12,0,0,22,0,0,0],8),22);
 assert.throws(()=>A.countTable({t:2,s:'!!!'}),/28 UTF-16/);
 assert.deepEqual(A.countTable({t:2,s:String.fromCharCode(32,32,32,32)+'!'.repeat(24)}),[-1,0,0,0,0,0,0]);
});
test('Target cooldown fires on tick61, not tick60, and shot flag lasts one update',()=>{
 const t={timerRaw:65536,shotIntervalRaw:65536};
 for(let i=0;i<60;i++)assert.equal(A.targetShot(t,true,1/60),false);
 assert.equal(t.timerRaw,16);assert.equal(A.targetShot(t,true,1/60),true);assert.equal(t.timerRaw,65536);assert.equal(t.shot,true);
 assert.equal(A.targetShot(t,false,1/60),false);assert.equal(t.shot,false);assert.equal(t.timerRaw,64444);
});
test('Controller initial selection at tick61 and rejection sampling match native RNG stream',()=>{
 const c={id:'c',timerRaw:65536,appleCount:0,appleMax:12,activeAppleMax:10};
 const apples=Array.from({length:12},(_,i)=>({id:'a'+i,active:false})),rng={state:'42',inc:'55'};
 for(let i=0;i<60;i++)assert.equal(A.controllerUpdate(c,apples,rng,1/60),null);
 assert.equal(c.timerRaw,16);assert.equal(rng.state,'42');
 assert.equal(A.controllerUpdate(c,apples,rng,1/60).appleId,'a0');
 assert.equal(rng.state,'1822410079063825180');
 assert.equal(A.controllerDelay(c,rng),50474);
 assert.equal(rng.state,'3809638523503732771');
});
test('Controller cap retries without consuming randomness; death and completion freeze timer',()=>{
 const c={timerRaw:10,appleCount:0,appleMax:12,activeAppleMax:1},rng={state:'42',inc:'55'};
 assert.equal(A.controllerUpdate(c,[{active:true},{active:false}],rng,1/60),null);assert.equal(c.timerRaw,-1082);assert.equal(rng.state,'42');
 assert.equal(A.controllerEvent(c,47),false);assert.equal(c.stopped,undefined);
 assert.equal(A.controllerEvent(c,19),true);assert.equal(A.controllerUpdate(c,[],rng,1/60),null);assert.equal(c.timerRaw,-1082);
 c.stopped=false;c.appleCount=12;assert.equal(A.controllerUpdate(c,[],rng,1/60),null);assert.equal(c.timerRaw,-1082);
});
test('Final catch emits precisely Key start and Target reset; repeated catches emit nothing',()=>{
 const c={id:'c',appleCount:10,appleMax:12},apples=[{id:'a',active:true},{id:'b',active:false}];
 assert.deepEqual(A.controllerCatch(c,apples),{events:[],inactivateIds:[]});assert.equal(c.appleCount,11);
 assert.deepEqual(A.controllerCatch(c,apples),{events:[{broadcastActorType:17,eventType:1,senderId:'c'},{broadcastActorType:134,eventType:47,senderId:'c'}],inactivateIds:['a']});
 assert.deepEqual(A.controllerCatch(c,apples),{events:[],inactivateIds:[]});assert.equal(c.appleCount,12);
});
test('All individual unimplemented types refuse compilation, including controller-only',()=>{
 for(const typeName of A.supportedTypes)assert.throws(()=>A.compile([{typeName}],2),new RegExp(typeName+':'));
 assert.deepEqual(A.supportedTypes,['TargetPlayer','BasketPlayer','AppleController','Apple']);
 const c=A.compile([],2,{rngState:42});const s=A.create(c);assert.deepEqual(s,JSON.parse(JSON.stringify(s)));assert.notEqual(s,c);
 assert.deepEqual(A.beforeStep(s),{events:[],solids:[]});assert.deepEqual(A.displays(s),[]);
});