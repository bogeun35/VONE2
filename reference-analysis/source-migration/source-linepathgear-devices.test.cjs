const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('./source-linepathgear-devices.js'),pop=require('./population-rules.cjs'),F=65536;
const stages=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages;
function actors(id,count){return pop.actorsForCount(pop.selectVariant(stages.find(x=>x.stageId===id).json.stageInitParamList,count,true),count);}
function first(){return M.inspectActors(actors('st_w_15_01',2),2)[0];}
for(let c=2;c<=8;c++)test('real st_w_15_01 '+c+'p exact three gears and guarded compile',()=>{
 const a=actors('st_w_15_01',c),g=M.inspectActors(a,c),delta=[0,0,0,0,-19660,-98304,-117964][c-2];
 assert.deepEqual(g.map(x=>x.name),['LinePathGear1','LinePathGear2','LinePathGear3']);
 assert.deepEqual(g.map(x=>[x.xRaw,x.yRaw]),[[110*F,480*F],[2832*F,144*F],[2832*F,240*F]]);
 assert.deepEqual(g.map(x=>x.speedRaw),[229376,262144+delta,262144+delta]);
 assert.deepEqual(g.map(x=>x.standby),[false,true,true]);
 assert.deepEqual(g.map(x=>x.paths),[[{xRaw:800*F,yRaw:0},{xRaw:800*F,yRaw:-350*F}],[{xRaw:-1104*F,yRaw:0},{xRaw:-1104*F,yRaw:300*F}],[{xRaw:-1008*F,yRaw:0},{xRaw:-1008*F,yRaw:204*F}]]);
 for(const x of g){assert.equal(x.loop,true);assert.equal(x.absLoop,true);assert.equal(x.enableLine,true);assert.equal(x.dirXRaw,F);assert.equal(x.returnDirection,0);assert.equal(x.timerRaw,0);}
 assert.throws(()=>M.compile(a,c),/authored chipSize/);
 assert.throws(()=>M.compile(a,c,{nativeActorBridge:true,nativeSqrtRaw:Math.sqrt}),/authored chipSize/);
});
test('real light stage endpoint table directly changes final Y at2..8',()=>{
 const offset=[0,0,-3145728,-3145728,-3145728,-6291456,-6291456];
 for(let c=2;c<=8;c++){const a=actors('st_l_04_02',c),g=M.inspectActors(a,c)[0];assert.equal(g.speedRaw,170393);assert.deepEqual([g.xRaw,g.yRaw],[120*F,168*F]);assert.equal(g.endpointYOffsetRaw,offset[c-2]);assert.deepEqual(g.paths,[{xRaw:1464*F,yRaw:0},{xRaw:1464*F,yRaw:528*F+offset[c-2]}]);assert.throws(()=>M.compile(a,c),/authored chipSize/);}
});
function table(values){return {t:2,s:values.map(v=>{let q=BigInt.asUintN(64,BigInt(v)),s='';for(let b=0;b<8;b++){s+=String.fromCharCode(Number(q&255n)+33);q>>=8n;}return s;}).join('')};}
function synthetic(slots={}){const datas=Array.from({length:32},()=>({t:0,f:0,s:null}));for(const [i,d]of Object.entries(slots))datas[i]=typeof d==='number'?{t:1,f:d,s:null}:d;return {typeName:'LinePathGear',posX:0,posY:0,playerCount:0,name:'diagnostic',datas};}
test('direct count index has no fallback, speed can become negative without clamp',()=>{
 const a=synthetic({1:2,3:table([F,0,-3*F,0,0,0,0]),7:10});assert.equal(M.decodeActor(a,2).speedRaw,3*F);assert.equal(M.decodeActor(a,3).speedRaw,2*F);assert.equal(M.decodeActor(a,4).speedRaw,-F);
});
test('table reads low UTF16 bytes, signed int64 and native invalid-width zero result',()=>{
 const t=table([0,-19660,-98304,-117964,4,0,F]);assert.deepEqual(M.countTable(t),[0,-19660,-98304,-117964,4,0,F]);const wrapped={...t,s:t.s.split('').map(x=>String.fromCharCode(x.charCodeAt(0)+256)).join('')};assert.deepEqual(M.countTable(wrapped),M.countTable(t));for(const t of [null,{t:1,f:2},{t:2,s:'x'},{t:2,s:'"'+'!'.repeat(56)+'"'}])assert.deepEqual(M.countTable(t),Array(7).fill(0));
});
test('speed abs epsilon and arithmetic shift flags preserve native behavior',()=>{
 assert.equal(M.fpRaw(2.6),170393);assert.equal(M.fpRaw(-0.3),-19660);
 for(const speed of [0,3/F])assert.equal(M.decodeActor(synthetic({1:speed}),2).speedRaw,F);
 assert.equal(M.decodeActor(synthetic({1:-4/F}),2).speedRaw,4);
 const g=M.decodeActor(synthetic({0:-0.2,2:-0.2,5:-0.2,6:1.9}),2);assert.equal(g.dirXRaw,F);assert.equal(g.standby,true);assert.equal(g.loop,false);assert.equal(g.enableLine,true);
 assert.equal(M.decodeActor(synthetic({0:1}),2).dirXRaw,-F);
});
test('path pair zero terminates; one zero axis is a valid point; endpoint only last',()=>{
 const a=synthetic({7:10,8:0,9:0,10:20,11:0,12:0,13:30,14:40,27:table([F,0,0,0,0,0,0])});assert.deepEqual(M.decodeActor(a,2).paths,[{xRaw:10*F,yRaw:0},{xRaw:0,yRaw:21*F}]);assert.equal(M.decodeActor(synthetic(),2).disabled,true);
});
test('path cap is exactly10 pairs and slot27 is table rather than11th path',()=>{
 const a=synthetic();for(let i=7;i<27;i++)a.datas[i]={t:1,f:i,s:null};a.datas[27]=table([F,0,0,0,0,0,0]);const g=M.decodeActor(a,2);assert.equal(g.paths.length,10);assert.deepEqual(g.paths[9],{xRaw:25*F,yRaw:27*F});
});
test('mode0 diagnostic timer reaches endpoint tick35, drops overshoot and stops',()=>{
 const g=first();g.loop=false;g.absLoop=false;for(let i=0;i<34;i++)assert.equal(M.advanceTraversal(g,1092,2*F).reachedEnd,false);assert.equal(g.timerRaw,129948);assert.deepEqual(M.advanceTraversal(g,1092,2*F),{progressRaw:F,reachedEnd:true});assert.equal(g.timerRaw,0);assert.equal(g.returnDirection,1);assert.equal(g.standby,true);assert.equal(M.advanceTraversal(g,1092,2*F),null);
});
test('mode1 returns to origin then stops; mode2 keeps ping-pong without teleport',()=>{
 for(const mode of [1,2]){const g=first();g.mode=mode;g.absLoop=mode===2;for(let i=0;i<35;i++)M.advanceTraversal(g,1092,2*F);assert.equal(g.standby,false);assert.deepEqual(M.advanceTraversal(g,1092,2*F),{progressRaw:63625,reachedEnd:false});for(let i=1;i<35;i++)M.advanceTraversal(g,1092,2*F);assert.equal(g.returnDirection,0);assert.equal(g.timerRaw,0);assert.equal(g.standby,mode===1);}
});
test('standby toggles only on61, preserves progress and delegates other events',()=>{
 const g=first();M.advanceTraversal(g,1092,2*F);assert.equal(g.timerRaw,3822);assert.deepEqual(M.receiveEvent(g,61),{handled:true});assert.equal(M.advanceTraversal(g,1092,2*F),null);assert.equal(g.timerRaw,3822);assert.deepEqual(M.receiveEvent(g,60),{handled:false,delegateToActor:true});assert.equal(g.standby,true);M.receiveEvent(g,61);M.advanceTraversal(g,1092,2*F);assert.equal(g.timerRaw,7644);
});
test('nonpositive world length and negative speed clamp progress without endpoint',()=>{
 const g=first();g.speedRaw=-F;assert.deepEqual(M.advanceTraversal(g,1092,2*F),{progressRaw:0,reachedEnd:false});assert.equal(g.timerRaw,-1092);for(const len of [0,-F])assert.deepEqual(M.advanceTraversal(g,1092,len),{progressRaw:0,reachedEnd:false});assert.equal(g.returnDirection,0);assert.equal(g.standby,false);
});
test('circle descriptor is exact Gear geometry, layer8, never AABB solid',()=>{
 assert.deepEqual(M.collisionDescriptor(first()),{actorId:first().id,radiusRaw:2949120,xRaw:-131072,yRaw:-3145728,shape:'circle',layer:8,pushBackTarget:0,isEnableSyncPos:true});assert.equal(M.nativeConstants.guideLineWidthRaw,4915);
});
test('contact event43 needs native actor layer1 and emits every callback',()=>{
 const g=first(),c={contactType:1,otherActorExists:true,otherLayer:1,otherId:'p2'},event={senderId:g.id,targetId:'p2',eventType:43,causeDead:0};assert.deepEqual(M.contacted(g,c),[event]);assert.deepEqual(M.contacted(g,c),[event]);for(const c of [{contactType:0},{contactType:1,otherActorExists:false},{contactType:1,otherActorExists:true,otherLayer:8}])assert.deepEqual(M.contacted(g,c),[]);assert.throws(()=>M.contacted(g,{contactType:1}),/native otherActorExists/);
});
test('collision callback independently gates playerState1 and exact entity target',()=>{
 const g=first(),c={otherLayer:1,playerExists:true,playerState:1,playerEntityId:'p1'};assert.deepEqual(M.collided(g,c),[{senderId:g.id,targetId:'p1',eventType:43,causeDead:0}]);for(const state of [0,2,3,4])assert.deepEqual(M.collided(g,{...c,playerState:state}),[]);assert.deepEqual(M.collided(g,{otherLayer:8}),[]);assert.deepEqual(M.collided(g,{otherLayer:1,playerExists:false}),[]);assert.throws(()=>M.collided(g,{otherLayer:1,playerExists:true}),/native player state/);
});
test('population filtering preserves stable actor indices and wrapped parameters',()=>{
 const a=synthetic({7:1});a.playerCount=35;const list=[{typeName:'Gear'},a];assert.equal(M.inspectActors(list,2).length,0);assert.equal(M.inspectActors(list,3)[0].id,'source:a1');assert.equal(M.inspectActors(list,6).length,0);const wrap={id:'wrap',properties:{typeName:'LinePathGear',name:'G',playerCount:0},position:{x:12,y:34},parameters:a.datas};assert.deepEqual([M.decodeActor(wrap,4).xRaw,M.decodeActor(wrap,4).yRaw],[12*F,34*F]);assert.equal(M.decodeActor(wrap,4).id,'wrap');
});
test('empty module is inert; forged active state cannot bypass guarded hooks',()=>{
 const s=M.create(M.compile([{typeName:'Gear'}],4));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);for(const fn of [M.solids,M.displays])assert.deepEqual(fn(s),[]);for(const fn of [M.afterStep])assert.deepEqual(fn(s),{events:[],solids:[],deadPlayerIds:[]});assert.deepEqual(M.beforeStep(s),{events:[],solids:[],deadPlayerIds:[],positionPlans:[],actorEvents:[]});const fake={gears:[first()]};for(const fn of [M.solids,M.displays,M.beforeStep,M.afterStep])assert.throws(()=>fn(fake,{nativeActorBridge:true}),/missing compiled QLinePath/);
});
test('diagnostic JSON roundtrip has exact subsequent timer state and refuses bad raw input',()=>{
 const g=first();M.advanceTraversal(g,1092,2*F);const restored=JSON.parse(JSON.stringify(g));assert.deepEqual(M.advanceTraversal(g,1092,2*F),M.advanceTraversal(restored,1092,2*F));assert.deepEqual(g,restored);assert.throws(()=>M.advanceTraversal(g,1.5,F),/exact safe FP raw/);assert.throws(()=>M.advanceTraversal(g,-1,F),/negative delta/);assert.throws(()=>M.compile([],9),/2\.\.8/);
});
// R2 oracle reads the native LUT directly. It does not call the production math
// helper for its expected sqrt, paths, state transitions or rotation results.
const crypto=require('node:crypto'),vm=require('node:vm');
const resourcePath='D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets';
const lutBytes=Buffer.alloc(262148),lutFd=fs.openSync(resourcePath,'r');fs.readSync(lutFd,lutBytes,0,lutBytes.length,11384408);fs.closeSync(lutFd);
const i64=v=>BigInt.asIntN(64,v),num=v=>Number(v),om=(a,b)=>num(i64(BigInt(a)*BigInt(b))>>16n),oa=(a,b)=>num(i64(BigInt(a)+BigInt(b))),os=(a,b)=>num(i64(BigInt(a)-BigInt(b))),od=(a,b)=>num(i64(BigInt(a)<<16n)/BigInt(b));
function oracleSqrt(input){const q=BigInt(input);if(q<0n)throw Error('native negative sqrt');if(q<=65536n)return lutBytes.readInt32LE(Number(q)*4)>>6;let evenBit=0;for(const step of [32,16,8,4,2])if((q>>BigInt(evenBit))>=(1n<<BigInt(step)))evenBit+=step;const shift=evenBit-14,index=Number(q>>BigInt(shift));return num(i64(BigInt(lutBytes.readInt32LE(index*4))<<BigInt(shift>>1))>>6n);}
const ol=(x,y)=>oracleSqrt(i64((i64(BigInt(x)*BigInt(x))>>16n)+(i64(BigInt(y)*BigInt(y))>>16n)));
function oraclePath(points,chip){let total=0,from={xRaw:0,yRaw:0};const lengths=points.map(p=>{const l=ol(os(p.xRaw,from.xRaw),os(p.yRaw,from.yRaw));total=oa(total,l);from=p;return l;});const reciprocal=Math.trunc(F/chip);return {points,lengths,total,ws:ol(om(total,reciprocal),0)};}
function oraclePosition(path,progress){const target=om(Math.min(F,Math.max(0,progress)),path.total);let sum=0,from={xRaw:0,yRaw:0};for(let i=0;i<path.points.length;i++){const to=path.points[i],length=path.lengths[i],end=oa(sum,length);if(end>=target){const t=Math.min(F,Math.max(0,od(os(target,sum),length)));return {xRaw:oa(from.xRaw,om(os(to.xRaw,from.xRaw),t)),yRaw:oa(from.yRaw,om(os(to.yRaw,from.yRaw),t))};}if(i===path.points.length-1)return {...to};sum=end;from=to;}return {xRaw:0,yRaw:0};}
function oracleRotation(angle,previous,position){const distance=ol(os(position.xRaw,previous.xRaw),os(position.yRaw,previous.yRaw));if(Math.abs(distance)<4)return angle;const direction=previous.xRaw<position.xRaw?-F:F;const ratio=od(distance,om(45*F,411774));return oa(angle,om(om(om(ratio,direction),411774),3754936));}
function coreStage(id,count){const st=stages.find(x=>x.stageId===id),v=pop.selectVariant(st.json.stageInitParamList,count,true);return M.create(M.compile(pop.actorsForCount(v,count),count,{chipSize:v.mapInitParam.chipSize}));}
test('all65537 production sqrt entries agree with native resource and signed64 bit-scan oracle',()=>{assert.equal(crypto.createHash('sha256').update(lutBytes).digest('hex'),M.Path.mathMetadata.tableHash);for(let q=0;q<=65536;q++)assert.equal(M.Path.sqrtRaw(q),oracleSqrt(q));for(const q of [65537n,1n<<32n,(1n<<48n)-1n,9007199254740991n,9223372036854775807n])assert.equal(M.Path.sqrtRaw(q),oracleSqrt(q));assert.throws(()=>M.Path.sqrtRaw(-1),/native nonnegative int64/);assert.throws(()=>M.Path.sqrtRaw(1n<<63n),/native nonnegative int64/);});
const goldenWorld=[{lengths:[52428800,22937600],total:75366400,ws:1569746},{lengths:[72351744,19660800],total:92012544,ws:1916455},{lengths:[66060288,13369344],total:79429632,ws:1654378}];
const goldenLight=[{lengths:[95944704,34603008],total:130547712,ws:2719053},{lengths:[95944704,34603008],total:130547712,ws:2719053},{lengths:[95944704,31457280],total:127401984,ws:2653551},{lengths:[95944704,31457280],total:127401984,ws:2653551},{lengths:[95944704,31457280],total:127401984,ws:2653551},{lengths:[95944704,28311552],total:124256256,ws:2587998},{lengths:[95944704,28311552],total:124256256,ws:2587998}];
for(const id of ['st_w_15_01','st_l_04_02'])for(let count=2;count<=8;count++)test(id+' '+count+'p full real path, two traversals and OnPost versus native instruction oracle',()=>{
 const s=coreStage(id,count);for(let index=0;index<s.gears.length;index++){
  const g=s.gears[index],path=oraclePath(g.paths,48),gold=id==='st_w_15_01'?goldenWorld[index]:goldenLight[count-2];
  assert.deepEqual({lengths:g.path.segmentLengthsRaw,total:g.path.totalLengthRaw,ws:g.path.totalLengthWSRaw},gold);assert.deepEqual(path.lengths,gold.lengths);assert.equal(path.total,gold.total);assert.equal(path.ws,gold.ws);assert.equal(g.path.viewScaleXRaw,1365);assert.equal(g.path.viewScaleYRaw,-1365);assert.equal(g.path.pathLoop,false);
  if(g.standby)M.receiveEvent(g,61);const initial={xRaw:g.xRaw,yRaw:g.yRaw};const step=om(1092,g.speedRaw),endpointTick=Math.ceil(path.ws/step);
  let timer=0,returnDir=0,angle=0,previous={xRaw:0,yRaw:0},endings=0;
  for(let tick=1;tick<=endpointTick*2;tick++){
   timer=oa(timer,step);const fraction=Math.max(0,Math.min(F,od(timer,path.ws))),progress=returnDir?F-fraction:fraction;
   const offset=oraclePosition(path,progress),position={xRaw:oa(initial.xRaw,offset.xRaw),yRaw:oa(initial.yRaw,offset.yRaw)};
   const result=M.updatePosition(g,1092,initial);assert.deepEqual(result,{progressRaw:progress,reachedEnd:fraction===F,offsetRaw:offset,positionRaw:position},'position tick '+tick);
   angle=oracleRotation(angle,previous,position);assert.equal(M.Path.rotatePost(g,position),angle,'rotation tick '+tick);previous=position;
   if(fraction===F){endings++;timer=0;returnDir=1-returnDir;assert.equal(tick,endpointTick*endings);}
   assert.equal(g.timerRaw,timer);assert.equal(g.returnDirection,returnDir);assert.equal(g.standby,false);assert.deepEqual([g.preXRaw,g.preYRaw],[position.xRaw,position.yRaw]);
  }
  assert.equal(endings,2);assert.equal(g.timerRaw,0);assert.equal(g.returnDirection,0);assert.deepEqual([g.preXRaw,g.preYRaw],[g.xRaw,g.yRaw]);
 }
});
test('native totalLengthWS transforms summed pixel length once, not exact chip division or per-segment conversion',()=>{const p=M.Path.compilePath([{xRaw:3*F,yRaw:4*F},{xRaw:6*F,yRaw:0}],48),o=oraclePath(p.paths,48);assert.equal(p.totalLengthRaw,o.total);assert.equal(p.totalLengthWSRaw,o.ws);assert.notEqual(p.totalLengthWSRaw,Math.trunc(p.totalLengthRaw/48));for(const r of [-F,0,F/2,F,2*F])assert.deepEqual(M.Path.pathPosition(p,r),oraclePosition(o,r));});
test('exact segment boundary and duplicate point follow native >= branch; native zero-length divide refuses',()=>{const p=M.Path.compilePath([{xRaw:F,yRaw:0},{xRaw:F,yRaw:0},{xRaw:2*F,yRaw:0}],48);assert.deepEqual(M.Path.pathPosition(p,F/2),{xRaw:F,yRaw:0});assert.deepEqual(M.Path.pathPosition(p,F),{xRaw:2*F,yRaw:0});const zero=M.Path.compilePath([{xRaw:0,yRaw:0}],48);assert.throws(()=>M.Path.pathPosition(zero,0),/native FP divide by zero/);assert.deepEqual(M.Path.pathPosition(M.Path.compilePath([],48),F),{xRaw:0,yRaw:0});});
test('SetPosForce assigns Actor and resolved collision pos/prePos, clears only collision bit6',()=>{const actor={actorId:'gear',vxRaw:99,vyRaw:123,collisionSlots:[{valid:true,collision:{id:10,flags:0xffff}},{valid:false},{valid:true,collision:null},{valid:true,collision:{id:11,flags:5}}]},before=JSON.stringify(actor),p=M.Path.forcePositionPlan(actor,{xRaw:12345,yRaw:-54321});assert.deepEqual(p,{actorId:'gear',actorPatch:{xRaw:12345,yRaw:-54321,preXRaw:12345,preYRaw:-54321},collisionPatches:[{collisionId:10,xRaw:12345,yRaw:-54321,preXRaw:12345,preYRaw:-54321,flags:65471},{collisionId:11,xRaw:12345,yRaw:-54321,preXRaw:12345,preYRaw:-54321,flags:5}]});assert.equal(JSON.stringify(actor),before);assert.equal('vxRaw' in p.actorPatch,false);assert.throws(()=>M.Path.forcePositionPlan({actorId:'g'},{xRaw:0,yRaw:0}),/resolved collisionSlots/);});
test('beforeStep needs real raw snapshots and is atomic on missing snapshot; no true bridge override',()=>{const s=coreStage('st_w_15_01',2),g=s.gears[0],before=JSON.stringify(s);assert.throws(()=>M.beforeStep(s,{nativeActorBridge:true,dtRaw:1092}),/native actorSnapshots/);assert.equal(JSON.stringify(s),before);const snapshot={actorId:g.id,initXRaw:g.xRaw,initYRaw:g.yRaw,collisionSlots:[{valid:true,collision:{id:1,flags:64}}]};const out=M.beforeStep(s,{dtRaw:1092,actorSnapshots:[snapshot]});assert.equal(out.positionPlans.length,1);const expected=M.updatePosition(coreStage('st_w_15_01',2).gears[0],1092,{xRaw:g.xRaw,yRaw:g.yRaw});assert.deepEqual(out.positionPlans[0].actorPatch,{xRaw:expected.positionRaw.xRaw,yRaw:expected.positionRaw.yRaw,preXRaw:expected.positionRaw.xRaw,preYRaw:expected.positionRaw.yRaw});assert.equal(out.positionPlans[0].collisionPatches[0].flags,0);const frozen=JSON.stringify(s);assert.throws(()=>M.beforeStep(s,{dtRaw:1092,actorSnapshots:[snapshot],events:[{targetName:s.gears[1].name,eventType:61}]}),/missing native Actor snapshot/);assert.equal(JSON.stringify(s),frozen);});
test('OnPost rotates standby gears using actual post-Actor position and serialized state',()=>{const s=coreStage('st_w_15_01',4),snap=s.gears.map(g=>({actorId:g.id,xRaw:g.xRaw,yRaw:g.yRaw})),restored=JSON.parse(JSON.stringify(s));const angles=s.gears.map((g,i)=>oracleRotation(0,{xRaw:0,yRaw:0},snap[i]));M.afterStep(s,{actorSnapshots:snap});M.afterStep(restored,{actorSnapshots:snap});assert.deepEqual(s,restored);assert.deepEqual(s.gears.map(g=>g.angleRaw),angles);assert.equal(s.gears[1].standby,true);assert.notEqual(s.gears[1].angleRaw,0);const next=snap.map(a=>({...a,yRaw:a.yRaw+F}));const predicted=s.gears.map((g,i)=>oracleRotation(g.angleRaw,snap[i],next[i]));M.afterStep(s,{actorSnapshots:next});assert.deepEqual(s.gears.map(g=>g.angleRaw),predicted);assert.deepEqual(s.gears.map(g=>[g.preXRaw,g.preYRaw]),next.map(g=>[g.xRaw,g.yRaw]));});
test('events retain pause progress, delegate60 and outgoing43 uses layer and CauseDead0',()=>{const s=coreStage('st_w_15_01',2),g=s.gears[0],a={actorId:g.id,initXRaw:g.xRaw,initYRaw:g.yRaw,collisionSlots:[]};M.beforeStep(s,{dtRaw:1092,actorSnapshots:[a]});const timer=s.gears[0].timerRaw;const out=M.beforeStep(s,{dtRaw:1092,actorSnapshots:[],events:[{targetName:g.name,eventType:61},{targetName:g.name,eventType:60}]});assert.equal(out.positionPlans.length,0);assert.equal(s.gears[0].timerRaw,timer);assert.equal(out.actorEvents[0].eventType,60);assert.deepEqual(M.contacted(g,{contactType:1,otherActorExists:true,otherLayer:1,otherId:'player'}),[{senderId:g.id,targetId:'player',eventType:43,causeDead:0}]);});
test('browser loads complete math and path core without require, game files, or network',()=>{const context=vm.createContext({});for(const file of ['source-distanceconstraint-math.js','source-linepathgear-path.js','source-linepathgear-devices.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context);const s=context.SourceLinePathGearDevices.compile(actors('st_l_04_02',8),8,{chipSize:48});assert.equal(s.gears[0].path.totalLengthWSRaw,2587998);assert.equal(context.SourceLinePathGearPath.sqrtRaw(123),2839);assert.equal(context.SourceLinePathGearPath.mathMetadata.entryCount,65537);});
