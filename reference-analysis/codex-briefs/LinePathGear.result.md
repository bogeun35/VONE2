# LinePathGear — result (후속)
status: done (장치 숫자 코어·적용 계획 완료, 공용 런타임 연결 대기)
files: source-migration/source-linepathgear-devices.js; source-migration/source-linepathgear-path.js; source-migration/source-linepathgear-devices.test.cjs; source-migration/linepathgear-device-report.json; codex-briefs/LinePathGear.result.md

tests: 개별 45/45 통과. 전체 655건 중 653 통과, 진행 중인 타 세션 source-searchlight-devices.test.cjs의 fade 테스트 2건 실패(50·57행). 타 소유 파일은 수정하지 않았습니다.

what it is: 경로를 따라 왕복하는 원형 톱니입니다. 실제 인원별 속도·끝점 높이·전체 경로 길이·좌표 보간·끝점 전이와 OnPost 회전까지 숫자 코어를 완성했습니다. 원형 충돌과 공용 Actor 처리의 런타임 연결은 별도 담당 영역입니다.

stage compiles alone: 숫자 모듈은 실제 mapInitParam.chipSize를 넣으면 두 스테이지의 2~8인 14개 선택 모두 컴파일됩니다. 전체 라운드 playable 판정은 아니며, 임의 true 옵션이나 가짜 callback을 통해 실행 완료로 주장하지 않습니다.

key findings:
- 보조3의 source-distanceconstraint-math.js 전체 FPSqrt 65,537 항목을 재사용했습니다. 설치 LUT(body11384408,262148 bytes) SHA256 de5265f651730f20b54cc24bdcd3047e61320be44a5ae54796d290a189f4bca5 및 전 범위를 독립 oracle로 검증했습니다. sqrt 미확정 거부를 해제했습니다.
- Actor.initPos/currentPos는 작성된 픽셀 FP 그대로입니다(0x1816a3351..373,0x18169d2ca..2d6). QLinePath는 픽셀 구간 길이를 먼저 합한 뒤(0x1816dd138..178), 전체 길이를 Camera.ViewMatrix로 변환하고 다시 sqrt하여 이동 시간용 길이를 얻습니다(0x1816dd219..2b8). chipSize48의 reciprocal은 raw1365이며, 정확한 길이/48로 대체하면 틀립니다(0x1817df592/5bc).
- GetPathPosition은 전체 픽셀 길이×진척도에서 >=로 구간을 선택하고 local FP divide/lerp합니다(0x1816dd548..604). 실제 두 스테이지의 톱니 28개를 왕복 두 번씩 전 틱 위치·회전·상태 전이 oracle과 비교했습니다.
- 15-1 톱니1 편도는 411틱입니다. 톱니2/3은 시작 대기를 event61로 해제한 뒤 2~5인 439/379틱, 6인 475/410틱, 7인 702/606틱, 8인 798/689틱입니다. 라이트4-2는 2~3인 958틱, 4~6인 935틱, 7~8인 912틱입니다. 정확한 DeltaTime raw1092 기준의 컴포넌트 계산입니다.
- Actor.SetPosForce는 Actor currentPos와 prePos를 함께 쓰고(0x18169d592/59a), 모든 유효·해결된 collision의 current/prePos도 쓰며 bit6을 지웁니다(0x18169d692..6fa). velocity·expectedPos·scale·contact cache는 바꾸지 않는 적용 계획으로 복원했습니다.
- OnPost는 standby여도 실제 Actor 이동 후 위치로 회전을 갱신합니다(0x1818776fa,0x1818777a9..85c). 계획된 경로 위치만으로 회전을 대신하지 않습니다.
- 정정: byte+1은 Collision.m_Layer입니다. R1 otherAttribute/attribute 명칭을 otherLayer/layer로 고쳤습니다. LinePathGear pushBackTarget은0이며 일반 Gear의3과 다릅니다(0x18187740a..423). event43에는 풀 초기화 근거에 따라 causeDead0을 명시했습니다(0x181780c31).

integration:
- 브라우저 로드 순서: source-distanceconstraint-math.js → source-linepathgear-path.js → source-linepathgear-devices.js. 기존 math 파일은 읽기/재사용만 했습니다.
- compile에는 실제 chipSize를 넣습니다. beforeStep에는 exact dtRaw와 실제 Actor initPos·resolved collisionSlots를 주고, 반환 positionPlans를 native OnUpdate 시점에 적용해야 합니다.
- afterStep에는 실제 post-Actor xRaw/yRaw를 줍니다. 원형 콜백은 보조1의 response/공용 collision graph에서 native 순서로 contacted/collided를 호출해야 합니다.
- 다른 장치·공용 런타임·play·등록·배포·커밋·푸시·이전 SwitchTargetGroup은 수정하지 않았습니다.

unresolved: 공용 Actor/Map.Move/contact/inertia의 실제 계획 적용·콜백 캐시·phase 순서, 원형 response, Player/SharedHP event43 및 공통 Actor 이벤트 연결이 남습니다. 안전 정수 범위 밖 FP 결과는 정확한 거부 사유로 남깁니다. 장치 숫자 코어 완료를 전체 라운드 playable로 집계하지 않습니다. R1 관측과 미확정 내용은 리포트 previousPass 및 corrections에 보존했습니다.

REA/Ghidra 확인: 새 first-run.md(15,880 bytes)와 gameassembly.json(17,787 bytes)을 실제 읽었습니다. Ghidra12.1.4의 0x1818713e0 의사코드를 어셈블리 0x181871571..5d0과 대조하여 15개 양수·음수·경계값 모두 trunc(n*65536/100)과 일치함을 확인했습니다(5→3276,66→43253). REA6.4.0의 help와 JSON 구조도 확인했습니다. JSON은 한 함수 증거이며 영속 전체 Ghidra 프로젝트라고 주장하지 않습니다. 출력이 임시 프로젝트 삭제와 56.3분 분석을 명시하고, 현재 LinePathGear 코어는 이미 어셈블리·45개 테스트로 완성되어 추가 전체 import는 실행하지 않았습니다. LinePathGear 자체의 Ghidra 의사코드를 새로 얻었다고 주장하지 않습니다. 원본 snapshot과 공용 인수인계는 수정하지 않았습니다.
