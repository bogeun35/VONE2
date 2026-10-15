# PlayerDefault — result
status: partial (계산·검증 완료, 호스트 통합 필요, 소유 파일 동결)
files: source-migration/source-player-default.js, source-player-default.test.cjs, player-default-report.json, 이 결과 노트, 작업중-PlayerDefault.md

tests: 전용 37/37 통과. 전체 `node --test source-migration/*.test.cjs` 1,054/1,054 통과. 원작 실행 없이 DLL 정적 분석 및 디코딩된 스테이지 자료로 검증. 네이티브 실행 대조 검증은 아님.

what it is: 일반 Player state 1의 입력→걷기/얼음→접지·중력→점프→강제 속도·바람→카메라 경계→속도 기록을 순수 스냅샷 플래너로 복원했습니다. 귀 확장 수치·콜라이더 크기와 중력 반전 기하, state 1 Post의 밀림/맵 이탈 이벤트도 포함합니다. `supportedTypes=[]`, `completePhysicsFidelity=false`를 유지하며 기존 runtime/play는 수정하지 않았습니다.

stage compiles alone: 실제 3-2·10-4의 2..8인, 오프라인/온라인 28개 선택 조합을 컴파일했습니다. 이것은 일반 Player 스냅샷 생성 검증이며, 스테이지 전체가 단독 실행된다는 뜻은 아닙니다.

## 핵심 근거

- 걷기 raw196608: Initialize 0x1816bd6f9..74d, QPlayerDefine cctor 0x18177e300. 공중에는 새 걷기 속도를 시작하지 않고 기존 X에 raw64225 저항(0x1816c328a), 이전 접지 bit0가 걸음 의도를 결정합니다. 왼쪽 입력이 우선입니다.
- 중력 tick당42598, 단말속도1277952: 0x1816bf53c..54b. 마지막 속도 대신 변화량에 Actor.baseScale을 곱합니다. velocity에 dt를 곱하지 않습니다.
- 점프 -334234와 작은 몸 보정: 0x1816becf0. 코요테 시간4588: 0x1816c593a. 마지막 양수 시간은 dt 차감 뒤 음수가 되어도 그 tick에는 허용됩니다. 1..13 프레임 홀드, 14에서 추가 가속 없음: 0x1816c3c61..cf3.
- 얼음은 첫 유효 액터 접촉이 결정하며 공중에서는 기존 Actor 얼음 상태가 유지될 수 있습니다: 0x1816c4a50. 맵 속성 bit1, 애니메이션 bit31 기준 old abs(vx)>=55705. 실제 스테이지 ice 값은 authored float32 변환을 사용합니다.
- 작은 턱 보정: 0x1816c5300. 높이차 raw131072 이내(0x1816cbf8b), 분리 raw655 추가. 이 함수는 맵을 직접 조회하지 않습니다. 필터링 전 ContactInfo 순서/인덱스를 요구합니다.
- 10-4 slot5는 귀 확장 bit20이 아니라 bit22입니다. 직접 점프/공중 X 제한 및 반전에 사용합니다. 반전 허용 접촉은 중력 면(0x1816c41f0), Player 차단 목록은 반대 면(0x1816c423e)입니다. Actor.scaleY*48px 위치 이동, rectY 뒤집기, Actor bits21/12, Collision bit8, SetPosForce+warp bit25: 0x1816c4380.
- 귀: 두 대상 스테이지 기본 bit20은 꺼져 있습니다. 활성 수치 분기도 검증했습니다. 초당48(0x1816cbc53), 범위1..20, enum9(0x1816c46aa), release에 shrinkbit21 토글(0x1816c481f), current/pre scale 차이와 높이 변화가 있으면 MoveContactActor mode6입니다.
- Player 초기 bit3(0x1816bd663)는 Post에서 pushBack 벡터를 더하도록 합니다. state1 postPlayerState는 0x1816c1058 첫 분기→0x1816c0f8d로 별도 동작 없음. CheckOutMap=true면 event43/isOutMap=true(0x1816c0eef).

