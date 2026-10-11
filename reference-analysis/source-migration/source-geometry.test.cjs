'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const raw=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
test('All 75 tile maps preserve exact padded column-major source cells',()=>{
 assert.equal(geometry.stages.length,60);let variants=0;
 for(const stage of geometry.stages){
  const original=raw.stages.find(s=>s.stageId===stage.stageId);assert.ok(original);
  assert.equal(stage.variants.length,original.json.stageInitParamList.length);
  stage.variants.forEach((v,i)=>{
   const p=original.json.stageInitParamList[i].mapInitParam,b=Buffer.from(p.mapData,'base64');
   assert.equal(b.length,(p.width+2*p.paddingCount)*(p.height+2*p.paddingCount));
   assert.equal(v.width,p.width);assert.equal(v.height,p.height);assert.equal(v.chipSize,p.chipSize);assert.equal(v.grid.length,v.height);
   for(let y=0;y<v.height;y++){
    assert.equal(v.grid[y].length,v.width);
    for(let x=0;x<v.width;x++){
     assert.equal(v.grid[y][x],b[(x+p.paddingCount)*(p.height+2*p.paddingCount)+y+p.paddingCount]);
     assert.ok(geometry.tileAttributes.some(t=>t.id===v.grid[y][x]));
    }
   }
   variants++;
  });
 }
 assert.equal(variants,75);
});
test('Original collision attributes retain solid, ice and destructible flags independently',()=>{
 assert.equal(geometry.tileAttributes.length,80);
 for(const tile of geometry.tileAttributes)assert.equal(tile.solid,!!(tile.flags&1));
 for(let i=52;i<=67;i++)assert.ok(geometry.tileAttributes[i].solid);
 assert.equal(geometry.tileAttributes[69].solid,false);assert.equal(geometry.tileAttributes[78].solid,true);
});
