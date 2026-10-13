'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('./source-gear-devices.js'),pop=require('./population-rules.cjs'),data=require('./installed-stage-decoded.local.json');
const stage=data.stages.find(s=>s.stageId==='st_w_04_02');
function actors(n=2){return pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,n,true),n);}
function state(){return api.create(api.compile(actors(),2,{nativeActorBridge:true}));}
for(let n=2;n<=8;n++)test('real stage 4-2 '+n+'p exact Gear parameters and default refusal',()=>{
 assert.throws(()=>api.compile(actors(n),n),/nativeActorBridge/);
 const s=api.compile(actors(n),n,{nativeActorBridge:true});
 assert.deepEqual(s.gears.map(g=>[g.name,g.stageX,g.stageY,g.speedRaw,g.dirXRaw,g.dirYRaw,g.standby,g.preXRaw,g.preYRaw]),[
 ['Gear1',684,264,524288,65536,0,true,0,0],['Gear2',1984,264,524288,-65536,0,true,0,0]]);
 assert.deepEqual(api.create(s),s);assert.deepEqual(api.solids(s),[]);
});
test('native resource constants and circle descriptors are exact',()=>{
 const s=state();assert.deepEqual(api.nativeConstants,{speedRaw:65536,heightRaw:6291456,radiusRaw:2949120,circleXRaw:-131072,circleYRaw:-3145728,rotSpeedRaw:-32768,twoPiRaw:411774,radToDegRaw:3754936});
 assert.deepEqual(api.collisionDescriptors(s)[0],{actorId:'Gear1',shape:'circle',radiusRaw:2949120,xRaw:-131072,yRaw:-3145728,layer:8,pushBackTarget:3,collisionIndex:0,isEnableSyncPos:true,actorFlagBit:19});
});
test('parameter FP absolute epsilon, signed floor and wrong tag',()=>{
 const a=structuredClone(actors().find(a=>a.typeName==='Gear'));a.datas[0].f=-0.2;a.datas[1].f=-0.1;a.datas[2].f=-0.2;
 let d=api.decodeActor(a);assert.deepEqual([d.dirXRaw,d.speedRaw,d.standby],[65536,6553,true]);
 a.datas[1].f=3/65536;assert.equal(api.decodeActor(a).speedRaw,65536);
 a.datas[1].f=4/65536;assert.equal(api.decodeActor(a).speedRaw,4);
 a.datas[0].t=2;a.datas[1].t=2;a.datas[2].t=2;d=api.decodeActor(a);assert.deepEqual([d.dirXRaw,d.speedRaw,d.standby],[65536,65536,false]);
});
test('event61 toggles matching Gear only and survives JSON',()=>{
 let s=state();assert.equal(api.signal(s,{targetName:'Gear1',eventType:61}),true);assert.deepEqual(s.gears.map(g=>g.standby),[false,true]);
 s=JSON.parse(JSON.stringify(s));api.signal(s,{targetId:'Gear1',eventType:61});assert.deepEqual(s.gears.map(g=>g.standby),[true,true]);assert.equal(api.signal(s,{targetName:'Gear1',eventType:60}),false);
});
test('standby braking is one raw unit per tick, clamps signs, no dt',()=>{
 const g=state().gears[0],a={vxRaw:8*65536,vyRaw:-3*65536};
 for(let i=0;i<7;i++)api.update(g,a);assert.deepEqual(a,{vxRaw:65536,vyRaw:0});api.update(g,a);assert.deepEqual(a,{vxRaw:0,vyRaw:0});
 const b={vxRaw:3,vyRaw:-3};api.update(g,b);assert.deepEqual(b,{vxRaw:3,vyRaw:-3});
});
test('ground movement sets authored velocity, upward jump preserves actor velocity',()=>{
 const g=state().gears[1];g.standby=false;
 assert.deepEqual(api.update(g,{vxRaw:123,vyRaw:100,collisionExists:true,face1Contact:true}),{actorId:'Gear2',vxRaw:-524288,vyRaw:0});
 assert.deepEqual(api.update(g,{vxRaw:123,vyRaw:-100,collisionExists:true,face1Contact:true}),{actorId:'Gear2',vxRaw:123,vyRaw:-100});
});
test('falling retains native actor velocity and sets direction at epsilon',()=>{
 const g=state().gears[0];g.standby=false;const a={vxRaw:-4,vyRaw:-900,collisionExists:true,face1Contact:false};api.update(g,a);assert.equal(g.dirXRaw,-65536);assert.equal(a.vyRaw,-900);
 api.update(g,{vxRaw:3,vyRaw:500,collisionExists:true,face1Contact:false});assert.equal(g.dirXRaw,-65536);
 assert.throws(()=>api.update(g,{vxRaw:0,vyRaw:0}),/collisionExists/);
});
test('map contact epsilon flips both direction components and emits sound3',()=>{
 const g=state().gears[0];g.dirYRaw=65536;assert.deepEqual(api.contact(g,{contactType:0,normalXRaw:3},{}).sounds,[]);
 const r=api.contact(g,{contactType:0,normalXRaw:-4},{});assert.deepEqual([g.dirXRaw,g.dirYRaw],[-65536,-65536]);assert.deepEqual(r.sounds,[{actorId:'Gear1',seId:3}]);
});
test('actor side collision respects relative velocity exact branch',()=>{
 assert.equal(api.checkCollision(3,0),false);assert.equal(api.checkCollision(65536,-65536),true);assert.equal(api.checkCollision(65536,0),true);
 assert.equal(api.checkCollision(65536,65536),false);assert.equal(api.checkCollision(65536,131072),false);assert.equal(api.checkCollision(131072,65536),true);
 const g=state().gears[0];const r=api.contact(g,{contactType:1,normalXRaw:4,normalYRaw:0,otherVxRaw:0,otherLayer:1,otherId:'p2'},{vxRaw:65536});
 assert.equal(g.dirXRaw,-65536);assert.deepEqual(r.events,[{senderId:'Gear1',targetId:'p2',eventType:43,causeDead:0}]);
});
test('Gear underside reflectJump uses normal sign and raw -3Y; zeroX selects -3X',()=>{
 for(const x of [-1,0,1]){const r=api.contact(state().gears[0],{contactType:1,normalXRaw:x,normalYRaw:1,otherLayer:8},{vxRaw:0});assert.deepEqual(r.jumps,[{actorId:'Gear1',xRaw:x<0?196608:-196608,yRaw:-196608}]);assert.deepEqual(r.events,[]);}
});
test('verified sqrt entries exactly match installed read-only resource',()=>{
 const b=fs.readFileSync('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets');
 assert.deepEqual([0,16384,65536].map(i=>b.readInt32LE(11384408+i*4)),[0,2097152,4194304]);
 assert.equal(api.nativeSqrtRaw(0),0);assert.equal(api.nativeSqrtRaw(65536),65536);assert.equal(api.nativeSqrtRaw(4194304),524288);
 assert.equal(api.nativeSqrtRaw(123),2839);
});
test('rotation exactly follows FP intermediate truncations, direction and zero pre-position',()=>{
 const g=state().gears[0];assert.equal(api.rotate(g,{xRaw:65536,yRaw:0}),-83194);assert.deepEqual([g.preXRaw,g.preYRaw],[65536,0]);
 assert.equal(api.rotate(g,{xRaw:0,yRaw:0}),-58);assert.equal(api.rotate(g,{xRaw:0,yRaw:65536}),83078);
});
test('host contract fails loudly and phased velocity/event/rotation payloads are serializable',()=>{
 const s=state();assert.throws(()=>api.beforeStep(s),/actorSnapshots/);
 const snapshots=s.gears.map(g=>({actorId:g.id,vxRaw:0,vyRaw:0,xRaw:0,yRaw:0,collisionExists:true,face1Contact:true}));
 const before=api.beforeStep(s,{events:[{targetName:'Gear1',eventType:61}],actorSnapshots:snapshots});
 assert.deepEqual(before.actorVelocities,[{actorId:'Gear1',vxRaw:524288,vyRaw:0},{actorId:'Gear2',vxRaw:0,vyRaw:0}]);
 snapshots[0].xRaw=8*65536;const after=api.afterStep(s,{actorSnapshots:snapshots,contacts:[]});assert.equal(s.gears[0].angleRaw,-667496);assert.deepEqual(after.events,[]);
 assert.deepEqual(JSON.parse(JSON.stringify(s)),s);assert.equal(api.displays(s)[0].standby,false);
});
test('empty actor list needs no bridge and no snapshots',()=>{const s=api.compile([],2);assert.deepEqual(api.beforeStep(s).actorVelocities,[]);assert.deepEqual(api.afterStep(s).events,[]);});

