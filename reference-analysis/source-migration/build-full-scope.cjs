'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const p1=require('./pp1-stage-decoded.local.json'),p2=require('./installed-stage-decoded.local.json');
const rows=[];
p1.catalog.world.forEach((world,wi)=>world[4].forEach((sourceIndex,si)=>{
 const stageId=p1.catalog.stageList[sourceIndex][0],s=p1.stages.find(s=>s.stageId===stageId);assert.ok(s,stageId);
 rows.push({id:`pico1/world/${String(wi+1).padStart(2,'0')}-${String(si+1).padStart(2,'0')}`,sourceStageId:stageId,sourceKind:'installed_lua_static',dataRecovered:true,runtimeConnected:false,originalFidelityReviewed:false});
}));
assert.equal(rows.length,48);assert.equal(new Set(rows.map(r=>r.sourceStageId)).size,48);
for(const s of p2.stages.filter(s=>/^st_w_\d\d_\d\d$/.test(s.stageId)).sort((a,b)=>a.stageId.localeCompare(b.stageId))){
 rows.push({id:`pico2/world/${s.stageId.slice(5,7)}-${s.stageId.slice(8,10)}`,sourceStageId:s.stageId,sourceKind:'installed_stage_static',dataRecovered:true,runtimeConnected:s.stageId==='st_w_01_01',originalFidelityReviewed:false});
}
assert.equal(rows.length,108);assert.equal(new Set(rows.map(r=>r.id)).size,108);
const report={date:'2026-10-09',scope:'PICO PARK 1 and 2, all visible modes plus original resource variants retained locally',world:{pico1:48,pico2:60,total:108,sourceDataRecovered:108,runtimeConnected:1,originalFidelityReviewed:0},
otherModes:{pico1:{battle:4,endlessVisible:4,endlessResources:5,note:'stage_el_scroll_net is an online alternative, not a fifth visible round'},pico2:{dark:16,battle:8,endless:7}},visibleCatalogueEntries:147,
notice:'1편·2편 전체가 이관 대상이다. 2편 60개만으로 범위를 줄인 과거 계획을 대체한다. 데이터 확보·실행 연결·원본 일치 검수는 서로 다른 상태다.',
pending:['1편 Lua의 동적 인원·장치 규칙 이관','2편 126종 장치 동작 연결','1편·2편 전체 온라인 연결','전체 이관 후 단계별 2~8인 경로/실패복구/재미 검수'],stages:rows};
fs.writeFileSync(path.join(__dirname,'full-scope-status.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.world));
