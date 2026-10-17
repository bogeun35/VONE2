'use strict';
// Every actor in this file is read straight out of the decoded original stage
// data; nothing is hand written. The expected numbers are the ones the native
// ParseParameter/CalcMoveContactCount/OnUpdate/MoveLift arithmetic produces -
// see the evidence header of source-lift-devices.js for the addresses.
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('./source-lift-devices.js');
const source=require('./installed-stage-decoded.local.json');

const F=65536;
function stageActors(stageId,variant=0){
 const stage=source.stages.find(s=>s.stageId===stageId);
 assert.ok(stage,'extracted stage '+stageId+' must exist');
 return stage.json.stageInitParamList[variant].actorCreateParamList;
}
function actor(stageId,name,variant=0){
 const a=stageActors(stageId,variant).find(x=>x.name===name);
 assert.ok(a,'extracted actor '+name+' must exist in '+stageId);
 return a;
}
const lift1004=()=>actor('st_w_10_04','WeightedLiftEx1');
const compileOne=(a,count)=>{
 const c=L.compile([a],count);
 assert.equal(c.lifts.length,1,'the actor must compile into exactly one lift');
 return c.lifts[0];
};
// Minimal player records in the shape source-stage-runtime.js keeps them, with
// the supportId its moveY() would have written last tick.
const rider=(id,supportId)=>({id,exit:false,grounded:true,supportId,x:0,y:0,w:32,h:46});
const bystander=id=>({id,exit:false,grounded:true,supportId:'terrain:0',x:0,y:0,w:32,h:46});
function stateWith(a,count){const c=L.compile([a],count);return L.create(c);}
function run(state,ticks,players){for(let i=0;i<ticks;i++)L.beforeStep(state,{dt:1/60,nativeTickRate:60,players});return state;}

test('the extracted st_w_10_04 actor carries the WeightedLiftEx ordinal the creator table maps to ExtraWeightedLiftComponent',()=>{
 const a=lift1004();
 // creator-delegates-resolved.local.json: ordinal 46 WeightedLiftEx and
 // ordinal 47 WeightedLiftSingle both resolve to ExtraWeightedLiftComponent.Creator,
 // and 0x2f = 47 is the only ordinal ParseParameter 0x18183b825 branches on.
 assert.equal(a.type,46);
 assert.equal(a.typeName,'WeightedLiftEx');
 assert.equal(a.playerCount,0,'no population filter on this actor');
 assert.equal(a.datas.length,32);
 // The raw slots this whole port rests on.
 const n=i=>a.datas[i].t===1?a.datas[i].f:null;
 assert.deepEqual([n(8),n(9),n(10),n(11),n(12),n(13)],[100,3,1,-1,900,1]);
 assert.deepEqual([n(0),n(14),n(15),n(17),n(18)],[0,0,0,0,0]);
 for(const i of [16,19,20]){assert.equal(a.datas[i].t,2);assert.equal(a.datas[i].s,'!'.repeat(56));}
});

test('st_w_10_04 parameters decode to the native parameter set and the InitCollision box',()=>{
 const lift=compileOne(lift1004(),2);
 // ParseParameter: datas[12] -> X, datas[0] (+ the empty datas[1..7] table) -> Y.
 assert.equal(lift.moveDirXFp,900*F);
 assert.equal(lift.moveDirYFp,0);
 assert.notEqual(lift.moveDirYFp,-70*F,'the (0,-70) Initialize default must have been replaced');
 // datas[9] with an all-zero datas[19] table, and m_ReturnSpeed falling back to m_Speed.
 assert.equal(lift.speedFp,3*F);
 assert.equal(lift.returnSpeedFp,3*F);
 // bytes: 8 -> percent, 10 -> min, 11 -> offset (negative, kept), 15 empty -> default max 8
 assert.deepEqual([lift.movePercent,lift.moveMin,lift.moveMax,lift.moveOffset],[100,1,8,-1]);
 // flags: datas[13] = 1 sets bit1 only; bit0 is Initialize's default
 assert.deepEqual(lift.flags,{enableReturn:true,enableRideReversal:true,
  enableCountReversal:false,disableWaitContactLower:false});
 // COLLISION_RECT (Height 16, Width 192, X -96, Y 64) with the default m_Width.
 assert.equal(lift.w,192);
 assert.equal(lift.h,16);
 assert.equal(lift.rectX,-96);
 assert.equal(lift.rectY,64);
 assert.equal(lift.x,2133-96);
 assert.equal(lift.y,175+64);
 assert.deepEqual({x:lift.x,y:lift.y,w:lift.w,h:lift.h},{x:2037,y:239,w:192,h:16});
});

