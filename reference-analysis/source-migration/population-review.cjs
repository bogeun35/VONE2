'use strict';
// Population stress evidence. Fixtures never count as a full-stage playthrough.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const R=require('./source-stage-runtime.js');
const report={schemaVersion:1,stage:'PP2 01-01',generatedAt:new Date().toISOString(),audio:'none (headless simulation)',runtimeSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'source-stage-runtime.js'))).digest('hex'),fullRouteVerified:false,humanPlayVerified:false,funVerified:false,cases:[],observations:[]};
const reportPath=path.join(__dirname,'population-review-report.json');
if(fs.existsSync(reportPath)){
 const previous=JSON.parse(fs.readFileSync(reportPath,'utf8'));
 report.historicalRegressionEvidence=previous.historicalRegressionEvidence||[];
 const failures=(previous.cases||[]).filter(c=>c.name==='natural-spawn support and carrying remain invariant under array permutation'&&!c.passed);
 if(failures.length&&!report.historicalRegressionEvidence.some(e=>e.runtimeSha256===previous.runtimeSha256))report.historicalRegressionEvidence.push({runtimeSha256:previous.runtimeSha256,generatedAt:previous.generatedAt,failedCases:failures.map(c=>({count:c.count,evidence:c.evidence}))});
}
function state(n){return R.create(JSON.parse(fs.readFileSync(path.join(__dirname,'play/data',n+'.json'),'utf8')));}
function inputs(s,action){return Object.fromEntries(s.players.map(p=>[p.id,action]));}
function frame(s,input){R.step(s,input);for(const p of s.players)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.vy));}
function snapshot(s){return s.players.map(p=>({id:p.id,x:p.x,y:p.y,grounded:p.grounded,supportId:p.supportId,exit:p.exit}));}
function run(n,name,kind,fn){const c={count:n,name,kind,passed:false};report.cases.push(c);try{c.evidence=fn();c.passed=true;}catch(e){c.error=e.stack;if(e.evidence)c.evidence=e.evidence;}}
function pairOverlaps(s){const result=[];for(let i=0;i<s.players.length;i++)for(let j=i+1;j<s.players.length;j++){const a=s.players[i],b=s.players[j];if(!a.exit&&!b.exit&&R.overlap(a,b))result.push([a.id,b.id]);}return result;}
for(let n=2;n<=8;n++){
 run(n,'spawn crowd, synchronized walking and held jumps','whole-stage-start-input-stress',()=>{
  const s=state(n),permuted=state(n);permuted.players.reverse();let overlapTicks=0,warpEvents=0;
  for(let f=0;f<1200&&s.status==='play';f++){
   const before=s.players.map(p=>p.y),input=inputs(s,{right:true,jump:f%120<20});frame(s,input);frame(permuted,input);
   const positions=t=>snapshot(t).map(({supportId,...p})=>p).sort((p,q)=>p.id.localeCompare(q.id));
   assert.deepEqual(positions(s),positions(permuted),'natural-spawn positions depend on player array order');
   if(pairOverlaps(s).length)overlapTicks++;
   warpEvents+=s.players.filter((p,i)=>before[i]>950&&p.y<450).length;
  }
  assert.equal(overlapTicks,0,'player bodies penetrate during spawn-input stress');assert.equal(s.status,'play');
  return {ticks:s.ticks,seconds:s.elapsed,overlapTicks,warpEvents,keyTaken:s.keyTaken,terminalStatus:s.status,terminalPlayers:snapshot(s),routeCleared:false,reversePlayerArrayPositionsMatch:true};
 });
 run(n,'natural-spawn support and carrying remain invariant under array permutation','whole-stage-start-input-regression',()=>{
  const a=state(n),b=state(n);b.players.reverse();let carrierCounterfactuals=0;
  for(let f=0;f<1200;f++){
   const input=inputs(a,{right:true,jump:f%120<20});frame(a,input);frame(b,input);
   const p=a.players.find(p=>p.supportId!==b.players.find(q=>q.id===p.id).supportId);
   if(p){
    const q=b.players.find(q=>q.id===p.id),before={x:p.x,y:p.y,supportNormal:p.supportId,supportReversed:q.supportId};
    const carrierInput={[p.supportId]:{left:true}};frame(a,carrierInput);frame(b,carrierInput);
    const evidence={firstDifferentSupportTick:f+1,playerId:p.id,before,nextTickInput:carrierInput,afterNormal:snapshot(a).find(q=>q.id===p.id),afterReversed:snapshot(b).find(q=>q.id===p.id),placementsUsed:false};
    const error=new Error('Player array order changes support selection; identical carrier input then changes rider movement');error.evidence=evidence;throw error;
   }
   if(f===216||f===233)for(const rider of a.players.filter(p=>p.supportId?.startsWith('p'))){
    const normal=JSON.parse(JSON.stringify(a)),reversed=JSON.parse(JSON.stringify(b)),carrierInput={[rider.supportId]:{left:true}};
    frame(normal,carrierInput);frame(reversed,carrierInput);
    assert.deepEqual(snapshot(normal).sort((p,q)=>p.id.localeCompare(q.id)),snapshot(reversed).sort((p,q)=>p.id.localeCompare(q.id)),'counterfactual carrier movement differs after permutation');carrierCounterfactuals++;
   }
  }
  return {ticks:a.ticks,reverseArraySupportsMatch:true,carrierCounterfactuals,placementsUsed:false};
 });
 run(n,'full tower carries through bottom walking and blocks bottom jump','original-terrain-position-fixture',()=>{
  const s=state(n);s.players.forEach((p,i)=>Object.assign(p,{x:300,y:866-46*i,vy:0,grounded:true,ground:true,supportId:i?s.players[i-1].id:'terrain:42'}));
  frame(s,{p1:{right:true,jump:true}});assert.equal(s.players[0].jumpBlocked,true);
  for(let f=1;f<10;f++)frame(s,{p1:{right:true}});
  for(let i=0;i<n;i++){const p=s.players[i];assert.equal(p.x,330);assert.equal(p.y,866-46*i);assert.equal(p.grounded,true);assert.equal(p.supportId,i?s.players[i-1].id:'terrain:42');}
  assert.equal(pairOverlaps(s).length,0);
  return {ticks:s.ticks,translation:30,players:snapshot(s),bottomJumpBlocked:true};
 });
 run(n,'each tower member moves right in one tick','original-terrain-position-fixture-observation',()=>{
  const s=state(n);s.players.forEach((p,i)=>Object.assign(p,{x:300,y:866-46*i,vy:0,grounded:true,ground:true,supportId:i?s.players[i-1].id:'terrain:42'}));
  frame(s,inputs(s,{right:true}));assert.equal(pairOverlaps(s).length,0);
  return {individualWalkPixelsPerTick:3,displacementByStackLevel:s.players.map(p=>p.x-300),interpretation:'Carrier displacement accumulates with each rider input. Native equivalence is unverified; this is an observed population-sensitive behavior, not an established source defect.'};
 });
 run(n,'all bodies fall through actual gap and warp in ordinal order','original-terrain-position-fixture',()=>{
  const s=state(n),warped=[];s.players.forEach((p,i)=>Object.assign(p,{x:872,y:866-i*50,vy:0,grounded:false,ground:false,supportId:null}));
  for(let f=0;f<150&&warped.length<n;f++){
   const before=s.players.map(p=>p.y);frame(s,{});
   s.players.forEach((p,i)=>{if(before[i]>950&&p.y<450){assert.equal(p.x,704);assert.equal(p.y,385-warped.length*50);assert.equal(p.vy,0);assert.equal(p.grounded,false);warped.push(p.id);}});
  }
  assert.equal(warped.length,n);assert.equal(s.map.warps[0].counter,0);assert.equal(s.status,'play');assert.equal(pairOverlaps(s).length,0);
  return {ticks:s.ticks,warped,ordinalDestinationY:warped.map((_,i)=>385-i*50),counter:s.map.warps[0].counter,terminalPlayers:snapshot(s)};
 });
 run(n,'team walks into goal sequentially and exited bodies stop blocking','original-terrain-position-and-open-goal-fixture',()=>{
  const s=state(n);s.keyTaken=true;s.map.key.taken=true;
  s.players.forEach((p,i)=>Object.assign(p,{x:1950+i*36,y:50,vy:0,grounded:true,ground:true,supportId:'terrain:5'}));
  const entered=[];
  for(let f=0;f<180&&s.status==='play';f++){
   frame(s,inputs(s,{left:true,up:true}));
   for(const p of s.players)if(p.exit&&!entered.some(e=>e.id===p.id))entered.push({id:p.id,tick:s.ticks});
   assert.equal(pairOverlaps(s).length,0);
  }
  assert.equal(s.status,'clear');assert.equal(entered.length,n);assert.ok(s.players.every(p=>!p.visible&&p.exit));
  return {ticks:s.ticks,entered,terminalStatus:s.status,keyRouteVerified:false};
 });
 run(n,'tower top jumps while bottom carries and tries blocked jump; reverse player order','original-terrain-position-fixture',()=>{
  const a=state(n),b=state(n);
  for(const s of [a,b])s.players.forEach((p,i)=>Object.assign(p,{x:300,y:866-46*i,vy:0,grounded:true,ground:true,supportId:i?s.players[i-1].id:'terrain:42'}));
  b.players.reverse();let bottomBlocked=false,topApex=a.players[n-1].y;
  for(let f=0;f<20;f++){
   const input={p1:{right:true,jump:f===0},['p'+n]:{right:true,jump:f<14}};
   frame(a,input);frame(b,input);bottomBlocked ||= a.players[0].jumpBlocked;
   topApex=Math.min(topApex,a.players[n-1].y);assert.equal(pairOverlaps(a).length,0);assert.equal(pairOverlaps(b).length,0);
   const norm=s=>snapshot(s).sort((p,q)=>p.id.localeCompare(q.id));assert.deepEqual(norm(a),norm(b),'array order changes tower trajectories');
  }
  assert.equal(bottomBlocked,true);assert.ok(topApex<866-46*(n-1)-20);
  return {ticks:a.ticks,bottomBlocked,topApex,reversePlayerArrayMatches:true,players:snapshot(a)};
 });
 run(n,'jumping head meets a falling teammate without penetration','original-terrain-position-fixture',()=>{
  const s=state(n);s.players.forEach((p,i)=>Object.assign(p,{x:i<2?300:500+40*i,y:i===1?800:866,vy:0,grounded:i!==1,ground:i!==1,supportId:i===1?null:'terrain:42'}));
  let headBlockedAtTick=null;
  for(let f=0;f<20;f++){
   frame(s,{p1:{jump:f<14}});assert.equal(pairOverlaps(s).length,0);
   if(f>0&&s.players[0].jumpFrame===0&&headBlockedAtTick===null)headBlockedAtTick=s.ticks;
  }
  assert.ok(headBlockedAtTick!==null);
  return {ticks:s.ticks,headBlockedAtTick,players:snapshot(s)};
 });
 run(n,'seeded mixed movement from natural spawns','whole-stage-start-input-stress',()=>{
  const s=state(n);let seed=100+n;
  for(let f=0;f<3600&&s.status==='play';f++){
   const input={};for(const p of s.players){seed=(Math.imul(seed,1664525)+1013904223)>>>0;input[p.id]={right:(seed&7)<5,left:(seed&7)===7,jump:(seed&31)<13};}
   frame(s,input);assert.equal(pairOverlaps(s).length,0,'mixed inputs penetrate bodies');
  }
  assert.equal(s.status,'play');return {initialSeed:100+n,ticks:s.ticks,seconds:s.elapsed,keyTaken:s.keyTaken,terminalStatus:s.status,players:snapshot(s),routeCleared:false};
 });
}
report.observations.push({severity:'unverified-fidelity',behavior:'Same-direction tower inputs accumulate horizontal transport',evidence:report.cases.filter(c=>c.name==='each tower member moves right in one tick').map(c=>({count:c.count,...c.evidence}))});
const supportFailures=report.cases.filter(c=>c.name==='natural-spawn support and carrying remain invariant under array permutation'&&!c.passed);
report.observations.push({severity:supportFailures.length?'confirmed-runtime-defect':report.historicalRegressionEvidence?.length?'fixed-runtime-defect':'regression-check',currentlyFailing:supportFailures.length>0,behavior:supportFailures.length?'Equal-height multi-body support selection depends on player array order. From natural spawns this produces different rider movement under identical input. moveY accepts equal candidate heights and overwrites support with the last obstacle.':'Natural-spawn support selection and rider movement are invariant under reverse player array order in this tested input sequence. One-tick carrier-left counterfactuals at the previously failing ticks also match.',evidence:supportFailures.map(c=>({count:c.count,...c.evidence})),historicalEvidenceRetained:!!report.historicalRegressionEvidence?.length});
report.observations.push({severity:'gameplay-constraint',behavior:'Synchronized walking and repeated held jumps do not solve the first stair or reach the key within 20 simulated seconds for any population. The team needs coordinated support/switch/spring actions; no fairness or fun conclusion follows from this stress script.',evidence:report.cases.filter(c=>c.name==='spawn crowd, synchronized walking and held jumps').map(c=>({count:c.count,keyTaken:c.evidence?.keyTaken,status:c.evidence?.terminalStatus,warpEvents:c.evidence?.warpEvents}))});
report.observations.push({severity:'validation-limit',behavior:'Goal queue is tested only after fixture-opening the goal. Warp and tower tests place players on original terrain. Neither proves that all eight players can complete the original route. Native timing, source contact fidelity, and human coordination remain unverified.'});
report.summary={total:report.cases.length,passed:report.cases.filter(c=>c.passed).length,failed:report.cases.filter(c=>!c.passed).length,scope:'2..8 population simulation, actual spawn-input stress, and explicitly placed original-terrain mechanic fixtures. No complete key-to-goal route or human fun assessment.'};
fs.writeFileSync(path.join(__dirname,'population-review-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
for(const c of report.cases.filter(c=>!c.passed))console.error(c.count,c.name,c.error);
process.exitCode=report.summary.failed?1:0;
