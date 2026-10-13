const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('./source-camera-native.js'),pop=require('./population-rules.cjs'),data=require('./installed-stage-decoded.local.json');
const F=65536;
function stage(extra={}){return {scrollType:1,unlimitScroll:0,unreturnScroll:0,zoomOut:0,cameraStartType:0,mapInitParam:{width:62,height:10,chipSize:48,displayTileHeight:0,startTileX:0,startTileY:0},...extra};}
const center=(x,y)=>({left:x*F,right:x*F,top:y*F,bottom:y*F});
for(const id of ['st_w_03_02','st_w_10_04'])for(let n=2;n<=8;n++)test(`${id} ${n} players retain native camera width and map limits`,()=>{
 const selected=pop.selectVariant(data.stages.find(s=>s.stageId===id).json.stageInitParamList,n,true),s=C.create(C.compile(selected),center(125,432));
 assert.deepEqual(s.viewScaleRaw,{xRaw:1365,yRaw:-1365});
 assert.deepEqual(C.stageAreaRaw(s),{height:31457280,width:55924032,x:0,y:0});
 assert.deepEqual(s.positionRaw,{xRaw:582542,yRaw:-327680});
 assert.equal(s.moveAreaRaw.xMax,(id==='st_w_03_02'?62:68)*F-582542);
 // One 16:9 division produces a different stage-space bound.
 assert.notEqual(C.stageAreaRaw(s).width,Math.trunc(480*16*F/9));
});
test('native reciprocal loses precision and signed multiplication floors negative Y',()=>{
 const s=C.create(C.compile(stage()),null);
 assert.deepEqual(C.stageToWorld(s,{xRaw:100*F,yRaw:100*F}),{xRaw:136500,yRaw:-136500});
 assert.deepEqual(C.worldToStage(s,C.stageToWorld(s,{xRaw:100*F,yRaw:100*F})),{xRaw:6552000,yRaw:6552000});
 assert.deepEqual(C.stageToWorld(s,{xRaw:1,yRaw:1}),{xRaw:0,yRaw:-1});
});
test('normal follow subtracts24 from range top and applies separate4dt/3dt factors',()=>{
 const s=C.create(C.compile(stage({mapInitParam:{width:62,height:30,chipSize:48,displayTileHeight:10,startTileX:0,startTileY:0}})),null);
 assert.deepEqual(s.positionRaw,{xRaw:582542,yRaw:-1638400});
 const out=C.update(s,center(960,480),1092);
 assert.deepEqual(s.positionRaw,{xRaw:631054,yRaw:-1588434});
 assert.deepEqual(out,{cameraAreaRaw:{height:31457280,width:55924032,x:2328576,y:60516192},scrollPositionRaw:{xRaw:2328576,yRaw:60516192}});
 const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(C.update(restored,center(960,480),1092),C.update(s,center(960,480),1092));
});
test('initial player center and map center retain authored startY, subsequent request does not reset',()=>{
 const cfg=stage({mapInitParam:{width:62,height:30,chipSize:48,displayTileHeight:10,startTileX:2,startTileY:15}});
 const p=C.create(C.compile(cfg),center(960,1));assert.deepEqual(p.positionRaw,{xRaw:1310400,yRaw:-720896});
 const m=C.create(C.compile({...cfg,cameraStartType:1}),null);assert.deepEqual(m.positionRaw,{xRaw:2031616,yRaw:-720896});
 p.positionRaw={xRaw:1400000,yRaw:-800000};C.requestNormal(p);assert.deepEqual(p.positionRaw,{xRaw:1400000,yRaw:-800000});
});
test('small map collapses movement limits; odd view width preserves corner asymmetry',()=>{
 const s=C.create(C.compile(stage({mapInitParam:{width:5,height:5,chipSize:48,displayTileHeight:7,startTileX:0,startTileY:0}})),null);
 assert.equal(s.viewTileWidthRaw,815559);assert.deepEqual(s.moveAreaRaw,{xMin:163840,xMax:163840,yMin:-163840,yMax:-163840});
 assert.deepEqual(C.stageAreaRaw(s),{height:22020096,width:39146832,x:-11709072,y:-3145728});
 C.update(s,center(10000,-10000),F);assert.deepEqual(s.positionRaw,{xRaw:163840,yRaw:-163840});
});
test('delta-time clamping and stage-space target offset occur before view transform',()=>{
 const s=C.create(C.compile(stage()),null);s.targetOffsetRaw={xRaw:48*F,yRaw:0};
 C.update(s,center(960,480),-1092);assert.deepEqual(s.positionRaw,{xRaw:582542,yRaw:-327680});
 C.update(s,center(960,480),F);assert.deepEqual(s.positionRaw,{xRaw:1375920,yRaw:-327680});
});
test('unimplemented camera branches and missing native range remain explicit errors',()=>{
 for(const k of ['unreturnScroll','unlimitScroll'])assert.throws(()=>C.compile(stage({[k]:1})),new RegExp(k));
 assert.throws(()=>C.compile(stage({scrollType:2})),/normal/);
 assert.throws(()=>C.create(C.compile(stage())),/playerRange/);
 const s=C.create(C.compile(stage()),null);assert.throws(()=>C.update(s,{left:0,right:1,top:0},1092),/range.bottom/);
});
test('native range includes flagged nonplayer Actors, excludes unflagged players and ignores collision size',()=>{
 const actors=[{flags:0x1000000,positionRaw:{xRaw:100*F,yRaw:432*F},rect:{width:32*F,height:46*F}},{flags:0,positionRaw:{xRaw:9000*F,yRaw:-200*F}},{flags:0x1000000,positionRaw:{xRaw:200*F,yRaw:300*F}},null];
 assert.deepEqual(C.calculatePlayerRange({stageFlags:0,players:[{flags:0}],actors}),{left:100*F,right:200*F,top:300*F,bottom:432*F});
});
test('Player bit9 freezes range unless Stage bit8 overrides, empty native range is not zero',()=>{
 const previousRange={left:1,right:2,top:3,bottom:4},actors=[{flags:0x1000000,positionRaw:{xRaw:10,yRaw:20}}],players=[null,{flags:512}];
 const frozen=C.calculatePlayerRange({stageFlags:0,players,actors,previousRange});assert.deepEqual(frozen,previousRange);assert.notEqual(frozen,previousRange);
 assert.deepEqual(C.calculatePlayerRange({stageFlags:256,players,actors,previousRange}),{left:10,right:10,top:20,bottom:20});
 assert.throws(()=>C.calculatePlayerRange({stageFlags:0,players:[],actors:[]}),/int64 extrema/);
});
const zoomStage=()=>stage({zoomOut:1,mapInitParam:{width:62,height:20,chipSize:48,displayTileHeight:10,startTileX:0,startTileY:0}});
test('zoom uses native1311 gain and0.75dt interpolation with lower and upper bounds',()=>{
 const s=C.create(C.compile(zoomStage()),null);
 C.update(s,{left:0,right:0,top:0,bottom:500*F},1092);assert.equal(s.orthographicSizeRaw,330465);
 s.orthographicSizeRaw=8*F;C.update(s,center(0,0),1092);assert.equal(s.orthographicSizeRaw,521831);
 s.orthographicSizeRaw=5*F;C.update(s,{left:0,right:0,top:0,bottom:100000*F},F);assert.equal(s.orthographicSizeRaw,573440);
});
test('zoom deadband preserves both boundaries; one pixel beyond shrinks or expands',()=>{
 for(const [bottom,expected]of [[480,8*F],[528,8*F],[479,8*F-17],[529,8*F+16]]){
  const s=C.create(C.compile(zoomStage()),null);s.orthographicSizeRaw=8*F;C.update(s,{left:0,right:0,top:0,bottom:bottom*F},1092);assert.equal(s.orthographicSizeRaw,expected);
 }
});
test('target stages2..8 preserve normal/zoom settings and explicitly refuse12-4 auto scroll',()=>{
 for(const id of ['st_w_14_03','st_w_05_01','st_w_07_03','st_w_12_04'])for(let count=2;count<=8;count++){
  const selected=pop.selectVariant(data.stages.find(s=>s.stageId===id).json.stageInitParamList,count,true);
  if(id==='st_w_12_04'){assert.equal(selected.scrollType,2);assert.throws(()=>C.compile(selected),/normal/);continue;}
  const s=C.create(C.compile(selected),null),before=s.orthographicSizeRaw;
  const out=C.update(s,{left:0,right:10000*F,top:0,bottom:10000*F},F);
  assert.equal(s.orthographicSizeRaw,before);assert.equal(out.cameraAreaRaw.height,selected.mapInitParam.height*48*F);
  if(id==='st_w_05_01'){assert.equal(s.flags&4,4);assert.equal(s.orthographicMinRaw,s.orthographicMaxRaw);}
 }
});
