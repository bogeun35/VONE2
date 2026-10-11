'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Text=require('./source-text-devices.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));

const stage=(id,variant=0)=>{
 const found=data.stages.find(s=>s.stageId===id);
 assert.ok(found,'missing source stage '+id);
 const list=found.json.stageInitParamList[variant];
 assert.ok(list,'missing variant '+variant+' of '+id);
 return list.actorCreateParamList;
};
// Deep copy a real source actor so a synthetic probe never mutates the dataset.
const copy=actor=>JSON.parse(JSON.stringify(actor));
const only=(actors,name)=>copy(actors.find(a=>a.typeName==='Text'&&(a.name||'')===name));
const named=(compiled,name)=>{const t=compiled.texts.find(x=>x.name===name);assert.ok(t,'missing '+name);return t;};
// Every Text instance in the shipped game, gathered straight from the decoded
// stage payloads so the expectations below cannot drift from the source data.
const everyInstance=()=>{
 const out=[];
 for(const s of data.stages)
  for(const v of s.json.stageInitParamList)
   for(const a of v.actorCreateParamList)
    if(a.typeName==='Text')out.push({stageId:s.stageId,createIndex:v.createIndex,actor:a});
 return out;
};
const FLOAT_SLOT=1,STRING_SLOT=2,UNSET_SLOT=0;

test('the shipped game holds 17 Text instances across 13 stages, 10 of them World stages',()=>{
 const all=everyInstance();
 assert.equal(all.length,17);
 const stages=[...new Set(all.map(r=>r.stageId))].sort();
 assert.deepEqual(stages,['st_b_01_02','st_b_01_03','st_l_04_04','st_w_02_02','st_w_02_04',
  'st_w_03_03','st_w_03_04','st_w_05_04','st_w_06_01','st_w_09_03','st_w_10_03','st_w_14_01','st_w_15_04']);
 assert.equal(stages.filter(id=>id.startsWith('st_w_')).length,10);
});

test('every Text instance uses exactly slots 0..8 in the shape ParseParameter reads',()=>{
 for(const {stageId,actor} of everyInstance()){
  const where=stageId+' '+(actor.name||'(unnamed)');
  // 0x18171b5ac / 0x18171b620: slots 0 and 1 are read as strings (t === 2).
  assert.equal(actor.datas[0].t,STRING_SLOT,where+' slot 0');
  assert.equal(actor.datas[1].t,STRING_SLOT,where+' slot 1');
  // 0x18171b667..0x18171b76e: slots 2..8 are read as FP numbers (t === 1).
  for(let i=2;i<=8;i++)assert.equal(actor.datas[i].t,FLOAT_SLOT,where+' slot '+i);
  // ParseParameter never touches slot 9 and above; nothing in the game sets one.
  for(let i=9;i<actor.datas.length;i++)assert.equal(actor.datas[i].t,UNSET_SLOT,where+' slot '+i);
  // Both ungated and immediate for every instance.
  assert.equal(actor.playerCount,0,where+' playerCount');
  assert.equal(actor.createThreshold,0,where+' createThreshold');
 }
});

test('no Text instance in the whole game carries a literal text, a velocity or a colour',()=>{
 for(const {stageId,actor} of everyInstance()){
  const where=stageId+' '+(actor.name||'(unnamed)');
  assert.equal(actor.datas[1].s,'',where+' slot 1 (m_Text) is always empty - the textId is used');
  assert.equal(actor.datas[3].f,0,where+' slot 3 (m_Color)');
  assert.equal(actor.datas[6].f,0,where+' slot 6 (m_Velo.x)');
  assert.equal(actor.datas[7].f,0,where+' slot 7 (m_Velo.y)');
  assert.ok(actor.datas[0].s.length>0,where+' slot 0 (m_TextId)');
 }
});

test('st_w_02_02 Text1 decodes to the native TextComponent fields',()=>{
 const actors=stage('st_w_02_02');
 const source=actors.filter(a=>a.typeName==='Text');
 assert.equal(source.length,1);
 const compiled=Text.compile(actors,2);
 assert.equal(compiled.texts.length,1);
 assert.deepEqual(compiled.warnings,[]);
 assert.equal(compiled.nativeBehaviour,'none');
 const t=named(compiled,'Text1');
 // datas 0="Stage_DontTouchMe" 1="" 2=2 3=0 4=0 5=1 6=0 7=0 8=0 at (300,216).
 assert.equal(t.textId,'Stage_DontTouchMe');
 assert.equal(t.text,'');
 assert.equal(t.fontSize,2);
 assert.equal(t.color,0);
 assert.equal(t.isBorder,false);
 assert.equal(t.isBack,true);
 assert.equal(t.isFollow,false);
 assert.deepEqual(t.velocity,{x:0,y:0});
 assert.deepEqual(t.anchor,{x:300,y:216});
 assert.equal(t.x,300);
 assert.equal(t.y,216);
 // Never written by ParseParameter, so zero on a freshly added component.
 assert.equal(t.lifeTime,0);
 assert.equal(t.owner,null);
 assert.equal(t.width,0);
 assert.equal(t.alignmentH,0);
 // TextView.OnInitialize 0x1805ca292 / 0x1805ca6be.
 assert.equal(t.sortingOrder,Text.nativeConstants.sortingOrderBack);
 assert.equal(t.outlineWidth,0);
});