test('st_w_10_04 needs exactly one rider fewer than the population, for every population',()=>{
 const seen=[];
 for(let count=2;count<=8;count++){
  const lift=compileOne(lift1004(),count);
  seen.push(L.calcMoveContactCount(lift,count));
  // the geometry must not move with the population - the tables are all zero
  assert.equal(lift.x,2037);
  assert.equal(lift.moveDirXFp,900*F);
 }
 assert.deepEqual(seen,[1,2,3,4,5,6,7]);
 for(let i=0;i<seen.length;i++){
  const count=i+2;
  assert.equal(seen[i],count-1);
  assert.notEqual(seen[i],count,'m_MoveOffset -1 must actually subtract one');
 }
});

test('CalcMoveContactCount truncates the percent divide, ceilings the product and clamps in min/max order',()=>{
 const base=compileOne(lift1004(),8);
 const at=(percent,offset,min,max,count)=>
  L.calcMoveContactCount({...base,movePercent:percent,moveOffset:offset,moveMin:min,moveMax:max},count);
 // percent 100 is exact: 100*65536/100 = 65536, so needed == count with no ceiling.
 assert.equal(at(100,0,1,8,5),5);
 // percent 10 truncates to raw 6553 (6553.6), so 8 players give 52424/65536 -
 // an integer part of 0 and a non-zero fraction, which the ceiling turns into 1.
 // This is st_l_03_01's and st_w_15_01's configuration.
 assert.equal(at(10,0,1,8,8),1);
 assert.equal(at(10,0,0,8,8),1);
 assert.equal(at(10,0,0,8,2),1,'ceil(0.2) = 1, not 0');
 // percent 50: exact at even counts, ceiling at odd ones.
 assert.deepEqual([at(50,0,0,8,2),at(50,0,0,8,3),at(50,0,0,8,4),at(50,0,0,8,5)],[1,2,2,3]);
 // m_MoveMax is applied before m_MoveMin, so a max below the min wins on the floor.
 assert.equal(at(100,0,1,1,8),1,'max 1 caps 8 players down to a single rider');
 assert.equal(at(100,0,5,3,8),5,'min is applied after max and raises the capped value back up');
 // m_MoveOffset is signed and can push below the floor, where m_MoveMin catches it.
 assert.equal(at(100,-4,1,8,2),1);
 assert.equal(at(100,-4,1,8,8),4);
 assert.equal(at(100,2,1,8,2),4);
});

test('st_l_04_04 m_MoveMax 1 makes one rider enough at every population, unlike st_w_10_04',()=>{
 const a=actor('st_l_04_04','WeightedLiftEx1');
 // playerCount -5 on this actor, so the population filter only creates it for 2..5.
 assert.equal(a.playerCount,-5);
 assert.equal(L.compile([a],6).lifts.length,0,'the population filter must drop it above 5');
 const needed=[];
 for(let count=2;count<=5;count++)needed.push(L.calcMoveContactCount(compileOne(a,count),count));
 // datas[15] = 1 -> m_MoveMax 1, datas[10] = 1 -> m_MoveMin 1, datas[11] = 0.
 assert.deepEqual(needed,[1,1,1,1]);
 assert.notDeepEqual(needed,[1,2,3,4]);
});

