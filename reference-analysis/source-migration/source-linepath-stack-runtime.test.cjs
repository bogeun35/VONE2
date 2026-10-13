const {test}=require('node:test'),assert=require('node:assert/strict'),{probe}=require('./probe-source-carry.cjs');
for(let count=2;count<=8;count++)test(`real3-2 R.create/R.step starts lift with${count} players including stacked riders`,()=>{
 const r=probe('st_w_03_02',count);assert.equal(r.status,'play');assert.equal(r.tick,3);assert.ok(r.liftDeltaXRaw>0,'recursive authored rider threshold must start the lift');
});
