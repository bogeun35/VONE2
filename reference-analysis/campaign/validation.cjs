'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('./registry.js');
const copy = x => JSON.parse(JSON.stringify(x));
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
const registry = R.loadRegistry();
const plan = R.createEditorialPlan(registry);
const input = name => JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', name), 'utf8').replace(/^\uFEFF/,''));
test('all 147 original entries preserved across 7 mode inventories', () => {
  assert.equal(registry.entries.length, 147);
  assert.deepEqual(Object.fromEntries(['pico1/world','pico1/battle','pico1/endless','pico2/world','pico2/dark','pico2/battle','pico2/endless'].map(k=>[k,registry.entries.filter(e=>`${e.game}/${e.mode}`===k).length])),
    {'pico1/world':48,'pico1/battle':4,'pico1/endless':4,'pico2/world':60,'pico2/dark':16,'pico2/battle':8,'pico2/endless':7});
  assert(R.validateRegistry(registry)); assert(R.validatePlan(plan,registry));
});
test('all implementations unstarted, even text-confirmed references',()=>{
  assert(registry.entries.every(e=>e.implementation.status==='not_started'));
  for(const e of registry.entries)assert.throws(()=>R.assertPlayable(e),/Not verified/);
});
test('dynamic chapters and route retain every item; no arbitrary campaign assignment',()=>{
  assert.equal(registry.chapters.length,35); assert.equal(R.flattenPlan(plan).length,147);
  assert(plan.sections.filter(s=>s.role!=='unassigned').every(s=>s.chapters.length===0));
  assert.equal(plan.excludedReferences.length,0);
});
test('end does not loop, unknown item does not jump to first',()=>{
  const items=R.flattenPlan(plan);assert.equal(R.nextItem(plan,items.at(-1).instanceId),null);
  assert.equal(R.nextItem(plan,items[0].instanceId).instanceId,items[1].instanceId);
  assert.throws(()=>R.nextItem(plan,'absent'),/Unknown route/);
});
test('source IDs stable under input row reordering',()=>{
  const a=input('pico1-stages.json'),b=input('pico2-stages.json');a.stages.reverse();b.world.reverse();b.battle.reverse();
  assert.deepEqual(R.buildRegistry(a,b).entries.map(e=>e.sourceId),registry.entries.map(e=>e.sourceId));
});
test('duplicate input source rejected',()=>{const a=input('pico1-stages.json');a.stages[1]=a.stages[0];assert.throws(()=>R.buildRegistry(a,input('pico2-stages.json')),/Duplicate source/);});
test('missing input stage rejected',()=>{const b=input('pico2-stages.json');b.dark.pop();assert.throws(()=>R.buildRegistry(input('pico1-stages.json'),b),/Missing source/);});
test('out-of-range and mismatched source numbers rejected',()=>{
  const b=input('pico2-stages.json');b.dark[0].id='5-1';assert.throws(()=>R.buildRegistry(input('pico1-stages.json'),b),/Out of source range/);
  const c=input('pico2-stages.json');c.world[0].world=9;assert.throws(()=>R.buildRegistry(input('pico1-stages.json'),c),/Number mismatch/);
});
test('catalogue duplicate, missing and orphan chapter rejected',()=>{
  let r=copy(registry);r.entries.push(r.entries[0]);assert.throws(()=>R.validateRegistry(r),/Duplicate source/);
  r=copy(registry);r.entries.pop();assert.throws(()=>R.validateRegistry(r),/Missing catalogue/);
  r=copy(registry);r.chapters[0].sourceIds.pop();assert.throws(()=>R.validateRegistry(r),/Missing chapter/);
});
test('research labels cannot become completion status',()=>{
  for(const status of ['text-confirmed','complete','verified','implemented']){const r=copy(registry);r.entries[0].implementation.status=status;assert.throws(()=>R.validateRegistry(r));}
  const r=copy(registry);r.entries[0].implementation.artifact='pretend.js';assert.throws(()=>R.validateRegistry(r),/Unstarted entry/);
});
test('source metadata cannot relabel an entry as another game or mode',()=>{
  const r=copy(registry);r.entries[0].game='pico2';assert.throws(()=>R.validateRegistry(r),/Source identity mismatch/);
  const q=copy(registry);q.entries[0].chapterId='pico1/world/chapter-01';assert.throws(()=>R.validateRegistry(q),/Source chapter mismatch/);
});
test('verified requires explicit artifact and passed report',()=>{
  const r=copy(registry);r.entries[0].implementation={status:'verified',artifact:'test-fixture-only.js',verification:{passed:false,report:'fixture'}};
  assert.throws(()=>R.validateRegistry(r),/Missing implementation evidence/);
  r.entries[0].implementation.verification.passed=true;assert(R.validateRegistry(r));
  assert.equal(registry.entries[0].implementation.status,'not_started');
});
test('edits and second-run instances keep original references intact',()=>{
  const p=copy(plan), chapter=p.sections[0].chapters[0], first=chapter.items.shift(), second=chapter.items.shift();
  p.sections[1].chapters.push({id:'edited-opening',label:'Editor draft',items:[{instanceId:'main:combined',sourceIds:[...first.sourceIds,...second.sourceIds],edit:{kind:'combine',rationale:'Explicit editor test fixture',review:'not_reviewed'}}]});
  p.sections[3].chapters.push({id:'return',label:'Return',items:[{instanceId:'return:1',sourceIds:first.sourceIds,edit:{kind:'revisit',rationale:'Second-run test fixture',review:'not_reviewed'}}]});
  assert(R.validatePlan(p,registry));assert.equal(registry.entries.length,147);
});
test('silent cut, unknown reference and duplicate route instance rejected',()=>{
  let p=copy(plan);p.sections[0].chapters[0].items.pop();assert.throws(()=>R.validatePlan(p,registry),/Unaccounted/);
  p=copy(plan);p.sections[0].chapters[0].items[0].sourceIds=['missing'];assert.throws(()=>R.validatePlan(p,registry),/Unknown source/);
  p=copy(plan);p.sections[0].chapters[0].items.push(p.sections[0].chapters[0].items[0]);assert.throws(()=>R.validatePlan(p,registry),/Duplicate\/missing route/);
});
console.log(`\n${checks} checks passed. ${registry.entries.length} references; 0 implemented, 0 verified.`);
