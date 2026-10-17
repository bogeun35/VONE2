'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('./source-distanceconstraint-devices.js'),pop=require('./population-rules.cjs');
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
function actors(id,c){const st=stages.find(s=>s.stageId===id);return pop.actorsForCount(pop.selectVariant(st.json.stageInitParamList,c,true),c);}
function fixture(){return structuredClone(actors('st_w_02_01',4).find(a=>a.typeName==='DistanceConstraint'));}
for(const [id,distance] of [['st_w_02_01',140],['st_w_02_03',200],['st_w_09_04',240]])test(id+' exact native parameters at all 2..8 counts',()=>{
 for(let c=2;c<=8;c++){const a=D.inspectActors(actors(id,c),c);assert.equal(a.length,1);assert.deepEqual(a[0],{id:'source:a'+actors(id,c).findIndex(a=>a.typeName==='DistanceConstraint'),name:'DistanceConstraint',type:'DistanceConstraint',distanceRaw:distance*65536,gravityTensionRaw:id==='st_w_09_04'||c===2?65536:c===3?45875:32768,distanceSlot:2*(c-2),gravitySlot:2*(c-2)+1});}
});
test('float32 conversion truncates 0.7 and negative 0.7',()=>{assert.equal(D.fpRaw(0.7),45875);assert.equal(D.fpRaw(-0.7),-45875);assert.equal(D.fpRaw(1.2),78643);assert.equal(D.fpRaw(0.1),6553);});
test('independent fallback selects base distance and current gravity',()=>{const a=fixture();a.datas[4].f=0;a.datas[5].f=0.75;assert.deepEqual(D.parameters(a,4),{distanceRaw:9175040,gravityTensionRaw:49152,distanceSlot:0,gravitySlot:5});});
test('fallback skips earlier nonzero count instead of descending search',()=>{const a=fixture();a.datas[2].f=190;a.datas[4].f=0;a.datas[5].f=0;assert.deepEqual(D.parameters(a,4),{distanceRaw:9175040,gravityTensionRaw:65536,distanceSlot:0,gravitySlot:1});});
test('absolute epsilon four is inclusive including negative raw',()=>{const a=fixture();a.datas[4].f=-4/65536;a.datas[5].f=3/65536;assert.deepEqual(D.parameters(a,4),{distanceRaw:-4,gravityTensionRaw:65536,distanceSlot:4,gravitySlot:1});});
test('non-float slot becomes zero; base zero overwrites creator default',()=>{const a=fixture();a.datas[4]={t:2,s:'unused'};a.datas[5]={t:0,f:900};a.datas[1].f=0;assert.deepEqual(D.parameters(a,4),{distanceRaw:9175040,gravityTensionRaw:0,distanceSlot:0,gravitySlot:1});});
test('malformed slots and player counts fail explicitly',()=>{const a=fixture();a.datas.length=4;assert.throws(()=>D.parameters(a,4),/missing parameter slot 4/);for(const c of [1,9,2.5])assert.throws(()=>D.parameters(fixture(),c),/2..8/);assert.throws(()=>D.fpRaw(Infinity),/Invalid/);assert.throws(()=>D.fpRaw(1e20),/safe integer/);});
test('native floor friction division truncates before multiplication',()=>{assert.deepEqual(Array.from({length:8},(_,i)=>D.floorSlideScaleRaw(i,true)),[65536,39321,26213,19660,15728,13106,11234,9830]);assert.equal(D.floorSlideScaleRaw(3,false),65536);assert.equal(D.floorSlideScaleRaw(-1,true),65536);});
test('event24 accepts only eight indices and clear resets exactly',()=>{const m=D.forceMoves();assert.equal(D.markForceMove(m,{eventType:24,playerIndex:7}),true);assert.equal(D.markForceMove(m,{eventType:24,playerIndex:0}),true);for(const i of [-1,8,0.5])assert.equal(D.markForceMove(m,{eventType:24,playerIndex:i}),false);assert.equal(D.markForceMove(m,{eventType:61,playerIndex:1}),false);assert.deepEqual(m,[1,0,0,0,0,0,0,1]);D.clearForceMoves(m);assert.deepEqual(m,[0,0,0,0,0,0,0,0]);});
test('all 21 real stage/count combinations refuse executable approximation',()=>{for(const id of ['st_w_02_01','st_w_02_03','st_w_09_04'])for(let c=2;c<=8;c++)assert.throws(()=>D.compile(actors(id,c),c),e=>e.message===D.refusal);});
test('population filter does not refuse absent device',()=>{const a=fixture();a.playerCount=5;assert.deepEqual(D.inspectActors([a],4),[]);assert.deepEqual(D.compile([a],4).constraints,[]);assert.throws(()=>D.compile([a],5),/contact transport/);});
test('empty interface round trips JSON; injected unresolved state fails',()=>{const s=D.create(D.compile([],4));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);assert.deepEqual(D.solids(s),[]);assert.deepEqual(D.beforeStep(s,{}),{events:[],solids:[]});assert.deepEqual(D.afterStep(s,{}),{events:[],deadPlayerIds:[]});assert.deepEqual(D.displays(s),[]);const injected={constraints:[{}]};for(const f of [D.create,D.solids,D.beforeStep,D.afterStep,D.displays])assert.throws(()=>f(injected),/safe integer|force-move flags|contact transport/);});

