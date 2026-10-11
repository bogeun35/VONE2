'use strict';
// Input-only replay check for play/whole-route-input-replay.json.
// Every round is replayed REPLAY_REPEAT times (default 5) from a fresh
// R.create(play/data/<stage>/8.json), fed nothing but the recorded per-tick
// inputs. Each run hashes a per-tick snapshot (tick, status, every player's
// position/velocity/contact, switch, relay, device and timer state, the
// ThornCeiling RNG) so two runs only match if they agree on every tick.
//
//   node whole-route-replay.cjs            # writes play/whole-route-replay-report.json
//   node whole-route-replay.cjs --check    # no write, exit 1 if a recorded round fails
//   node whole-route-replay.cjs --status   # also rewrites status.json functionalRoute
//                                          # (package-source-play.cjs hard-codes it)
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('./source-stage-runtime.js');
const ThornCeilings=require('./source-thorn-ceiling-devices.js');
const DIR=__dirname,PLAY=path.join(DIR,'play');
const REPLAY=path.join(PLAY,'whole-route-input-replay.json'),REPORT=path.join(PLAY,'whole-route-replay-report.json'),STATUS=path.join(PLAY,'status.json');
const REPEAT=Number(process.env.REPLAY_REPEAT||5);
const json=v=>JSON.stringify(v,(k,x)=>typeof x==='bigint'?'0x'+x.toString(16):x);
const r6=x=>typeof x==='number'?+x.toFixed(6):x;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const loadCompiled=(stage,count)=>JSON.parse(fs.readFileSync(path.join(PLAY,'data',stage,count+'.json'),'utf8'));

function snapshot(s){
 return json([s.ticks,s.status,s.keyTaken,s.keyActive,s.deaths,
  s.players.map(p=>[p.id,r6(p.x),r6(p.y),r6(p.vx),r6(p.vy),p.grounded,p.supportId,p.jumpFrame,p.exit]),
  (s.map.switches||[]).map(b=>[b.id,b.pressed,r6(b.remaining)]),
  s.relayState.relays.map(r=>[r.id,r.pressed,r.latched,r.phase,r6(r.remaining)]),
  (s.deviceState.devices||[]).map(d=>[d.id,r6(d.x),r6(d.y),d.phase,d.active]),
  s.switchTimerState,s.thornCeilingState&&s.thornCeilingState.rng,s.thornCeilingState&&s.thornCeilingState.ceilings.map(c=>[c.phase,c.timerFp,c.hitPoint])]);
}
function replayOnce(round){
 const s=R.create(loadCompiled(round.stage,round.count)),hash=crypto.createHash('sha256');
 let fed=0;
 outer:for(const c of round.commands)for(let f=0;f<c.frames;f++){
  if(s.status!=='play')break outer;
  R.step(s,c.inputs);fed++;hash.update(snapshot(s));
 }
 const recorded=round.commands.reduce((n,c)=>n+c.frames,0);
 return {status:s.status,ticks:s.ticks,seconds:+(s.ticks/60).toFixed(3),deaths:s.deaths,failure:s.failure,keyTaken:s.keyTaken,
  exited:s.players.filter(p=>p.exit).length,players:s.players.length,unusedInputs:recorded-fed,
  perTickDigest:hash.digest('hex'),finalStateDigest:crypto.createHash('sha256').update(json(s)).digest('hex'),
  terminalPlayers:s.players.map(p=>({id:p.id,x:r6(p.x),y:r6(p.y),exit:p.exit}))};
}

