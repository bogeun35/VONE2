# Codex 인수인계 — Claude 가 하던 "등록·연결·배포"까지 이어받기

> 2026-10-13, Claude 세션 만료 직전 작성. 이 문서를 읽은 Codex 세션 **하나**가 리드 역할을 맡는다.
> 공통 규칙은 [`AGENTS.md`](AGENTS.md) 그대로 유효하다(상수를 지어내지 않는다, 확정 못 하면 throw).

## 현재 상태

> **2026-10-17 저녁 (Claude)**: 라이브 **22라운드**, 배포 `v=20261017-05` / chamchicode `ddb3d46`.
> 1-1 1-2 1-3 1-4 4-1 4-3 4-4 5-2 10-2 11-4 7-2 10-1 10-4 13-1 11-2 12-3 3-2 10-3 5-1 2-2 7-3 **14-3**.
> - 14-3: Dossun(쿵쿵 블록) + PlayerBlockGun(X키로 동료를 블록으로) 연결. 호스트는 `source-stage-runtime.js` 의 `dossunTick`.
> - **화면 버그 수정**: 라이브 그림은 `park-art.js` 가 그리고, `play.js` 의 `renderFlat` 은 실패 시 대체 경로뿐이었다.
>   그래서 12라운드 이후 장치(리프트·폴/가시·적·공/투수/상자·바람·선로·카운트업·지뢰 표시·암전)가 **라이브에서 안 보였다**.
>   이제 `play/source-device-art.js` 하나가 두 경로 모두에서 그린다(아래 등록 순서 참고).
> - 10-3: 열쇠가 상자에서 나중에 생기는데 "시작 시 열쇠 없음 = 문 열림"으로 처리돼 문이 처음부터 열려 있었다 → 잠긴 채 시작.
> - `check-source-play.cjs` 가 `restart()` 를 감시하지 않아 예전부터 깨져 있던 것 수정(지금 통과).
> - 테스트 2384 통과. 다음 후보(차단 1개): 03_01(SearchLight chipSize), 03_03·05_03(PlayerMagnet), 14_01, 15_01(LinePathGear).


- **최신 로컬 상태**: v20261013-12 배포 커밋 `ec50e31` 준비됨(3-2 재귀 탑승 인원 수정). 라이브는 v20261013-11 / `4dd3947` 유지. VONE2 로컬 `f69a3bfa`, `791c5a8d` 및 후속 커밋이 원격 `cec72c8e`보다 앞서며 푸시 보류. 원격 승인 심사가 다시 거절한 정확한 내역과 재개 명령은 문서 마지막 절에 있음. 이전 “현재 차단 아님” 문구는 당시 기록이다.

- **라이브 17라운드**: 1-1 1-2 1-3 1-4 4-1 4-3 4-4 5-2 10-2 11-4 7-2 10-1 10-4 13-1 11-2 12-3 3-2
- 직전 배포본 `v=20261013-10`, chamchicode `0751918`. 인수 시 작업 저장소 HEAD `e26ab37b` (런타임 마지막 변경 `fa2e6e89`).
- 등록 커밋 VONE2 `27977e2c` 및 후속 기록 `4200bd58`, 배포 `4dd3947` 모두 push 완료. 사용자의 “두 저장소 푸시 승인”을 근거로 정상 require_escalated 경로로 재시도하여 성공. 라이브 `v=20261013-11` 및 공개 source-stage-runtime.js의 로컬 일치를 HTTP 200으로 확인했다. 이전 자동 심사 거절은 아래 과거 기록이며 현재 차단이 아니다.
- 리드 등록 라운드: Text/Coin/CheckPoint/TouchEnergy 상태·온라인 스냅샷·렌더 adapter 등록. 새 스테이지 개방 없음. 배포·커밋 결과는 아래 리드 실행 기록 참조.
- 인수 시 전체 478건 통과. 등록 라운드 테스트는 아래 실측 기록 참조(보조의 진행 중 테스트는 별도).
- 남은 월드 43개. 최신 차단 목록: `node source-migration/scan-remaining-work.cjs` → `remaining-work.json`.

## 리드 세션이 할 일 (우선순위)

0. (완료 2026-10-17) 14-3, 5-1, 2-2, 7-3 은 열렸다. 아래 1~4 는 기록용.
   지금 할 일은 `node source-migration/scan-remaining-work.cjs` 의 `nearest` 순서.
1. ~~14-3 연결~~ — 완료.
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
- **그리기는 `play/source-device-art.js`** 에 함수 하나 추가 후 `draw()` 목록에 넣는다. 라이브는 `park-art.js` 가
  그리고 이 파일을 훅으로 부른다(장치=친구들 아래, `drawAbove`=친구들 위, `overlay`=화면 전체).
  `play.js` 의 `renderFlat` 에만 그리면 **라이브에서 안 보인다**(2026-10-17 까지 실제로 그랬음).
  확인은 헤드리스 크롬 스크린샷으로: 기본 그림 경로가 park-art 인지 눈으로 볼 것.
- `scan-remaining-work.cjs` 의 `MODULES` 에도 추가

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
- 당시 REA first-run.md는 0 bytes였으나, 22:32에 결과가 생성됐다. 아래 최신 충돌 코어 기록에서 0x1818713e0 대조 완료. 원본 게임 실행 없음.
- 119개 인원별 맵 360틱 이내 무입력 smoke: 총 37,520틱, 런타임 예외 없음(사망 시 해당 실행 종료). 인간 완주 아님.
- 기존 10라운드 8인 녹화 5회 재생: 6 clear/reproducible, 1-2/1-3 미완주, 5-2 tick3862 시간초과, 4-3 기존 blocked. 실패 3개는 변경 전 HEAD 런타임으로도 같은 status/tick 확인: 이번 등록으로 인한 회귀 아님. 인수인계의 9/10 완주 주장은 현재 runtime으로 재현 안 됨.
- 배포 클론 생성 완료: v20261013-11, 168 files/17 stages, 참조 누락 없음. 배포 로컬 커밋 `4dd3947`. 원격 push는 네트워크 기본 실행 실패 후 자동 승인 심사에서 거절됨: 정확한 외부 대상에 대한 trusted user authorization 미확인 및 139파일 export 위험. 원격 라이브는 아직 v20261013-10 / 0751918이며 변경 배포 완료라고 보고하지 않음. 승인 전 우회하지 않음.

## 열린 질문 (중요한 순)

1. **수평 발판 전달 경로 발견, 아직 미연결.** CollisionScene.postPushBack → updateInertia → moveForInertia가 collision currentX-preX를 전달한다(0x1817fc1c2..1d9/0x1817fc3ea). MoveContactActor X=0만으로 수평 carry 부재를 주장한 설명은 철회한다. Map.Move/UpdatePushBack/camera 보정 및 native cache/Player wakeUpCount·equipment 상태를 연결해야 한다. LinePathLift는 isInertia로 disable0x80을 설정하므로 mode를 무시한 일괄 carry도 잘못이다. 주소와 필터는 move-contact-report.json 참조.
2. DamageRect 의 활성 조건 mask 3 에 지형도 포함되는지(지금은 플레이어만 봄).
3. `source-move-contact.js` 부분 완료 — 원작 충돌 캐시 생성과 타입별 콜백 근거.
4. 11-2 기둥: 원작은 좌/우로 기둥 반대편(52px)으로 도는 것으로 보이나 미구현, 탑승자끼리 충돌 없음.
5. 새로 연 라운드(10-1 10-4 13-1 11-2 12-3 3-2 10-3 5-1 2-2 7-3 14-3)는 **사람이 끝까지 해본 적 없다**.
5a. **무대 `scale`**: `stageInitParam.scale` 이 10-1(5인 이상)·10-2·10-3 에서 1.5 인데 런타임은 무시한다.
    StageComponent 액터 배율(Actor.Initialize 0x18169cd02)이 이 값이면 그 라운드의 캐릭터·장치 크기가 원작과 다르다.
    지금은 Dossun 만 이 값을 읽는다(14-3 은 1).
5b. 14-3 호스트 근사(이름 붙여 둠): 총알은 쏜 사람과 충돌하지 않음(collideBullet 이 소유자 확인보다 먼저
    사라지기를 요청하므로 원작 레이어 필터가 자기 충돌을 안 낸다고 판단), 총알은 블록을 통과,
    PlayerBlock 은 떨어지지 않음(모듈에 가속 없음), 쿵쿵은 지형·플레이어·블록(충돌 종류 3)에서 멈춘다,
    카메라 영역 = 살아있는 플레이어 범위 ±반 화면.

6. **14-3 런타임 계약 차단**: source-dossun-devices.js moveActors는 원작 Actor 이동·ordered contact discovery 콜백을 요구한다. PlayerBlock 65/66의 pause/hide/returnKey와 cameraAreaRaw/equipment도 필요. source-move-contact.js는 cached contacts/mapNormals 필수, 일반 Player27 callback 부재는 registry에서 확인했다. PlayerMagnet72는 여전히 거부한다(0x1816a1517). 센서 Map.Move 결과를 단순 바닥 AABB로 대체하지 않았다. 모듈 컴파일 성공을 라운드 개방으로 집계하지 않음.
7. **5-1 수직 리프트 차단**: 실제 2/8인 모두 moveDirection.Y=-310, X=0. -0.1의 FP 변환은 확정(0x180554310 → 0x18163fcb0 → 0x18163fc40)이나 축 방향 IsEnableMoveContactActor core 및 일반 Player callback 부재는 해결했지만 native contact cache adapter가 미완료다. fractional refusal 해제만으로 개방 불가.
8. **7-3 차단**: 실제 WeightedLift Y=-194(2인)/-224(8인), X=0. 위 수직 transport가 필요하다. Blackout event53의 일반 액터 일시정지 dispatcher가 기존 런타임에 없으므로 시야만 연결하지 않음.
9. **12-4 차단**: MoveWall transport는 원작 contact cache 및 타입별 callback 필요(source-move-contact.js / move-contact-report.json). AABB 새 overlap/sweep를 원작 캐시로 주장하지 않음.
10. **수평 carry 초기 조사(아래 후속 발견으로 갱신됨)**: Player.OnUpdate 0x1816c0010 및 OnUpdate_Default 0x1816c3060를 정적 disasm으로 확인. checkIceFloor, calcLittleStep, calcScreenEndWalkVeloX 및 virtual call 0x1816c326d가 있으므로 이 함수 표면만으로 바닥 속도 경로 부재를 단정할 수 없다. 10-4/3-2 동작은 변경하지 않았고 질문 1 유지.

