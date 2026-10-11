'use strict';
// Open-loop human noise on a recorded 8-player input route (whole-route-input-replay.json rounds[]).
// Per player and key, every press/release is moved by jitter ticks; an action that starts after
// >= 20 idle ticks is delayed by a reaction time and the rest of that player's inputs shift with
// it; a wrong key is occasionally inserted at an action start.
const fs=require('fs'),path=require('path');
const R=require('../source-stage-runtime.js');const {mulberry}=require('./hd-kit.cjs');
const KEYS=['left','right','jump','up'];
function expand(round){
 const ids=Array.from({length:round.count},(_,i)=>'p'+(i+1));
 const T=round.commands.reduce((n,c)=>n+c.frames,0);
 const tl=Object.fromEntries(ids.map(id=>[id,new Uint8Array(T)]));
 let t=0;for(const c of round.commands){for(let f=0;f<c.frames;f++,t++)for(const [id,v] of Object.entries(c.inputs||{})){let m=0;KEYS.forEach((k,b)=>{if(v[k])m|=1<<b;});tl[id][t]=m;}}
 return {ids,T,tl};
}
function perturb({ids,T,tl},{jitter=0,reaction=null,wrongRate=0,seed=1}){
 const r=mulberry(seed);const ri=(a,b)=>a+Math.floor(r()*(b-a+1));
 const out={};let wrong=0;
 for(const id of ids){
  const src=tl[id],dst=new Uint8Array(T+400);
  // segment the timeline into runs of identical masks; shift run boundaries
  const runs=[];let s=0;for(let t=1;t<=T;t++)if(t===T||src[t]!==src[s]){runs.push({start:s,end:t,mask:src[s]});s=t;}
  let shift=0,idle=0;
  const placed=[];
  for(const run of runs){
   if(run.mask===0){idle+=run.end-run.start;placed.push({start:run.start+shift,end:run.end+shift,mask:0});continue;}
   if(reaction&&idle>=20)shift+=ri(reaction[0],reaction[1]);
   idle=0;
   const j=jitter?ri(-jitter,jitter):0;
   let st=Math.max(0,run.start+shift+j),en=Math.max(st+1,run.end+shift+(jitter?ri(-jitter,jitter):0));
   if(wrongRate&&r()<wrongRate){wrong++;const n=ri(4,10),kind=r();const wm=kind<0.5?((run.mask&1)?2:(run.mask&2)?1:2):kind<0.75?4:(run.mask|0);placed.push({start:st,end:st+n,mask:wm,wrong:true});st+=n;en+=n;shift+=n;}
   placed.push({start:st,end:en,mask:run.mask});
  }
  for(const p of placed)for(let t=p.start;t<Math.min(p.end,dst.length);t++)dst[t]=p.mask;
  out[id]=dst;
 }
 return {tl:out,T:T+400,wrong};
}
function play(stage,count,tlObj){
 const c=JSON.parse(fs.readFileSync(path.join(__dirname,'..','play','data',stage,count+'.json'),'utf8'));const s=R.create(c);
 for(let t=0;t<tlObj.T&&s.status==='play';t++){const inputs={};for(const [id,a] of Object.entries(tlObj.tl)){const m=a[t];if(m){const v={};KEYS.forEach((k,b)=>{if(m&(1<<b))v[k]=true;});inputs[id]=v;}}R.step(s,inputs,1/60);}
 return {status:s.status,ticks:s.ticks,failure:s.failure,exited:s.players.filter(p=>p.exit).length};
}
module.exports={expand,perturb,play};
if(require.main===module){
 const rec=JSON.parse(fs.readFileSync(path.join(__dirname,'..','play','whole-route-input-replay.json'),'utf8'));
 const N=+process.argv[2]||20;
 const variants=[['exact',{}],['jitter1',{jitter:1}],['jitter3',{jitter:3}],['human',{jitter:3,reaction:[9,15],wrongRate:0.03}]];
 const out=[];
 for(const round of rec.rounds){
  if(round.status!=='clear'){out.push({stage:round.stage,count:round.count,recorded:round.status});console.log(round.stage,'not recorded');continue;}
  const e=expand(round);const row={stage:round.stage,count:round.count,recordedTicks:round.ticks};
  for(const [name,opt] of variants){
   const trials=name==='exact'?1:N;let ok=0,dead=0,exitedSum=0;const reasons={};
   for(let k=1;k<=trials;k++){const res=play(round.stage,round.count,perturb(e,{...opt,seed:k}));if(res.status==='clear')ok++;else{if(res.status==='dead'){dead++;reasons[res.failure?.reason||'?']=(reasons[res.failure?.reason||'?']||0)+1;}}exitedSum+=res.exited;}
   row[name]={trials,cleared:ok,dead,avgExited:+(exitedSum/trials).toFixed(1),deaths:reasons};
  }
  out.push(row);console.log(JSON.stringify(row));
 }
 fs.writeFileSync('openloop-results.json',JSON.stringify({recordedAt:rec.recordedAt,runtimeSha256:rec.runtimeSha256,rows:out},null,1));
}
