# 참치파크 (PICO PARK 1·2 이식) — 인수인계

> 2026-10-11 기준. 다른 PC·다른 세션이 이 문서만 읽고 이어서 작업할 수 있도록 쓴 것.
> 수치는 전부 실측이며 근거 없는 값은 "미확정"으로 표시했다.

**목표**: 설치된 PICO PARK 1·2를 **원작과 완전히 동일하게** 웹으로 이식.
**라이브**: https://bogeun35.github.io/chamchicode/coop.html

---

## 1. 지금 어디까지 됐나

| 항목 | 수 | 비고 |
|---|---|---|
| 원작 데이터 추출 | PP2 94스테이지 / PP1 별도 | 무손실 왕복 검증됨 |
| **런타임 연결 라운드** | **10** | 2편 1-1~1-4, 4-1, 4-3, 4-4, 5-2, 10-2, 11-4 |
| 구현된 액터 타입 | 28 | PP2 월드에 등장하는 건 126종. Switch 는 방향 0/1/2/3 전부 지원 |
| 테스트 | 17파일 177건 통과 | `*.test.cjs` |
| 원본 일치 검수 | **0건** | 사람이 원작과 나란히 돌려본 라운드 없음 |

**데이터 확보 ≠ 런타임 연결 ≠ 원본 일치 검수.** 세 숫자를 절대 한 숫자로 합쳐 보고하지 말 것.
이전 작업자가 "플레이 가능한 맵 94개"라고 했던 것은 전부 같은 평지 템플릿 하나였다(`rebuild/demo-stages.js`).

---

## 2. 저장소 두 개의 관계

| 저장소 | 역할 | 경로 |
|---|---|---|
| **VONE2** (이 저장소) | 작업 원본: 런타임·장치 모듈·테스트·추출 스크립트·분석 리포트 | `reference-analysis/` |
| **chamchicode** | 배포 전용. GitHub Pages로 서비스됨 | 별도 클론 `deploy-chamchicode/` |

`deploy-chamchicode/`는 **VONE2에 포함되지 않는 별도 클론**이다. 없으면 직접 클론해야 한다:
```
git clone https://github.com/bogeun35/chamchicode.git deploy-chamchicode
```

### 로컬에만 있는 것 (git에 없음, 반드시 재생성 필요)
`.gitignore`로 제외했다. 전부 **설치된 게임에서 추출**하는 것이라 게임만 있으면 재생성된다.

| 파일 | 만드는 법 |
|---|---|
| `installed-stage-decoded.local.json` (16MB) | `python decode-installed-stages.py` |
| `pp1-stage-decoded.local.json` (4.3MB) | `python pp1-decode-installed.py` |
| `source-geometry.local.json` | `python export-source-geometry.py` |
| `source-world.local.json` | `node build-source-world.cjs` |
| `*-method-index.json`, `*.local.txt` | `inspect-*.py` 류 |
| `native-loader-structure.json` | `python inspect-native-loader.py` |

필요한 설치본: `D:\SteamLibrary\steamapps\common\PICO PARK 2` 와 `PICO_PARK_ONLINE`.
`tools/capstone`(역어셈블용 파이썬 패키지)도 git에 없다.

---

## 3. 명령어

작업 디렉터리는 `reference-analysis/source-migration/`.