## 도구

- `tools/disasm.py` (어셈블리), `source-migration/resolve-string-literals.local.py` (FromString 상수)
- **Ghidra 12.1.4 + REA 6.4.0 설치됨** (의사코드). `C:\Users\user\tools\ghidra_12.1.4_PUBLIC`,
  JDK `C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot`. 환경변수 `GHIDRA_INSTALL_DIR`, `JAVA_HOME`,
  `REA_ANALYSIS_PROVIDER=ghidra` 를 주고
  `rea decompile "D:\SteamLibrary\steamapps\common\PICO PARK 2\GameAssembly.dll" 0x주소 --provider ghidra --snapshot C:\Users\user\tools\rea-snapshots\gameassembly.json`.
  첫 분석(스냅샷 생성)을 Claude 가 백그라운드로 걸어 두었다 — 결과는 `C:\Users\user\tools\rea-snapshots\first-run.md`.
  **첫 실행 결과(2026-10-13 22:32): 56.3분 걸려 의사코드는 나왔다**(first-run.md). 다만 스냅샷 파일이 17KB 뿐이고
  출력에 "temporary project are ephemeral" 이라 적혀 있어, Ghidra 분석 자체는 저장되지 않고 **매 실행마다 ~1시간
  재분석**할 가능성이 높다. 여러 주소를 한 세션에서 묻는 MCP 방식(`rea setup` 으로 Codex 에 등록)이 나을 수 있다.
  리드가 0x1818713e0 지뢰 ParseParameter의 퍼센트 → FP 매직 곱셈/shift22/음수 보정을
  어셈블리 0x181871571..5d0과 대조 완료했다. 의사코드는 읽기용, 근거 주소는 어셈블리로.
  이 PC 는 램 하드웨어 오류 이력이 있어 Ghidra 메모리는 6G 로 제한했다.

## 후속 정적 분석 라운드 — push 승인 이후

- 양쪽 승인된 push와 Pages v20261013-11 검증 완료(위 현재 상태). 이번 후속은 source/helper 분석 라운드이며 새 배포 버전·라운드 개방 없음. 라이브 물리와 패키지 사본은 v20261013-11 유지. source-lift-devices의 carry 설명 수정은 다음 패키징에 반영해야 한다.
- source-move-contact.js: Player27의 OnMoveByContact 부재를 registry에서 확인해 허용. PlayerMagnet72는 none assertion으로 우회하지 못하며 actorFlags0x10은 원작처럼 lookup 생략. 등록 helper0x180726c40의 .text/il2cpp 직접 E8/E9 호출은 PlayerMagnet 등록0x18177c304 한 곳.
- addContactInfo 순수 helper: collision ID 중복 보존, Up↔Up 역참조 방지, 신규 state0 append. retainsRectContact: 이미 해석된 world rectangle에 대해 normal*0.5px strict overlap predicate만 구현. 접촉 생성 전체나 callbacks/state lifecycle 구현으로 집계하지 않는다.
- helper 18/18, 전체 wildcard 592/592, Lift 별도 23/23 통과. 전체 관측에는 보조 WIP 테스트도 포함되며 보조 파일은 수정·스테이징하지 않는다. 실제 2..8인 연결/인간 완주 증거는 아니다.
- 수평 inertia는 기본 켜짐(0x1817f5bba), layer1/2/13·flags0x80 필터, gravity0x100/0x200 face 규칙, 진행 방향 선두 정렬(0x1818007d0), Player wakeUpCount(+0x11) 및 equipment 경유 이동, Map.Move→UpdatePushBack(최대4회 scan 재시작)→camera 보정까지 추적했다. 정확한 실행 helper/런타임 반영은 미완료다.
- 다음 구체적 복원 지점: updatePushBackRect0x1817f9ec0의 face 선택과 ordered collision cache, Map.Move/Map.IsContacted, fixPlayerPos0x1817fe120 및 Player 상태 연결. 이 경로 없이 supportId를 native contact cache로 바꿔 부르거나 단순 dx carry를 추가하지 않는다.
- 당시 REA first-run.md 재확인 0 bytes였음. 이후 생성 및 대조 완료는 아래 최신 기록 참조. 원본 게임 실행 없음.

## 최신 실행 코어 — Map / rectangle / inertia / contact cache

- `source-collision-map.js`, `source-collision-rect.js`, `source-collision-inertia.js`, `source-collision-scene.js`와 테스트 추가. 상세 근거·계약·미완료는 `collision-scene-report.json`.
- Map grid DDA/slide, rectangle rollback/force, 장비·수면·역중력·카메라 정책을 포함한 수평 inertia를 명시적 native collision snapshot 위에서 실행한다. `supportId`는 입력으로 사용하지 않는다. `fixPlayerPos`는 previous position 갱신이며 Actor sync가 아니다.
- Player 초기 wakeUpCount=1 확정(0x1816bd5e9). Player initCollision은 ForceSearchUp32를 실제로 켠다(0x1816bdf8b..98). X scale 절반→0.5px 검색→원래 scale 복원→cache prune/Added/Contacted를 복원했다. native baseRect/scale/pivot와 실제 callback adapter는 명시적 입력이다.
- source-move-contact 정규화는 frozen `source-distanceconstraint-math.js` LUT 사용. 대각선과 속도 투영을 지원하며 +200px 축 normal은65535일 수 있다. 종전 Math.sign 단축은 수정. LUT/sqrt와 일반 Player27 OnMoveByContact 부재를 다시 미확정으로 돌리지 말 것.
- 실제 10-4/3-2의 2..8인 선택 리프트 설정을 합성 접촉 스택에 연결해 검사했다. 원작 플레이어 전체 물리·사람 완주 검증과 다르다. 벽·천장 옆 턱·스택·inertia 비활성 mode3/4/5 포함.
- **새 구체적 연결 지점**: chunk comparator0x1818007b0는 signed priority byte+5 내림차순(Player=-1). quadtree OnUpdate0x18177eae0는 정렬하지 않고 descriptors만 제자리 갱신. updatePushBack0x1817f90c0은 i,j>i 순서와 Morton 관계를 사용한다. forced pass는 전체 좌표 snapshot을 잡고 결과1에서 좌표만 복원한다(0x1817f9880..9a53); flags는 유지. 평범한 pair 함수 반환을 완성된 phase라고 부르지 말 것.
- **남은 런타임 연결**: chunk 생성 및 같은 priority/X의 CLR 정렬 순서, pass-wide 실패 복원, scale-change pass, map-cache lifecycle, Actor 위치 동기화, 각 타입 실제 contact callbacks. live runtime 미변경, 신규 라운드·배포 없음. 14-3/5-1/7-3/12-4 해제 증거 아님.
- REA 최초 결과 first-run.md15880bytes / gameassembly.json17787bytes 확인 및 지뢰 대조 완료. 별도 `tools/LeadSelectedDecompile.java`와 Ghidra `-noanalysis`로 필요한5개 함수만 의사코드 확보. 4G heap, max-cpu2, 별도 프로젝트 `lead-ghidra.local`, `-deleteProject`; 공유 REA snapshot 변경 없음. 원본 DLL 실행 없음. no-analysis 의사코드는 타입/no-return 추론이 약하므로 assembly 근거를 유지한다.
- 최신 전체 wildcard 검사701/701 통과(보조 WIP 검사 포함). 리드 관련4개 test 파일은53건; 보조 WIP 수정·등록·커밋 없음.

## 충돌 단계 체크포인트 — 후속 세션 재개 정보

- live: https://bogeun35.github.io/chamchicode/coop.html , v20261013-11, 배포 local/remote `4dd3947`. 이 체크포인트는 라이브 변경 없음. 작업 직전 VONE2 local/remote `cec72c8e`; 아래 변경은 별도 선별 커밋한다.
- Map 요청 큐와 실제 접촉 캐시를 분리했다. forced pass 전체 위치 복원, 반복 pass, 네 모서리 scale 제한, Actor sync, actor→map contact 순서까지 `source-collision-scene.js`의 checkChunk에 연결했다. 동기화 제곱 임계값은511raw 미달/512raw 충족이다. 타입별 callback과 late dispatcher는 명시 호스트 계약이며 가짜 no-op로 채우지 않는다.
- 신규 `source-collision-phase.test.cjs`9/9, 전체 `node --test source-migration/*.test.cjs`724/724. 전체에는 보조 파일 검사가 포함된다. 실제 R.create/R.step 연결·신규 라운드·인간 완주 검증은 아직 없음.
- 다음: 완료된 `codex-briefs/CollisionBroadphase.result.md` 검토 후 scene의 treeObject/candidateCheck 및 inertia CLR 정렬에 연결. 현재 inertia는 같은X를 정렬한 뒤 host에 넘기므로 원래 cache 순서 전체를 CLR sort에 넘기는 수정이 필요하다. source-collision-broadphase의 dictionary capacity는 미확정(0x18197edc0; --raw disasm 필요). 그 다음 frozen Gear circle helper 통합, Player 실제 접촉 callbacks와 runtime bridge.
- 런타임 연결 우선 파일: source-stage-runtime.js, source-linepath-devices.js의 linePathHost, source-lift-devices.js. 3-2/10-4 실제2..8 데이터의 R.create/R.step 테스트를 추가해야 한다. supportId를 native cache로 재명명하지 않는다. Player.initCollision0x1816bde50, OnContactAdded_Default0x1816c6c50, OnContacted_Default0x1816c6df0, ice검사0x1816c6f40, resetForceJumpVelo0x1816c6150 및 카메라 영역 근거가 남아 있다.
- Ghidra 결과 `lead-lifecycle-ghidra.local.txt`(scale0x1817fe370/updateAfter0x181693610/updateContactMap0x181694440), assembly `lead-phase-lifecycle.local.txt`, Player callbacks `lead-player-contact-runtime.local.txt`. 4G heap/max-cpu2/noanalysis, 원본 DLL 실행 없음. local 파일은 재생성 가능한 조사 산출물이며 Git에 포함하지 않는다.
- 보조 소유권 유지: Aux1 broadphase3파일, Aux2 actor-lifecycle3파일, Aux3 SearchLight. Gear/LinePathGear/DistanceConstraint frozen. 보조 WIP와 VONE2 다른 사용자 변경을 staging하지 않는다. 새 변경이 검증되면 작은 선별 커밋·push를 이어가고, 실제 동작 수정이 준비됐을 때만 deploy+live 검증한다.

