'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('./source-wind-devices.js'),pop=require('./population-rules.cjs');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
function actors(id,c){const st=source.stages.find(s=>s.stageId===id);return pop.actorsForCount(pop.selectVariant(st.json.stageInitParamList,c,true),c);}
const fresh=(id='st_w_12_03',c=2)=>M.create(M.compile(actors(id,c),c));
for(const [id,x,y,range,scale,left,powers,num] of [
 ['st_w_02_04',1942,289,1276,1,false,[65536,65536,65536,65536,65536,65536,39321],1],
 ['st_w_07_01',2304,192,898,2,true,[65536,65536,65536,65536,65536,65536,65536],2],
 ['st_w_09_04',2160,864,1280,2,true,[65536,58982,52428,45875,39321,32768,26214],1],
 ['st_w_12_03',780,432,1280,2,true,[117964,117964,117964,117964,117964,117964,117964],1]
])test(id+' exact real variants, 2..8 players',()=>{
 for(let c=2;c<=8;c++){const s=fresh(id,c);assert.equal(s.winds.length,num);const w=s.winds[0];
  assert.deepEqual([w.x,w.y,w.rangeRaw,w.strongScaleRaw,w.direction,w.powerRaw,w.strong],[x,y,range*65536,scale*65536,left?2:3,(left?-1:1)*powers[c-2],false]);
  if(num===2)assert.equal(s.winds[1].y,432);
 }
});
test('native body and signed wind rectangles',()=>{
 const s=fresh();assert.deepEqual(M.solids(s)[0],{id:s.winds[0].id,x:749,y:357,w:48,h:74});
 assert.deepEqual(M.volumes(s)[0],{id:s.winds[0].id,windId:s.winds[0].id,x:-500,y:372,w:1280,h:16,category:0,userTag:4});
 assert.equal(M.volumes(fresh('st_w_02_04'))[0].x,1942);
});
test('61 strengthens, 60 restores weak wind, neither disables; one tick consumption',()=>{
 const s=fresh(),w=s.winds[0],contact={windId:w.id,actorId:'p1'};
 assert.equal(M.beforeStep(s).forces.length,0);
 M.afterStep(s,{windContacts:[contact]});assert.equal(M.beforeStep(s).forces[0].xRaw,-117964);
 assert.deepEqual(M.beforeStep(s).forces,[]);
 M.beforeStep(s,{events:[{targetName:w.name,eventType:61}]});assert.equal(w.strong,true);
 M.afterStep(s,{windContacts:[contact]});assert.equal(M.beforeStep(s).forces[0].xRaw,-235928);
 M.afterStep(s,{events:[{targetName:w.name,eventType:60}],windContacts:[contact]});assert.equal(w.strong,false);
 assert.equal(M.beforeStep(s).forces[0].xRaw,-117964);
});
test('last contact overwrites instead of adding; JSON survives pending force',()=>{
 const s=fresh('st_w_07_01'),[a,b]=s.winds;M.signal(s,{targetId:b.id,eventType:61});
 M.afterStep(s,{windContacts:[{windId:a.id,actorId:'box'},{windId:b.id,actorId:'box'}]});
 const copy=JSON.parse(JSON.stringify(s));assert.equal(M.beforeStep(copy).forces[0].xRaw,-131072);
 M.afterStep(copy,{windContacts:[{windId:b.id,actorId:'box'},{windId:a.id,actorId:'box'}]});assert.equal(M.beforeStep(copy).forces[0].xRaw,-65536);
});
test('top view refused and parameter position offsets use count-2',()=>{
 const a=structuredClone(actors('st_w_12_03',2).find(a=>a.typeName==='Wind'));a.datas[0].f=10;a.datas[1].f=-5;
 const s=M.compile([a],8);assert.deepEqual([s.winds[0].x,s.winds[0].y],[840,402]);
 for(const options of [{topView:true},{isTopViewSort:true},{stageFlags:64}])assert.throws(()=>M.compile([a],2,options),/top-view/);
 assert.throws(()=>M.afterStep(s,{windContacts:[{windId:'missing',actorId:'p'}]}),/Unknown Wind/);
});
