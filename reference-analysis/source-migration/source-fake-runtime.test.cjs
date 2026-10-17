'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('./source-fake-runtime.js'),R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const actors=()=>source.stages.find(s=>s.stageId==='st_w_13_04').json.stageInitParamList[0].actorCreateParamList;
const mk=n=>R.create(R.compile({source,geometry,count:n,stageId:'st_w_13_04'}));
const host=(n,buttons)=>({dtRaw:1092,participants:Array.from({length:n},(_,i)=>i),colorOf:i=>i,buttons:buttons||Array.from({length:n},()=>({})),terrain:[]});
// Finds its own cage with the cursor, then fetches the key (participant 0) and walks into the goal.
function bot(s,frame){const st=s.fakeState,t=st.timer,inputs={};
 s.players.forEach((p,k)=>{const inp={};inputs[p.id]=inp;const cur=st.cursors.find(c=>c.playerIndex===k&&!c.removed);
  if(cur&&cur.phase===0){const own=t.infos.findIndex(q=>q.playerIndex===k&&q.fakeId);if(own<0||frame%2)return;const o=t.infos[own],c=t.infos[cur.cageIndex];
   if(own===cur.cageIndex)inp.jump=true;else if(o.yRaw<c.yRaw-32*F)inp.up=true;else if(o.yRaw>c.yRaw+32*F)inp.down=true;else if(o.xRaw<c.xRaw)inp.left=true;else inp.right=true;return;}
  const b=K.bodyFor(st,k);if(!b||b.layer!==1||!b.visible)return;const x=b.xRaw/F,y=b.yRaw/F,target=(k===0||s.goalOpen)?528:(k%2?150+k*20:900-k*20);
  if(st.cages.some(c=>!c.removed&&Math.abs(c.xRaw/F-x)<40&&Math.abs((c.yRaw/F-38)-y)<2)){inp.right=x<target;inp.left=!inp.right;return;}
  if(Math.abs(x-target)>3){inp.right=x<target;inp.left=x>target;}
  if(k===0&&!s.keyTaken&&Math.abs(x-target)<20)inp.jump=(frame%30)<15;
  if(s.goalOpen&&x+16>504&&x-16<552)inp.up=(frame%10)<5;});
 return inputs;}