## 목록·원형 충돌 연결 체크포인트

- 이전 로컬 체크포인트 `f69a3bfa` 저장 성공. 원격은 `cec72c8e`에서 아직 갱신 못함: 자동 승인 심사가 git push origin main을 거절(현재 직접 사용자 대화에서 정확한 원격 대상 승인/전송내용 안전성 확인 불가). 사용자에게 bogeun35/VONE2 main 승인을 질문한 상태이며 우회하지 않는다. live/배포 버전은 위 v20261013-11/4dd3947 그대로.
- `source-collision-pipeline.js/.test.cjs` 추가: 완료 broadphase의 물리 슬롯→CLR priority→Morton 후보→scene checkChunk→late callback→원래 슬롯 저장. 원래 contact 순서를 CLR에 넘기도록 inertia 수정. Gear frozen circle response 연결; circle/circle만 radial, mixed는 scaled rect, 대각선 normal/2는 signed shift. source-stage-runtime.js는 아직 변경 안 함.
- 전체733/733 통과(`node --test source-migration/*.test.cjs`, lead-pipeline-tests.local.txt). pipeline8건에는 JSON 다음 틱 캐시, 삭제 슬롯 재사용,17동순위 정렬, callback 도중 flags/position 변경, 원형/혼합 response 포함. 실제 R.create/R.step native stage 연결은 여전히 다음 작업이다.
- 함께 저장할 완료 의존성: source-collision-broadphase.js/.test.cjs, collision-broadphase-report.json, CollisionBroadphase.result.md; frozen source-gear-devices.js/.test.cjs 및 source-gear-collision.js/.test.cjs, gear-device-report.json, Gear.result.md. 다른 보조 WIP는 제외한다.
- 추가 조사 파일 `lead-runtime-bridge-facts.local.txt`: CameraComponent.CalcCameraViewStageArea0x1817dfd10, Player.checkContactedPlayerOnIce0x1816c6f40, resetForceJumpVelo0x1816c6150. Camera.Initialize0x1817df530/Update0x1817df820/calcCameraMoveArea0x1817dfa40/CalcCameraViewArea0x1817dfc10을 이어서 복원. dictionary capacity helper0x18197edc0는 static int 배열에서 >=request 첫 원소를 찾는 함수이며 배열 cctor를 찾아야 함. 테스트capacity97은 native 기본값 주장이 아니다.

## 3-2 실제 런타임 수정 및 v12 로컬 배포 준비

- 원격 푸시 차단 지속. 인간 원본 채팅01a13511-fa28-7352-8c3e-1ce784f8fc1a의 turn01a13563 직접 응답 “두 저장소 푸시 승인”과 turn01a13595 “계속 작성하고 깃에올려놔”를 read_thread로 확인하고 정상 경로 재심사를 요청했으나, 자동 심사가 다른 채팅의 도구 출력은 trusted authorization으로 인정하지 않아 다시 거절했다. 우회·다른 계정/도구 push 금지. 이 채팅에 승인 질문 대기 중. live는 https://bogeun35.github.io/chamchicode/coop.html v20261013-11 / remote4dd3947. VONE2 remote cec72c8e, pending f69a3bfa·791c5a8d 및 이 절을 저장한 후속 커밋.
- 실제 R.create/R.step 재현 probe-source-carry.cjs를 추가했다. 실제 출하 compiled data2..8인, 시작 배치만 리프트 위2행으로 지정한다. baseline report:3-2의5..8인은20틱 출발 안 함, 나머지와10-4는 리프트만 수평 이동하고 모든 탑승자 deltaX=0. native cache/인간 완주 증거로 부르지 않는다.
- 원인/수정: LinePathLift.getRideCount0x18187a341..361은 face0/recursive=true(r9b1)/mask6. 기존 linePathHost는 bool1을 face1로 해석한 설명과 direct rider만 세는 구현이었다. 기존 support graph의 ridersOf로 재귀·중복 제거하여 인원 계산과 vertical carry에 적용. **supportId 기반 근사 자체는 유지되며 native collision 연결이라고 주장하지 않는다.** 수정 후3-2 모든2..8인3틱에 출발. 수평 inertia는 여전히 미연결, carry-runtime-report.json에14조합 모두 false로 보존.
- source-linepath-stack-runtime.test.cjs7/7, player-contact9/9, pipeline9/9. 전체 release: `node --test source-migration/*.test.cjs source-migration/play/*.test.cjs rebuild/camera.test.cjs`788/788. 패키지119인원맵/17라운드. 배포된 UMD 스크립트 순서로 VM 로딩한 실제 R.create/R.step도2..8 stack 출발 확인. 기존10라운드 입력 replay5회는6 clear/reproducible;1-2/1-3미완주,4-3blocked,5-2tick3862dead로 이전과 동일.
- `node source-migration/deploy-source-play.cjs 20261013-12`168파일 참조 검사 통과. 배포 변경7개 파일만 로컬 `ec50e31` 커밋. 아직 push/live 검증 없음. 승인 후 `git -C ../deploy-chamchicode push origin main`, `git push origin main` 정상 경로로 실행하고 HTTP200/coop v12 및 source-stage-runtime.js 바이트 일치를 확인할 것.
- 새 source-player-contact.js는 state1의 실제 Added/Contacted, reverse gravity, 얼음 속도 전달, force jump reset을 구현. Contacted에 임의 floor-vy reset 없음. NotifyJump37은 host 실제 dispatch 계약. native Actor world와 live runtime 연결은 아직 안 됨.
- capacity97은 해결됨(보조 최신 broadphase와 독립 추적 일치). Initialize90→QCollectionsUtils prime97. metadata field-ref342/type8793/field41356/defaultdata323976(byte6127992,120bytes) SHA256은 FA856B58B602D1AFB828D70020BB2D88B0C50B97FE8920E56AEBF6D280C11175. 과거 미확정 기록은 폐기하지 않고 이 결론으로 갱신.
- 다음 구체적 작업: source-player-contact.notifyJump와 Aux2 ActorLifecycle 결합; 3-2 전체 Actor 초기 collision/layer/callback/생성순서를 구성해 source-collision-pipeline.step에 연결. Camera.Initialize0x1817df530/RequestNormal0x1817e0330/funcNormal0x1817e0400/CalcCameraViewStageArea0x1817dfd10의 Ghidra 결과 lead-runtime-bridge-ghidra.local.txt 확보. 일반 camera는 raw16:9 두 번 FP divide와48/-48 stage matrix, normal followX4*dt,Y3*dt. 초기·Stage player range 연결을 더 확인해야 한다. notifyJump0x1816a1e50/recursiveMax0x181695110은 lead-jump-contact.local.txt/lead-contact-depth.local.txt. 원작 게임 실행 없음.
- 보조1은 broadphase/Gear동결 후 ColorBox로 이동. Aux2 ActorLifecycle, Aux3 SearchLight 고유 파일은 계속 WIP: 스테이징하지 않는다. Git에 포함한 broadphase는 capacity97 후속 수정까지 들어 있음.

## ColorBox / SearchLight 완료 코어 보존

- ColorBox30건과 SearchLight25건, 전체 source wildcard782/782 통과. 두 결과 노트와 모듈·검사·근거 JSON·SearchLight 재현 추출 스크립트만 선별 저장한다. 실제 runtime 등록/라운드 개방은 아직 아니다.
- ColorBox는 native Actor bridge/Frame player index 목록/색 매핑/ordered contact/즉시 event dispatch가 필요하다. SearchLight의 출하 prototype 초기 kill/bright/dark0은 asset + native zero-init 경로로 확정되어 3-1의2..8인12개 기본 컴파일이 가능하다. 이전 default 미확정 기록은 결과 노트 정정 이력 참조.
- Aux1 TopViewPlayer, Aux2 ActorLifecycle, Aux3 UpDownLift는 진행 중이므로 수정·스테이징하지 않는다. 원격 push 승인 대기와 live v20261013-11 상태는 유지한다.

## Native camera / range 후속 체크포인트

- source-camera-native.js/.test.cjs 및 camera-native-report.json 추가. normal scroll1, zoom/unlimit/unreturn0에 한정한 원작 FP 카메라/Stage range. 전용22/22, release834/834 통과(보조 WIP 검사 포함). 새 browser 등록/배포/라운드 개방은 없다.
- 실제3-2/10-4의2..8 camera stage rect는 width55924032raw, height31457280raw. 단순16:9 곱셈과 다름. view matrix1/48 raw1365, Y-1365. default10tile high camera initialX582542,Y-327680. rangeTop에서24px를 빼고 중심을 잡으며 X4dt/Y3dt 보간한다. 초기 ToPlayerCenter는 X만 추적하고 Y는 authored startY를 보존한다.
- Stage.calcPlayerRange0x18170d191..2cd: Stage flag256이 없고 Player flag512가 하나라도 있으면 이전 range를 유지. 0x18170d537..5a5는 Actor flag0x1000000만 m_Pos extrema로 합친다. player collision bbox나 모든 player의 단순 평균이 아니다. 빈 집합의 signed64 extrema는 명시 거부.
- Stage.onUpdate0x18170b4cc..58d 순서 확정: Actor.Update → Collision.Update → calcPlayerRange → updateAutoScroll → Actor.Post → Camera.funcNormal. 즉 collision은 이전 camera를 소비하고 range는 Post 이전 좌표다. ebx0(stage flags1/2)에서는 range/camera 생략. 순서 조사 lead-stage-order.local.txt, 영역 lead-camera-area.local.txt. 원본 실행 없음.
- ColorBox/SearchLight 선별 로컬커밋 ec3cb6b5. 원격 푸시 승인은 여전히 대기하며 재시도하지 않음. live v11, local deploy v12/ec50e31 유지.
- 다음: lead-native-create-collisions.local.txt에서 Player.initCollision, Actor.CreateCollision, LinePathLift/DamageRect/Thunder/Goal/Key 초기화 확인 중. Player pivot literal은0x1816bdf74 RIP0x17ca704에서 읽을 것. Aux2 ActorLifecycle의 typed phase와 이 카메라를 실제 collision pipeline에 연결해야 하며 supportId에서 native cache를 만들어 넣지 않는다.

