'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const B=require('./source-breakablerect-devices.js');
const F=65536;
const local=path.join(__dirname,'installed-stage-decoded.local.json');
function actors(stageId,count){
 const T=require('./terrain-runtime.js');
 const source=JSON.parse(fs.readFileSync(local)),geometry=JSON.parse(fs.readFileSync(path.join(__dirname,'source-geometry.local.json')));
 return T.createTerrain({source,geometry,count,stageId}).actors;
}
const have=fs.existsSync(local);

test('14-1 block: slot0 x slot1 = 672 x 48, anchored bottom-left at its position, every count',{skip:!have},()=>{
 for(let n=2;n<=8;n++){const c=B.compile(actors('st_w_14_01',n),n);
  assert.equal(c.blocks.length,1);
  assert.deepEqual(B.solids(B.create(c)).map(({x,y,w,h})=>({x,y,w,h})),[{x:960,y:384,w:672,h:48}]);}
});

function synthetic(datas){return {typeName:'BreakableRect',name:'B',posX:100,posY:200,playerCount:0,createThreshold:0,datas};}
const num=f=>({t:1,f,s:null});
function tableString(values){ // inverse of the QPlayerCountParam decode, for tests only
 let s='';for(const v of values){let x=BigInt.asUintN(64,BigInt(v));for(let k=0;k<8;k++){s+=String.fromCodePoint(Number(x&0xffn)+0x21);x>>=8n;}}return {t:2,f:0,s};
}

test('tables search downward from count-2 to the first nonzero entry',()=>{
 // width table only has an entry for index 1 (3 players)
 const a=synthetic([num(100),num(20),tableString([0,7*F,0,0,0,0,0]),tableString([0,0,0,0,0,0,0]),tableString([0,0,0,0,0,0,0]),tableString([0,0,0,0,0,0,0])]);
 assert.equal(B.compile([a],2).blocks[0].rectRaw.widthRaw,100*F,'index 0 is zero, nothing below');
 assert.equal(B.compile([a],3).blocks[0].rectRaw.widthRaw,107*F);
 assert.equal(B.compile([a],8).blocks[0].rectRaw.widthRaw,107*F,'falls back down to index 1');
});

test('position tables are searched as one pair and added to the position',()=>{
 const z=tableString([0,0,0,0,0,0,0]);
 const a=synthetic([num(48),num(48),z,z,tableString([5*F,0,0,0,0,0,0]),tableString([0,0,9*F,0,0,0,0])]);
 const b4=B.compile([a],4).blocks[0];
 assert.equal(b4.xRaw,100*F,'pair found at index 2: x part is zero there');
 assert.equal(b4.yRaw,209*F);
 const b2=B.compile([a],2).blocks[0];
 assert.equal(b2.xRaw,105*F);assert.equal(b2.yRaw,200*F);
});

test('only Thorn 0x5d, 0x7a and ThornShell 0x8f break it; then 0.1s hidden but solid, then gone',()=>{
 const s=B.create(B.compile([synthetic([num(48),num(48)])],2)),id=s.blocks[0].id;
 assert.equal(B.contacted(s,id,27),false,'a player standing on it');
 assert.equal(B.contacted(s,id,163),false,'a PlayerBlock');
 assert.equal(B.contacted(s,id,0x5d),true);
 assert.equal(B.contacted(s,id,0x8f),false,'already breaking');
 let r=B.beforeStep(s,{dtRaw:1092});
 assert.deepEqual(r.broke,[id]);assert.equal(B.displays(s).length,0);assert.equal(B.solids(s).length,1);
 assert.equal(s.blocks[0].timerRaw,6553,'QFP._0_10');
 for(let i=0;i<6;i++)B.beforeStep(s,{dtRaw:1092});
 assert.equal(B.solids(s).length,1,'6 x 1092 = 6552 leaves 1 raw');
 B.beforeStep(s,{dtRaw:1092});
 assert.equal(B.solids(s).length,0);
});