test('13-4 data: 24 bodies, a cage 24 px above each, seconds and extra bodies per count',()=>{
 const c=K.compile(actors(),2);assert.equal(c.fakes.length,24);assert.equal(c.cages.length,24);
 assert.deepEqual([c.cages[0].xRaw,c.cages[0].yRaw,c.cages[0].x0Raw,c.cages[0].y0Raw,c.cages[0].wRaw,c.cages[0].hRaw],[96*F,192*F,65*F,158*F,62*F,68*F]);
 assert.deepEqual([2,3,4,5,6,7,8].map(n=>{const t=K.compile(actors(),n).timer;return [t.secondRaw/F,t.allInputCount];}),[[10,2],[10,2],[11,1],[11,1],[12,1],[12,1],[13,1]]);
 assert.deepEqual(K.nativeConstants.BODY,{x:-16*F,y:-47*F,w:32*F,h:46*F});// PlayerComponent's body rect
});
test('assignment: each participant takes list[Next(0,len)] by stable removal; the extra bodies obey everyone',()=>{
 const st=K.create(K.compile(actors(),2));K.step(st,host(2));const t=st.timer;
 assert.deepEqual(t.manualIds,['source:a16','source:a15']);// default PCG stream
 assert.deepEqual(st.fakes.filter(f=>f.flags&0x20).map(f=>[f.id,f.colorIndex,f.mode]),[['source:a4',8,1],['source:a19',8,1]]);
 assert.deepEqual(t.manualIds.map(id=>st.fakes.find(f=>f.id===id).playerIndex),[0,1]);
 assert.ok(st.fakes.every(f=>f.flags&1));// event 35 at the timer's OnStart
});
test('timer: 0.15 s, WHO_ARE_YOU (2.5 s view), seconds, 0.2 s stop, 1.5 s, cursors',()=>{
 const st=K.create(K.compile(actors(),2)),log=[];let prev=-1,resumed=-1;
 for(let i=0;i<900;i++){K.step(st,host(2));if(st.timer.phase!==prev){log.push([i,st.timer.phase]);prev=st.timer.phase;}if(resumed<0&&!(st.fakes[0].flags&1))resumed=i;}
 assert.deepEqual(log,[[0,1],[10,2],[162,3],[763,4],[776,5],[867,6]]);
 assert.equal(resumed,162);assert.equal(st.cursors.length,2);assert.deepEqual(st.cursors.map(c=>c.cageIndex),[0,1]);
 assert.ok(st.fakes.every(f=>f.flags&1));// stopped again at the whistle
});
test('in its cage a body falls to the floor, walks 3 px per update and stops at the bars',()=>{
 const st=K.create(K.compile(actors(),2));for(let i=0;i<170;i++)K.step(st,host(2));
 const id=st.timer.manualIds[0],f=st.fakes.find(q=>q.id===id),cage=st.cages.find(c=>c.id===f.cageId);
 assert.equal(f.yRaw,cage.y0Raw+cage.hRaw+F);// bottom (y - 1) on the cage floor
 const x=f.xRaw;K.step(st,host(2,[{right:true},{}]));assert.equal(f.xRaw-x,3*F);assert.equal(f.anim,2);
 for(let i=0;i<30;i++)K.step(st,host(2,[{right:true},{}]));assert.equal(f.xRaw,cage.x0Raw+cage.wRaw-16*F);assert.equal(f.anim,3);// pushing the bars
 K.step(st,host(2,[{jump:true},{}]));assert.equal(f.anim,4);assert.equal(f.vyRaw,-0x5199a);assert.equal(f.vxRaw,0);
 for(let i=0;i<20;i++)K.step(st,host(2,[{jump:true},{}]));assert.ok(f.yRaw>=cage.y0Raw+47*F);// the top bars stop it
});
test('AI: the participants\' input trend sets the fakes going; some imitate a participant',()=>{
 const st=K.create(K.compile(actors(),2));for(let i=0;i<162;i++)K.step(st,host(2));
 const x0=st.fakes.filter(f=>f.mode===0).map(f=>f.xRaw);let imitated=0;
 for(let i=0;i<240;i++){K.step(st,host(2,[{right:true},{right:true}]));imitated+=st.fakes.filter(f=>f.mode===0&&f.playerIndex>=0).length;}
 assert.deepEqual(st.timer.trend,{leftRaw:0,rightRaw:F,jumpRaw:0});
 assert.ok(st.fakes.filter(f=>f.mode===0).some((f,i)=>f.xRaw!==x0[i]));assert.ok(imitated>0);
});
test('cursor: nearest cage that way within 32 px across',()=>{
 const st=K.create(K.compile(actors(),2));K.step(st,host(2));const t=st.timer,go=(from)=>[0,1,2,3].map(d=>{const q=K.cageInDirection(t,from,d);return q?q.index:null;});
 assert.deepEqual(go(0),[null,8,null,1]);assert.deepEqual(go(3),[null,11,2,4]);assert.deepEqual(go(12),[4,20,11,13]);
});
test('13-4: a wrong pick retries the stage; the right one opens the cage and reveals the body',()=>{
 const s=mk(2),st=s.fakeState;for(let i=0;i<868;i++)R.step(s,{});
 const t=st.timer,own=t.infos.findIndex(q=>q.playerIndex===0),wrong=own===0?1:0;
 assert.equal(K.checkPlayer(t,own,0),1);assert.equal(K.checkPlayer(t,wrong,0),-1);
 const w=mk(2);for(let i=0;i<868;i++)R.step(w,{});w.fakeState.cursors[0].cageIndex=wrong;R.step(w,{[w.players[0].id]:{jump:true}});
 for(let i=0;i<46&&w.status==='play';i++)R.step(w,{});assert.equal(w.status,'dead');assert.equal(w.failure.reason,'다른 몸을 골랐어요');
 const r=K.receiveResult(st,own,true),f=st.fakes.find(q=>q.id===r.revealed),c=st.cages.find(q=>q.id===f.cageId);
 assert.equal(f.layer,1);assert.equal(f.fadeState,1);assert.equal(c.collisionActive,false);assert.equal(t.infos[own].fakeId,null);
 let gone=-1,faded=-1;for(let i=0;i<70;i++){R.step(s,{});if(gone<0&&c.removed)gone=i;if(faded<0&&f.fadeState===2)faded=i;}
 assert.equal(gone,30);assert.equal(faded,60);// 0.5 s at QFP._2 per second; fakeLevel 1 -> 0 over 1 s
});
test('13-4: everyone finds itself, the key opens the door, all inside clears it',()=>{
 for(const n of [2,5,8]){const s=mk(n),st=s.fakeState;let i=0;for(;i<4000&&s.status==='play';i++)R.step(s,bot(s,i));
  assert.equal(s.status,'clear','count '+n);assert.ok(st.stageFlags&0x800);assert.ok(st.timer.manualIds.every(id=>st.fakes.find(f=>f.id===id).flags&8));}
});
test('goal: inside for 1 s, then up with nothing in the way comes back out',()=>{
 const st=K.create(K.compile(actors(),2));K.step(st,host(2));const f=st.fakes.find(q=>q.id===st.timer.manualIds[0]);
 Object.assign(f,{goalPhase:1,flags:0,layer:1});st.cages.find(c=>c.id===f.cageId).removed=true;const h=(b)=>({...host(2,b),terrain:[]});
 K.step(st,h());assert.equal(f.visible,false);assert.ok(f.flags&8);
 let back=-1;for(let i=0;i<80;i++){K.step(st,h(i%2?[{up:true},{}]:[{},{}]));if(back<0&&f.visible)back=i;}
 assert.ok(back>=60&&back<=62);assert.equal(f.flags&8,0);
});