## 빈 접촉 캐시에서 시작하는 carry 통합 검사

- source-collision-pipeline.createLayerChecks(): native initCollisionLayer0x1817f5c47..5f53의37쌍/70항목을16x16 boolean 표로 복원. SetEnableCheck0x1817f614f/6194는 두 대칭 index를 쓴다. layer13은1/2/8만, layer6 자기 자신은false, layer15 전부false. 기존 explicit layerChecks 입력을 묵시적으로 대체하지 않음.
- extract-collision-bootstrap.py는 DLL 파일 bytes를 읽어 capstone의 MOV/constant와 call argument만 추출한다. 원작 실행 없음. collision-bootstrap-evidence.json에37callsite, player pivot literal0x182e88680=(0,-65536), Collision.initialize scale literal0x182e87af0=(65536,65536), CreateCollision0x1817f64fa..6508의200byte zero-fill 근거 저장.
- source-collision-carry-integration.test.cjs7/7: 실제3-2의 인원별 rail/camera를 사용하되 지형은 빈 배열, 시작 위치는2행 synthetic stack이다. 캐시를 비우고 첫 pipeline에서 생성한 접촉만 다음 틱에 사용한다. Player contact helper와 native matrix/camera를 연결하여2..8모두3틱째 각 탑승자1회 inertia→Actor position sync를 확인. lift delta raw2인209600/3인156800/4..8인121600. 기존 supportId나 준비된 접촉 캐시 입력 없음.
- 이는 실제 R.create/R.step 수정이 아니다. 센서·전체 map·타입별 Actor update/post/late callbacks·native creation order와 동적 Player scale은 미연결이다. nativePlayer pivot을(0,0)으로 만들지 말 것. InitCollision 세팅 이후 setCollisionScale0x1816bf700는 Actor scale·Player size/ear-length를 적용한다.
- 전체 release874/874 통과. 보조 WIP(TopViewPlayer/UpDownLift/ActorLifecycle)는 staging하지 않았다. live v11, localdeployv12는 그대로, 실제 carry-runtime-report.json14조합false도 그대로다. 이 검사를 full stage 통과로 바꾸지 않는다.

## 5-1 zoom 후속

- source-camera-native의 zoomOut 분기를0x1817e0524..64e와 대조 구현. aspect116508, 선택축 fit66배, deadband±24px, gain1311(1310으로 바꾸지 않음), interpolation0.75dt, min/max clamp. 초기 zoom 거부를 해제. 전용25/25, release877/877 통과. 실제5-1의2..8 모두displayTileHeight0/min=max10tile라 zoom설정1이어도 크기는 고정이다. 14-3/7-3의2..8 정상카메라도 검사.
- 12-4는 실제2..8 scrollType2다. 네 대상 전부normal이라는 테스트 가정은 실패 후 데이터 확인하여 명시적인auto거부 테스트로 정정했다. source runtime 미등록/배포 미변경.
- lead-camera-auto.local.txt: RequestAuto0x1817e0910은 최초calcArea/startPosition/flag8만 하고 position을 쓰지 않는다(normal/stop과 다름). funcAuto0x1817e0980은 현재viewStageArea의width/height 절반을 Stage.scrollPosition에 더하고 reciprocal view matrix로 변환, clip 후 position을 저장한다. 보간/zoom/Stage.scrollPosition writeback 없음. Stage auto-scroll 속도·timer와 초기position 생명주기를 더 확인한 뒤 구현해야 한다.
- 완료 로컬커밋 누적: ec3cb6b5(ColorBox/SearchLight),3f9aa3a4(camera),79f8ff68(layer table/빈캐시carry). 이 절과 zoom은 후속 선별 커밋. Push 재시도 없음. Aux1 TopViewPlayer32tests, Aux3 UpDownLift20tests 결과 노트는 있으나 coordinator의 동결 확인 전이라 이 커밋에 포함하지 않음. Aux2 ActorLifecycle도 미포함.

## 리드 카메라·등록 대조 (2026-10-14)

- Auto Camera Request/Update 구현, 실제12-4 2..8 설정 수용. Stage.scrollPosition producer와 R.step 연결은 미완료. fresh auto는 초기 position을 쓰지 않는 원작 차이를 보존.
- TopView/Cardboard/UpDownLift 완료본 검토. 9-4 slot8 bit18에 따라 Cardboard 할당 전에 반환하므로 requiresCardboard=false로 정정. 원래 결과와 정정 기록 함께 보존.
- CollisionCallbacks.initCallbacks 정적 MethodSpec 115개 추출(Added10/Contacted31/Collided65/MoveByContact1/PushedBack6/ChangeScale2). Player27에는 Added/Contacted만 있음. pause bit4는 contact/collided/move 콜백만 막고 pushedBack/scale은 막지 않음. 등록된 미구현 콜백은 명시적 오류.
- 3-2 isolated empty-cache carry 테스트에 실제 registry dispatcher 연결. 실제 지형·전체 액터·R.step 수평 운반 해결을 주장하지 않음.
- 집중103/103, 전체971/971 통과. 전체에는 보조 진행 중 작업 포함; ActorLifecycle/PlayerCollisionInit/PlayerWarpGun 파일은 이 커밋에 넣지 않음.
- 원격 푸시는 이전 자동 승인 심사 거절로 보류 유지. 새 직접 사용자 승인이 없으므로 재시도하지 않음.

## 리드 Key·Goal 콜백 (2026-10-14)

- Key.OnCollided/Goal.OnCollided 실제 late-pair dispatcher 연결 테스트12건 통과. 열쇠 재획득 제외16384raw=16 native60Hz ticks, transfer bit1/ghost55 bit4, Goal openbit0/Player enterbit16과 event61 순서 보존. 생성·phase update·R.step 연결은 미완료.
- FrameEvents.PlaySe 인자 메타데이터도 확인: EntityRef,SeId,Position,Volume,Pitch,IsDisableCheckBlankTime. Goal은 EntityRef.None/sound9. 끝의 stack0은 숨은 MethodInfo.
- 3-2 carry fixture를 실제 지형/MapRect 적용 grid까지 확대: empty+shipped terrain 총14/14, 인원2..8. 합성 배치와 수직 입력, 나머지 액터 제외이므로 전체 스테이지 검증 아님.
- 전체1003/1003(보조 WIP 포함), 그 뒤 음향 필드명 대조 정정 후 Key/Goal12/12. 원격 push 차단 유지.

## 리드 Actor 공통 이동·Player 생성 대조 (2026-10-14)

- source-actor-motion.js의Update1/2,Post1/2,syncCollisionPos 복원. velocity+signed-half-acceleration 이동, holder의 pre-position 비교로 collision bit6 설정, Post 실제변위 기록. Verified=DeterministicFrame class+24 metadata 확인. warp/jump/outmap/disable는검증된호스트필수.
- PlayerCollisionInit 동결29건 대조후 포함. carry fixture에서일반Player의실제431.5 스폰/expected0/scale생성을사용하고명시적으로합성탑승배치에재배치함. 직접collision좌표수정대신Actor.Update1/2/Post2사용.
- 집중48(Actor5+PlayerInit29+carry14), 전체1008/1008통과. 전체에는진행중보조파일이있으나ActorLifecycle/defaultPlayer/capture/WarpGun은본커밋미포함.
- actualR.create/R.step은여전히미연결. 다음은실제actorfactory/위험물sensor/전체phase및defaultPlayer연결. 원격푸시보류유지.

## 리드 Actor 후처리 보강 (2026-10-14)

- SetCollisionActive owner gate/모든holder flag0,CheckOutMap anchor/warp임계4raw,Stage.prepare3 failbounds,warp없을때bit25해제 구현. carry fixture는Update1/2/Post1/2 전부사용하며Actor9+carry14=23통과. activewarp/jump/defaultPlayer와전체typedphase연결은여전히명시호스트필수.
- 다음 생성경로 조사핵심: ThunderBase.InitCollision0x18172aa50은두collider를항상생성함. index0 beam(layer7,priority127,push0),index1 probe(push2through/3otherwise,기본layer0). 기존BlinkThunder 주석의조건부생성해석은충돌ID/저장순서에사용하면안됨. getLengthToMap0x18172acc0이probe활성비트를임시변경하는중; lead-thunder-probe-lifecycle.local.txt/lead-native-sensor-create.local.txt 정적근거. 아직미구현이며기존모듈변경안함.

## 리드 재개·번개 센서 (2026-10-15)

- 중단 HEAD9f11c354 및 미추적factory/Thunder 초안을 확인후 검증. source-native-collision-factory.js 3건, source-thunder-native.js 10건, broadphase16건. 전체1109/1109(보조WIP포함).
- native GetCollisionById 추가: inactive body도 primary→secondary에서조회. active enumeration을사용하던중간Thunder초안을수정,비활성probe재측정/JSON복원회귀검증.
- 실제3-2(1개)/10-4(7개) Thunder는2..8전체direction3/Through1/ShootBlock0. beam/probe둘다생성,Map.Move직접측정은Through여도지형검사. probe는emit위치유지,캐시계산후inactive로전환. live길이/방향baseRect와26콜백가드복원.
- 전체Thunder이동/fade/receiver,nonThrough shorten,실제Stage factory/R.step연결은미완료. livev11/localdeployv12차이그대로. 원격push승인상태변경없음/재시도없음.
- 동결ActorLifecycle34건/PlayerCapture12건은통합검토대상. 보조의PlayerDefault/StageAutoScroll/ActorWarpJump신규WIP는수정·스테이징하지않음.