```bash
# 테스트 전부
for f in *.test.cjs play/*.test.cjs ../rebuild/camera.test.cjs; do node "$f"; done

# 스테이지 데이터 생성 (play/data/<stageId>/<인원>.json) + 모듈을 play/ 로 복사
node package-source-play.cjs

# 배포 클론으로 복사 + 캐시 버전 올리기 (페이지 참조 누락을 검사해 404 빌드를 막는다)
node deploy-source-play.cjs 20261011-07

# 온라인 사망→즉시 재시작 검증 (실제 Chrome 2대 + 실제 Firebase RTDB)
node check-source-death-restart.cjs   # 결과: play/source-death-restart-report.json

# 온라인 동시 입력·다시시작 검증 (브라우저 컨텍스트 N개 = PC N대 + 실제 Firebase RTDB, 무음)
# 두 번째 인자로 라이브 URL 을 주면 배포본을 검사한다
PUPPETEER_CORE=<puppeteer-core 경로> BROWSER_URL=http://localhost:9224 node check-source-online-input.cjs 2   # 3, 8 도
# 결과: play/source-online-input-report-<N>p.json

# 남은 작업 현황 (이 문서의 수치 출처)
cat remaining-work.json

# 8인 공략 회귀 판정: 10라운드 녹화 입력만 새 상태에 5회 재생, 틱별 해시 비교
node whole-route-replay.cjs --check   # 리포트까지: node whole-route-replay.cjs → play/whole-route-replay-report.json
node whole-route-record.cjs st_w_04_01   # 어긋난 라운드만 재녹화(인자 없으면 전부, ROUTE_CACHE=<json> 은 탐색 구간 캐시)
```

`package-source-play.cjs` 는 `status.json` 의 `functionalRoute` 노트를 하드코딩으로 덮어쓴다. 패키징 뒤에는 `node whole-route-replay.cjs --status` 로 다시 쓸 것.

배포는 `deploy-chamchicode/`에서 커밋·푸시하면 GitHub Pages에 1~2분 뒤 반영된다.

---

## 4. 확정된 원작 근거 (바꾸지 말 것)

### 사망선 = 맵높이 + 2400
`StageComponent.prepare3 0x18170aad0`이 `FailFallY = 맵높이×칩크기 + stageInitParam.failDownY`를 쓴다.
`failDownY`는 **월드 60스테이지 전부 0.0**이라 `QGameDefine..cctor 0x181780720`의 기본값
`statics+0x10 = 0x9600000 = 2400`이 적용된다.
런타임에서는 `killY = t.height + 2400 - 47` (47은 플레이어 앵커 오프셋, `PlayerComponent.CreateEntity 0x1816bd4e8`).

**교차검증법(재사용 가치 높음)**: 게임에 배치된 Warp 계열 볼륨 16개 중, 사망선을 `+144`로 두면 2개만
도달 가능하고 7개가 죽은 데이터가 된다. `+2400`이면 15개가 도달 가능하다. **출하된 레벨 데이터에
도달 불가능한 장치가 수두룩할 리 없다**는 논리로 상수를 검증할 수 있다.

그 결과: **2편 1-1 바닥 구멍(x 864~912)에 빠져 혼자 워프로 돌아오는 것은 버그가 아니라 원작 동작**이다.
장외 판정은 워프 **뒤**에 와야 한다 — `ActorComponent.OnPost1 0x18169e260`이 `warpProc`를 먼저 돌리고,
`CheckOutMap 0x1816a1cb0`은 워프 대기 중이면 false를 반환한다.

### 카메라는 맵 전체가 아니라 고정 창
`mapInitParam.displayTileHeight`가 1-1에서 **10타일(480px)**인데 맵은 20타일(960px)이다.
`compile()`이 이 값을 `map.view`로 기록하고 `rebuild/camera.js`가 그걸 가장 가까운 배율로 쓴다.
세로 위치는 맵 안으로 제한하되, **플레이어가 맵 밖에 있을 때는 "누구도 화면에서 사라지지 않는다"가 우선**한다.

**미이식**: 원작은 카메라가 플레이어 이동 자체를 화면 안으로 가둔다. 그래서 원작에서는 플레이어가
가로로 2700px씩 흩어지는 상황이 아예 안 생긴다. 이 구속을 이식하지 않아서, 극단적으로 흩어지면
여전히 맵 밖이 보인다.

