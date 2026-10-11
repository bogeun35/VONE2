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
| 방향0 접촉 판정 | 원작보다 좁게 유지(의도적) | 원작은 단순 겹침인데 현재는 "착지 상태로 발이 밴드 안". 넓히려면 8인 루트 재녹화가 선행돼야 하는 별개 작업 |

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

**회귀 판정은 이 두 가지로 한다** — `whole-route-input-replay.json`은 쓰지 말 것(HANDOFF 함정 3):
1. 기존 라운드 전 변종의 compile 결과 JSON을 새 필드 제외하고 **바이트 비교**
2. 같은 의사난수 입력을 수십 회 먹여 status/ticks/플레이어 좌표·속도/스위치 상태를 **전부 비교**

**배포 전 반드시 확인할 것**:
- 새 라운드가 **무입력 상태에서 언제 어떻게 죽는지** 측정하고 그게 설계인지 판단
  (4–3은 1.4초, 11–4는 5.8초, 5–2는 15초에 죽는 게 **정상**이다)
- 새 장치가 **화면에 보여야 하는 정보**를 내는지. `play/play.js`에 렌더러가 없으면 추가할 것.
  5–2 때 카운트다운 HUD가 없어서 "보이지 않는 시계에 죽는" 빌드가 나갈 뻔했다
- 새 장치 상태가 **`online.js`의 `DEVICE_STATES`에 등록**됐는지.
  호스트만 시뮬레이션하므로 빠진 상태는 참가자 화면에서 얼어붙는다

---

## 품질 쪽 (라운드 수와 별개)

- **원본 일치 검수 0건.** 4–3, 4–4, 5–2, 10–2, 11–4는 사람이 원작과 나란히 돌려본 적이 없다.
- 카메라의 원작 구속(플레이어를 화면 안에 가두기) 미이식 — 극단적으로 흩어지면 맵 밖이 보인다.
- 현재 런타임 기준의 8인 공략 녹화가 없어 기계적 전구간 회귀 판정 수단이 없다.
