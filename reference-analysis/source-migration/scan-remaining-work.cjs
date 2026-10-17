'use strict';
// Regenerates remaining-work.json: for every unconnected PP2 World stage, which
// actor types the port still has no handler for, per player count.
//
// Two traps this script exists to avoid, both of which produced a WRONG ranking
// before it was written:
//
// 1. Reading stageInitParamList[0]. A stage can ship several variants and the
//    live one depends on the player count (population-rules.selectVariant).
//    st_w_10_01's two variants author different ready windows, and a stage whose
//    needPlayerCount is 5 falls back to a different actor list below 5 players.
// 2. Ranking by what compile() throws. Device modules run before the
//    unsupported-type check in source-stage-runtime.js, so a guard that trips
//    first HIDES the unsupported list behind it. st_w_07_03 looked like "one
//    Bridge guard away" when it actually needs three more devices.
//
// Run: node reference-analysis/source-migration/scan-remaining-work.cjs
const fs=require('node:fs'),path=require('node:path');
const pop=require('./population-rules.cjs');
const base=__dirname;

// Types the stage runtime handles itself, copied from the `supported` set in
// source-stage-runtime.js compile(). Keep the two in step.
const BUILT_IN=['Player','Key','Goal','Warp','MapRect','TopViewMapRect','JumpStand','DeadSwitch',
 'JumpStandMediator','Switch','DelaySwitch','Rect','DashBoard','FallingWall'];
const MODULES=['source-devices-runtime.js','source-gate-devices.js','source-bridge-devices.js',
 'source-blink-devices.js','source-blinkthunder-devices.js','source-warpinit-devices.js',
 'source-switchtimer-devices.js','source-enemy-devices.js','source-thorn-ceiling-devices.js',
 'source-countup-devices.js','source-lift-devices.js','source-landmine-devices.js','source-pole-devices.js','source-wind-devices.js','source-linepath-devices.js','source-text-devices.js','source-coin-devices.js','source-checkpoint-devices.js','source-touchenergy-devices.js',
 'source-boundballpitcher-devices.js','source-ballkeybox-devices.js','source-blackout-devices.js','source-dossun-devices.js','source-searchlight-devices.js','source-linepathgear-devices.js','source-updownlift-devices.js','source-playerwarpgun-devices.js','source-breakablerect-devices.js','source-playermagnet-devices.js','source-colorbox-devices.js','source-gear-devices.js','source-switchtargetgroup-devices.js','source-sinelift-devices.js','source-ghost-devices.js','source-topviewplayer-devices.js','source-distanceconstraint-devices.js','source-batenemy-devices.js','source-capturing-devices.js','source-stepenemy-devices.js','source-halfinput-devices.js','source-frontswitch-devices.js','source-gokart-runtime.js','source-rally-runtime.js','source-fake-runtime.js','source-apple-runtime.js','source-arrangement-runtime.js','source-giant-runtime.js','source-mole-runtime.js','source-throwball-runtime.js','source-plane-runtime.js','source-planeobstacle-runtime.js','source-shooting-runtime.js','source-graph-runtime.js','source-danmaku-runtime.js','source-boss-runtime.js'];

const supported=new Set(BUILT_IN);
for(const file of MODULES)for(const type of require(path.join(base,file)).supportedTypes||[])supported.add(type);

const Runtime=require('./source-stage-runtime.js');
const source=JSON.parse(fs.readFileSync(path.join(base,'installed-stage-decoded.local.json'),'utf8'));
const geometry=JSON.parse(fs.readFileSync(path.join(base,'source-geometry.local.json'),'utf8'));
const connected=JSON.parse(fs.readFileSync(path.join(base,'play','catalogue.json'),'utf8')).stages.map(s=>s.id);

const stages=[];
for(const stage of source.stages||source){
 const id=stage.id||stage.stageId;
 if(!/^st_w_/.test(id))continue;
 const list=stage.json.stageInitParamList;
 const blockers=new Set(),perCount={},guards=new Set();
 for(let count=2;count<=8;count++){
  const variant=pop.selectVariant(list,count,true);
  if(!variant){perCount[count]={variant:null,missing:['(no eligible stage variant)']};blockers.add('(no eligible stage variant)');continue;}
  const missing=[...new Set(pop.actorsForCount(variant,count).map(a=>a.typeName).filter(t=>!supported.has(t)))];
  missing.forEach(t=>blockers.add(t));
  perCount[count]={variant:variant.createIndex,missing};
  // A stage with every type handled can still be refused by a module guard.
  if(!missing.length){
   try{Runtime.compile({source,geometry,count,stageId:id});}
   catch(e){guards.add(e.message);}
  }
 }
 stages.push({id,connected:connected.includes(id),
  distinctBlockers:[...blockers].sort(),blockerCount:blockers.size,
  guardsAfterTypes:[...guards],perCount});
}

const open=stages.filter(s=>!s.connected);
const byBlockerCount=[...open].sort((a,b)=>a.blockerCount-b.blockerCount||a.id.localeCompare(b.id));
const typeToStages={};
for(const s of open)for(const t of s.distinctBlockers)(typeToStages[t]=typeToStages[t]||[]).push(s.id);
// What each single type would open on its own: a stage whose only remaining
// blocker is that type. This is the number that actually matters.
const opensAlone=Object.entries(typeToStages).map(([type,ids])=>({type,
 stages:ids,appearsIn:ids.length,
 opensAlone:open.filter(s=>s.blockerCount===1&&s.distinctBlockers[0]===type).map(s=>s.id)}))
 .sort((a,b)=>b.opensAlone.length-a.opensAlone.length||b.appearsIn-a.appearsIn);

const report={
 schemaVersion:2,
 generated:new Date().toISOString().slice(0,10),
 generator:'reference-analysis/source-migration/scan-remaining-work.cjs',
 note:'Per player count, using the same variant selection the runtime uses. blockerCount is the number of distinct unsupported actor types across counts 2..8; guardsAfterTypes lists module guards that still refuse a stage whose types are all handled.',
 connectedRounds:connected,
 worldStages:stages.length,
 remainingStages:open.length,
 remainingDistinctBlockers:Object.keys(typeToStages).length,
 nearest:byBlockerCount.slice(0,12).map(s=>({id:s.id,blockerCount:s.blockerCount,blockers:s.distinctBlockers,guardsAfterTypes:s.guardsAfterTypes})),
 byType:opensAlone,
 stages
};
fs.writeFileSync(path.join(base,'remaining-work.json'),JSON.stringify(report,null,1));
console.log(JSON.stringify({connected:connected.length,remaining:open.length,
 distinctBlockers:report.remainingDistinctBlockers,
 nearest:report.nearest.slice(0,6).map(s=>s.id+'('+s.blockerCount+')')}));
