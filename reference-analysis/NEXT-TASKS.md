# 다음 작업 — 바로 착수용

> 2026-10-13 기준. 먼저 [`HANDOFF.md`](HANDOFF.md)를 읽을 것(저장소 구조·재생성 명령·함정 목록).
> 수치는 전부 `source-migration/remaining-work.json` 실측이다. 추정이 아니다.
> 그 파일은 `node reference-analysis/source-migration/scan-remaining-work.cjs` 로 다시 만든다.

**현재**: 런타임 연결 **14라운드** / PP2 월드 60개. 남은 46개, 고유 차단 요소 94종.
테스트 234건 전부 통과.

---

## ⚠️ 순위를 매길 때 틀리는 두 가지

둘 다 실제로 틀린 순위를 만들어 냈다. `scan-remaining-work.cjs` 는 이 두 함정을 피하려고 존재한다.

**1. `stageInitParamList[0]` 만 읽으면 안 된다.**
스테이지는 변종을 여러 개 싣고, 어느 것이 살아나는지는 인원수가 결정한다
(`population-rules.selectVariant`). `needPlayerCount: 5` 인 변종은 4인 이하에서 쓰이지 않고
다른 액터 목록이 올라온다. 10-1 은 변종 둘이 대기 시간을 서로 다르게 적어 뒀다.

**2. `compile()` 이 던지는 메시지로 순위를 매기면 안 된다.**
장치 모듈이 미지원 타입 검사보다 **먼저** 돌기 때문에, 먼저 걸린 가드가 그 뒤의 미지원 목록을
가려 버린다. `st_w_07_03` 은 "Bridge 가드 하나만 남았다"처럼 보였지만 실제로는 장치 3종이 더 필요하다.

**3. "최다 차단 = 최우선"도 아니다.**
`Text` 는 10개 스테이지를 막는 최다 차단 액터지만 **등록해도 새로 열리는 라운드가 0개**다.
지금 혼자서 라운드를 여는 타입은 **`WeightedLiftEx` 하나뿐**이다(`remaining-work.json` 의 `byType[].opensAlone`).

---

## 우선순위

### 1순위 — 장치 1종이면 열리는 곳: 지금은 없다

`WeightedLiftEx` 로 `st_w_10_04` 를 열면서 1종 구간이 비었다. 이제 최단 거리는 2종이다.

### 1순위 — 2종이면 열리는 곳 (8개)

`03_02`(DamageRect, LinePathLift) · `04_02`(Gear, SwitchTargetGroup) ·
`11_02`(FloatingThorn, PoleLadder) · `12_01`(GoKart, Stick) · `12_04`(MoveWall, SpeedSwitch) ·
`13_03`(RallyController, RallyMallet) · `13_04`(FakePlayer, FakeTimer) ·
`14_03`(Dossun, PlayerBlockGun)

고를 때 참고:

- **`SwitchTargetGroup`** 은 `04_02`·`02_03`·`06_04`·`15_03` 네 곳에 있다. 이름대로면
  스위치 이벤트를 묶음에 중계하는 얇은 장치라 재사용 효율이 가장 좋다. 짝은 `Gear`.
- **`SpeedSwitch`** 는 `12_04` 와 `12_03` 양쪽에 있다.
- **`LinePathLift`** 는 `03_02`·`02_04`·`03_03` 에 있고 `LinePathLiftComponent.ParseParameter
  0x1818785b0` 이 `Frame.GetPlayerIndexCount` 를 쓴다(인원 배율 있음). 다만 `03_02` 의
  datas[4]=2.3335 가 "1/65536 배수가 아닌 슬롯" 거부에 걸린다 — 아래 항목 참고.
- 지뢰 라운드에서 만든 **플레이어 입력 잠금**(`p.inputLocked` / `p.grayscale`)은
  다른 장치도 쓸 수 있다. 원작에서 조작을 빼앗는 장치가 또 나오면 그대로 재사용할 것.

### 2순위 — 한 번에 2라운드

`CannonPlayer` + `ThrowBallBasket` + `ThrowBallController` 3종이면 **`st_w_08_02`와 `st_w_08_04`가
동시에** 열린다. (`st_w_08_01`/`08_03`은 `TargetPlayer, BasketPlayer, AppleController, Apple`
4종으로 또 한 쌍이다.)

