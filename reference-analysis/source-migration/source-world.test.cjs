'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {importWorld,restoreStage}=require('./build-source-world.cjs');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8'));
test('All 60 distinct World rounds survive full field and 32-slot round trip',()=>{
 const result=importWorld(source);assert.equal(result.stages.length,60);assert.equal(new Set(result.stages.map(s=>s.id)).size,60);
 for(const stage of result.stages)assert.deepEqual(restoreStage(stage),source.stages.find(s=>s.stageId===stage.sourceStageId).json);
 assert.equal(result.counts.playableSourceStages,0);assert.equal(result.localOnly,true);
});
test('Missing round is rejected rather than replaced with generic stage',()=>assert.throws(()=>importWorld({...source,stages:source.stages.filter(s=>s.stageId!=='st_w_15_04')})));
test('Duplicated round cannot disguise a missing round',()=>{
 const stages=source.stages.filter(s=>s.stageId!=='st_w_15_04');stages.push(source.stages.find(s=>s.stageId==='st_w_01_01'));assert.throws(()=>importWorld({...source,stages}));
});
test('Broken actor coordinate or parameter slot is rejected',()=>{
 const data=structuredClone(source),a=data.stages.find(s=>s.stageId==='st_w_01_01').json.stageInitParamList[0].actorCreateParamList[0];a.datas.pop();assert.throws(()=>importWorld(data));a.datas.push({t:0,f:0,s:null});a.posX=null;assert.throws(()=>importWorld(data));
});