// ------------------------------------------------------------ fixed facts
// Randomness: checked from the sources, not assumed.
function randomness(){
 const sim=fs.readdirSync(DIR).filter(f=>/^(source-.*|spring-switch-runtime|actor-runtime|terrain-runtime)\.js$/.test(f));
 const nondeterministic=sim.filter(f=>/Math\.random|Date\.now|performance\.now|crypto\./.test(fs.readFileSync(path.join(DIR,f),'utf8')));
 const stageSrc=fs.readFileSync(path.join(DIR,'source-stage-runtime.js'),'utf8');
 const createCall=(stageSrc.match(/ThornCeilings\.create\([^;]*?\)\)/)||[''])[0];
 const seeded=/ThornCeilings\.create\(compiled\.thornCeilings\|\|ThornCeilings\.compile\(\[\],count\)\)/.test(stageSrc);
 return {simModules:sim.length,modulesUsingClockOrMathRandom:nondeterministic,
  thornCeilingRng:{algorithm:'PCG32 XSH-RR',...ThornCeilings.nativeConstants.rng,
   createCall,usesDefaultSeed:seeded,
   note:'2편 11-4 의 가시 천장만 난수를 쓴다. source-stage-runtime.js 의 create() 가 시드 옵션 없이 ThornCeilings.create 를 부르므로 기본 상태/증분으로 고정이고, play.js·online.js 도 같은 create() 를 쓴다. 시드를 바꾸려면 ThornCeilings.create(compiled,{rngState,rngIncrement}) 옵션을 넘겨야 한다.'},
  conclusion:nondeterministic.length===0&&seeded?'시뮬레이션은 입력이 같으면 결과가 같다. 고정할 시드 옵션 없이 재현된다.':'확인 필요'};
}
// 2편 5-2: a timer switch press is supposed to add timerAddSeconds (2 s);
// measure what the runtime actually does.
function timerSwitchProbe(){
 const s=R.create(loadCompiled('st_w_05_02',8)),t=s.switchTimerState.timers[0];
 let at=null;
 for(let i=0;i<900&&!at&&s.status==='play';i++){const before=t.sec;R.step(s,{p1:{left:true}});if(t.stopped||t.sec>before+0.5)at={tick:s.ticks,secBefore:+before.toFixed(3),secAfter:+t.sec.toFixed(3),stopped:t.stopped,pressed:s.map.switches.filter(b=>b.pressed).map(b=>b.name),events:s.lastRelayEvents};}
 for(let i=0;i<1200&&s.status==='play';i++)R.step(s,{});
 const relay=s.relayState.relays.find(r=>r.name==='Switch1');
 return {stage:'st_w_05_02',authoredTimerAddSeconds:relay&&relay.timerAddSeconds,firstPress:at,after1200IdleTicks:{sec:+t.sec.toFixed(3),stopped:t.stopped,status:s.status},
  finding:at&&at.stopped?'타이머 스위치를 밟으면 +'+(relay&&relay.timerAddSeconds)+'초가 아니라 DeadTimer 가 멈춘다.':'정상(시간 추가)',
  cause:'spring-switch-runtime.js 의 notify() 가 만드는 이벤트 {targetName,senderId,on,eventType:61} 에 timerAddSecond 가 없다. source-switchtimer-devices.js signal() 은 add=0 을 "정지(bit2)"로 처리한다(0x18172e34f 주석 참조).',
  impact:'현재 5-2 는 첫 타이머 스위치 이후 시간 제한이 사라진다. 녹화도 이 동작 기준이라(10529틱), 고치면 5-2 는 더 빠른 경로로 다시 녹화해야 한다.'};
}

function main(){
 const data=JSON.parse(fs.readFileSync(REPLAY,'utf8'));
 const rounds=data.rounds||[{stage:data.stage||'st_w_01_01',count:data.count,commands:data.commands}];
 const results=[];
 for(const round of rounds){
  if(!round.commands||!round.commands.length){
   results.push({stage:round.stage,count:round.count,cleared:false,status:round.status||'no-recording',reproducible:null,blocked:round.blocked||null,note:round.error||null});continue;
  }
  const runs=[];for(let i=0;i<REPEAT;i++)runs.push(replayOnce(round));
  const a=runs[0],same=runs.every(r=>r.perTickDigest===a.perTickDigest&&r.finalStateDigest===a.finalStateDigest);
  results.push({stage:round.stage,count:round.count,cleared:a.status==='clear'&&a.exited===a.players,status:a.status,ticks:a.ticks,seconds:a.seconds,
   deaths:a.deaths,failure:a.failure,keyTaken:a.keyTaken,exited:a.exited,unusedInputs:a.unusedInputs,
   reproducible:same,replays:runs.length,perTickDigest:a.perTickDigest,finalStateDigest:a.finalStateDigest,
   matchesRecording:round.ticks===a.ticks&&round.status===a.status,
   ...(a.status==='clear'?{}:{terminalPlayers:a.terminalPlayers})});
 }
 // The browser loads play/*.js; the replay above runs the root copies. They
 // must be byte-identical for this evidence to describe the live build.
 const modules=fs.readdirSync(PLAY).filter(f=>f.endsWith('.js')&&fs.existsSync(path.join(DIR,f)));
 const moduleParity=modules.map(f=>({file:f,identical:sha(path.join(DIR,f))===sha(path.join(PLAY,f))}));
 const cleared=results.filter(r=>r.cleared&&r.reproducible);
 return {data,results,moduleParity,cleared,allClear:cleared.length===results.length};
}
module.exports={replayOnce,snapshot,main,randomness,timerSwitchProbe};

