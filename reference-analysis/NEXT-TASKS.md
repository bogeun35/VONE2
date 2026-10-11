# 다음 작업 — 바로 착수용

> 2026-10-11 기준. 먼저 [`HANDOFF.md`](HANDOFF.md)를 읽을 것(저장소 구조·재생성 명령·함정 7가지).
> 수치는 전부 `source-migration/remaining-work.json` 실측이다. 추정이 아니다.

**현재**: 런타임 연결 **10라운드** / PP2 월드 60개. 남은 50개, 고유 차단 요소 102종. 테스트 177건.

---

## ⚠️ 먼저: "최다 차단 = 최우선"이 아니다

`Text`는 10개 스테이지를 막는 **최다 차단 액터**지만, **등록해도 새로 열리는 스테이지가 0개**다(실측).
10곳 전부 다른 장치를 더 필요로 한다:

| 스테이지 | Text 말고 더 필요한 것 |
|---|---|
| 10_03 | BoundBallPitcher, BallKeyBox |
| 14_01 | PlayerBlockGun, BreakableRect |
| 05_04 | PlayerWarpGun, UpDownLift |
| 02_02 | TouchEnergy, WeightedLiftSingle |
| 나머지 6곳 | 3종 이상 |

**라운드를 열려면 "스테이지별 남은 종류 수"를 봐야 한다.** 액터별 등장 횟수가 아니다.
(`remaining-work.json`의 `stages[].blockers`가 그 데이터다. `topBlockers`는 참고용일 뿐이다.)

---

## 우선순위

### 1순위 — 장치 1종이면 라운드가 열리는 곳 (2개)

| 스테이지 | 필요한 장치 | 메모 |
|---|---|---|
| `st_w_07_02` | `Bowwow2Enemy` | 조사 안 됨 |
| `st_w_10_04` | `WeightedLiftEx` | **출발점 주소 이미 확보** ↓ |

**`WeightedLiftEx` 출발점** (`switch-direction-report.json`의 `unresolved[0]`에서):
```
NormalWeightedLiftComponent.ParseParameter 0x181889b40 / OnUpdate 0x18188a120
ExtraWeightedLiftComponent.ParseParameter  0x18183b160 / OnUpdate 0x18183b8c0
VariableWeightedLiftComponent              0x181733240 / 0x181733520 / .cctor 0x181733a40
공용 WeightedLiftComponent  InitCollision 0x181737a50 / OnUpdate 0x181737be0
                            CalcMoveContactCount 0x181738090 / MoveLift 0x181738170
                            .cctor 0x181738470
```
액터는 하나뿐: `WeightedLiftEx1 (2133,175)`, `datas[8..13] = 100, 3, 1, -1, 900, 1`.
형제가 많다(`WeightedLift`, `WeightedLiftSingle`, `DarknessWeightedLift`, `UpDownLift`,
`LinePathLift`, `RouletteLift`, `Lift`). 공용 컴포넌트를 공유한다면 분기 조건까지 기록하면
다음 작업이 크게 빨라진다 — `TimerComponent`가 SwitchTimer/DeadTimer를 함께 처리한 것과 같은 구조.
`WeightedLiftEx`는 근접 스테이지 3곳에 걸쳐 있어 1종당 효율이 가장 높다.

### 2순위 — 새 장치가 아예 필요 없는 곳 (1개)

`st_w_07_03`은 **가드 2개**만 걸려 있다. 새 장치가 아니라 기존 모듈의 범위를 넓히는 일이다:
```
Rect population offset encoding requires further verification: slot 6
Unverified Bridge geometry/count scaling/push mode
```
바로 직전에 같은 종류의 작업(스위치 방향 가드)으로 `st_w_05_02`를 열었다. **비용이 가장 낮은 유형이다.**
`spring-switch-runtime.js`의 `zeroOffsets()`(슬롯 6/7의 56자 인코딩 표를 거부)와
`source-bridge-devices.js`를 보면 된다.

### 3순위 — 한 번에 2라운드

`CannonPlayer` + `ThrowBallBasket` + `ThrowBallController` 3종이면 **`st_w_08_02`와 `st_w_08_04`가 동시에** 열린다.
(`st_w_08_01`/`08_03`은 `TargetPlayer, BasketPlayer, AppleController, Apple` 4종으로 또 한 쌍이다.)

### 2종이면 열리는 나머지

