'use strict';
const assert=require('node:assert/strict'),E=require('../coop-engine.js');
assert.equal(E.REFERENCE_COUNT,2);
function harness(count,level){
 const ids=Array.from({length:count},(_,i)=>String(i));let s=E.create(ids,level,{reference:true});
 const tick=(input={},n=1)=>{for(let f=0;f<n;f++)E.step(s,input)};
 const walk=(id,x)=>{const p=s.players.find(p=>p.id===id);for(let f=0;f<500&&Math.abs(p.x-x)>4&&s.status==='play';f++)tick({[id]:{right:p.x<x,left:p.x>x}});assert(s.status==='clear'||Math.abs(p.x-x)<=4,`walk ${id}->${x}, at ${p.x},${p.y}`);};
 const climb=(id,plat)=>{const p=s.players.find(p=>p.id===id),support=s.map.platforms.concat(s.map.crates,s.players.filter(q=>q!==p)).find(q=>Math.abs(q.y-p.y-p.h)<1.1&&p.x<q.x+q.w&&p.x+p.w>q.x);assert(support,'climb support');walk(id,Math.min(plat.x-p.w-5,support.x+support.w-6));tick({},2);tick({[id]:{jump:true}});let frames=0;while(p.y+p.h>plat.y&&frames++<30)tick();while(p.x<plat.x+10&&frames++<60)tick({[id]:{right:true}});tick({},50);assert.equal(p.y+p.h,plat.y,`climb ${id} onto ${plat.x},${plat.y} from ${p.x},${p.y}`);};
 const saveRestore=()=>{s=JSON.parse(JSON.stringify(s));};
 return {ids,get s(){return s},tick,walk,climb,saveRestore};
}
const reports=[];
for(const count of [2,4,8])for(const level of [0,1]){
 const h=harness(count,level),{ids,tick,walk,climb}=h;tick({},30);
 if(level===0){
  walk('1',318);climb('0',h.s.players[1]);climb('0',h.s.map.platforms[3]);walk('0',430);tick({},3);
  assert(h.s.map.devices[0].active,'leader holds bridge');
  for(const id of ids.slice(1))walk(id,810);
  assert(h.s.players.slice(1).every(p=>p.x>=760),'followers actually crossed');
  h.saveRestore();assert(h.s.reference);tick({},3);assert(h.s.map.devices[0].active,'bridge survives host serialization');
  walk('0',575);tick({'0':{jump:true,right:true}});tick({'0':{right:true}},60);tick({},40);
  assert(!h.s.map.devices[0].active,'bridge disappears on release');assert(h.s.players[0].x>=760,'leader rejoins');
  for(const id of ids){
   walk(id,930);let f=0;while(h.s.players[Number(id)].y+38>351&&f++<800)tick();
   assert(f<800,'lift carries rider to upper stop');walk(id,1080);tick({[id]:{jump:true}});tick({},50);walk(id,1130);tick({},30);
  }
 }else{
  walk('1',308);climb('0',h.s.players[1]);climb('0',h.s.map.platforms[1]);walk('0',480);tick({},3);
  assert(h.s.map.devices[0].active,'upper teammate opens lower route');assert(!h.s.map.devices[1].active,'upper route still needs delivery');
  walk('1',780);tick({},3);assert(h.s.map.devices[1].active,'lower box unlocks upper route');
  for(const id of ids.slice(2))walk(id,750);
  h.saveRestore();walk('0',945);tick({},50);climb('0',h.s.map.platforms[3]);walk('0',1060);tick({'0':{jump:true}});tick({},50);walk('0',1140);
  assert(!h.s.map.devices[0].active,'pressure gate closes after upper teammate leaves');
  assert(h.s.map.devices[1].active,'delivery latch survives release and serialization');
  for(const id of ids.slice(1)){climb(id,h.s.map.crates[0]);walk(id,893);tick({},50);climb(id,h.s.map.platforms[2]);climb(id,h.s.map.platforms[3]);walk(id,1140);tick({},30);}
 }
 assert.equal(h.s.status,'clear',`${count}p reference ${level+1}`);reports.push({count,level:level+1,ticks:h.s.ticks});
}
console.log(JSON.stringify(reports));
console.log('PASS 2/4/8-player input-only reference routes, pressure release, delivery latch and JSON host restore. No audio. Geometry and physics are original prototype values, not measured original-game values.');
