/* CollisionScene.UpdatePushBack / updatePushBackRect, static reconstruction.
 * Gate @0x1817f9c80..9da1: both pushBackTarget&2, layer matrix, movement
 * flag0x40, not two unyielding flag4 bodies, current overlap, no PRE overlap.
 * Axis rollback ratios and faces @0x1817fa076..4ca, clamped [-65536,0].
 * Same-direction product test is (low64(dA*dB)&-65536)>0, not sign alone.
 * Cross-axis rejection only when BOTH ratios have abs>=4 @fa216..287/452..4c5.
 * FP correction @fa74f..943; epsilon4 and separator655 @fa97c..fac08,
 * separator may not roll past the supplied previous anchor.
 * flags4&&!flags8 forces the other collision via reviseMov/moveCollisionForce
 * @fa4e1..6c9/fac0f..e0e. Unrecovered scene recursion is an explicit host hook.
 * Contact append order is X pair then Y pair @faeac/aec4/aee5/af01.
 * Rects are explicit GetRect local bounds; previous scale requires preRectRaw.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCollisionRect=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536,E=4,G=655;
const clone=x=>JSON.parse(JSON.stringify(x));
const safe=n=>{if(!Number.isSafeInteger(n))throw Error('Collision rect requires safe raw integers');return n;};
const mul=(a,b)=>safe(Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n));
const div=(a,b)=>{if(!b)throw Error('Collision rect zero denominator');return safe(Number(BigInt.asIntN(64,BigInt(a)<<16n)/BigInt(b)));};
const fixed=b=>(b.flags&4)&&!(b.flags&8);
// Collision.GetRect 0x18169063d..6ec: scale the offset about pivot, then
// scale width/height independently. Do not halve an already rounded rect.
function getRect(base,scale,pivot){
 for(const k of ['x','y','width','height'])safe(base?.[k]);
 for(const k of ['xRaw','yRaw']){safe(scale?.[k]);safe(pivot?.[k]);}
 return {x:mul(base.x-pivot.xRaw,scale.xRaw)+pivot.xRaw,y:mul(base.y-pivot.yRaw,scale.yRaw)+pivot.yRaw,width:mul(base.width,scale.xRaw),height:mul(base.height,scale.yRaw)};
}
function check(b){
 for(const k of ['xRaw','yRaw','preXRaw','preYRaw'])safe(b[k]);
 if(b.entityId===undefined||!Number.isInteger(b.flags)||!Number.isInteger(b.pushBackTarget)||b.collisionType!==0)throw Error('Explicit native rectangle collision facts required');
 for(const r of [b.rectRaw,b.preRectRaw]){if(!r)throw Error('Current and previous GetRect bounds required');for(const k of ['x','y','width','height'])safe(r[k]);}
}
function bounds(b,pre=false){const r=pre?b.preRectRaw:b.rectRaw;return {x:(pre?b.preXRaw:b.xRaw)+r.x,y:(pre?b.preYRaw:b.yRaw)+r.y,w:r.width,h:r.height};}
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
function position(b,p){b.xRaw=safe(p.x);b.yRaw=safe(p.y);b.flags=(b.flags&~64)|((p.x!==b.preXRaw||p.y!==b.preYRaw)?64:0);}
function axis(a,b,da,db,sizeA,sizeB,otherA,otherB,otherSizeA,otherSizeB,otherDA,otherDB,lowFace,highFace){
 let ra=0,rb=0,face=-1;
 if(!da&&!db)return {ra,rb,face};
 const same=(BigInt.asIntN(64,BigInt(da)*BigInt(db))&-65536n)>0n;
 if(a-da+sizeA<=b-db){
  face=highFace;
  if(!same)ra=rb=div(a+sizeA-b,db-da);
  else if(Math.abs(da)>Math.abs(db))ra=div(b-a-sizeA,da);
  else rb=div(a+sizeA-b,db);
 }else if(b-db+sizeB<=a-da){
  face=lowFace;
  if(!same)ra=rb=div(b+sizeB-a,da-db);
  else if(Math.abs(da)>Math.abs(db))ra=div(b+sizeB-a,da);
  else rb=div(a-b-sizeB,db);
 }
 ra=Math.max(-F,Math.min(0,ra));rb=Math.max(-F,Math.min(0,rb));
 if(Math.abs(ra)>=E&&Math.abs(rb)>=E){
  const oa=otherA+mul(otherDA,ra),ob=otherB+mul(otherDB,rb);
  if(ob+otherSizeB<oa||oa+otherSizeA<ob){face=-1;ra=rb=0;}
 }
 return {ra,rb,face};
}
function corrected(current,previous,delta,ratio){const correction=mul(delta,ratio);return Math.abs(ratio)>=E&&Math.abs(delta)>=E&&Math.abs(correction)<E?previous:current+correction;}
const revise=d=>({x:d.x+(Math.abs(d.x)>=E?Math.sign(d.x)*G:0),y:d.y+(Math.abs(d.y)>=E?Math.sign(d.y)*G:0)});
function resolve(inputA,inputB,{previousA,previousB,forceMove}={}){
 check(inputA);check(inputB);let a=clone(inputA),b=clone(inputB);const A=bounds(a),B=bounds(b);
 const pa=previousA||{x:a.preXRaw,y:a.preYRaw},pb=previousB||{x:b.preXRaw,y:b.preYRaw};
 const da={x:a.xRaw-pa.x,y:a.yRaw-pa.y},db={x:b.xRaw-pb.x,y:b.yRaw-pb.y};
 const x=axis(A.x,B.x,da.x,db.x,A.w,B.w,A.y,B.y,A.h,B.h,da.y,db.y,2,3);
 const y=axis(A.y,B.y,da.y,db.y,A.h,B.h,A.x,B.x,A.w,B.w,da.x,db.x,0,1);
 const unresolved=x.face<0&&y.face<0;
 let qa=unresolved?{...pa}:{x:corrected(a.xRaw,pa.x,da.x,x.ra),y:corrected(a.yRaw,pa.y,da.y,y.ra)};
 let qb=unresolved?{...pb}:{x:corrected(b.xRaw,pb.x,db.x,x.rb),y:corrected(b.yRaw,pb.y,db.y,y.rb)};
 for(const [key,hit,d] of [['x',x,da.x],['y',y,da.y]]){
  if(hit.face<0)continue;
  const sign=hit.face===3||hit.face===1?1:-1;
  if(hit.ra<=hit.rb&&Math.abs(d)>=E)qa[key]=sign>0?Math.max(pa[key],qa[key]-G):Math.min(pa[key],qa[key]+G);
  else qb[key]=sign>0?Math.min(pb[key],qb[key]+G):Math.max(pb[key],qb[key]-G);
 }
 let code=0;
 if(fixed(a)||fixed(b)){
  if(typeof forceMove!=='function')throw Error('Native moveCollisionForce adapter required (0x1817faf30)');
  const isA=!!fixed(a),self=isA?a:b,other=isA?b:a,qSelf=isA?qa:qb,qOther=isA?qb:qa;
  const revision=revise({x:qSelf.x-self.xRaw,y:qSelf.y-self.yRaw});
  const result=forceMove(clone(other),{x:qOther.x-revision.x,y:qOther.y-revision.y},{sourceId:self.id});
  if(!result||typeof result.success!=='boolean'||!result.collision)throw Error('Invalid native forceMove result');
  check(result.collision);if(isA)b=result.collision;else a=result.collision;
  if(result.sourceCollision){check(result.sourceCollision);if(isA)a=result.sourceCollision;else b=result.sourceCollision;}
  if(!result.success){(isA?a:b).flags|=8;code=1;}
 }else{position(a,qa);position(b,qb);}
 const contacts=[];
 if(!code&&!unresolved)for(const hit of [x,y])if(hit.face>=0){contacts.push({ownerId:a.id,targetId:b.id,face:hit.face},{ownerId:b.id,targetId:a.id,face:hit.face^1});}
 return {a,b,code,contacts,ratios:{x,y}};
}
function update(a,b,options={}){
 check(a);check(b);
 if(typeof options.layerEnabled!=='boolean')throw Error('Native collision layer matrix result required');
 if(a.id===b.id||a.entityId===b.entityId||!(a.pushBackTarget&2)||!(b.pushBackTarget&2)||!options.layerEnabled||((a.flags|b.flags)&1)||!((a.flags|b.flags)&64)||fixed(a)&&fixed(b)||!overlap(bounds(a),bounds(b))||overlap(bounds(a,true),bounds(b,true)))return {a:clone(a),b:clone(b),code:2,contacts:[]};
 return resolve(a,b,options);
}
return {update,resolve,revise,getRect,completePhysicsFidelity:false};
});