`03_02`(DamageRect, LinePathLift) · `04_02`(Gear, SwitchTargetGroup) · `10_01`(CoopCountUpTimer, CountUpTimer) ·
`11_02`(FloatingThorn, PoleLadder) · `12_01`(GoKart, Stick) · `12_04`(MoveWall, SpeedSwitch) ·
`13_01`(LandmineSwitch, LandmineSwitchObserver) · `13_03`(RallyController, RallyMallet) ·
`13_04`(FakePlayer, FakeTimer) · `14_03`(Dossun, PlayerBlockGun)

---

## 미완성으로 남은 것

| 항목 | 상태 | 해야 할 일 |
|---|---|---|
| `Text` 모듈 | `source-text-devices.js` + 테스트 17건 통과, **리포트 없고 미등록** | 근거 리포트를 쓴 뒤 등록. 단독으로는 라운드가 안 열리니 급하지 않다 |
| 방향 2(LEFT) 스위치 | 바이너리·static 이름으로만 확정 | 월드에 인스턴스 0개라 실데이터 검증 불가. 쓰는 스테이지가 생기면 확인 |
| `ForTopView` 사각형 | 미적용 | `StageComponent.IsTopViewSort` 비트를 **세팅하는 코드를 못 찾았다**(호출지점 0개). **탑뷰 스테이지를 연결하기 전에 반드시 재확인** |
| 방향0 접촉 판정 | 원작보다 좁게 유지(의도적) | 원작은 단순 겹침인데 현재는 "착지 상태로 발이 밴드 안". 넓히면 `whole-route-replay.cjs --check` 로 영향 라운드를 보고 재녹화 |
| 4-3 열쇠 | **현재 런타임으로 클리어 불가** | 열쇠 충돌 상자(224,452,32,56)가 지형(192..288 × 432..480) 안이고 줍기는 단순 겹침. 원작의 열쇠 밀어내기/부착이 미이식인 것으로 추정. 근거 `whole-route-replay-report.json` |
| 5-2 타이머 스위치 | **DeadTimer 정지(버그 후보). 근거 미확정이라 런타임은 안 고침** | 슬롯4 → `m_TimerAddSecond` 저장을 원작 PC에서 확인해야 한다. 아래 "버그 후보: 5-2 타이머 스위치" 절 |

### 버그 후보: 5-2 타이머 스위치 — 근거 판정 (2026-10-11, 게임 없는 PC)

**판정: 미확정. 런타임은 고치지 않았다.** 스위치가 타이머에 시간을 더하는 구조와 신호 형식은 git 안 근거로 확정된다.
그러나 "5-2 스위치가 보내는 값이 2초"는 확정되지 않는다. 슬롯4가 `m_TimerAddSecond` 로 들어가는 저장 명령이 어느 문서에도 없다.

| 고리 | 상태 | git 안 근거 |
|---|---|---|
| Timer 가 61 이벤트를 받으면 payload 0 은 정지, 0 이 아니면 더한 뒤 정수 초로 올림 | 확정 | `switchtimer-device-report.json` `behaviour.incomingEvents` (OnRecvEvent 0x18172e250, 정지 0x18172e35e, 더하기 0x18172e374) |
| Switch 가 보내는 61/60 의 payload(QEventParam +0x60 Time)는 `SwitchComponent.m_TimerAddSecond` | 확정 | `switchtimer-device-report.json` `nativeEvidence.supportingCalls.eventPayloadMeaning` (NotifyTarget 0x181714e06, il2cpp 48 = struct +0x20, setter 0x18169cdf0), `switch-direction-report.json` `contactCondition.stateMachine.transitions` |
| 5-2 Switch1~23 의 datas[4] = 2, 대상 DeadTimer1 | 확정(추출 데이터) | `play/data/st_w_05_02/*.json` `relays.relays[].timerAddSeconds`·`target` (2~8인 공통). 접속 10라운드의 Switch 41개 중 타이머를 겨냥한 23개만 2, 나머지 18개(JumpStandMediator·Gate·관찰자용)는 전부 0 |
| datas[4] 가 변환 없이 `m_TimerAddSecond` 에 저장된다 | **미확정** | `spring-switch-schema.json` `types.Switch.slots["4"]`="timer add seconds" 는 함수 주소(0x181888840)만 있고 저장 주소가 없다. `parameter-schema.json` Switch 는 슬롯4 읽기 위치 0x181888a0b 만 있고 `status: meaning-pending`. `switchtimer-device-report.json` `unresolved[4]` 가 "어느 슬롯이 m_TimerAddSecond 를 쓰는지 추적 안 함"이라고 적어 뒀다 |