test('st_w_15_02 m_MoveMin 2 raises the floor and its datas[16] table overrides m_Width',()=>{
 const a=actor('st_w_15_02','WeightedLiftEx1');
 const needed=[];
 for(let count=2;count<=8;count++)needed.push(L.calcMoveContactCount(compileOne(a,count),count));
 assert.deepEqual(needed,[2,3,4,5,6,7,8]);
 const lift=compileOne(a,2);
 // datas[16] decodes to 13107200 raw = 200, so the box is 200 wide and
 // InitCollision recentres X to -m_Width/2 = -100 instead of the static -96.
 assert.equal(lift.w,200);
 assert.equal(lift.rectX,-100);
 assert.equal(lift.x,2324-100);
 assert.equal(lift.y,179+64);
 assert.equal(lift.h,16);
 // datas[9] = datas[18] = 1.5 -> both speeds are 98304 raw, not the 1.0 default.
 assert.equal(lift.speedFp,98304);
 assert.equal(lift.returnSpeedFp,98304);
});

test('the datas[19] speed table walks down to the first non-zero entry, with FP.FromString truncation intact',()=>{
 const a=actor('st_l_04_04','WeightedLiftEx1');
 // Decoded table: [52428, 0, 55705, 58982, 0, 0, 0] for populations 2..8, i.e.
 // 0.8 / 0.85 / 0.9 truncated the way key-reach-report.json traced 0.8 -> 52428.
 // The actor's own playerCount -5 means only entries 0..3 are ever reachable,
 // and its sibling WeightedLiftEx4 (playerCount 6) carries the entry at index 4 -
 // the table and the population filter are cut to match each other.
 const raws=[];
 for(let count=2;count<=5;count++)raws.push(compileOne(a,count).speedFp);
 assert.deepEqual(raws,[52428,52428,55705,58982]);
 assert.notEqual(raws[0],Math.round(0.8*F),'0.8 must be the truncated 52428, not the rounded 52429');
 assert.equal(raws[0],52428);
 assert.equal(raws[1],raws[0],'population 3 has a zero entry and falls back to population 2');
 assert.notEqual(raws[2],raws[1],'population 4 has its own entry');
 // datas[9] is 1.0 here, so a table hit must beat the slot.
 assert.equal(a.datas[9].f,1);
 assert.notEqual(raws[0],1*F);
 // m_ReturnSpeed has an all-zero table and a zero datas[18], so it falls back to m_Speed.
 assert.equal(compileOne(a,4).returnSpeedFp,55705);
 // The 6..8 sibling only has entry 4 set, so 7 and 8 walk back down onto it.
 const big=actor('st_l_04_04','WeightedLiftEx4');
 assert.equal(big.playerCount,6);
 const bigRaws=[];
 for(let count=6;count<=8;count++)bigRaws.push(compileOne(big,count).speedFp);
 assert.deepEqual(bigRaws,[F,F,F]);
});

test('st_w_12_02 datas[19] gives population 2 a different speed from everyone else',()=>{
 const a=actor('st_w_12_02','WeightedLiftEx1');
 // That actor travels vertically (datas[0] = 156). Vertical travel is ported
 // now, so the table can be checked where it matters: the compiled m_Speed.
 // It is the only shipped WeightedLiftEx whose speed changes with the
 // population inside one world.
 assert.equal(compileOne(a,2).speedFp,9*F,'2 players ride at 9');
 assert.equal(compileOne(a,3).speedFp,3*F,'everyone else at 3');
 const t=a.datas[19];
 assert.equal(t.t,2);
 const bytes=[...t.s].map(c=>(c.codePointAt(0)-0x21)&0xff);
 const entry=i=>{let v=0n;for(let k=7;k>=0;k--)v=(v<<8n)|BigInt(bytes[i*8+k]);return Number(v);};
 assert.deepEqual([0,1,2,3,4,5,6].map(entry),[589824,196608,196608,196608,196608,196608,196608]);
 assert.equal(entry(0),9*F);
 assert.equal(entry(1),3*F);
});

test('an absent or non-string table slot decodes to seven zeros instead of failing',()=>{
 // st_w_02_02's WeightedLiftSingle has datas[16] with type tag 0, not a string.
 // The shared reader 0x18096f720 zeroes all 56 bytes in that case (0x18096fcf7).
 const single=actor('st_w_02_02','WeightedLiftSingle1');
 assert.equal(single.datas[16].t,0);
 // st_w_10_04's own tables are the all-'!' form, which decodes to zeros too, so
 // the lift keeps Initialize's 192 wide box.
 assert.equal(compileOne(lift1004(),2).w,192);
});

