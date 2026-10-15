# StageInputUpdate — result
status: done / FROZEN (Normal inputType0 caller/read helper; special bodies guarded)
files: source-migration/source-stage-input-update.js, source-migration/source-stage-input-update.test.cjs, source-migration/stage-input-update-report.json, 이 결과 및 선점

tests: 전용26 passing; 전체1920 passing / 0 failing. 실제3-2·10-4 온/오프라인2..8 총28조합 명시적 roster/packet fixture 검증. 원작 실행 없음.

what it is: inputType0의 Stage.updateInput이 native no-op임을 복원하고, prepare4의 EntityRef-only Normal singleton 설정과 Player Normal 입력 조회 gate를 제공한다. 기존 NativeInput의 Button words와 predicate를 그대로 사용한다. 이 helper는 packet producer가 아니며 timestamp/current 갱신·임의 release를 수행하지 않는다.

stage compiles alone: no. 실제 singleton/EntityRef, Stage flags/menu mask, Player state, native global input snapshot과 packet 공급은 host 책임이다. 기존 runtime/bridge/factory/network/NativeInput/IndexList/PlayerDefault를 변경하지 않았다.

## 가장 중요한 결론

**NormalInput용 두 번째 updater를 만들면 안 된다.**

- Stage.updateInput0x18170b720의 type0 branch0x18170b757는0x18170b78e/798로 바로 return한다. GetNormalInput 조회조차 하지 않는다.
- NormalInputComponent는 metadata상 **EntityRef(+0) 한 필드뿐**이고 Update method가 없다. Button·timer·frame·packet 필드를 새로 넣지 않았다.
- Initialize0x180476130은 `ret 0`(bytes c2 0000), 빈 함수다. prepare4는 이 Initialize도 호출하지 않는다.
- 실제 timestamp producer는 기존 **Frame.SetPlayerInput**이다. QuantumGame.OnSimulate의0x181765a35에서 native session slot별로 호출하며, 실제 DeterministicFrame.Number를0x181739419에서 읽는다. render/poll 횟수가 아니다.

같은 simulation frame에서 Press를 반복 조회해도 소모되지 않는다. 다음 실제 packet 적용에서 current가 갱신될 뿐이다. menu·wake·enable gate가 바뀌어도 저장된 Button에 release를 만들거나 timestamp를 재설정하지 않는다.

## prepare4 / 프레임 순서

prepare4는 Frame.Verified가 false면 아무 singleton 조회/할당도 하지 않고 false를 반환한다(0x18170ae7f). Normal 경로는 다음 세 작업뿐이다.

1. GetOrAddSingletonPointer<NormalInputComponent>, supplied EntityRef0 (0x18170b19f →0x180026af0).
2. 실제 singleton EntityRef 조회 (0x18170b1e5 →0x1819756e0).
3. component raw+0에 EntityRef 기록 (0x18170b1ea).

기존 singleton이면 그대로 사용하고, 없으면 native helper가 Frame.Create를 호출할 수 있다(0x180026b72). allocator/EntityRef는 host가 실제 결과를 공급한다. 별도 Normal.CreateEntity0x181887650도 같은 조회·ref 설정 경로이며 입력 데이터를 초기화하지 않는다.

native 순서는 session Input 적용 → simulation systems → Stage.onUpdate 안의 ActorFactory.Update(0x18170b5f5) → Stage.updateInput(0x18170b603, Normal에서는 no-op) → ActorScene.Update(0x18170b4cc)다. Stage flags **bit14, bit0, bit1**은 이 factory/input caller 경로를 건너뛴다. Player 입력 가능 여부의 Stage bit3 gate와 혼동하면 안 된다.

## Player 입력 조회 gate

| 순서 | 정확한 native 검사 |
|---|---|
| 1 | Player.wakeUpCount(+11) **!=0**. >0이 아니므로 -1도 통과 |
| 2 | Player.flags bit7이 있으면 false, Stage도 읽지 않음 |
| 3 | Stage.flags bit3(8)이 있고 bit1(2)이 없어야 함 |
| 4 | Stage.inputType으로 실제 mode 선택 |
| 5 | NormalInput **포인터 존재**. 없으면 false; EntityRef 내용은 조회 키가 아님 |
| 6 | Player.playerIndex(+e signed byte) 사용. Player.index(+8)/authored 순서/현재 명부순번을 쓰지 않음 |
| 7 | Stage.operatingMenuMask(+0)의 해당 PlayerIndex bit가 있으면 null input |
| 8 | global native slot의 기존 Button을 복사해 on/press/release 비교 |

IsEnableInput0x1816be1d0 자체는 **Player bit7 + Stage bit3/bit1만** 검사한다. wake/menu/Normal singleton/명부는 이 함수의 gate가 아니다. wakeCount는 IsOn/Press/Release 바깥쪽 별도 검사다.

