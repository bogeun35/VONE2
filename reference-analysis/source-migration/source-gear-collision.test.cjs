'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('./source-gear-collision.js'),gear=require('./source-gear-devices.js');
const FP=65536;
function body(id,x,pre=x,options={}){return {collisionId:id,actorId:'actor'+id,actorExists:true,shape:'circle',flags:x===pre?2:66,layer:8,pushBackTarget:3,
 xRaw:x,yRaw:0,preXRaw:pre,preYRaw:0,scaleXRaw:FP,scaleYRaw:FP,preScaleXRaw:FP,preScaleYRaw:FP,pivotXRaw:0,pivotYRaw:0,
 expectedXRaw:x,expectedYRaw:0,expectedScaleXRaw:FP,expectedScaleYRaw:FP,
 circle:{radiusRaw:10*FP,xRaw:0,yRaw:0},contacts:[],...options};}
function context(extra={}){return {isEnableCheck:()=>true,...extra};}
function world(a,b){return {collisions:[a,b]};}
const noMap=()=>({trace:[{kind:'MapContactsAfterActors'}]});
test('native reciprocal normalization uses LUT and unsigned square input, exact axes and diagonal',()=>{
 assert.deepEqual(api.normalized({xRaw:0,yRaw:0}),{xRaw:0,yRaw:0});
 assert.deepEqual(api.normalized({xRaw:FP,yRaw:0}),{xRaw:FP,yRaw:0});
 assert.deepEqual(api.normalized({xRaw:0,yRaw:-FP}),{xRaw:0,yRaw:-FP});
 assert.deepEqual(api.normalized({xRaw:3*FP,yRaw:4*FP}),{xRaw:39321,yRaw:52428});
 assert.deepEqual(api.normalized({xRaw:-3*FP,yRaw:-4*FP}),{xRaw:-39322,yRaw:-52429});
});
test('real Gear local circle scales radius by max but mixed native rect scales axes/pivot',()=>{
 const c=body(1,684*FP,684*FP,{yRaw:264*FP,preYRaw:264*FP,scaleXRaw:2*FP,circle:{radiusRaw:gear.nativeConstants.radiusRaw,xRaw:gear.nativeConstants.circleXRaw,yRaw:gear.nativeConstants.circleYRaw}});
 assert.deepEqual(api.circle(c),{radiusRaw:90*FP,xRaw:682*FP,yRaw:216*FP});
 assert.deepEqual(api.rect(c),{widthRaw:180*FP,heightRaw:90*FP,xRaw:590*FP,yRaw:171*FP});
 c.pivotXRaw=FP;assert.equal(api.rect(c).xRaw,589*FP);
});
test('mixed circle/rect native collision is scaled bounding-rect, including Euclidean corner outside circle',()=>{
 const c=body(1,0,0,{circle:{radiusRaw:45*FP,xRaw:0,yRaw:0}}),r=body(2,40*FP,40*FP,{shape:'rect',yRaw:40*FP,preYRaw:40*FP,rect:{heightRaw:5*FP,widthRaw:5*FP,xRaw:0,yRaw:0}});
 assert.equal(api.isCollided(c,r),true);assert.equal(api.isCollided(r,c),true);
 r.xRaw=45*FP;assert.equal(api.isCollided(c,r),false);
 r.xRaw=40*FP;r.actorId=c.actorId;assert.equal(api.isCollided(c,r),false);
});
test('native circle tangent strictness and prior scale are independent of current max scale',()=>{
 const a=body(1,0),b=body(2,20*FP);assert.equal(api.isCollided(a,b),false);b.xRaw-=1;assert.equal(api.isCollided(a,b),true);
 a.scaleXRaw=2*FP;b.xRaw=25*FP;b.preXRaw=25*FP;assert.equal(api.isCollided(a,b),true);assert.equal(api.isCollided(a,b,{pre:true}),false);
});
test('native circle head-on response rewinds each by half overlap plus raw65, adds opposite cache normals',()=>{
 const w=world(body(1,5*FP,0),body(2,20*FP,25*FP));const r=api.pushBackPair(w,1,2,context());
 assert.equal(r.code,0);assert.equal(r.rewindRaw,32768);assert.equal(r.discriminantRaw,160000*FP);
 assert.deepEqual(r.positionA,{xRaw:163776,yRaw:0});assert.deepEqual(r.positionB,{xRaw:1474625,yRaw:0});
 assert.deepEqual(r.world.collisions.map(c=>c.contacts),[[{collisionId:2,normalXRaw:FP,normalYRaw:0,hasCalledAdded:false}],[{collisionId:1,normalXRaw:-FP,normalYRaw:0,hasCalledAdded:false}]]);
 assert.deepEqual(r.world.collisions.map(c=>c.flags),[66,66]);assert.equal(w.collisions[0].xRaw,5*FP);
});
test('real Gear radius45 single mover is backed off two units and raw65; no velocity patch',()=>{
 const local={radiusRaw:45*FP,xRaw:-2*FP,yRaw:-48*FP};const a=body(1,8*FP,0,{circle:local}),b=body(2,96*FP,96*FP,{circle:local});
 const r=api.pushBackPair(world(a,b),1,2,context());assert.equal(r.rewindRaw,16384);assert.deepEqual(r.positionA,{xRaw:393151,yRaw:0});assert.deepEqual(r.positionB,{xRaw:96*FP,yRaw:0});
 assert.deepEqual(r.rewindB,{xRaw:0,yRaw:0});assert.equal(r.world.collisions[1].flags,2);assert.equal('vxRaw' in r.world.collisions[0],false);
});
test('same-direction native dot-product branch zeroes leading rewind while preserving follower response',()=>{
 const r=api.pushBackPair(world(body(1,10*FP,0),body(2,25*FP,20*FP)),1,2,context());
 assert.equal(r.code,0);
 const w=world(body(1,10*FP,0),body(2,25*FP,20*FP));const raw=api.circleResponse(w,w.collisions[0],w.collisions[1]);
 assert.deepEqual(raw.positionA,{xRaw:5*FP-64,yRaw:0});assert.deepEqual(raw.positionB,{xRaw:25*FP,yRaw:0});
});
test('effective pre override changes solver rewind, but unchanged pre-overlap gate uses native previous pose',()=>{
 const w=world(body(1,5*FP,0),body(2,20*FP,25*FP));const r=api.pushBackPair(w,1,2,context({preOverrideA:{xRaw:-5*FP,yRaw:0}}));
 assert.equal(r.rewindRaw,21845);assert.deepEqual(r.positionA,{xRaw:109166,yRaw:0});assert.deepEqual(r.positionB,{xRaw:1420010,yRaw:0});
});
test('UpdatePushBack gates null/target/layer/move/fixed/disabled/prior and never invents recovery',()=>{
 const base=()=>world(body(1,5*FP,0),body(2,20*FP,25*FP));let w=base();assert.equal(api.pushBackPair(w,1,1,context()).reason,'same_or_absent');
 w=base();w.collisions[0].pushBackTarget=1;assert.equal(api.pushBackPair(w,1,2,context()).reason,'pushback_target');
 assert.equal(api.pushBackPair(base(),1,2,context({isEnableCheck:()=>false})).reason,'layer');
 w=base();for(const c of w.collisions)c.flags=2;assert.equal(api.pushBackPair(w,1,2,context()).reason,'not_moved');
 w=base();for(const c of w.collisions)c.flags|=4;assert.equal(api.pushBackPair(w,1,2,context()).reason,'both_fixed');
 w=base();w.collisions[0].flags|=1;assert.equal(api.pushBackPair(w,1,2,context()).reason,'no_current_collision');
 w=base();w.collisions[0].preXRaw=5*FP;w.collisions[1].preXRaw=20*FP;assert.equal(api.pushBackPair(w,1,2,context()).reason,'already_collided_pre');
 assert.throws(()=>api.pushBackPair(base(),1,2),/layer/);
});
test('mixed response calls lead rect adapter after native collision gates and reports exact geometry',()=>{
 const a=body(1,5*FP,0),b=body(2,20*FP,25*FP,{shape:'rect',rect:{heightRaw:20*FP,widthRaw:20*FP,xRaw:-10*FP,yRaw:-10*FP}});
 assert.throws(()=>api.pushBackPair(world(a,b),1,2,context()),/lead rectResponse/);
 const r=api.pushBackPair(world(a,b),1,2,context({rectResponse:(out,a,b)=>({code:1,nativeRectA:api.rect(a),nativeRectB:api.rect(b)})}));
 assert.equal(r.code,1);assert.deepEqual(r.nativeRectA,{heightRaw:20*FP,widthRaw:20*FP,xRaw:-5*FP,yRaw:-10*FP});
});
test('cache AddContactInfo deduplicates by collisionID without overwriting normal and suppresses Up cycle',()=>{
 const w=world(body(1,0),body(2,0));const [a,b]=w.collisions;
 assert.equal(api.addContact(w,a,2,{xRaw:FP,yRaw:0}),true);assert.equal(api.addContact(w,a,2,{xRaw:0,yRaw:FP}),false);assert.equal(a.contacts[0].normalXRaw,FP);
 a.contacts=[];b.contacts=[{collisionId:1,normalXRaw:0,normalYRaw:-FP,hasCalledAdded:true}];assert.equal(api.addContact(w,a,2,{xRaw:0,yRaw:-FP}),false);
 assert.equal(api.addContact(w,a,2,{xRaw:0,yRaw:FP}),true);
});
test('cache probe own half-normal retains near contact and dispatches Added then Contacted only once',()=>{
 const w=world(body(1,0),body(2,20*FP+65));api.addContact(w,w.collisions[0],2,{xRaw:FP,yRaw:0});
 let r=api.refreshActorContacts(w,1);assert.deepEqual(r.trace.map(e=>e.kind),['OnContactAdded','OnContacted']);assert.equal(r.world.collisions[0].contacts[0].hasCalledAdded,true);
 r=api.refreshActorContacts(r.world,1);assert.deepEqual(r.trace.map(e=>e.kind),['OnContacted']);r.world.collisions[1].xRaw=21*FP;
 r=api.refreshActorContacts(r.world,1);assert.deepEqual(r.removedIndices,[0]);assert.deepEqual(r.world.collisions[0].contacts,[]);
});
test('cache missing/disabled records remove in original index order; native callbacks run synchronously',()=>{
 const w=world(body(1,0),body(2,20*FP+65));const c=w.collisions[0];api.addContact(w,c,99,{xRaw:FP,yRaw:0});api.addContact(w,c,2,{xRaw:FP,yRaw:0});api.addContact(w,c,100,{xRaw:FP,yRaw:0});
 const seen=[];const r=api.refreshActorContacts(w,1,{onContactAdded:(out,c,other)=>{seen.push('added:'+other.collisionId);other.marker='changed';},onContacted:(out,c,other)=>seen.push(other.marker)});
 assert.deepEqual(r.removedIndices,[0,2]);assert.deepEqual(seen,['added:2','changed']);assert.equal(r.world.collisions[0].contacts.length,1);
 r.world.collisions[1].flags|=1;assert.deepEqual(api.refreshActorContacts(r.world,1).world.collisions[0].contacts,[]);
});
test('ForceUp flag halves only X scale, supplies bit8 and restores before native cache probe',()=>{
 const w=world(body(1,0,0,{flags:32|256|2}),body(2,0,0,{yRaw:-20*FP-65,preYRaw:-20*FP-65}));
 assert.throws(()=>api.refreshActorContacts(w,1),/ForceUp/);let seen;
 const r=api.refreshActorContacts(w,1,{forceUpSearch:(out,c,flag)=>{seen=[c.scaleXRaw,c.scaleYRaw,flag];return [2];}});
 assert.deepEqual(seen,[32768,65536,true]);assert.equal(r.world.collisions[0].scaleXRaw,65536);assert.deepEqual(r.trace.map(e=>e.kind),['OnContactAdded','OnContacted']);
});
test('finishCollision position sync uses squared epsilon4, clears moved before actor then map callbacks',()=>{
 let w=world(body(1,511,0,{expectedXRaw:0}),body(2,100*FP));let r=api.finishCollision(w,1,{refreshMapContacts:noMap,hasOnPushedBack:()=>true});assert.deepEqual(r.trace.map(e=>e.kind),['MapContactsAfterActors']);assert.equal(r.world.collisions[0].expectedXRaw,0);assert.equal(r.world.collisions[0].preXRaw,511);assert.equal(r.world.collisions[0].flags&64,0);
 w=world(body(1,512,0,{expectedXRaw:0}),body(2,100*FP));r=api.finishCollision(w,1,{refreshMapContacts:noMap,hasOnPushedBack:()=>true});assert.deepEqual(r.trace.map(e=>e.kind),['ActorPositionSync','OnPushedBack','MapContactsAfterActors']);assert.equal(r.trace[1].correctionXRaw,512);assert.equal(r.world.collisions[0].expectedXRaw,512);
});
test('finishCollision after native response orders actor sync/Added/Contacted/map; missing actor does not sync',()=>{
 let r=api.pushBackPair(world(body(1,5*FP,0),body(2,20*FP,25*FP)),1,2,context());r=api.finishCollision(r.world,1,{refreshMapContacts:noMap,hasOnPushedBack:()=>true});
 assert.deepEqual(r.trace.map(e=>e.kind),['ActorPositionSync','OnPushedBack','OnContactAdded','OnContacted','MapContactsAfterActors']);assert.equal(r.world.collisions[0].flags&64,0);assert.equal(r.world.collisions[0].preXRaw,163776);
 const w=world(body(1,512,0,{expectedXRaw:0,actorExists:false}),body(2,100*FP));assert.deepEqual(api.finishCollision(w,1,{refreshMapContacts:noMap,hasOnPushedBack:()=>true}).trace.map(e=>e.kind),['MapContactsAfterActors']);
 assert.throws(()=>api.finishCollision(w,1),/Map.IsContacted/);
});
test('late OnCollided pair order is input native order, callbacks captured before mutation, tree updates afterward',()=>{
 const w={collisions:[body(1,0),body(2,FP),body(3,2*FP)]},seen=[];
 const r=api.lateCollided(w,[2,1,3],context({candidateCheck:()=>true,onCollided:(out,a,b)=>{seen.push(a.collisionId+'>'+b.collisionId);if(a.collisionId===2)b.flags&=~2;},updateTreeObjects:(out,a,b)=>seen.push('tree'+a.collisionId+':'+b.collisionId)}));
 assert.deepEqual(r.trace.map(e=>[e.collisionId,e.otherCollisionId]),[[2,1],[1,2],[2,3],[3,2]]);
 assert.deepEqual(seen,['2>1','1>2','tree2:1','2>3','3>2','tree2:3']);
});
test('native normalization does not clamp axis to FP: epsilon pad and exact face matching preserve LUT quirks',()=>{
 assert.deepEqual(api.normalized({xRaw:5*FP,yRaw:0}),{xRaw:65535,yRaw:0});
 const r=api.pushBackPair(world(body(1,5*FP,0),body(2,20*FP,25*FP)),1,2,context({preOverrideA:{xRaw:-5*FP,yRaw:0}}));
 assert.equal(r.normal.xRaw,65537);assert.equal(r.world.collisions[0].contacts[0].normalXRaw,65537);
 assert.equal(gear.face1ContactFromCache({collisionExists:true,actorNormals:[{xRaw:0,yRaw:65537}],mapNormals:[]}),false);
});
test('cache negative half-normal uses signed shift; Up-side probe keeps contact and removes detached IDs',()=>{
 const w=world(body(1,0),body(2,0,0,{yRaw:-20*FP-65,preYRaw:-20*FP-65}));api.addContact(w,w.collisions[0],2,{xRaw:0,yRaw:-65535});
 const r=api.refreshActorContacts(w,1);assert.deepEqual(r.trace.map(e=>e.kind),['OnContactAdded','OnContacted']);assert.equal(r.trace[1].yRaw,-65535);
});
test('native circle solver zero relative motion and zero position normal create raw zero cache without guessed direction',()=>{
 const w=world(body(1,0),body(2,0));const r=api.circleResponse(w,w.collisions[0],w.collisions[1]);
 assert.equal(r.rewindRaw,0);assert.deepEqual(r.normal,{xRaw:0,yRaw:0});
 assert.deepEqual(w.collisions[0].contacts,[{collisionId:2,normalXRaw:0,normalYRaw:0,hasCalledAdded:false}]);
});
test('native late callback mask for first collision is captured outside its inner loop',()=>{
 const w={collisions:[body(1,0),body(2,FP,FP,{flags:0}),body(3,2*FP,2*FP,{flags:0})]};
 const r=api.lateCollided(w,[1,2,3],context({candidateCheck:()=>true,onCollided:(out,a)=>{a.flags&=~2;}}));
 assert.deepEqual(r.trace.map(e=>[e.collisionId,e.otherCollisionId]),[[1,2],[1,3]]);
});
test('scaled circle mixed rectangle keeps signed native scale without absolute-size normalization',()=>{
 const a=body(1,0,0,{scaleXRaw:-FP,scaleYRaw:FP}),b=body(2,0,0,{shape:'rect',rect:{heightRaw:FP,widthRaw:FP,xRaw:0,yRaw:0}});
 assert.equal(api.rect(a).widthRaw,-20*FP);assert.equal(api.isCollided(a,b),false);
});
test('general diagonal circle response uses FP quadratic/LUT reciprocal values rather than float contact normal',()=>{
 const a=body(1,3*FP,0,{yRaw:4*FP,preYRaw:0}),b=body(2,14*FP,14*FP,{yRaw:18*FP,preYRaw:18*FP});
 const r=api.pushBackPair(world(a,b),1,2,context());assert.equal(r.code,0);assert.equal(r.discriminantRaw,2620391424);assert.equal(r.rewindRaw,28783);
 assert.deepEqual(r.rewindA,{xRaw:86387,yRaw:115183});assert.deepEqual(r.positionA,{xRaw:110221,yRaw:146961});assert.deepEqual(r.positionB,{xRaw:14*FP,yRaw:18*FP});assert.deepEqual(r.normal,{xRaw:40362,yRaw:51632});
});
test('browser UMD collision helper reuses full Gear sqrt without an extra LUT or Node module',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),ctx={atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(require.resolve('./source-gear-devices.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(require.resolve('./source-gear-collision.js'),'utf8'),ctx);
 assert.equal(ctx.SourceGearCollision.normalized({xRaw:5*FP,yRaw:0}).xRaw,65535);assert.equal(ctx.SourceGearCollision.nativeConstants.padRaw,65);
});
test('native position sync does not invent an unregistered Gear pushed-back handler',()=>{
 const w=world(body(1,512,0,{expectedXRaw:0}),body(2,100*FP));const r=api.finishCollision(w,1,{refreshMapContacts:noMap,hasOnPushedBack:()=>false});
 assert.deepEqual(r.trace.map(e=>e.kind),['ActorPositionSync','MapContactsAfterActors']);assert.throws(()=>api.finishCollision(w,1,{refreshMapContacts:noMap}),/registry lookup/);
});
test('scale change registry lookup precedes expectedScale/preScale update and actor contacts',()=>{
 const w=world(body(1,0,0,{scaleXRaw:2*FP}),body(2,100*FP));let observed;
 const r=api.finishCollision(w,1,{refreshMapContacts:noMap,hasOnChangeScale:()=>true,onChangeScale:(out,c)=>{observed=[c.expectedScaleXRaw,c.preScaleXRaw];}});
 assert.deepEqual(observed,[FP,FP]);assert.deepEqual(r.trace.map(e=>e.kind),['OnChangeScale','MapContactsAfterActors']);assert.equal(r.world.collisions[0].expectedScaleXRaw,2*FP);assert.equal(r.world.collisions[0].preScaleXRaw,2*FP);
});
test('native OnContacted reloads cached normal after synchronous OnContactAdded mutation',()=>{
 const w=world(body(1,0),body(2,20*FP+65));api.addContact(w,w.collisions[0],2,{xRaw:FP,yRaw:0});
 const r=api.refreshActorContacts(w,1,{onContactAdded:(out,c)=>{c.contacts[0].normalXRaw=0;c.contacts[0].normalYRaw=-FP;}});
 assert.deepEqual(r.trace.map(e=>[e.kind,e.xRaw,e.yRaw]),[['OnContactAdded',FP,0],['OnContacted',0,-FP]]);
});
