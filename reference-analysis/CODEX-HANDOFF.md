# Codex 인수인계 — Claude 가 하던 "등록·연결·배포"까지 이어받기

> 2026-10-13, Claude 세션 만료 직전 작성. 이 문서를 읽은 Codex 세션 **하나**가 리드 역할을 맡는다.
> 공통 규칙은 [`AGENTS.md`](AGENTS.md) 그대로 유효하다(상수를 지어내지 않는다, 확정 못 하면 throw).

## 현재 상태

- **최신 로컬 상태**: v20261013-12 배포 커밋 `ec50e31` 준비됨(3-2 재귀 탑승 인원 수정). 라이브는 v20261013-11 / `4dd3947` 유지. VONE2 로컬 `f69a3bfa`, `791c5a8d` 및 후속 커밋이 원격 `cec72c8e`보다 앞서며 푸시 보류. 원격 승인 심사가 다시 거절한 정확한 내역과 재개 명령은 문서 마지막 절에 있음. 이전 “현재 차단 아님” 문구는 당시 기록이다.

- **라이브 17라운드**: 1-1 1-2 1-3 1-4 4-1 4-3 4-4 5-2 10-2 11-4 7-2 10-1 10-4 13-1 11-2 12-3 3-2
- 직전 배포본 `v=20261013-10`, chamchicode `0751918`. 인수 시 작업 저장소 HEAD `e26ab37b` (런타임 마지막 변경 `fa2e6e89`).
- 등록 커밋 VONE2 `27977e2c` 및 후속 기록 `4200bd58`, 배포 `4dd3947` 모두 push 완료. 사용자의 “두 저장소 푸시 승인”을 근거로 정상 require_escalated 경로로 재시도하여 성공. 라이브 `v=20261013-11` 및 공개 source-stage-runtime.js의 로컬 일치를 HTTP 200으로 확인했다. 이전 자동 심사 거절은 아래 과거 기록이며 현재 차단이 아니다.
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
- 당시 REA first-run.md는 0 bytes였으나, 22:32에 결과가 생성됐다. 아래 최신 충돌 코어 기록에서 0x1818713e0 대조 완료. 원본 게임 실행 없음.
- 119개 인원별 맵 360틱 이내 무입력 smoke: 총 37,520틱, 런타임 예외 없음(사망 시 해당 실행 종료). 인간 완주 아님.
- 기존 10라운드 8인 녹화 5회 재생: 6 clear/reproducible, 1-2/1-3 미완주, 5-2 tick3862 시간초과, 4-3 기존 blocked. 실패 3개는 변경 전 HEAD 런타임으로도 같은 status/tick 확인: 이번 등록으로 인한 회귀 아님. 인수인계의 9/10 완주 주장은 현재 runtime으로 재현 안 됨.
- 배포 클론 생성 완료: v20261013-11, 168 files/17 stages, 참조 누락 없음. 배포 로컬 커밋 `4dd3947`. 원격 push는 네트워크 기본 실행 실패 후 자동 승인 심사에서 거절됨: 정확한 외부 대상에 대한 trusted user authorization 미확인 및 139파일 export 위험. 원격 라이브는 아직 v20261013-10 / 0751918이며 변경 배포 완료라고 보고하지 않음. 승인 전 우회하지 않음.

## 열린 질문 (중요한 순)

1. **수평 발판 전달 경로 발견, 아직 미연결.** CollisionScene.postPushBack → updateInertia → moveForInertia가 collision currentX-preX를 전달한다(0x1817fc1c2..1d9/0x1817fc3ea). MoveContactActor X=0만으로 수평 carry 부재를 주장한 설명은 철회한다. Map.Move/UpdatePushBack/camera 보정 및 native cache/Player wakeUpCount·equipment 상태를 연결해야 한다. LinePathLift는 isInertia로 disable0x80을 설정하므로 mode를 무시한 일괄 carry도 잘못이다. 주소와 필터는 move-contact-report.json 참조.
2. DamageRect 의 활성 조건 mask 3 에 지형도 포함되는지(지금은 플레이어만 봄).
3. `source-move-contact.js` 부분 완료 — 원작 충돌 캐시 생성과 타입별 콜백 근거.
4. 11-2 기둥: 원작은 좌/우로 기둥 반대편(52px)으로 도는 것으로 보이나 미구현, 탑승자끼리 충돌 없음.
5. 새로 연 라운드(10-1 10-4 13-1 11-2 12-3 3-2)는 **사람이 끝까지 해본 적 없다**.

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
