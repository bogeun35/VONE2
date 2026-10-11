'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=require('./source-stage-runtime.js'),D=require('./source-devices-runtime.js');
const dir=__dirname;
function run(count){
 const c=JSON.parse(fs.readFileSync(path.join(dir,'play/data/st_w_01_02',count+'.json'))),s=R.create(c),milestones=[],commands=[];
 const box=s.deviceState.devices.find(d=>d.type==='PushBox');let overlaps=0;
 function step(inputs={}){if(s.status!=='play')return;R.step(s,inputs);const last=commands.at(-1);if(last&&JSON.stringify(last.inputs)===JSON.stringify(inputs))last.frames++;else commands.push({frames:1,inputs});for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(!s.players[i].exit&&!s.players[j].exit&&R.overlap(s.players[i],s.players[j]))overlaps++;}
 function mark(name){milestones.push({name,tick:s.ticks,status:s.status,keyTaken:s.keyTaken,box:{x:box.x,y:box.y,pushCount:box.pushCount},players:s.players.map(({id,x,y,exit})=>({id,x,y,exit}))});}
 function idle(n=30){for(let i=0;i<n;i++)step();}
 // Launch count-1 people onto the source upper ledge; line them against the box.
 for(let k=0;k<count-1;k++){
  const p=s.players[k];for(let t=0;t<250&&p.x>86;t++)step({[p.id]:{left:true}});step();
  for(let t=0;t<100;t++)step({[p.id]:{left:p.y>130&&p.x>54,right:p.y<98&&p.x<140,jump:t<14}});
  for(let t=0;t<150;t++)step({[p.id]:{right:p.x<392-k*32}});
 }
 mark('source spring launches push team onto ledge');
 const push=Object.fromEntries(s.players.slice(0,count-1).map(p=>[p.id,{right:true}]));
 for(let t=0;t<200&&box.x<538;t++)step(push);
 const boxPushed=box.x>=538;mark('required population pushes box off ledge');
 for(let k=0;k<count;k++){
  const p=s.players[k];for(let t=0;t<1000&&p.x<2000-k*32&&s.status==='play';t++)step({[p.id]:{right:true,jump:p.x<600&&(p.grounded?!p.jump:p.jumpFrame>0)}});
 }
 idle();mark('scout triggers falling thorns, followers cross after disappearance');
 const corridorCrossed=s.players.every(p=>p.x>1750),thornsConsumed=s.deviceState.devices.filter(d=>d.type==='Thorn'&&!d.active).length;
 const base=s.players[0],top=s.players[1];
 for(let t=0;t<100&&base.x<2100;t++)step({[base.id]:{right:true}});
 for(let t=0;t<100&&top.x<base.x-32;t++)step({[top.id]:{right:true}});
 step();for(let t=0;t<45;t++)step({[top.id]:{right:top.x<base.x,jump:t<14}});idle();
 step();for(let t=0;t<45;t++)step({[top.id]:{jump:t<14}});idle();mark('two-player tower reaches original elevated key');
 for(let k=1;k>=0;k--){const p=s.players[k];for(let t=0;t<240&&!p.exit;t++)step({[p.id]:{right:true,up:true}});}
 for(let k=2;k<count;k++){const p=s.players[k];for(let t=0;t<300&&!p.exit;t++)step({[p.id]:{right:true,up:true}});}
 mark('individual goal entry');
 const replay=R.create(c);for(const cmd of commands)for(let i=0;i<cmd.frames;i++)R.step(replay,cmd.inputs);
 const determinism=JSON.stringify(replay)===JSON.stringify(s);
 return {count,inputOnly:true,manualPositionChanges:false,boxPushed,corridorCrossed,thornsConsumed,keyTaken:s.keyTaken,clear:s.status==='clear',status:s.status,failure:s.failure,deaths:s.deaths,activeOverlapTicks:overlaps,deterministicReplay:determinism,ticks:s.ticks,milestones,commands};
}
function main(){const trials=Array.from({length:7},(_,i)=>run(i+2));for(const t of trials){assert.ok(t.boxPushed);assert.ok(t.corridorCrossed);assert.equal(t.thornsConsumed,25);assert.ok(t.deterministicReplay);assert.ok(t.clear);assert.ok(t.keyTaken);assert.equal(t.deaths,0);assert.equal(t.activeOverlapTicks,0);}
 const eight=trials.find(t=>t.count===8),danger=R.create(JSON.parse(fs.readFileSync(path.join(dir,'play/data/st_w_01_02/8.json'))));
 const pushEnd=eight.milestones.find(m=>m.name==='required population pushes box off ledge').tick;
 for(const cmd of eight.commands){for(let i=0;i<cmd.frames&&danger.ticks<pushEnd;i++)R.step(danger,cmd.inputs);if(danger.ticks>=pushEnd)break;}
 const rush=Object.fromEntries(danger.players.slice(0,7).map(p=>[p.id,{right:true}]));
 for(let i=0;i<450&&danger.status==='play';i++)R.step(danger,rush);
 assert.equal(danger.status,'dead');assert.equal(danger.deaths,1);
 const report={schemaVersion:1,stage:'st_w_01_02',testsMuted:true,originalFidelityVerified:false,humanFunVerified:false,dangerTrial:{count:8,inputOnly:true,policy:'Seven players rush immediately after pushing box off ledge',status:danger.status,deaths:danger.deaths,failure:danger.failure,meaning:'Close-following crowd is hit by scout-triggered falling thorn; staggered successful route is meaningfully different'},trials:trials.map(({commands,...r})=>r)};
 fs.writeFileSync(path.join(dir,'stage02-route-review-report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'stage02-input-replay.json'),JSON.stringify({schemaVersion:1,stage:'st_w_01_02',count:8,commands:eight.commands,scope:'Complete input-only source01-02: natural spawn, cooperative box, falling thorn corridor, key and individual goal entry',fullRouteVerified:true,placementsUsed:false,stateMutationUsed:false,fixtureFlagsUsed:false,milestones:eight.milestones,terminalStatus:'clear'})+'\n');
 console.log(JSON.stringify(trials.map(({count,clear,keyTaken,status,failure,deaths,activeOverlapTicks,ticks})=>({count,clear,keyTaken,status,failure,deaths,activeOverlapTicks,ticks})),null,2));return report;}
if(require.main===module)main();module.exports={run};
