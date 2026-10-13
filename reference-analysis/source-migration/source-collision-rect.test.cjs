const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('./source-collision-rect.js');
const F=65536,G=655;
function body(id,x,y,px=x,py=y){const rectRaw={x:0,y:0,width:10*F,height:10*F};return {id,entityId:id,xRaw:x*F,yRaw:y*F,preXRaw:px*F,preYRaw:py*F,rectRaw,preRectRaw:{...rectRaw},flags:x!==px||y!==py?64:0,pushBackTarget:2,collisionType:0};}
const update=(a,b,o={})=>R.update(a,b,{layerEnabled:true,...o});
test('falling player separates from platform and emits reciprocal Y contacts',()=>{
 const a=body('p',0,12,0,9),b=body('lift',0,20),r=update(a,b);
 // ratio trunc(-2/3 *65536)=-43690; floor(3 * ratio)=-131070.
 assert.equal(r.a.yRaw,10*F+2-G);assert.equal(r.b.yRaw,20*F);assert.equal(r.code,0);
 assert.deepEqual(r.contacts,[{ownerId:'p',targetId:'lift',face:1},{ownerId:'lift',targetId:'p',face:0}]);
 assert.equal(a.yRaw,12*F);
});
test('opposing horizontal bodies share rollback ratio with fixed-point rounding',()=>{
 const r=update(body('a',7,0,0,0),body('b',15,0,20,0));
 assert.deepEqual(r.ratios.x,{ra:-10922,rb:-10922,face:3});
 assert.equal(r.a.xRaw,7*F-76454-G);assert.equal(r.b.xRaw,15*F+54610);
});
test('same-direction catch rolls back only the faster body',()=>{
 const r=update(body('a',15,0,0,0),body('b',23,0,20,0));
 assert.equal(r.ratios.x.rb,0);assert.equal(r.b.xRaw,23*F);assert.equal(r.a.xRaw,15*F-131070-G);
});
test('current and previous overlap gates are strict and do not create swept contacts',()=>{
 assert.equal(update(body('a',0,0),body('b',10,0)).code,2);
 assert.equal(update(body('a',1,0,0,0),body('b',5,0)).code,2);
 assert.equal(update(body('a',30,0,0,0),body('b',15,0)).code,2);
});
test('layer, active, entity, movement and two-force gates return no contacts',()=>{
 const a=body('a',7,0,0,0),b=body('b',15,0,20,0);
 assert.equal(update(a,b,{layerEnabled:false}).code,2);
 for(const [aa,bb] of [[{...a,flags:a.flags|1},b],[a,{...b,entityId:'a'}],[{...a,flags:0},{...b,flags:0}],[{...a,flags:68},{...b,flags:68}]])assert.equal(update(aa,bb).code,2);
 assert.throws(()=>R.update(a,b),/layer matrix/);
});
test('forced platform asks host to move player and records a failed retry',()=>{
 const a=body('lift',7,0,0,0),b=body('p',15,0);a.flags|=4;
 assert.throws(()=>update(a,b),/moveCollisionForce/);
 let requested;
 const r=update(a,b,{forceMove:(other,target)=>{requested=target;return {collision:other,success:false};}});
 // ratio=-18724, correction=-131068; separation and reviseMov each add 655.
 assert.equal(requested.x,17*F+2*G-4);assert.equal(r.code,1);assert.equal(r.a.flags&8,8);assert.deepEqual(r.contacts,[]);
});
test('force success keeps platform at intended position and commits contact pair',()=>{
 const a=body('lift',7,0,0,0),b=body('p',15,0);a.flags|=4;
 const r=update(a,b,{forceMove:(other,target)=>({collision:{...other,xRaw:target.x,yRaw:target.y,flags:64},success:true})});
 assert.equal(r.a.xRaw,7*F);assert.equal(r.b.xRaw,17*F+2*G-4);assert.equal(r.contacts.length,2);
});
test('reviseMov applies separator only at the native 4 raw threshold',()=>{
 assert.deepEqual(R.revise({x:3,y:-4}),{x:3,y:-659});
 assert.deepEqual(R.revise({x:4,y:-3}),{x:659,y:-3});
});
test('GetRect scales around explicit pivot with native FP floor rounding',()=>{
 const base={x:-5*F,y:-10*F,width:10*F,height:20*F};
 assert.deepEqual(R.getRect(base,{xRaw:F/2,yRaw:2*F},{xRaw:F,yRaw:-F}),{x:-2*F,y:-19*F,width:5*F,height:40*F});
 assert.deepEqual(R.getRect({x:-3,y:1,width:3,height:5},{xRaw:F/2,yRaw:F/2},{xRaw:0,yRaw:0}),{x:-2,y:0,width:1,height:2});
 assert.throws(()=>R.getRect(base,{xRaw:F,yRaw:F}),/safe raw/);
});
