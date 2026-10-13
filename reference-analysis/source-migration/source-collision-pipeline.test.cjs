const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('./source-collision-broadphase.js'),P=require('./source-collision-pipeline.js'),S=require('./source-collision-scene.js');
const F=65536;
function body(x,y,extra={}){const r={x:0,y:0,width:10*F,height:10*F};return {entityId:`${x},${y}`,priority:0,xRaw:x*F,yRaw:y*F,preXRaw:x*F,preYRaw:y*F,expectedXRaw:x*F,expectedYRaw:y*F,flags:0,layer:6,pushBackTarget:3,collisionType:0,rectRaw:{...r},preRectRaw:{...r},baseRectRaw:{...r},scaleRaw:{xRaw:F,yRaw:F},preScaleRaw:{xRaw:F,yRaw:F},expectedScaleRaw:{xRaw:F,yRaw:F},pivotRaw:{xRaw:0,yRaw:0},contacts:[],mapNormals:[],requestMapNormals:[],actorExists:true,...extra};}
function state(){return {storage:P.createStorage(),isEnableInertia:false,map:{tileFlags:Array.from({length:10},()=>Array(10).fill(0))},layerChecks:{6:{6:true}}};}
test('native90-element dictionaries allocate first recovered prime97',()=>{const s=P.createStorage();assert.equal(s.primary.capacity,97);assert.equal(s.secondary.capacity,97);assert.equal(s.primary.buckets.length,97);assert.equal(s.issueId,0);});
const host={onContact:()=>{},hasOnChangeScale:()=>false,hasOnPushedBack:()=>false,syncActorPosition:()=>{}};
test('default native layer table preserves all16 masks and symmetric37-pair bootstrap',()=>{
 const m=P.createLayerChecks();assert.deepEqual(m.map(row=>row.reduce((mask,on,i)=>mask|(on?1<<i:0),0)),[10,30711,25062,241,10,494,430,366,25062,2,6146,1024,1026,262,262,0]);
 assert.equal(m.flat().filter(Boolean).length,70);assert.equal(m[13][1],true);assert.equal(m[13][13],false);assert.equal(m[6][6],false);assert.equal(m[10][12],true);
 m[1][13]=false;assert.equal(P.createLayerChecks()[1][13],true);
});
test('pipeline sorts active storage and persists map correction/cache across JSON ticks',()=>{
 const w=state();w.map.tileFlags[1].fill(1);
 const a=B.createCollision(w.storage,body(20,42,{preYRaw:30*F,flags:64,priority:-1}));
 B.createCollision(w.storage,body(100,20,{priority:2}));B.createCollision(w.storage,body(200,20,{flags:1,priority:3}));
 const r=P.step(w,host);assert.deepEqual(r.orderedIds,[2,1]);
 const p=r.state.storage.primary.entries[0].collision;assert.equal(p.yRaw,38*F-655);
 assert.deepEqual(p.mapNormals,[{xRaw:0,yRaw:F}]);assert.deepEqual(p.requestMapNormals,[]);
 assert.equal(a.yRaw,42*F);assert.equal(r.state.storage.primary.entries[2].collision.flags,1);
 const next=P.step(JSON.parse(JSON.stringify(r.state)),host);assert.deepEqual(next.events.map(e=>e.type),['OnContacted']);
});
test('pipeline uses physical free slot order before unstable priority sorting',()=>{
 const w=state();for(let i=0;i<17;i++)B.createCollision(w.storage,body(i*20,20));B.removeCollision(w.storage,2);B.createCollision(w.storage,body(340,20));
 assert.deepEqual(P.step(w,host).orderedIds,[1,15,14,13,12,11,10,16,9,7,6,5,4,3,18,8,17]);
});
test('late pair callbacks preserve pre-callback flags and update descriptors for next pair',()=>{
 const a=body(20,20,{id:1,entityId:'a',flags:2,pushBackTarget:0}),b=body(22,20,{id:2,entityId:'b',flags:2,pushBackTarget:0}),c=body(200,20,{id:3,entityId:'c',flags:2,pushBackTarget:0});
 const w={collisions:[a,b,c],layerChecks:{6:{6:true}}},events=[];
 P.lateCollided(w,events,B.initialize(10,10),{onCollided:(world,self,other)=>{if(self.id===1&&other.id===2){b.flags=0;a.xRaw=200*F;}}});
 assert.deepEqual(events.map(e=>[e.ownerId,e.targetId]),[[1,2],[2,1],[1,3],[3,1]]);
});
test('CLR contact sort consumes original order including mixed equal X for17 records',()=>{
 const rows=Array.from({length:17},(_,i)=>({id:i,x:(i%3)*F}));
 const expected=B.nativeSort(rows,(a,b)=>b.x-a.x);assert.deepEqual(P.sortContactPositions(rows,F),expected);
 assert.notDeepEqual(expected,B.nativeSort(rows.slice().sort((a,b)=>b.x-a.x),(a,b)=>b.x-a.x));
});
test('inertia forwards unsorted cache rows to native sorter',()=>{
 const a=body(100,100,{id:1,layer:13,flags:64,preXRaw:99*F,contacts:[{id:2,normal:{x:0,y:-1}},{id:3,normal:{x:0,y:-1}},{id:4,normal:{x:0,y:-1}}]});
 const others=[110,90,100].map((x,i)=>body(x,80,{id:i+2,layer:2,entityId:`p${i}`}));
 const w={...state(),collisions:[a,...others],isEnableInertia:true,layerChecks:{2:{2:false,13:false},13:{2:false,13:false}}};let seen;
 const r=S.postPushBack(w,{sortContactPositions:(rows,dx)=>{if(rows.length)seen=rows.map(r=>r.id);return P.sortContactPositions(rows,dx);}});
 assert.deepEqual(seen,[2,3,4]);assert.deepEqual(r.trace.map(t=>t.id),[2,4,3]);
});
function circle(x,y,extra={}){const r={x:-10*F,y:-10*F,width:20*F,height:20*F};return body(x,y,{collisionType:1,circleRaw:{radiusRaw:10*F,xRaw:0,yRaw:0},rectRaw:{...r},preRectRaw:{...r},baseRectRaw:{...r},...extra});}
test('pipeline routes circle pairs through Gear response and retains canonical contact IDs',()=>{
 const w=state();B.createCollision(w.storage,circle(105,100,{preXRaw:100*F,flags:64}));B.createCollision(w.storage,circle(120,100,{preXRaw:125*F,flags:64}));
 const r=P.step(w,host),[a,b]=B.active(r.state.storage);
 assert.equal(a.xRaw,100*F+163776);assert.equal(b.xRaw,100*F+1474625);assert.deepEqual(a.contacts,[{id:2,state:1,normal:{x:1,y:0}}]);
 assert.deepEqual(b.contacts,[{id:1,state:1,normal:{x:-1,y:0}}]);assert.equal(a.collisionType,1);
 assert.equal(r.events.filter(e=>e.type==='OnContactAdded').length,2);
 assert.deepEqual(P.step(JSON.parse(JSON.stringify(r.state)),host).events.map(e=>e.type),['OnContacted','OnContacted']);
});
test('circle diagonal cache supports signed odd normal halves in the native radial probe',()=>{
 const a=circle(100,100,{id:1,entityId:'a'}),b=circle(112,116,{id:2,entityId:'b'});
 a.contacts=[{id:2,state:0,normal:{x:39321/F,y:52428/F}}];
 const r=S.refreshContacts({collisions:[a,b]},host);assert.deepEqual(r.events.map(e=>e.type),['OnContactAdded','OnContacted']);
 b.xRaw=120*F;b.yRaw=120*F;assert.equal(S.refreshContacts({collisions:[a,b]},host).events.length,0);
});
test('mixed circle/rectangle response uses bounding rectangle and preserves shape for next tick',()=>{
 const a=circle(105,100,{id:1,preXRaw:100*F,flags:64}),b=body(113,103,{id:2,entityId:'wall'});
 const r=S.applyPair({collisions:[a,b],layerChecks:{6:{6:true}}},1,2);
 // rollback(-2/5) truncates to-26214raw: 5*-26214 leaves2raw.
 assert.equal(r.code,0);assert.equal(r.world.collisions[0].xRaw,103*F+2-655);assert.equal(r.world.collisions[0].collisionType,1);
 assert.deepEqual(r.world.collisions[0].contacts,[{id:2,state:0,normal:{x:1,y:0}}]);
});
