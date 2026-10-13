/* Gear-owned native circle collision helper; static recovery only.
 * This is CollisionScene response, not an overlap-only approximation.
 * R3 uses SourceGearDevices' verified full FPSqrt. Load Gear first in browser.
 * Normalization helper0x1816463a0 returns halfShift and FPSqrt int32; callers
 * use reciprocal=(1<<44)/entry then imul64(component,reciprocal)>>(halfShift+14)
 * @0x1817fb933..974,9db..a25,db4..dfa. Zero vector returns zero.
 * Only circle/circle uses radial response. Collision.IsCollided0x181691f3f/49
 * and UpdatePushBack0x1817f9da7/db1 route every mixed pair through GetRect/
 * updatePushBackRect. Circle bounding localRect H=W=2r,X=cx-r,Y=cy-r is
 * stored0x18169f6b6..719. GetRect0x18169063d..6ec scales about scalePivot.
 * Circle radius uses max(scaleX,scaleY), centers add local offset unscaled.
 * UpdatePushBack gates0x1817f9c80..da1: same/null, both pushBackTarget bit1,
 * layer check, either moved bit6; both bit2&&!bit3 refused; current collision
 * required, pre collision forbidden. Return2 skip; circle solver returns0.
 * Circle solver0x1817fb7a0..f04: effective pre override is absolute position,
 * normal1/2 from current-minus-pre, same-direction dot test zeroes one delta;
 * current center difference and relative delta solve quadratic rewind amount.
 * A=FP(rel^2), B=sum((2*rel*centerDiff)>>16), C=FP(diff^2)-FP(radiusSum^2).
 * discriminant=FP(B^2)-((C*A)<<2>>16); t=min(65536,(sqrt-B)<<16/(2*A)),
 * t=0 for A0, NO lower clamp @0x1817fbae7..bb49.
 * rewind=delta*t + normal*65raw(QFP._0_001 actual cctor0x181780cc0 +8,
 * literal0x183165038); if rewind^2>=delta^2 use full delta @0x1817fbc2c/15.
 * newPos=current-rewind. Contact normal=normalize(newPos2-newPos1), NOT
 * center separation,0x1817fbd6c..e04. Update position/moved flag6 and cache
 * first collider then second opposite normal,0x1817fbe11..edc. No velocity edit.
 * AddContactInfo0x181690ec0: dedup by other collisionID before checking normal;
 * Up(0,-65536) suppresses reciprocal Up cycle0x181691075..204; new record
 * has hasCalledAdded=false (0x181691269..2bb). It does not fire callbacks.
 * Cache refresh0x181693fd9..419e: probe own pos+normal/2 signed shift;
 * overlap includes inactive check and same entity rejection; absent/separated
 * record removes at end in reverse original-index order. First keep sets added,
 * invokes OnContactAdded before OnContacted, latter runs every retained tick.
 * ForceUpSearch flag5 halves only scaleX, searches with flag8 argument then
 * restores fullscale0x181693c67..e89; host supplies ordered search results.
 * updateAfter0x181693641..a63: prePos=current, clear moved6; scale callbacks,
 * preScale/expectedScale=current; if abs(FP((pos-expected)^2))>=4 actor pos
 * sync then OnPushedBack callback and expectedPos=current. Actor contacts then
 * map contacts last0x181693a63/a71; map source/response belongs to lead.
 * Stage.onUpdate0x18170b4cc/4fc/561: Actor.Update -> Collision.Update ->
 * Actor.Post, with calcPlayerRange/autoScroll between collision and post.
 * checkChunk: map0x1817f88d7; push passes(normal then fixed), each <=8,
 * fixed return1 restarts outer up to8 @0x1817f8911..896f; inertia/fixPlayer
 * postPushBack0x1817f8993; scale0x1817f8add; each updateAfter0x1817f8c92;
 * late OnCollided0x1817f8d15. Late pairs i<j, own then other callbacks gated
 * separately by flag1(0x2) @0x1817ff734..789; disabled bit0 blocks.
 * Callbacks run synchronously, quadtree updates happen after callbacks.
 * Mixed rect response, Map.Move, native broadphase/chunk order and inertia are
 * mandatory host adapters. This helper never invents them or owns public files.
 */
