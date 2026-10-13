# Codex 인수인계 — Claude 가 하던 "등록·연결·배포"까지 이어받기

> 2026-10-13, Claude 세션 만료 직전 작성. 이 문서를 읽은 Codex 세션 **하나**가 리드 역할을 맡는다.
> 공통 규칙은 [`AGENTS.md`](AGENTS.md) 그대로 유효하다(상수를 지어내지 않는다, 확정 못 하면 throw).

## 현재 상태

- **라이브 17라운드**: 1-1 1-2 1-3 1-4 4-1 4-3 4-4 5-2 10-2 11-4 7-2 10-1 10-4 13-1 11-2 12-3 3-2
- 직전 배포본 `v=20261013-10`, chamchicode `0751918`. 인수 시 작업 저장소 HEAD `e26ab37b` (런타임 마지막 변경 `fa2e6e89`).
- 로컬 등록 커밋 VONE2 `27977e2c`, 배포 클론 `4dd3947` (둘 다 미푸시). 라이브 마지막 확인 버전은 `20261013-10` / `0751918`. 원격 승인 대기, 다음 등록·배포 라운드 시작하지 않음.
- 리드 등록 라운드: Text/Coin/CheckPoint/TouchEnergy 상태·온라인 스냅샷·렌더 adapter 등록. 새 스테이지 개방 없음. 배포·커밋 결과는 아래 리드 실행 기록 참조.
- 인수 시 전체 478건 통과. 등록 라운드 테스트는 아래 실측 기록 참조(보조의 진행 중 테스트는 별도).
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

## 리드 실행 기록 (2026-10-13)

- 우선순위 1/2/3/5: 연결 보류, 근거는 아래 열린 질문 6~9. 근거 없는 콜백/AABB 접촉 캐시를 만들어 개방하지 않았다.
- 우선순위 4: Text/Coin/CheckPoint/TouchEnergy 등록. Coin event1은 다음 Update에 Key로 전달한다. CheckPoint는 충돌 당시 raw play time을 저장하고 로컬/온라인 재시작에서 authored respawn을 적용한다. TouchEnergy event43은 immortality를 존중한다.
- 기존 런타임의 AABB geometry adapter 사용이며 원작 충돌 순서·뷰 일치 검수 아님. Text textId의 실제 문자열 자산 미확정, 식별자만 보존하고 임의 번역을 그리지 않음. 새 렌더는 기존 포트 스타일의 도형이며 원작 리소스 재현이 아님.
- 등록 통합 테스트 3건 통과. release 파일 목록(기존 추적 테스트 + 등록 테스트) 491건 통과. play 테스트 9건 통과. 전체 wildcard 관측은 513건 중 512 통과/1 실패: 진행 중 DistanceConstraint 테스트에서 raw11234 vs11233 불일치. 해당 보조 파일은 수정·패키징·커밋하지 않음.
- 최종 wildcard 전체 533/533 통과: 보조 DistanceConstraint 수정 완료 후 재관측. 초기 실패 관측은 위 기록에 보존.
- 보조 소유권: 작업중-DistanceConstraint.md / 작업중-Gear.md / 작업중-SwitchTargetGroup.md 확인. 미완료 신규 파일 전부 제외.
- REA first-run.md는 빈 파일(0 bytes). 의사코드 0x1818713e0 대조는 결과 생성 전까지 보류. 원본 게임 실행 없음.
- 119개 인원별 맵 360틱 이내 무입력 smoke: 총 37,520틱, 런타임 예외 없음(사망 시 해당 실행 종료). 인간 완주 아님.
- 기존 10라운드 8인 녹화 5회 재생: 6 clear/reproducible, 1-2/1-3 미완주, 5-2 tick3862 시간초과, 4-3 기존 blocked. 실패 3개는 변경 전 HEAD 런타임으로도 같은 status/tick 확인: 이번 등록으로 인한 회귀 아님. 인수인계의 9/10 완주 주장은 현재 runtime으로 재현 안 됨.
- 배포 클론 생성 완료: v20261013-11, 168 files/17 stages, 참조 누락 없음. 배포 로컬 커밋 `4dd3947`. 원격 push는 네트워크 기본 실행 실패 후 자동 승인 심사에서 거절됨: 정확한 외부 대상에 대한 trusted user authorization 미확인 및 139파일 export 위험. 원격 라이브는 아직 v20261013-10 / 0751918이며 변경 배포 완료라고 보고하지 않음. 승인 전 우회하지 않음.

## 열린 질문 (중요한 순)

1. **옆으로 움직이는 발판이 탑승자를 데려가는가.** 모듈 근거로는 MoveContactActor 가 X 를 안 넘긴다
   (리프트·선로 리프트 둘 다). 하지만 플레이어 쪽에 바닥 속도를 물려받는 별도 경로가 있는지는
   아무도 확인 안 했다. 10-4·3-2 체감에 직결. PlayerComponent.OnUpdate 쪽을 볼 것.
2. DamageRect 의 활성 조건 mask 3 에 지형도 포함되는지(지금은 플레이어만 봄).
3. `source-move-contact.js` 부분 완료 — 원작 충돌 캐시 생성과 타입별 콜백 근거.
4. 11-2 기둥: 원작은 좌/우로 기둥 반대편(52px)으로 도는 것으로 보이나 미구현, 탑승자끼리 충돌 없음.
5. 새로 연 라운드(10-1 10-4 13-1 11-2 12-3 3-2)는 **사람이 끝까지 해본 적 없다**.

6. **14-3 런타임 계약 차단**: source-dossun-devices.js moveActors는 원작 Actor 이동·ordered contact discovery 콜백을 요구한다. PlayerBlock 65/66의 pause/hide/returnKey와 cameraAreaRaw/equipment도 필요. source-move-contact.js는 cached contacts/mapNormals 필수, 플레이어 contactResponse 미복원 시 throw한다(0x1816a1517). 센서 Map.Move 결과를 단순 바닥 AABB로 대체하지 않았다. 모듈 컴파일 성공을 라운드 개방으로 집계하지 않음.
7. **5-1 수직 리프트 차단**: 실제 2/8인 모두 moveDirection.Y=-310, X=0. -0.1의 FP 변환은 확정(0x180554310 → 0x18163fcb0 → 0x18163fc40)이나 수직 IsEnableMoveContactActor gate와 플레이어 transport callback은 별도 미확정이다. fractional refusal 해제만으로 개방 불가.
8. **7-3 차단**: 실제 WeightedLift Y=-194(2인)/-224(8인), X=0. 위 수직 transport가 필요하다. Blackout event53의 일반 액터 일시정지 dispatcher가 기존 런타임에 없으므로 시야만 연결하지 않음.
9. **12-4 차단**: MoveWall transport는 원작 contact cache 및 타입별 callback 필요(source-move-contact.js / move-contact-report.json). AABB 새 overlap/sweep를 원작 캐시로 주장하지 않음.
10. **수평 carry 추가 조사**: Player.OnUpdate 0x1816c0010 및 OnUpdate_Default 0x1816c3060를 정적 disasm으로 확인. checkIceFloor, calcLittleStep, calcScreenEndWalkVeloX 및 virtual call 0x1816c326d가 있으므로 이 함수 표면만으로 바닥 속도 경로 부재를 단정할 수 없다. 10-4/3-2 동작은 변경하지 않았고 질문 1 유지.

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