test('compile claims WeightedLiftEx and WeightedLift and silently ignores the other lift actors',()=>{
 assert.deepEqual(L.supportedTypes,['WeightedLiftEx','WeightedLift']);
 const single=actor('st_w_02_02','WeightedLiftSingle1');
 const normal=stageActors('st_w_05_01').find(a=>a.typeName==='WeightedLift');
 assert.ok(normal,'st_w_05_01 must still carry a WeightedLift actor');
 const c=L.compile([single,normal],4);
 assert.equal(c.lifts.length,1,'the WeightedLift compiles, the WeightedLiftSingle is skipped');
 assert.equal(c.lifts[0].type,'WeightedLift');
 assert.deepEqual(c.warnings,[]);
 assert.equal(L.compile([single,normal,lift1004()],4).lifts.length,2);
});

test('vertical WeightedLiftEx travel compiles, and a zero vector is still refused',()=>{
 // Each is asked for at a population its own playerCount filter admits
 // (st_w_02_01's two lifts split the table at 4, st_w_15_01's are unfiltered).
 for(const [stageId,name,count] of [['st_w_02_01','WeightedLiftEx1',4],['st_w_02_01','WeightedLiftEx2',2],
   ['st_w_15_01','WeightedLiftEx1',4],['st_w_15_01','WeightedLiftEx2',8],['st_w_12_02','WeightedLiftEx1',3]]){
  const lift=compileOne(actor(stageId,name),count);
  assert.notEqual(lift.moveDirYFp,0,stageId+' '+name+' travels vertically');
 }
 // st_w_02_01's actor really is vertical: datas[0] = -150 with no datas[12].
 const a=actor('st_w_02_01','WeightedLiftEx1');
 assert.equal(a.datas[0].f,-150);
 assert.equal(a.datas[12].f,0);
 assert.equal(compileOne(a,4).moveDirYFp,-150*F);
 // Below QFP.Epsilon on both members, m_MoveDirection keeps Initialize's
 // (0,-70), which is vertical as well - so it is a real lift, not "no travel".
 const flat={...a,playerCount:0,datas:a.datas.map((s,i)=>i===0?{t:1,f:0,s:null}:s)};
 assert.equal(compileOne(flat,4).moveDirYFp,-70*F);
});

test('a parameter that is not an exact multiple of 1/65536 is refused instead of rounded',()=>{
 // st_l_04_04's WeightedLiftEx4 carries datas[9] = 1.1, the only fractional
 // m_Speed in either world. Its own datas[19] table covers every population its
 // playerCount 6 filter admits, so the shipped data never reads the slot:
 const a=actor('st_l_04_04','WeightedLiftEx4');
 assert.equal(a.datas[9].f,1.1);
 for(let count=6;count<=8;count++)assert.equal(compileOne(a,count).speedFp,F,
  'the datas[19] table must hide the fractional slot at '+count+'p');
 // ...so the guard is exercised here with the same actor's parameters and the
 // population gate lifted, which is the only way to reach the slot read.
 const exposed={...a,playerCount:0};
 assert.throws(()=>L.compile([exposed],2),/Unverified fractional WeightedLift slot 9/);
 assert.throws(()=>L.compile([exposed],5),/Unverified fractional WeightedLift slot 9/);
});

test('a lift holds still below its rider threshold and extends at m_Speed above it',()=>{
 // 3 players, so st_w_10_04 needs 2 riders.
 const below=stateWith(lift1004(),3),above=stateWith(lift1004(),3);
 const one=[rider('p1','lift:source:a0'),bystander('p2'),bystander('p3')];
 const two=[rider('p1','lift:source:a0'),rider('p2','lift:source:a0'),bystander('p3')];
 run(below,120,one);
 run(above,120,two);
 assert.equal(below.lifts[0].moveContactCount,2);
 assert.equal(above.lifts[0].moveContactCount,2);
 assert.equal(below.lifts[0].riders,1);
 assert.equal(above.lifts[0].riders,2);
 // m_Proc 2 = return, 1 = extend.
 assert.equal(below.lifts[0].proc,2);
 assert.equal(above.lifts[0].proc,1);
 assert.equal(below.lifts[0].offsetXFp,0);
 assert.equal(below.lifts[0].x,2037);
 // m_Proc is decided on the very first update (m_ProcTimer starts at the Quantum
 // zero-init, so the first subtraction already puts it at or below QFP._0) and
 // the lift then advances m_Speed on every update, including that one.
 assert.equal(above.lifts[0].offsetXFp,120*3*F);
 assert.equal(above.lifts[0].x,2037+360);
});