const crypto=require('node:crypto'),vm=require('node:vm');
const FP=65536,Z={xRaw:0,yRaw:0};
function player(index,x=0,y=0,overrides={}){return {index,xRaw:x*FP,yRaw:y*FP,vxRaw:0,vyRaw:0,state:0,flags:1,floating:true,hasActor:true,hasCollision:true,contactCount0:0,contacted1:false,mapFaces:[false,false,false,false],...overrides};}
function core(distance=100,gravity=0){return D.createConstraintFacts({distanceRaw:distance*FP,gravityTensionRaw:gravity*FP});}
function emptyInfo(){return {prev:{tension:{...Z},floatingCount:0},next:{tension:{...Z},floatingCount:0}};}
test('full native LUT matches all 65537 installed int32 entries and digest',()=>{
 const data=fs.readFileSync('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets').subarray(11384408,11384408+262148);
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),D.NativeMath.tableHash);
 for(let i=0;i<=65536;i++)assert.equal(D.NativeMath.lookup(i),data.readInt32LE(i*4),'index '+i);
 assert.equal(D.NativeMath.entryCount,65537);
});
test('native sqrt and normalization cross signed/shift boundaries and axis truncation',()=>{
 assert.equal(D.NativeMath.sqrtRaw(1),256);assert.equal(D.NativeMath.sqrtRaw(65536),65536);assert.equal(D.NativeMath.sqrtRaw(65537),65536);
 assert.equal(D.NativeMath.lengthRaw({xRaw:180*FP,yRaw:240*FP}),300*FP);
 assert.deepEqual(D.NativeMath.normalizeRaw({xRaw:200*FP,yRaw:0}),{xRaw:65535,yRaw:0});
 assert.deepEqual(D.NativeMath.normalizeRaw({xRaw:-200*FP,yRaw:0}),{xRaw:-65536,yRaw:0});
 assert.deepEqual(D.NativeMath.normalizeRaw({xRaw:-180*FP,yRaw:-240*FP}),{xRaw:-39322,yRaw:-52429});
 assert.deepEqual(D.NativeMath.normalizeRaw(Z),Z);assert.throws(()=>D.NativeMath.lengthRaw({xRaw:4000000000,yRaw:0}),/negative\/overflowed/);
});
test('browser native math without Buffer or require agrees with numerical resource',()=>{
 const box={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'source-distanceconstraint-math.js'),'utf8'),box);
 assert.deepEqual(JSON.parse(JSON.stringify(box.SourceDistanceConstraintMath.normalizeRaw({xRaw:180*FP,yRaw:240*FP}))),{xRaw:39321,yRaw:52428});assert.equal(box.SourceDistanceConstraintMath.lookup(65536),4194304);
});
test('tension threshold, missing collision and peer contact mass match calcTension',()=>{
 const c=core(),a=player(0),b=player(1,200);assert.deepEqual(D.calcTension(c,a,b),{xRaw:65535,yRaw:0});
 assert.deepEqual(D.calcTension(c,a,{...b,contactCount0:2}),{xRaw:196605,yRaw:0});
 assert.deepEqual(D.calcTension(c,a,{...b,contactCount0:2,hasCollision:false}),{xRaw:65535,yRaw:0});
 assert.deepEqual(D.calcTension(c,a,player(1,100)),Z);assert.deepEqual(D.calcTension(c,a,a),Z);assert.deepEqual(D.calcTension(c,a,null),Z);
});
test('prev includes every preceding link; next intentionally excludes final pair',()=>{
 const c=core(100,0.5),ps=[0,200,400,600].map((x,i)=>player(i,x));
 assert.deepEqual(D.calcPrevTension(c,ps,3),{tension:{xRaw:-196608,yRaw:32768},floatingCount:3});
 assert.deepEqual(D.calcNextTension(c,ps,0),{tension:{xRaw:131070,yRaw:32768},floatingCount:2});
 assert.deepEqual(D.calcNextTension(c,ps,2),{tension:{xRaw:0,yRaw:32768},floatingCount:0});
 assert.deepEqual(D.calcNextTension(c,ps.slice(0,2),0),{tension:{xRaw:0,yRaw:32768},floatingCount:0});
 ps[1].floating=false;assert.equal(D.calcPrevTension(c,ps,3).floatingCount,0);assert.equal(D.calcNextTension(c,ps,0).floatingCount,0);
 ps[0].hasCollision=false;assert.equal(D.calcNextTension(c,ps,0).tension.yRaw,0);
});
test('pair force exact signed diagonal raws, inactive peer full share, and zero branches',()=>{
 const c=core(),a=player(0);assert.deepEqual(D.calcPairF(c,a,player(1,180,240),Z,Z,0,false),{force:{xRaw:786408,yRaw:1048544},redirectedUp:null});
 assert.deepEqual(D.calcPairF(c,a,player(1,-180,-240),Z,Z,0,false),{force:{xRaw:-786428,yRaw:-1048564},redirectedUp:null});
 assert.equal(D.calcPairF(c,a,player(1,200,0,{state:5}),Z,Z,0,false).force.xRaw,1310680);
 assert.deepEqual(D.calcPairF(c,{...a,state:5},player(1,200),Z,Z,0,false).force,Z);
 assert.deepEqual(D.calcPairF(c,a,player(1,100),Z,Z,0,false).force,Z);
});
test('pair allocation uses positive projected tensions and integer 1-minus division',()=>{
 const c=core(),a=player(0),b=player(1,200);
 // nX65535: projection(-n, -65536) =65535; a131071,b65536;
 // share=65536-floor(131071*65536/196607)=21846;
 // excess6553600*21846>>16=2184600; *13107>>16=436913; *65535>>16=436906.
 assert.equal(D.calcPairF(c,a,b,{xRaw:-FP,yRaw:0},Z,0,false).force.xRaw,436906);
 assert.equal(D.calcPairF(c,a,b,{xRaw:FP,yRaw:0},Z,0,false).force.xRaw,655340);
});
test('pair wall redirect uses original component signs, then ceiling/floor conversion',()=>{
 const c=core(),a=player(0,0,0,{mapFaces:[false,false,false,true]});
 assert.deepEqual(D.calcPairF(c,a,player(1,180,240),Z,Z,0,false),{force:{xRaw:0,yRaw:1834952},redirectedUp:false});
 const up=player(0,0,0,{mapFaces:[false,false,true,false]});assert.deepEqual(D.calcPairF(c,up,player(1,-180,-240),Z,Z,0,false),{force:{xRaw:0,yRaw:-1834992},redirectedUp:true});
 const ceiling=player(0,0,0,{mapFaces:[true,false,false,false]});assert.deepEqual(D.calcPairF(c,ceiling,player(1,-180,-240),Z,Z,0,false).force,{xRaw:-1834992,yRaw:0});
 const floor=player(0,0,0,{mapFaces:[false,true,false,false]});assert.deepEqual(D.calcPairF(c,floor,player(1,180,240),Z,Z,1,true).force,{xRaw:1415524,yRaw:0});
 // Two consecutive collision-axis conversions use ORIGINAL X sign, even after wall zeroes X.
 const corner=player(0,0,0,{mapFaces:[false,true,true,false]});assert.equal(D.calcPairF(c,corner,player(1,-180,240),Z,Z,0,false).force.xRaw,-1834972);
});
test('collision redirection threshold is strictly above65 and flags distinguish no collider',()=>{
 const c=core(0),a=player(0,0,0,{mapFaces:[false,false,false,true]}),b=player(1,0,0);
 // sqrt((1000*1000)>>16)=991; excess331 -> K product66 -> normalized65.
 b.xRaw=1000;c.distanceRaw=660;assert.equal(D.calcPairF(c,a,{...b,state:5},Z,Z,0,false).force.xRaw,65);
 c.distanceRaw=655;assert.equal(D.calcPairF(c,a,{...b,state:5},Z,Z,0,false).force.xRaw,0);
 assert.notEqual(D.calcPairF(c,{...a,hasCollision:false},player(1,200),Z,Z,0,false).force.xRaw,0);
});
test('aggregate event24 brakes opposing low velocity and clears player flag0 on upward pull',()=>{
 const c=core(),ps=[player(0),player(1,200,0,{vxRaw:1000})],infos=ps.map(emptyInfo);
 c.forceMoves[1]=1;assert.equal(D.calcF(c,ps,infos,1).force.xRaw,5553);
 c.forceMoves[1]=0;assert.equal(D.calcF(c,ps,infos,1).force.xRaw,-655350);
 const vertical=[player(0),player(1,0,200)];assert.equal(D.calcF(c,vertical,infos,1).flags,0);
 vertical[1].hasCollision=false;assert.equal(D.calcF(c,vertical,infos,1).flags,1);
});
test('aggregate weak upward grounded pull cancels, strong pull clamps symmetrically',()=>{
 const c=core(0),ps=[player(0),player(1,0,2,{contacted1:true})],infos=ps.map(emptyInfo);
 assert.deepEqual(D.calcF(c,ps,infos,1).force,Z);
 ps[1].yRaw=300*FP;assert.equal(D.calcF(c,ps,infos,1).force.yRaw,-1320550);
 assert.equal(D.calcF(c,ps,infos,0).force.yRaw,1320550);
 ps[1].state=5;assert.deepEqual(D.calcF(c,ps,infos,1).force,Z);
});
test('wall redirected upward force cancels only when velocity is strictly smaller',()=>{
 const c=core(),ps=[player(0,-180,-240),player(1,0,0,{vyRaw:-2000000,mapFaces:[false,false,true,false]})],infos=ps.map(emptyInfo);
 assert.equal(D.calcF(c,ps,infos,1).redirectedUp,true);assert.equal(D.calcF(c,ps,infos,1).force.yRaw,0);
 ps[1].vyRaw=-1834992;assert.equal(D.calcF(c,ps,infos,1).force.yRaw,-1320550);
});
test('full Update snapshots all forces, preserves input, emits mode2 and clears force flags',()=>{
 const c=core(),ps=[player(0),player(1,200)];c.forceMoves[0]=1;const old=structuredClone({c,ps});
 const u=D.updateConstraint(c,ps);assert.deepEqual({c,ps},old);assert.equal(u.skipped,false);
 assert.equal(u.players[0].xRaw,655340);assert.equal(u.players[1].xRaw,12451850);
 assert.deepEqual(u.constraint.forceMoves,Array(8).fill(0));assert.equal(u.moves.length,2);assert.equal(u.moves[0].moveContactMode,2);
 assert.deepEqual(u.moves[0].deltaRaw,u.results[0].force);assert.deepEqual(D.updateConstraint(JSON.parse(JSON.stringify(c)),JSON.parse(JSON.stringify(ps))),u);
});
test('bit9 skips whole Update preserving pending flags; state5 skips only that player',()=>{
 const c=core(),ps=[player(0),player(1,200)];c.forceMoves[7]=1;ps[1].flags|=0x200;
 const u=D.updateConstraint(c,ps);assert.equal(u.skipped,true);assert.deepEqual(u.players,ps);assert.deepEqual(u.constraint.forceMoves,c.forceMoves);assert.deepEqual(u.moves,[]);
 ps[1].flags=1;ps[1].state=5;const v=D.updateConstraint(c,ps);assert.deepEqual(v.players[1],ps[1]);assert.deepEqual(v.infos[1],emptyInfo());assert.equal(v.moves.length,1);
});
test('host facts compile accepts all actual counts; hooks require successful contact transaction',()=>{
 for(const id of ['st_w_02_01','st_w_02_03','st_w_09_04'])for(let c=2;c<=8;c++)assert.equal(D.compile(actors(id,c),c,{nativeConstraintFacts:true}).constraints.length,1);
 const s=D.create(D.compile(actors('st_w_02_01',2),2,{nativeConstraintFacts:true})),ps=[player(0),player(1,200)];
 assert.throws(()=>D.beforeStep(s,{}),/constraintPlayers/);const before=structuredClone(s);
 assert.throws(()=>D.beforeStep(s,{constraintPlayers:ps,events:[{targetName:'DistanceConstraint',eventType:24,playerIndex:0}],applyConstraintUpdate:()=>false}),/not committed/);assert.deepEqual(s,before);
 let got;D.beforeStep(s,{constraintPlayers:ps,events:[{targetName:'DistanceConstraint',eventType:24,playerIndex:0}],applyConstraintUpdate:u=>{got=u;return true;}});assert.equal(got.players[0].vxRaw,393204);assert.deepEqual(s.constraints[0].forceMoves,Array(8).fill(0));
});
test('missing native directional, dense index and null actor geometry fail specifically',()=>{
 const c=core(),ps=[player(0),player(1,200)];delete ps[1].floating;assert.throws(()=>D.updateConstraint(c,ps),/floating\/actor\/collision/);
 ps[1]=player(2,200);assert.throws(()=>D.updateConstraint(c,ps),/dense native/);
 ps[1]=player(1,200,0,{hasActor:false});assert.throws(()=>D.updateConstraint(c,ps),/null actor dereference/);
});
test('pending event24 survives skipped tick and clears on following complete Update',()=>{
 const s=D.create(D.compile(actors('st_w_02_01',2),2,{nativeConstraintFacts:true}));let ps=[player(0),player(1,200,0,{flags:0x201})];
 let u;const ctx={constraintPlayers:ps,events:[{broadcast:true,eventType:24,playerIndex:1}],applyConstraintUpdate:x=>{u=x;return true;}};
 D.beforeStep(s,ctx);assert.equal(u.skipped,true);assert.equal(s.constraints[0].forceMoves[1],1);
 ps[1].flags=1;ps[1].vxRaw=1000;ctx.events=[];D.beforeStep(s,ctx);assert.equal(u.skipped,false);assert.equal(u.results[1].force.xRaw,5553);assert.deepEqual(s.constraints[0].forceMoves,Array(8).fill(0));
 ctx.constraintPlayers=[player(0),player(1),player(2)];assert.throws(()=>D.beforeStep(s,ctx),/differs from compiled/);
});
test('state5 to normal transition restores force processing without mutating previous snapshot',()=>{
 const c=core(),ps=[player(0),player(1,200,0,{state:5})];const first=D.updateConstraint(c,ps);assert.equal(first.moves.length,1);assert.deepEqual(first.players[1],ps[1]);
 const resume=structuredClone(ps);resume[1].state=0;const second=D.updateConstraint(first.constraint,resume);assert.equal(second.moves.length,2);assert.equal(second.players[1].vxRaw,-655350);assert.equal(ps[1].state,5);
});
