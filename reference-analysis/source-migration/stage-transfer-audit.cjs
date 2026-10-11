'use strict';
// Audits decoded source data. Does not execute original code or claim gameplay completion.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Terrain = require('./terrain-runtime.js');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const source = read('installed-stage-decoded.local.json');
const geometry = read('source-geometry.local.json');
const schema = read('parameter-schema.json');
const runtime = fs.readFileSync(path.join(__dirname, 'source-stage-runtime.js'), 'utf8');
const supportMatch = runtime.match(/const supported=new Set\(\[([^\]]+)\]\)/);
assert.ok(supportMatch, 'Runtime support declaration changed; inspect manually');
const supported = new Set([...supportMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
const unique = values => [...new Set(values)].sort();
const stages = source.stages.filter(s => /^st_w_\d\d_\d\d$/.test(s.stageId)).sort((a,b) => a.stageId.localeCompare(b.stageId));
assert.equal(stages.length, 60);
const records = stages.map(stage => {
  const populations = [];
  for (const online of [false, true]) for (let count=2; count<=8; count++) {
    try {
      const t = Terrain.createTerrain({source, geometry, stageId:stage.stageId, count, online});
      const actorTypes = {};
      for (const actor of t.actors) actorTypes[actor.typeName] = (actorTypes[actor.typeName] || 0) + 1;
      populations.push({count,online,variant:t.variant,actorTypes,actorCount:t.actors.length,
        terrain:{width:t.width,height:t.height,platformRuns:t.platforms.length,solidCells:t.cells.length,flags:unique(t.cells.map(c=>c.flags)),overlays:t.overlays.length},
        unsupportedActors:Object.keys(actorTypes).filter(type=>!supported.has(type)).sort(),
        dynamicTileFlags:unique(t.cells.filter(c=>(c.flags & ~1)!==0).map(c=>c.flags)),
        deferredActorTypes:unique(t.actors.filter(a=>a.createThreshold>0).map(a=>a.typeName)),
        missingGoal:!t.actors.some(a=>a.typeName==='Goal'),
        specialPlayerTypes:Object.keys(actorTypes).filter(type=>/Player/.test(type)&&type!=='Player')});
    } catch (error) { populations.push({count,online,error:error.message}); }
  }
  const unsupportedActors=unique(populations.flatMap(p=>p.unsupportedActors||[]));
  const dynamicTileFlags=unique(populations.flatMap(p=>p.dynamicTileFlags||[]));
  const deferredActorTypes=unique(populations.flatMap(p=>p.deferredActorTypes||[]));
  return {stageId:stage.stageId,unsupportedActors,dynamicTileFlags,deferredActorTypes,
    terrainImportSucceeded:populations.every(p=>!p.error),
    hasUnimplementedContent:unsupportedActors.length>0||dynamicTileFlags.length>0||deferredActorTypes.length>0||populations.some(p=>p.error||p.missingGoal),
    gameplayCompletionClaimed:false,populations};
});
const typeCoverage=unique(records.flatMap(r=>r.unsupportedActors)).map(type=>{
  const entry=schema.types.find(s=>s.actorType===type);
  const stageIds=records.filter(r=>r.unsupportedActors.includes(type)).map(r=>r.stageId);
  return {type,stageCount:stageIds.length,stageIds,parameterStatus:entry?.status||'unlisted',
    nativeParameterAddress:entry?.nativeParseParameter?.va||null,
    hasVerifiedSchema:!!entry?.verifiedSchema,
    caution:'An actor type name and parameter bounds do not prove its behavior. Parameter and event semantics require verification.'};
}).sort((a,b)=>b.stageCount-a.stageCount||a.type.localeCompare(b.type));
const packages=[
  {name:'Opening puzzle: movable box and contact switch',types:['Thorn','PushBox','CollisionSwitch']},
  {name:'Opening gate puzzle',types:['SwitchObserver','Thorn','Gate']},
  {name:'Opening chase puzzle',types:['FallingWall','DashBoard','Rect']},
  {name:'Common hazards, boxes, switches and bridges',types:['Thorn','Thunder','Rect','PushBox','CollisionSwitch','SwitchObserver','Gate','Bridge']},
  {name:'Common package plus moving platforms',types:['Thorn','Thunder','Rect','PushBox','CollisionSwitch','SwitchObserver','Gate','Bridge','WeightedLift','WeightedLiftEx','WeightedLiftSingle','LinePathLift','DamageRect','Wind','SpeedSwitch']}
].map(pkg=>({...pkg,
  stageIdsWithActorAndTileGapsClosed:records.filter(r=>r.terrainImportSucceeded&&r.unsupportedActors.every(t=>pkg.types.includes(t))&&r.dynamicTileFlags.length===0&&r.deferredActorTypes.length===0).map(r=>r.stageId),
  warning:'Hypothetical coverage only; implementing these names is insufficient unless each populated parameter, relay, timing, collision and multiplayer state is handled.'}));
const report={generatedAt:new Date().toISOString(),worldStageCount:60,populationSelections:840,
  counts:[2,3,4,5,6,7,8],modes:['offline','online'],runtimeDeclaredActorSupport:[...supported],
  importedTerrainSelections:records.flatMap(r=>r.populations).filter(p=>!p.error).length,
  stagesWithoutDeclaredContentGaps:records.filter(r=>!r.hasUnimplementedContent).map(r=>r.stageId),
  note:'This is a static transfer gap audit. It verifies neither playability nor native fidelity nor human fun. Existing support itself still requires fidelity review.',
  schemaWarning:'parameter-schema.json contains an old worldYup description for Rect; terrain-runtime.js and current source-stage-runtime.js use verified Y-down coordinates. Do not reuse that old prose as geometry evidence.',
  nextSequentialStages:records.slice(1,4).map(r=>({stageId:r.stageId,requiredActorTypes:r.unsupportedActors,dynamicTileFlags:r.dynamicTileFlags})),
  packages,typeCoverage,stages:records};
fs.writeFileSync(path.join(__dirname,'stage-transfer-audit-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({worldStageCount:60,populationSelections:840,importedTerrainSelections:report.importedTerrainSelections,stagesWithoutDeclaredContentGaps:report.stagesWithoutDeclaredContentGaps,topMissingTypes:typeCoverage.slice(0,12).map(({type,stageCount})=>({type,stageCount})),packages:packages.map(({name,stageIdsWithActorAndTileGapsClosed})=>({name,stageIdsWithActorAndTileGapsClosed}))},null,2));
