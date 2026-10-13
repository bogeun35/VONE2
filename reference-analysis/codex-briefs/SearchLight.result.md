# SearchLight 결과
status: partial — 출하 기본값·조명 코어 검증 완료, 호스트 통합 대기
담당: 보조 세션 3 (01a13559-c00c-7060-b3b1-0466fccc7349)
전용 테스트: 25/25 통과
전체 테스트: 745/745 통과

## 현재 결론
3-1의 12개 SearchLight는 2~8인 모두 prototypeKillPlayerOff 옵션 없이 compile됩니다. `compile(actors,count,{chipSize:selectedVariant.mapInitParam.chipSize})`로 호출합니다. 출하 killPlayerOff/초기 bright/dark는 모두0입니다. abs(period raw)<4는 초기0을 유지하며 raw>=4에서 authored 값을 적용합니다. 음수 기간은0으로 clamp됩니다. 별도 prototypeKillPlayerOff 옵션은 int32 alternate prototype override로 유지했습니다.

밝은 조명 범위 안에 FATAL_TIME 이상 머무는 state1 플레이어에게 targeted event26을 보냅니다. 60Hz raw delta1092에서 밝은 검사12틱은13104로 미달,13틱은14196으로 임계13107을 넘습니다. 페이드4369는5틱입니다. phase 시작 전환과 페이드가 독립 단계이며, 3초/2초 주기 정확 전환 틱도 검증했습니다.

## 출하 기본값 근거
- static fixture: `source-migration/searchlight-prototype-evidence.json`. SearchLightEntityPrototypeAsset6310의 Path는 `Game/Resources/Actor/Blackout/SearchLight|EntityPrototype`, Guid1421855438945819390, Parent8037입니다.
- GameObject1276에는 Transform3411, EntityPrototype8037, EntityView7530, SearchLightView7579만 있습니다. Transform children=[]입니다. EntityPrototype8037의496bytes에는 Transform/Physics/Nav/View 필드만 있으며 serialized SearchLight component나 m_KillPlayerOff 필드가 없습니다.
- Creator0x1816f07a1 → Frame.CreateActorEntity0x1817482c0 → prototype Create0x1819786c0 (call0x181748398). 이어 Creator0x1816f07c5 → generic helper0x1802010a0가 SearchLight default struct를 추가합니다.
- helper call0x1802010ff → default factory0x1806845a0 → RuntimeType.CreateInstanceDefaultCtor0x1814dc9b0 (call0x1806846de) → CreateInstanceMono0x1814dd0e0. instance ctor 없는 value type 경로에서0x1814dd35e →0x1802d5680 → allocator0x180319f60.
- allocator0x180319f95/9c는 edx=0,0x180319fdd/fe8은 data 영역을 fill 함수0x18037b8e0으로0 채움. boxed data104bytes를0x180684711..757에서 복사하고 Add0x180788b20이0x180788c00..41에서 component로 복사합니다.
- `searchlight-default-native-evidence.json`: PhotonQuantumCode.dll Quantum.SearchLightComponent에는 .cctor만 있고 instance .ctor가 없습니다. mscorlib metadata token0x6000e46=CreateInstanceDefaultCtor0x1814dc9b0, token0x6000e4b=CreateInstanceMono0x1814dd0e0도 확인했습니다.
- programmatic Creator0x1816f0820→Initialize0x1816f09f0는 kill1을 명시 저장하는 다른 경로입니다. 출하 resource 경로와 혼동하지 않았습니다.

