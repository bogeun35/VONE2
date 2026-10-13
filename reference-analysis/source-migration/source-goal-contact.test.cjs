const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('./source-goal-contact.js'),K=require('./source-key-contact.js'),C=require('./source-collision-callbacks.js'),P=require('./source-collision-pipeline.js'),B=require('./source-collision-broadphase.js');
test('closed Goal ignores players, key opens once, then sets Player bit16',()=>{
 const a={goal:{flags:0}},target={id:2,layer:1,entityId:'p'},w={collisions:[target]},player={flags:512},calls=[],host={playerByEntityId:()=>player,playSe:(w,e)=>calls.push(e)};
 const run=()=>G.onCollided(w,a,{}, {targetId:2},host);
 run();assert.equal(player.flags,512);target.layer=10;run();run();assert.equal(a.goal.flags,1);assert.deepEqual(calls,[{entityId:null,seId:9,positionRaw:{xRaw:0,yRaw:0},volumeRaw:65536,pitchRaw:65536,isDisableCheckBlankTime:false}]);target.layer=1;run();assert.equal(player.flags,66048);
});
test('no Player component returns; registered sound host cannot be silently dropped',()=>{
 const a={goal:{flags:1}},w={collisions:[{id:2,layer:1,entityId:'nonplayer'}]};assert.doesNotThrow(()=>G.onCollided(w,a,{}, {targetId:2},{playerByEntityId:()=>null}));
 a.goal.flags=0;w.collisions[0].layer=10;assert.throws(()=>G.onCollided(w,a,{}, {targetId:2},{}),/PlaySe/);assert.equal(a.goal.flags,0);
});
test('native late-pair order opens Goal after earlier Player pair; entry flag arrives next pass',()=>{
 const F=65536,shape=(id,entityId,layer,flags,rectRaw)=>({id,entityId,layer,flags,collisionType:0,xRaw:100*F,yRaw:100*F,rectRaw});
 const w={collisions:[shape(1,'p',1,0,{x:-16*F,y:-47*F,width:32*F,height:46*F}),shape(2,'key',10,2,{x:-16*F,y:-28*F,width:32*F,height:56*F}),shape(3,'goal',12,2,{x:-24*F,y:-32*F,width:48*F,height:32*F})],layerChecks:P.createLayerChecks()},actors={p:{entityId:'p',actorType:27,flags:0,player:{flags:0}},key:{entityId:'key',actorType:17,flags:0,key:{flags:0,phase:0,attachTargetId:null,excludeTargetId:null,excludeTimerRaw:0,switchTargetName:''}},goal:{entityId:'goal',actorType:14,flags:0,goal:{flags:0}}},sounds=[];
 const host=C.createHost({'KeyComponent.OnCollided':(w,a,b,e)=>K.onCollided(w,a,b,e,{actorById:(w,id)=>actors[id]||null,playSe:(w,a,se)=>sounds.push(se)}),'GoalComponent.OnCollided':(w,a,b,e)=>G.onCollided(w,a,b,e,{playerByEntityId:(w,id)=>actors[id]?.player||null,playSe:(w,e)=>sounds.push(e.seId)})},{actorForCollision:(w,b)=>actors[b.entityId],syncActorPosition:()=>{throw Error('Unexpected sync');}});
 const events=[];P.lateCollided(w,events,B.initialize(20,10),host);
 assert.deepEqual(events.map(e=>[e.ownerId,e.targetId]),[[2,1],[3,1],[2,3],[3,2]]);
 assert.equal(actors.key.key.phase,2);assert.equal(actors.goal.goal.flags,1);assert.equal(actors.p.player.flags,0);assert.deepEqual(sounds,[22,9]);
 P.lateCollided(w,[],B.initialize(20,10),host);assert.equal(actors.p.player.flags,65536);assert.deepEqual(sounds,[22,9]);
});