- `switch-direction-report.json` `noInputBehaviour.st_w_05_02` 의 "each carry m_TimerAddSecond 2 ... ~10.8 s left" 는 근거가 아니다.
  런타임 필드명(`timerAddSeconds:d(4)`)을 옮겨 적은 문장이다. 10.8초도 시간이 늘어난 값이 아니라 252틱에 타이머가 멈춘 값이다(15 − 252/60 = 10.8).
- "타이머를 겨냥한 스위치에만 2가 있다"는 정황은 가설을 지지할 뿐 증거가 아니다(HANDOFF §6.1 교훈).
  값을 FP 그대로 저장하는지, 정수로 잘라 저장하는지에 따라 +2초가 아닐 수 있다. Timer 는 +0x60 을 FP 원시값으로 더하기 때문이다.

**원작 PC에서 확인할 것** (전부 정적 역어셈블, 위에서부터):

1. `NormalSwitchComponent.ParseParameter 0x181888840` — 슬롯4 경계검사 0x181888a0b 뒤로 값이 어디에 저장되는가.
   목적지가 SwitchComponent +0x20(il2cpp 48, `m_TimerAddSecond`)인지, 직접 `mov` 인지 `SetTimerAddSecond 0x18169cdf0` 호출인지.
   슬롯5 저장(0x181888b89)과 슬롯1 저장(0x181888ba7/0x181888bad)이 있는 같은 구간이다.
2. 같은 경로의 변환 — `sar 0x10`/floor 정수화, 0 이하 무시 같은 조건, 곱셈이 있는가. 런타임은 슬롯2(switchId)를 정수로 잘라 읽으므로 같은 함수 안에서 두 슬롯의 처리를 대조할 것.
3. `quantum-field-offsets.json` — `SwitchComponent.m_TimerAddSecond` 와 `QEventParam.Time`(+0x60)의 타입(FP 인지 int 인지).
4. `SwitchComponent.NotifyTarget 0x181714cd0`(복사 지점 0x181714e06) — m_TargetName·m_SubTargetName 두 대상, on(61)·off(60) 모두 payload 를 그대로 싣는가.
5. `SetTimerAddSecond 0x18169cdf0` 호출자 전수 — Creator(0x1818886d5 부근)나 다른 컴포넌트가 파싱값을 덮어쓰는가.
6. (부수) `DelaySwitchComponent.ParseParameter 0x1818191a0` 가 `m_TimerAddSecond` 를 쓰는가. 런타임은 DelaySwitch 를 0 으로 고정해 뒀다.

**1~3이 "슬롯4를 FP 그대로 +0x20 에"로 나오면 고칠 곳**:

- `spring-switch-runtime.js` `notify()` 가 만드는 이벤트에 `timerAddSecond:r.timerAddSeconds` 추가(루트와 `play/` 둘 다). 1번에서 찾은 저장 주소를 근거 주석으로 단다.
- `source-switchtimer-devices.test.cjs` 또는 `source-stage-runtime.test.cjs` 에 5-2 실제 액터(Switch1, datas[4]=2 → DeadTimer1)로 테스트.
- 영향 실측(스크래치에서 같은 패치를 덧씌워 돌림, 저장소 파일은 안 바꿈):
  - 왼쪽으로 걷기: 252틱에 Switch9·10 이 동시에 눌려 10.817초 → 15초(올림 13 → +2 = 15).
  - **현재 5-2 녹화(10529틱)는 3862틱(64.4초)에 시간초과로 죽는다.** 22번 더해지고 마지막은 2122틱에 29초. 재녹화가 필요하다.
  - 지금 녹화가 클리어되는 이유는 850틱에 0.833초를 남기고 타이머가 멈췄기 때문이다.
  - 나머지 8라운드는 같은 패치로도 녹화 그대로 클리어(틱 수 동일, 4-3 은 원래 불가). 타이머를 겨냥한 스위치가 5-2 에만 있다.

---

## 장치 하나 추가하는 절차

[`HANDOFF.md` §7](HANDOFF.md) 참조. 요약:
1. `quantum-method-index.json`에서 `XxxComponent`를 찾는다
   (⚠️ `assembly-csharp-method-index.json`에는 시뮬레이션 컴포넌트가 **없다**)
2. `inspect-devices.local.py` 방식으로 역어셈블. **추측 금지, 근거 없으면 "미확정"**
3. `source-xxx-devices.js` + `source-xxx-devices.test.cjs`(**추출된 실제 액터 데이터로**) + `xxx-device-report.json`
4. `source-stage-runtime.js` 9~10곳 등록 → `package-source-play.cjs` stages·복사목록 →
   `deploy-source-play.cjs` app 목록 → `play/index.html` script 태그
