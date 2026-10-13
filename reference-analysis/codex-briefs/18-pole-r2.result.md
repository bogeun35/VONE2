# 18-pole-r2 — result
status: done
files: source-migration/source-pole-devices.js, source-migration/source-pole-devices.test.cjs, source-migration/pole-device-report.json, codex-briefs/18-pole-r2.result.md
tests: 개별 19건 통과; 최종 전체 477건 통과, 실패 0건

봉이 매틱 오른쪽으로 이동하면서 플레이어를 붙잡고, 위·아래 입력으로 오르내리게 한다. 떠다니는 가시는 원본 FP 사인 조회표로 상하 이동하며 접촉 상대에게 이벤트43을 보낸다. 이번 작업은 정적 장치와 플레이어 상태10의 순수 함수 구현까지 완료했고, 런타임 연결은 하지 않았다.

stage compiles alone: 본 모듈의 compile은 st_w_11_02와 st_w_07_04 모두 2..8인 성공. 11-2 가시 수는 인원별 36/30/24/18/18/12/12개, 봉은 각1개다. 11-2의 추가 타입은 이 두 종류뿐이다. 실제 전체 런타임 컴파일/플레이는 Claude가 모듈을 등록하고 integration 계약에 따라 호출해야 한다. 7-4의 다른 Ghost/Lift/DelaySwitch/Thunder/CheckPoint 연결 여부는 본 작업 판정 범위 밖이다.

## 주요 근거

- FPLut.Init `0x18165aec5..0x18165aed7`이 literal slot `0x1831b9a78=FPSinCos`를 static+0x20에 로드한다. `0x1801efb25..0x1801efbbc`는 byteLength/8 배열을 만든 뒤 원본 바이트 전체를 복사한다. DLL 인라인 테이블이 아니라 `resources.assets`의 TextAsset pathID112가 실제 데이터다.
- Sin `0x18164665b`는 각8바이트 항목의 signed low32를 읽으며 `0x18164664b`의 raw411774로 modulo한다. 411,775개 사인 항목을 손실 없는 signed-byte delta base64로 모듈에 포함했다. 전체 복원 SHA256은 `df5d19c35ac2594ef98c6a5924efdb7eeea75d0f936e91314f98f6a05891781c`다. Math.sin과 보간을 사용하지 않는다.
- 가시 이동 `0x18184a10e..0x18184a159`: 정수 dtRaw 누적 → 속도 FP곱 → 원본 Sin → 진폭 FP곱 → 초기Y에 더함. 실제11-2 첫 가시는 1틱 timeRaw1092/yRaw5253790, 60틱 timeRaw65520/yRaw5794250이다.
- Player 상태10 `0x1816c9380/0x1816c9550/0x1816c95b0`: `poleEnter`, `poleStep`, `poleExit`, `poleSearchRect` 제공. 위 입력 우선, animation14/15/13, 접촉 판정이 true이면 기존 두 velocity를 유지한다. 속도는 미확정 봉 전용 상수가 아니라 현재 `m_WalkSpeed`(metadata152−16=0x88, 사용 `0x1816c98f0`)다.
- 플레이어 기본 봉 충돌 rect는 HEIGHT44/WIDTH20/X−10/Y−47 (`0x1816cbb81..0x1816cbc18`, 저장 `0x1816cbdb2/9`). 왼쪽 actor bit10에서는 native 그대로 WIDTH40/X−30을 쓴다 (`0x1816c94e1..0x1816c94f3`).
- 검색 길이는 observer instance+0x68 정수이며 없으면0 (`0x1816c9b90`). 11-2에는 observer가 없다. 양의 검색 길이는 X에 기존WIDTH+15를 더하고 WIDTH를 늘린 category8 rect를 쓴다. hit/miss는 flags2 bit0를 set/clear하며 거리가255px 미만이면 seeded PCG32 흔들림 offsetX−2..1/offsetY0을 기록한다 (`0x1816c9a46..0x1816c9b75`).

## 런타임 연결

정확한 필드와 순서는 모듈의 `integration` export 및 report의 `integration.tickOrder`에 기록했다. 상태10 전환에서 LookRight 반영 후 poleEnter를 호출한다. 플레이어 Update에서 기존 걷기/점프 대신 poleStep의 velocity/animation/flags를 적용하고, 위치 적분은 기존 Actor 처리에서 수행한다. 충돌 scene 결과와 이벤트43을 처리한 뒤 pole OnPost의 anchor snap/clamp를 적용한다. 상태10 종료 시 poleExit를 호출한다. 가시 view/scale/충돌 rect는 displays 및 thornRects를 사용한다. 별도 채팅의 구현을 기다리거나 공통 런타임을 수정하지 않았다.

## 수정 이력 및 검증

Round1의 봉 이동/1592틱 정지/인원별 높이/OnPost 제약은 유지했다. LUT 미확보 판단을 해소했고, HEIGHT/WIDTH를 거꾸로 쓴 가시 rect와 sensor 설명, PLAYER_H 근거 주소, +0x88 필드명을 바로잡아 report의 correctionHistory에 남겼다.

최초 전체 테스트에서는 병렬 작업 중인 `source-dossun-devices.test.cjs`의 기존 컴파일 거부 및 빈 인터페이스 기대값이 실패했다. 해당 파일을 수정하지 않았다. 재확인475건, 최종 코드/테스트 변경 후477건 모두 통과했다. 개별19건은 실제 변형 컴파일·전 LUT 해시·FP 틱·상태/입력/접촉·PCG·JSON 왕복·Buffer 없는 브라우저 복원을 검증한다.

unresolved: 동적 작은 가시 생성과 Endless observer의 Disappear/Resume 전체 생명주기는 범위 밖이다. 정적11-2/7-4 경로는 이에 의존하지 않는다. 런타임 등록, 충돌/이벤트43 수신/렌더러 연결과 원작 나란히 플레이 검수는 Claude와 사용자 담당이다. completePhysicsFidelity=false를 유지했다. 등록·배포·커밋·푸시를 수행하지 않았다.