### 장치별 근거
각 장치의 네이티브 주소·슬롯 의미·미확정 항목은 **`*-device-report.json` 30개**에 들어 있다.
리포트의 `registration` 절에 `source-stage-runtime.js`에 적용할 **앵커 문자열 + 교체 문자열**이 있어
기계적으로 적용 가능하다(§7 참조).

---

## 5. ⚠️ 함정 (여기서 여러 번 당했다)

1. **`assembly-csharp-method-index.json`에는 시뮬레이션 컴포넌트가 없다.** Unity 뷰 계층만 담는다.
   이미 구현된 `TimerComponent`·`WarpComponent`·`ThornCeilingComponent`·`BlinkBlockComponent`를
   거기서 찾으면 전부 "없음"으로 나온다. 시뮬레이션 쪽은 **`quantum-method-index.json`** 과
   `global-metadata.dat` + `GameAssembly.dll`에 있다.
2. **`EditableXxx` / `EditableXxxParam`이 메서드 1개짜리로 보이는 것은 "동작 없음"의 근거가 아니다.**
   빌드가 모든 Editable* 타입의 필드를 스트립했다. 동작 없음을 주장하려면 `DummyRect`를 판정한
   방식(`thorn-ceiling-device-report.json` 참조)처럼 Component/_Prototype/ParseParameter/Creator/View가
   전부 없고 `ActorFactoryComponent.CreateActor 0x1816a35cc`가 음수 인덱스에서 아무것도 안 만든다는
   것까지 확인해야 한다.
3. **8인 공략 녹화는 런타임이 바뀌면 깨진다.** 2026-10-11 현재 런타임 기준으로 10라운드를 재녹화했다
   (`whole-route-record.cjs` → `play/whole-route-input-replay.json` 의 `rounds[]`). 9라운드가 입력만으로 클리어되고
   5회 재생이 틱 단위로 같다. **4-3 은 현재 런타임으로 클리어 불가**(열쇠 충돌 상자가 지형 안)라 `inputOnlyClearVerified`
   는 false 다. 런타임·데이터를 바꾸면 `whole-route-replay.cjs --check` 로 판정하고 어긋난 라운드만 재녹화할 것.
4. **파이어베이스 방 상태 스트림은 "무엇을 보냈는지"의 증거가 못 된다.** 로컬 낙관적 쓰기와 지연된
   서버 확인이 섞여 `dead→game→dead→game`처럼 보인다. 발행 로그(`net.publish` 후킹)와 상대방이
   관측한 상태로 판정해야 한다. `check-source-death-restart.cjs`가 그렇게 되어 있다.
5. **브라우저 탭이 백그라운드면 Firebase 연결이 끊긴다.** 그래서 온라인 검증은 브라우저 패널이 아니라
   Playwright(`--disable-background-timer-throttling`)로 해야 한다.
6. **배포 목록에 새 모듈을 빠뜨리면 404 빌드가 나간다.** `deploy-source-play.cjs`에 페이지 참조 누락
   검사를 넣어뒀다. 실제로 두 번 잡혔다.
7. **이전 작업자가 지어낸 상수를 "원작"이라 주장하는 테스트를 넣어둔 전력이 있다.** 상수에 근거
   주석이 없으면 의심할 것.
