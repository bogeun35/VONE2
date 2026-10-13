const {test}=require('node:test');const assert=require('node:assert/strict');const m=require('./source-move-contact.js');
const up={x:0,y:-1},right={x:1,y:0};
const body=(id,x,y,contacts=[])=>({id,x,y,w:10,h:10,solid:true,layer:1,contacts,mapNormals:[],contactResponse:'none'});
const link=(id,normal=up)=>({id,normal});
function stack(){return {bodies:[body('lift',0,20,[link('p1')]),body('p1',0,10,[link('p2')]),body('p2',0,0)]};}
test('upward carry returns pure exact displacement and root stays caller-owned',()=>{const w=stack();w.bodies[1].contacts=[];assert.equal(m.isEnableMoveContactActor(w,'lift',up),true);const r=m.moveContactActor(w,'lift',{x:0,y:-2});assert.deepEqual(r.moved,[{id:'p1',xRaw:0,yRaw:-131072,x:0,y:-2}]);assert.equal(r.world.bodies[1].y,8);assert.equal(r.world.bodies[0].y,20);assert.equal(w.bodies[1].y,10);assert.equal(r.world.bodies[1].collisionY,8);});
test('ceiling contact refuses lift transaction rather than crush or clamp',()=>{const w=stack();w.bodies[2].mapNormals=[up];const enabled=m.isEnableMoveContactActor(w,'lift',up);assert.equal(enabled,false);const r=enabled?m.moveContactActor(w,'lift',{x:0,y:-2}):{world:w,moved:[]};assert.deepEqual(r.moved,[]);assert.equal(r.world.bodies[2].y,0);});
test('two riders recurse in native contact order',()=>{const r=m.moveContactActor(stack(),'lift',{x:0,y:-2});assert.deepEqual(r.moved.map(x=>[x.id,x.yRaw]),[['p1',-131072],['p2',-131072]]);assert.deepEqual(r.world.bodies.map(x=>x.y),[20,8,-2]);});
test('horizontal push requires right contact face',()=>{const w={bodies:[body('wall',0,0,[link('p',right)]),body('p',10,0)]};assert.equal(m.isEnableMoveContactActor(w,'wall',right),true);assert.equal(m.moveContactActor(w,'wall',{x:2,y:0}).moved.length,0);assert.deepEqual(m.moveContactActor(w,'wall',{x:2,y:0},{face:3}).moved.map(x=>x.xRaw),[131072]);});
test('native transport itself does not preflight ceiling',()=>{const w=stack();w.bodies[2].mapNormals=[up];assert.equal(m.isEnableMoveContactActor(w,'lift',up),false);assert.equal(m.moveContactActor(w,'lift',{x:0,y:-2}).world.bodies[2].y,-2);});
test('epsilon is four raws and missing collision refuses',()=>{assert.equal(m.isEnableMoveContactActor(stack(),'lift',{xRaw:0,yRaw:-3}),false);assert.equal(m.isEnableMoveContactActor(stack(),'lift',{xRaw:0,yRaw:-4}),true);assert.equal(m.isEnableMoveContactActor(stack(),'absent',up),false);});
test('flags and mask filter transport but not preflight map checks',()=>{const w=stack();w.bodies[1].flags=0x80;assert.deepEqual(m.moveContactActor(w,'lift',up).moved,[]);w.bodies[1].flags=0;assert.deepEqual(m.moveContactActor(w,'lift',up,{targetCollisionLayerMask:1}).moved,[]);w.bodies[1].mapNormals=[up];assert.equal(m.isEnableMoveContactActor(w,'lift',up,{targetCollisionLayerMask:1,isEnableRecursive:false}),false);});
test('0x10 preflight dot branch blocks zero or positive and skips negative',()=>{const w=stack();w.bodies[1].flags=0x10;assert.equal(m.isEnableMoveContactActor(w,'lift',up,{face:0}),false);assert.equal(m.isEnableMoveContactActor(w,'lift',up,{face:1}),true);assert.equal(m.isEnableMoveContactActor(w,'lift',up,{face:2}),false);});
test('ignore target velocity subtracts negative projection, recursion receives original delta',()=>{const w=stack();w.bodies[1].velocity={x:0,y:3};const r=m.moveContactActor(w,'lift',{x:0,y:-2},{isEnableIgnoreTargetVelo:true});assert.deepEqual(r.moved.map(x=>x.y),[-5,-2]);});
test('recursive option and sync option',()=>{const r=m.moveContactActor(stack(),'lift',up,{isEnableRecursive:false,isEnableSyncCollisionPos:false});assert.deepEqual(r.moved.map(x=>x.id),['p1']);assert.deepEqual(r.synced,[]);assert.equal(r.world.bodies[2].y,0);});
test('recursiveFaceIsMov changes only recursive contact selection',()=>{const w=stack();w.bodies[1].contacts=[link('p2',right)];assert.deepEqual(m.moveContactActor(w,'lift',right,{recursiveFaceIsMov:true}).moved.map(x=>x.id),['p1','p2']);});
test('per-call duplicate suppression and serializable output',()=>{const w=stack();w.bodies[0].contacts.push(link('p2'));const r=m.moveContactActor(w,'lift',up);assert.deepEqual(r.moved.map(x=>x.id),['p1','p2']);assert.deepEqual(JSON.parse(JSON.stringify(r)),r);});
test('unestablished AABB contacts, callbacks and diagonal normalization refuse',()=>{const w=stack();delete w.bodies[0].contacts;assert.throws(()=>m.moveContactActor(w,'lift',up),/cached contacts/);const v=stack();delete v.bodies[1].contactResponse;assert.throws(()=>m.moveContactActor(v,'lift',up),/actor-type/);assert.throws(()=>m.isEnableMoveContactActor(stack(),'lift',{x:1,y:1}),/diagonal/);});
test('ordinary Player has no registered move callback; Magnet still refuses',()=>{
 const w=stack();w.bodies[1].actorType=27;delete w.bodies[1].contactResponse;
 assert.equal(m.moveContactActor(w,'lift',up).world.bodies[1].y,9);
 w.bodies[1].actorType=72;w.bodies[1].contactResponse='none';
 assert.throws(()=>m.moveContactActor(w,'lift',up),/actor-type/);
 w.bodies[1].actorFlags=0x10;
 assert.equal(m.moveContactActor(w,'lift',up).world.bodies[1].y,9);
});
test('cache deduplicates by ID and preserves the first normal and state',()=>{
 const w=stack();w.bodies[0].contacts[0].state=1;
 const r=m.addContactInfo(w,'lift','p1',3);
 assert.equal(r.added,false);assert.deepEqual(r.world,w);
 const a=m.addContactInfo(w,'lift','p2',0);
 assert.equal(a.added,true);assert.deepEqual(a.world.bodies[0].contacts[1],{id:'p2',normal:up,state:0});
 assert.equal(w.bodies[0].contacts.length,1);
});
test('cache suppresses reciprocal Up only, and permits an absent target ID',()=>{
 const w=stack();w.bodies[1].contacts=[link('lift')];
 assert.equal(m.addContactInfo(w,'p1','lift',0).added,false); // existing ID wins
 w.bodies[1].contacts=[];
 assert.equal(m.addContactInfo(w,'p1','lift',0).added,false); // reciprocal Up
 assert.equal(m.addContactInfo(w,'p1','lift',1).added,true);
 assert.equal(m.addContactInfo(w,'p1','missing',0).added,true);
 assert.throws(()=>m.addContactInfo(w,'p1','p2',9),/cardinal/);
});
const rect=(entityId,x,y,width=10,height=10)=>({entityId,collisionType:0,flags:0,collisionRectRaw:{x:x*65536,y:y*65536,width:width*65536,height:height*65536}});
test('retention uses half-pixel normal probe and strict edges, not fresh contact discovery',()=>{
 const owner=rect('lift',0,10),target=rect('p',0,0),c=link('p');
 assert.equal(m.retainsRectContact(owner,target,c),true);
 target.collisionRectRaw.y=-32768;
 assert.equal(m.retainsRectContact(owner,target,c),false); // exactly half-pixel gap
 target.collisionRectRaw.y++;
 assert.equal(m.retainsRectContact(owner,target,c),true); // one raw inside
 target.collisionRectRaw.x=655360;
 assert.equal(m.retainsRectContact(owner,target,c),false); // side edge only
});
test('retention rejects inactive/same-entity, handles disappearance, refuses unresolved shapes',()=>{
 const a=rect('a',0,10),b=rect('b',0,0),c=link('b');
 assert.equal(m.retainsRectContact(a,null,c),false);
 b.entityId='a';assert.equal(m.retainsRectContact(a,b,c),false);
 b.entityId='b';b.flags=1;assert.equal(m.retainsRectContact(a,b,c),false);
 b.flags=0;b.collisionType=1;assert.throws(()=>m.retainsRectContact(a,b,c),/rectangle/);
 b.collisionType=0;delete b.collisionRectRaw;assert.throws(()=>m.retainsRectContact(a,b,c),/collisionRectRaw/);
});
