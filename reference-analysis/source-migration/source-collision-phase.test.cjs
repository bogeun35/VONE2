const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('./source-collision-scene.js'),M=require('./source-collision-map.js'),R=require('./source-collision-rect.js');
const F=65536;
function body(id,x,y){const rect={x:0,y:0,width:10*F,height:10*F};return {id,entityId:id,xRaw:x*F,yRaw:y*F,preXRaw:x*F,preYRaw:y*F,expectedXRaw:x*F,expectedYRaw:y*F,flags:0,layer:6,pushBackTarget:3,collisionType:0,rectRaw:{...rect},preRectRaw:{...rect},baseRectRaw:{...rect},scaleRaw:{xRaw:F,yRaw:F},preScaleRaw:{xRaw:F,yRaw:F},expectedScaleRaw:{xRaw:F,yRaw:F},pivotRaw:{xRaw:0,yRaw:0},contacts:[],mapNormals:[],requestMapNormals:[],actorExists:true};}
function world(list){return {collisions:list,isEnableInertia:false,map:{tileFlags:Array.from({length:10},()=>Array(10).fill(0))},layerChecks:{6:{6:true}}};}
const host={treeObject:()=>({level:0,index:0}),candidateCheck:()=>true,onContact:()=>{},hasOnChangeScale:()=>false,hasOnPushedBack:()=>false,syncActorPosition:()=>{},lateCollided:()=>{}};
test('map requests are invisible to cache until Added/Contacted, deduplicated and then retained',()=>{
 const b=body('p',20,20),w=world([b]);w.map.tileFlags[1].fill(1);
 const move=M.moveMap(w.map,b,{xRaw:0,yRaw:30*F});w.collisions[0]=move.collision;
 assert.deepEqual(move.collision.mapNormals,[]);assert.deepEqual(move.collision.requestMapNormals,[{xRaw:0,yRaw:F}]);
 const first=S.refreshMapContacts(w,'p',{onContact:(world,e)=>{assert.equal(world.collisions[0].mapNormals.length,0);assert.deepEqual(e.mapCell,{x:0,y:1});}});
 assert.deepEqual(first.events.map(e=>e.type),['OnContactAdded','OnContacted']);assert.equal(first.world.collisions[0].requestMapNormals.length,0);
 const next=M.moveMap(w.map,first.world.collisions[0],{xRaw:0,yRaw:F});assert.equal(next.collision.requestMapNormals.length,0);
 first.world.collisions[0]=next.collision;assert.deepEqual(S.refreshMapContacts(first.world,'p',host).events.map(e=>e.type),['OnContacted']);
});
test('stale requested and retained map contacts are removed after movement, no invented callbacks',()=>{
 const b=body('p',20,20);b.mapNormals=[{xRaw:0,yRaw:F}];b.requestMapNormals=[{xRaw:F,yRaw:0}];
 const r=S.refreshMapContacts(world([b]),b.id,host);assert.deepEqual(r.events,[]);assert.deepEqual(r.world.collisions[0].mapNormals,[]);assert.deepEqual(r.world.collisions[0].requestMapNormals,[]);
});
test('forced pass rolls back every position after later force failure but preserves failure flags',()=>{
 const a=body('liftA',107,20),pa=body('pa',115,20),b=body('liftB',207,20),pb=body('pb',215,20);
 for(const q of [a,b]){q.preXRaw-=7*F;q.flags=4|64;q.pushBackTarget=2;}pb.flags=16;
 const w=world([a,pa,b,pb]),r=S.pushBackPass(w,true,host);
 assert.equal(r.code,1);assert.ok(r.trace.some(t=>t.code===0));assert.equal(r.world.collisions[2].flags&8,8);
 assert.deepEqual(r.world.collisions.map(q=>q.xRaw),w.collisions.map(q=>q.xRaw));assert.equal(w.collisions[2].flags&8,0);
});
test('ordinary pass excludes unyielding pairs; next outer pass can resolve failed force as ordinary',()=>{
 const a=body('lift',107,20),b=body('wall',115,20);a.preXRaw=100*F;a.flags=4|64;b.flags=16;
 const w=world([a,b]);assert.equal(S.pushBackPass(w,false,host).code,2);
 const r=S.solvePushBack(w,host);assert.equal(r.outerPasses,2);assert.equal(r.world.collisions[0].flags&8,8);
 assert.ok(r.world.collisions[0].xRaw<=105*F);
});
test('scale shrink is direct; tiny growth65raw waits; unblocked growth reaches desired scale',()=>{
 for(const [requested,expected]of [[F/2,F/2],[F+65,F],[2*F,2*F]]){
  const b=body('p',20,20);b.expectedScaleRaw={xRaw:requested,yRaw:F};
  const r=S.updateScale(world([b]),b.id).world.collisions[0];assert.equal(r.scaleRaw.xRaw,expected);assert.equal(r.xRaw,b.xRaw);
 }
});
test('scale growth against map and another rectangle uses corner fraction and1310raw margin',()=>{
 for(const kind of ['map','rect']){
  const b=body('p',30,20);b.expectedScaleRaw={xRaw:3*F,yRaw:F};const w=world([b]);
  if(kind==='map')for(const row of w.map.tileFlags)row[1]=1;else w.collisions.push(body('wall',48,20));
  const r=S.updateScale(w,b.id).world.collisions[0];
  // Map trial allows8px-655raw. Rectangle trial first truncates -12/20
  // rollback to-39321, leaving12raw extra before the same655raw gap.
  assert.equal(r.scaleRaw.xRaw,kind==='map'?116588:116590);
  assert.equal(r.xRaw,b.xRaw);assert.equal(r.yRaw,b.yRaw);
 }
});
test('Collision.Move trial separates one body without native pair force gates or cache creation',()=>{
 const a=body('a',20,20),b=body('b',35,20),r=R.moveAgainst(a,b,{xRaw:10*F,yRaw:0});
 assert.equal(r.delta.xRaw,5*F-655);assert.deepEqual(r.collision.contacts,[]);assert.equal(b.xRaw,35*F);
});
test('finish sync threshold is squared displacement:511raw misses,512raw syncs before contact callbacks',()=>{
 for(const d of [511,512]){
  const b=body('p',20,20);b.xRaw+=d;
  const r=S.finishCollision(world([b]),b.id,{...host,hasOnPushedBack:()=>true,onPushedBack:()=>{}});
  assert.deepEqual(r.events.map(e=>e.type),d===511?[]:['syncActorPosition','onPushedBack']);assert.equal(r.world.collisions[0].flags&64,0);
 }
});
test('checkChunk executes scale correction, Actor sync, actor contacts, map contacts then late events',()=>{
 const b=body('p',20,37),upper=body('upper',20,27);b.layer=6;b.flags=64;b.yRaw+=5*F;b.scaleRaw={xRaw:F+65,yRaw:F};
 b.contacts=[{id:upper.id,state:0,normal:{x:0,y:-1}}];const w=world([b,upper]);w.map.tileFlags[1].fill(1);
 const order=[],r=S.checkChunk(w,{...host,hasOnChangeScale:()=>true,onChangeScale:()=>order.push('scale'),syncActorPosition:()=>order.push('sync'),onContact:(w,e)=>order.push(e.isCollision?'actor':'map'),lateCollided:()=>order.push('late')});
 assert.ok(order.includes('scale'));assert.ok(order.includes('sync'));assert.ok(order.includes('map'));assert.equal(order.at(-1),'late');assert.ok(order.indexOf('sync')<order.indexOf('map'));
 assert.equal(r.world.collisions[0].requestMapNormals.length,0);
});