8. **방 노드에 트랜잭션이 걸린 동안 그 아래에 `set()`을 하면 Firebase가 트랜잭션을 `'set'`으로 취소한다.**
   v2는 방장이 스냅샷을 초당 12번 방 루트 트랜잭션으로 올리면서, 자기 입력을 초당 8번 같은 방
   `inputs/`에 `set` 했다. 그래서 발행이 거의 다 취소되다가 몇 초 뒤 완전히 멈췄다(라이브 실측: 참가자 화면
   스냅샷 0건, 참가자 입력 0틱 적용, 방장이 R을 눌러도 참가자 화면은 이전 판). 사용자 증상
   "한 사람이 키보드가 되면 다른 사람 키보드가 안 됨", "다시시작도 안 눌림"이 이것이다.
   **v3(2026-10-11)**: 입력은 방 밖 `games/park_source_inputs_<코드>/<id>`, 방장은 자기 입력을 DB에 쓰지 않고
   바로 적용, 다시시작은 입력 패킷의 `restartSeq` 카운터로 누구나 요청하고 방장이 적용.
   같이 고친 것: 재시작이 인원 순서를 바꾸면(시작=입장순, 재시작=id순) 참가자 화면이 직전 판 스냅샷을
   계속 덮어써 깜빡이던 것, 재시작 직후 예전 점프가 다시 눌리던 것, 클리어 후 `대기실` 버튼이
   대기실 대신 같은 판을 다시 시작하던 것. 검증은 `check-source-online-input.cjs`
   (각자 보낸 입력과 방장이 틱마다 적용한 입력으로 판정, 2·3·8인).
   **한 PC의 창/탭 두 개로는 둘이 같이 못 한다**: 같은 브라우저의 탭 두 개는 `localStorage` 의 참가자 id를
   같이 써서 두 번째 탭이 첫 탭 자리를 뺏는다("다른 창에서 같은 자리로 접속했습니다", 실측). 브라우저를
   달리해도 키 입력은 앞의 창 하나에만 가고, 뒤로 간 탭은 프레임이 멈춰 1초 뒤 그 사람 입력이 0으로
   처리된다(방장 탭이면 게임 전체가 멈춘다). 구조적 한계다. 한 PC 협동은 로컬 분할 조작(미구현)으로 풀 일.
   라이브 검증 결과: `play/source-online-input-report-{2,3,8}p.json` (20261011-10, 전부 통과).

---

## 6. 🔴 미완성 상태 (가장 먼저 처리할 것)

2026-10-11에 팀원 4명이 **리포트를 쓰기 직전 세션 한도로 끊겼다.** 코드는 남았는데 **근거 문서가 없다.**
테스트 163건은 통과하고 배포된 9라운드는 영향 없음(확인함). 하지만 근거 없는 변경이라 그대로 두면 안 된다.

| 남긴 것 | 파일 | 상태 | 조치 |
|---|---|---|---|
| ~~Thorn 이동 = 틱당 `속도²`~~ | `source-devices-runtime.js` | ✅ **해결(2026-10-11)** — 속도²가 맞음 | `thorn-speed-report.json` |
| ~~`DeadTimer` 지원~~ | `source-switchtimer-devices.js` | ✅ **해결(2026-10-11)** — 테스트 5건 추가 | `deadtimer-device-report.json` |
| **`Text` 모듈** | `source-text-devices.js` + 테스트 | 작성됨, **런타임 미등록 · 리포트 없음** | 최다 차단(10스테이지). 리포트 없이 등록하지 말 것 |
| **`WeightedLiftEx`** | — | 시작만 함 | 2순위(6스테이지). `st_w_10_04` 의 유일한 차단 요소. 출발점은 `switch-direction-report.json` 의 미확정 1번 |

### 6.1 Thorn 속도 쟁점 — ✅ 해결됨
**판정: 틱당 `m_Speed²`가 맞다.** 근거 전문은 `thorn-speed-report.json`.

- phase1 `0x181721482`가 방향표에서 **FP 단위벡터**를 읽고, `0x181721498`/`0x1817214ab`가 두 성분을
  각각 m_Speed로 곱해(`imul [rsi+0x40]` + `sar 0x10`) `0x1817214c1`에서 `m_Velo = 단위 × 속도`로 저장
- phase2 `0x181721587`/`0x18172159d`가 그 m_Velo에 **또 m_Speed를 곱해** 위치에 더함 → 틱당 `속도²`
- `m_Distance`는 틱당 `m_Speed`만 누적(`0x1817215d1`)
- `calcMoveDistance 0x181721910`은 `|가장자리 − 위치|`에 **0xc80000(=200) 마진만 더하고**(`0x181721a28`)
  **m_Speed로 나누지 않는다**. 즉 이 카운터는 이동 거리가 아니라 **수명**이다.

