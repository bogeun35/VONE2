# PlayerBootstrap — result
status: done / FROZEN (ordinary fresh Player27 helper, host integration required)
files: source-migration/source-player-bootstrap.js, source-migration/source-player-bootstrap.test.cjs, source-migration/player-bootstrap-report.json, 이 결과 및 선점. 별도 승인된 ActorInitialization report/result/header·주석 정정 포함.

tests: 전용23 passing; 전체1630 passing / 0 failing. ActorInitialization 문서 정정 후 기존16 tests도 통과. 원작 실행·Git 작업 없음.

what it is: 실제3-2·10-4의 ordinary Player.Initialize를 완전한40-field Player 상태와 Actor 초기 변경으로 조립한다. 기존 CollisionInit·StateDispatch·ActorLifecycle·ActorInitialization·Default constants·PopulationRules를 읽기 전용 재사용한다. Player.Initialize 중간 상태와 최종 상태를 분리하며, allocator/색상/PlayerIndex/shuffle은 추측하지 않는다.

stage compiles alone: no. 3-2·10-4 온/오프라인2..8인 총28조합 테스트를 통과했지만, 실제 allocator와 초기 component/singleton 상태·PlayerIndex list/GamePlayerInfo·이름·등록 결과는 host 계약이다. factory/bridge/runtime 통합 코드는 수정하지 않았다.

## 핵심 초기값과 호출 순서

| 항목 | Initialize 중간 | Initialize 완료 / Creator 반환 |
|---|---|---|
| Player current/request | **0 / 1** | **1 / 0** |
| Player currentAnimation | 0 | 1 |
| Actor request/playing animation | 전달받은 값 (fresh0/0) | **1 / 0**; playing은 다음 verified Update1에서 소비 |
| Player flags | OR bit3=8; 10-4 slot5는 추가 bit22 | 3-2:8 / 10-4:4194312 |
| life / battlePlaneHP / prevHP | 1 / **2** / 0 | 동일; life와 battlePlaneHP를 혼동하면 안 됨 |
| wakeUpCount / wakeUpInitCount | 1 / 1 | 동일 |
| earScale / preEarScale | 65536 / 65536 | 동일 |
| invincibleTimer / flashTimer / isFlashing | 0 / 0 / 0 | 동일; 생성 중 timer step 없음 |
| flags2 / native subState / inputBit | 0 / 0 / 0 | 동일 |
| Actor weight | Actor.Initialize 당시1 | Player.Initialize가 **100 (raw6553600)** 으로 변경 |
| Actor flags | fresh Actor.Initialize0x4000 | **0x105ca80**, initDir0인 actual stage 기준 |
| Actor Pos/InitPos/PrePos | fresh0 | scene 등록 전0; 등록 후 Pos/InitPos만 이동, **PrePos0 유지** |

Player.Initialize0x1816bd520은0x1816bd5db에서 current0/request1을 쓰지만,0x1816bd847에서 `updatePlayerState(initializeOnly=true)`를 tail-call한다. 기존 StateDispatch 코어가 Default Initialize → current1/request0 commit → OnUpdate 생략까지 수행한다. 따라서 current0/request1을 Player.Initialize 반환 상태로 고정하면 안 된다.

순서는 Actor.Initialize → DamageManage.Initialize → Add Player/EntityRef 설정 → Player header/color/ear/speed → parseParameter → Actor bit7 → sorting event54 → Actor bits/weight/direction → **단일 initCollision** → initializeOnly state transition → Creator ActorType27 → mutableY-=32768 → 이후 scene SetInitPos/SetBaseScale다. phases/trace에 주요 경계를 보존했다.

## Native 필드 분리

- `index`는 m_Index(+8), `playerIndex`는 m_PlayerIndex(+e), `colorIndex`는 m_ColorIndex(+7)이며 서로 다른 native signed byte 인자다. authored Player 이름과 연결하지 않는다.
- `cachedActorType`는 m_PlayerActorType(+18 ushort)를 **Player.Initialize 진입 Actor snapshot**에서 읽는다. 최종 Creator의 ActorType27을 보고 자동 채우지 않는다. 이 모듈은 실제 ordinary Actor27만 지원하며 타입이 없거나 다르면 throw한다.
- `playerState`는 native m_PlayerState(+3)이고, `subState`는 별개 native m_State(+f)다. 기존 StateDispatch의 `.state` alias는 전이 중 임시 view에만 사용한다.
- Player EntityRef는 Add helper0x1801fa167에서 +28에 먼저 기록된다. Actor EntityRef와 동일한 실제 host identity를 요구한다.
- QColor.White는 native ABGR 순서 FP 각65536이다. selected colorIndex를 BaseColor raw로 임의 변환하지 않는다.
- `jumpVelocityRaw`는 native m_JumpVelo(+98), `pushBackRaw`는 +a8다. 기존 Default flat snapshot의 forceJumpXRaw/YRaw 등으로의 명시적 projection은 리드/bridge 책임이다. mutable duplicate alias를 만들지 않았다.

모든40개 Player 필드 offset/API 매핑은 JSON의 fieldOffsets/fieldMap에 있다. fresh zero에는 battle timers, jump count/frame, invincibility/flash, flags2, subState, waitTimer, two equipment EntityRefs 등이 포함된다.

## Actor flags / sorting / speed

Player.Initialize의 Actor mask는 bits7,9,11,15,16,18,24 =0x1058a80이다. Actor.Initialize의 bit14와 합치면0x105ca80이다. 기존 flags의 다른 bit는 보존하며 initDir가 nonzero이면 bit10 LookLeft도 추가된다.

