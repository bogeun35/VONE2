# 08-blackout — result

status: done

files:
- `source-migration/source-blackout-devices.js`
- `source-migration/source-blackout-devices.test.cjs`
- `source-migration/blackout-device-report.json`
- `codex-briefs/08-blackout.result.md`

tests: 장치 테스트 8건 통과; full suite: 432건 통과, 실패 0건. 리포트 JSON 파싱 확인. 실제 온라인 인원별 variant를 선택하여 5스테이지 × 2..8인 = 35개 장치 컴파일을 검증했다. 원작 코드를 실행하지 않았다.

what it is: Blackout은 상시 어두운 화면 또는 밝음과 암전을 반복하는 장치다. 7-3과 15-2에서는 밝은 동안 일반 액터를 정지시키고, 어두워지기 시작하면 재개한다. 컨트롤러는 시작 때 무작위로 고른 한 플레이어에게 Shot 입력 UI를 보여 주며, 해당 플레이어가 누르면 다시 밝은 구간으로 돌아간다.

stage compiles alone: 전체 스테이지 기준 **no, 2..8인 모두 이 작업만으로 열리는 단계는 없다.** 이 모듈 자체는 모든 대상 스테이지의 2..8인에서 컴파일된다. 현재 runtime에는 등록하지 않았으므로 전체 스테이지 컴파일이나 플레이 완료를 주장하지 않는다. 지시대로 기존 파일, 등록, 패키징, 배포, 커밋, 푸시는 건드리지 않았다.

기존 `remaining-work.json`을 읽은 시점의 다른 차단 액터:
- `st_w_07_03`: WeightedLift — Claude 작업 및 등록 필요.
- `st_w_03_01`: CheckPoint, SearchLight.
- `st_w_09_01`: BatEnemy, FallingCage, TopViewPlayer.
- `st_w_09_03`: BatEnemy, Text, TopViewPlayer.
- `st_w_15_02`: CheckPoint, ColorBox, DeadSwitch, WeightedLiftEx.

key findings:
- **가시성만의 장치가 아니다.** `suspendStage 0x1817cf849` / `resumeStage 0x1817cf8e9`는 option=1일 때 전체 장면에 event53과 pause=true/false를 보낸다. `ActorComponent.OnRecvEvent 0x18169eaa8` → `setPause 0x18169f020`가 액터의 정지/애니메이션 플래그 bit4/6을 변경한다. 해당 옵션은 7-3과 15-2에 실제 작성돼 있다. 다른 세 단계는 option=0이며 상시 암전이다.
- `Blackout 0x1817cfb39`와 `Controller 0x1817d0d0e`는 event53을 무시한다. 런타임이 전체 틱을 중지하면 다시 밝아지지 않는다. 일반 액터만 정지하고 두 장치는 계속 갱신해야 하며, 기존 고체는 유지해야 한다. 이 event53은 `StageComponent.Suspend`와 다르다.
- `ParseParameter 0x1817ceb20`는 bright/dark/darkness/option/fade/background/curtain 순으로 슬롯을 읽는다. `OnStart 0x1817cf15c/18a`는 커튼을 켰을 때 작성된 darkness=1, fade=.2를 **darkness=.6(raw39321), fade=.8(raw52428)**로 덮어쓴다.
- 기본 페이드는 `.cctor 0x1817cfe47..68`의 `QFP.OneFrame × QFP._4`, 즉 raw4368이다. 두 `.cctor`에 문자열 해독기를 실행했으며 직접 FP.FromString 호출은 없었다. QFP 검증에서는 22개 문자열이 모두 일치했다.
- 컨트롤러의 두 인원별 문자열은 `0x1817d036c/386`에서 QPlayerCountParam으로 읽는다. `0x1817d03f0/470`은 count-2에서 아래로 첫 nonzero를 선택한다. 실제 두 단계 모두 전 인원 **active=4초(raw262144), inactive=3.5초(raw229376)**다. 초기 inactive에는 보정이 없고 후속 타이머는 `0x1817d09b8/0x1817d0b5f`에서 .005(raw327)를 더한다.
- `decideControlPlayer 0x1817d06f9`는 RNG.Next(0,GamePlayerInfo.Count)로 **시작 때 한 번만** 선택한다. `0x1817d0716/71f`에서 PlayerRef-1과 ColorIndex를 저장하며 이후 사이클에는 재선택이 없다.
- 입력은 선택 플레이어의 **Shot**이다. Input 메타데이터 offset136-16=0x78과 `0x1817d08e2..f3`의 두 카운터 비교(+0x7c==+0x80>0)로 확인했다. 모듈은 `ctx.gamePlayerInputs[index].shotPressed` 또는 `shot:{counter7c,counter80}`를 받는다. Stage 입력 마스크 적용은 `Frame.GetGamePlayerInput 0x18174a69c`에 맞춰 호출자가 처리해야 한다.
- `CheckAlivePlayer 0x1817cfcfa`는 **한 명이라도 사망하면 false**다. `0x1817d0b7d`의 컨트롤러 종료는 UI만 숨기고 Blackout bit5는 그대로 둔다. Blackout event15는 `0x1817cfb7e`에서 bit6을 영구 설정한다.
- `FPInterpolator.Run 0x18183bf99..c4`는 시간 비율과 두 곱을 각각 내린다. 60Hz(raw1092)에서 초기 inactive=211틱, UI 대기=241틱, 커튼 페이드=49틱이다. 초기 테스트의 페이드 48틱 기대값을39312에서39311로 수정했다. 두 단계 내림을 반영한 근거와 수정 내역은 리포트에 남겼다.

unresolved:
- 런타임 연결은 요청상 수행하지 않았다. event53의 액터별 pause 소유권, Shot edge/입력 마스크, `ctx.players` 전체 사망 상태 및 `stageRequestedAny`, 초기 pendingEvents 처리를 연결해야 한다. 각 틱은 Blackout → Controller 순서다.
- Quantum 세션 seed와 참가자 순서/색상은 외부 상태다. `compile(..., {rngState,rngIncrement,playerInfo:[{playerIndex,colorIndex}]})`로 전달한다. 기본 stream은 재현 가능하지만 원작 세션 seed는 아니다. 미공급 색상은 null이며 추측하지 않았다.
- 복수 Blackout/Controller의 갱신 순서는 검증하지 않아 compile에서 명시적으로 거절한다. 대상 5스테이지는 모두 단일 Blackout이며 두 단계만 단일 Controller를 가진다.
- Unity 커튼 애니메이션, 배경 재질, SearchLight 마스크의 시각적 동일성은 미구현이다. `displays()`와 `curtainCommands`에 확인된 alpha·UI·커튼 상태만 노출한다. SearchLight는 별도 액터이므로 대신 구현하지 않았다.
- 다른 장치와의 전체 네이티브 실행 순서 및 물리 동등성은 통합 검증이 필요하다. 브라우저/원작 병렬 비교 및 사람 플레이는 수행하지 않았으며 `completePhysicsFidelity=false`다.

독립 모듈·테스트·근거 리포트 납품은 완료했으며, 위 항목은 등록 담당자의 통합 작업 및 원작 일치 검수 범위다.