⚠️ **다시 6px/틱으로 "고치지" 말 것.** 작업 중 한 번 되돌렸다가 복원했다. 되돌린 근거는
"6px/틱이면 가시가 맵 바닥에 정확히 멈춘다"였는데, 역어셈블 **꼬리의 +200 마진을 못 본** 계산이었다.
실제 목표값은 392라 어느 해석에서도 바닥에 멈추지 않는다.
**교훈: 숫자가 깔끔하게 맞아떨어지는 것은 증거가 아니라 가설이다. `ret`까지 읽고 판단할 것.**

## 7. 장치 하나를 추가하는 절차

1. 대상 선정 — `remaining-work.json`의 `stages[].blockers`를 보고 고른다.
2. 바이너리에서 동작 복원 — `quantum-method-index.json`에서 `XxxComponent`를 찾고
   `inspect-devices.local.py` 방식으로 역어셈블. **추측 금지, 근거 없으면 "미확정"으로 남길 것.**
3. 모듈 작성 — `source-xxx-devices.js`. 인터페이스:
   `compile(actors,count)`, `create(compiled)`, `solids(state)`, `beforeStep(state,ctx)`,
   `afterStep(state,ctx)`, `supportedTypes:[...]`. 패턴은 `source-gate-devices.js`(움직이는 발판),
   `source-bridge-devices.js`(치명적 장치, `afterStep`이 `deadPlayerIds` 반환) 참고.
4. 테스트 작성 — `node:test`, **추출된 실제 액터 데이터로**.
5. `source-stage-runtime.js`에 등록 — 보통 다음 9~10곳:
   UMD 의존성 / 팩토리 인자 / 화이트리스트 / `compile()` 호출 / `supported` 집합 /
   `missingMechanics` 경고 / compile 반환 객체 / `create()` 상태 / `baseSolids()` /
   `tick()`의 beforeStep·afterStep 체인. 기존 리포트의 `registration` 절이 정확한 앵커를 준다.
6. `package-source-play.cjs`의 `stages` 배열과 복사 목록, `deploy-source-play.cjs`의 `app` 목록,
   `play/index.html`의 `<script>`에 추가.
7. **2~8인 전부 컴파일되는지** 확인(일부 인원만 되면 패키저가 throw 한다), 무입력 즉사 여부 확인,
   전체 테스트 통과 확인 후 배포.

---

## 8. 다음 작업

**→ [`NEXT-TASKS.md`](NEXT-TASKS.md) 를 보라.** 우선순위, 각 작업의 출발점 주소, 검증 규약이 들어 있다.

핵심만: **"최다 차단 액터 = 최우선"이 아니다.** `Text` 는 10개 스테이지를 막지만 등록해도
새로 열리는 라운드가 **0개**다(실측). 라운드를 열려면 `remaining-work.json` 의
`stages[].blockers` 에서 **남은 종류 수가 적은 스테이지**를 골라야 한다.

지금 가장 가까운 것: `st_w_07_02`(Bowwow2Enemy 1종), `st_w_10_04`(WeightedLiftEx 1종,
출발점 주소 확보됨), `st_w_07_03`(새 장치 없이 가드 2개만 — 가장 싼 유형).

### 품질 쪽 남은 것
- 원본 일치 검수 0건 — 4-3, 4-4, 10-2, 11-4는 **사람이 클리어해본 적이 없다**.
- 카메라의 원작 구속(플레이어를 화면 안에 가두기) 미이식.
- 8인 공략 재녹화 완료(9/10). 버그 후보 2건 — 4-3 열쇠가 지형 안이라 클리어 불가, 5-2 타이머 스위치가
  +2초 대신 DeadTimer 를 멈춤. 근거는 `play/whole-route-replay-report.json` 의 `bugCandidates`.