## 검증한 조명 코어
- Parse0x1816f0b40: bright slot0, dark1..7 직접 count 선택, rotation8, cone9, integer range10..16, initialBright17. 이전 인원 폴백 없음.
- fatal13107 store0x1816f254a, fade4369 store0x1816f256b/literal slot0x1831c3af8.
- strict distance²<radius²0x1816f2174, strict native dot>Sin((90-angle/2)×DEG2RAD)0x1816f22d7. rect는 네 모서리 ANY0x1816f1f00.
- 설치 FPSinCos 자산의 출하0°/−45°, cone30°/45° 값을 확인. −45° world direction raw(-46314,-46368), thresholds63286/60526. 정규화는 동결 DistanceConstraint math를 읽기만 합니다.
- outside/disabled collision은 노출 timer를 reset. state1 유지 시 임계 이후26이 매틱 반복되며 임의 latch 없음. state9는 collider1, 그 외 collider0이 호스트 계약입니다.
- SearchLight.OnStart0x1816f1465는 Blackout.AddSearchLight에 entity 등록. 조명/Blackout timer 독립. 실제3-1 Blackout은 phase4 alpha29491 고정입니다.

## 정정 이력
이전23개/전체674개 테스트 상태에서는 Materialize0x1817b9c87의 asset+0x78 복사를 실제 출하 경로로 추정하여 default compile 및 sub-epsilon을 거부했습니다. 이 복사 명령 자체는 맞지만 실제 prefab에는 그 serialized component가 없었습니다. 이번에 resource prefab→generic zero-init 생성 경로를 연결해 이 추정을 정정했습니다. 현재 default0은 진단 입력이나 추측이 아니라 static asset/native/metadata 근거입니다.

이전 UnityPy 실패는 자산 unreadable 문제가 아니라 cp312 dependency와 기본 Python3.11의 ABI 불일치였습니다. bundled Python3.12.14 -I -B로 기존 의존성을 읽기만 하여 추출했습니다. generator assembly는 PhotonQuantum(확장자 없음), type은 EntityPrototypeAsset/EntityPrototype(namespace 없음), m_Enabled alignment16384 보정이 필요합니다. 새로운 pip/공유 라이브러리 수정이나 게임 실행은 없습니다.

## 남은 호스트 계약
- ctx.searchLightPlayers: native index/id/state/hasCollision/collisionDisabled/global collisionRectRaw. state9 collider1 선택은 호스트 담당.
- outgoing26은 실제 Player handler에 전달. 모듈은 임의 deadPlayerIds를 만들지 않습니다.
- SearchLight 자체에는 pause 검사/OnRecvEvent override 없음. common Actor event53 결과로 pausedLightIds 제공. 불명확한53은 거부. 공통 Actor 모듈은 보조2 소유로 변경하지 않았습니다.
- Blackout lightlist/holes 렌더와 실제 playable 대조는 리드 담당. 출하 외 angle/criteria로 미확인 SinCos index가 필요하면 오류 유지.
- 전체 물리 fidelity는 false. compile 성공을 전체 playable 통합 완료로 해석하지 않습니다.

## 파일 및 재현
소유 파일: source-searchlight-devices.js, source-searchlight-devices.test.cjs, searchlight-device-report.json, extract-searchlight-prototype.local.py, searchlight-prototype-evidence.json, extract-searchlight-default-native.local.py, searchlight-default-native-evidence.json, 이 결과 노트 및 작업중-SearchLight.md.
모두 source-migration 또는 codex-briefs 아래입니다. 공용 runtime/play/Blackout/DistanceConstraint/Git/배포는 변경하지 않았습니다.

명령 cwd는 반드시 `C:\Users\user\projects\VONE2\reference-analysis`:
- bundled `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -I -B source-migration/extract-searchlight-prototype.local.py` (stdout JSON, game static read only)
- `python -I -B source-migration/extract-searchlight-default-native.local.py` (stdout metadata/native method JSON)
- `node --test source-migration/source-searchlight-devices.test.cjs`
- `node --test source-migration/*.test.cjs`

REA 기록 유지: 기존 first-run.md/gameassembly.json의0x1818713e0 percent→FP pseudocode와 native0x181871571..5a9를 대조하여5%=3276,66%=43253 및 음수 절삭 확인. REA6.4.0 help/decompile help 실행. 임시 Ghidra 프로젝트가 삭제되어 snapshot을 영속 프로젝트로 보지 않습니다. 전체 재분석은 하지 않았고 리드가 shared handoff를 관리합니다.