sorting order는 signed PlayerIndex 기준 `(playerIndex-8)*10`이다. 단순 필드 대입으로 native 호출을 바꾸지 않고 ActorLifecycle.commonEvent54 코어를 재사용했다. 생성 중 Player current0은 Default receiver를 거치지 않으며, Player event54는 Actor receiver를 호출한 뒤 two equipment refs를 순회한다. 이 helper의 검증된 새 Player에는 두 ref가 null이다.

walkSpeed는 `(FP.One * Stage.BaseScale) * QPlayerDefine.SPEED_X(3)`이고 ice maximum은 그 결과에 Stage.IceSpeedUp을 곱한다. QFP.One/Three/Hundred는 각각0x1817811de/0x181781299/0x18178151e에서 직접 확인했다. 실제 두 stage scale1/iceSpeedUp1.5에서는 walk196608 / max294912다. collision의 stage scale 적용은 이후 등록 단계에 기존 코어가 한 번만 수행한다.

## API / 최소 host 입력

- `addedPlayer(entityId, options)`: 검증된 새 Add의 zero baseline+EntityRef40필드. `playerComponentAbsent:true`, `playerAddDefaultVerified:true`가 필요하다.
- `bootstrap(authored, actorAtPlayerInitialize, binding, options)`: Player.Initialize와 Creator 반환까지 조립한다. `options`는 `stageScaleRaw`, `iceSpeedUpRaw`를 요구한다. Actor snapshot은 Actor.Initialize/DamageManage.Initialize 이후의 ordinary Actor27, unit scale, 빈 holder list, 명시적 owner/animation 상태여야 한다.
- `register(snapshot, {stageScaleRaw,uniqueNameVerified:true})`: 성공한 scene 등록의 위치/scale 단계만 ActorInitialization에 위임한다.
- `compile(actors,count,options)`: caller가 native converter 순서로 준 actors에서 population 허용 Player 첫count개를 처리한다. `actorSceneFlags` limit bit2, `freshPlayerListVerified:true`, **실제 nativePlayerIndexList**, matching `gamePlayerInfos`, count개의 `bindings`가 필요하다. `register:true`일 때만 위 등록도 수행한다.

각 binding에는 실제 `entityId`, signed int32 collision `id`, native `hasOnCollided`, `index`, `playerIndex`, `colorIndex`, `playerComponentAbsent:true`, `playerAddDefaultVerified:true`, `damageManageInitialized:true`가 필요하다. compile binding에는 `actorAtPlayerInitialize`도 포함한다. host 검증 flag는 실제 새 Add/기본값·실행 경계를 확인했다는 계약이며, existing Player를 재사용하는 허가가 아니다.

10-4 shufflePlayer1의 실제 RNG/list 결과는 host 입력이다. 테스트는 authored 이름과 다른 `[7,2,6,0,5,1,4,3]` 일부를 명시적 fixture로 공급해 이름→index 추론이 없음을 검증했다. 이 list는 native에서 캡처한 shuffled 결과라고 주장하지 않는다. EntityRef/collision ID/holder handle/QString도 모두 fixture 또는 실제 host supplied 값이며 새 allocator를 구현하지 않았다.

## AddComponent 및 남은 범위

Player Add0x1801f9f00의 default factory0x1806894f0은 metadata상 `Activator.CreateInstance<PlayerComponent>`(MethodSpec83109/type4786)이며 instance .ctor가 없다. 하지만 이미 Player가 있으면 Has0x1801fa05a/61 ->null branch0x1801fa148이므로 get-or-add처럼 기존 Player를 반환하면 안 된다. 미확정 OnAdded/materialization 효과가 있으면 `playerAddDefaultVerified`를 승인하지 말아야 하며 helper는 throw한다.

특수 Player 상태·크기/ear/battle 파라미터 분기는 기존 CollisionInit.params가 거부한다. runtime stage factory, native allocator, component buffers/OnAdded effects, DamageManage buffer allocation, actor name dictionary, duplicate-name OnExit/Destroy, shuffled index list 생성 및 bridge projection은 구현하지 않았다. 이들을 생략한 전체 stage fidelity를 주장하지 않는다.

## 승인된 ActorInitialization 문서 정정

본인 ActorInitialization report/result/header·주석에서0x1801f9ad0을 get-or-add로 부른 부분을 Frame.AddComponent<ActorComponent>로 정정했다. `initialize` 자체는 기존 입력의 미기록 필드를 보존하는 **순수 Actor.Initialize 패치**로 그대로 유지했다. 이를 existing Actor에 대한 factory Add 성공으로 해석하면 안 된다는 경계를 명시했다. API/동작·기존 test는 변경하지 않았고16개 검사를 재통과했다.

작업 파일 동결. 기존 factory/bridge/runtime/PlayerDefault/CollisionInit/StateDispatch/Lifecycle 및 Git 변경 없음.

## 리드 통합 후속 (2026-10-15)
bootstrap에 선택적 동기 allocateCollision(actor,player)를 추가했다. 실제 initCollision 호출 위치에서 현재 collision storage가 ID를 발급하며 sorting/flags/weight 이후, initializeOnly 이전이다. 기존 고정 binding.id API는 그대로이며 둘을 동시에 주면 거부한다. 호출자가 world transaction을 소유한다. 전용24건/관련90건/전체1691건 통과. 전체 factory·scene dictionary/materialization 완료 주장은 아니다.
