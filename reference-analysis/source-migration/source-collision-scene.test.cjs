const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('./source-collision-scene.js');
const F=65536;
function body(id,x,y,layer=1){const r={x:0,y:0,width:10*F,height:10*F};return {id,entityId:id,xRaw:x*F,yRaw:y*F,preXRaw:x*F,preYRaw:y*F,rectRaw:r,preRectRaw:{...r},layer,flags:0,pushBackTarget:3,collisionType:0,contacts:[],mapNormals:[],playerFacts:layer===1?{wakeUpCount:1,inertiaAttachmentId:null}:null};}
function world(bodies){return {isEnableInertia:true,collisions:bodies,map:{tileFlags:Array.from({length:20},()=>Array(20).fill(0))},layerChecks:{1:{1:true,2:true,13:true},2:{1:true,2:true,13:true},13:{1:true,2:true,13:true}},cameraAreaRaw:{x:0,width:960*F}};}
function stack(count){const lift=body('lift',100,150,13);lift.pushBackTarget=2;lift.flags=4|64;lift.xRaw+=2*F;const bodies=[lift];for(let i=0;i<count;i++){const b=body('p'+i,100,140-10*i);bodies[bodies.length-1].contacts=[{id:b.id,state:1,normal:{x:0,y:-1}}];bodies.push(b);}return world(bodies);}
test('2..8 native cached stacks receive horizontal inertia once; previous positions reset',()=>{
 for(let n=2;n<=8;n++){
  const input=stack(n),r=S.postPushBack(input);
  assert.deepEqual(r.trace.map(q=>q.id),Array.from({length:n},(_,i)=>'p'+i));
  for(const b of r.world.collisions){assert.equal(b.xRaw,102*F);assert.equal(b.preXRaw,b.xRaw);assert.equal(b.flags&64,0);}
  assert.equal(input.collisions[1].xRaw,100*F);assert.deepEqual(JSON.parse(JSON.stringify(r)),r);
 }
});
test('disabled source, disabled recipient, sleeping and layer gates do not apply carry',()=>{
 for(const change of [w=>w.collisions[0].flags|=128,w=>w.collisions[1].flags|=128,w=>w.collisions[1].playerFacts.wakeUpCount=0,w=>w.collisions[1].layer=13]){
  const w=stack(1);change(w);assert.equal(S.postPushBack(w).world.collisions[1].xRaw,100*F);
 }
 const w=stack(1);w.isEnableInertia=false;assert.deepEqual(S.postPushBack(w).world,w);
});
test('Map wall restricts carried stack without unconditionally adding dx',()=>{
 const w=stack(2);for(const row of w.map.tileFlags)row[3]=1;
 for(const b of w.collisions.slice(1)){b.xRaw=134*F-655;b.preXRaw=b.xRaw;}
 const r=S.postPushBack(w);assert.deepEqual(r.trace.map(x=>x.xRaw),[0,0]);
});
test('leading rider moves first for positive and negative X',()=>{
 for(const sign of [1,-1]){
  const w=stack(1),b=body('other',120,140);w.collisions.push(b);w.collisions[0].contacts.push({id:'other',state:1,normal:{x:0,y:-1}});w.collisions[0].xRaw=w.collisions[0].preXRaw+sign*F;
  assert.deepEqual(S.postPushBack(w).trace.map(x=>x.id),sign>0?['other','p0']:['p0','other']);
 }
});
test('reverse gravity and both-face flag choose recipients explicitly',()=>{
 const w=stack(1);w.collisions[1].flags|=256;
 assert.equal(S.postPushBack(w).trace.length,0);
 w.collisions[0].flags|=512;assert.equal(S.postPushBack(w).trace.length,1);
 w.collisions[0].flags=(w.collisions[0].flags&~512)|256;w.collisions[0].contacts[0].normal.y=1;
 assert.equal(S.postPushBack(w).trace.length,1);
});
test('equipment attachment moves before a sleeping owner; missing facts refuse',()=>{
 const w=stack(1),attached=body('equip',150,100,2);w.collisions.push(attached);
 w.collisions[1].playerFacts={wakeUpCount:0,inertiaAttachmentId:'equip'};
 const r=S.postPushBack(w);assert.deepEqual(r.trace.map(x=>x.id),['equip']);assert.equal(r.world.collisions[1].xRaw,100*F);
 delete w.collisions[1].playerFacts;assert.throws(()=>S.postPushBack(w),/Player lookup/);
});
test('camera clamp and forceSide propagate only to forward overlapped player bodies',()=>{
 const w=stack(1);w.collisions[0].flags|=1024;w.cameraAreaRaw.width=101*F;
 assert.equal(S.postPushBack(w).world.collisions[1].xRaw,101*F);
 const left=stack(1);left.collisions[0].flags|=1024;left.cameraAreaRaw.x=105*F;
 assert.equal(S.postPushBack(left).world.collisions[1].xRaw,105*F);
});
test('pair collision generates native contact IDs, refresh emits Added then Contacted once',()=>{
 const a=body('p',100,112),b=body('lift',100,120,13);a.preYRaw=109*F;a.flags=64;b.flags=4;b.pushBackTarget=2;
 const r=S.applyPair(world([a,b]),'p','lift');assert.equal(r.code,0);
 assert.deepEqual(r.world.collisions.map(q=>q.contacts.map(c=>c.id)),[['lift'],['p']]);
 const first=S.refreshContacts(r.world,{onContact:()=>{}});assert.deepEqual(first.events.map(e=>e.type),['OnContactAdded','OnContacted','OnContactAdded','OnContacted']);
 const second=S.refreshContacts(first.world,{onContact:()=>{}});assert.deepEqual(second.events.map(e=>e.type),['OnContacted','OnContacted']);
 assert.throws(()=>S.refreshContacts(r.world),/callback adapter/);
});
test('contact refresh removes disappeared or separated entries in order, preserves surviving state',()=>{
 const w=stack(2);w.collisions[0].contacts.push({id:'missing',state:1,normal:{x:1,y:0}});w.collisions[2].xRaw+=100*F;
 const r=S.refreshContacts(w,{onContact:()=>{}});
 assert.equal(r.world.collisions[0].contacts.length,1);assert.deepEqual(r.world.collisions[1].contacts,[]);
});
test('native updateMap rewinds proposed movement before testing the crossed tile',()=>{
 const b=body('p',10,10);b.xRaw=100*F;b.flags=64;const w=world([b]);for(const row of w.map.tileFlags)row[1]=1;
 assert.equal(S.updateMap(w).collisions[0].xRaw,38*F-655);
});
test('equal-X sorting and ForceSearchUp without scale facts refuse',()=>{
 const w=stack(1);const q=body('other',100,120);w.collisions.push(q);w.collisions[0].contacts.push({id:q.id,state:1,normal:{x:0,y:-1}});
 assert.throws(()=>S.postPushBack(w),/sort order/);w.collisions[0].flags|=32;
 assert.throws(()=>S.refreshContacts(w,{onContact:()=>{}}),/ForceSearchUp/);
});
function forceSearchBody(id,x,y){
 const b=body(id,x,y);b.flags|=32;b.baseRectRaw={...b.rectRaw};
 b.scaleRaw={xRaw:F,yRaw:F};b.pivotRaw={xRaw:5*F,yRaw:0};return b;
}
test('ForceSearchUp discovers new central upper contact before Added callback and restores width',()=>{
 const p=forceSearchBody('p',100,100),upper=body('upper',102,90),edge=body('edge',94,90);
 // Narrow edge overlap falls outside the temporary half-width probe.
 edge.rectRaw.width=7*F;edge.preRectRaw.width=7*F;
 const w=world([p,edge,upper]),r=S.refreshContacts(w,{onContact:()=>{}});
 assert.deepEqual(r.world.collisions[0].contacts,[{id:'upper',state:1,normal:{x:0,y:-1}}]);
 assert.deepEqual(r.events.map(e=>e.type),['OnContactAdded','OnContacted']);
 assert.deepEqual(r.world.collisions[0].rectRaw,p.rectRaw);assert.deepEqual(w.collisions[0].contacts,[]);
 assert.equal(S.refreshContacts(r.world,{onContact:()=>{}}).events.length,1);
});
test('ForceSearchUp excludes overlapping, inactive, same-entity and disabled-layer targets',()=>{
 for(const change of [b=>b.yRaw=91*F,b=>b.flags|=1,b=>b.entityId='p',b=>b.pushBackTarget=1]){
  const p=forceSearchBody('p',100,100),q=body('q',100,90);change(q);
  assert.equal(S.refreshContacts(world([p,q]),{onContact:()=>{}}).events.length,0);
 }
 const w=world([forceSearchBody('p',100,100),body('q',100,90,2)]);w.layerChecks[2][1]=false;
 assert.equal(S.refreshContacts(w,{onContact:()=>{}}).events.length,0);
});
test('reverse gravity searches down but native unconditional Up append is pruned by normal probe',()=>{
 const p=forceSearchBody('p',100,100);p.flags|=256;
 const r=S.refreshContacts(world([p,body('q',100,110)]),{onContact:()=>{}});
 assert.deepEqual(r.world.collisions[0].contacts,[]);assert.deepEqual(r.events,[]);
});
test('overhead ledge restricts the top rider while the lower rider receives inertia',()=>{
 const w=stack(2),ledge=body('ledge',110,130,2);ledge.flags=16;ledge.pushBackTarget=2;w.collisions.push(ledge);
 const r=S.postPushBack(w);
 assert.equal(r.world.collisions.find(b=>b.id==='p0').xRaw,102*F);
 assert.equal(r.world.collisions.find(b=>b.id==='p1').xRaw,100*F);
 assert.equal(r.world.collisions.find(b=>b.id==='ledge').xRaw,110*F);
});
test('10-4 and 3-2 population-selected lift facts drive 2..8 synthetic contact stacks',()=>{
 const data=require('./installed-stage-decoded.local.json'),pop=require('./population-rules.cjs');
 const L=require('./source-lift-devices.js'),P=require('./source-linepath-devices.js');
 for(let count=2;count<=8;count++)for(const stageId of ['st_w_10_04','st_w_03_02']){
  const stage=data.stages.find(s=>s.stageId===stageId),actors=pop.actorsForCount(pop.selectVariant(stage.json.stageInitParamList,count,true),count);
  const w=stack(count),lift=w.collisions[0];
  if(stageId==='st_w_10_04'){
   const [d]=L.compile(actors,count).lifts;assert.ok(d);assert.equal(d.moveDirYFp,0);
   lift.rectRaw={x:d.rectX*F,y:d.rectY*F,width:d.w*F,height:d.h*F};
  }else{
   const a=actors.find(a=>a.typeName==='LinePathLift'),d=P.decodeLinePathLift(a,count);
   assert.equal(d.mode,0);assert.equal(d.isInertia,1);lift.rectRaw={...d.rectRaw};
   if(!d.isInertia)lift.flags|=128;
   // Disabled authored modes are decoded facts, not enabled path runtimes.
   for(const mode of [3,4,5]){
    const changed=JSON.parse(JSON.stringify(a));changed.datas[5].f=mode;
    assert.equal(P.decodeLinePathLift(changed,count).isInertia,0);
    const disabled=JSON.parse(JSON.stringify(w));disabled.collisions[0].flags|=128;
    assert.equal(S.postPushBack(disabled).trace.length,0);
   }
  }
  lift.preRectRaw={...lift.rectRaw};lift.flags|=1024;
  const r=S.postPushBack(w);assert.equal(r.trace.length,count);
  assert.ok(r.world.collisions.slice(1).every(b=>b.xRaw===102*F));
 }
});