test('complete FPSqrt table matches all 65537 installed int32 entries and SHA256',()=>{
 const asset=fs.readFileSync('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets');
 assert.equal(asset.readUInt32LE(11384404),262148);const actual=Buffer.alloc(262148);
 for(let i=0;i<65537;i++){assert.equal(api.sqrtTableEntry(i),asset.readInt32LE(11384408+i*4),'table '+i);actual.writeInt32LE(api.sqrtTableEntry(i),i*4);}
 assert.equal(require('node:crypto').createHash('sha256').update(actual).digest('hex'),'de5265f651730f20b54cc24bdcd3047e61320be44a5ae54796d290a189f4bca5');
 assert.deepEqual(api.sqrtMetadata,{entryCount:65537,byteLength:262148,resourceBodyOffset:11384408,sha256:'de5265f651730f20b54cc24bdcd3047e61320be44a5ae54796d290a189f4bca5'});
});
test('native sqrt entire small domain and bit-scan normalization across signed int64 range',()=>{
 const asset=fs.readFileSync('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets');
 for(let q=0;q<=65536;q++)assert.equal(api.nativeSqrtRaw(q),asset.readInt32LE(11384408+q*4)>>6,'small '+q);
 function assembly(q){if(q<=65536n)return asset.readInt32LE(11384408+Number(q)*4)>>6;let work=q,bits=0;
  for(const bit of [32,16,8,4,2]){const reduced=work>>BigInt(bit);if(reduced!==0n){work=reduced;bits+=bit;}}
  const shift=bits-14,index=Number(q>>BigInt(shift));return Number((BigInt(asset.readInt32LE(11384408+index*4))<<BigInt(shift>>1))>>6n);}
 for(let bit=17;bit<=62;bit++)for(const q of [(1n<<BigInt(bit))-1n,1n<<BigInt(bit),(1n<<BigInt(bit))+1n])assert.equal(api.nativeSqrtRaw(q),assembly(q),String(q));
 assert.equal(api.nativeSqrtRaw(0x7fffffffffffffffn),777460383744);assert.equal(api.nativeSqrtRaw(9007199254740991),24295636992);
 assert.throws(()=>api.nativeSqrtRaw(-1),/nonnegative int64/);assert.throws(()=>api.nativeSqrtRaw(0x8000000000000000n),/nonnegative int64/);assert.throws(()=>api.nativeSqrtRaw(0.1),/exact FP raw/);
});
test('browser UMD reconstructs full lookup with atob and no Buffer/Node dependencies',()=>{
 const vm=require('node:vm'),ctx={atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(require.resolve('./source-gear-devices.js'),'utf8'),ctx);
 assert.equal(ctx.SourceGearDevices.nativeSqrtRaw(123),2839);assert.equal(ctx.SourceGearDevices.sqrtTableEntry(65536),4194304);
});
test('real native Actor initial positions are direct authored pixel FP, no tile reciprocal',()=>{
 const s=state();assert.deepEqual(s.gears.map(api.initialPositionRaw),[{xRaw:44826624,yRaw:17301504},{xRaw:130023424,yRaw:17301504}]);
 assert.equal(api.stageGravityRaw(65536),42598);assert.equal(api.stageGravityRaw(32768),21299);
});
test('native cached face1 detects exact down normal for actors or map, not diagonal overlap',()=>{
 assert.equal(api.face1ContactFromCache({collisionExists:false}),false);
 for(const key of ['actorNormals','mapNormals']){const c={collisionExists:true,actorNormals:[],mapNormals:[]};c[key]=[{xRaw:0,yRaw:65536}];assert.equal(api.face1ContactFromCache(c),true);}
 assert.equal(api.face1ContactFromCache({collisionExists:true,actorNormals:[{xRaw:1,yRaw:65536}],mapNormals:[{xRaw:0,yRaw:65535}]}),false);
 assert.throws(()=>api.face1ContactFromCache({collisionExists:true}),/cached/);
});
test('native Actor integrates velocity plus signed half acceleration then increments velocity',()=>{
 const a={xRaw:65536,yRaw:131072,vxRaw:10,vyRaw:-20,accelXRaw:3,accelYRaw:-3};const r=api.integrateActorMotion(a);
 assert.deepEqual(r,{...a,xRaw:65547,yRaw:131050,vxRaw:13,vyRaw:-23,preXRaw:65536,preYRaw:131072,preVxRaw:10,preVyRaw:-20});assert.equal(a.xRaw,65536);
});
test('Gear jump request remains pending until Actor.Post1 and uses Stage gravity each tick',()=>{
 const a={vxRaw:524288,vyRaw:0,enableJump:true,pendingJumpXRaw:0,pendingJumpYRaw:0};const request=api.requestGearJump(a,{xRaw:-196608,yRaw:-196608});
 assert.equal(request.vxRaw,524288);assert.equal(request.pendingJumpXRaw,-196608);
 const ctx={warpTaken:false,collisionExists:true,face1Contact:false,gravityRaw:42598};const first=api.actorJumpPost(request,ctx);
 assert.deepEqual(first,{vxRaw:-196608,vyRaw:-154010,enableJump:true,pendingJumpXRaw:0,pendingJumpYRaw:0});
 assert.equal(api.actorJumpPost(first,ctx).vyRaw,-111412);
 assert.equal(api.actorJumpPost({...first,vyRaw:1},{warpTaken:false,collisionExists:false,face1Contact:false}).vyRaw,0);
 assert.deepEqual(api.actorJumpPost(request,{warpTaken:true}),request);assert.throws(()=>api.actorJumpPost(request,{}),/warpTaken/);
});
test('full Gear grounded/airborne Actor phases use exact real positions and velocities',()=>{
 const g=state().gears[0];g.standby=false;let a={...api.initialPositionRaw(g),vxRaw:0,vyRaw:0,accelXRaw:0,accelYRaw:0,enableJump:true,pendingJumpXRaw:0,pendingJumpYRaw:0,collisionExists:true,face1Contact:true};
 Object.assign(a,api.update(g,a));a=api.integrateActorMotion(a);assert.deepEqual([a.xRaw,a.yRaw,a.vxRaw,a.vyRaw],[45350912,17301504,524288,0]);
 a=api.actorJumpPost(a,{warpTaken:false,collisionExists:true,face1Contact:false,gravityRaw:42598});assert.equal(a.vyRaw,42598);
 a.face1Contact=false;Object.assign(a,api.update(g,a));a=api.integrateActorMotion(a);assert.deepEqual([a.xRaw,a.yRaw],[45875200,17344102]);
});
test('global circle keeps local center offsets unscaled and scales radius by signed maximum',()=>{
 assert.deepEqual(api.globalCircle({xRaw:44826624,yRaw:17301504,scaleXRaw:131072,scaleYRaw:65536}),{radiusRaw:5898240,xRaw:44695552,yRaw:14155776});
 const a={radiusRaw:2949120,xRaw:0,yRaw:0};assert.equal(api.circlesOverlap(a,{...a,xRaw:5898240}),false);assert.equal(api.circlesOverlap(a,{...a,xRaw:5898239}),true);
 assert.equal(api.circlesOverlap(a,{...a,xRaw:0,yRaw:0}),true);assert.equal(api.circlesOverlap(a,{...a,xRaw:6553600,yRaw:6553600}),false);
});
test('contact uses layer not attribute, ignores missing actors and returns explicit CauseDead0',()=>{
 const g=state().gears[0];assert.throws(()=>api.contact(g,{contactType:1,normalXRaw:0,normalYRaw:1,otherAttribute:1},{}),/otherLayer/);
 assert.deepEqual(api.contact(g,{contactType:1,normalXRaw:4,normalYRaw:0,otherActorExists:false},{}),{events:[],sounds:[],jumps:[]});
 const r=api.contact(g,{contactType:1,normalXRaw:0,normalYRaw:1,otherLayer:1,otherId:'p1'},{vxRaw:0});assert.deepEqual(r.events,[{senderId:'Gear1',targetId:'p1',eventType:43,causeDead:0}]);
});
test('Gear event43 cause0 kills living nonimmortal player without SharedHP even if invincible',()=>{
 assert.deepEqual(api.resolveGearPlayerEvent43({life:1,immortal:false,invincibleTimerRaw:49152},{exists:false}),{ignored:false,playerPatch:{life:0,requestedPlayerState:3},sharedPatch:null,events:[],effects:[{kind:'forcePlaySe',seId:11},{kind:'requestShake'}]});
 assert.equal(api.resolveGearPlayerEvent43({life:1,immortal:true},{exists:false}).ignored,true);assert.equal(api.resolveGearPlayerEvent43({life:0,immortal:false},{exists:false}).ignored,true);
 assert.throws(()=>api.resolveGearPlayerEvent43({life:1,immortal:false}),/existence/);
});
test('Gear SharedHP survivor sets exact native invincible/flash timers and deduplicates victim',()=>{
 const shared={exists:true,enabled:true,hitPoint:3,affectedActorIds:['p1'],actorId:'hp'};
 const r=api.resolveGearPlayerEvent43({life:1,immortal:false,actorId:'p1'},shared);
 assert.deepEqual(r.playerPatch,{invincibleTimerRaw:49152,flashTimerRaw:49152,isFlashing:true});assert.deepEqual(r.sharedPatch,{hitPoint:2,affectedActorIds:['p1']});
 assert.deepEqual(r.effects,[{kind:'actorPlaySe',seId:11,startRaw:32768,endRaw:163840},{kind:'cameraShake',amountRaw:1965}]);
 assert.deepEqual(api.resolveGearPlayerEvent43({life:1,immortal:false,actorId:'p2'},shared).sharedPatch.affectedActorIds,['p1','p2']);assert.equal(shared.hitPoint,3);
});
test('Gear exhausted SharedHP broadcasts event43 to previous victims in order then kills receiver',()=>{
 const r=api.resolveGearPlayerEvent43({life:1,immortal:false,actorId:'p3'},{exists:true,enabled:true,hitPoint:1,affectedActorIds:['p2','p1'],actorId:'hp'});
 assert.deepEqual(r.sharedPatch,{hitPoint:0,affectedActorIds:['p2','p1']});assert.deepEqual(r.playerPatch,{life:0,requestedPlayerState:3});assert.deepEqual(r.events,[{senderId:'hp',targetId:'p2',eventType:43,causeDead:0},{senderId:'hp',targetId:'p1',eventType:43,causeDead:0}]);
 const zero=api.resolveGearPlayerEvent43({life:1,immortal:false,actorId:'p3'},{exists:true,enabled:true,hitPoint:0,affectedActorIds:['p1'],actorId:'hp'});assert.deepEqual(zero.events,[]);assert.equal(zero.playerPatch.life,0);
});
test('real first Gear.OnPost rotates from native zero pre-position using previously unknown table indexes',()=>{
 const s=state();assert.deepEqual(s.gears.map(g=>api.rotate(g,api.initialPositionRaw(g))),[-61178654,-167010141]);
 assert.deepEqual(s.gears.map(g=>[g.preXRaw,g.preYRaw]),[[44826624,17301504],[130023424,17301504]]);
 assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
});
test('disabled SharedHP takes lethal branch; airborne helpers reject invented gravity/acceleration',()=>{
 const r=api.resolveGearPlayerEvent43({life:2,immortal:false},{exists:true,enabled:false});assert.equal(r.playerPatch.life,0);assert.equal(r.sharedPatch,null);
 assert.throws(()=>api.integrateActorMotion({xRaw:0,yRaw:0,vxRaw:0,vyRaw:0}),/accelXRaw/);
 assert.throws(()=>api.actorJumpPost({enableJump:true,vxRaw:0,vyRaw:0,pendingJumpXRaw:0,pendingJumpYRaw:0},{warpTaken:false,collisionExists:true,face1Contact:false}),/gravity/);
});
