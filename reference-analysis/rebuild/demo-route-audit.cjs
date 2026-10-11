'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('./engine'),D=require('./demo-stages');
function attempt(row,jumpCycle=45){
 const s=E.create(['a','b'],{map:D.createStage(row.id,2)});let frames=0;
 const tick=inputs=>{E.step(s,inputs,1/60);frames++;};
 const p=id=>s.players.find(p=>p.id===id);
 function go(id,target,options={}){
  const jumpPoints=[...(options.jumpPoints||[])];
  for(let t=0;t<1800&&s.status==='play';t++){
   const me=p(id);if(me.exit||me.x>=target-2)return true;
   const traffic=s.map.rules?.trafficLight,phase=traffic?s.elapsed%(traffic.go+traffic.stop):0;
   const stop=traffic&&(phase>=traffic.go-0.06||phase<0.06&&s.elapsed>1);
   const tired=s.map.rules?.stamina&&s.stamina<1;
   const rest=tired||(s.map.rules?.stamina&&t%240>175);
   const nearHazard=s.map.hazards.some(h=>h.x-me.x-me.w<(s.map.rules?.wind?8:40)&&h.x+h.w>me.x&&h.y+h.h>me.y-50);
   const pointJump=jumpPoints.length&&me.grounded&&me.x>=jumpPoints[0];if(pointJump)jumpPoints.shift();
   tick({[id]:{right:!stop&&!rest,jump:!stop&&!rest&&(options.jump===false?false:me.grounded&&(options.jumpPoints?pointJump:options.hazards?nearHazard:t%jumpCycle===0))}});
  }
  return p(id).exit||p(id).x>=target-2;
 }
 tick({});tick({});
 const family=row.family;
 if(family==='flight'){
  for(const id of ['b','a'])for(const [x,y]of [[750,485],[800,270],[1030,270],[1080,480],[1320,480],[1370,250],[1670,250],[1875,520]]){
   for(let t=0;t<900&&s.status==='play';t++){const me=p(id);if(me.exit||me.x>=x-2&&Math.abs(me.y-y)<24)break;tick({[id]:{right:me.x<x-2&&Math.abs(me.y-y)<40,jump:me.y+me.vy*0.2>y}});}
  }
 }else if(['wind','avoidbuttons','dodge'].includes(family)){
  for(const id of ['b','a']){go(id,1560,{hazards:true});
   if(family==='avoidbuttons'){for(let t=0;t<50;t++)tick({});tick({[id]:{jump:true}});for(let t=0;t<12;t++)tick({});go(id,1750,{jump:false});}
   else go(id,1750);
   go(id,1950,{hazards:true});}
 }else if(family==='longjump'){
  for(const id of ['b','a'])go(id,1950,{jumpPoints:[590,960,1350]});
 }else if(family==='speedkey'){
  for(const id of ['b','a']){go(id,560,{jump:false});go(id,1950,{jumpPoints:[810,1260]});}
 }else if(['fallinghazard','laser','safegap','oneatatime','traffic','stamina','blackout'].includes(family)){
  go('b',1950);go('a',1950);
 }else if(['relay','hiddenbutton','stackrelay'].includes(family)){
  go('b',480,{jump:false});go('a',440,{jump:false});
  tick({a:{right:true,jump:true}});
  for(let t=0;t<60;t++)tick({a:{right:p('a').x<482}});
  tick({a:{jump:true}});for(let t=0;t<12;t++)tick({});
  for(let t=0;t<70;t++)tick({a:{right:p('a').x<600}});
  for(let t=0;t<5;t++)tick({});
  go('a',1950);go('b',1950);
 }else if(family==='coins'){
  go('b',1950);go('a',1950);
 }else return {id:row.id,family,result:'not_scripted'};
 return {id:row.id,family,result:s.status==='clear'?'PASS':'UNRESOLVED',frames,reason:s.failure,positions:s.players.map(p=>({x:Math.round(p.x),y:Math.round(p.y),exit:p.exit})),key:s.keyTaken,coins:s.coinsTaken};
}
const results=[];
for(const row of D.list().filter(x=>x.playable&&x.route==='platform'&&x.id!=='pico1/world/01-01')){
 let result;for(const cadence of [45,32,24,16]){result=attempt(row,cadence);if(result.result!=='UNRESOLVED')break;}results.push(result);
}
const report={scope:'2인 실제 입력만 사용한 경로 검사. UNRESOLVED는 미완주이며 불가능 확정이 아님.',passed:results.filter(x=>x.result==='PASS').length,unresolved:results.filter(x=>x.result==='UNRESOLVED').length,notScripted:results.filter(x=>x.result==='not_scripted').length,results};
fs.writeFileSync(path.join(__dirname,'demo-route-audit.report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
