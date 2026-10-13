const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('./source-collision-callbacks.js');
test('native registry includes all115 entries and Player has only two contact callbacks',()=>{
 assert.equal(C.registrationCount,115);
 assert.deepEqual(C.kinds.filter(k=>C.has(27,k)),['OnContactAdded','OnContacted']);
 assert.equal(C.lookup(27,'OnContactAdded').callbackVA,'0x1816c1b50');
 assert.equal(C.lookup(72,'OnMoveByContact').callbackVA,'0x1816d2b00');
 assert.equal(C.lookup(17,'OnCollided').components[0],'KeyComponent');
 assert.equal(C.lookup(23,'OnPushedBack').callbackVA,'0x181886080');
});
test('missing registration skips but a missing implementation fails visibly',()=>{
 const a={actorType:27,flags:0};
 assert.deepEqual(C.invoke({},a,{}, {type:'OnCollided'},{}),{invoked:false,reason:'unregistered'});
 assert.throws(()=>C.invoke({},a,{}, {type:'OnContacted'},{}),/PlayerComponent.OnContacted/);
 assert.deepEqual(C.invoke({},null,{}, {type:'OnContacted'},{}),{invoked:false,reason:'actor-absent'});
 assert.throws(()=>C.has(undefined,'OnCollided'),/ushort/);
});
test('pause suppresses contacts/collided/move but not pushed-back or scale',()=>{
 for(const [actorType,type]of [[27,'OnContactAdded'],[27,'OnContacted'],[17,'OnCollided'],[72,'OnMoveByContact']])assert.equal(C.invoke({}, {actorType,flags:16},{},{type},{}).reason,'actor-paused');
 assert.throws(()=>C.invoke({}, {actorType:23,flags:16},{},{type:'OnPushedBack'},{}),/not implemented/);
 const rows=require('./collision-callback-registry.json').registrations.filter(r=>r.method.endsWith('add_OnChangeScale'));
 assert.equal(rows.length,2);for(const r of rows)assert.throws(()=>C.invoke({}, {actorType:r.ordinal,flags:16},{},{type:'OnChangeScale'},{}),/not implemented/);
});
test('dispatcher mutates current world synchronously and rechecks pause each call',()=>{
 const actor={actorType:27,flags:0},body={id:1,actorType:27},w={collisions:[body],calls:[]};
 const h=C.createHost({'PlayerComponent.OnContactAdded':(world,a,b,e,row)=>{world.calls.push(row.callbackVA);a.flags|=16;}},{actorForCollision:()=>actor,syncActorPosition:()=>{throw Error('not called');}});
 h.onContact(w,{type:'OnContactAdded',ownerId:1});h.onContact(w,{type:'OnContacted',ownerId:1});
 assert.deepEqual(w.calls,['0x1816c1b50']);assert.equal(h.hasOnPushedBack(body),false);
});
