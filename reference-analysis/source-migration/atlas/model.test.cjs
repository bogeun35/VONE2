const assert = require('node:assert/strict');
const M = require('./model.js');
const P = require('../population-rules.cjs');
const G = require('../source-geometry.local.json');
const data = require('../installed-stage-decoded.local.json');
const stages = M.worldStages(data);
assert.equal(stages.length, 60);
assert.equal(stages[0].stageId, 'st_w_01_01');
assert.equal(stages.at(-1).stageId, 'st_w_15_04');
let variants = 0, objects = 0;
for (const stage of stages) for (const v of stage.json.stageInitParamList) {
  const items = M.actors(v), box = M.bounds(items), view = M.fit(box, 900, 600);
  assert.ok(items.length > 0, stage.stageId);
  for (const a of items) {
    const p = M.project(a, view);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.x >= 0 && p.x <= 900 && p.y >= 0 && p.y <= 600);
    const flipped = M.project(a, M.fit(box, 900, 600, true));
    assert.ok(flipped.x >= 0 && flipped.x <= 900 && flipped.y >= 0 && flipped.y <= 600);
  }
  variants++;objects += items.length;
}
const item = {posX: 21, posY: 43}, view = {scale: 2, offsetX: 10, offsetY: 20, flipY: false};
assert.equal(M.nearest([item], view, 52, 106), item);
assert.equal(M.nearest([item], view, 500, 600), null);
assert.equal(M.wrap(0, -1, 60), 59);
assert.equal(M.wrap(59, 1, 60), 0);
assert.equal(M.wrap(0, 1, 0), 0);
assert.throws(() => M.worldStages({}), /형식/);
assert.throws(() => M.worldStages({stages:[stages[0],stages[0]]}), /중복/);
assert.throws(() => M.worldStages({stages:[{stageId:'st_w_01_01',json:{stageInitParamList:[]}}]}), /변형/);
assert.throws(() => M.actors({}), /오브젝트/);
assert.deepEqual(M.actors({actorCreateParamList:[{posX:NaN,posY:0},{posX:0,posY:null}]}), []);
assert.ok(M.fit(M.bounds([]), 0, 0).scale > 0);
let populationViews = 0;
let tileCells = 0;
for(const stage of stages) {
  const list=stage.json.stageInitParamList;
  for(let count=2;count<=8;count++)for(const online of [false,true]){
    const result=M.populationView(list,count,online,null,P);
    assert.equal(result.variant,P.selectVariant(list,count,online));
    assert.deepEqual(result.visibleActors.map(a=>a.index),list[result.index].actorCreateParamList.map((a,i)=>P.actorPopulationAllowed(a.playerCount,count)?i:null).filter(i=>i!==null));
    assert.equal(result.sourceActors.length,list[result.index].actorCreateParamList.length);
    populationViews++;
  }
  for(let index=0;index<list.length;index++){
    const manual=M.populationView(list,2,false,index,P);
    assert.equal(manual.index,index);
    assert.equal(manual.visibleActors.length,manual.sourceActors.length);
    const geometry=M.geometryVariant(G,stage.stageId,list[index]);
    assert.equal(geometry.grid.flat().length,geometry.width*geometry.height);
    tileCells+=geometry.width*geometry.height;
    assert.deepEqual(M.tilePosition(geometry,0,0),{posX:0,posY:0});
    assert.deepEqual(M.tilePosition(geometry,geometry.width,geometry.height),{posX:geometry.width*geometry.chipSize,posY:geometry.height*geometry.chipSize});
  }
}
assert.throws(()=>M.populationView(stages[0].json.stageInitParamList,9,false,null,P),/인원/);
assert.throws(()=>M.populationView([],2,false,null,P),/변형/);
assert.throws(()=>M.geometryVariant({},'st_w_01_01',{}),/形式|형식/);
assert.throws(()=>M.geometryVariant(G,'missing',{}),/불일치/);
for(const attr of G.tileAttributes)assert.equal(attr.solid,(attr.id>=2&&attr.id<=68)||attr.id===78);
console.log(JSON.stringify({passed:true,worlds:stages.length,variants,objects,populationViews,manualVariants:variants,tileCells,render:'exact actor and base grid positions; MapRect overlays not applied; markers display-only',audio:'none'},null,2));
