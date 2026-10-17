'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('./source-arrangement-runtime.js'),R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const acts=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_03_04'}));
// Copy the shown dummies onto the right half every update of the arrange phase.
function arrange(s,{wrongFacing=-1}={}){const st=s.arrangeState,a=st.arrangement,shift=a.rightRaw-a.leftRaw;
 st.dummies.filter(d=>d.shown).forEach((d,k)=>{const p=s.players[d.playerIndex];p.x=(d.xRaw+shift)/F-16;p.y=d.yRaw/F-47;p.vx=p.vy=0;p.lookingRight=(d.dir===0)!==(k===wrongFacing);});
 for(const d of st.boxes.filter(q=>q.shown)){const b=s.colorBoxState.boxes.find(q=>q.playerIndex===d.playerIndex),cb=s.colorBoxActors&&s.colorBoxActors[b.id];if(cb){cb.xRaw=d.xRaw+shift;cb.yRaw=d.yRaw;cb.vxRaw=cb.vyRaw=0;}}}
function run(s,opts,limit=5000){const a=s.arrangeState.arrangement,log=[];let prev=-1,i=0;
 for(;i<limit&&!s.keyActive&&s.status==='play';i++){if(a.phase===3)arrange(s,opts);R.step(s,{});if(a.phase!==prev){log.push([i,a.phase]);prev=a.phase;}}
 return {i,log};}

test('3-4 data: look 15 s, arrange 30 s, target Key1, dummy rect (w-4) x (h-4) from the bottom',()=>{
 const c=A.compile(acts('st_w_03_04'),2);
 assert.deepEqual([c.arrangement.lookRaw,c.arrangement.arrangeRaw,c.arrangement.target],[15*F,30*F,'Key1']);
 assert.equal(c.dummies.length,4);assert.equal(c.boxes.length,7);
 assert.deepEqual(c.boxes[0].rect,{x:-22*F,y:-44*F,w:44*F,h:44*F});
 assert.equal(A.compile(acts('st_w_03_04'),4).dummies.length,8);
});
test('shuffle 0x1816adcf0: from the back, j = Next(0, i), then swap',()=>{
 const rng={state:'9600629759793949339',inc:'15726070495360670683'},copy={...rng};
 const out=A.shuffle(rng,[0,1,2,3]);const js=[3,2,1].map(i=>A.nextInt(copy,0,i));
 const want=[0,1,2,3];[3,2,1].forEach((i,k)=>{const j=js[k];[want[i],want[j]]=[want[j],want[i]];});
 assert.deepEqual(out,want);
});
test('OnStart: one dummy per player, one dummy box per ColorBox, map halves at 96 / 1056, stage paused',()=>{
 for(const n of [2,4,8]){const s=mk(n);R.step(s,{});const st=s.arrangeState,a=st.arrangement;
  assert.equal(st.dummies.filter(d=>d.shown).length,n,'count '+n);
  assert.deepEqual(st.dummies.filter(d=>d.shown).map(d=>d.playerIndex).sort(),[...Array(n).keys()]);
  assert.equal(st.boxes.filter(d=>d.shown).length,s.colorBoxState.boxes.length);
  assert.deepEqual([a.leftRaw/F,a.rightRaw/F,a.paused],[96,1056,true]);}
});
test('the look phase freezes players; GO after 15 s, FINISH after 30 s more',()=>{
 const s=mk(2),a=s.arrangeState.arrangement;R.step(s,{});const x0=s.players[0].x;
 for(let i=0;i<300;i++)R.step(s,{[s.players[0].id]:{right:true}});assert.equal(s.players[0].x,x0);
 let go=-1,fin=-1;for(let i=0;i<3000&&fin<0;i++){R.step(s,{});if(go<0&&a.phase===2)go=i;if(a.phase===4)fin=i;}
 assert.ok(go>=598&&go<=601,'go '+go);// 15 s = 900 updates of 1092 raw, 300 of them above
 assert.equal(fin-go,5+1801);// curtain 4369 raw = 5 updates of 1092, then 30 s = 1801 updates
});
test('matching the picture on the right half: every result is a circle, Key1 appears after 1.5 s each + 1.5 + 3.5',()=>{
 for(const n of [2,4,8]){const s=mk(n),a=s.arrangeState.arrangement;const {log}=run(s);
  assert.equal(s.status,'play','count '+n);assert.equal(s.keyActive,true,'count '+n);
  assert.ok(a.results.length>=n&&a.results.every(Boolean),'count '+n+' '+JSON.stringify(a.results));
  const t5=log.find(q=>q[1]===6)[0],t10=log.find(q=>q[1]===10)[0];
  const want=Math.ceil(98304/1092)*(a.results.length+1)+Math.ceil(229376/1092);
  assert.ok(Math.abs(t10-t5-want)<=a.results.length+3,'count '+n+' '+(t10-t5)+' vs '+want);}
});
test('facing the other way is a cross; the stage retries',()=>{
 const s=mk(2),a=s.arrangeState.arrangement;run(s,{wrongFacing:0});
 assert.equal(s.status,'dead');assert.equal(s.failure.reason,'배치가 달라요');
 assert.equal(a.results.filter(x=>!x).length,1);
});
test('doing nothing: every result is a cross',()=>{
 const s=mk(4),a=s.arrangeState.arrangement;run(s,{},0);
 for(let i=0;i<5000&&s.status==='play';i++)R.step(s,{});
 assert.equal(s.status,'dead');assert.ok(a.results.length>=4&&a.results.every(x=>!x));
});
test('turning on the spot: the player faces the last pressed direction, left first',()=>{
 const s=mk(2);s.arrangeState.arrangement=null;R.step(s,{});const p=s.players[0];
 R.step(s,{[p.id]:{left:true}});assert.equal(p.lookingRight,false);
 R.step(s,{[p.id]:{right:true}});assert.equal(p.lookingRight,true);
 R.step(s,{[p.id]:{left:true,right:true}});assert.equal(p.lookingRight,false);
});
