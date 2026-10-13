/* Actor common phases, native static only. OnUpdate1 0x18169e0b0 clears
 * OffsetDrawPos, snapshots Pos/Velo, consumes RequestAnimationId only when
 * DeterministicFrame.Verified (metadata type13048 fieldoffset24) is true.
 * OnUpdate2 0x18169e100: Pos += Velo + ((Accel<<15 signed64)>>16), then
 * Velo += Accel; syncCollisionPos; flag13 disables collisions with self owner.
 * syncCollisionPos0x18169fc70 iterates ordered [sync,id] holders; compares
 * actor position against collision PRE position, sets/clears bit6, writescurrent.
 * OnPost1 0x18169e260: warp -> optional jump(bit19) -> outmap unless bit18.
 * OnPost2 0x18169e370: sync, CollisionVelo=Pos-PrePos, same flag13 disable.
 * Device callbacks, Player input/gravity and warp/jump remain explicit hosts.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceActorMotion=api;})(globalThis,function(){
'use strict';
const raw=x=>{if(!Number.isSafeInteger(x))throw Error('Actor exact raw required');return x;},b=x=>BigInt(raw(x)),i64=x=>BigInt.asIntN(64,x),num=x=>raw(Number(x)),add=(x,y)=>num(i64(b(x)+b(y))),sub=(x,y)=>num(i64(b(x)-b(y))),half=x=>num(i64(b(x)<<15n)>>16n);
function vector(v){raw(v?.xRaw);raw(v?.yRaw);return v;}
function flags(a){if(!Number.isInteger(a.flags)||a.flags<0||a.flags>0xffffffff)throw Error('Native Actor flags required');}
function update1(a,verified){if(typeof verified!=='boolean')throw Error('Native DeterministicFrame.Verified required');a.offsetDrawPositionRaw={xRaw:0,yRaw:0};a.prePositionRaw={...vector(a.positionRaw)};a.preVelocityRaw={...vector(a.velocityRaw)};if(verified){if(!Number.isInteger(a.requestAnimationId)||a.requestAnimationId<0||a.requestAnimationId>255)throw Error('Native animation byte required');if(a.requestAnimationId!==0){a.playingAnimationId=a.requestAnimationId;a.requestAnimationId=0;}}}
function syncCollisionPos(world,a){vector(a.positionRaw);if(!Array.isArray(a.collisionHolders)||!Array.isArray(world.collisions))throw Error('Native collision holders and lookup required');for(const holder of a.collisionHolders){if(typeof holder.syncPos!=='boolean')throw Error('Explicit collision holder sync flag required');if(!holder.syncPos)continue;const c=world.collisions.find(c=>c.id===holder.collisionId);if(!c)continue;raw(c.preXRaw);raw(c.preYRaw);const changed=c.preXRaw!==a.positionRaw.xRaw||c.preYRaw!==a.positionRaw.yRaw;c.flags=changed?c.flags|64:c.flags&~64;c.xRaw=a.positionRaw.xRaw;c.yRaw=a.positionRaw.yRaw;}}
function disableIfRequested(world,a,host){flags(a);if(a.flags&8192){if(typeof host?.setCollisionActive!=='function')throw Error('Native SetCollisionActive host required');host.setCollisionActive(world,a,false,a.entityId);}}
function update2(world,a,host){const p=vector(a.positionRaw),v=vector(a.velocityRaw),acc=vector(a.accelerationRaw);a.positionRaw={xRaw:add(p.xRaw,add(v.xRaw,half(acc.xRaw))),yRaw:add(p.yRaw,add(v.yRaw,half(acc.yRaw)))};a.velocityRaw={xRaw:add(v.xRaw,acc.xRaw),yRaw:add(v.yRaw,acc.yRaw)};syncCollisionPos(world,a);disableIfRequested(world,a,host);}
function post1(world,a,host){flags(a);if(typeof host?.warpProc!=='function')throw Error('Native warpProc required');const warped=host.warpProc(world,a);if(typeof warped!=='boolean')throw Error('Native warpProc result required');if(warped)return;if(a.flags&524288){if(typeof host.jumpProc!=='function')throw Error('Native jumpProc required');host.jumpProc(world,a);}if(!(a.flags&262144)){if(typeof host.checkOutMap!=='function')throw Error('Native CheckOutMap required');const outside=host.checkOutMap(world,a);if(typeof outside!=='boolean')throw Error('Native CheckOutMap result required');if(outside)a.flags=(a.flags|8192)>>>0;}}
function post2(world,a,host){syncCollisionPos(world,a);const p=vector(a.positionRaw),pre=vector(a.prePositionRaw);a.collisionVelocityRaw={xRaw:sub(p.xRaw,pre.xRaw),yRaw:sub(p.yRaw,pre.yRaw)};disableIfRequested(world,a,host);}
return {update1,update2,post1,post2,syncCollisionPos,completePhysicsFidelity:false};
});