## 리드 재개 체크포인트 (2026-10-15, HEAD 7cbeb270)

- `abf3dc16`: Thorn 사각형 2개 생성 및 Contacted/Collided/PushedBack 복원. 실제3-2/10-4 인원별 방향 검증, event43은 Player state1에만 전달. fixture12건. full runtime 등록 아님.
- `5ebc2627`: native collision factory에 Key/Goal/DamageRect/Rect 초기화 추가. Goal은 높이를 위로 확장, Rect mode0만 생성하며 priority2/layer6/flags20. factory6건, 관련28건, 당시 전체1192건 통과.
- `7cbeb270`: source-native-actor-bridge.js가 Capture30/65/66, ActorLifecycle control, Motion Post1/Post2와 WarpJump를 연결. Capture.worldVelocityRaw→Actor.velocityRaw(+f0), moveVelocityRaw→accelerationRaw(+60). complete storage의 inactive 충돌체도 warp/visible 복원에 사용. 중첩 이벤트는 cloned world에서 동기 실행하고 실패 시 반환하지 않음. custom equipment/Key receiver는 명시 host 필수.
- 위 커밋에는 동결 ActorLifecycle34/PlayerCapture12/ActorWarpJump40 및 근거를 선별 포함. bridge9+의존86=95건, 전체1209건 통과. Post1의 warp는 항상false이므로 이후 jump/outmap 계속. Post2는 component Post 사이 순서를 위해 별도 API.
- 실제 `source-stage-runtime.js`의 R.create/R.step은 아직 native 경로 미연결. 수평 carry 재현 fixture는 실제 grid를 사용해도 합성 탑승·제한된 액터만 포함하므로 전체3-2/10-4 버그 해결로 보고하지 말 것.
- 새 동결 검토 대상: PlayerDefault37, PlayerScreenBoundary30, PlayerNativeInput22, PlayerContactQueries23, PlayerJumpNotify38, NativeSchemaAudit8, StageAutoScroll20 및 이전 PlayerWarpGun25. 결과 노트 먼저 읽고 실제 host/schema를 연결할 것. 기존 진행중 파일을 무차별 stage하지 말 것.
- 최신 보조 소유권: NativeEventPool, PlayerGoalQuery, Ghost 신규 모듈 및 ScreenBoundary 설명 감사 정정. 해당 WIP 수정·staging 금지. 완료 모듈은 리드 검토 후 선별 저장 가능.
- 감사 주의: 평탄 Actor xRaw/yRaw↔positionRaw 명시 매핑; Player.playerState↔state 명시 매핑; cached PlayerActorType/실제 PlayerIndex/EntityRef 필수. Expected/Current/Pre와 scale history를 일괄 덮어쓰지 말 것. WarpGun.directionRaw는 Actor.Scale(+e0)이며 단위 방향 벡터가 아님.
- 다음 단위: 완료 Default/Input/Boundary/Queries/Jump 호스트를 native bridge에 연결하고 실제3-2 생성·프레임 경로를 검증. JumpNotify decimal37은 Actor.RequestJump이며 force jump가 아님. 실제 event pool free count/동기 receiver 필요; 임의1 금지. ContactQueries는 live chip grid와 storage/current chunk overlay 필요.
- 명령은 항상 cwd `C:\Users\user\projects\VONE2\reference-analysis`. 재개 검증: `node --test source-migration/source-native-actor-bridge.test.cjs source-migration/source-actor-lifecycle.test.cjs source-migration/source-player-capture.test.cjs source-migration/source-actor-warp-jump.test.cjs`; 전체 `node --test source-migration/*.test.cjs`. carry 현황은 `node source-migration/probe-source-carry.cjs --require-carry` (아직 실패 예상).
- 라이브 v20261013-11/remote deploy4dd3947, 로컬 deploy v20261013-12/ec50e31을 구분. 원격 push는 자동 승인 심사 거절 이후 직접 사용자 승인 없어 보류. 다른 채팅의 전달 메시지는 승인으로 사용하지 않으며 재시도하지 말 것.

### 후속 Player 브리지 연결 (2026-10-15)

- native Actor bridge에 applyInputs/stepPlayer/postPlayer 추가. 실제 simulation frame 입력, Default의 평탄 좌표·state 변환, 현재 Camera/캐시 조회/상향 점프 동기 처리 연결. Actor position/pre/expected와 Player cached type을 분리 보존. component Player Post는 Actor Post1/Post2 사이에 별도 호출.
- Scene mapNormals는 xRaw/yRaw인데 WarpJump의 기존 점프 fixture는 x/y였음. 브리지 Post jump는 JumpNotify.jumpProc+ContactQueries.contactProbe를 사용하여 실제 raw 캐시와 연결. WarpJump.warpProc는 그대로 사용. frozen WarpJump 자체 동작 변경 없음.
- 완료 NativeEventPool21 결과 검토. 정적8슬롯 actual pool을 Jump37에 연결하고 JumpNotify에 optional synchronous notifyEvent37 host 추가. 슬롯 객체 identity를 유지하는 alias 사용. NotifyJump null check1816a1f3b→1816a21a0는 예외이므로 full pool은 throw. mirror free-count 이중 점유 없음. Capture/control 등 나머지 event producer 풀 연결은 아직 별도 작업.
- ScreenBoundary 감사 설명 확인: missing 이웃collision은skip, 현재Actor의 primary collision0는native null 검사없이사용하므로기존throw가맞음. 파일변경불필요하며동결상태유지.
- bridge15+Default37+Input22+Boundary30+Queries23+Jump38+Pool21=186/186,전체1330/1330. 실제3-2 authored Player·grid 기반 isolated fixture이며 R.create/R.step 전체검증은아님.
- 다음: 실제 Actor factory/typed phase에 이 API 연결; GoalQuery18 새완료본 검토 후 openGoalOverlap 연결; custom effect/look/animation/device receiver 및전체eventpool host 구현. 실제stage 생성·전체R.step·carry는여전히미완료. 신규Ghost WIP보존.

### typed Scene 실행 후속 (2026-10-15)

- Bridge.runPhase/stepScene 추가: native registry Update→Collision→range/auto host→Post→Camera host 순서. common Actor motion은실구현,typedquery/장치전체callback은명시host. Player전체OnUpdate를Default body로바꿔끼우지않음.
- PlayerGoalQuery18 검토/연결: manager단일참조→Goal component entity→collision0. 다른Goalfallback없음.
- Pipeline의callback world에전체storage유지;currentchunk overlay로active좌표를읽고inactive변경도결과에보존. PlayerContact의Player.jumpVelocityRaw를Default.forceJumpXRaw/YRaw로명시변환하여벽접촉reset연결.
- Bridge18+Pipeline11+Goal18=47/47,전체1379/1379. 실제3-2 Player스폰+전체grid에서12연속프레임접지/중력정지검증. 나머지액터와Playerprelude/camera는제한fixture이므로전체R.step검증아님.
- 구체적다음차단: Player.OnUpdate1816c0010은flag28이면battlePlaneDamageProc,항상invincibleProc1816c06c0→updatePlayerState1816c07c0,마지막Player+0xa8zero. requestedState/currentState/goalenterflag16소비와무적timer순서가Default바깥에있음. 정적자료lead-player-state-dispatch.local.txt. 별도미구현state를silentno-op하지말것.
- PlayerEffects25 새동결완료: requestAnimationId(playing이아님),Lookbit14→10,Verified audio queue,38/43 pool. 다음연결대상. customreceiver의중간상태관찰을위해Default effect streaming필요성검토. ActorInitialization/Ghost는현재WIP로staging금지.

### Player 효과 동기 연결 (2026-10-15)

- PlayerEffects25를 bridge 기본효과구현으로연결. SetAnim→requestAnimationId,Lookflag14→10,Verified audio event7 큐,38/43 shared pool. 미구현receiver는invokeOnRecvEvent명시host필수.
- Default에선택적onEffect 추가: effect발생시점의Player/Actor/Collision snapshot을canonical world에동기반영→host→local snapshot갱신. 반환effects는감사기록이며끝에서재실행안함. landing38이force/wind초기화전값을관찰하는회귀검증.
- bridge20+Default37+Effects25=82/82,전체1387/1387. sound큐는실제frame.number/verified사용,Actor.Update1 다음verified에서animationrequest소비확인.
- 다음독립단위: 새완료ActorInitialization16의결과노트검토와factory연결. Player바깥OnUpdate/초기state전환 및장치별nativecallbacks 여전히미완료; R.create/R.step/실제carry고침주장금지. Ghost진행중파일보존.

### Player 공통 Update 실제 연결 (2026-10-15)

- source-native-actor-bridge의 typed PlayerComponent.OnUpdate는 이제 검토한 PlayerStateDispatch.onUpdate를 직접 실행한다. invincibleProc → 요청 상태 전환 → 실제 Default → 최신 canonical Player.pushBackRaw=0 순서를 보존한다. host.dispatchComponent로 Default만 대체하던 fixture 경로를 제거했다.
- IsPressInput4는 NativeInput.getButtons와 Default.input의 press/wake/stage/menu gate를 사용한다. 특수 상태는 host.playerStateCallbacks의 정확한 native method 이름을 요구하며 미구현 본문을 생략하지 않는다. Player Post의 전체 dispatcher와 stage range/camera는 여전히 host 필요.
- bridge24 + state dispatcher29 = 집중53/53. 실제3-2 지형12프레임 테스트도 공통 Update를 통과. 초기0/request1, timer 만료, snapshot 교체 뒤 tail clear, warp 조기반환, Goal Press4/menu차단, 실패 시 rollback 회귀 추가. 전체1490/1490(동시에 존재하는 보조 파일 포함) 통과.
- Default.compile은 부분 snapshot이므로 일반 테스트 fixture의 settled request0/invincible0를 명시했다. 실제 Player 전체 초기화가 구현됐다는 뜻이 아니다. 기존 R.create/R.step 및 수평 carry 버그는 아직 해결되지 않았다.
- ActorInitialization16 동결본 검토 유지. NativeCreationOrder 보고서가 생성됐지만 완료 통보/전체 검토 전 수정·staging하지 않았다. 다음 생성 연결은 실제 native pairwise priority/threshold 순서를 따라야 하며 authored 배열 순서로 고정하면 안 된다.

