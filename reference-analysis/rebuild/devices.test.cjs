'use strict';
const assert=require('node:assert/strict');
const {stepDevices,occupantsFor}=require('./devices.js');
let checks=0;const test=(name,fn)=>{fn();checks++;console.log(`PASS ${name}`);};
const body=(id,x=0,y=90,extra={})=>({id,x,y,w:10,h:10,grounded:true,vy:0,...extra});
const button=(id,signal,x=0)=>({id,signal,x,y:100,w:30,h:2});
const gate=(id,signal,x=50,mode='while')=>({id,kind:'gate',signal,mode,x,y:70,w:10,h:30});
const lift=(n)=>({id:'lift',kind:'lift',x:0,y:100,w:100,h:5,fromY:100,toY:0,speed:10,requiredPlayers:n});
const stack=(n)=>Array.from({length:n},(_,i)=>body(`p${i}`,10,90-i*10,{supportId:i?`p${i-1}`:'lift'}));
test('while button releases only after last direct user leaves',()=>{
  let s={bodies:[body('a'),body('b',15)],buttons:[button('b1','A')],devices:[gate('g','A')]};
  s=stepDevices(s,0);assert.equal(s.devices[0].active,true);assert.equal(s.buttons[0].occupantIds.length,2);
  s.bodies.shift();s=stepDevices(s,0);assert.equal(s.devices[0].active,true);
  s.bodies=[];s=stepDevices(s,0);assert.equal(s.devices[0].active,false);
});
test('signals isolate groups; multiple buttons OR a shared group',()=>{
  let s={bodies:[body('a')],buttons:[button('b1','A'),button('b2','A',100),button('b3','B',200)],devices:[gate('gA','A'),gate('gB','B',250)]};
  s=stepDevices(s,0);assert.equal(s.devices[0].active,true);assert.equal(s.devices[1].active,false);
  s.bodies[0].x=100;s=stepDevices(s,0);assert.equal(s.devices[0].active,true);
});
test('gate refuses closure through a body, then closes without deadlock',()=>{
  let s={bodies:[body('a',52,80)],devices:[gate('g','A')]};
  const original=JSON.stringify(s);s=stepDevices(s,0);assert.equal(s.devices[0].blocked,true);assert.equal(s.devices[0].active,true);
  assert.equal(JSON.stringify({bodies:s.bodies,devices:[gate('g','A')]}),original);
  for(let i=0;i<5;i++)s=stepDevices(s,1);assert.equal(s.devices[0].active,true);
  s.bodies[0].x=70;s=stepDevices(s,0);assert.equal(s.devices[0].blocked,false);assert.equal(s.devices[0].active,false);
});
test('bridge follows while signal; latch bridge persists until explicit reset',()=>{
  const base={...gate('bridge','A'),kind:'bridge'};
  let s={bodies:[body('p')],buttons:[button('b','A')],devices:[base,{...base,id:'sticky',mode:'latch'}]};
  s=stepDevices(s,0);s.bodies=[];s=stepDevices(s,1);assert.equal(s.devices[0].active,false);assert.equal(s.devices[1].active,true);
  s=stepDevices(s,0,{resetDeviceIds:['sticky']});assert.equal(s.devices[1].active,false);
});
for(const n of [2,4,8])test(`${n} stacked riders count and move together; one dismount makes lift descend`,()=>{
  let s={bodies:stack(n),devices:[lift(n)]};
  const before=s.bodies.map(b=>b.y);s=stepDevices(s,1);
  assert.equal(s.devices[0].occupancy,n);assert.equal(s.devices[0].y,90);
  s.bodies.forEach((b,i)=>assert.equal(b.y,before[i]-10));
  s.bodies=s.bodies.slice(0,-1);s=stepDevices(s,0.5);
  assert.equal(s.devices[0].occupancy,n-1);assert.equal(s.devices[0].direction,'down');assert.equal(s.devices[0].y,95);
});
test('jumping and stale support contacts do not count',()=>{
  const l=lift(2),ps=stack(2);ps[1].airborne=true;
  assert.deepEqual(occupantsFor(l,ps),['p0']);ps[1].airborne=false;ps[1].vy=-1;assert.deepEqual(occupantsFor(l,ps),['p0']);
  ps[1].vy=0;ps[1].y-=5;assert.deepEqual(occupantsFor(l,ps),['p0']);
  ps[1].y+=5;ps[0].grounded=false;assert.deepEqual(occupantsFor(l,ps),[]);
});
test('crate is physical obstruction but cannot count as lift rider',()=>{
  const s=stepDevices({bodies:[body('crate',10,90,{kind:'crate',supportId:'lift'})],devices:[lift(1)]},1);
  assert.equal(s.devices[0].occupancy,0);assert.equal(s.devices[0].qualified,false);assert.equal(s.devices[0].y,100);
});
test('bridge creation waits until falling body clears its volume',()=>{
  const bridge={...gate('bridge','A',50),kind:'bridge',y:100,h:5};
  let s={bodies:[body('holder'),body('falling',51,95,{grounded:false,vy:10})],buttons:[button('b','A')],devices:[bridge]};
  s=stepDevices(s,0);assert.equal(s.devices[0].blocked,true);assert.equal(s.devices[0].active,false);
  s.bodies[1].y=106;s=stepDevices(s,0);assert.equal(s.devices[0].blocked,false);assert.equal(s.devices[0].active,true);
});
test('closing gate and appearing bridge wait for solid lift to clear',()=>{
  const l={...lift(2),x:50,w:30};
  let s=stepDevices({devices:[{...gate('gate','A'),y:90,h:30},l]},0);
  assert.equal(s.devices[0].blocked,true);assert.equal(s.devices[0].active,true);
  s=stepDevices({bodies:[body('holder')],buttons:[button('button','A')],devices:[{...gate('bridge','A'),kind:'bridge',y:100,h:5},l]},0);
  assert.equal(s.devices[0].blocked,true);assert.equal(s.devices[0].active,false);
});
test('cyclic supports and detached bodies cannot fake occupancy',()=>{
  const ps=stack(2);ps[0].supportId='p1';assert.deepEqual(occupantsFor(lift(2),ps),[]);
  ps[0].supportId='lift';ps[0].x=200;assert.deepEqual(occupantsFor(lift(2),ps),[]);
});
test('required occupancy is threshold; lift endpoints clamp on large dt',()=>{
  let s={bodies:stack(4),devices:[lift(2)]};s=stepDevices(s,100);assert.equal(s.devices[0].y,0);assert.equal(s.devices[0].occupancy,4);
  s.bodies=[];s=stepDevices(s,100);assert.equal(s.devices[0].y,100);
});
test('ceiling stops lift before rider overlaps; removing obstacle resumes',()=>{
  let s={bodies:stack(2),devices:[lift(2)],solids:[{x:0,y:60,w:100,h:10}]};
  s=stepDevices(s,10);assert.equal(s.devices[0].deltaY,-10);assert.equal(s.devices[0].blocked,true);assert.equal(s.bodies[1].y,70);
  s=stepDevices(s,1);assert.equal(s.devices[0].deltaY,0);
  s.solids=[];s=stepDevices(s,1);assert.equal(s.devices[0].deltaY,-10);
});
test('descending lift stops before non-rider instead of crushing',()=>{
  const l={...lift(2),y:50};let s={devices:[l],bodies:[body('below',20,70,{grounded:false})]};
  s=stepDevices(s,10);assert.equal(s.devices[0].y,65);assert.equal(s.devices[0].blocked,true);assert.equal(s.bodies[0].y,70);
});
test('converging lifts reserve space and stay safe regardless of device array order',()=>{
  const upper={...lift(1),id:'upper',y:30,fromY:100},lower={...lift(1),id:'lower',y:100};
  const rider=body('rider',10,90,{supportId:'lower'});
  const a=stepDevices({bodies:[rider],devices:[upper,lower]},10);
  const b=stepDevices({bodies:[rider],devices:[lower,upper]},10);
  const positions=s=>s.devices.map(d=>[d.id,d.y]).sort();assert.deepEqual(positions(a),positions(b));
  const up=a.devices.find(d=>d.id==='upper'),lo=a.devices.find(d=>d.id==='lower');
  assert(up.y+up.h<=a.bodies[0].y);assert(a.bodies[0].y+10<=lo.y);
});
test('timer expiry, independent durations, trigger and reset precedence',()=>{
  let s={timers:[{id:'t1',signal:'A',duration:3},{id:'t2',signal:'B',duration:5}],devices:[gate('a','A'),gate('b','B',80)]};
  s=stepDevices(s,1,{triggerTimerIds:['t1','t2']});assert.equal(s.timers[0].remaining,2);
  s=stepDevices(s,2);assert.equal(s.devices[0].active,false);assert.equal(s.devices[1].active,true);
  s=stepDevices(s,0,{triggerTimerIds:['t1'],resetTimerIds:['t1']});assert.equal(s.timers[0].remaining,0);
});
test('timer can drive a latch; expiration does not reset latched device',()=>{
  let s={timers:[{id:'t',signal:'T',duration:1}],devices:[gate('g','T',50,'latch')]};
  s=stepDevices(s,0,{triggerTimerIds:['t']});s=stepDevices(s,2);assert.equal(s.signals.T,false);assert.equal(s.devices[0].active,true);
  s=stepDevices(s,0,{resetDeviceIds:['g']});assert.equal(s.devices[0].active,false);
});
test('step is deterministic and pure, with configurable pending calibration',()=>{
  const input={bodies:stack(2),devices:[lift(2)]},saved=JSON.stringify(input);
  const a=stepDevices(input,1),b=stepDevices(input,1);assert.deepEqual(a,b);assert.equal(JSON.stringify(input),saved);
  assert.equal(a.calibration.status,'calibration_pending');
  input.bodies[1].y-=0.8;assert.equal(stepDevices(input,0,{}, {contactTolerance:1}).devices[0].occupancy,2);
});
test('invalid state or command fails explicitly instead of hiding configuration errors',()=>{
  assert.throws(()=>stepDevices({},-1),/nonnegative/);assert.throws(()=>stepDevices({},NaN),/Invalid dt/);
  assert.throws(()=>stepDevices({devices:[{...lift(2),requiredPlayers:0}]},0),/calibration/);
  assert.throws(()=>stepDevices({bodies:[body('same'),body('same')]},0),/duplicate/);
  assert.throws(()=>stepDevices({},0,{triggerTimerIds:['missing']}),/Unknown timer/);
});
console.log(`\n${checks} device checks passed. All numeric values remain calibration_pending.`);
