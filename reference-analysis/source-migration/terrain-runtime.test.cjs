'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const population=require('./population-rules.cjs'),runtime=require('./terrain-runtime.js');
// Independent four-neighbor bitmask oracle, derived from native modify branches.
const SHAPE=[0,15,14,14,12,6,5,4,10,3,2,1,11,8,7,9];
function expectedGrid(base,actors){
 const grid=base.map(r=>r.slice()),w=grid[0].length,h=grid.length;
 const get=(x,y)=>x>=0&&y>=0&&x<w&&y<h?grid[y][x]:0;
 const set=(x,y,id)=>{if(x>=0&&y>=0&&x<w&&y<h)grid[y][x]=id;};
 for(const a of actors.filter(a=>a.typeName==='MapRect'||a.typeName==='TopViewMapRect')){
  const [x,y,width,height,mode]=a.datas.slice(0,5).map(p=>Math.floor(p.f));
  if(a.typeName==='TopViewMapRect'){
   for(let i=0;i<width;i++)for(let j=0;j<height;j++)set(x+i,y-j,(mode&255)?1:69);
   continue;
  }
  const table=mode===0?[2,3,4,5,6,7,8,9,10,11,20,21,22,23,24,25]:Array.from({length:16},(_,i)=>52+i);
  const shape=(x,y,recursive)=>{
   const mask=(get(x,y+1)?8:0)|(get(x,y-1)?4:0)|(get(x+1,y)?2:0)|(get(x-1,y)?1:0);
   if(recursive&&mask===12){shape(x,y-1,false);shape(x,y+1,false);}
   if(recursive&&mask===3){shape(x-1,y,false);shape(x+1,y,false);}
   set(x,y,table[SHAPE[mask]]);
  };
  for(let i=0;i<width;i++)for(let j=0;j<height;j++)set(x+i,y-j,table[9]);
  for(let i=0;i<width;i++)for(let j=0;j<height;j++)shape(x+i,y-j,true);
 }
 return grid;
}
test('60 original stages × 2..8 players × offline/online preserve exact selected terrain',()=>{
 let selections=0,overlays=0;
 const original=JSON.stringify(geometry),rawOriginal=JSON.stringify(source);
 for(const stage of geometry.stages)for(const online of [false,true])for(let count=2;count<=8;count++){
  const raw=source.stages.find(s=>s.stageId===stage.stageId),selected=population.selectVariant(raw.json.stageInitParamList,count,online);
  const index=raw.json.stageInitParamList.indexOf(selected),base=stage.variants[index],actors=population.actorsForCount(selected,count);
  const actual=runtime.createTerrain({stageId:stage.stageId,count,online,source,geometry});
  assert.equal(actual.variant.index,index);assert.equal(actual.width,base.width*48);assert.equal(actual.height,base.height*48);
  assert.deepEqual(actual.grid,expectedGrid(base.grid,actors),stage.stageId+' '+count+' '+online);
  assert.equal(actual.actors.length,actors.length);
  for(let i=0;i<actors.length;i++){assert.equal(actual.actors[i].x,actors[i].posX);assert.equal(actual.actors[i].y,actors[i].posY);}
  const coverage=new Map();
  for(const p of actual.platforms){
   assert.equal(p.h,48);assert.equal(p.x%48,0);assert.equal(p.y%48,0);assert.equal(p.w%48,0);assert.ok(p.flags&1);
   for(let x=p.x;x<p.x+p.w;x+=48){const key=x/48+','+p.y/48;assert.ok(!coverage.has(key));coverage.set(key,p.flags);}
  }
  let solidCount=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
   const attr=geometry.tileAttributes.find(t=>t.id===actual.grid[y][x]);
   if(attr.solid){solidCount++;assert.equal(coverage.get(x+','+y),attr.flags);}else assert.ok(!coverage.has(x+','+y));
  }
  assert.equal(actual.cells.length,solidCount);assert.equal(coverage.size,solidCount);
  for(const cell of actual.cells){assert.equal(cell.x,cell.gridX*48);assert.equal(cell.y,cell.gridY*48);}
  overlays+=actual.overlays.length;selections++;
 }
 assert.equal(geometry.stages.length,60);assert.equal(selections,840);assert.ok(overlays>0);
 assert.equal(JSON.stringify(geometry),original);assert.equal(JSON.stringify(source),rawOriginal);
});
test('native world Y is preserved: 1-1 starts above floor row19 and goal is near top',()=>{
 const actual=runtime.createTerrain({stageId:'st_w_01_01',count:2,source,geometry});
 const player=actual.actors.find(a=>a.typeName==='Player'),goal=actual.actors.find(a=>a.typeName==='Goal');
 assert.equal(player.sourceY,912);assert.equal(player.y,912);assert.equal(goal.y,96);
 assert.ok(actual.cells.some(c=>c.gridY===19&&c.y===912));
 assert.deepEqual({sourceY:actual.semantics.sourceY,runtimeY:actual.semantics.runtimeY},{sourceY:'down',runtimeY:'down'});
});
const rect=(x,y,w,h,mode)=>({typeName:'MapRect',datas:[x,y,w,h,mode].map(f=>({t:1,f}))});
test('native MapRect modes, clipping, shape IDs and neighbor modifications',()=>{
 assert.deepEqual(runtime.MAP_RECT_CHIPS[0],[2,3,4,5,6,7,8,9,10,11,20,21,22,23,24,25]);
 assert.deepEqual(runtime.MAP_RECT_CHIPS[1],Array.from({length:16},(_,i)=>52+i));
 for(const mode of [0,1]){
  const single=Array.from({length:3},()=>[0,0,0]);runtime.applyMapRect(single,rect(1,1,1,1,mode));assert.equal(single[1][1],mode?52:2);
  const vertical=[[0,2,0],[0,0,0],[0,2,0]];
  runtime.applyMapRect(vertical,rect(1,1,1,1,mode));assert.equal(vertical[0][1],mode?62:20);assert.equal(vertical[1][1],mode?63:21);assert.equal(vertical[2][1],mode?64:22);
  const blank=Array.from({length:4},()=>[0,0,0,0]),a=rect(-1,4,4,4,mode);
  const oracle=expectedGrid(blank,[a]);runtime.applyMapRect(blank,a);assert.deepEqual(blank,oracle);
 }
});
test('TopViewMapRect writes exact noncollision chips in both native modes',()=>{
 for(const mode of [0,1,2]){
  const grid=[[2,2],[2,2]];
  runtime.applyTopViewMapRect(grid,rect(0,1,1,2,mode));
  assert.deepEqual(grid,[[mode?1:69,2],[mode?1:69,2]]);
 }
});
test('explicit errors for unknown source semantics without fallback terrain',()=>{
 const options={stageId:geometry.stages[0].stageId,count:2,source,geometry};
 assert.throws(()=>runtime.createTerrain({...options,stageId:'missing'}),/missing original/);
 assert.throws(()=>runtime.createTerrain({...options,count:9}),/2\.\.8/);
 assert.throws(()=>runtime.applyMapRect([[0]],rect(0,0,1,1,2)),/unsupported MapRect mode/);
 const geo=structuredClone(geometry);geo.stages[0].variants[0].tileOriginY=1;
 assert.throws(()=>runtime.createTerrain({...options,geometry:geo}),/coordinate semantics/);
 const raw=structuredClone(source),stage=raw.stages.find(s=>s.stageId===options.stageId);
 const variant=population.selectVariant(stage.json.stageInitParamList,2,false);
 variant.actorCreateParamList.push({...rect(0,0,1,1,0),playerCount:0,createThreshold:1,posX:0,posY:0});
 assert.throws(()=>runtime.createTerrain({...options,source:raw}),/deferred MapRect/);
});
test('browser UMD imports supplied source data without require or network',()=>{
 const context=vm.createContext({});
 vm.runInContext(fs.readFileSync(require.resolve('./population-rules.cjs'),'utf8'),context);
 vm.runInContext(fs.readFileSync(require.resolve('./terrain-runtime.js'),'utf8'),context);
 context.input={stageId:geometry.stages[0].stageId,count:2,source,geometry};
 assert.ok(vm.runInContext('SourceTerrainRuntime.createTerrain(input).platforms.length > 0',context));
});
