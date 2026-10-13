# 12-checkpoint — result
status: done
files: source-migration/source-checkpoint-devices.js; source-migration/source-checkpoint-devices.test.cjs; source-migration/checkpoint-device-report.json; codex-briefs/12-checkpoint.result.md
tests: 전용 테스트 17개 통과; full suite: 424개 통과, 실패 없음 (`node --test source-migration/*.test.cjs`).
what it is: 플레이어 한 명이 닿으면 파티 전체의 재시작 기준을 활성화한다. 접촉 순간의 플레이어 위치를 저장하는 것이 아니라, 스테이지에 지정된 인덱스별 재등장 좌표와 스테이지 플레이 시간을 사용한다. 저장 상태와 재등장 정보는 모듈에서 제공하며, 실제 재시작 훅 연결은 리드 담당이다.
stage compiles alone: no — 네 스테이지 모두 2..8인용 체크포인트 모듈은 컴파일된다(온/오프라인 56개 선택 검증). 현재 전체 런타임 whitelist는 네 스테이지 모두 거부한다. 3-1은 Blackout/SearchLight, 7-4는 Ghost/FloatingThorn/DelaySwitch, 15-1은 LinePathGear/CollisionSwitch, 15-2는 Blackout/BlackoutController/ColorBox/DeadSwitch 및 각 스테이지 등록·재시작 훅 연결이 필요하다. 다른 세션의 새 모듈 등록 상태는 검증하지 않았다.
key findings:
- 0x1817edf72..0x1817edfab: 충돌 크기는 너비32×높이64, 오프셋(-16,-64). 0x1817edc69 layer10 트리거이며 0x1817edccf는 플레이어 layer1만 허용한다.
- 0x1817edadd, 0x1817edb42..0x1817edb55: 생성할 때 전역 Position과 최대9개 재등장 좌표를 설정한다. 0x1817868e6..0x1817868f2는 첫(0,0)에서 종료한다. 7-4는 실제로9개를 지정한다.
- 0x1817edd3f..0x1817edd4e: 첫 접촉 즉시 PlayTime 저장, 전역 IsActive와 로컬 checked 설정. 타이머 없음. 같은 인스턴스는 이후 접촉을 무시하며 효과음은24(0x1817edcf2).
- 0x1816a3bcd..0x1816a3cc7: actorIndex로 좌표 선택, 실제 actor anchor Y는 지정Y-1. 목록 밖은 checkpoint.y-stackIndex×48-1이다. 두 인덱스는 서로 다른 인자다.
- 0x1816a3cf1, 0x1816a3d1c..0x1816a3d2a: 플레이 시간 복원, 스크롤X=max(0,checkpoint.x-180). 접촉한 플레이어의 현재 위치나 열쇠·다른 장치 상태를 스냅샷으로 저장하지 않는다.
- CheckPointInfo는 파티 공용 전역 상태다. GameOverCount는 별도 사망 처리(0x18170ddc8)가 증가시키며 모듈이 임의로 변경하지 않는다.
integration: 보고서 integration에 등록·충돌·사망/재시작·snapshot 연결 요구 사항을 기록했다. 저장 checkpointInfo를 라운드 재생성 사이에 유지하고 compile options.checkpointInfo로 전달한 뒤 respawn()의 네이티브 anchor, PlayTime, scrollX를 적용해야 한다. 새 라운드의 로컬 checked는 원본처럼false이며 새 스테이지/전체 초기화 시 전역 저장 상태를 폐기한다. 기존 파일, 런타임 재시작 로직, 다른 지시서는 수정하지 않았다. 등록·배포·커밋·푸시하지 않았다.
unresolved: 다중 체크포인트 생성 순서와 비정확 FP float 로더 변환은 compile에서 명시적으로 거부한다. 실제 네 스테이지는 각각1개이며 좌표가 모두 정수라 이 제한에 걸리지 않는다. 원본 충돌 가장자리 및 동일 틱 사망/접촉 순서는 완전 검증하지 않았다(정확한 네이티브 dispatch를 갖춘 contacts 경로 제공). 원본 뷰 애니메이션, 전체 스테이지 플레이, 사망 재시작과 온라인 통합은 아직 미검증이다. completePhysicsFidelity=false.