test('the m_Proc decision is throttled to one update in six while travel is continuous',()=>{
 // QFP.OneFrame * QFP._6 reload at 0x181737eb6. Riders leave after update 8, but
 // the lift cannot notice until the next decision boundary at update 13, so it
 // keeps extending through 12 and only then starts returning.
 const s=stateWith(lift1004(),2);
 const on=[rider('p1','lift:source:a0'),bystander('p2')];
 const off=[bystander('p1'),bystander('p2')];
 const trace=[];
 for(let t=1;t<=16;t++){
  L.beforeStep(s,{dt:1/60,nativeTickRate:60,players:t<=8?on:off});
  trace.push([t,s.lifts[0].proc,s.lifts[0].offsetXFp/F]);
 }
 const procs=trace.map(r=>r[1]),offs=trace.map(r=>r[2]);
 assert.deepEqual(procs,[1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2]);
 assert.deepEqual(offs,[3,6,9,12,15,18,21,24,27,30,33,36,33,30,27,24]);
 assert.equal(offs[11],36,'the peak is reached on update 12, four updates after the riders left');
 assert.notEqual(procs[8],2,'update 9 must still be extending, not reacting instantly');
});

test('travel clamps at |m_MoveDirection| and returns to exactly the anchor offset',()=>{
 const s=stateWith(lift1004(),2);
 const on=[rider('p1','lift:source:a0'),bystander('p2')];
 const off=[bystander('p1'),bystander('p2')];
 run(s,299,on);
 assert.equal(s.lifts[0].offsetXFp,897*F,'3 px per update, 299 updates');
 run(s,1,on);
 assert.equal(s.lifts[0].offsetXFp,900*F,'clamped to the 900 px travel vector');
 assert.equal(s.lifts[0].x,2937);
 assert.equal(s.lifts[0].x+s.lifts[0].w,3129);
 run(s,5,on);
 assert.equal(s.lifts[0].offsetXFp,900*F,'no overshoot once clamped');
 assert.deepEqual(s.lifts[0].moved,{x:0,y:0});
 // Stepping off makes it return at m_ReturnSpeed, which here equals m_Speed.
 // The first 5 of these updates still extend (nothing to extend into), and the
 // decision flips on the 6th, so 100 updates after that boundary give 300 px.
 run(s,6,off);
 assert.equal(s.lifts[0].proc,2);
 const afterFlip=s.lifts[0].offsetXFp;
 run(s,100,off);
 assert.equal(s.lifts[0].offsetXFp,afterFlip-100*3*F);
 run(s,1000,off);
 assert.equal(s.lifts[0].offsetXFp,0,'clamped at the anchor, never negative');
 assert.equal(s.lifts[0].x,2037);
 assert.equal(s.lifts[0].proc,2);
});

test('current root-only port leaves rider x unchanged; native inertia is not integrated',()=>{
 // MoveLift 0x1817383cb hands MoveContactActor a vector with a literal zero X,
 // and the whole call is skipped when |dY| < QFP.Epsilon.
 const s=stateWith(lift1004(),2);
 const p=rider('p1','lift:source:a0');
 p.x=2100;p.y=193;
 const players=[p,bystander('p2')];
 run(s,60,players);
 assert.equal(s.lifts[0].x,2037+180,'the lift moved 60 updates worth');
 assert.equal(p.x,2100,'the rider did not');
 assert.equal(p.y,193);
 assert.deepEqual(s.lifts[0].moved,{x:3,y:0});
});

