# ThunderMotion — result
status: done (private phase/이동/반복/소멸/receiver 복원, Base/common host 필수)
files: source-migration/source-thunder-motion.js, source-migration/source-thunder-motion.test.cjs, source-migration/thunder-motion-report.json, codex-briefs/ThunderMotion.result.md, codex-briefs/작업중-ThunderMotion.md
tests: 전용74/74, 전체2294/2294 통과. DLL bytes의6-entry jump table/call/tailjump/phase inc·dec/cache/raw4/ExitScene 명령 대조. 원작 실행 없음.

what it is: Thunder.OnUpdate18172c8f0의 private 이동·반복 대기·소멸 fade 및 event61/53 처리를 제공한다. actor.thunder(Base)/actor.thunderState(motion) 분리를 그대로 사용한다. 기존 factory/bridge/Base 모듈은 수정하지 않았다.

stage compiles alone: 아니오. 실제3-2/10-4 2..8인 offline/online28건은 모두 이동·소멸 파라미터0인 정지 경로이며, 실제 frozen Base.update가 계속 실행됨을 검증했다. 명시적 변형 상태로 이동·반복·재진입 경계를 추가했고 실제4-1 이동/11-4 소멸 파라미터도 검증했다. wall-map/컴포넌트 host fixture이며 전체 stageboot·충돌·플레이 일치 검증이 아니다.

key findings:
- OnUpdate18172c8f0: Base resolve→Base flag3이 없을 때 disappear clock→updatePhase→**마지막에 항상 Base.update**(ca66). pretendPause는 private timer/phase만 정지시키고 Base beam/probe update는 계속 호출한다. Actor hidden gate는 Base 내부이며 Thunder 이동 자체를 추가로 막지 않는다.
- phase jump table18172d018:0 return,1 prepare,2 move,3 wait/reverse,4 disappear-init,5 fade. signed negative/>5 default return.1→2,3→2,4→5는 **같은 호출에서 즉시 재분기**한다.
- 이동은 **dt를 곱하지 않는 private vector/Update**. phase1에서 speed=Length,거리0. phase2는 Base cache bit2 clear→남은거리abs(target-distance)<=speed면 정확 normalize×remaining으로 local clip→Actor.Pos+=localVector→distance+=speed. Actor.Velo/PrePos는 건드리지 않으며 마지막 clip도 private velocity를 덮지 않는다(18172cd82..cf3b).
- frozen source-distanceconstraint-math의 정확한 native Length/normalize LUT 재사용. diagonal(3F,4F),목표2F의 실제 clip=(78642,104856),float sqrt 사용 안 함.
- repeat bit0이면 끝점에서 timer1초·phase3 후 return. wait<=0일 때 private vector×-1,Length 재계산,거리0,phase2로 즉시 이동. dt1092이면60 wait calls 후16raw,61번째 반전·이동.
- disappear phase<4 &&abs(time)>=**4raw**일 때 timer+=dt,>=live time이면 phase4. phase4 collision(false,self EntityRef)→timer65536→phase5즉시실행. fade는 timer-=dt×262144(FP4).15회 뒤16raw/alpha16,16번째 ExitScene bit13·phase6. **종료 시 alpha0을 쓰거나 여기서 entity destroy하지 않는다.**
- event61(18172d120): phase0+switchbit0이면 저장 phase 복원(lastPhase0) 또는1 시작; phase1..3+switchbit1이면 저장하고0 정지. 타이머/속도/거리/cache reset 없음. switch 정지0에서도 disappear 시간은 계속 간다.
- event53은 Base receiver18172af10에서 Base pretendPause bit3을 먼저 쓰고 `SetEnableAnimation(!IsPause,NotifiedActor)`만 호출한다. **Actor 공통 pause53로 보내지 않는다**. foreign animation owner가 거부해도 Base bit는 바뀐다. 다른 이벤트는 exact Actor receiver host 반환값을 전달한다. incoming pool event release는 호출자 소유.

실제 추가 파라미터 근거:
- 4-1 Thunder4개: `[3,0,0,1,0,0.3,280,0,0]`. signal61 시작 후 privateY19660raw지만 Length19658raw.934번째에 distance280F 도달하나 위치 증분은18351946raw로280F보다1866raw 크다. 원작 누적 차이를 임의 snap/보정하지 않았다.
- 11-4는 variant마다 Thunder1개(기본Thunder1/5인이상Thunder2), 소멸20초. dt1092 기준1200회 timer1310400,1201회1311492로fade시작(alpha61168),1216회 ExitScene(alpha16).

API: `create(explicitMotionSnapshot)`, `onUpdate(world,actor,host)`, `updateDisappear`, `updatePhase`, `onRecvEvent`, browser global `SourceThunderMotion`. `onUpdate`에 disappear가 이미 포함되므로 standalone updateDisappear를 추가 호출하면 원작보다 중복 누적된다. create는 기존 Creator/Parse/InitPost를 대체하지 않는다.

필수 host:
- `getThunderBase(world,motion.entityId)` 실제 component pointer
- `getDeltaTime(world)` 실제 FP raw, 도달한 timer 분기에서만 호출
- `baseUpdate(world,actor,base)` 기존 Thunder native Base.update
- `setCollisionActive(world,actor,false,actor.entityId)` 기존 all-holder owner 동작
- `setEnableAnimation(world,actor,enabled,NotifiedActor)` 기존 animation owner 동작
- `actorOnRecvEvent(world,actor,event)->int32` exact 공통 receiver
도달한 누락·비동기는 명시 throw. 각 callback 전/후 native 부분 쓰기·captured pointer·live phase 의미 보존. 테스트 host는 기존 Base/ActorMotion/ActorLifecycle을 재사용했다.

unresolved: nonThrough shorten/실제 contacts/event26 registry·Actor 공통 sync·ExitScene 제거/destruction·alpha rendering은 상위 실제 host 필요. 안전한 Number 범위 밖 raw/overflow sqrt는 명시 거부. 실제 moving/fullstage bridge 연결은 리드 소유이며 이 helper가 수행하지 않는다.

다음 통합 경계: bridge의 moving/disappear Thunder host를 이 onUpdate/receiver로 연결하고 기존 Base.update/ActorMotion/collision/animation/common event host를 공급. 이후 common Actor motion/Scene exit 흐름과 실제 contact-shortening 경계를 독립 검증한다.

동결: 기존 source-thunder-native.js/factory/bridge/runtime/play/HANDOFF/Git 수정 없음. 신규5파일만 작성.