test('st_w_03_03 holds the only bordered, front-facing Text in the game',()=>{
 const compiled=Text.compile(stage('st_w_03_03'),2);
 assert.equal(compiled.texts.length,2);
 // datas 2=1.5 4=0 5=1 -> behind, no border.
 const hint=named(compiled,'Text1');
 assert.equal(hint.textId,'Stage_HoldToUseSkill');
 assert.equal(hint.isBorder,false);
 assert.equal(hint.isBack,true);
 assert.equal(hint.sortingOrder,Text.nativeConstants.sortingOrderBack);
 // datas 2=1.5 4=1 5=0 -> in front, with the 0.3 outline.
 const reverse=named(compiled,'Text2');
 assert.equal(reverse.textId,'Stage_Reverse');
 assert.equal(reverse.isBorder,true);
 assert.equal(reverse.isBack,false);
 assert.equal(reverse.sortingOrder,Text.nativeConstants.sortingOrderFront);
 assert.equal(reverse.outlineWidth,Text.nativeConstants.borderOutlineWidth);
 assert.deepEqual(reverse.anchor,{x:1920,y:168});
 // Exactly one instance in the entire game sets slot 4 (m_IsBorder).
 assert.deepEqual(everyInstance().filter(r=>r.actor.datas[4].f!==0).map(r=>r.stageId+':'+r.actor.name),
  ['st_w_03_03:Text2']);
});

test('st_w_09_03 holds the only follow-flagged Text in the game',()=>{
 const compiled=Text.compile(stage('st_w_09_03'),2);
 const t=named(compiled,'Text1');
 // datas 0="Stage_PressToHide" 2=0.7 8=1 at (192,111).
 assert.equal(t.textId,'Stage_PressToHide');
 assert.equal(t.fontSize,0.7);
 assert.equal(t.isFollow,true);
 assert.deepEqual(t.anchor,{x:192,y:111});
 assert.deepEqual(everyInstance().filter(r=>r.actor.datas[8].f!==0).map(r=>r.stageId+':'+r.actor.name),
  ['st_w_09_03:Text1']);
});

test('the authored font sizes survive verbatim across every instance',()=>{
 const seen=new Map();
 for(const {stageId,createIndex,actor} of everyInstance()){
  const compiled=Text.compile([actor],2);
  assert.equal(compiled.texts.length,1,stageId);
  assert.equal(compiled.texts[0].fontSize,actor.datas[2].f,stageId+' v'+createIndex);
  assert.equal(compiled.texts[0].textId,actor.datas[0].s,stageId+' v'+createIndex);
  seen.set(actor.datas[2].f,true);
 }
 assert.deepEqual([...seen.keys()].sort((a,b)=>a-b),[0.7,1.2,1.5,2,2.5,4,5]);
});

test('every Text compiles at every player count because none of them is gated',()=>{
 for(const {stageId,actor} of everyInstance())
  for(let count=2;count<=8;count++)
   assert.equal(Text.compile([actor],count).texts.length,1,stageId+' at '+count);
});

test('a Text contributes no solid, no hazard, no event and no death',()=>{
 for(const {stageId,actor} of everyInstance()){
  const state=Text.create(Text.compile([actor],4));
  assert.deepEqual(Text.solids(state),[],stageId);
  assert.deepEqual(Text.hazards(state),[],stageId);
  assert.deepEqual(Text.beforeStep(state,{dt:1/60}),{solids:[]},stageId);
  // Three thousand native ticks, i.e. fifty seconds, change nothing.
  for(let i=0;i<3000;i++){
   const r=Text.afterStep(state,{dt:1/60});
   assert.deepEqual(r.events,[],stageId);
   assert.deepEqual(r.deadPlayerIds,[],stageId);
   assert.deepEqual(r.solids,[],stageId);
   assert.deepEqual(r.hazards,[],stageId);
  }
  assert.equal(state.ticks,3000);
  for(const t of state.texts){
   assert.equal(t.exitRequested,false);
   assert.equal(t.flags,0);
   assert.equal(t.timer,0);
  }
 }
});

