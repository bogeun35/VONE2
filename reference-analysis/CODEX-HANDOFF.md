# Codex 인수인계 — Claude 가 하던 "등록·연결·배포"까지 이어받기

> 2026-10-13, Claude 세션 만료 직전 작성. 이 문서를 읽은 Codex 세션 **하나**가 리드 역할을 맡는다.
> 공통 규칙은 [`AGENTS.md`](AGENTS.md) 그대로 유효하다(상수를 지어내지 않는다, 확정 못 하면 throw).

## 현재 상태

- **라이브 17라운드**: 1-1 1-2 1-3 1-4 4-1 4-3 4-4 5-2 10-2 11-4 7-2 10-1 10-4 13-1 11-2 12-3 3-2
- 배포본 `v=20261013-10`, chamchicode `0751918`. 작업 저장소 VONE2 `fa2e6e89`.
- 테스트 478건 전부 통과(`node --test source-migration/*.test.cjs`, `reference-analysis` 에서).
- 남은 월드 43개. 최신 차단 목록: `node source-migration/scan-remaining-work.cjs` → `remaining-work.json`.

## 리드 세션이 할 일 (우선순위)

1. **14-3 연결** — `source-dossun-devices.js` + `source-playerblock-devices.js` 는 모듈 단위로 2..8인 컴파일된다.
   필요한 런타임 작업: 새 입력 "input9"(쏘기 버튼, 키 하나 추가 — 아래 `down` 추가한 방식 참고),
   총알/블록 상태, 이벤트 65/66, `moveActors` 콜백, `cameraAreaRaw`. 두 모듈의 `integration` 필드가 계약이다.
2. **5-1 열기** — `source-coin-devices.js`(완성, 미등록) + `WeightedLift`.
   WeightedLift(=NormalWeightedLiftComponent)의 슬롯 맵은 `source-lift-devices.js` 의 `unresolved.siblingSlotMaps`
   에 주소까지 적혀 있다. 그 모듈이 거부하던 "1/65536 배수가 아닌 슬롯"(datas[4]=-0.1)은 이제 풀렸다 —
   AGENTS.md "Established facts" 의 float→FP 변환(`fp_raw`)을 쓰면 된다.
3. **7-3 열기** — `source-blackout-devices.js`(완성, 미등록) + 위 WeightedLift + Bridge(이미 해독됨).
   Blackout 은 시야만이 아니라 이벤트 53 으로 **일반 액터를 일시정지**시킨다(장치 자신은 계속 돈다).
4. **바로 등록 가능한 부품**: Text, Coin, CheckPoint, TouchEnergy (전부 2..8 컴파일, 각자 `integration` 참고).
   단독으로 라운드를 열지는 않지만 여러 스테이지의 차단 목록에서 빠진다.
5. **12-4** — MoveWall 은 "탄 것 같이 옮기기"(`source-move-contact.js`, 부분 완료)가 끝나야 한다.

## 모듈 하나를 런타임에 등록하는 법 (Claude 가 매번 한 순서)

예시는 커밋 `0330b99e`(11-2), `a73f36a2`(12-3), `fa2e6e89`(3-2) 를 그대로 보면 된다.

`source-migration/source-stage-runtime.js`:
1. 맨 위 factory 의 `require(...)` / `root.SourceXxx` 목록과 함수 인자 목록에 추가
2. `compile()` 안: `const xs=Xs.compile(t.actors,count,{})`
3. `supported` Set 에 `...Xs.supportedTypes`, `missingMechanics` 에 `...(xs.warnings||[])`
4. compile 반환 객체에 `xs`, `create()` 에 `xState:Xs.create(compiled.xs||Xs.compile([],count,{}))`
5. 고체가 있으면 `baseSolids()` 에 `...Xs.solids(s.xState)`
6. `tick()` 안에서 모듈의 `integration.order` 대로 `beforeStep`/`afterStep` 호출. 사망은
   `s.status='dead';s.deaths++;s.failure={playerId,reason:'한국어 사유'};return;`
7. 스테이지 화이트리스트(`compile` 첫 줄의 배열)에 stageId 추가

