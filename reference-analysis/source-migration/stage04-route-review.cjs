'use strict';
const fs=require('node:fs'),path=require('node:path'),R=require('./source-stage-runtime.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'))),geometry=JSON.parse(fs.readFileSync(path.join(__dirname,'source-geometry.local.json')));
function run(count){
 const compiled=R.compile({source,geometry,count,stageId:'st_w_01_04'}),s=R.create(compiled),log=[],milestones=[];
 function frames(p,input,limit,until=()=>false,label='segment'){
  for(let i=0;i<limit;i++){
   if(until())return true;
   const inputs={[p.id]:typeof input==='function'?input(p,i):input};log.push(inputs);R.step(s,inputs);
   if(s.status!=='play')throw Error(label+': '+s.status+' '+JSON.stringify(s.failure));
  }
  if(until())return true;
  throw Error(label+' timed out: '+JSON.stringify({x:p.x,y:p.y,vy:p.vy,support:p.supportId,ticks:s.ticks}));
 }
 function steer(p,x){return {right:p.x<x-1,left:p.x>x+1};}
 function travel(p,x,jumpArea,until,label,max=1000){let hold=0;return frames(p,()=>{if(p.grounded&&jumpArea(p)&&!hold&&!p.jump)hold=14;const v={...steer(p,x),jump:hold>0};hold=Math.max(0,hold-1);return v;},max,until,label);}
 function note(label,p){milestones.push({label,tick:s.ticks,player:p.id,x:p.x,y:p.y,pushed:s.gateState.observers[0].pushedCount});console.log(label,p.id,Math.round(p.x),Math.round(p.y),s.ticks);}
 function pressed(x){const button=s.map.switches.find(b=>b.x===x);return s.relayState.relays.find(r=>r.id===button.id).pressed;}
 function upperLaunch(p){
  travel(p,1068,p=>p.x>815,()=>p.x>1040&&p.vy<-1000&&p.y<1200,'rightmost lower spring',1800);
  travel(p,1260,p=>p.x>815,()=>p.x>1200&&p.vy<-1500,'upper launch',1800);note('upper launch',p);
 }
 const p=s.players[count-1];
 travel(p,1136,p=>p.x>815&&p.x<1100,()=>pressed(1143),'Switch12');note('Switch12',p);
 if(count===8){
  const q=s.players[count-2];
  travel(q,1520,p=>p.x>815&&p.x<1090,()=>pressed(1527),'Switch9');note('Switch9',q);
  const r=s.players[count-3];upperLaunch(r);
  frames(r,()=>steer(r,1200),150,()=>r.y<430,'rise past upper platform');
  frames(r,()=>steer(r,1090),200,()=>pressed(1095),'Switch8');note('Switch8',r);
  const t=s.players[count-4];upperLaunch(t);
  frames(t,()=>steer(t,1200),150,()=>t.y<430,'rise for left spring');
  frames(t,()=>steer(t,1058),200,()=>t.grounded&&t.y<=482,'left staging ledge');note('left staging ledge',t);
  travel(t,978,()=>true,()=>t.x<1000&&t.vy<-1500,'left high spring',300);note('left high spring',t);
  frames(t,()=>steer(t,416),300,()=>pressed(423),'Switch6');note('Switch6',t);
  const u=s.players[count-5];upperLaunch(u);
  frames(u,()=>steer(u,1408),250,()=>u.x>1380&&u.vy<-1500,'right upper spring');
  frames(u,()=>steer(u,1460),160,()=>u.y<280,'rise for top block');
  frames(u,()=>steer(u,1600),180,()=>u.grounded&&u.y<340,'top block');note('top block',u);
  frames(u,()=>steer(u,2260),500,()=>u.x>2220&&u.vy<-1500,'far right spring');
  frames(u,()=>steer(u,2270),160,()=>u.y<415,'rise past right ledge');
  frames(u,()=>steer(u,2310),160,()=>pressed(2319),'Switch14');note('Switch14',u);
 }
 return {count,status:s.status,passed:false,partial:true,milestones,ticks:s.ticks,fullRouteVerified:false};
}
const report={stageId:'st_w_01_04',generatedAt:new Date().toISOString(),musicPlayed:false,originalFidelityVerified:false,results:[],failures:[]};
for(const count of [8])try{report.results.push(run(count));}catch(e){report.failures.push({count,error:e.message});}
fs.writeFileSync(path.join(__dirname,'stage04-route-review-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));