## 통합 계약

`compile(actors,count,{actorSceneFlags:4,stageScaleRaw,iceSpeedUpRaw,actorFlags,bindings})`는 `{players:[{player,actor,collision}]}`를 생성합니다. bindings는 기존 CollisionInit과 같은 `{id,entityId,hasOnCollided}`입니다. actorFlags는 호스트가 확정한 초기화 후 네이티브 플래그를 전달해야 합니다. 테스트의 0은 계산 분리용 명시적 fixture이며 실제 Actor 기본 플래그를 뜻하지 않습니다.

`step(snapshot,stage,buttons,dtRaw,ctx)`에서 stage는 `{inputType:0,scrollType:1,flags,iceResistivityRaw,iceFrictionRaw}`, Button은 enum4/6/7/8/9별 **signed int32 세 워드**입니다. on=`b>a`, press=`b==t && b>0`, release=`a==t && a>b`(0x1816be740). Boolean 입력으로 대체하지 않습니다. `post(snapshot,ctx)`는 별도 Actor/Scene 적절한 Post 단계에서 호출합니다.

호스트는 다음 네이티브 연산을 실제 현재 상태로 제공해야 합니다. 필요 시 누락하면 throw합니다. 자세한 시그니처는 JSON report.api.host에 있습니다.

- contactIds / **필터링 전 contactInfos** / collisionById / playerByEntity / mapContact / contactProbe. contactProbe는 맵 포함 여부와 액터 attribute OR를 구분합니다. 임의 AABB 겹침으로 접촉을 대체하면 안 됩니다.
- iceMapAttributesAtRaw: 전달되는 Actor anchor +/-12px에 대한 네이티브 맵 FP 좌표 변환 및 속성. 유효하지 않은 셀/chip<2는 null입니다.
- openGoalOverlap: Press8+Press4 때 실제 열린 Goal 콜라이더 겹침.
- applyImmediate: SetPosForce, 귀 MoveContactActor(mode6), notifyJumpUpward(event37)의 동기 실행과 mutable snapshot/접촉 갱신. 즉시 동작은 effects에 감사 기록으로도 있으므로 **다시 실행하지 않습니다**.
- screenEndWalkVelocityX: 수동 스크롤 대상도 매 정상 Update마다 필수. no-op은 해당 tick에 보정이 없다는 호스트 근거가 있을 때만 가능합니다.
- checkOutMap, SetAnim/Look 방향/PlaySe/NotifyEvent의 실제 Actor 반영. SetAnim은 스냅샷에도 반영하며 나머지 비즉시 효과를 네이티브 순서로 적용해야 합니다.

unresolved: InputType1..4, 자동 스크롤, 비기본 changeNextPlayerIndex 점프 분기, 순환 floating 그래프는 명시적으로 거부합니다. 일반 MoveContactActor 재귀, event37 상향 점프 전파, 맵 디코딩, 카메라 경계와 Actor/Scene 운반·후속 적분은 호스트 구현이 필요합니다. 12상태 Player 전체 복원, 전 스테이지 실행, 물리 완전 동등을 주장하지 않습니다.

## 수정 이력

실패했던 기대값 두 건은 네이티브 재대조 후 수정했습니다. 점프 허용이 false인 프레임14는 final 경로로 바로 가므로 0으로 리셋되지 않고14가 남습니다(0x1816c39e0/3d71). 최대 귀 확장의 실제 이동 raw=-9961438은 정규화·GetRect 반올림으로 이상적인 -9961440과2raw 차이 납니다. frozen CollisionInit 수식은 바꾸지 않았습니다. 턱 보정에는 필터링 전 ContactInfo 인덱스가 필요하여 전용 host hook으로 교정했습니다.

소유 다섯 파일만 작성했습니다. 기존 Gear/CollisionBroadphase/ColorBox/TopView/Cardboard/PlayerCollisionInit, 공용 runtime/play/HANDOFF/Git은 수정하지 않았습니다. 이 결과로 PlayerDefault 파일을 동결합니다.