5. 2~8인 **전부** 컴파일 확인(일부만 되면 패키저가 throw)

---

## 검증 규약 (직전 작업에서 실제로 쓴 것)

```bash
cd reference-analysis/source-migration
for f in *.test.cjs play/*.test.cjs ../rebuild/camera.test.cjs; do node "$f"; done   # 기준선 177건
```

**회귀 판정은 이 세 가지로 한다**:
1. 기존 라운드 전 변종의 compile 결과 JSON을 새 필드 제외하고 **바이트 비교**
2. 같은 의사난수 입력을 수십 회 먹여 status/ticks/플레이어 좌표·속도/스위치 상태를 **전부 비교**
3. `node whole-route-replay.cjs --check` — 8인 10라운드 공략 입력만 재생(9라운드 클리어, 4-3 은 불가로 기록).
   어긋나면 원인을 본 뒤 `node whole-route-record.cjs <stageId>` 로 그 라운드만 재녹화

**배포 전 반드시 확인할 것**:
- 새 라운드가 **무입력 상태에서 언제 어떻게 죽는지** 측정하고 그게 설계인지 판단
  (4–3은 1.4초, 11–4는 5.8초, 5–2는 15초에 죽는 게 **정상**이다)
- 새 장치가 **화면에 보여야 하는 정보**를 내는지. `play/play.js`에 렌더러가 없으면 추가할 것.
  5–2 때 카운트다운 HUD가 없어서 "보이지 않는 시계에 죽는" 빌드가 나갈 뻔했다
- 새 장치 상태가 **`online.js`의 `DEVICE_STATES`에 등록**됐는지.
  호스트만 시뮬레이션하므로 빠진 상태는 참가자 화면에서 얼어붙는다

---

## 원작 게임이 없는 PC에서 할 수 있는 일

위 1~3순위는 **전부 `GameAssembly.dll` 역어셈블이 필요**하다. 게임이 없는 PC에서 그걸 하면
"근거 없으면 지어내지 말라"는 이 프로젝트의 핵심 규칙을 어기게 되므로 **하지 말 것**.

다만 **게임 없이 되는 일이 있다.** 실측으로 확인했다 — git 내용만 꺼내 로컬 데이터 0개 상태에서:

```
루트 런타임 로드 OK · 카탈로그 10 라운드
시뮬레이션 70 / 70 조합 성공
테스트 통과: play/source-network(8) · ../rebuild/camera(10) · source-pp1-devices(7) = 25건
```

`play/data/` 77개 파일(10라운드 × 2~8인)이 git 에 있어서 **Node 만 있으면** 돌아간다.
파이썬도 역어셈블 도구도 게임도 필요 없다.

⚠️ 단, `play/source-stage-runtime.js` 를 Node 에서 직접 require 하면
`Cannot find module './terrain-runtime.js'` 가 난다(패키저가 `play/` 로 복사하지 않는다 —
브라우저는 `compile()` 을 쓰지 않아 무관하다). **루트의 `source-migration/source-stage-runtime.js`
를 쓰고 데이터만 `play/data/` 에서 읽으면 된다.**

### 가능한 작업

| 작업 | 왜 가능한가 | 가치 |
|---|---|---|
| ~~현재 런타임 기준 8인 공략 경로 재녹화~~ | ✅ 2026-10-11 완료 | 9/10 라운드 입력 전용 클리어, 4-3 불가. `whole-route-replay-report.json` |
| **10라운드 사람 플레이 테스트** | 라이브 사이트만 열면 된다 | 4–3, 4–4, 5–2, 10–2, 11–4 는 **사람이 클리어해본 적이 없다**. "깰 수 있는 난이도인가"를 확인 |
| 카메라·네트워크 쪽 작업 | 해당 테스트가 로컬 데이터 없이 돈다 | 카메라의 원작 구속 미이식 건 등 |

### 불가능한 작업
새 장치 구현, 기존 장치 검증, 스테이지 데이터 재추출 — 전부 설치본 + 역어셈블이 필요하다.
`*.local.json` 을 읽는 테스트 14개도 돌지 않는다.

---

## 품질 쪽 (라운드 수와 별개)

- **원본 일치 검수 0건.** 4–3, 4–4, 5–2, 10–2, 11–4는 사람이 원작과 나란히 돌려본 적이 없다.
- 카메라의 원작 구속(플레이어를 화면 안에 가두기) 미이식 — 극단적으로 흩어지면 맵 밖이 보인다.
- 8인 공략 재녹화 완료(9/10, 4-3 클리어 불가). 회귀 판정은 `whole-route-replay.cjs --check`.
