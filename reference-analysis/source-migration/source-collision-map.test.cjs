const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./source-collision-map.js'),F=65536,G=655;
const map=(w=6,h=6)=>({tileFlags:Array.from({length:h},()=>Array(w).fill(0))});
const body=(x=10,y=10,w=10,h=10)=>({xRaw:x*F,yRaw:y*F,preXRaw:x*F,preYRaw:y*F,rectRaw:{x:0,y:0,width:w*F,height:h*F},flags:0,pushBackTarget:1,mapNormals:[],requestMapNormals:[]});
test('cell conversion is FP divide/truncate then arithmetic shift, including tiny negatives',()=>{
 assert.deepEqual([-49*F,-48*F,-1,-48,0,48*F-1,48*F].map(M.cell),[-2,-1,0,-1,0,0,1]);
});
test('free movement, local anchor, movement flag and pure serialization',()=>{
 const b=body(),g=map();b.rectRaw.x=-2*F;const r=M.moveMap(g,b,{xRaw:5*F,yRaw:-3*F});
 assert.deepEqual(r.delta,{xRaw:5*F,yRaw:-3*F});assert.equal(r.collision.xRaw,15*F);assert.equal(r.collision.flags,64);
 assert.equal(b.xRaw,10*F);assert.deepEqual(JSON.parse(JSON.stringify(r)),r);
 assert.equal(M.moveMap(g,r.collision,{xRaw:-5*F,yRaw:3*F}).collision.flags,0);
});
test('Map.Move scans crossed cells and applies exact 655-raw separation at each face',()=>{
 for(const [dx,dy,wallX,wallY,face,expected] of [[100,0,2,0,3,{xRaw:76*F-G,yRaw:0}],[-30,0,0,0,2,{xRaw:-12*F+G,yRaw:0}],[0,100,0,2,1,{xRaw:0,yRaw:76*F-G}],[0,-30,0,0,0,{xRaw:0,yRaw:-12*F+G}]]){
  const g=map();if(dx){for(const row of g.tileFlags)row[wallX]=1;}else g.tileFlags[wallY].fill(1);
  const b=body(dx<0?60:10,dy<0?60:10),r=M.mapMove(g,b,{xRaw:dx*F,yRaw:dy*F});
  assert.deepEqual(r.delta,expected);assert.deepEqual(r.normal,[{xRaw:0,yRaw:-F},{xRaw:0,yRaw:F},{xRaw:-F,yRaw:0},{xRaw:F,yRaw:0}][face]);
 }
});
test('half-pixel map probe includes leading edge and clamps out-of-map coordinates',()=>{
 const g=map();g.tileFlags[0][1]=1;const b=body(27.5,1,20,10);
 assert.deepEqual(M.isContacted(g,b,{xRaw:F,yRaw:0}),{x:1,y:0});
 b.xRaw--;assert.equal(M.isContacted(g,b,{xRaw:F,yRaw:0}),null);
 const border=map(2,2);border.tileFlags[0][0]=1;
 assert.deepEqual(M.isContacted(border,body(-100,-100),{xRaw:-F,yRaw:0}),{x:-3,y:-3});
});
test('existing right contact zeros X while Y continues and normal is returned',()=>{
 const g=map();for(const row of g.tileFlags)row[1]=1;
 const b=body(38-G/F,10),r=M.mapMove(g,b,{xRaw:3*F,yRaw:7*F});
 assert.deepEqual(r.delta,{xRaw:0,yRaw:7*F});assert.deepEqual(r.normal,{xRaw:F,yRaw:0});
});
test('diagonal first hit stops both axes; wrapper slides remainder without duplicate normals',()=>{
 const g=map();for(const row of g.tileFlags)row[1]=1;
 const b=body(),d={xRaw:40*F,yRaw:20*F},single=M.mapMove(g,b,d),slide=M.moveMap(g,b,d);
 assert.deepEqual(single.delta,{xRaw:28*F-G,yRaw:14*F});
 assert.deepEqual(slide.delta,{xRaw:28*F-G,yRaw:20*F});assert.equal(slide.collision.requestMapNormals.length,1);
 assert.deepEqual(M.moveMap(g,b,d,{slide:false}).delta,single.delta);
});
test('DDA tie chooses Y, then slide records X at the corner',()=>{
 const g=map();g.tileFlags[0][1]=1;g.tileFlags[1][0]=1;g.tileFlags[1][1]=1;
 const b=body(),d={xRaw:40*F,yRaw:40*F};
 assert.deepEqual(M.mapMove(g,b,d).normal,{xRaw:0,yRaw:F});
 assert.deepEqual(M.moveMap(g,b,d).collision.requestMapNormals,[{xRaw:0,yRaw:F},{xRaw:F,yRaw:0}]);
});
test('inactive and map-target flags precede movement and keep unrelated flag bits',()=>{
 const g=map();g.tileFlags.forEach(r=>r.fill(1));const b=body();b.flags=1;
 assert.equal(M.moveMap(g,b,{xRaw:F,yRaw:0}).success,false);
 b.flags=0x100;b.pushBackTarget=2;const r=M.moveMap(g,b,{xRaw:F,yRaw:0});
 assert.equal(r.collision.xRaw,11*F);assert.equal(r.collision.flags,0x140);assert.deepEqual(r.collision.mapNormals,[]);
});
test('attribute bit1 alone blocks; non-solid attributes and invalid map facts',()=>{
 const g=map();g.tileFlags.forEach(r=>r.fill(2));assert.equal(M.moveMap(g,body(),{xRaw:100*F,yRaw:0}).delta.xRaw,100*F);
 assert.throws(()=>M.moveMap({tileFlags:[[0],[]]},body(),{xRaw:0,yRaw:0}),/tileFlags/);
});
