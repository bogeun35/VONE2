'use strict';
// Generates one Codex brief per device group into reference-analysis/codex-briefs/.
//
//   node reference-analysis/tools/make-codex-briefs.cjs
//
// Every actor type belongs to exactly ONE brief, so several Codex sessions can run
// at the same time without two of them writing the same device. The shared rules
// live in reference-analysis/AGENTS.md, which Codex loads by itself; a brief only
// carries what is specific to its task. Addresses and stage counts are computed
// from the repository's own indexes, not typed by hand.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mig=path.join(root,'source-migration');
const out=path.join(root,'codex-briefs');
const pop=require(path.join(mig,'population-rules.cjs'));
const index=JSON.parse(fs.readFileSync(path.join(mig,'quantum-method-index.json'),'utf8'));
const delegates=JSON.parse(fs.readFileSync(path.join(mig,'creator-delegates-resolved.local.json'),'utf8'));
const work=JSON.parse(fs.readFileSync(path.join(mig,'remaining-work.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(mig,'installed-stage-decoded.local.json'),'utf8'));
const EMPTY_STUB='0x180476130'; // a bare `ret`, shared by every no-op override

// Types Claude keeps for itself: they extend modules that already exist.
const RESERVED=['Gear','SwitchTargetGroup','WeightedLift','WeightedLiftSingle'];

const BRIEFS=[
 {id:'13-04-fake',slug:'fake',types:['FakePlayer','FakeTimer'],notes:[
  'st_w_13_04 authors NO `Player` actors at all - 24 `FakePlayer`, one `FakeTimer`, a Key and a Goal. First answer, with addresses: where do the real players come from in this stage, and what is a FakePlayer to the simulation (a decoy that moves, a body that blocks, something the party must find among look-alikes)? Do this before writing code.',
  'The helper structs `FakeTimer_FakePlayerInfo`, `FakeTimer_History` and `FakeTimer_TrendInfo` are in quantum-field-offsets.json; their names suggest the timer records what the fakes did.']},
 {id:'13-03-rally',slug:'rally',types:['RallyController','RallyMallet'],notes:[
  'st_w_13_03 ships SEVEN stage variants (needPlayerCount 8, 7, 6, 5, 4, 3 and 0), so every player count gets its own layout. Test every count 2..8, not just one.',
  'RallyController.OnUpdate is the empty stub; its logic is in OnPost and OnRecvEvent.']},
 {id:'12-04-movewall-speedswitch',slug:'movewall',types:['MoveWall','SpeedSwitch'],notes:[
  'Opens st_w_12_04 on its own. SpeedSwitch is also one of the two missing pieces of st_w_12_03 (with Wind), and MoveWall appears in st_w_02_04.',
  'MoveWall has an InitCollision, so it is probably a solid - say whether it pushes players and what happens to a player caught between it and terrain. SpeedSwitch has OnCollided and OnRecvEvent: find what "speed" it changes and on whom.']},
 {id:'11-02-floatingthorn-poleladder',slug:'pole',types:['FloatingThorn','PoleLadder'],notes:[
  'Opens st_w_11_02 on its own (36 FloatingThorns and one PoleLadder). FloatingThorn is also in st_w_07_04.',
  'FloatingThornComponent has TWO Creators in the index - find which actor type each one serves before assuming they are the same.',
  'PoleLadder very likely changes how a player moves (climbing). The module cannot edit the player runtime: expose exactly what the runtime must do in an `integration` export, the way source-landmine-devices.js exposes `p.inputLocked`.']},
 {id:'14-03-dossun-blockgun',slug:'dossun',types:['Dossun','PlayerBlockGun'],notes:[
  'Opens st_w_14_03 on its own. PlayerBlockGun is also in st_w_14_01 (with BreakableRect and Text).',
  'Dossun is the crushing block. Establish how it decides to fall, its speeds, and whether it kills on contact or only when crushing against terrain.',
  'PlayerBlockGun is one per player (8 actors): it is probably equipment. If it changes player input or spawns blocks, describe the runtime hook in `integration`.']},
 {id:'12-01-gokart-stick',slug:'gokart',types:['GoKart','Stick'],notes:[
  'Opens st_w_12_01 on its own. Note that Stick does not appear at 2 players - check which counts author it.',
  'StickComponent.ParseParameter is at the SAME address as FakePlayerComponent.ParseParameter (0x1816f93b0): a shared body. Read what it actually stores before assuming Stick has parameters of its own.',
  'GoKart is likely ridden by players. Describe the runtime hook in `integration`; do not edit the runtime.']},
 {id:'03-02-damagerect-linepathlift',slug:'linepath',types:['DamageRect','LinePathLift'],notes:[
  'Opens st_w_03_02 on its own. LinePathLift is also in st_w_02_04 and st_w_03_03; DamageRect in st_w_03_03 and st_w_06_02.',
  'KNOWN OBSTACLE: st_w_03_02\'s LinePathLift authors datas[4] = 2.3335, which is not an exact multiple of 1/65536. The project currently refuses such slots because nobody has established how the stage loader turns an authored float into an FP raw (truncate? round? via float32 or double?). Find the loader path that converts a `t == 1` parameter into the qword ParseParameter reads at `[entry + 0x18]`, and settle it with addresses. This unblocks several other actors project-wide, so it is worth the time even if the module itself ends up partial.',
  'LinePathLiftComponent.ParseParameter uses Frame.GetPlayerIndexCount, so the path or speed probably scales with the party size.']},
 {id:'blackout',slug:'blackout',types:['Blackout','BlackoutController'],notes:[
  'Blocks five stages: st_w_03_01, st_w_07_03, st_w_09_01, st_w_09_03, st_w_15_02. Opens none alone, but st_w_07_03 needs only this plus WeightedLift (which Claude is doing).',
  'The central question, answered with addresses: does Blackout touch the SIMULATION (collision, death, input, events) or only what is visible? If it is visibility only, the module should expose the darkness state for the renderer and must not block the stage.',
  'BlackoutController authors QPlayerCountParam strings in datas[0] and datas[1] - the grammar is documented in source-landmine-devices.js and source-countup-devices.js.']},
 {id:'08-02-throwball',slug:'throwball',types:['CannonPlayer','ThrowBallBasket','ThrowBallController'],notes:[
  'These three are ALL that st_w_08_02 and st_w_08_04 lack, so this one brief opens two rounds.',
  'CannonPlayer is a player variant. Establish whether it replaces the normal player for some party members, and describe the runtime hook in `integration`.']},
 {id:'08-01-apple',slug:'apple',types:['TargetPlayer','BasketPlayer','AppleController','Apple'],notes:[
  'These four are ALL that st_w_08_01 and st_w_08_03 lack, so this one brief opens two rounds.',
  'TargetPlayer and BasketPlayer look like player roles. Establish how roles are assigned (by player index? by lottery through the seeded RNG?) and describe the runtime hook in `integration`.']},
 {id:'coin',slug:'coin',types:['Coin','CoinObserver'],notes:[
  'Part of st_w_05_01 (which also needs WeightedLift) and st_w_05_03 (which also needs PlayerMagnet). Opens nothing alone, but both rounds are close.',
  'Find what the observer counts, against what threshold (and whether it scales with the party), and what it notifies on success.']},
 {id:'checkpoint',slug:'checkpoint',types:['CheckPoint'],notes:[
  'Appears in four stages: st_w_03_01, st_w_07_04, st_w_15_01, st_w_15_02. Reused a lot, so precision matters.',
  'The port currently restarts the whole round on any death (source-stage-runtime.js `status: dead`). A checkpoint changes WHERE the party respawns. Establish exactly what is saved (position per player? one shared point?), when it activates, and describe the runtime hook in `integration` - do not edit the restart logic yourself.']},
 {id:'wind',slug:'wind',types:['Wind'],notes:[
  'Appears in four stages: st_w_02_04, st_w_07_01, st_w_09_04, st_w_12_03. st_w_12_03 needs only this plus SpeedSwitch.',
  'WindComponent.ForTopView exists (0x1816b9080). Top-view stages are not ported yet and `StageComponent.IsTopViewSort` was never found being set (see switch-direction-report.json). Implement the side-view behaviour and refuse the top-view path rather than guess it.',
  'Wind pushes players, so it changes velocity. Express that as a force the runtime applies, through `integration`.']},
 {id:'player-magnet',slug:'magnet',types:['PlayerMagnet'],notes:[
  'Appears in st_w_03_03, st_w_03_04 and st_w_05_03.',
  'It acts on players, so describe the runtime hook (a velocity or a position change per tick) in `integration`.']},
 {id:'touch-energy',slug:'touchenergy',types:['TouchEnergy'],notes:[
  'Appears in st_w_02_02 and st_w_02_04.',
  'Find what "energy" is charged by touching, by whom, and what it notifies when full.']},
 {id:'text-report',slug:'text',types:['Text'],finishExisting:true,notes:[
  'Text is the most common blocker (ten stages) but opens no round on its own.',
  'A module already exists: source-migration/source-text-devices.js with source-text-devices.test.cjs (17 tests, passing). It has NO report and was never registered. For THIS task only, you may edit those two files.',
  'Your job: verify every claim in the module header against the binary with tools/disasm.py, correct what is wrong (recording the correction), then write text-device-report.json in the same shape as landmine-device-report.json. The key question for the report: does Text affect the simulation at all, or is it display only?']},
];

function componentOf(type){
 const d=delegates.find(e=>e.actorType===type);
 return d?{ordinal:d.ordinal,component:d.creator.split('.')[0],creator:d.creator}:null;
}
function methodsOf(component){
 return index.filter(r=>r.type===component&&r.fileOffset)
  .map(r=>({method:r.method,va:r.va}));
}
function stageCounts(stageId,type){
 const st=(source.stages||source).find(s=>(s.id||s.stageId)===stageId);
 if(!st)return '';
 const at=c=>{const v=pop.selectVariant(st.json.stageInitParamList,c,true);
  return v?pop.actorsForCount(v,c).filter(a=>a.typeName===type).length:0;};
 const counts=[2,3,4,5,6,7,8].map(at);
 return counts.every(n=>n===counts[0])?String(counts[0]):'2..8: '+counts.join('/');
}

const owned=new Map();
for(const b of BRIEFS)for(const t of b.types){
 if(owned.has(t))throw new Error(t+' is in two briefs');
 if(RESERVED.includes(t))throw new Error(t+' is reserved for Claude');
 owned.set(t,b.id);
}
const allTypes=new Set([...owned.keys(),...RESERVED]);
const open=work.stages.filter(s=>!s.connected);

fs.mkdirSync(out,{recursive:true});
const rows=[];
BRIEFS.forEach((b,i)=>{
 const n=String(i+1).padStart(2,'0');
 const file=n+'-'+b.id+'.md';
 const mine=new Set(b.types);
 const stages=[...new Set(b.types.flatMap(t=>(work.byType.find(x=>x.type===t)||{stages:[]}).stages))].sort();
 const alone=open.filter(s=>s.distinctBlockers.length&&s.distinctBlockers.every(t=>mine.has(t))).map(s=>s.id);
 const together=open.filter(s=>!alone.includes(s.id)&&s.distinctBlockers.some(t=>mine.has(t))&&s.distinctBlockers.every(t=>allTypes.has(t))).map(s=>s.id);
 const lines=[];
 lines.push('# Codex 작업 '+n+': '+b.types.join(' + '));
 lines.push('');
 lines.push('The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief');
 lines.push('only adds what is specific to this task.');
 lines.push('');
 lines.push('## Deliverables');
 lines.push('');
 if(b.finishExisting){
  lines.push('- edit `source-migration/source-'+b.slug+'-devices.js` and `source-migration/source-'+b.slug+'-devices.test.cjs` (this task only)');
 }else{
  lines.push('- `source-migration/source-'+b.slug+'-devices.js` (supportedTypes: '+b.types.map(t=>"'"+t+"'").join(', ')+')');
  lines.push('- `source-migration/source-'+b.slug+'-devices.test.cjs`');
 }
 lines.push('- `source-migration/'+b.slug+'-device-report.json`');
 lines.push('- `codex-briefs/'+n+'-'+b.id+'.result.md` when you stop (format in AGENTS.md)');
 lines.push('');
 lines.push('## Why it matters');
 lines.push('');
 lines.push('- stages that use these types: '+stages.map(s=>'`'+s+'`').join(', '));
 lines.push('- opens on its own: '+(alone.length?alone.map(s=>'`'+s+'`').join(', '):'none'));
 if(together.length)lines.push('- opens together with the other briefs: '+together.map(s=>'`'+s+'`').join(', '));
 lines.push('');
 lines.push('## Task-specific notes');
 lines.push('');
 for(const note of b.notes)lines.push('- '+note);
 lines.push('');
 lines.push('## Starting addresses');
 lines.push('');
 lines.push('`'+EMPTY_STUB+'` is a bare `ret` shared by every no-op override; a method at that');
 lines.push('address does nothing.');
 for(const t of b.types){
  const c=componentOf(t);
  lines.push('');
  if(!c){lines.push('### '+t+' — not in creator-delegates-resolved.local.json; find its creator first');continue;}
  lines.push('### '+t+' → '+c.component+' (creator ordinal '+c.ordinal+')');
  lines.push('');
  lines.push('```');
  for(const m of methodsOf(c.component))
   lines.push(m.method.padEnd(28)+m.va+(m.va===EMPTY_STUB?'  (empty)':''));
  lines.push('```');
  const per=stages.map(s=>{const v=stageCounts(s,t);return v&&v!=='0'?s+' ×'+v:null;}).filter(Boolean);
  if(per.length)lines.push('instances: '+per.join(', '));
 }
 lines.push('');
 fs.writeFileSync(path.join(out,file),lines.join('\n'),'utf8');
 rows.push({n,file,types:b.types,alone,together});
});

// The board Claude keeps. Codex only reads it.
const board=['# Codex 작업 목록','',
 '세션 하나에 파일 하나. 각 Codex 세션에 아래 표의 지시문 한 줄을 그대로 붙여넣으면 됩니다.',
 '같은 장치를 두 파일이 나눠 갖지 않으므로 전부 동시에 돌려도 서로 겹치지 않습니다.',
 '끝난 작업은 `NN-작업.result.md` 가 생깁니다. 검토·등록·배포·커밋은 Claude 가 합니다.','',
 '| # | 장치 | 혼자 여는 라운드 | Codex 에 붙여넣을 지시 |','|---|---|---|---|'];
for(const r of rows)board.push('| '+r.n+' | '+r.types.join(', ')+' | '+(r.alone.length?r.alone.join(', '):'-')+
 ' | `codex-briefs/'+r.file+' 작업을 해줘` |');
board.push('','Claude 가 직접 하는 것(Codex 에 주지 말 것): '+RESERVED.join(', ')+'.','');
board.push('작업 폴더는 `C:\\Users\\user\\projects\\VONE2\\reference-analysis` 로 열어 주세요 — 그래야 Codex 가');
board.push('`AGENTS.md` 를 자동으로 읽습니다.','');
fs.writeFileSync(path.join(out,'QUEUE.md'),board.join('\n'),'utf8');
console.log(JSON.stringify({briefs:rows.length,files:rows.map(r=>r.file),
 opensAlone:[...new Set(rows.flatMap(r=>r.alone))].sort(),
 opensTogether:[...new Set(rows.flatMap(r=>r.together))].sort()}));
