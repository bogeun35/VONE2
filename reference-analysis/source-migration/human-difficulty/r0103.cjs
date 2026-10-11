'use strict';
// 1-3: teammate's alternating-dash policy (whole-route-record.cjs st_w_01_03) generalised to any
// count, run through the hd-kit Game so the human-noise filter of r0101 can be applied.
const fs=require('fs'),path=require('path');const R=require('../source-stage-runtime.js');
const {makeFilter}=(()=>{const src=fs.readFileSync(path.join(__dirname,'r0101.cjs'),'utf8');const m={};new Function('module','require','__dirname',src.replace(/module\.exports=\{run\};[\s\S]*$/,'module.exports={makeFilter};'))(m,require,__dirname);return m.exports;})();
function run(stage,count,{noise=null,seed=1,dashers=2}={}){
 const c=JSON.parse(fs.readFileSync(path.join(__dirname,'..','play','data',stage,count+'.json'),'utf8'));const s=R.create(c);const F=makeFilter(noise,seed);
 const bots=s.players.map(()=>({phase:'go',hold:0,launched:false}));const hits=[];let lastHits=0;
 try{
 for(let guard=0;guard<60*200&&s.status==='play';guard++){
  const inputs={},wall=s.motionState.walls[0];
  for(let j=0;j<count;j++){
   const p=s.players[j],b=bots[j];let input={};
   if(wall.fallen){
    if(p.grounded&&p.x>1040&&p.x<1800&&!b.hold&&!p.jump)b.hold=14;
    input={right:true,up:true,jump:b.hold>0};b.hold=Math.max(0,b.hold-1);
   }else{
    if(j<count-dashers||s.ticks<(count-1-j)*100)continue;
    if(p.forcedVx>1000)b.launched=true;
    if(b.launched&&p.forcedVx<0){b.phase='return';b.launched=false;}
    if(b.phase==='return'&&p.x<740&&p.y<255&&p.grounded)b.phase='go';
    if(b.phase==='go'){input.right=true;input.jump=p.x>751&&p.x<854;}
    else{input.left=true;if(p.grounded&&p.x<925&&!b.hold&&!p.jump)b.hold=14;input.jump=b.hold>0;b.hold=Math.max(0,b.hold-1);}
   }
   inputs[p.id]=input;
  }
  F.step(s,inputs);
  if(wall.hits!==lastHits){if(wall.hits>lastHits)hits.push(s.ticks);lastHits=wall.hits;}
 }}catch(e){}
 const gaps=hits.slice(1).map((t,i)=>t-hits[i]);
 return {stage,count,status:s.status,seconds:+(s.ticks/60).toFixed(2),failure:s.failure,exited:s.players.filter(p=>p.exit).length,hits:hits.length,maxGapTicks:gaps.length?Math.max(...gaps):null,medianGap:gaps.length?gaps.sort((a,b)=>a-b)[Math.floor(gaps.length/2)]:null,wall:{required:s.motionState.walls[0].hitsRequired,res:s.motionState.walls[0].resilienceTime,fallen:s.motionState.walls[0].fallen},wrongPresses:F.wrong};
}
module.exports={run};
if(require.main===module)for(const n of [2,4,8])for(const d of [1,2]){const r=run('st_w_01_03',n,{dashers:Math.min(d,n)});console.log(n,'dashers',d,JSON.stringify(r));}
