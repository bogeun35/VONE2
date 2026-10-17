'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./source-halfinput-devices.js');
const R=require('./source-stage-runtime.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
test('half input: ceil(n/2) players hold the right; releasing every button frees it',()=>{
 const st=H.compile([{typeName:'HalfOperator',datas:[]}],5);assert.equal(st.inputPlayerMax,3);
 const press=k=>({[k]:true});
 H.update(st,[press('right'),{},press('jump'),press('left'),press('up')]);assert.deepEqual(st.flags,[1,0,1,1,0]);
 H.update(st,[{},{},press('jump'),press('left'),press('up')]);assert.deepEqual(st.flags,[0,0,1,1,1]);// 0 released, 4 takes it
 H.update(st,[press('right'),press('down'),press('jump'),press('left'),press('up')]);assert.deepEqual(st.flags,[0,0,1,1,1]);// full
 for(const [n,m] of [[2,1],[3,2],[4,2],[6,3],[7,4],[8,4]])assert.equal(H.compile([{typeName:'HalfOperator',datas:[]}],n).inputPlayerMax,m);
});
test('7-1: players without the right do not move',()=>{
 const s=R.create(R.compile({source,geometry,count:8,stageId:'st_w_07_01'}));const x0=s.players.map(p=>p.x);
 for(let i=0;i<30;i++)R.step(s,Object.fromEntries(s.players.map(p=>[p.id,{right:true}])));
 assert.equal(s.halfInputState.flags.join(''),'11110000');
 assert.ok(s.players.slice(4).every((p,i)=>Math.abs(p.x-x0[i+4])<1e-9));assert.ok(s.players[0].x>x0[0]);
 assert.deepEqual(s.halfInputState.signs.map(g=>g.direction),[3]);
});
