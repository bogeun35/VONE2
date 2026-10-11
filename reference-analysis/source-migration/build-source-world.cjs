'use strict';
// Local source interchange. No actor is replaced by a generic demo or silently discarded.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname;
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function importWorld(decoded){
 const input=decoded.stages.filter(s=>/^st_w_\d\d_\d\d$/.test(s.stageId)).sort((a,b)=>a.stageId.localeCompare(b.stageId));
 assert.equal(input.length,60);const types=new Map();
 const stages=input.map((s,i)=>{
  const expected=`st_w_${String(Math.floor(i/4)+1).padStart(2,'0')}_${String(i%4+1).padStart(2,'0')}`;assert.equal(s.stageId,expected);
  const variants=s.json.stageInitParamList.map((v,vi)=>{
   const {actorCreateParamList,...settings}=v;
   const actors=actorCreateParamList.map((a,ai)=>{
    assert.ok(Number.isFinite(a.posX)&&Number.isFinite(a.posY));assert.equal(a.datas.length,32);
    const {posX,posY,datas,...properties}=a;
    const parameters=datas.map((p,slot)=>({slot,...p}));
    const id=`${s.stageId}:v${vi}:a${ai}`;
    const row={id,sourceIndex:ai,position:{x:posX,y:posY},properties,parameters};
    const t=types.get(a.typeName)||{type:a.typeName,occurrences:0,stages:new Set(),slots:new Set()};t.occurrences++;t.stages.add(s.stageId);parameters.filter(p=>p.t!==0).forEach(p=>t.slots.add(p.slot));types.set(a.typeName,t);
    return row;
   });
   return {id:`${s.stageId}:v${vi}`,sourceIndex:vi,settings,actors};
  });
  const row={id:`pico2/world/${s.stageId.slice(5,7)}-${s.stageId.slice(8,10)}`,sourceStageId:s.stageId,sourceFile:s.file,sourceJsonSha256:digest(s.json),status:'source_data_imported_runtime_pending',variants};
  // Verify every source field, inactive slot, null name and encoded string survives round-trip.
  assert.deepEqual(restoreStage(row),s.json);
  return row;
 });
 const actorTypes=[...types.values()].sort((a,b)=>a.type.localeCompare(b.type)).map(t=>({...t,stages:[...t.stages].sort(),slots:[...t.slots].sort((a,b)=>a-b),runtimeStatus:'not_mapped'}));
 return {schemaVersion:1,scope:'pico2/world',localOnly:true,coordinates:'source posX/posY unchanged; anchor and world conversion pending',counts:{stages:60,variants:stages.reduce((n,s)=>n+s.variants.length,0),actors:stages.reduce((n,s)=>n+s.variants.reduce((n,v)=>n+v.actors.length,0),0),actorTypes:actorTypes.length,playableSourceStages:0},stages,actorTypes};
}
function restoreStage(stage){return {stageInitParamList:stage.variants.map(v=>({...v.settings,actorCreateParamList:v.actors.map(a=>({...a.properties,posX:a.position.x,posY:a.position.y,datas:a.parameters.map(({slot,...p})=>p)}))}))};}
function write(){
 const data=importWorld(JSON.parse(fs.readFileSync(path.join(root,'installed-stage-decoded.local.json'),'utf8')));
 fs.writeFileSync(path.join(root,'source-world.local.json'),JSON.stringify(data)+'\n');
 const report={schemaVersion:1,sourceDataRecovered:true,...data.counts,roundTripLossless:true,runtimeComplete:false,populationSelectionVerified:false,actorTypes:data.actorTypes,stages:data.stages.map(s=>({id:s.id,sourceStageId:s.sourceStageId,sourceJsonSha256:s.sourceJsonSha256,status:s.status,variants:s.variants.map(v=>({sourceIndex:v.sourceIndex,createIndex:v.settings.createIndex,needPlayerCount:v.settings.needPlayerCount,isOnlineOnly:v.settings.isOnlineOnly,actors:v.actors.length}))}))};
 fs.writeFileSync(path.join(root,'source-world-import-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(data.counts));
 return report;
}
if(require.main===module)write();module.exports={importWorld,restoreStage,digest};
