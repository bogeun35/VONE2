const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mod=require('./source-gokart-devices.js');
const pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
const stage=stages.stages.find(s=>s.stageId==='st_w_12_01');
function actors(c){return pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,c,true),c);}
for(let count=2;count<=8;count++)test(`real stage ${count} players: exact parameters and guarded compilation`,()=>{
 const a=actors(count),k=a.filter(a=>a.typeName==='GoKart'),s=a.filter(a=>a.typeName==='Stick');
 assert.equal(k.length,1);assert.deepEqual([k[0].name,k[0].posX,k[0].posY],['GoKart1',144,432]);
 assert.equal(s.length,count<5?0:5);
 const p=mod.parameters(k[0],count);
 assert.deepEqual(p.jumpTable,[1114112,1310720,1310720,1310720,1310720,1310720,1310720]);
 assert.deepEqual(p.speedTable,[327680,327680,327680,327680,327680,327680,327680]);
 assert.equal(p.jumpVeloRaw,count===2?1114112:1310720);assert.equal(p.maxSpeedRaw,327680);
 assert.throws(()=>mod.compile(a,count),/GoKart simulation unresolved/);
 if(count>=5){assert.deepEqual(s.map(x=>[x.name,x.posX,x.posY]),[['Stick1',816,288],['Stick2',1536,288],['Stick3',2881,240],['Stick4',3743,432],['Stick5',4968,144]]);assert.throws(()=>mod.compile(s,count),/Stick collision unresolved/);}
});
test('nonzero table falls back downward and zero retains native defaults',()=>{
 assert.equal(mod.resolveTable([5,0,0,9,0,0,0],4),5);
 assert.equal(mod.resolveTable([5,0,0,9,0,0,0],8),9);
 const z={datas:[{t:2,s:'!'.repeat(56)},{t:2,s:'!'.repeat(56)}]};
 assert.deepEqual([mod.parameters(z,8).jumpVeloRaw,mod.parameters(z,8).maxSpeedRaw],[1310720,262144]);
});
test('signed raw decoder handles UTF-16 byte wrap and quoted strings',()=>{
 const negative='\u0120'.repeat(8)+'!'.repeat(48);
 assert.equal(mod.decodeTable({t:2,s:negative})[0],-1);
 assert.deepEqual(mod.decodeTable({t:2,s:'"'+'!'.repeat(56)+'"'}),[0,0,0,0,0,0,0]);
 assert.throws(()=>mod.decodeTable({t:2,s:'!'}),/56 UTF-16/);
});
test('driver rotation is minus four modulo population',()=>{
 assert.deepEqual(mod.drivers(8),[0,1,2,3]);
 assert.equal(mod.nextDriverIndex(8,0),4);assert.deepEqual(mod.drivers(8,4),[4,5,6,7]);
 assert.equal(mod.nextDriverIndex(5,0),1);assert.equal(mod.nextDriverIndex(5,4),0);
 assert.equal(mod.nextDriverIndex(7,0),3);assert.deepEqual(mod.drivers(7,6),[6,0,1,2]);
 assert.equal(mod.nextDriverIndex(4,0),0);
});
test('FP jump is nonlinear with exact truncation',()=>{
 assert.equal(mod.jumpRaw(0,4,1310720),0);
 assert.equal(mod.jumpRaw(1,4,1310720),573440);
 assert.equal(mod.jumpRaw(2,4,1310720),983040);
 assert.equal(mod.jumpRaw(3,4,1310720),1228800);
 assert.equal(mod.jumpRaw(4,4,1310720),1310720);
 assert.equal(mod.jumpRaw(1,3,1310720),728180);
});
test('gravity is exact per update and caps on the 31st update',()=>{
 let vy=0;for(let i=0;i<30;i++)vy+=mod.gravityDeltaRaw(vy);
 assert.equal(vy,1277940);vy+=mod.gravityDeltaRaw(vy);assert.equal(vy,1277952);
 assert.equal(mod.gravityDeltaRaw(vy),0);
 assert.equal(mod.gravityDeltaRaw(0,32768),21299);
});
test('collision tuples retain native order without claiming axis semantics',()=>{
 assert.deepEqual(mod.collisionRects(2),{body:[16,248,-34,-16],head:[40,96,92,-56],head2:null});
 assert.deepEqual(mod.collisionRects(8),{body:[16,248,-34,-16],head:[40,208,-20,-56],head2:[40,208,-20,-114]});
});
test('empty module state survives JSON and forged device state refuses all hooks',()=>{
 const s=mod.create(mod.compile([],2));assert.deepEqual(s,JSON.parse(JSON.stringify(s)));
 assert.deepEqual(mod.solids(s),[]);assert.deepEqual(mod.displays(s),[]);
 assert.deepEqual(mod.beforeStep(s),{events:[],solids:[]});assert.deepEqual(mod.afterStep(s),{events:[],deadPlayerIds:[]});
 for(const hook of ['solids','displays','beforeStep','afterStep'])assert.throws(()=>mod[hook]({...s,karts:[{}]}),/cannot be simulated/);
});
