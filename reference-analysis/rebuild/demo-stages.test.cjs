'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('./demo-stages'),E=require('./engine');
const rows=D.list(),results=[];
assert.equal(rows.length,147);assert.equal(new Set(rows.map(x=>x.id)).size,147);
for(const row of rows.filter(x=>x.playable&&x.route==='platform'))for(let count=2;count<=8;count++){
 const map=D.createStage(row.id,count);assert.equal(map.spawns.length,count);
 const ids=Array.from({length:count},(_,i)=>'p'+i);let state=E.create(ids,{map});
 for(let frame=0;frame<120;frame++){state=E.step(state,{},1/60);for(const p of state.players)for(const key of ['x','y','vx','vy'])assert(Number.isFinite(p[key]),`${row.id}: ${key}`);}
 assert.equal(state.status,'play',`${row.id}, ${count}: starting area must be safe for two seconds`);
 results.push({id:row.id,count,initialization:'passed',idleFrames:120});
}
const report={date:'2026-10-09',scope:'초기화·시작 지점 안전성만 검사. 경로 완주·재미·원작 일치·실제 온라인 검증이 아님.',catalogueEntries:rows.length,platformDemos:rows.filter(x=>x.playable&&x.route==='platform').length,miniEntries:rows.filter(x=>x.playable&&x.route==='mini').length,pending:rows.filter(x=>!x.playable).length,populationChecks:results.length,results};
fs.writeFileSync(path.join(__dirname,'demo-stages.report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined},null,2));