test('riders stacked on riders count, because the native contact walk recurses',()=>{
 // Collision.GetContactCount 0x181694c70 recurses into each matching contact and
 // de-duplicates through a list, so a player on a player on the lift counts.
 const s=stateWith(lift1004(),3);
 const stacked=[rider('p1','lift:source:a0'),rider('p2','p1'),bystander('p3')];
 run(s,12,stacked);
 assert.equal(s.lifts[0].riders,2);
 assert.equal(s.lifts[0].proc,1,'two stacked riders satisfy the threshold of 2');
 // A third level counts once more, and nobody is counted twice.
 const deep=stateWith(lift1004(),8);
 const chain=[rider('p1','lift:source:a0')];
 for(let i=2;i<=7;i++)chain.push(rider('p'+i,'p'+(i-1)));
 chain.push(bystander('p8'));
 run(deep,12,chain);
 assert.equal(deep.lifts[0].riders,7);
 assert.equal(deep.lifts[0].moveContactCount,7);
 assert.equal(deep.lifts[0].proc,1);
 // A player whose support chain never reaches the lift is not a rider.
 const detached=stateWith(lift1004(),3);
 run(detached,12,[rider('p1','terrain:4'),rider('p2','p1'),bystander('p3')]);
 assert.equal(detached.lifts[0].riders,0);
 assert.equal(detached.lifts[0].proc,2);
});

test('an airborne or exited player on the lift is not a rider',()=>{
 const s=stateWith(lift1004(),2);
 const jumping={...rider('p1','lift:source:a0'),grounded:false};
 run(s,12,[jumping,bystander('p2')]);
 assert.equal(s.lifts[0].riders,0);
 const gone=stateWith(lift1004(),2);
 run(gone,12,[{...rider('p1','lift:source:a0'),exit:true},bystander('p2')]);
 assert.equal(gone.lifts[0].riders,0);
 assert.equal(gone.lifts[0].proc,2);
});

test('EnableRideReversal keeps the lower-contact wait timer disarmed',()=>{
 // datas[13] = 1 on st_w_10_04, so OnUpdate 0x181737d98 skips the
 // Collision.IsContacted(Down) arming entirely and m_WaitTimer stays 0.
 const s=stateWith(lift1004(),2);
 assert.equal(s.lifts[0].flags.enableRideReversal,true);
 run(s,30,[rider('p1','lift:source:a0'),bystander('p2')]);
 assert.equal(s.lifts[0].waitTimer,0);
});

test('solids() is the collision box list and afterStep() reports nothing',()=>{
 const s=stateWith(lift1004(),2);
 const list=L.solids(s);
 assert.equal(list.length,1);
 assert.equal(list[0],s.lifts[0],'solids must hand out the live objects, not copies');
 assert.deepEqual({x:list[0].x,y:list[0].y,w:list[0].w,h:list[0].h},{x:2037,y:239,w:192,h:16});
 assert.deepEqual(L.afterStep(s),{events:[],deadPlayerIds:[]});
});

test('compile is pure and create detaches the state',()=>{
 const a=lift1004();
 const before=JSON.stringify(a);
 const c=L.compile([a],5);
 assert.equal(JSON.stringify(a),before,'the extracted actor must not be mutated');
 const s=L.create(c);
 s.lifts[0].offsetXFp=12345;
 assert.equal(c.lifts[0].offsetXFp,0);
 assert.throws(()=>L.create({schemaVersion:2}),/Compiled source lift state required/);
 assert.throws(()=>L.compile([a],1),/population of 2\.\.8/);
 assert.throws(()=>L.compile([a],9),/population of 2\.\.8/);
});

test('beforeStep rejects a nonsense delta instead of silently freezing',()=>{
 const s=stateWith(lift1004(),2);
 assert.throws(()=>L.beforeStep(s,{dt:-1,nativeTickRate:60,players:[]}),/Invalid lift delta/);
 assert.throws(()=>L.beforeStep(s,{dt:1/60,nativeTickRate:0,players:[]}),/Invalid lift tick rate/);
 // A half-rate step must travel half as far, not the same distance.
 const half=stateWith(lift1004(),2),full=stateWith(lift1004(),2);
 const on=id=>[rider('p1','lift:source:a0'),bystander('p2')];
 for(let i=0;i<60;i++)L.beforeStep(half,{dt:1/120,nativeTickRate:60,players:on()});
 for(let i=0;i<60;i++)L.beforeStep(full,{dt:1/60,nativeTickRate:60,players:on()});
 assert.ok(half.lifts[0].offsetXFp>0&&half.lifts[0].offsetXFp<full.lifts[0].offsetXFp,
  'half-rate travel '+half.lifts[0].offsetXFp+' must sit strictly between 0 and '+full.lifts[0].offsetXFp);
});