(function(root,factory){const gear=typeof module==='object'&&module.exports?require('./source-gear-devices.js'):root.SourceGearDevices;const api=factory(gear);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceGearCollision=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Gear){
'use strict';
if(!Gear)throw Error('Gear collision requires verified SourceGearDevices sqrt');
const FP=65536,EPS=4,PAD=65;
const clone=x=>JSON.parse(JSON.stringify(x));
const i64=x=>BigInt.asIntN(64,x),u64=x=>BigInt.asUintN(64,x);
function raw(n,label){if(!Number.isSafeInteger(n))throw Error('Gear collision requires exact safe FP raw '+label);return n;}
function num(n,label){return raw(Number(n),label);}
const add=(a,b)=>num(i64(BigInt(a)+BigInt(b)),'sum');
const sub=(a,b)=>num(i64(BigInt(a)-BigInt(b)),'difference');
const mul=(a,b)=>num(i64(BigInt(a)*BigInt(b))>>16n,'product');
const sq=v=>add(mul(v.xRaw,v.xRaw),mul(v.yRaw,v.yRaw));
const vec=(xRaw,yRaw)=>({xRaw,yRaw});
const subtract=(a,b)=>vec(sub(a.xRaw,b.xRaw),sub(a.yRaw,b.yRaw));
const equal=(a,b)=>a.xRaw===b.xRaw&&a.yRaw===b.yRaw;
function vector(v,label){if(!v)throw Error('Gear collision requires '+label);raw(v.xRaw,label+'.x');raw(v.yRaw,label+'.y');return v;}
function normalized(v){vector(v,'normal input');const q=u64(BigInt(v.xRaw)*BigInt(v.xRaw)+BigInt(v.yRaw)*BigInt(v.yRaw));if(q===0n)return vec(0,0);
 const bits=q.toString(2).length,shift=q>65536n?Math.floor((bits-1)/2)*2-14:0;
 const entry=Gear.sqrtTableEntry(Number(q>>BigInt(shift))),halfShift=shift>>1;
 if(!entry)throw Error('Native normalization divides by zero FPSqrt entry');
 const reciprocal=(1n<<44n)/BigInt(entry),right=BigInt((halfShift+14)&63);
 return vec(num(i64(BigInt(v.xRaw)*reciprocal)>>right,'normalizedX'),num(i64(BigInt(v.yRaw)*reciprocal)>>right,'normalizedY'));
}
function validate(c){if(!c||!Number.isInteger(c.collisionId)||typeof c.actorId!=='string')throw Error('Gear collision requires native collisionId and actorId');
 if(!['circle','rect'].includes(c.shape))throw Error('Gear collision supports native circle or rect');
 if(!Number.isInteger(c.flags)||c.flags<0||c.flags>65535||!Number.isInteger(c.layer)||!Number.isInteger(c.pushBackTarget))throw Error('Gear collision requires flags/layer/pushBackTarget');
 for(const k of ['xRaw','yRaw','preXRaw','preYRaw','scaleXRaw','scaleYRaw','preScaleXRaw','preScaleYRaw','pivotXRaw','pivotYRaw'])raw(c[k],k);
 if(!Array.isArray(c.contacts))throw Error('Gear collision requires ordered native contacts');return c;
}
function pose(c,pre){return pre?{xRaw:c.preXRaw,yRaw:c.preYRaw,scaleXRaw:c.preScaleXRaw,scaleYRaw:c.preScaleYRaw}:c;}
function circle(c,pre=false){if(c.shape!=='circle')throw Error('Circle geometry requires shape circle');const p=pose(c,pre),local=c.circle;
 if(!local)throw Error('Gear collision requires local circle tuple');for(const k of ['radiusRaw','xRaw','yRaw'])raw(local[k],'circle.'+k);
 return {radiusRaw:mul(local.radiusRaw,Math.max(p.scaleXRaw,p.scaleYRaw)),xRaw:add(p.xRaw,local.xRaw),yRaw:add(p.yRaw,local.yRaw)};
}
function rect(c,pre=false){const p=pose(c,pre),local=c.shape==='circle'?(()=>{const r=c.circle;return {heightRaw:2*r.radiusRaw,widthRaw:2*r.radiusRaw,xRaw:r.xRaw-r.radiusRaw,yRaw:r.yRaw-r.radiusRaw};})():c.rect;
 if(!local)throw Error('Gear collision requires local rect tuple');for(const k of ['heightRaw','widthRaw','xRaw','yRaw'])raw(local[k],'rect.'+k);
 return {heightRaw:mul(local.heightRaw,p.scaleYRaw),widthRaw:mul(local.widthRaw,p.scaleXRaw),xRaw:add(add(mul(sub(local.xRaw,c.pivotXRaw),p.scaleXRaw),c.pivotXRaw),p.xRaw),yRaw:add(add(mul(sub(local.yRaw,c.pivotYRaw),p.scaleYRaw),c.pivotYRaw),p.yRaw)};
}
function isCollided(a,b,options={}){validate(a);validate(b);if(a.actorId===b.actorId)return false;if(!options.ignoreDisabled&&((a.flags|b.flags)&1))return false;
 const pre=options.pre===true,offsetA=options.offsetA||vec(0,0),offsetB=options.offsetB||vec(0,0);vector(offsetA,'offsetA');vector(offsetB,'offsetB');
 if(a.shape==='circle'&&b.shape==='circle'){const ca=circle(a,pre),cb=circle(b,pre);ca.xRaw=add(ca.xRaw,offsetA.xRaw);ca.yRaw=add(ca.yRaw,offsetA.yRaw);cb.xRaw=add(cb.xRaw,offsetB.xRaw);cb.yRaw=add(cb.yRaw,offsetB.yRaw);return Gear.circlesOverlap(ca,cb);}
 const ra=rect(a,pre),rb=rect(b,pre),ax=add(ra.xRaw,offsetA.xRaw),ay=add(ra.yRaw,offsetA.yRaw),bx=add(rb.xRaw,offsetB.xRaw),by=add(rb.yRaw,offsetB.yRaw);
 return ax<add(bx,rb.widthRaw)&&bx<add(ax,ra.widthRaw)&&ay<add(by,rb.heightRaw)&&by<add(ay,ra.heightRaw);
}
function addContact(world,c,otherId,normal){vector(normal,'cache normal');if(c.contacts.some(r=>r.collisionId===otherId))return false;
 if(normal.xRaw===0&&normal.yRaw===-FP){const other=world.collisions.find(q=>q.collisionId===otherId);if(other?.contacts.some(r=>r.collisionId===c.collisionId&&r.normalXRaw===0&&r.normalYRaw===-FP))return false;}
 c.contacts.push({collisionId:otherId,normalXRaw:normal.xRaw,normalYRaw:normal.yRaw,hasCalledAdded:false});return true;
}
function moveFlag(c,newPosition){c.xRaw=newPosition.xRaw;c.yRaw=newPosition.yRaw;c.flags=(c.xRaw===c.preXRaw&&c.yRaw===c.preYRaw)?c.flags&~64:c.flags|64;}
function circleResponse(world,a,b,options={}){validate(a);validate(b);if(a.shape!=='circle'||b.shape!=='circle')throw Error('Native radial response requires two circles; mixed pairs route to rect adapter');
 const ca=circle(a),cb=circle(b),d=subtract(ca,cb),radius=add(ca.radiusRaw,cb.radiusRaw);
 let da=subtract(a,options.preOverrideA||vec(a.preXRaw,a.preYRaw)),db=subtract(b,options.preOverrideB||vec(b.preXRaw,b.preYRaw));
 const na=normalized(da),nb=normalized(db),dotA=add(mul(da.xRaw,d.xRaw),mul(da.yRaw,d.yRaw)),dotB=add(mul(db.xRaw,d.xRaw),mul(db.yRaw,d.yRaw));
 if((i64(BigInt(dotA)*BigInt(dotB))&-65536n)>0n){if(dotB<=0)db=vec(0,0);else da=vec(0,0);}
 const rel=subtract(db,da),A=sq(rel);
 const B=add(num(i64(i64(BigInt(rel.xRaw)*BigInt(d.xRaw))*2n)>>16n,'quadraticB.x'),num(i64(i64(BigInt(rel.yRaw)*BigInt(d.yRaw))*2n)>>16n,'quadraticB.y'));
 let t=0,discriminant=null;
 if(A!==0){const C=add(sub(mul(d.yRaw,d.yRaw),mul(radius,radius)),mul(d.xRaw,d.xRaw));
  discriminant=sub(mul(B,B),num(i64(i64(BigInt(C)*BigInt(A))<<2n)>>16n,'4CA'));
  const root=Gear.nativeSqrtRaw(discriminant);t=Math.min(FP,num(i64(BigInt(sub(root,B))<<16n)/i64(BigInt(A)*2n),'rewindTime'));
 }
 function rewind(delta,n){if(delta.xRaw===0&&delta.yRaw===0)return vec(0,0);const r=vec(add(mul(delta.xRaw,t),mul(n.xRaw,PAD)),add(mul(delta.yRaw,t),mul(n.yRaw,PAD)));return sq(r)>=sq(delta)?delta:r;}
 const ra=rewind(da,na),rb=rewind(db,nb),newA=subtract(a,ra),newB=subtract(b,rb),normal=normalized(subtract(newB,newA));
 moveFlag(a,newA);addContact(world,a,b.collisionId,normal);moveFlag(b,newB);addContact(world,b,a.collisionId,vec(-normal.xRaw||0,-normal.yRaw||0));
 return {code:0,rewindRaw:t,discriminantRaw:discriminant,rewindA:ra,rewindB:rb,normal,positionA:newA,positionB:newB};
}
function pushBackPair(world,aId,bId,ctx={}){const out=clone(world);if(!Array.isArray(out.collisions))throw Error('Gear collision requires world.collisions');
 const a=out.collisions.find(c=>c.collisionId===aId),b=out.collisions.find(c=>c.collisionId===bId);const skip=reason=>({world:out,code:2,reason});
 if(!a||!b||aId===bId)return skip('same_or_absent');validate(a);validate(b);
 if(!(a.pushBackTarget&2)||!(b.pushBackTarget&2))return skip('pushback_target');
 if(typeof ctx.isEnableCheck!=='function')throw Error('Gear requires native collision layer isEnableCheck');if(!ctx.isEnableCheck(a.layer,b.layer))return skip('layer');
 if(!((a.flags|b.flags)&64))return skip('not_moved');if((a.flags&4)&&!(a.flags&8)&&(b.flags&4)&&!(b.flags&8))return skip('both_fixed');
 if(!isCollided(a,b))return skip('no_current_collision');if(isCollided(a,b,{pre:true}))return skip('already_collided_pre');
 if(a.shape==='circle'&&b.shape==='circle')return {world:out,...circleResponse(out,a,b,ctx)};
 if(typeof ctx.rectResponse!=='function')throw Error('Mixed circle/rect native response requires lead rectResponse (0x1817f9e88), not radial nearest-point response');
 return {world:out,...ctx.rectResponse(out,a,b,ctx)};
}
function refreshActorContacts(world,id,ctx={}){const out=clone(world),c=out.collisions.find(q=>q.collisionId===id);validate(c);const trace=[];
 if(c.flags&32){if(typeof ctx.forceUpSearch!=='function')throw Error('Gear flag5 requires native ordered ForceUp search adapter');const saved=c.scaleXRaw;c.scaleXRaw=num(BigInt(c.scaleXRaw)>>1n,'halfScale');
  const ids=ctx.forceUpSearch(out,c,!!(c.flags&256));if(!Array.isArray(ids))throw Error('Gear ForceUp adapter must return ordered collision IDs');for(const target of ids)addContact(out,c,target,vec(0,-FP));c.scaleXRaw=saved;}
 const remove=[],count=c.contacts.length;
 for(let i=0;i<count;i++){const r=c.contacts[i],other=out.collisions.find(q=>q.collisionId===r.collisionId),normal=vec(r.normalXRaw,r.normalYRaw);vector(normal,'cached normal');
  const offset=vec(num(BigInt(normal.xRaw)>>1n,'halfNormalX'),num(BigInt(normal.yRaw)>>1n,'halfNormalY'));
  if(!other||!isCollided(c,other,{offsetA:offset})){remove.push(i);continue;}
  if(typeof r.hasCalledAdded!=='boolean')throw Error('Gear requires native hasCalledAdded bit in contact cache');
  if(!r.hasCalledAdded){r.hasCalledAdded=true;const e={kind:'OnContactAdded',collisionId:id,otherCollisionId:other.collisionId,contactType:1,...normal};trace.push(e);if(ctx.onContactAdded)ctx.onContactAdded(out,c,other,e);}
  const currentNormal=vector(vec(r.normalXRaw,r.normalYRaw),'post-Added cached normal');
  const e={kind:'OnContacted',collisionId:id,otherCollisionId:other.collisionId,contactType:1,...currentNormal};trace.push(e);if(ctx.onContacted)ctx.onContacted(out,c,other,e);
 }
 for(let i=remove.length-1;i>=0;i--)c.contacts.splice(remove[i],1);
 return {world:out,trace,removedIndices:remove};
}
function finishCollision(world,id,ctx={}){let out=clone(world);const c=out.collisions.find(q=>q.collisionId===id);validate(c);const trace=[];
 if(typeof c.actorExists!=='boolean')throw Error('Gear finishCollision requires resolved Frame.GetActor existence');
 for(const k of ['expectedXRaw','expectedYRaw','expectedScaleXRaw','expectedScaleYRaw'])raw(c[k],k);
 c.preXRaw=c.xRaw;c.preYRaw=c.yRaw;c.flags&=~64;
 if(c.actorExists&&(c.scaleXRaw!==c.expectedScaleXRaw||c.scaleYRaw!==c.expectedScaleYRaw)){if(typeof ctx.hasOnChangeScale!=='function')throw Error('Gear collision requires native OnChangeScale registry lookup');
  if(ctx.hasOnChangeScale(c)){const e={kind:'OnChangeScale',collisionId:id,scaleXRaw:c.scaleXRaw,scaleYRaw:c.scaleYRaw};trace.push(e);if(ctx.onChangeScale)ctx.onChangeScale(out,c,e);}}
 c.preScaleXRaw=c.scaleXRaw;c.preScaleYRaw=c.scaleYRaw;c.expectedScaleXRaw=c.scaleXRaw;c.expectedScaleYRaw=c.scaleYRaw;
 const correction=subtract(c,vec(c.expectedXRaw,c.expectedYRaw));
 if(Math.abs(sq(correction))>=EPS){if(c.actorExists){const e={kind:'ActorPositionSync',collisionId:id,actorId:c.actorId,xRaw:c.xRaw,yRaw:c.yRaw};trace.push(e);if(ctx.syncActorPosition)ctx.syncActorPosition(out,c,e);
  if(typeof ctx.hasOnPushedBack!=='function')throw Error('Gear collision requires native OnPushedBack registry lookup');
  if(ctx.hasOnPushedBack(c)){const push={kind:'OnPushedBack',collisionId:id,xRaw:c.xRaw,yRaw:c.yRaw,correctionXRaw:correction.xRaw,correctionYRaw:correction.yRaw};trace.push(push);if(ctx.onPushedBack)ctx.onPushedBack(out,c,push);}}
  c.expectedXRaw=c.xRaw;c.expectedYRaw=c.yRaw;}
 const refreshed=refreshActorContacts(out,id,ctx);out=refreshed.world;trace.push(...refreshed.trace);
 if(typeof ctx.refreshMapContacts!=='function')throw Error('Gear finishCollision requires native Map.IsContacted cache adapter after actor contacts');
 const map=ctx.refreshMapContacts(out,out.collisions.find(q=>q.collisionId===id));if(map?.trace)trace.push(...map.trace);if(map?.world)out=map.world;
 return {world:out,trace,removedIndices:refreshed.removedIndices};
}
function lateCollided(world,orderedIds,ctx={}){const out=clone(world),trace=[];
 if(typeof ctx.isEnableCheck!=='function'||typeof ctx.candidateCheck!=='function')throw Error('Gear late collision requires native layer and chunk/quadtree candidate adapters');
 for(let i=0;i<orderedIds.length-1;i++){const a=out.collisions.find(c=>c.collisionId===orderedIds[i]);validate(a);if(a.flags&1)continue;const aCallbackEnabled=!!(a.flags&2);
  for(let j=i+1;j<orderedIds.length;j++){const b=out.collisions.find(c=>c.collisionId===orderedIds[j]);validate(b);if(!ctx.candidateCheck(a,b)||(b.flags&1)||!(aCallbackEnabled||(b.flags&2))||!ctx.isEnableCheck(a.layer,b.layer)||!isCollided(a,b))continue;
   const callbackEnabled=[aCallbackEnabled,!!(b.flags&2)];let callbackIndex=0;
   for(const [self,other]of [[a,b],[b,a]])if(callbackEnabled[callbackIndex++]){const e={kind:'OnCollided',collisionId:self.collisionId,otherCollisionId:other.collisionId};trace.push(e);if(ctx.onCollided)ctx.onCollided(out,self,other,e);}
   if(ctx.updateTreeObjects)ctx.updateTreeObjects(out,a,b);
  }
 }
 return {world:out,trace};
}
const integration=Object.freeze({shapeRouting:'Only circle/circle radial. Any mixed pair uses native scaled bounding rect and lead rectResponse.',contacts:'circleResponse mutates cloned collision positions/flag6 and adds cache records; callbacks happen later through finishCollision/refreshActorContacts.',phaseOrder:'Stage.onUpdate: Actor.Update -> Collision.Update -> Actor.Post. Collision checkChunk: Map.Move -> bounded normal/fixed push passes -> postPushBack inertia/fixPlayer -> scale -> per-collision updateAfter(actor contact then map contact) -> late OnCollided.',host:'Supply actual callback registry lookups hasOnPushedBack/hasOnChangeScale. Supply ordered native active/chunk collisions and layer table checks; rectResponse/Map.Move/inertia/quadtree remain lead-owned. ForceUp flag5 must use native search adapter. Callbacks are synchronous on the cloned world.'});
return {normalized,circle,rect,isCollided,addContact,circleResponse,pushBackPair,refreshActorContacts,finishCollision,lateCollided,integration,nativeConstants:{padRaw:PAD,fp:FP,positionSyncSquaredEpsilon:EPS}};
});
