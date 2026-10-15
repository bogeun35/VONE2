# PlayerStateDispatch — result
status: done (共通 dispatcher/prelude 완료, 실제 상태 본문은 명시 host 요구, 신규 소유 파일 동결)
files: source-migration/source-player-state-dispatch.js, source-player-state-dispatch.test.cjs, player-state-dispatch-report.json, 이 결과 노트, 작업중-PlayerStateDispatch.md

tests: 전용29/29 통과. 전체 `node --test source-migration/*.test.cjs` 1,416/1,416 통과. 실제3-2·10-4 각각2..8인 오프라인/온라인28개 선택의 초기0→1 진입과 frozen Default body 연계를 검증했습니다. 원작 실행/네이티브 대조는 하지 않았습니다.

what it is: Player.OnUpdate0x1816c0010의 Default 바깥 공통 제어를 복원했습니다. invincibleProc→요청 상태 전환→상태별 Update→pushBackRaw 초기화 순서를 보존하고, native OnInitialize_Default의 애니메이션 필드 변경도 구현했습니다. Default body로 전체 Player.OnUpdate를 대체하지 않습니다.

stage compiles alone: 실제 초기 경계 검증이며 전체 typedScene/stage 실행 주장이 아닙니다. Scene/ActorMotion phase와 각 상태 본문은 리드가 연결해야 합니다. `supportedTypes=[]`, `completePhysicsFidelity=false`입니다.

## 순서 및 전환 근거

- OnUpdate0x1816c0065에서 Player bit28이면 battlePlaneDamageProc0x1816c00f0 호출. 이 본문은 미검증이므로 helper는 **타이머 변경 전 명시 거부**합니다. bit28을 무시하지 않습니다.
- 항상 invincibleProc0x1816c06c0(호출0x1816c00ae), updatePlayerState0x1816c07c0(0x1816c00c8), 마지막 **Player+0xa8 pushBack vector=0**(0x1816c00d5). Default의 warp/suppressed 내부 return도 정상 복귀이므로 부모 tail은 실행됩니다. callback 예외에서는 tail을 실행하지 않습니다.
- invincibleTimer(+68)가 **0이 아니면** signed64 dt 차감(0x1816c0731..758). 음수도 포함합니다. 결과<=0이면 SetInvincible(false)0x1816bfe20 경유로 invincibleTimer=0/isFlashing=0/flashTimer=0(0x1816bfe90..feb0). timer가 원래0이면 flash 필드는 그대로입니다. Player.flags 비트를 대신 켜거나 끄지 않습니다.
- goal-enter bit16(0x1816c0828)은 request가0이고 current가 **1·6·7·9·10**일 때만 native IsPressInput(enum4)를 검사(0x1816c0873)하여 **Clear 상태5**를 요청(0x1816c0891)합니다. 기존 request가 우선입니다. 대상 상태/입력 결과와 무관하게 bit16은 소비됩니다(0x1816c08b1).
- request!=0이면 **현재 상태와 같아도** finalize합니다(0x1816c08bf). finalize 뒤 request를 다시 읽어 initialize 대상을 고릅니다(0x1816c09f2). initialize 종료 뒤 request를 다시 읽어 current에 복사하고 request=0(0x1816c0bba..bc1). 이 동안 OnEnter는 아직 old current state를 관찰합니다.
- initializeOnly=true는 **전환이 있었을 때만** Update를 건너뜁니다(0x1816c0bc5). request가0이면 initializeOnly=true여도 current Update를 호출합니다. Update 안에서 새로 생긴 request는 다음 호출까지 보류합니다.

## 실제 분기표

DLL의12개 int32 분기표를 직접 읽었습니다. finalize0x1816c0d40, initialize0x1816c0d70, update0x1816c0da0이며 raw targets는 report.jumpTables에 보존했습니다.

| State | Finalize | Initialize | Update |
|---|---|---|---|
| 0 Initial | 없음 | 없음 | 없음 |
| 1 Default | 없음 | built-in 0x1816c2f70 | host 0x1816c3060 |
| 2 Faint | host7440 | host7250 | host74d0 |
| 3 Dead | 없음 | host2ad0 | host2c20 |
| 4 이름 미주장 | 없음 | 없음 | 없음 |
| 5 Clear | host2750 | host2690 | 없음 |
| 6 Plane | 없음 | host81c0 | host8400 |
| 7 BattlePlane | 없음 | host1cf0 | host1d80 |
| 8 Target | 없음 | host9c40 | 없음 |
| 9 TopView | host9ed0 | host9d20 | host9f60 |
| 10 PoleLadder | host9550 | host9380 | host95b0 |
| 11 GoKart | host78a0 | host77f0 | 없음 |
| 12 Graph | host7ad0 | host7a70 | host7b30 |