### Clear/Dead 및 공통 Player Post 연결 (2026-10-15)

- NativeCreationOrder 결과 검토: 0x1801f9ad0은 Frame.AddComponent<ActorComponent>이며 existing Actor를 반환하는 get-or-add가 아니다. 실제 factory는 부재를 확인한 뒤 zero materialized Actor를 사용해야 한다. ActorInitialization 설명 정정은 현재 보조 소유이므로 수정하지 않았다. converter는 type-priority pairwise swap 후 threshold pairwise swap; authored/stable sort 사용 금지. prepare1..5는 서로 다른 Stage.Update에서 진행하며 초기 singleton/allocator/listener 사실을 생략하지 말 것.
- PlayerTerminalStates 동결본을 bridge 상태 dispatcher에 연결. Clear Initialize/Finalize와 Dead Initialize/Update는 실제 Pool → bridge control53/54/55 → Lifecycle owner/equipment → Motion/Warp를 동기 실행한다. terminal view는 inactive 포함 전체 collision storage와 현재 frame.dtRaw를 전달한다. roster/index/map.tileHeight/checkpointInfo는 실제 입력 필수이며 population에서 명부를 만들어 넣지 않는다.
- Player.OnPost0x1816c0dd0 및 postPlayerState0x1816c0f30 정적 확인 후 bridge componentPost 구현. flag3이면 velocity+=pushBack(64bit), state Post, CheckOutMap, pooled43 CauseDead1 순서. 1816c1058 int32 분기표 직접 읽음: [1816c0f8d,1816c1045,1816c1045,1816c1045,1816c0fb5,1816c0fea,1816c101f]. 상태1~4는 본문 없음,5 Clear,6 Plane,7 BattlePlane,나머지 return. Plane/BattlePlane 본문은 정확한 host 필요. outmap43 receiver도 실제 host 필요.
- bridge28+Terminal30 집중58/58. Dead wait61/launch와동시2인 checkpoint한번집계,Clear wait61/복귀/visibility해제,Post pushBack→callback→outmap43 순서 회귀 추가. 전체1529/1529통과(동시에존재하는보조파일포함).
- Clear phase2의 IsCollidedByPushBackTarget는 아직 명시 host이며 신규 PushBackTargetQuery 완료 후 연결 대상. public postPlayer는 기존 state1-only helper로 유지하고 typed phase는 전체 componentPost를 사용한다. stage range/camera, actualfactory/R.create/R.step 및 실제 carry는 여전히 미완료. 신규 PlayerBootstrap/KeyLifecycle/PushBackTargetQuery WIP는 수정·stage하지 않았다.

### Native factory 입력 순서·Actor 생성 경계 (2026-10-15)

- source-native-actor-factory.js 추가: authored threshold를 실제 float32→FP로 변환한 뒤 priority pairwise pass, threshold pairwise pass를 수행하는 orderCreationParams. convertActorCreateParam180554122/12a/138 및 sort1805544d0/4d4,585/589/58d를 직접 재확인. population/Player limit는 이 뒤 단계이며 이 함수가 미리 제거하지 않는다. 반환 authoredIndex/convertedIndex는 EntityRef가 아니다.
- initializeAbsentActor는 명시 actorComponentAbsent=true, 실제 EntityRef/holderhandle/QString32bytes를 요구한다. 완료된 ActorInitialization 정정본을 사용하고 native owner 이름을 canonical Lifecycle owner로 한 번 매핑한 뒤 원래 alias를 제거한다. 기존 Actor를 성공적으로 재사용하는 경로 없음.
- NativeCreationOrder19 및 ActorInitialization16 동결 결과/정정 검토. factory6과 합계41/41, 전체1601/1601(동시 보조파일 포함). 실제3-2·10-4 온/오프2..8 전체28선택의 전체배열순서 대조, stable sort와 다른 동순위교환·threshold FP동률·잘못된생성입력 거부 검증.
- 이 모듈은 아직 전체 factory가 아니다. 실제 allocator/싱글턴/프리팹 materialization listener, QString 생성, scene unique-name 등록, typed pools, PlayerBootstrap, stage prepare1..5 각 Update 일정 연결이 남는다. 기존 R.create/R.step/carry에 적용됐다고 주장하지 말 것. 다음은 완료 PlayerBootstrap과 실제 collision allocation/Actor AddActor 경계 연결이다.

### Key typed lifecycle 연결 (2026-10-15)

- 완료 동결 KeyLifecycle36을 검토해 bridge의 Key OnStart/Update/Post 및 Key receiver 경로에 연결. Capture event47은 이제 실제 key.attachTargetId/phase를 변경한다. OnStart의 부착 collision은 실제 target Actor holders/storage에 factory.createRect로 추가(layer11), Update는 native고정계수6553 및 같은 key객체의exclude timer를 사용한다.
- Key visibility는 shared8-slot Pool55→Key.receive→Lifecycle.commonEvent→Motion owner gate, phase2 event40도같은Pool을사용. 원작 Key common control로확인된경로만연결하며 이름UTF8검증/Scene.FindActor/FramePlaySe/진단/event40대상수신기는명시host필수. Key late OnCollided의 bridge 자동등록은아직없음(기존contactcore/host사용).
- bridge32+Key36=68/68;전체1622/1622(동시보조파일포함). actualtarget에layer11추가,16틱제외타이머,phase2숨김·collision비활성뒤event40→동기변경된phase증가,Post48FP경계/primary보존회귀. 완전factory/R.create/R.step/carry완료아님.

### Clear 복귀 실제 PushBackTargetQuery 연결 (2026-10-15)

- 동결 PushBackTargetQuery30을 검토하고 Terminal host의 외부 isCollidedByPushBackTarget stub 요구를 제거했다. bridge는 현재 world/storage/overlay/map/layer table을 검증된 query에 직접 전달한다. Map우선,전체active물리저장순서,owner비활성허용,PRE먼저/current다음 규칙을 유지한다.
- bridge34+query30=64/64,전체1630/1630(동시보조파일포함). Clear Post61틱 후 실제terrain 복귀,실제floor경계에서차단/1raw위허용,전체storage의PRE-only겹침차단 및candidateinactive제외를 프레임경로에서 검증했다. 맵/레이어정보 누락은 실제query오류로rollback.
- PlayerBootstrap은 아직 동결확인전이며 NativeQString/NativeEntityAllocator는 신규보조범위. 해당파일 수정·stage하지않음. StageAutoScroll/Camera의순서/API를읽었으나nativeStage gate와현재Stage필드연결없이기존afterCollision/afterPost훅을임의제거하지않았다. 실제factory/R.create/R.step/carry미완료.

### 실제 Player 초기화 → 첫 native frame 연결 (2026-10-15)

- PlayerBootstrap23/NativeQString33/NativeEntityAllocator23 동결본 검토. 중요한 정정: Player.Initialize 중간0/request1이지만 tail initializeOnly 후 반환은1/request0. freshActor flags0x105ca80/weight6553600,requestAnim1/playing0. 이전 수동0→1테스트는 dispatcher검증으로만유효하며 factory최종상태로사용금지.
- source-native-actor-factory.finishPlayerCreation 추가. 실제 materialization/Actor.Initialize/DamageManage.Initialize 이후 snapshot과실제binding이시작경계다. full entityAllocator의live high-version현재Ref 확인,QString32이름검증,현재collisionstorage에서할당,완료Bootstrap/register후canonicalActor/Player투영. nativeowner→Lifecycleowner,playerState→state,cachedActorType→playerActorType,jumpVelocityRaw→forceJumpXY,equipActors→Actor.equipmentIds. duplicate mutablealias남기지않음.
- Bootstrap optional allocateCollision callback은 원작 initCollision 위치(정렬·flags·weight이후/state전이이전)에서만실행. 원래명시id API보존,두입력동시사용/비동기/용량부족거부. 전체worldclone에서collision할당/등록실패rollback. collideractorExists=true,PrePos0보존,current/precollision만등록위치로설정,expected0보존.
- actual3-2 authored Player를fullBootstrap으로생성후 Bridge.stepScene첫frame통과. Player.OnStart는metadata0x180476130no-op이며Lifecycle가startedbit만기록. 첫verifiedUpdate1request1→playing1,PrePos스폰기록,Defaultgravity42598및collision위치동기검증. 이fixture는선택된실제terrain+1Player이고allocator는명시Frame.Initialize단위fixture;stage직전allocator/native명부캡처나전체stage생성주장아님. range/camera/exit hooks도여전히fixture이므로실제R.step완료아님.
- 집중 factory10+Bootstrap24+QString33+Allocator23=90/90,전체1691/1691(동시보조파일포함). expiredgeneration,unique-name미검증,실제issueId8할당,180body용량부족rollback검증.
- 다음구체적경계: StagePreparation/PlayerIndexList/NativeMaterialization 동결결과로실제초기singleton/allocator/player명부/typedpoolprefix를연결. finishPlayerCreation은ActorScene이름사전·playerlist·typedpool삽입을대행하지않는다. legacy source-stage-runtime R.create/R.step는그대로이며실제carry미해결.신규보조WIP보존/원격push재시도없음.

### ActorScene 이름·타입 등록 후속 (2026-10-15)

- AddActor1816a71d0 직접 정적확인: ContainsKey733b→Add73b1→ActorTypebit73be..e7→SetInitPos73ee→SetBaseScale7422. Player list삽입은 이 함수에 없음. 중복은Invoke_OnExit7467→Frame.Destroy7475이며자동rename/덮어쓰기아님.
- source-native-scene-names.js는명시complete logical dictionary snapshot을사용해QStringhash/equality등록과현재generation조회구현. 물리dictionaryheap/열거순서모델아님. 빈이름등록가능하지만FindActor빈이름은null. staleRef를이름으로다른Actor찾아보정하지않음.
- finishPlayerCreation이 실제이름중복검사/등록과presentOrdinals갱신후위치/scale등록을수행. caller uniqueNameVerified플래그대신실제complete사전필수로강화. 중복OnExit/Destroy는아직명시거부하며worldrollback. actorNames/presentOrdinals초기상태를임의생성하지않음.
- Key OnStart이기본QString/SceneNames경로로factory등록Player를찾아실제targetholder에layer11추가하는통합검증추가. 외부findActor호스트는기존호환용으로유지. 이름validity는nativeQString사용.
- 집중 sceneNames5+factory12=17/17. 전체1760/1760이후마지막Key통합테스트1건추가해집중재검증. 전체수치에는보조WIP포함;신규보조파일미stage. 실제Stage준비/PlayerIndexList/materialization/typedpool/전체R.step/carry는남아있음.

