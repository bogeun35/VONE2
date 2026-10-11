'use strict';
// 4-4: BlinkThunder lasers, 3.0 s on / 0.9 s off, all in phase.
// Route: every crossing is "approach next to the beam while it is on" (10 px margin)
// then "dash across while it is off" (perWindow beams per window).
const {Game,Halt,walkTo,enter}=require('./hd-kit.cjs');
const lasersOn=g=>g.s.blinkThunderState.thunders[0].visible;
function geometry(g){
 const vertical=g.s.blinkThunderState.thunders.filter(t=>t.direction===1).map(t=>t.x).sort((a,b)=>a-b);
 const split=vertical.findIndex((x,k)=>k>0&&x-vertical[k-1]>150);
 return {beams:vertical,left:vertical.slice(0,split),right:vertical.slice(split)};
}
const crossed=(beams,x0,x1)=>beams.filter(b=>Math.min(x0,x1)<b+2&&Math.max(x0,x1)+32>b-2).length;
const MARGIN=10;
const before=b=>b-2-32-MARGIN,after=b=>b+2+MARGIN;

function run(stage,count,{noise=null,seed=1,mode='online',perWindow=1,trace=false}={}){
 const g=new Game(stage,count,{noise,seed,mode});const G=geometry(g);
 let windows=0,minMargin=Infinity,stopsRef=[];
 try{
  g.idle(2);
  const n=count,key=g.s.map.key,kc=key.x+16;
  const lo=G.left.at(-1)+2+MARGIN,hi=G.right[0]-2-32-MARGIN;
  const rowEnd=Math.max(...g.s.motionState.rects.filter(r=>r.x<G.right[0]&&r.x>0).map(r=>r.x+r.w));
  const floorTop=g.s.map.height-48-46;
  const ids=[...Array(n).keys()];
  const keyGetter=ids.slice().sort((a,b)=>(g.P(b).y-g.P(a).y)||(g.P(b).x-g.P(a).x))[0];
  const stops=ids.map(i=>{
   const p=g.P(i),list=[];
   for(const b of G.left.filter(b=>b+2>p.x+1))list.push(before(b),after(b));
   list.push('drop');
   if(i===keyGetter){
    const back=G.left.filter(b=>b>kc).reverse();
    for(const b of back)list.push(after(b),before(b));
    for(const b of back.slice().reverse())list.push(before(b),after(b));
   }
   list.push('stage');
   for(const b of G.right)list.push(before(b),after(b));
   list.push('wait','goal');
   return {i,list,k:0};
  });
  stopsRef=stops;const stageTaken=new Set();
  const resolve=(s,x)=>{
   if(x==='drop'){const me=g.P(s.i);if(me.y>=floorTop-5)return me.x;const dx=rowEnd+12;
    const kg=g.P(keyGetter);if(s.i!==keyGetter&&!g.s.keyTaken&&kg.y<floorTop-5)return null;
    if(g.players.some((q,j)=>j!==s.i&&!q.exit&&q.x<dx+42&&q.x+32>dx-10))return null;return dx;}
   if(x==='stage'){if(s.i===keyGetter)return Math.max(lo,rowEnd+3);
    // rightmost free floor spot; players still on rows wait when none is free
    const me=g.P(s.i);if(me.y<floorTop-5||!me.grounded)return null;if(me.x>=rowEnd+52)return me.x;
    for(let xx=hi;xx>=rowEnd+52;xx-=34){if(!g.players.some((q,j)=>j!==s.i&&!q.exit&&q.y>=floorTop-60&&q.x<xx+33&&q.x+32>xx-1)&&!stageTaken.has(xx))return xx;}
    return null;}
   if(x==='wait'){const me=g.P(s.i);const wallX=g.s.map.width-48-32-2;
    for(let xx=wallX;xx>=G.right.at(-1)+2+MARGIN;xx-=34){if(!g.players.some((q,j)=>j!==s.i&&!q.exit&&q.x<xx+33&&q.x+32>xx-1&&q.y>=floorTop-60))return xx;}
    return null;}
   if(x==='goal')return g.s.map.exit.x+8;
   return x;
  };
  const freeFor=(s,x,res)=>{const p=g.P(s.i),a=x>p.x?p.x+1:x-1,b=x>p.x?x+33:p.x+31;
   return !g.players.some((q,j)=>j!==s.i&&!q.exit&&Math.abs(q.y-p.y)<44&&q.x<b&&q.x+32>a)&&!res.some(r=>Math.abs(r.y-p.y)<44&&r.a<b&&r.b>a);};
  const pending=s=>s.k<s.list.length&&!g.P(s.i).exit;
  const runTasks=tasks=>{const gx=g.s.map.exit.x+8;const ids=Object.keys(tasks).sort((a,b)=>Math.abs(g.P(+a).x-gx)-Math.abs(g.P(+b).x-gx));if(!ids.length)return;
   if(mode==='local'){for(const id of ids)g.solo(+id,tasks[id]);}else g.together(tasks,{max:60*20});};
  const front=()=>stops.filter(pending).sort((a,b)=>g.P(b.i).x-g.P(a.i).x);
  for(let loop=0;loop<400&&g.players.some(p=>!p.exit);loop++){
   // 1) free moves while lasers are on (no beam on the path) + goal entry
   for(let pass=0;pass<6;pass++){
    const tasks={},res=[];let rowMover=false;const floorTop=g.s.map.height-48-46;
    for(const s of front()){
     const p=g.P(s.i),raw=s.list[s.k];
     if(g.players.some(q=>q.supportId===p.id&&!q.exit))continue;
     // standing on a teammate: step off to whichever side has no beam within reach
     if(p.supportId&&String(p.supportId).startsWith('p')&&p.grounded){const opts=[p.x+40,p.x-40].filter(x=>!crossed(G.beams,p.x,x)&&x>30&&x<g.s.map.width-90);if(opts.length&&!tasks[s.i]){tasks[s.i]=walkTo(g,s.i,opts[0],{tol:3,noJitter:true});continue;}}
     const onRow=p.y<floorTop-5;
     if(raw==='goal'){if(g.s.keyTaken&&p.x>G.right.at(-1)){tasks[s.i]=enter(g,s.i);s.k++;}continue;}
     if(raw==='wait'&&g.s.keyTaken){s.k++;continue;}
     const x=resolve(s,raw);if(x===null)continue;
     if(Math.abs(p.x-x)<=12&&p.grounded&&crossed(G.beams,p.x,x)===0&&pass>0){s.k++;continue;}
     if(crossed(G.beams,p.x,x))continue;
     if(onRow&&rowMover)continue;
     if(!freeFor(s,x,res))continue;
     if(onRow)rowMover=true;
     res.push({a:Math.min(p.x,x),b:Math.max(p.x,x)+32,y:p.y});
     tasks[s.i]=walkTo(g,s.i,x,{tol:1.5});s.k++;
    }
    if(!Object.keys(tasks).length)break;
    runTasks(tasks);
    if(!lasersOn(g))break;
   }
   if(!g.players.some(p=>!p.exit))break;
   // 2) window: crossing moves
   g.waitUntil(g=>!lasersOn(g));windows++;
   const winEnd=g.t+Math.round(g.s.blinkThunderState.thunders[0].timer*60);
   const tasks={},res=[];let movers=0;
   for(const s of front()){
    if(mode==='local'&&movers>=1)break;
    const p=g.P(s.i);if(g.players.some(q=>q.supportId===p.id&&!q.exit))continue;let k=s.k,x=null,c=0,from=p.x;
    while(k<s.list.length&&s.list[k]!=='goal'&&s.list[k]!=='wait'){
     const xx=resolve(s,s.list[k]);if(xx===null)break;const cc=crossed(G.beams,from,xx);
     if(x===null&&cc===0)break;
     if(cc===0){// a free stop: only worth taking if another crossing fits after it
      const nx=s.list[k+1];if(c>=perWindow||nx===undefined||nx==='goal')break;const nxx=resolve(s,nx);if(nxx===null||!crossed(G.beams,xx,nxx)||c+crossed(G.beams,xx,nxx)>perWindow)break;from=xx;k++;continue;}
     if(c+cc>perWindow)break;
     x=xx;c+=cc;from=xx;k++;
    }
    if(x===null)continue;
    if(!freeFor(s,x,res))continue;
    res.push({a:Math.min(p.x,x),b:Math.max(p.x,x)+32,y:p.y});movers++;
    const target=x,id=s.i;s.k=k;
    tasks[id]=(function*(){const r=g.reactTicks();for(let q=0;q<r;q++)yield {};yield* walkTo(g,id,target,{tol:1.5});})();
   }
   if(mode==='local'){const ids=Object.keys(tasks);if(ids.length){g.selected=+ids[0];g.together(tasks,{max:60*10});}}
   else runTasks(tasks);
   minMargin=Math.min(minMargin,winEnd-g.t);
   if(trace)console.log('win',windows,'t',g.t,'marginTicks',winEnd-g.t,g.players.map(p=>Math.round(p.x)+(p.exit?'E':'')).join(','));
   g.waitUntil(g=>lasersOn(g));
  }
  if(process.env.DBG)for(const s of stops)if(!g.P(s.i).exit)console.log("stuck",s.i,s.k,JSON.stringify(s.list.slice(Math.max(0,s.k-2),s.k+3)));
  return g.result({windows,keyGetter:'p'+(keyGetter+1),minWindowMarginTicks:minMargin});
 }catch(e){if(e instanceof Halt){if(process.env.DBG)for(const s of stopsRef)if(!g.P(s.i).exit)console.log("stuck",s.i,s.k,s.list.length,JSON.stringify(s.list.slice(Math.max(0,s.k-2),s.k+3)));return g.result({halt:e.message,windows,minWindowMarginTicks:minMargin});}throw e;}
}
module.exports={run};
if(require.main===module){
 const only=process.argv[2];
 for(const n of only?[+only]:[2,4,8])for(const mode of ['online','local'])for(const perWindow of [1,2]){const r=run('st_w_04_04',n,{mode,perWindow,trace:!!process.argv[3]});console.log(n,mode,'perWin',perWindow,r.status,r.seconds,r.failure?JSON.stringify(r.failure):'',r.halt||'',r.where,'windows',r.windows,'switches',r.switches,'minMargin',r.minWindowMarginTicks);}
}
