/* Read-only PlayerDefault contact queries; no cache generation or AABB fallback.
 * GetContactCollisionList0x181691a55..ad7: exact normal, cache order,
 * append only IDs whose current GetCollisionById lookup succeeds.
 * GetContactInfoList0x181690050 / littleStep0x1816c5545..5604: raw sequence,
 * including wrong normals and missing targets; indices must not be compressed.
 * IsContacted0x1816928df..959: any exact cache normal sets true BEFORE target
 * lookup; OR resolved target attribute BYTE at+0 only; no layer/active filter.
 * If no matching actor cache, includeMap probes cached mapNormals at raw+0xc
 * via IsContactedMap0x181692b70, not Map.IsContacted geometry or request queue.
 * Face table0x18177e46c..4f6 is reused from source-move-contact.NORMALS.
 * checkIceFloor0x1816c4d31..e66 uses Actor anchor +/-48/4=12px (caller adds),
 * divides by48FP then sar16. Reuse source-collision-map.cell for exact signed
 * truncation; reject raw<<16 overflow rather than change shared core math.
 * Bounds/linear index<4096 at0x1816c4ddc..e1b; chip<2 leaves old ice unchanged.
 * QTileMapChipAttrData.Get0x18178184a returns0 for chip>=79; otherwise table.
 * Map tileFlags cannot recover chip identity (0/1 vs valid chip with attrs0).
 * Host must supply live native chip grid + extracted attribute table explicitly.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports,api=factory(c?require('./source-move-contact.js'):root.SourceMoveContact,c?require('./source-collision-map.js'):root.SourceCollisionMap,c?require('./source-collision-broadphase.js'):root.SourceCollisionBroadphase);if(c)module.exports=api;root.SourcePlayerContactQueries=api;})(globalThis,function(Contacts,MapCore,Broad){
'use strict';
const F=65536,clone=x=>JSON.parse(JSON.stringify(x));
function raw(v,label){if(!Number.isSafeInteger(v))throw Error('PlayerContactQueries exact safe raw required: '+label);return v;}
function id(v){if(typeof v!=='string'&&!Number.isSafeInteger(v))throw Error('PlayerContactQueries resolved collision ID required');return v;}
function normal(n){if(!n||typeof n.x!=='number'||typeof n.y!=='number')throw Error('PlayerContactQueries native cached normal required');return {xRaw:raw(n.x*F,'cache normalX'),yRaw:raw(n.y*F,'cache normalY')};}
function face(n){if(!Number.isInteger(n)||n<0||n>3)throw Error('PlayerContactQueries native face0..3 required');if(!Contacts?.NORMALS)throw Error('PlayerContactQueries SourceMoveContact dependency required');return normal(Contacts.NORMALS[n]);}
function same(a,b){return a.xRaw===b.xRaw&&a.yRaw===b.yRaw;}
function world(options){const w=options.getWorld();if(!w)throw Error('PlayerContactQueries current native source required');if(options.lookupMode==='storage'){if(!w.storage||typeof Broad?.getCollisionById!=='function')throw Error('PlayerContactQueries actual Broadphase storage dependency required');return {lookup:key=>Broad.getCollisionById(w.storage,key)};}if(!Array.isArray(w.collisions))throw Error('PlayerContactQueries current scene world.collisions required');const ids=new Set();for(const c of w.collisions){id(c.id);if(ids.has(c.id))throw Error('PlayerContactQueries duplicate collision ID');ids.add(c.id);}if(options.lookupMode==='scene+storage'){if(!w.storage||typeof Broad?.getCollisionById!=='function')throw Error('PlayerContactQueries actual Broadphase storage dependency required');return {lookup:key=>{const stored=Broad.getCollisionById(w.storage,key);return stored?(w.collisions.find(c=>c.id===key)||stored):null;}};}return {lookup:key=>w.collisions.find(c=>c.id===key)||null};}
function owner(w,c){const key=id(c?.id),out=w.lookup(key);if(!out)throw Error('PlayerContactQueries missing owner collision '+key);return out;}
function infos(c){if(!Array.isArray(c.contacts))throw Error('PlayerContactQueries actual contacts cache required, including empty');return Array.from(c.contacts,x=>({collisionId:id(x?.id),normalRaw:normal(x?.normal)}));}
function mapHit(c,n){if(!Array.isArray(c.mapNormals))throw Error('PlayerContactQueries actual committed mapNormals cache required');for(const m of c.mapNormals){raw(m?.xRaw,'map normalX');raw(m?.yRaw,'map normalY');if(same(m,n))return true;}return false;}
function createHost(options={}){if(!['scene','storage','scene+storage'].includes(options.lookupMode))throw Error('PlayerContactQueries explicit scene/storage lookupMode required');if(typeof options.getWorld!=='function')throw Error('PlayerContactQueries live getWorld required');
 function contactInfos(c){return infos(owner(world(options),c));}
 function collisionById(key){id(key);const out=world(options).lookup(key);return out?clone(out):null;}
 function contactIds(c,f){const n=face(f),w=world(options);return infos(owner(w,c)).filter(x=>same(x.normalRaw,n)&&w.lookup(x.collisionId)).map(x=>x.collisionId);}
 function mapContact(c,f){return mapHit(owner(world(options),c),face(f));}
 function contactProbe(c,f){const n=face(f),w=world(options),o=owner(w,c);let contacted=false,attribute=0;for(const info of infos(o)){if(!same(info.normalRaw,n))continue;contacted=true;const t=w.lookup(info.collisionId);if(!t)continue;if(!Number.isInteger(t.attribute)||t.attribute<0||t.attribute>255)throw Error('PlayerContactQueries resolved collision attribute BYTE required');attribute|=t.attribute;}return {contacted:contacted||mapHit(o,n),attribute};}
 function iceMapAttributesAtRaw(xRaw,yRaw){raw(xRaw,'Actor sampleX');raw(yRaw,'Actor sampleY');for(const v of [xRaw,yRaw])if(v< -140737488355328||v>140737488355327)throw Error('PlayerContactQueries coordinate FP shift overflow needs additional core branch');if(typeof MapCore?.cell!=='function')throw Error('PlayerContactQueries SourceCollisionMap.cell required');const x=MapCore.cell(xRaw)|0,y=MapCore.cell(yRaw)|0;if(typeof options.getMapData!=='function')throw Error('PlayerContactQueries actual native chip grid/attribute table required');const m=options.getMapData();if(!m||!Number.isInteger(m.width)||m.width<=0||m.width>65535||!Number.isInteger(m.height)||m.height<=0||m.height>65535)throw Error('PlayerContactQueries native map dimensions required');if(x<0||x>=m.width||y<0||y>=m.height)return null;const linear=y*m.width+x;if(linear>2147483647)throw Error('PlayerContactQueries native linear index overflow unresolved');if(linear>=4096)return null;if(!Array.isArray(m.grid)||!Array.isArray(m.grid[y]))throw Error('PlayerContactQueries live native row-major chip grid required');const chip=m.grid[y][x];if(!Number.isInteger(chip)||chip<0||chip>255)throw Error('PlayerContactQueries native chip BYTE required');if(chip<2)return null;if(chip>=79)return 0;if(!Array.isArray(m.tileAttributes))throw Error('PlayerContactQueries extracted tileAttributes table required');const entry=m.tileAttributes.find(e=>e.id===chip);if(!entry||!Number.isInteger(entry.flags)||entry.flags<0||entry.flags>255)throw Error('PlayerContactQueries missing native tile attribute '+chip);return entry.flags;}
 return {contactInfos,contactIds,collisionById,mapContact,contactProbe,iceMapAttributesAtRaw};
}
return {createHost,supportedTypes:[],completePhysicsFidelity:false};
});
