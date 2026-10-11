'use strict';
// 5-2 (2 players): 15 s DeadTimer, +2 s per latched floor/ledge switch.
// Route under test (fastest found): A climbs via B's head and the box steps to the key,
// B triggers the wall switch with PushBox3 and then hauls it right as the last player's step.
const {Game,Halt,walkTo,jump,holdKeys,enter}=require('./hd-kit.cjs');
const timerLeft=g=>g.s.switchTimerState.timers[0].sec;
function* steerJump(g,i,x,{hold=14}={}){yield* jump(g,i,{hold,steerTo:x,tol:2});}
function* pushTo(g,i,box,x){const p=g.P(i);const dir=Math.sign(x-box.x);
 // stand on the pushing side, then walk into the box until it reaches x
 for(let k=0;k<60*60;k++){if(dir>0?box.x>=x-0.5:box.x<=x+0.5)return;yield dir>0?{right:true}:{left:true};}}
function run(stage,count,{noise=null,seed=1,mode='online',trace=false}={}){
 const g=new Game(stage,count,{noise,seed,mode,maxTicks:60*90});
 const marks=[];const m=(name)=>{marks.push({name,t:+(g.t/60).toFixed(2),timer:+timerLeft(g).toFixed(2),key:g.s.keyTaken});if(trace)console.log(name,(g.t/60).toFixed(2),'timer',timerLeft(g).toFixed(2),g.players.map(p=>Math.round(p.x)+','+Math.round(p.y)).join(' '));};
 const box=name=>g.s.deviceState.devices.find(d=>d.name===name);
 try{
  const A=1,B=0;g.idle(2);
  // both walk left; B stops right of the ledge edge as the base, A behind
  g.together({[B]:walkTo(g,B,684,{tol:2}),[A]:walkTo(g,A,740,{tol:2})});m('at ledge');
  g.together({[A]:steerJump(g,A,684)});g.idle(2);
  if(g.P(A).supportId!==g.P(B).id)throw new Halt('A not on B');
  g.together({[A]:steerJump(g,A,636)});m('A on 336 level');
  // B: into the corridor, over the floor switches, push PushBox3 into the wall switch
  const b3=box('PushBox3'),b9=box('PushBox9'),b8=box('PushBox8'),b7=box('PushBox7');
  g.together({
   [B]:(function*(){yield* walkTo(g,B,b3.x+b3.w,{tol:1});yield* pushTo(g,B,b3,48);})(),
   [A]:(function*(){
    yield* steerJump(g,A,b9.x+8);             // onto PushBox9 from its right
    yield* steerJump(g,A,b8.x+b8.w+4);        // up to the 240 level, right of PushBox8
    yield* steerJump(g,A,b8.x+8);             // onto PushBox8
    yield* steerJump(g,A,b7.x+b7.w+4);        // 144 level, right of PushBox7
    yield* steerJump(g,A,b7.x+8);             // onto PushBox7
    yield* steerJump(g,A,170);                // 48 level
    yield* walkTo(g,A,82,{tol:3});
   })()});
  m('key run done');
  if(!g.s.keyTaken)throw new Halt('no key');
  const big=box('PushBox1');
  // timer is stopped by the first floor switch (bug), so: big box first, then the box relay.
  // A drops off the ledges to the floor; B leaves the corridor; both push the big box to the wall.
  g.together({[A]:(function*(){for(let k=0;k<60*12&&!(g.P(A).grounded&&g.P(A).y>380);k++)yield {right:true};})(),
   [B]:walkTo(g,B,700,{tol:2})});
  m('both on the floor');
  g.together({[A]:pushTo(g,A,big,2064),[B]:pushTo(g,B,big,2064)},{max:60*60});
  m('big box at wall');
  // back to the ledge: B is the base again, A climbs to the 336 level and over to PushBox9
  g.together({[B]:walkTo(g,B,684,{tol:2}),[A]:walkTo(g,A,740,{tol:2})},{max:60*30});
  g.together({[A]:steerJump(g,A,684)});g.idle(2);
  if(g.P(A).supportId!==g.P(B).id)throw new Halt('A not on B (2nd)');
  g.together({[A]:steerJump(g,A,636)});
  // B waits in the corridor below the drop point; A pushes PushBox9 off, B catches and hauls it
  g.together({[B]:walkTo(g,B,636,{tol:1.5}),[A]:(function*(){yield* walkTo(g,A,b9.x+b9.w+2,{tol:1.5});yield* steerJump(g,A,b9.x-40);})()});
  m('relay ready');
  g.together({[A]:(function*(){yield* walkTo(g,A,b9.x-33,{tol:1});for(let k=0;k<600&&b9.y<380;k++)yield {right:true};})(),
   [B]:(function*(){for(let k=0;k<60*20&&b9.y<360;k++)yield {};for(let k=0;k<60*40&&b9.x<big.x-48-0.5;k++)yield {right:true};})()},{max:60*45});
  m('step placed');
  const near=B,far=A;
  for(const i of [B,A])g.together({[i]:(function*(){
   for(let k=0;k<60*20&&!(g.P(i).grounded&&g.P(i).y>380&&g.P(i).x>b9.x-120);k++)yield {right:true};
   yield* walkTo(g,i,b9.x-40,{tol:2});yield* steerJump(g,i,b9.x+8);yield* steerJump(g,i,big.x+40);
   yield* walkTo(g,i,big.x+big.w-34,{tol:1});yield* steerJump(g,i,2172);
   for(let k=0;k<60*5&&g.P(i).x<2210;k++)yield {right:true};for(let k=0;k<60*3&&!(g.P(i).grounded&&g.P(i).y>380);k++)yield {};})()},{max:60*40});
  m('in pocket');
  const b11=box('PushBox11');
  g.together({[A]:(function*(){yield* walkTo(g,A,b11.x-33,{tol:1});yield* pushTo(g,A,b11,2304);})()});
  g.together({[A]:enter(g,A),[B]:enter(g,B)});
  m('end');
  return g.result({marks});
 }catch(e){if(e instanceof Halt){m('halt '+e.message);return g.result({halt:e.message,marks});}throw e;}
}
function* idleN(n){for(let k=0;k<n;k++)yield {};}
function* idleWait(g,cond){for(let k=0;k<60*60&&!cond();k++)yield {};}
module.exports={run};
if(require.main===module){const r=run('st_w_05_02',2,{trace:true});console.log(r.status,r.seconds,r.failure?JSON.stringify(r.failure):'',r.halt||'',r.where);}
