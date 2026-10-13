// Reproducible live-runtime diagnostic, not a native-physics passing test.
// Places real2..8 stage players on their shipped lift, then uses R.step only.
const fs=require('node:fs'),path=require('node:path'),R=require('./source-stage-runtime.js'),L=require('./source-lift-devices.js'),P=require('./source-linepath-devices.js');
function probe(stageId,count){
 const compiled=JSON.parse(fs.readFileSync(path.join(__dirname,'play','data',stageId,count+'.json'))),state=R.create(compiled);
 const platform=()=>stageId==='st_w_03_02'?P.solids(state.linePathState)[0]:L.solids(state.liftState)[0];
 const start=platform(),cols=Math.min(count,4);
 state.players.forEach((p,i)=>{p.x=start.x+(start.w-cols*p.w)/2+(i%cols)*p.w;p.y=start.y-p.h*(1+Math.floor(i/cols));p.vx=0;p.vy=0;});
 for(let i=0;i<20;i++){
  const previous=platform().x,positions=state.players.map(p=>p.x);R.step(state,{},1/60);
  const dx=platform().x-previous;
  if(dx!==0){const playerDelta=state.players.map((p,j)=>p.x-positions[j]);return {stageId,count,tick:state.ticks,status:state.status,liftDeltaXRaw:Math.round(dx*65536),playerDeltaXRaws:playerDelta.map(x=>Math.round(x*65536)),allCarried:playerDelta.every(x=>Math.abs(x-dx)<1/65536),setup:'shipped lift, centered columns<=4 with upper row; settled through actual R.step'};}
  if(state.status!=='play')return {stageId,count,tick:state.ticks,status:state.status,allCarried:false,reason:'stage ended before lift movement'};
 }
 return {stageId,count,tick:state.ticks,status:state.status,allCarried:false,reason:'no lift movement in20 ticks'};
}
function run(){const cases=['st_w_03_02','st_w_10_04'].flatMap(id=>Array.from({length:7},(_,i)=>probe(id,i+2)));return {schemaVersion:1,scope:'Actual R.create/R.step with shipped compiled data and synthetic starting placement; no original-game execution or complete-stage claim',cases};}
if(require.main===module){const report=run();process.stdout.write(JSON.stringify(report,null,2)+'\n');if(process.argv.includes('--require-carry')&&report.cases.some(c=>!c.allCarried))process.exitCode=1;}
module.exports={probe,run};