표의 짧은 주소는 모두0x1816c 접두사입니다. “없음”은 원작 표에서 확인된 callback 없음이며 미확정 본문을 no-op으로 대체한 것이 아닙니다. 실제 callback 항목은 함수가 빠지면 이름과 전체 native VA를 포함해 throw합니다. 범위 밖13..255는 명시 거부합니다.

## 초기·Clear·Dead 경계

- 원작 Player.Initialize0x1816bd5db는 current0/request1(word0100)을 둡니다. native OnInitialize_Default0x1816c2ff1/3046는 Player.currentAnimationId=1, Actor.requestAnimationId=1, Player bit14이면 요청10입니다. playing ID는 건드리지 않습니다. 이 초기화 뒤 state1을 commit하고 같은 tick의 Default body를 실행합니다.
- Clear Initialize0x1816c2690: native **subState(+0xf)**=0, Actor velocity=0, Player.entityRef를 owner로 Actor.SetVisible(false), Actor.ClearCollisionContactInfo. current state와 subState를 혼동하면 안 됩니다. Clear Finalize0x1816c2750는 같은 owner로 SetVisible(true)입니다. 전체 함수는 host callback 요구입니다.
- Dead Initialize0x1816c2ad0: Player bit9 set, subState0, waitTimer(+80)=0, flags2 bit1 clear, 실제 GamePlayerInfoList의 첫 `playerId == signedPlayerIndex+1` 항목에 flag1을 설정합니다. 명부를 만들어 넣지 않습니다.
- Dead Update0x1816c2c20는 subState0에서 정렬/velocity0/collision비활성/animation7 및 waitTimer raw65536을 설정하고, subState1에서 dt를 차감해 만료 시 Actor vy=-589824(-9FP), 다음 subState로 갑니다. 이후 gravity/map threshold/pause/request4/Stage.CountGameOver와 stage flags까지 포함하므로 **함수 전체의 정확한 host 구현이 필수**입니다. 이 helper에서 타이머 일부만 흉내 내지 않았습니다.
- Clear state5의 Update가 없더라도 별도 Player.OnPost는 OnPost_Clear0x1816c2800을 호출합니다. 이 helper는 전체 Post dispatcher를 대체하지 않습니다.

## 호스트 계약

```js
SourcePlayerStateDispatch.onUpdate(world, canonicalActor, actualDtRaw, {
  isPressInput: (world, actor, enum4) => actualNativePressed,
  OnUpdate_Default: (world, actor, meta) => runExistingDefaultBodyInPlace(world, actor),
  OnInitialize_Dead: (world, actor, meta) => exactDeadInitialize(world, actor),
  OnUpdate_Dead: (world, actor, meta) => exactDeadUpdate(world, actor),
  // 해당 상태 진입/이탈에 필요한 native 이름의 callback만 추가
});
```

canonical Actor27의 player에는 `{state,requestedPlayerState,flags,invincibleTimerRaw,isFlashing,flashTimerRaw,pushBackRaw}` 등 **실제 필드**를 전달합니다. callback은 동기이며 native 이름/VA metadata를 받습니다. bridge.storeSnapshot처럼 actor.player 객체를 교체해도 각 callback 이후 최신 canonical 객체를 다시 읽어 request commit/tail clear를 반영합니다.

입력4는 기존 native Button counter와 wake/enable gate를 통해 읽어야 합니다. 일반 Boolean 변환은 이 helper가 맡지 않았습니다. Update/Finalize/Initialize 콜백은 전체 함수를 수행해야 하며 no-op 함수를 넣어 “지원”으로 세면 안 됩니다. 예외 시 일부 world가 바뀔 수 있어 transaction clone을 폐기해야 합니다.

unresolved: battlePlaneDamage flag28, 실제 Dead/Clear/특수 상태 본문, goal-enter bit16 생성기, GamePlayerInfo/StageGameOver/접촉·visibility owner 효과, 전체 Post 및 Scene 연결은 호스트 요구사항입니다. 기존 Default/Effects/bridge/runtime/play/Git 파일은 수정하지 않았으며 신규 다섯 소유 파일만 작성·동결했습니다.