`Blackout` + `BlackoutController` 는 5곳(`03_01 07_03 09_01 09_03 15_02`)에 걸쳐 있지만
어디서도 단독으로 라운드를 열지 않는다. `07_03` 은 이 둘에 `WeightedLift` 까지 있으면 열린다.

---

## 진행 중 (다른 작업자가 손대던 것)

| 항목 | 상태 | 해야 할 일 |
|---|---|---|
| `source-text-devices.js` | 테스트 17건 통과, **리포트 없고 미등록** | 근거 리포트를 쓴 뒤 등록. 단독으로는 라운드가 안 열리니 급하지 않다 |
| `Blackout` / `BlackoutController` | **착수만 하고 아무 파일도 안 남았다** | 처음부터. 먼저 답할 질문: Blackout 이 시뮬레이션(충돌·사망·이벤트)에 영향이 있는지, 아니면 시야만인지. 시야만이면 어둠 상태를 모듈이 내보내 렌더러가 쓰게 하고 스테이지를 막지 말 것 |

## 미완성으로 남은 것

| 항목 | 상태 | 해야 할 일 |
|---|---|---|
| 방향 2(LEFT) 스위치 | 바이너리·static 이름으로만 확정 | 월드에 인스턴스 0개라 실데이터 검증 불가. 쓰는 스테이지가 생기면 확인 |
| `ForTopView` 사각형 | 미적용 | `StageComponent.IsTopViewSort` 비트를 **세팅하는 코드를 못 찾았다**(호출지점 0개). **탑뷰 스테이지를 연결하기 전에 반드시 재확인** |
| 방향0 접촉 판정 | 원작보다 좁게 유지(의도적) | 원작은 단순 겹침인데 현재는 "착지 상태로 발이 밴드 안". 넓히면 `whole-route-replay.cjs --check` 로 영향 라운드를 보고 재녹화 |
| 4-3 열쇠 | **열쇠는 닿을 수 있게 고쳐졌다. 라운드가 실제로 클리어되는지는 미확인** | 열쇠가 authored 위치에 머물던 것이 원인이었다 — 원작은 `KeyComponent.ParseParameter` 가 인원수에 따라 스폰 위치를 옮긴다(`key-reach-report.json`). 2인 (224,375) 로 지형 밖이다. 다만 틈 아래 전기(x 48..864)는 그대로이고 **사람이 클리어한 적은 아직 없다** |
| 10-1 (새 라운드) | 컴파일·판정·열쇠 개방까지 기계 검증됨. **사람이 해본 적 없음** | 8인에서 합 3.20초 안에 전원이 눌러야 한다. 반응속도 요구가 사람에게 공정한지 확인 필요. 근거 `countup-device-report.json` |
| 13-1 (새 라운드) | 추첨·조작권 이동·사망·열쇠 개방까지 기계 검증됨. **사람이 해본 적 없음** | 12칸 중 지뢰 1개에 8개를 밟아야 한다. 사람에게 공정한 확률인지 확인 필요. 근거 `landmine-device-report.json` |
| 10-4 (새 라운드) | 인원별 탑승 인원 요구·이동·충돌 기계 검증됨. **사람이 해본 적 없음** | 8인이 192px 발판에 7명을 올릴 수 있는지는 미확인. 근거 `lift-device-report.json` |
| 세로 WeightedLift | **거부함(추측하지 않음)** | `MoveLift` 가 `ActorComponent.IsEnableMoveContactActor 0x1816a15c0` 로 세로 이동을 막는데 그 함수를 역어셈블하지 않았다. 없이 옮기면 탑승자를 천장으로 밀어 넣는다. 세로 액터 6개 + `WeightedLiftSingle` 3개가 여기 걸려 있다 |
| 1/65536 배수가 아닌 슬롯 | **거부함(추측하지 않음)** | 애셋이 평범한 소수로 적어 두는데 FP 변환의 절삭 방향이 확정되지 않았다. 걸리는 값: `st_l_04_04` datas[9]=1.1, `WeightedLift` datas[4]=-0.1(05_01·07_03), `LinePathLift` datas[4]=2.3335(03_02) |
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