test('every WeightedLiftEx actor in both shipped worlds is axis aligned',()=>{
 // The claim the vertical refusal rests on: no actor sets both members, so
 // refusing a non-zero Y never half-disables a lift that also travels in X.
 let seen=0,horizontal=0,vertical=0;
 for(const stage of source.stages)
  for(const variant of stage.json.stageInitParamList)
   for(const a of variant.actorCreateParamList||[]){
    if(a.typeName!=='WeightedLiftEx')continue;
    seen++;
    const y=a.datas[0].t===1?a.datas[0].f:0,x=a.datas[12].t===1?a.datas[12].f:0;
    const pop=[1,2,3,4,5,6,7].map(i=>a.datas[i].t===1?a.datas[i].f:0);
    assert.ok(!(x!==0&&y!==0),a.name+' in '+stage.stageId+' sets both travel members');
    if(x!==0)horizontal++;else if(y!==0)vertical++;
    if(x!==0)assert.deepEqual(pop.filter(v=>v!==0),[],
     a.name+' in '+stage.stageId+' mixes a horizontal vector with a population Y table');
   }
 assert.equal(seen,20);
 assert.equal(horizontal,14);
 assert.equal(vertical,6);
 assert.equal(horizontal+vertical,seen,'no WeightedLiftEx relies on the (0,-70) default');
});

// WeightedLift (NormalWeightedLiftComponent.ParseParameter 0x181889b40) on
// st_w_05_01's real actors: datas [-310, 0, 50, 1, -0.1, 0...].
test('st_w_05_01 WeightedLift decodes through the Normal slot map',()=>{
 const normal=stageActors('st_w_05_01').find(a=>a.typeName==='WeightedLift');
 for(let count=2;count<=8;count++){
  const lift=compileOne(normal,count);
  assert.equal(lift.moveDirYFp,-310*F,'rises 310px');
  assert.equal(lift.moveDirXFp,0);
  assert.equal(lift.movePercent,50);
  assert.equal(lift.moveMin,1);
  assert.equal(lift.speedFp,F,'m_Speed is never written: MOVE_SPEED_DEFAULT');
  // -0.1 is raw -6553 through the stage float conversion, times (count-2).
  assert.equal(lift.returnSpeedFp,F-6553*(count-2));
  assert.equal(lift.flags.enableReturn,true);
  assert.equal(lift.w,192);
 }
});
test('a vertical lift carries its riders and stops under a player instead of crushing',()=>{
 const normal=stageActors('st_w_05_01').find(a=>a.typeName==='WeightedLift');
 const state=L.create(L.compile([normal],2));const lift=state.lifts[0];
 const rider={id:'p1',x:lift.x+20,y:lift.y-46,w:32,h:46,grounded:true,supportId:lift.id};
 for(let i=0;i<40;i++)L.beforeStep(state,{players:[rider],platforms:[]});
 assert.ok(lift.offsetYFp<0,'one rider of two meets 50 percent and the lift rises');
 assert.equal(rider.y+rider.h,lift.y,'the rider stays on top');
 // Now lower it onto a player standing underneath: the Down contact freezes it.
 const s2=L.create(L.compile([normal],2));const l2=s2.lifts[0];
 l2.offsetYFp=-20*F;l2.y=l2.anchor.y+l2.rectY-20;l2.proc=2;
 const under={id:'p2',x:l2.x+20,y:l2.y+l2.h,w:32,h:46,grounded:true,supportId:null};
 const y0=l2.y;for(let i=0;i<30;i++)L.beforeStep(s2,{players:[under],platforms:[]});
 assert.equal(l2.y,y0,'the lift waits while something touches its underside');
});
