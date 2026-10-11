'use strict';
// Input-only replay check for play/whole-route-input-replay.json.
// Every round is replayed REPEAT times from a fresh R.create(play/data/...), fed
// nothing but the recorded per-tick inputs. Each run hashes a per-tick snapshot
// (tick, status, every player's position/velocity/contact, switch and relay
// state, key, device timers) so two runs only match if they agree on every tick.
//
//   node whole-route-replay.cjs        # writes play/whole-route-replay-report.json
//   node whole-route-replay.cjs --check  # no write, exit 1 on any failure
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('./source-stage-runtime.js');
const DIR=__dirname,PLAY=path.join(DIR,'play');
const REPLAY=path.join(PLAY,'whole-route-input-replay.json'),REPORT=path.join(PLAY,'whole-route-replay-report.json');
const REPEAT=Number(process.env.REPLAY_REPEAT||5);
const json=v=>JSON.stringify(v,(k,x)=>typeof x==='bigint'?'0x'+x.toString(16):x);
const r6=x=>typeof x==='number'?+x.toFixed(6):x;

function snapshot(s){
 return json([s.ticks,s.status,s.keyTaken,s.keyActive,s.deaths,
  s.players.map(p=>[p.id,r6(p.x),r6(p.y),r6(p.vx),r6(p.vy),p.grounded,p.supportId,p.jumpFrame,p.exit]),
  (s.map.switches||[]).map(b=>[b.id,b.pressed,r6(b.remaining)]),
  s.relayState.relays.map(r=>[r.id,r.pressed,r.latched,r.phase,r6(r.remaining)]),
  (s.deviceState.devices||[]).map(d=>[d.id,r6(d.x),r6(d.y),d.phase,d.active]),
  s.switchTimerState,s.thornCeilingState&&s.thornCeilingState.rng,s.thornCeilingState&&s.thornCeilingState.ceilings.map(c=>[c.phase,c.timerFp,c.hitPoint])]);
}
function replayOnce(round){
 const compiled=JSON.parse(fs.readFileSync(path.join(PLAY,'data',round.stage,round.count+'.json'),'utf8'));
 const s=R.create(compiled),hash=crypto.createHash('sha256');
 let fed=0,stoppedEarly=false;
 for(const c of round.commands){
  for(let f=0;f<c.frames;f++){
   if(s.status!=='play'){stoppedEarly=true;break;}
   R.step(s,c.inputs);fed++;hash.update(snapshot(s));
  }
  if(stoppedEarly)break;
 }
 const recorded=round.commands.reduce((n,c)=>n+c.frames,0);
 return {status:s.status,ticks:s.ticks,seconds:+(s.ticks/60).toFixed(3),deaths:s.deaths,failure:s.failure,keyTaken:s.keyTaken,
  exited:s.players.filter(p=>p.exit).length,players:s.players.length,inputsFed:fed,inputsRecorded:recorded,
  unusedInputs:recorded-fed,perTickDigest:hash.digest('hex'),finalStateDigest:crypto.createHash('sha256').update(json(s)).digest('hex'),
  terminalPlayers:s.players.map(p=>({id:p.id,x:r6(p.x),y:r6(p.y),exit:p.exit}))};
}
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}

function main(){
 const data=JSON.parse(fs.readFileSync(REPLAY,'utf8'));
 const rounds=data.rounds||[{stage:data.stage||'st_w_01_01',count:data.count,commands:data.commands}];
 const results=[];
 for(const round of rounds){
  if(!round.commands||!round.commands.length){results.push({stage:round.stage,count:round.count,cleared:false,reproducible:null,blocked:round.blocked||null,note:round.error||'no recording'});continue;}
  const runs=[];for(let i=0;i<REPEAT;i++)runs.push(replayOnce(round));
  const a=runs[0],same=runs.every(r=>r.perTickDigest===a.perTickDigest&&r.finalStateDigest===a.finalStateDigest);
  results.push({stage:round.stage,count:round.count,cleared:a.status==='clear'&&a.exited===a.players,status:a.status,ticks:a.ticks,seconds:a.seconds,
   deaths:a.deaths,failure:a.failure,keyTaken:a.keyTaken,exited:a.exited,unusedInputs:a.unusedInputs,
   reproducible:same,replays:runs.length,perTickDigest:a.perTickDigest,finalStateDigest:a.finalStateDigest,
   matchesRecording:round.ticks===a.ticks&&round.status===a.status,
   blocked:round.blocked||null,terminalPlayers:a.status==='clear'?undefined:a.terminalPlayers});
 }
 // The browser loads play/*.js; the replay above runs the root copies. They
 // must be byte-identical for this evidence to describe the live build.
 const modules=fs.readdirSync(PLAY).filter(f=>f.endsWith('.js')&&fs.existsSync(path.join(DIR,f)));
 const moduleParity=modules.map(f=>({file:f,identical:sha(path.join(DIR,f))===sha(path.join(PLAY,f))}));
 const allClear=results.every(r=>r.cleared&&r.reproducible);
 return {data,results,moduleParity,allClear};
}
module.exports={replayOnce,snapshot,main};
if(require.main===module){
 const {data,results,moduleParity,allClear}=main();
 for(const r of results)console.log(r.stage,r.cleared?'CLEAR':'----',r.ticks??'',r.seconds??'','deaths',r.deaths??'','repro',r.reproducible);
 if(process.argv.includes('--check')){process.exit(allClear?0:1);}
 const prev=fs.existsSync(REPORT)?JSON.parse(fs.readFileSync(REPORT,'utf8')):{};
 const report={schemaVersion:1,generatedAt:new Date().toISOString(),
  scope:'2편 연결 10라운드 8인 입력 전용 재생. 새 R.create 상태에 녹화된 틱별 입력만 넣는다(위치 지정·상태 수정 없음).',
  replayFile:'play/whole-route-input-replay.json',recordedAt:data.recordedAt||null,
  runtimeSha256:sha(path.join(DIR,'source-stage-runtime.js')),recordedRuntimeSha256:data.runtimeSha256||null,
  method:{repeats:REPEAT,perTick:'매 틱 스냅샷(틱·상태·플레이어 x/y/vx/vy/접지/지지대/점프프레임/입장·스위치·릴레이·장치·타이머·가시천장 난수 상태)을 sha256에 누적. 모든 반복의 누적 해시와 최종 상태 해시가 같아야 재현으로 판정.',
   dt:'R.step 기본 dt=1/60 → 호출당 1틱. play.js 검수 재생도 같은 h=1/60으로 1틱씩 진행.'},
  randomness:prev.randomness||null,
  moduleParity,
  allRoundsInputOnlyClear:allClear,
  rounds:results.map(r=>({...r,...((prev.rounds||[]).find(x=>x.stage===r.stage)?.notes?{notes:(prev.rounds||[]).find(x=>x.stage===r.stage).notes}:{})}))};
 fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
 console.log('allRoundsInputOnlyClear',allClear);
}
