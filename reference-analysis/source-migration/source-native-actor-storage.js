/* Actor20 raw storage transaction adapter. Native layout/callback evidence lives
 * in ActorCodec/PoolStorage. Raw bytes own committed state; canonical actors
 * exist only inside one synchronous transaction. No new heap/pool boot claims.
 */
'use strict';
const C=require('./source-native-actor-codec.js'),P=require('./source-native-pool-storage.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const owners={inactiveEntity:'activeOwner',invisibleEntity:'visibleOwner',pauseEntity:'pauseOwner',disableDisplayEntity:'displayOwner',disableAnimationEntity:'animationOwner'};
const derived=['xRaw','yRaw','ordinal'];
function fail(s){throw Error('NativeActorStorage: '+s);}
function canonical(raw,sidecar){const a=C.toProjection(raw,sidecar);for(const [native,key]of Object.entries(owners)){if(Object.hasOwn(a,key))fail('sidecar duplicates owner '+key);a[key]=a[native];delete a[native];}a.sortingOrder&=65535;return a;}
function nativeProjection(a){const out={...a};for(const k of derived)delete out[k];for(const [native,key]of Object.entries(owners)){if(Object.hasOwn(out,native))fail('duplicate native/canonical owner '+native);if(!Object.hasOwn(out,key))fail('missing canonical owner '+key);out[native]=out[key];delete out[key];}if(!Number.isInteger(out.sortingOrder)||out.sortingOrder< -32768||out.sortingOrder>65535)fail('canonical signed16 or ushort sortingOrder required');out.sortingOrder=(out.sortingOrder<<16)>>16;return out;}
function sidecar(a){const out={...a};for(const k of [...C.mappedNames,...Object.values(owners),...derived])delete out[k];return out;}
function validateMask(w){P.validateAgainstAllocator(w.actorPool,w.entityAllocator);if(w.actorPool.componentId!==20)fail('raw Actor20 pool required');for(let i=0;i<w.entityAllocator.capacity;i++){const has=(BigInt('0x'+w.entityAllocator.masks[i][0])&(1n<<20n))!==0n;if(has!==(w.actorPool.entityToSlot[i]!==0))fail('Actor mask and raw sparse map disagree');}}
function run(input,operation){
 if(input.actorStorageMode!=='raw336'||Object.hasOwn(input,'actors'))fail('raw336 authority requires sidecars and no persisted canonical actors');
 if(typeof operation!=='function')fail('synchronous transaction operation required');
 validateMask(input);const baseline=JSON.stringify(input.actorPool),w=clone(input),rows=w.actorSidecars;
 if(!Array.isArray(rows)||rows.length!==w.actorPool.count-1||new Set(rows.map(r=>r.ref)).size!==rows.length)fail('complete unique per-slot sidecars required');
 const original=[];w.actors=[];for(let slot=1;slot<w.actorPool.count;slot++){
  const row=P.readSlot(w.actorPool,slot),s=rows.find(s=>s.ref===row.ref);if(!s)fail('missing actual heap/typed sidecar');
  const a=canonical(row.payloadHex,s.sidecar);if(a.entityId!==row.ref)fail('payload identity differs from pool reference');
  original.push(row);w.actors.push(a);
 }
 w.actorStorageMode='canonical-transaction';delete w.actorSidecars;
 const out=operation(w);if(out&&typeof out.then==='function')fail('async operation refused');
 const next=out?.world;if(!next||!Array.isArray(next.actors)||next.actorStorageMode!=='canonical-transaction')fail('operation must return complete canonical transaction world');
 if(JSON.stringify(input.actorPool)!==baseline||JSON.stringify(next.actorPool)!==baseline)fail('stale baseline or independent raw pool write during canonical transaction');
 if(next.actors.length!==original.length||new Set(next.actors.map(a=>a.entityId)).size!==original.length)fail('Actor creation/removal requires separate raw Add/Remove boundary');
 validateMask(next);let pool=next.actorPool;const sidecars=[];
 for(const row of original){const a=next.actors.find(a=>a.entityId===row.ref);if(!a)fail('changed Actor identity');
  // setBytes only accepts current live refs; pending-removal mutation is explicit refusal.
  const payload=C.patchProjection(row.payloadHex,nativeProjection(a));
  const written=P.setBytes(pool,next.entityAllocator,row.ref,payload,next.poolStorageProfile);if(written.appended)fail('existing Actor unexpectedly appended');pool=written.pool;
  sidecars.push({ref:row.ref,sidecar:sidecar(a)});
 }
 next.actorPool=pool;next.actorSidecars=sidecars;next.actorStorageMode='raw336';delete next.actors;return {world:next,result:out.result};
}
module.exports={run,canonical,nativeProjection,completePhysicsFidelity:false};