그리고:
- `package-source-play.cjs`: 복사 목록에 모듈 파일, `stages` 배열에 `{id,title}` 추가
- `deploy-source-play.cjs`: `app` 목록에 모듈 파일
- `play/index.html`: `<script src="모듈.js?v=20261010-01">` 를 `source-stage-runtime.js` 보다 앞에
- `play/online.js`: `DEVICE_STATES` 에 `['xs','xState']` — **빠뜨리면 온라인 동료 화면에서 장치가 멈춘다**
- `play/play.js`: 렌더링(안 그리면 안 보인다). `scan-remaining-work.cjs` 의 `MODULES` 에도 추가

플레이어를 바꾸는 장치용 공통 필드(이미 런타임이 지원): `p.inputLocked`(입력 무시), `p.grayscale`,
`p.onPole`, `p.walkSpeed`(개인 걷기 속도), `p.windDx`(한 틱짜리 수평 오프셋). 새 입력 키를 추가할 땐
`play/play.js` 의 입력 객체 2곳 + `play/network.js` 의 `lastInput` + `whole-route-kit.cjs` 의 키 목록.

## 검증 → 배포 → 커밋

```
cd reference-analysis/source-migration
node package-source-play.cjs                 # stages 수와 조합 수 출력
node --test *.test.cjs                       # 전부 통과해야 함
node -e "..."                                # 해당 스테이지를 R.create 후 R.step 으로 몇 백 틱 돌려 동작 확인
node deploy-source-play.cjs 20261013-11      # 버전 올리며 배포 클론에 복사 (참조 누락 시 스스로 실패)
cd ../../deploy-chamchicode && git add -A && git commit -m "..." && git push    # 라이브 반영
cd .. && git add reference-analysis/... && git commit -m "..." && git push       # 작업 저장소
```
커밋 메시지는 한국어로, 무엇을 원작에서 확인했고 무엇이 근사인지 적는다. 끝에
`Co-Authored-By:` 줄은 각 도구 관례대로.

## 열린 질문 (중요한 순)

1. **옆으로 움직이는 발판이 탑승자를 데려가는가.** 모듈 근거로는 MoveContactActor 가 X 를 안 넘긴다
   (리프트·선로 리프트 둘 다). 하지만 플레이어 쪽에 바닥 속도를 물려받는 별도 경로가 있는지는
   아무도 확인 안 했다. 10-4·3-2 체감에 직결. PlayerComponent.OnUpdate 쪽을 볼 것.
2. DamageRect 의 활성 조건 mask 3 에 지형도 포함되는지(지금은 플레이어만 봄).
3. `source-move-contact.js` 부분 완료 — 원작 충돌 캐시 생성과 타입별 콜백 근거.
4. 11-2 기둥: 원작은 좌/우로 기둥 반대편(52px)으로 도는 것으로 보이나 미구현, 탑승자끼리 충돌 없음.
5. 새로 연 라운드(10-1 10-4 13-1 11-2 12-3 3-2)는 **사람이 끝까지 해본 적 없다**.

## 도구

- `tools/disasm.py` (어셈블리), `source-migration/resolve-string-literals.local.py` (FromString 상수)
- **Ghidra 12.1.4 + REA 6.4.0 설치됨** (의사코드). `C:\Users\user\tools\ghidra_12.1.4_PUBLIC`,
  JDK `C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot`. 환경변수 `GHIDRA_INSTALL_DIR`, `JAVA_HOME`,
  `REA_ANALYSIS_PROVIDER=ghidra` 를 주고
  `rea decompile "D:\SteamLibrary\steamapps\common\PICO PARK 2\GameAssembly.dll" 0x주소 --provider ghidra --snapshot C:\Users\user\tools\rea-snapshots\gameassembly.json`.
  첫 분석(스냅샷 생성)을 Claude 가 백그라운드로 걸어 두었다 — 결과는 `C:\Users\user\tools\rea-snapshots\first-run.md`.
  아직 의사코드 정확도는 검증 전이다: 0x1818713e0(지뢰 관찰자 ParseParameter, 퍼센트 → FP 를
  매직 나눗셈으로 계산)과 대조해 맞는지 먼저 볼 것. 의사코드는 읽기용, 근거 주소는 어셈블리로.
  이 PC 는 램 하드웨어 오류 이력이 있어 Ghidra 메모리는 6G 로 제한했다.
