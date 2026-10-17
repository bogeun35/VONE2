/* Address-free native storage projection; no original execution or heap identity.
 * Buffer layout18193c537..c64a: count1, version0, listCapacity4, activeBlocks0;
 * GetBufferEntry18193cb60: ushort map; append count@cbe6/ref@cc07/map@cc0f.
 * UseNextBlock18193d050: descriptor list double@d09d; active+1@d0e7;
 * dormant clear@d12e or aligned8 alloc+clear@d176/d18e; refs then payload.
 * Blocks: refs B*8 bytes; data B*stride bytes; descriptor16 bytes.
 * View18/stride8 Setup1819372ba/180730848; Actor20/stride336 18072ab26/ab48.
 * Entity doubling1819790a9 ->1819781c0; fresh-backing grow1819783bb..85d1
 * alloc/copy/free all entries16/masks64/culling and ALL type sparse rows2 bytes.
 * Registry187 and config defaults1024/128 are audited, never stage defaults here.
 */
'use strict';
const A=require('./source-native-entity-allocator.js'),G=require('./native-pool-growth-report.json');
const clone=x=>JSON.parse(JSON.stringify(x)),fail=s=>{throw Error('NativePoolStorage: '+s);};
const TYPES=Object.freeze({18:8,20:336}),TYPE_COUNT=187;
const requiredProfile=Object.freeze({dllSha256:G.dllSha256,metadataSha256:G.metadataSha256,standardComponentRegistration:true,addressFreeLogicalProjection:true});
function profile(p){if(!p||Object.keys(p).length!==Object.keys(requiredProfile).length||Object.entries(requiredProfile).some(([k,v])=>p[k]!==v))fail('explicit standard registration/address-free profile required');}
function int(n,min,max,label){if(!Number.isInteger(n)||n<min||n>max)fail(label+' outside supported native width');return n;}
function bytes(n,label){return int(n,0,0x7fffffff,label);}
function hex(s,n,label){if(typeof s!=='string'||s.length!==n*2||!/^[0-9a-f]*$/.test(s))fail('exact lowercase '+label+' bytes required');return s;}
function zero(n){bytes(n,'byte count');return '00'.repeat(n);}
function u16rows(row,n,label){if(!Array.isArray(row)||row.length!==n||row.some(v=>!Number.isInteger(v)||v<0||v>65535))fail('full ushort '+label+' required');}
function layout(p){const refsBytes=bytes(p.blockSize*8,'refs block size'),dataBytes=bytes(p.blockSize*p.elementSize,'data block size');return {refsBytes,dataBytes,blockBytes:bytes(refsBytes+dataBytes,'total block size')};}
function validate(p){
 if(!p||p.schemaVersion!==1||!Object.hasOwn(TYPES,p.componentId)||p.elementSize!==TYPES[p.componentId]||p.flags!==0)fail('explicit View18/8 or Actor20/336 nonsingleton pool required');
 int(p.blockSize,1,65536,'blockSize');int(p.blockCount,0,65536,'active blockCount');int(p.blockListCapacity,1,0x7fffffff,'descriptor list capacity');
 int(p.count,1,65536,'count including sentinel');int(p.version,0,0xffffffff,'version');int(p.pendingRemoval,0,p.count-1,'pending removal');int(p.sparseCapacity,1,0x7fffffff,'sparse capacity');
 const l=layout(p);bytes(p.blockListCapacity*16,'descriptor list bytes');
 if(p.blockCount>p.blockListCapacity||!Array.isArray(p.descriptors)||p.descriptors.length!==p.blockListCapacity)fail('complete descriptor list/active count mismatch');
 if(!(p.count===1&&p.blockCount===0)&&p.count>p.blockCount*p.blockSize)fail('physical count exceeds active blocks');
 u16rows(p.entityToSlot,p.sparseCapacity,'entityToSlot');const seen=new Map();
 for(let b=0;b<p.descriptors.length;b++){
  const d=p.descriptors[b];if(d===null){if(b<p.blockCount)fail('active descriptor missing');continue;}
  if(!d||!Array.isArray(d.refs)||d.refs.length!==p.blockSize)fail('complete physical block refs required');hex(d.dataHex,l.dataBytes,'block payload');
  for(let j=0;j<d.refs.length;j++){
   const r=A.decodeRef(d.refs[j]),slot=b*p.blockSize+j;
   if(slot===0&&d.refs[j]!=='0')fail('reserved ref slot0 must be zero');
   if(slot>0&&slot<p.count){if(r.index<1||r.index>=p.sparseCapacity||r.rawVersion<0x80000000||seen.has(r.index)||p.entityToSlot[r.index]!==slot)fail('physical ref/reverse map mismatch');seen.set(r.index,d.refs[j]);}
  }
 }
 for(let i=0;i<p.entityToSlot.length;i++)if((p.entityToSlot[i]!==0)!==seen.has(i))fail('orphan sparse mapping');
 return p;
}
function fromSnapshot(p){return validate(clone(p));}
function validateAgainstAllocator(p,a){validate(p);A.validate(a);if(p.sparseCapacity!==a.capacity)fail('pool sparseCapacity must equal allocator logical capacity');for(let slot=1;slot<p.count;slot++){const r=p.descriptors[Math.floor(slot/p.blockSize)].refs[slot%p.blockSize],d=A.decodeRef(r),e=a.entries[d.index];if(d.index>=a.nextUnused||!(e.rawVersion===d.rawVersion&&!(e.flags&2))&&!a.pendingCommitOrder.includes(r))fail('stale physical pool generation');}return p;}
function freshPool({componentId,sparseCapacity,blockSize,initialization},standardProfile){
 profile(standardProfile);if(initialization!=='verified-post-FrameBase.Initialize')fail('fresh initialization point must be explicitly verified; no stage fresh assumption');
 if(!Object.hasOwn(TYPES,componentId))fail('unsupported typed component');int(sparseCapacity,1,0x7fffffff,'sparse capacity');int(blockSize,1,65536,'blockSize');
 const pool=validate({schemaVersion:1,componentId,elementSize:TYPES[componentId],flags:0,blockSize,blockCount:0,blockListCapacity:4,count:1,version:0,pendingRemoval:0,sparseCapacity,descriptors:[null,null,null,null],entityToSlot:Array(sparseCapacity).fill(0)});
 return {pool,effects:[{op:'allocClearDescriptorList',bytes:64}],addressFree:true};
}
function readSlot(p,slot){validate(p);int(slot,1,p.count-1,'occupied slot');const b=Math.floor(slot/p.blockSize),j=slot%p.blockSize,d=p.descriptors[b];return {ref:d.refs[j],payloadHex:d.dataHex.slice(j*p.elementSize*2,(j+1)*p.elementSize*2),blockIndex:b,refOffsetBytes:j*8,payloadOffsetBytes:p.blockSize*8+j*p.elementSize};}
function setBytes(snapshot,allocator,entityRef,payloadHex,standardProfile){
 profile(standardProfile);const pool=fromSnapshot(snapshot);validateAgainstAllocator(pool,allocator);hex(payloadHex,pool.elementSize,'typed component payload');const d=A.decodeRef(entityRef);
 if(d.index<1||d.index>=allocator.nextUnused||d.index>=allocator.capacity||d.rawVersion<0x80000000||allocator.entries[d.index].rawVersion!==d.rawVersion||allocator.entries[d.index].flags&2)fail('issued current live EntityRef required');
 let slot=pool.entityToSlot[d.index];const appended=slot===0,effects=[],l=layout(pool);
 if(appended){
  if(pool.count>65535)fail('native ushort slot wrap unsupported');
  if(pool.count>=pool.blockCount*pool.blockSize){
   if(Math.floor(pool.count/pool.blockSize)>=pool.blockCount+1)fail('one native UseNextBlock cannot supply append block; fresh blockSize1 unsupported');
   if(pool.blockCount===pool.blockListCapacity){
    const old=pool.blockListCapacity,next=bytes(old*2,'descriptor count');bytes(next*16,'descriptor bytes');
    effects.push({op:'allocClearDescriptorList',bytes:next*16},{op:'copyDescriptors',bytes:old*16},{op:'freeDescriptorList',bytes:old*16});
    pool.descriptors=pool.descriptors.concat(Array(next-old).fill(null));pool.blockListCapacity=next;
   }
   const blockIndex=pool.blockCount++;effects.push({op:'activateBlock',blockIndex});
   if(pool.descriptors[blockIndex]===null){pool.descriptors[blockIndex]={refs:Array(pool.blockSize).fill('0'),dataHex:zero(l.dataBytes)};effects.push({op:'allocAndClearBlock',bytes:l.blockBytes,alignment:8,blockIndex});}
   else{pool.descriptors[blockIndex]={refs:Array(pool.blockSize).fill('0'),dataHex:zero(l.dataBytes)};effects.push({op:'clearExistingBlock',bytes:l.blockBytes,alignment:null,blockIndex});}
  }
  slot=pool.count++;effects.push({op:'incrementCount',count:pool.count});
  const b=Math.floor(slot/pool.blockSize),j=slot%pool.blockSize;pool.descriptors[b].refs[j]=entityRef;effects.push({op:'writeEntityRef',blockIndex:b,offsetBytes:j*8,ref:entityRef});
  pool.entityToSlot[d.index]=slot;effects.push({op:'writeSparse',entityIndex:d.index,slot});
 }
 const b=Math.floor(slot/pool.blockSize),j=slot%pool.blockSize,block=pool.descriptors[b],at=j*pool.elementSize*2;
 block.dataHex=block.dataHex.slice(0,at)+payloadHex+block.dataHex.slice(at+payloadHex.length);effects.push({op:'writePayload',blockIndex:b,offsetBytes:l.refsBytes+j*pool.elementSize,bytes:pool.elementSize});
 validateAgainstAllocator(pool,allocator);return {pool,slot,appended,effects,addressFree:true};
}
function growEntityStorage(snapshot,newCapacity,standardProfile){
 profile(standardProfile);if(!snapshot||snapshot.schemaVersion!==1)fail('full entity storage snapshot schemaVersion1 required');
 const state=clone(snapshot),a=A.fromSnapshot(state.allocator),old=a.capacity;int(newCapacity,old+1,0x7fffffff,'new capacity');
 if(newCapacity<=a.allocatedCapacity)fail('retained-backing regrowth needs raw packed prestate; unsupported');
 if(!Array.isArray(state.sparseRows)||state.sparseRows.length!==TYPE_COUNT)fail('complete standard registry187 sparse rows required');
 for(const row of state.sparseRows)u16rows(row,old,'registry sparse row');if(state.sparseRows[0].some(x=>x!==0))fail('reserved sparse row0 must be zero');
 const oldCull=Math.ceil(old/64)*8,newCull=Math.ceil(newCapacity/64)*8;hex(state.cullingHex,oldCull,'culling');
 bytes(newCapacity*16,'entity bytes');bytes(newCapacity*64,'mask bytes');bytes(TYPE_COUNT*newCapacity*2,'packed sparse bytes');
 const effects=[{op:'allocClearCulling',bytes:newCull},{op:'copyOldCulling',bytes:oldCull},{op:'allocClearEntries',bytes:newCapacity*16},{op:'copyEntries',bytes:old*16},{op:'freeOldEntries'},{op:'allocClearMasks',bytes:newCapacity*64},{op:'copyMasks',bytes:old*64},{op:'freeOldMasks'},{op:'updateCapacityAndAllocated',capacity:newCapacity},{op:'allocClearSparse',bytes:TYPE_COUNT*newCapacity*2}];
 a.entries=a.entries.slice(0,old);a.masks=a.masks.slice(0,old);while(a.entries.length<newCapacity){a.entries.push({indexOrNext:0,rawVersion:0,flags:0,opaqueC:0});a.masks.push(Array(8).fill('0000000000000000'));}a.capacity=a.allocatedCapacity=newCapacity;
 const rebind=[];state.sparseRows=state.sparseRows.map((row,id)=>{const next=id===0?Array(newCapacity).fill(0):[...row,...Array(newCapacity-old).fill(0)];if(id!==0){const binding={componentId:id,sparseCapacity:newCapacity,rowIndex:id,rowByteOffset:id*newCapacity*2};effects.push({op:'copyAndRebindSparseRow',copyBytes:old*2,oldRowByteOffset:id*old*2,...binding});rebind.push(binding);}return next;});
 state.allocator=a;state.cullingHex+=zero(newCull-oldCull);effects.push({op:'freeOldCulling'},{op:'freeOldSparse'});A.validate(a);return {state,rebind,effects,addressFree:true};
}
module.exports={validate,fromSnapshot,validateAgainstAllocator,freshPool,readSlot,setBytes,growEntityStorage,requiredProfile,completePhysicsFidelity:false,integration:{snapshot:'Explicit physical bytes, refs and complete descriptor occupancy (including dormant descriptors), count, active blocks, descriptor capacity, sparse map/capacity. View18 stride8 or Actor20 stride336 only; flags0.',callbacks:'Storage writes payload before mask/OnAdded boundaries. This helper neither writes entity masks nor dispatches callbacks nor initializes Actor.EntityRef. Caller validates native Set/Add duplicate rules, applies mask and actual callbacks synchronously after setBytes; appended describes storage map state, NOT native mask-based Set result. Standard null callback assumptions belong to caller profile, not this storage operation.',growth:'growEntityStorage requires all187 actual sparse rows, full allocator and exact culling bytes; newCapacity>allocatedCapacity only. Returns all186 sparse rebindings. Caller must atomically adopt entries/masks/culling/matrix and rebind every live typed pool; physical blocks/payloads/version are unchanged.',transaction:'Pure JSON draft. Inputs unchanged success/error. Effects are ordered address-free plans, not host calls or evidence heap allocation happened. No fabricated heap addresses/identity/checksum/allocation success; native heap host must execute/rollback physical effects if required.',fresh:'freshPool requires explicit verified immediate post-Initialize point and actual selected blockSize/sparseCapacity. No default stage snapshot or actor initialized state. Descriptor list4 is allocated/cleared by initialization; no physical block exists yet.'}};
