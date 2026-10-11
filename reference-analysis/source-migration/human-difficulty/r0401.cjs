'use strict';
// 4-1 (2/4 players): one Bridge "door" under the first pillar closes 1 px/tick once the key is
// taken; the holder stands half under it, the getter slides in beside the holder, then both leave.
const {Game,Halt,walkTo,jump,enter,until}=require('./hd-kit.cjs');
function* steerJump(g,i,x,o={}){yield* jump(g,i,{hold:14,steerTo:x,tol:2,...o});}
function run(stage,count,{noise=null,seed=1,mode='online',trace=false,holderX=962}={}){
 const g=new Game(stage,count,{noise,seed,mode,maxTicks:60*120});
 const marks=[];const m=n=>{marks.push({name:n,t:+(g.t/60).toFixed(2)});if(trace)console.log(n,(g.t/60).toFixed(2),g.players.map(p=>Math.round(p.x)+','+Math.round(p.y)).join(' '));};
 const door=g.s.bridgeState.bridges[0];
 const go=(tasks)=>{if(mode==='local'){for(const [i,t] of Object.entries(tasks))g.solo(+i,t);}else g.together(tasks,{max:60*60});};
 try{
  g.idle(2);
  const n=count,K=n-1,H=n-2; // rightmost spawn fetches, next one holds
  // climb: step block (864,384) then the platform (960,336)
  const climb=i=>(function*(){yield* walkTo(g,i,820,{tol:2});yield* steerJump(g,i,880);yield* walkTo(g,i,898,{tol:1.5,noJitter:true});yield* jump(g,i,{hold:14,dir:1,maxAir:12});yield* steerJump(g,i,975);})();
  // getter goes first (the holder would block the one-lane passage), waits short of the key
  go({[K]:(function*(){yield* climb(K);yield* walkTo(g,K,1300,{tol:2});})(),[H]:walkTo(g,H,700,{tol:2})});
  go({[H]:(function*(){yield* climb(H);yield* walkTo(g,H,holderX,{tol:1});})()});m('holder in place');
  go({[K]:(function*(){yield* walkTo(g,K,1370,{tol:2});yield* steerJump(g,K,1376);})()});
  if(!g.s.keyTaken)throw new Halt('no key');m('key');
  // getter slides under the door beside the holder (door is stopped at the holder's head)
  go({[K]:walkTo(g,K,holderX+32,{tol:0.6,noJitter:true})});m('getter under door');
  // holder leaves, getter follows; both drop to the floor
  go({[H]:walkTo(g,H,700,{tol:2})});go({[K]:walkTo(g,K,760,{tol:2})});m('out');
  // to the goal through the low corridor: hop the 48 px step, drop into the gap, walk under the ledge
  const finish=i=>(function*(){const p=g.P(i);
   for(let k=0;k<60*30&&!(p.x>1480&&p.y>380);k++){
    const atStep=p.grounded&&p.y>380&&p.x>820&&p.x<840;
    if(atStep&&!p.jump){for(let q=0;q<14;q++)yield {right:true,jump:true};continue;}
    yield {right:true};}
   yield* enter(g,i,{max:60*20});})();
  const order=[...Array(n).keys()].sort((a,b)=>g.P(b).x-g.P(a).x);
  if(mode==='local'){for(const i of order)g.solo(i,finish(i));}
  else{const tasks={};order.forEach((i,k)=>tasks[i]=(function*(){for(let q=0;q<k*25;q++)yield {};yield* finish(i);})());g.together(tasks,{max:60*60});}
  m('end');
  return g.result({marks,door:{y:door.y,h:door.h}});
 }catch(e){if(e instanceof Halt){m('halt '+e.message);return g.result({halt:e.message,marks});}throw e;}
}
module.exports={run};
if(require.main===module)for(const n of [2,4])for(const mode of ['online','local']){const r=run('st_w_04_01',n,{mode,trace:true});console.log(n,mode,r.status,r.seconds,r.failure?JSON.stringify(r.failure):'',r.halt||'',r.where);}
