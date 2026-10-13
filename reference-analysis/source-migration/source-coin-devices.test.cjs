const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('./source-coin-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
const actors=(id,n)=>pop.actorsForCount(pop.selectVariant(stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),n);
const fixture=()=>api.create(api.compile([{typeName:'CoinObserver',posX:0,posY:0},{typeName:'Coin',posX:100,posY:100}],2));
test('real stages select all 2..8 variants and exact authored geometry/key state',()=>{
 for(const [id,total,x,y,keyX,keyY] of [['st_w_05_01',58,390,392,860,816],['st_w_05_03',75,96,144,960,552]])for(let n=2;n<=8;n++){
  const a=actors(id,n),c=api.compile(a,n);assert.equal(c.coins.length,total);assert.equal(c.observers.length,1);
  assert.deepEqual([c.coins[0].x,c.coins[0].y],[x,y]);assert.equal(c.observers[0].coinIds.length,total);
  const k=a.find(x=>x.typeName==='Key');assert.deepEqual([k.posX,k.posY,k.datas[2].f],[keyX,keyY,1]);
  assert.deepEqual(api.beforeStep(api.create(c)).events,[]);
 }
 assert.deepEqual(api.nativeConstants.rect,{x:-11,y:-19,w:22,h:38});
});
test('every real coin required; last collision emits only at following update and once',()=>{
 for(const id of ['st_w_05_01','st_w_05_03']){
  const s=api.create(api.compile(actors(id,8),8)),ids=s.coins.map(c=>c.id);
  api.afterStep(s,{coinContacts:ids.slice(0,-1)});assert.equal(s.observers[0].coinIds.length,1);assert.deepEqual(api.beforeStep(s).events,[]);
  const r=api.afterStep(s,{coinContacts:[ids.at(-1)]});assert.deepEqual(r.events,[]);assert.equal(s.observers[0].isNotified,false);
  assert.deepEqual(api.beforeStep(s).events,[{broadcastActorType:17,eventType:1,senderId:s.observers[0].id}]);
  for(let t=0;t<120;t++)assert.deepEqual(api.beforeStep(s).events,[]);
 }
});
test('strict rectangle boundaries, dead/exit exclusion, simultaneous pickup once',()=>{
 const s=fixture(),id=s.coins[0].id;
 for(const p of [{x:88,y:81,w:1,h:38},{x:89,y:119,w:22,h:1},{x:89,y:81,w:22,h:38,dead:true},{x:89,y:81,w:22,h:38,exit:true}])assert.deepEqual(api.afterStep(s,{players:[p]}).collectedCoinIds,[]);
 const p={x:89,y:81,w:1,h:1};const r=api.afterStep(s,{players:[p,p]});assert.deepEqual(r.sounds,[{coinId:id,seId:5}]);assert.deepEqual(r.removedActorIds,[id]);
 assert.deepEqual(api.afterStep(s,{players:[p]}).sounds,[]);assert.equal(api.displays(s).coins.length,0);assert.deepEqual(api.solids(s),[]);
});
test('authoritative contacts override geometry and unknown IDs do nothing',()=>{
 const s=fixture(),id=s.coins[0].id;
 assert.deepEqual(api.afterStep(s,{coinContacts:['missing'],players:[{x:89,y:81,w:22,h:38}]}).collectedCoinIds,[]);
 assert.deepEqual(api.afterStep(s,{coinContacts:[{coinId:id},{coinId:id}]}).collectedCoinIds,[id]);
});
test('JSON snapshot preserves pending success; empty observer succeeds; orphan coin collects',()=>{
 const s=fixture();api.afterStep(s,{coinContacts:[s.coins[0].id]});const round=JSON.parse(JSON.stringify(s));assert.deepEqual(api.beforeStep(round),api.beforeStep(s));
 const empty=api.create(api.compile([{typeName:'CoinObserver',posX:0,posY:0}],2));assert.equal(api.beforeStep(empty).events.length,1);
 const orphan=api.create(api.compile([{typeName:'Coin',posX:0,posY:0}],2));api.afterStep(orphan,{coinContacts:[orphan.coins[0].id]});assert.deepEqual(api.beforeStep(orphan).events,[]);
});
test('population filtering and unsupported lifecycle refuse specific cases',()=>{
 const coin={typeName:'Coin',posX:0,posY:0,playerCount:4};assert.equal(api.compile([coin],3).coins.length,0);assert.equal(api.compile([coin],4).coins.length,1);
 assert.throws(()=>api.compile([{...coin,createThreshold:1}],4),/Deferred/);
 const o={typeName:'CoinObserver',posX:0,posY:0};assert.throws(()=>api.compile([o,o],2),/Multiple CoinObservers/);
 assert.throws(()=>api.compile([],1),/2..8/);assert.throws(()=>api.compile([{...coin,posX:NaN}],4),/finite/);
 assert.throws(()=>api.compile([{...coin,id:'same'},{...coin,id:'same'}],4),/Duplicate/);
});