Normal getter 경로는 현재 GamePlayerInfo 명부를 다시 조회하거나 membership filter를 넣지 않는다. IndexList가 생성 시 배정한 **실제 PlayerIndex**로 fixed global input slot을 읽는다. 메뉴 bit도 PlayerIndex 기준이다. menu gate는 slot bounds보다 먼저이며 native shift는 low5 bits를 사용한다(0x18174a69c..6ad, bounds0x18174a706).

GetGamePlayerInputButton은 input이 null이거나 enum>11이면 zero Button을 반환한다. 새 packet/release를 만드는 것이 아니다. 기존 NativeInput의 signed word 비교를 재사용한다: on=down>up, press=down==current && down>0, release=up==current && up>down.

## packet 공급과 host 계약

- host는 원래 session이 공급한 실제 Input payload와 **실제 frame.Number**를 기존 NativeInput producer에 먼저 전달한다. StageInputUpdate는 producer를 한 번 더 호출하지 않는다.
- 실제 native player slot, local controller 배열 위치, Player.index는 서로 다르다. sparse PlayerIndex를 authored 순번이나 n인 명부 위치로 remap하지 않는다.
- missing remote packet, rollback/replay, 비활성 player packet 정책은 native-session host의 입력이다. 임의의 zero/release packet을 보충하지 않는다.
- menu에 가려도 실제 Frame.SetPlayerInput은 계속 저장소를 갱신한다. menu를 닫았다고 held Button을 새 press로 만들지 않는다.
- singleton 생성과 EntityRef는 host의 실제 allocator 결과를 사용한다. Normal component에 Button storage를 중복 보관하지 않는다.

`createHost`에 필요한 synchronous lookup은 `getStage()`, `lookupInputSingleton(name)`(실제 component object 또는 명시적 null), `getNativeInputState()`다. Player.flags/wakeUpCount/playerIndex 및 Stage.inputType/flags/operatingMenuMask는 실제 snapshot이어야 한다. lookup 순서와 필요한 시점의 short circuit도 테스트했다.

## API

- `prepare4(stage, verifiedFrame, host)`: 위 Normal singleton 설정. host.getOrAddSingleton(name,null), host.getSingletonEntityRef(name)를 사용한다. 반환 component의 EntityRef만 patch한다.
- `updateInput(stage, host)`: inputType0/default native no-op. Button·packet·clock 접근 없음.
- `createHost(host)`: `isEnableInput`, `buttonsForPlayer`, `isOnInput`, `isPressInput`, `isReleaseInput`. read-only word snapshot이며 frozen PlayerDefault.input과12 enum/3 predicates를 비교 검증했다.
- `planOnUpdateInput(stageFlags)`: native caller gate/상대순서 계획만 반환. factory/ActorScene 자체를 실행하지 않는다.
- `setEnableInput(player,enabled)`: 명시적으로 호출됐을 때만 native bit7을 변경한다. Stage update가 자동 호출하지 않는다.
- `describe(inputType)`: 아래 special caller 계약 metadata.

## Majority / Multi / Half 범위

| inputType | singleton | updater VA | prepare4 Initialize 호출 |
|---:|---|---|---|
| 1 | MajorityInput | 0x18187b270 | 없음 (empty Initialize도 호출 안 함) |
| 2 | MultiInput | 0x181886800 | 0x1818865b0 호출 |
| 3 | HalfInput | 0x181861cd0 | 없음 |

이들의 updater/aggregate/special read body는 구현하지 않았다. updateInput에서 해당 singleton이 null인 native no-op은 지원하지만, 살아 있는 component의 본문 실행은 정확한 VA와 함께 거부한다. prepare4 special branch도 caller metadata만 제공하고 실제 초기화는 거부한다.

inputType>=4의 Stage.prepare4/updateInput default no-op은 확인되어 그대로 처리한다. Player type4의 On/Press input7 constant branch 등은 Normal 입력으로 근사하지 않고 enabled nonNormal read를 거부한다.

## 검증 및 남은 경계

26 tests는 singleton 초기화/기존 pointer, verified-frame short circuit, Normal no-op, gate별 조회 순서, signed wake, Index≠PlayerIndex, menu-before-range, 반복 Press/held/release, frame0, high flags 보존, special body 거부, Browser helper, 실제 stage28조합 및 native bytes/metadata를 포함한다. frame0은 zero 상태를 그대로 유지하며 Stage helper가 frame1로 보정하지 않는 것도 확인했다.

미확정: session packet 완전성·재생/rollback·physical polling, LeftStick, menu UI/네트워크 소유권, singleton allocator/partial failure, special mode body와 전체 Stage loop. 필요한 실제 상태는 host 입력이며 미검증 native body를 조용히 통과시키지 않는다.

본인 신규 파일만 작성하고 동결. 기존 runtime/bridge/factory/network/다른 core·공유문서·Git 변경 없음.
