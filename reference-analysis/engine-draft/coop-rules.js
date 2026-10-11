(function(root){
'use strict';
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function update(s){
 const rules=s.rules||(s.rules={signals:{},latches:{}});rules.signals={};
 s.map.switches.forEach((sw,i)=>{if(sw.signal)rules.signals[sw.signal]=!!rules.signals[sw.signal]||!!s.switchActive[i]});
 for(const d of s.map.devices||[]){
  if(d.kind==='lift')continue;
  const input=!!rules.signals[d.signal];if(d.mode==='latch'&&input)rules.latches[d.id]=true;
  const wanted=d.mode==='latch'?!!rules.latches[d.id]:input;
  d.blocked=d.kind==='gate'&&!wanted&&s.players.concat(s.map.crates).some(p=>overlaps(p,d));
  d.active=wanted||d.blocked;
 }
}
function solids(s){return (s.map.devices||[]).filter(d=>d.kind==='lift'||(d.kind==='gate'?!d.active:d.active));}
function movePlatforms(s,dt,fixed){
 for(const d of s.map.devices||[]){
  if(d.kind!=='lift')continue;
  const bodies=s.players.concat(s.map.crates),riders=[];
  const supported=(p,b)=>Math.abs(p.y+p.h-b.y)<1.1&&p.x<b.x+b.w&&p.x+p.w>b.x;
  // Include people standing on other riders, not only those directly on the platform.
  for(let pass=0;pass<bodies.length;pass++)for(const p of bodies)if(!riders.includes(p)&&(supported(p,d)||riders.some(r=>supported(p,r))))riders.push(p);
  const direction=d.direction||-1,target=direction<0?d.toY:d.fromY;
  let delta=direction*Math.min(Math.abs(target-d.y),d.speed*dt);
  if(Math.abs(target-d.y)<.001){d.direction=-direction;continue;}
  d.blocked=riders.some(p=>fixed.some(w=>w!==d&&overlaps({...p,y:p.y+delta},w))||bodies.some(b=>!riders.includes(b)&&overlaps({...p,y:p.y+delta},b)));
  if(d.blocked)delta=0;
  d.y+=delta;for(const p of riders)p.y+=delta;
 }
}
const api={update,solids,movePlatforms};if(typeof module!=='undefined')module.exports=api;root.CoopRules=api;
})(typeof window!=='undefined'?window:globalThis);