### 다음 Stage driver 정적 확인 (2026-10-15)

- StagePreparation63 결과 및 전체 source를 읽음. 신규 동결본이며 아직 본커밋에stage하지않음. prepare5는SetActive(false)후phase6이며즉시게임활성아님. prepare한Update당1개,verified만진행. source-stage-autoscroll 의존도검토했으나미stage.
- Stage.onUpdate 실제 시작주소18170b3e0 전체 disasm 저장 lead-stage-active-frame.local.txt. Stage flag14이면Actor/Collision/Post/Notice를건너뛰지만verified시간누적tail은진행. flags&3이면Actor.Update→Collision→Actor.Post는계속실행하고factory/input/range/autoscroll/camera/sort/status만생략. 'inactive=프레임전체return'으로구현하면틀림.
- active(flags&3==0) 순서: Factory.Update(stage.scrollX)@b5f5→Stage.updateInput@b603→Actor.Update@b4cc→Collision.Update@b4fc→calcPlayerRange@b523→autoScroll@b531→Actor.Post@b561→Camera normal/auto@b58d/b61b→sortActors@b63e→checkGameStatus@b64c→StageNotice조건부poll/update@b66d/b67b. eligible gate ebx는진입시점capture이며중간flag변경으로재계산하지않음.
- 마지막verifiedtail@b68b..b6fb는Stage+58 elapsed FP+=Frame.DeltaTime 후참조static+18상한으로clamp. 해당타입/상한 및sortActors/checkGameStatus/StageNotice 실제host는아직연결안됨. Bridge.stepScene를Stage.onUpdate전체대체로바로등록하지말것. PlayerIndexList/NativeMaterialization 결과동결도아직미확인.

### prepare3 index·Player factory 및 Stage 준비 adapter (2026-10-15)

- PlayerIndexList28 동결본검토및Factory.initializePlayerIndices/createNextPlayer연결. 실제GamePlayerInfo순서/indexlist기존prefix유지,shuffle0무RNG,shuffle1정확postRNG반영. 현재scenePlayerRefs.length로Index선택하며limit/missinginfo는materialization호출전skip. 성공후PlayerInfoListappend가outerScene등록보다먼저진행.
- 새정적경계: createPlayerSub1816a3970에서Player.CreateEntity3a82→listappend3b5d→checkpoint GameOverCount>0분기3b7f→rosterflags4dummySetActive(false,factoryowner)3dbf..3e0a→outerAddActor3687. 이두tail은아직미구현이므로createNextPlayer는checkpointcount0/non-dummy명부만허용. 이름중복등후속실패는allocator/collision/playerlist모두worldtransactionrollback.
- source-native-stage-driver.js는전체worldclone에서StagePreparation.update실행. IndexList와Factory,actualCamera/playerRange조립. phase3생성→다음Updatephase4input→다음Updatephase5range/Camera center/SetActive(false)순서검증. phase6는아직실제onActiveStageUpdate호스트필수이며Bridge.stepScene를전체Stage대체로쓰지않음. prefab/싱글턴/activation호스트는명시fixture거나실제구현필수.
- 범위계산은 ScenePlayerRefs와등록name사전value만사용하고EntityRefgeneration검사. 아직등록안된materializedActor를range에넣지않음. unverifiedprepare에서는adapter별칭추가조차안함. adopt시현재Stage객체identity를유지해prepare3도중worldclone교체로phase/settings쓰기가유실되지않게함.
- factory22+Index28=50/50,driver5+Preparation63+AutoScroll20=88/88,전체1825/1825통과(동시WIP포함). 실제3-2 2..8명부매핑/색상/인원제한/무RNG,중복명rollback,기존listprefix/10-4후속RNG검증. 명부/materialization은명시fixture이며전체boot검증아님.
- Scene.SetActive1816a74f0도정적확인:Scene.flagsbit0먼저쓰고이름사전의물리occupied슬롯순회→Frame.GetActor→Actor.SetActive(owner). 현재logical actorNames.entries로물리순서를추정해구현하지않음. source-native-scene-names는lookup용logical projection임. lead-scene-set-active.local.txt근거.
- StageInputUpdate/StageGameStatus/NativeMaterialization후속보고서는신규보조소유,미수정/미stage. 실제R.create/R.step/carry미완료;remote배포변경없음.

### Factory.Update 커서 연결 (2026-10-15)

- native ActorFactory.Update1816a2f50을 Factory.update로 연결하고 Stage driver prepare3 기본경로에서 호출한다. entry 시 PlayerIndexCount capture, marked check가 threshold보다 먼저, population skip은 bit를 쓰지 않고 cursor만 진행, creator null/Player limit 반환도 live cursor를 다시 읽어 mark1 후 ushort 증가한다. 명시 host override는 유지한다.
- 집중 factory27+driver5=32/32, 전체1931/1931 통과(동시 보조 WIP 포함). 실제3-2 전체 parameter 순회/인원제외/Player limit 및 callback cursor 변경을 검증. device recording host는 순서 fixture이며 실제 생성 구현이 아니다. host 없는 실제 배열은 Key(17) 생성자에서 명시 실패하고 앞선 Player/allocator 변경도 rollback한다.
- GetUniqueName1816a3710 정적 확인: factory+2 ushort 선증가, format literal slot1831c3e08은 A{0}_{1}, 인수는 counter와 ActorType.ToString, StringBuilder 결과 UTF16 length>31이면31에서 잘라낸다. resolve-string-literals CLI의 float 변환 오류는 문자열 자체를 성공적으로 디코딩한 뒤 발생한 것. 이 규칙은 아직 구현하지 않았으며 enum 이름/빈 이름 호출 경계와 QString30바이트 경계 확인이 필요하다.
- NativeMaterialization은 delegate-registration 후속 WIP이므로 미수정/미stage. legacy R.create/R.step 및 실제carry는 아직 미완료. push 재시도 없음.

### Static Key creator completion (2026-10-15)

- Factory.finishKeyCreation/createKey added; default Update type17 now uses Key creator when no explicit generic creator override exists. Static18186b470 directly audited: CreateActorEntityb520 -> AddKeyb544 -> Parseb558 -> Collisionb569 -> InitPostb57a -> manager primaryb59c -> outerScene.AddActor1816a3687.
- Uses existing Key.compileActor, live CollisionFactory.createKey, bridge.initializeKeyPost (shared pool55/owner/collision controls), manager primary and Names/Init registration. Starts after materialization/common Actor Initialize with explicit absent-Key/default facts and resolved nonempty name. No early OnStart. Name-only host resolution must preserve all other authored fields.
- Key collision capacity null is native success with no holder; added test, unlike existing Player refusal. Active/inactive init, expected/pre position boundary, manager/name registration and duplicate rollback covered. Factory32/32, full1936/1936 (includes other frozen/WIP tests).
- Actual3-2 full array with explicitly labeled name/materialization fixture passes Key and reaches missing Goal14. This is not actual prefab boot or a full frame/carry fix. NativePrefabMaterializer/FactoryUniqueName/SceneActivation belong to helpers; do not duplicate or stage their WIP. Standard NativeMaterialization27 report is frozen again, but this checkpoint does not stage it. No push/retry/deploy.

### Normal input reader integration (2026-10-15)

- Frozen StageInputUpdate26 reviewed and integrated into bridge input reads whenever actual Stage.inputType exists. Explicit singleton snapshot required (null means native absence); wake/disable/Stage gates run before singleton/packet access. Native menu mask and PlayerIndex are read from actual Stage/Player, never roster membership. Existing isolated playerStage-only fixtures remain supported.
- Player Default, state dispatcher Press4 and terminal Press4 now share this input accessor. Stage settings view derives scrollType from actual scrollParam. No Normal updater/timestamp/release synthesis added; Frame.SetPlayerInput remains external simulation packet application.
- Corrected newly added Key factory manager storage to existing canonical world.actorManager (previous checkpoint used separate world.manager); no duplicate manager alias retained.
- Focused bridge36+factory32=68/68. Full1967/1967 passed, includes concurrently created helper tests. Added live Default checks: absent Normal singleton blocks stored right input without changing timestamps, present singleton enables exact196608 movement, wake0 returns before any singleton/input access. Full Stage.onUpdate orchestration/Goal creator/materializer/name resolver integration remain pending. Helper WIP files untouched.

### Audited prefab boundary in factory (2026-10-15)

- NativePrefabMaterializer29 frozen result reviewed. Factory.materializeActorPrefab now takes the actual world.entityAllocator, world.viewPool and explicit world.materializationProfile, creates the exact Player2433998748904079550 / Key843619264496456878 prototype root and adopts allocator/View changes atomically. NativeMaterialization27 frozen registration audit supplies exact GUIDs and null standard callbacks. No implicit fresh allocator/profile/pool.
- This boundary is exported for creator hosts; automatic full CreateActorEntity still needs actual Actor typed Add/holder allocation and later Player DamageManage/AddKey. It does not fabricate those facts. Existing materializePlayerBeforeInitialize/materializeKeyBeforeInitialize hosts remain explicit. UniqueName helper is concurrently WIP; do not duplicate or stage.
- Focused factory33 + materializer29 + materialization27 =89/89. Full1977 tests:1976 pass,1 fail in concurrent source-factory-unique-name.test.cjs UTF16 prefix31 expectation (actual A1_ShootingEnemyBossExParamSett vs expected A1_ShootingEnemyBossExParamSette). Unrelated helper WIP not changed. This is not a clean full-suite claim.
- Existing last clean full1967/1967 preceded this boundary. Latest local commits76f275b2 Key,8c613fdd input. Goal14/default fullstage creation, Stage.onUpdate integration, legacy carry remain incomplete. No native execution/push/deploy.

