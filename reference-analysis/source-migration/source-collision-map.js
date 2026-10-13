/* Static MapComponent.Move / IsContacted and Collision.MoveMap.
 * Map tile=48 @0x18187e590..5c3; separator=655 raws in MapComponent.cctor
 * 0x18187efe0 (also CollisionScene.cctor 0x1817ff900). Epsilon=4
 * @0x18187e547/56b. FP division truncates then cell conversion sar16.
 * IsMovable clamps both cell coordinates to the map edges, and tests attr&1
 * @0x18187dd80..dc4. This is an attribute grid, NOT merged terrain AABBs.
 * IsContacted normalizes direction, offsets by half a pixel and scans the
 * leading edge inclusively @0x18187eac3..0x18187ec93.
 * Move prechecks X then Y @0x18187e237/2c1; visits crossed leading-edge cells
 * in FP time order, Y wins ties @0x18187e67a..67d. The transverse span uses
 * the starting cell count, offset by accepted crossings @0x18187e683..749.
 * First hit stops BOTH axes at the hit time with separator on hit axis
 * @0x18187e811..9d7. Collision.MoveMap repeats with tangential remainder
 * when slide=true @0x181693012..077. addContactMapInfo0x181691c10
 * queues NEW normals in requestMapNormals (+0x10); mapNormals (+0xc)
 * becomes valid only in updateContactMap after actor contact callbacks.
 * Inputs/outputs are safe 16.16 integer raws; original code is never run.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCollisionMap=api;})(typeof globalThis!=='undefined'?globalThis:this,function(FPMath){
'use strict';
const FP=65536,TILE=48*FP,GAP=655,EPS=4,NORMALS=[{xRaw:0,yRaw:-FP},{xRaw:0,yRaw:FP},{xRaw:-FP,yRaw:0},{xRaw:FP,yRaw:0}];
const clone=x=>JSON.parse(JSON.stringify(x));
function safe(n){if(!Number.isSafeInteger(n))throw Error('Collision map requires safe raw integers');return n;}
const mul=(a,b)=>safe(Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n));
const div=(a,b)=>{if(!b)throw Error('Collision map division by zero');return safe(Number(BigInt.asIntN(64,BigInt(a)<<16n)/BigInt(b)));};
const cell=r=>Number((BigInt(safe(r))/48n)>>16n);
function validate(map,b){
 if(!Array.isArray(map.tileFlags)||!map.tileFlags.length||!map.tileFlags[0].length||map.tileFlags.some(row=>row.length!==map.tileFlags[0].length||row.some(v=>!Number.isInteger(v))))throw Error('Native rectangular tileFlags grid required');
 for(const k of ['xRaw','yRaw','preXRaw','preYRaw'])safe(b[k]);
 if(!b.rectRaw)throw Error('GetRect-derived local rectRaw required');
 for(const k of ['x','y','width','height'])safe(b.rectRaw[k]);
 if(b.rectRaw.width<0||b.rectRaw.height<0)throw Error('Negative native rectangle size');
 if(!Number.isInteger(b.flags)||!Number.isInteger(b.pushBackTarget))throw Error('Explicit native collision flags/target required');
}
function movable(map,x,y){const rows=map.tileFlags;return !(rows[Math.max(0,Math.min(rows.length-1,y))][Math.max(0,Math.min(rows[0].length-1,x))]&1);}
function scan(map,x0,y0,x1,y1){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!movable(map,x,y))return {x,y};return null;}
function contacted(map,b,direction){
 validate(map,b);const n=FPMath.normalizeRaw(direction),ox=mul(n.xRaw,FP/2),oy=mul(n.yRaw,FP/2),r=b.rectRaw;
 let x0=safe(b.xRaw+r.x+ox),y0=safe(b.yRaw+r.y+oy),x1=safe(x0+r.width),y1=safe(y0+r.height);
 if(ox<0)x1=x0;else if(ox>0)x0=x1;
 if(oy<0)y1=y0;else if(oy>0)y0=y1;
 return scan(map,cell(x0),cell(y0),cell(x1),cell(y1));
}
function position(b,x,y){b.xRaw=safe(x);b.yRaw=safe(y);b.flags=(b.flags&~0x40)|((x!==b.preXRaw||y!==b.preYRaw)?0x40:0);}
function mapMove(map,input,delta){
 validate(map,input);const b=clone(input),r=b.rectRaw,startX=b.xRaw,startY=b.yRaw;
 let dx=safe(delta.xRaw),dy=safe(delta.yRaw),sx=Math.sign(dx),sy=Math.sign(dy),face=-1;
 if(sx&&contacted(map,b,NORMALS[sx>0?3:2])){face=sx>0?3:2;dx=0;sx=0;}
 if(sy&&contacted(map,b,NORMALS[sy>0?1:0])){face=sy>0?1:0;dy=0;sy=0;}
 const left=safe(startX+r.x),top=safe(startY+r.y),right=safe(left+r.width),bottom=safe(top+r.height);
 const x0=cell(left),y0=cell(top),x1=cell(right),y1=cell(bottom),cols=x1-x0+1,rows=y1-y0+1;
 const endX=(sx>0?cell(right+dx)-x1:cell(left+dx)-x0),endY=(sy>0?cell(bottom+dy)-y1:cell(top+dy)-y0);
 let ix=0,iy=0,cx=(sx>0?x1:x0)+sx,cy=(sy>0?y1:y0)+sy;
 const slopeY=Math.abs(dx)>=EPS?div(dy,dx):0,slopeX=Math.abs(dy)>=EPS?div(dx,dy):0;
 while(ix!==endX||iy!==endY){
  const hitX=cx*TILE+(sx>0?-r.x-r.width:TILE-r.x),hitY=cy*TILE+(sy>0?-r.y-r.height:TILE-r.y);
  const tx=ix===endX?2147483647:div(hitX-startX,dx),ty=iy===endY?2147483647:div(hitY-startY,dy);
  if(tx<ty){
   if(scan(map,cx,y0+iy,cx,y0+iy+rows-1)){
    const until=hitX-startX,actual={xRaw:until-sx*GAP,yRaw:mul(until,slopeY)};
    position(b,startX+actual.xRaw,startY+actual.yRaw);return {collision:b,delta:actual,normal:{...NORMALS[sx>0?3:2]}};
   }
   ix+=sx;cx+=sx;
  }else{
   if(scan(map,x0+ix,cy,x0+ix+cols-1,cy)){
    const until=hitY-startY,actual={xRaw:mul(until,slopeX),yRaw:until-sy*GAP};
    position(b,startX+actual.xRaw,startY+actual.yRaw);return {collision:b,delta:actual,normal:{...NORMALS[sy>0?1:0]}};
   }
   iy+=sy;cy+=sy;
  }
 }
 position(b,startX+dx,startY+dy);
 return {collision:b,delta:{xRaw:dx,yRaw:dy},normal:face<0?{xRaw:0,yRaw:0}:{...NORMALS[face]}};
}
function moveMap(map,input,delta,{slide=true}={}){
 validate(map,input);let b=clone(input);safe(delta.xRaw);safe(delta.yRaw);
 if(b.flags&1)return {collision:b,delta:{xRaw:0,yRaw:0},success:false};
 if(!(b.pushBackTarget&1)){position(b,b.xRaw+delta.xRaw,b.yRaw+delta.yRaw);return {collision:b,delta:{...delta},success:true};}
 if(!Array.isArray(b.mapNormals)||!Array.isArray(b.requestMapNormals))throw Error('Native map normal cache and request queue required');
 let remaining={...delta},total={xRaw:0,yRaw:0};const states=new Set();
 for(;;){
  // A repeated state is a JS guard, not a native iteration limit.
  const key=[b.xRaw,b.yRaw,remaining.xRaw,remaining.yRaw].join(',');if(states.has(key))throw Error('Non-progressing native map slide');states.add(key);
  const result=mapMove(map,b,remaining);b=result.collision;total.xRaw+=result.delta.xRaw;total.yRaw+=result.delta.yRaw;
  const n=result.normal;if(!n.xRaw&&!n.yRaw)break;
  if(![...b.mapNormals,...b.requestMapNormals].some(q=>q.xRaw===n.xRaw&&q.yRaw===n.yRaw))b.requestMapNormals.push(n);
  if(!slide)break;
  const rest={xRaw:remaining.xRaw-result.delta.xRaw,yRaw:remaining.yRaw-result.delta.yRaw};
  const projection=mul(rest.xRaw,n.xRaw)+mul(rest.yRaw,n.yRaw);
  remaining={xRaw:rest.xRaw-mul(n.xRaw,projection),yRaw:rest.yRaw-mul(n.yRaw,projection)};
 }
 return {collision:b,delta:total,success:true};
}
return {mapMove,moveMap,isContacted:contacted,cell,completePhysicsFidelity:false};
});
