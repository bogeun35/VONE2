'use strict';
// Lossless PP1 source adapter. This intentionally does not invent native actor handlers.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const copy = value => JSON.parse(JSON.stringify(value));
const sha = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Native PP1 actor tick 0x14019a203..0x14019a265, read-only disassembly.
function populationMatches(rule,count){
  assert.ok(Number.isInteger(count)&&count>=2&&count<=8);
  assert.ok(Number.isInteger(rule));
  if(rule===0)return true;
  if(rule<0)return count<=-rule;
  if(rule<10)return count>=rule;
  const lower=Math.trunc(rule/10),upper=rule%10;
  return lower>=10?count>=lower:count>=lower&&count<=upper;
}
function catalog(decoded) {
  const byFile = new Map(decoded.stages.map(stage => [stage.file, stage]));
  const result = [];
  decoded.catalog.world.forEach((world, wi) => world[4].forEach((catalogIndex, si) => {
    const row = decoded.catalog.stageList[catalogIndex];
    assert.equal(row[1], 0);
    const source = byFile.get(`stage/${row[0]}.lua`);
    assert.ok(source, `Missing ${row[0]}`);
    const variants = [{sourceStageId: row[0], catalogSlot: 0, rule: null}];
    row.slice(2).forEach((rule, i) => {
      if (Array.isArray(rule) && typeof rule[1] === 'string') {
        assert.ok(byFile.has(`stage/${rule[1]}.lua`), `Missing alternative ${rule[1]}`);
        variants.push({sourceStageId: rule[1], catalogSlot: i + 2, rule: copy(rule)});
      }
    });
    result.push({id:`pico1/world/${String(wi+1).padStart(2,'0')}-${String(si+1).padStart(2,'0')}`,
      world:wi+1, round:si+1, worldName:world[0], catalogIndex, catalogRow:copy(row), variants});
  }));
  assert.equal(result.length, 48);
  assert.equal(new Set(result.map(stage=>stage.catalogIndex)).size,48);
  return result;
}
function adaptResource(resource) {
  const j = resource.json;
  const width = j['map.width'], height = j['map.height'], tileSize = j['map.chipSize'];
  assert.ok([width,height,tileSize].every(n=>Number.isInteger(n)&&n>0), resource.stageId);
  const tables = j['map.variable'] ? j['map.table'] : [j['map.table']];
  const tileVariants = tables.map((table, variantIndex) => {
    assert.ok(Array.isArray(table),`${resource.stageId}: tile table`);
    // Lua's written columns each have map.height entries, including first-stage floor at y=9.
    const cells=table.map((code,index)=>({index,column:Math.floor(index/height),row:index%height,code}));
    assert.deepEqual(cells.map(cell=>cell.code),table);
    return {variantIndex,cells,declaredCellCount:width*height,actualCellCount:table.length,
      dimensionsMatch:table.length===width*height};
  });
  const actors=(j.createTable||[]).map((row,index)=> {
    assert.ok(Array.isArray(row)&&row.length>=6,resource.stageId+' actor '+index);
    return {id:`${resource.stageId}:a${index}`,sourceIndex:index,
      sourceConditions:copy(row.slice(0,2)),createTime:row[0],populationRule:row[1],type:row[2],name:row[3],
      sourcePosition:{x:row[4],y:row[5]},parameters:copy(row.slice(6)),raw:copy(row)};
  });
  assert.deepEqual(actors.map(actor=>actor.raw),j.createTable||[]);
  // Retain ALL fields and expressions; even unresolved metadata survives roundtrip.
  return {sourceStageId:resource.stageId,sourceFile:resource.file,sourceSha256:resource.sourceSha256,
    dataSha256:sha(j),settings:copy(j),geometry:{width,height,tileSize,order:'column-major',tileVariants},actors,
    hasLuaControlFlow:/\b(function|while|repeat|for|if)\b/.test(resource.lua.replace(/--[^\r\n]*/g,'')),
    runtimeReady:false};
}
function adapt(decoded) {
  const stages=catalog(decoded), requested=new Set(stages.flatMap(stage=>stage.variants.map(v=>v.sourceStageId)));
  const resources=decoded.stages.filter(r=>requested.has(r.stageId)&&r.file===`stage/${r.stageId}.lua`).map(adaptResource);
  assert.equal(resources.length,requested.size);
  return {schemaVersion:1,game:'pico1',stages,resources,
    sourceRules:{actorConditions:'Native 0x14019a1a0: row0 creation time; row1 0=all, 1..9=count>=n, negative=count<=abs(n), 10..99=decimal min/max range, >=100=count>=floor(n/10).',
      variantSelection:'Catalog slots and threshold rows preserved; native selection semantics pending.',
      tileCollision:'Tile IDs preserved; collision profile must come from native map loader.',
      luaInterpreterRequired:resources.some(r=>r.hasLuaControlFlow)},runtimeConnected:0};
}
// Explicit selection is useful to the renderer and later verified native-loader adapter.
// The actor filter must be supplied by a verified policy, so unknown condition rows cannot disappear.
function materialize(data,stageId,{resourceId,tileVariant=0,actorPolicy,count}={}) {
  const stage=data.stages.find(s=>s.id===stageId);
  if(!stage)throw Error('Unknown PP1 world stage '+stageId);
  const chosen=resourceId||stage.variants[0].sourceStageId;
  if(!stage.variants.some(v=>v.sourceStageId===chosen))throw Error('Resource is not a stage variant');
  const resource=data.resources.find(r=>r.sourceStageId===chosen);
  const tile=resource.geometry.tileVariants[tileVariant];
  if(!tile)throw Error('Unknown tile variant');
  return {stage:copy(stage),sourceStageId:chosen,geometry:{...copy(resource.geometry),tileVariants:undefined,cells:copy(tile.cells)},
    actors:copy(resource.actors.filter(actor=>(count===undefined||populationMatches(actor.populationRule,count))&&(!actorPolicy||actorPolicy(actor)))),settings:copy(resource.settings),
    runtimeReady:false,selectionVerified:false,populationRuleVerified:count!==undefined};
}
function report(data) {
  const types=new Map();
  for(const resource of data.resources)for(const actor of resource.actors){
    const item=types.get(actor.type)||{type:actor.type,actors:0,resources:new Set()};
    item.actors++;item.resources.add(resource.sourceStageId);types.set(actor.type,item);
  }
  return {schemaVersion:1,worldStages:data.stages.length,sourceResources:data.resources.length,
    sourceActorRows:data.resources.reduce((n,r)=>n+r.actors.length,0),
    tileVariants:data.resources.reduce((n,r)=>n+r.geometry.tileVariants.length,0),
    dimensionMismatches:data.resources.flatMap(r=>r.geometry.tileVariants.filter(v=>!v.dimensionsMatch).map(v=>({sourceStageId:r.sourceStageId,variantIndex:v.variantIndex,declaredCellCount:v.declaredCellCount,actualCellCount:v.actualCellCount}))),
    losslessActorAndTileRoundtrip:true,luaInterpreterRequired:data.sourceRules.luaInterpreterRequired,
    runtimeConnected:0,originalFidelityReviewed:0,
    rules:data.sourceRules,
    nativeEvidence:{actorParser:'0x140199c73..0x14019a163',actorCreationAndPopulation:'0x14019a1a0..0x14019a2a4',
      actorFactory:{WeightedLift:'0x1400e409b..0x1400e4228; constructor 0x1400d3cf0',Bridge:'String dispatch 0x1400e51f6; shared factory branch 0x1400e6c59',Rect:'String dispatch 0x1400e6297; shared factory branch 0x1400e6872'},
      tileIndex:'0x140198070: index=x*height+y; only declared width*height read, surplus source table cells ignored',
      variableTile:'0x140197f76..0x140197f89: selection field at map+0x30 minus 1; caller count mapping remains unverified'},
    nativeBlockers:['Resource variant catalog selection; variable-map selector caller mapping',
      'Tile collision profiles/anchors for MC_* values','PP1 actor constructor parameters and per-tick behavior'],
    firstStageRequiredHandlers:data.resources.find(r=>r.sourceStageId===data.stages[0].variants[0].sourceStageId).actors.map(a=>a.type).filter((x,i,a)=>a.indexOf(x)===i),
    actorTypes:[...types.values()].sort((a,b)=>a.type.localeCompare(b.type)).map(t=>({...t,resources:[...t.resources],runtimeVerified:false})),
    stages:data.stages.map(s=>({...s,runtimeReady:false,populations:Array.from({length:7},(_,i)=>i+2).map(count=>({count,
      baseResourcePopulationMatchedActors:materialize(data,s.id,{count}).actors.length}))}))};
}
if(require.main===module){
  const data=adapt(JSON.parse(fs.readFileSync(path.join(__dirname,'pp1-stage-decoded.local.json'),'utf8')));
  const output=report(data);
  assert.deepEqual(Array.from({length:7},(_,i)=>populationMatches(77,i+2)),[false,false,false,false,false,true,false]);
  assert.deepEqual(Array.from({length:7},(_,i)=>populationMatches(-4,i+2)),[true,true,true,false,false,false,false]);
  assert.deepEqual(Array.from({length:7},(_,i)=>populationMatches(36,i+2)),[false,true,true,true,true,false,false]);
  for(const stage of data.stages)for(const variant of stage.variants)materialize(data,stage.id,{resourceId:variant.sourceStageId});
  fs.writeFileSync(path.join(__dirname,'pp1-transfer-report.json'),JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({worldStages:output.worldStages,sourceResources:output.sourceResources,sourceActorRows:output.sourceActorRows,tileVariants:output.tileVariants,actorTypes:output.actorTypes.length,luaInterpreterRequired:output.luaInterpreterRequired}));
}
module.exports={catalog,adaptResource,adapt,materialize,report,populationMatches};