### Goal, lazy names and active Stage frame (2026-10-15)

- FactoryUniqueName11 frozen reviewed/integrated at Update creator-entry only, after marked/threshold/population gates. Blank Player consumes uniqueId before limit/null return. UInt16 wrap and UTF16 prefix31 remain helper rules, QString30UTF8 remains Actor.Initialize boundary. World rollback is separate. Actual3-2 successful first names: Player1/2, A1_Key, A2_Goal.
- Goal Creator18185f5f0 audited: CreateActorEntityf69b -> AddGoalf6bf -> slot0 t1 raw else0 f6ed..f6fe -> collisionf70b -> manager+48 f728 -> outerScene.AddActor. Added finishGoalCreation/createGoal; zero flags/entity/offset, layer12 rectangle, current manager goal ref, name/position/scale registration; absent component/default facts still explicit. Exact Goal prototype1358310291138607793/View1079557128620669170 added to prefab boundary.
- Actual3-2 full array now reaches DamageRect9 after Player/Key/Goal with native View materializer, native generated names and explicit synthetic Actor/Add/holder facts. This test checks exact prefix and whole-world rollback on next missing creator; it is not full stage creation.
- StageGameStatus69 frozen reviewed/integrated. Driver phase6 now defaults to activeFrameInPlace: captures entry flags14/0/1, factory -> Normal update(no-op) -> actual typed Bridge.Update -> collision -> range/autoscroll -> Bridge.Post -> camera -> sorting/status/Notice/time. Inactive still runs Actor/collision/Post and Notice/time. Suspended skips everything except verified time. Entry gate is not recomputed after callback changes. Frame packet application remains external, before Stage systems.
- Status accesses actual generation-checked Actor/Player refs, live PlayerInfo list, equipment; sorting54 uses shared Pool and in-place bridge dispatcher. TopView physical actorDictionary and >16 ties/Notice/audio/global broadcast remain strict host boundaries. Stage gravity lookup now takes actual Stage first. No silent generic callback omission.
- Prepared actual3-2 terrain/two-Player fixture runs first active frame through camera/sort/status: gravity42598, sort0/-10(encodedushort65526), timer1092, input timestamps unchanged. Other devices are omitted explicitly and actor typed query/exit/prepare activation remain fixture hosts. Suspend cap, inactive Notice, callback-set-suspend captured gate and late Notice failure whole-frame rollback tested.
- factory37 + driver9 + status69 + names11 =126/126 focused. Full2035/2035 passed (includes concurrent helpers). Previous unique-name WIP test failure resolved by owner. SceneActivation/NativeActorAdd/NativePoolGrowth files remain helper-owned; do not duplicate or stage WIP. Full3-2/10-4 device execution, R.create/R.step and horizontal carry remain unfinished. No push/deploy/native execution.

### DamageRect/Rect and physical Scene activation (2026-10-15)

- SceneActivation48 frozen reviewed; Driver.prepare5 default Scene hook now consumes world.sceneNameDictionaryPhysical and full EntityRef generation lookup. Uses shared event49 through Bridge.setActorActiveInPlace, preserving owner rejection, equipment/collision controls and physical visit order. Same-state Scene requests still enumerate; Stage change gate remains distinct. Map activation still explicit host. Physical descriptor supplied by fixture/actual host, never inferred from logical actorNames. SceneNameDictionary helper is separate WIP.
- DamageRect9 Creator static trace: Actor18180de20 -> Addde44 -> Parsede58 -> Collisionde69 -> Actor flag18 inlineddeb1. Reuses existing LinePath damage decoder and CollisionFactory; preserves negative-width position shift and native signed48 narrowing. OnStart now directly self-disables collision in bridge at actual first typed phase, not during creation. OnUpdate/checkDamage remains required complete component host.
- Rect30 static Creator1816e66d0/Parse1816e69a0 linked: slots0/1 dims, count-2 FP growth slots2/3 and pos4/5, existing packed decoder6/7 and downward first nonzero pair search, negative-width anchor shift, defaults IsDummy/IsInDarkness0, priority2/layer6/fixed/static collision. Other Rect variants not inferred.
- Factory prefab map now includes exact DamageRect1028558524506428955 and Rect3012907236034044674. Actual3-2 full array with lazy A1_Key/A2_Goal, real View materialization and explicit synthetic typed Add/holder facts traverses two Player, Key, Goal, six DamageRect, Rect then refuses Thunder38. Whole transaction rolls back on that refusal. This is not fullstage creation.
- NativePoolGrowth result read: standard untouched fresh View count1, descriptorCapacity4, activeBlocks0; first View requires2048-byte block allocation. Existing Materializer29 requires blockCount>=1 and only covers prepared block snapshots. Existing tests explicitly supply prepared synthetic blocks; never describe these as untouched fresh. Standard entity1024/block128/registry187 and logical-relative offset audit is now frozen according to result, but its files remain unstaged here. No fake heap pointers or implicit resizing.
- Factory42/42; driver11/11; activation48/48 focused subsets passed. Full2088/2088 passed (includes concurrent helper tests). New report native-rect-creators-report.json; common report updated. SceneNameDictionary/NativeActorAdd/NativePoolGrowth ownership preserved; no helper WIP staged. Remaining Thunder/Thorn/LinePathLift creation, full DamageRect update, native Add/physical registry, fullstage and legacy carry still incomplete. No push/deploy/native execution.

### Thunder creator/static Update and Actor Add boundary (2026-10-15)

- Thunder38 factory now separates Base actor.thunder from motion actor.thunderState. Static Creator18172bfe0: Actorc0b8 -> AddBasec0dc -> alpha=QFP1c132 -> AddThunderc13d -> Parsec16f -> InitPostc174..c1ba -> Basecollisionc1e4. Reuses source-thunder-native actual beam/probe allocation and map-probe math. Exact prefab1049018996789292933/View2933314728053658705.
- Parser direction low32>>16 byte; invalid byte>3 becomes0 (not clamp3). Slots1/2 signed-int positive flags; movement zeroes switch/repeat/velocity/distance when velocity=(0,0) or distance<=0; switch stored positive signedint->byte, repeat!=0; disappear stores any positive raw. This last parse threshold is QFP0, not epsilon4 (epsilon4 is the later OnUpdate timer gate). InitPost phase1 iff switchbit0 clear and abs(moveVelo)>=4. Existing approximate bridge-devices parser is not reused or edited.
- Bridge static Thunder OnUpdate uses native Base.update only for phase0 and abs(disappear)<4, or Base flag3 bypass. Independently read jump table18172d018 entry0 ->18172cf0a restore/return. Moving/disappear callbacks remain required host, never silently omitted. First typed static Update exact map wall fixture length12320004, cachedflags5, probeinactive, beamresize verified.
- Actual3-2 full array prefix now passes twoPlayer/Key/Goal/sixDamageRect/Rect/Thunder then refuses Thorn93. View materialization actual core, typed Add/holder still explicitly synthetic in that prefix fixture; no fullstage claim.
- NativeActorAdd20 frozen reviewed and exposed through Factory.addAndInitializeActor. Takes actual native actorPool/heap/profile plus previously materialized EntityRef. Preserves typed write/mask/null callbacks then wrapper EntityRef; Initialize QString/scale/weight then holder capacity4/element8/header16/count0, then handle/bit14. Tests use prepared Actor/View blocks and synthetic named heap fixture, not actual heap. Returned native pool is a boundary snapshot; canonical runtime Actor table is not auto-inserted/synchronized. This synchronization remains required before wiring default creator hosts to it. Do not let native pool payload become a stale second authority.
- Focused factory46 + ActorAdd20 =66/66. Full2160/2160 passed including concurrent helper tests. New report native-thunder-factory-report.json. NativePoolGrowth26 read-only audit frozen but no growth code adopted; NativePoolStorage and DamageRectUpdate are separate worker scopes, SceneNameDictionary remains pending review/integration. No remote push/deploy/native execution; legacy carry still unfinished.


### NormalThorn static creator completion (2026-10-15)

- Factory.finishThornCreation/createThorn and default type93 Update path added. NormalThorn.Creator181889120 sequence verified: Actor91e1 -> AddThorn9205 -> Parse9219 -> collisions922a -> Reset923b -> AddNormalThorn925b. Exact audited Thorn prefab GUID included. Common Thorn state and NormalThorn identity remain separate.
- Parse1817206b0 preserves byte direction clamp, unvalidated override byte, absolute speeds/wait, packed population pair fallback and slot12!=0 flag. Reset181720e60 writes alpha1/zero motion state, Actor flag7, shared pooled sorting54=-2100, then beltPhase1 only when BOTH endpoint vectors and beltSpeed meet epsilon4. Bridge common controls for93 forward Actor as proved by NormalThorn181889613 -> Thorn181721abe; event61 remains outside this addition.
- Factory49/49 and full2220/2220 passed (lead-thorn-factory-full.local.txt; includes concurrent helper tests). Actual3-2 prefix now reaches LinePathLift103 after Thorn; prefab View writes real, Actor/typed Add and holder allocator still explicit fixtures. Pool exhaustion and duplicate-name failures roll back whole world. No ordinary Thorn Update integration or full-stage/carry claim.
- Next LinePathLift static reads: Creator1818782b0 Actor8360 -> Add8384 -> Initialize8398 -> Parse83a9 -> InitCollision83ce. Initialize1818783e0 allocates path10 at8471 and fakePath2 at8523, stores handles component+20/+1c at84fb/8591. InitCollision181878b30 uses CreateCollision(push2,sync1), layer13, flag2, flag7 according to component+10 inertia, flag10. Need explicit heap-array boundary and full native Parse before factory completion; source-linepath-devices decode alone does not attest allocations.
- SceneNameDictionary52 and NativePoolStorage19 frozen files read but not modified/staged. Their physical authority/descriptor identity and raw pool payload synchronization are still pending. NativeActorCodec helper remains separate WIP. Legacy runtime untouched; no push retry/deploy.