test('compile preserves the authored values and labels() reports them unchanged',()=>{
 const actors=stage('st_w_15_04');
 const compiled=Text.compile(actors,8);
 const state=Text.create(compiled);
 const labels=Text.labels(state);
 assert.equal(labels.length,1);
 const source=actors.find(a=>a.typeName==='Text');
 assert.deepEqual(labels[0],{id:labels[0].id,name:source.name,
  x:source.posX,y:source.posY,
  textId:source.datas[0].s,text:source.datas[1].s,fontSize:source.datas[2].f,
  color:0,isBorder:false,outlineWidth:0,isBack:true,
  sortingOrder:Text.nativeConstants.sortingOrderBack,isFollow:false,
  width:0,alignmentH:0});
 // labels() must not hand out the live state objects.
 labels[0].fontSize=999;
 assert.equal(Text.labels(state)[0].fontSize,source.datas[2].f);
});

test('both st_w_10_03 variants carry the identical Text',()=>{
 const a=Text.compile(stage('st_w_10_03',0),2).texts;
 const b=Text.compile(stage('st_w_10_03',1),5).texts;
 assert.equal(a.length,1);
 assert.equal(b.length,1);
 assert.equal(a[0].textId,'Stage_PressToGetLonger');
 assert.deepEqual({...a[0],id:null},{...b[0],id:null});
});

test('slot decoding follows ParseParameter exactly on synthetic probes',()=>{
 const base=only(stage('st_w_02_02'),'Text1');
 const probe=overrides=>{
  const actor=JSON.parse(JSON.stringify(base));
  for(const [i,slot] of Object.entries(overrides))actor.datas[Number(i)]=slot;
  return Text.compile([actor],2).texts[0];
 };
 // sar reg,0x10 is an arithmetic floor, so 0.9 floors to 0 and -0.1 to -1.
 assert.equal(probe({4:{t:FLOAT_SLOT,f:0.9,s:null}}).isBorder,false);
 assert.equal(probe({4:{t:FLOAT_SLOT,f:1,s:null}}).isBorder,true);
 assert.equal(probe({4:{t:FLOAT_SLOT,f:-0.1,s:null}}).isBorder,true);
 assert.equal(probe({5:{t:FLOAT_SLOT,f:0.5,s:null}}).isBack,false);
 assert.equal(probe({8:{t:FLOAT_SLOT,f:7,s:null}}).isFollow,true);
 // m_Color is written as the literal 1, never as the authored magnitude.
 assert.equal(probe({3:{t:FLOAT_SLOT,f:5,s:null}}).color,1);
 assert.equal(probe({3:{t:FLOAT_SLOT,f:0.4,s:null}}).color,0);
 // A non-string slot 0/1 falls back to the static empty QString.
 assert.equal(probe({0:{t:UNSET_SLOT,f:0,s:null}}).textId,'');
 assert.equal(probe({0:{t:FLOAT_SLOT,f:3,s:null}}).textId,'');
 // m_FontSize keeps its fraction - it is not floored.
 assert.equal(probe({2:{t:FLOAT_SLOT,f:2.75,s:null}}).fontSize,2.75);
 // An unset numeric slot contributes 0 (`mov reg, ebp` with ebp = 0).
 assert.equal(probe({2:{t:UNSET_SLOT,f:0,s:null}}).fontSize,0);
});

test('a slot above 8 or a non-zero m_Velo is reported, never silently dropped',()=>{
 const base=only(stage('st_w_02_02'),'Text1');
 const withTail=JSON.parse(JSON.stringify(base));
 withTail.datas[12]={t:FLOAT_SLOT,f:4,s:null};
 const tail=Text.compile([withTail],2);
 assert.equal(tail.texts.length,1);
 assert.equal(tail.warnings.length,1);
 assert.match(tail.warnings[0],/slot 12 is unread/);
 const drifting=JSON.parse(JSON.stringify(base));
 drifting.datas[6]={t:FLOAT_SLOT,f:1.5,s:null};
 const drift=Text.compile([drifting],2);
 assert.deepEqual(drift.texts[0].velocity,{x:1.5,y:0});
 assert.equal(drift.warnings.length,1);
 assert.match(drift.warnings[0],/m_Velo/);
 const deferred=JSON.parse(JSON.stringify(base));
 deferred.createThreshold=120;
 const late=Text.compile([deferred],2);
 assert.equal(late.texts[0].createThreshold,120);
 assert.match(late.warnings[0],/deferred Text creation/);
});