if(require.main===module){
 const {data,results,moduleParity,cleared,allClear}=main();
 for(const r of results)console.log(r.stage,r.cleared?'CLEAR':r.status,r.ticks??'',r.seconds??'','deaths',r.deaths??'','repro',r.reproducible);
 // --check: every recorded round must clear on every replay; a round recorded
 // as blocked (no inputs, evidence attached) must still have that evidence.
 if(process.argv.includes('--check')){const ok=results.every(r=>r.blocked?true:r.cleared&&r.reproducible);console.log(ok?'OK':'FAIL');process.exit(ok?0:1);}
 const failed=results.filter(r=>!(r.cleared&&r.reproducible));
 const date=new Date().toISOString().slice(0,10);
 const report={schemaVersion:1,generatedAt:new Date().toISOString(),
  scope:'2편 연결 10라운드, 8인. 새 R.create 상태에 녹화된 틱별 입력만 넣는다(위치 지정·상태 수정 없음).',
  replayFile:'play/whole-route-input-replay.json',recorder:'whole-route-record.cjs',recordedAt:data.recordedAt||null,
  runtimeSha256:sha(path.join(DIR,'source-stage-runtime.js')),recordedRuntimeSha256:data.runtimeSha256||null,
  method:{repeats:REPEAT,
   perTick:'매 틱 스냅샷(틱·상태·플레이어 x/y/vx/vy/접지/지지대/점프프레임/입장·스위치·릴레이·장치·타이머·가시천장 난수 상태)을 sha256 에 누적. 모든 반복의 누적 해시와 최종 상태 해시가 같아야 재현으로 판정.',
   dt:'R.step 기본 dt=1/60 → 호출당 1틱. play.js 검수 재생(T)도 h=1/60 으로 1틱씩 같은 입력을 넣는다.'},
  summary:{rounds:results.length,clearedAndReproducible:cleared.length,notCleared:failed.map(r=>({stage:r.stage,status:r.status})),
   totalTicks:cleared.reduce((n,r)=>n+r.ticks,0),deaths:results.reduce((n,r)=>n+(r.deaths||0),0)},
  allRoundsInputOnlyClear:allClear,
  randomness:randomness(),
  moduleParity,
  bugCandidates:[
   ...results.filter(r=>r.blocked).map(r=>({stage:r.stage,kind:'클리어 불가',finding:r.blocked.reason,evidence:r.blocked})),
   timerSwitchProbe()],
  rounds:results};
 fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
 console.log('wrote',path.relative(DIR,REPORT),'allRoundsInputOnlyClear',allClear);
 if(process.argv.includes('--status')){
  const status=JSON.parse(fs.readFileSync(STATUS,'utf8'));
  status.functionalRoute.inputOnlyClearVerified=allClear;
  status.functionalRoute.inputOnlyClearNote=date+' 현재 런타임 기준 8인 재녹화: 10라운드 중 '+cleared.length+'라운드가 입력만으로 클리어되고 '+REPEAT+'회 재생 결과가 틱 단위로 같다.'+
   (failed.length?' 실패: '+failed.map(r=>r.stage+(r.blocked?'(현재 런타임에서 클리어 불가: 열쇠가 지형 안)':'('+r.status+')')).join(', ')+'.':'')+
   ' 근거 whole-route-replay-report.json, 재녹화 whole-route-record.cjs.';
  fs.writeFileSync(STATUS,JSON.stringify(status,null,2)+'\n');
  console.log('updated status.json functionalRoute');
 }
}