test('the OnPost lifetime countdown is a faithful but unreachable transcription',()=>{
 // ParseParameter cannot produce a lifetime, so this drives create() directly.
 // The native countdown is exact FP integer arithmetic; this port subtracts
 // floats, so the step sizes here are binary-exact to keep the tick count
 // unambiguous instead of asserting around accumulated float residue.
 const compiled=Text.compile(stage('st_w_02_02'),2);
 compiled.texts[0].lifeTime=1;
 compiled.texts[0].owner='Switch1';
 const state=Text.create(compiled);
 assert.equal(state.texts[0].timer,1);
 let fired=null;
 for(let i=0;i<8;i++){
  const r=Text.afterStep(state,{dt:0.25});
  if(r.events.length){fired={tick:i,events:r.events};break;}
 }
 assert.ok(fired,'the lifetime should expire');
 // 1 s in 0.25 s steps expires on the fourth tick (index 3).
 assert.equal(fired.tick,3);
 assert.deepEqual(fired.events,[{event:Text.nativeConstants.eventTextExit,target:'Switch1',source:state.texts[0].id}]);
 assert.equal(state.texts[0].exitRequested,true);
 assert.equal(state.texts[0].flags,Text.nativeConstants.actorFlagExitRequest);
 // An expired Text stops reporting itself and never fires twice.
 assert.deepEqual(Text.labels(state),[]);
 assert.deepEqual(Text.afterStep(state,{dt:0.25}).events,[]);
 // Without an owner the flag is still set but no event is raised: OnExit
 // returns early at 0x18171bb19 when m_Owner is 0.
 const lonely=Text.compile(stage('st_w_02_02'),2);
 lonely.texts[0].lifeTime=0.25;
 const s2=Text.create(lonely);
 assert.deepEqual(Text.afterStep(s2,{dt:0.25}).events,[]);
 assert.equal(s2.texts[0].exitRequested,true);
 assert.equal(s2.texts[0].flags,Text.nativeConstants.actorFlagExitRequest);
});

test('compile and create reject malformed input instead of guessing',()=>{
 const actors=stage('st_w_02_02');
 for(const bad of [0,1,9,2.5,'4',null])assert.throws(()=>Text.compile(actors,bad),/player count/);
 assert.throws(()=>Text.compile(null,2),/actor list/);
 assert.throws(()=>Text.create({schemaVersion:2,texts:[]}),/Compiled Text set/);
 assert.throws(()=>Text.create(null),/Compiled Text set/);
 const state=Text.create(Text.compile(actors,2));
 assert.throws(()=>Text.afterStep(state,{dt:-1}),/delta/);
 assert.throws(()=>Text.afterStep(null,{}),/state required/);
 assert.throws(()=>Text.beforeStep(null),/state required/);
 assert.throws(()=>Text.labels(null),/state required/);
 // A slot the original reads as a number must not be a string.
 const broken=only(actors,'Text1');
 broken.datas[2]={t:STRING_SLOT,f:0,s:'nope'};
 assert.throws(()=>Text.compile([broken],2),/slot 2 must be a numeric parameter/);
 // A Text without coordinates is refused rather than placed at the origin.
 const nowhere=only(actors,'Text1');
 delete nowhere.posX;
 assert.throws(()=>Text.compile([nowhere],2),/Text position/);
});

test('compile ignores every actor type that is not a Text',()=>{
 const actors=stage('st_w_01_01');
 assert.equal(actors.filter(a=>a.typeName==='Text').length,0);
 const compiled=Text.compile(actors,4);
 assert.deepEqual(compiled.texts,[]);
 assert.deepEqual(compiled.warnings,[]);
 const state=Text.create(compiled);
 assert.deepEqual(Text.solids(state),[]);
 assert.deepEqual(Text.labels(state),[]);
 assert.deepEqual(Text.afterStep(state,{dt:1/60}),{events:[],deadPlayerIds:[],solids:[],hazards:[]});
});

test('the module advertises the interface the stage runtime expects',()=>{
 assert.deepEqual(Text.supportedTypes,['Text']);
 for(const fn of ['compile','create','solids','beforeStep','afterStep'])
  assert.equal(typeof Text[fn],'function',fn);
 assert.equal(Text.completePhysicsFidelity,false);
 assert.equal(Text.nativeConstants.actorTypeOrdinal,79);
 assert.equal(Text.nativeConstants.eventTextExit,62);
 assert.equal(Text.nativeConstants.readSlots,9);
 assert.equal(Text.nativeConstants.fpScale,65536);
 // TextComponent declares no OnRecvEvent, so the module must not offer a
 // signal entry point that would imply a Text can be switched.
 assert.equal(Text.signal,undefined);
});
