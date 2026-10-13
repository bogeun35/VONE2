# 17-move-contact — result
status: partial
files: source-migration/source-move-contact.js, source-migration/source-move-contact.test.cjs, source-migration/move-contact-report.json, codex-briefs/17-move-contact.result.md
tests: 개별 13 통과 / 0 실패; 전체 445 통과 / 0 실패 (node --test source-migration/*.test.cjs)
what it is: 움직이는 물체의 네이티브 접촉 목록에 들어 있는 액터를 함께 이동시키는 순수 helper다. 두 명이 쌓인 경우 재귀 이동하며, 리프트의 이동 가능 검사는 탑승자 접촉 체인이 천장에 닿았으면 이동 전체를 취소한다. 실제 이동 함수 자체는 천장 검사나 압사 이벤트를 수행하지 않는다.
stage compiles alone: 아니오. 장치 compile이 없는 helper이며 2..8인 실제 스테이지 연결은 검증하지 않았다. 원작 충돌 캐시 생성과 타입별 callback 근거가 필요하고 기존 lift/MoveWall 런타임 연결은 수정하지 않았다.
key findings:
- face=Up0/Down1/Left2/Right3, normal=(0,-1)/(0,1)/(-1,0)/(1,0): 0x18177e46c..4f6.
- 기본 sync=true/recursive=true, 나머지 bool=false, index/mask=0: 0x18177e252..25d, 0x1816a27c5..27d0.
- 접촉 선택은 이동 전 저장된 법선의 정확한 일치다. AABB overlap/sweep를 새로 계산하지 않는다: 0x181691a55..a88.
- preflight는 delta 크기의 이동 예측이 아니라 normalized direction의 접촉 체인을 검사하며 mask/recursive 옵션으로 검사를 제한하지 않는다: 0x1816a181e,1991,19f9.
- 리프트는 preflight 실패 시 offset/root/carry를 취소한다. crush 또는 clamp가 아니다: 0x1817382e2..2eb,34a..351.
- actual transport는 flags 0x10/0x80과 layer mask를 필터하고 EntityRef 중복을 막는다: 0x1816a0f96..fce,1182..11d5.
- ignoreTargetVelo는 반대 방향 속도의 투영을 delta에서 뺀다. 재귀는 조정 delta가 아닌 원래 delta를 받는다: 0x1816a1208..12d2,1550..157d.
- lift와 MoveWall의 정확한 호출 매핑, 루트 commit 및 moved 결과 적용 책임을 JSON report의 integration에 기록했다.
unresolved:
- AABB에서 원작 contact/mapNormal 캐시를 만드는 충돌 단계는 미복원. 캐시 없는 입력은 throw한다.
- 대각선 FP 정규화, 타입별 이동 callback, 화면 끝 제한, 다중 collision index는 미복원이며 해당 경로를 명시적으로 거부한다.
- 테스트 탑승자는 callback 없음이 명시된 합성 액터다. 일반 플레이어/자석/GoKart에 그대로 적용 가능한 완성품이라고 주장하지 않는다.
- 천장에 이미 접촉한 경우 이동 취소는 입증했지만 비접촉 천장에 대한 sweep/crush 및 다른 caller 정책은 미확정이다.
- 기존 lift 발견 수정의 correction history를 report에 남겼고 기존 refusal은 제거하지 않았다.
- 공통 런타임, 다른 작업 파일, 큐, HANDOFF 변경 및 등록·배포·커밋·푸시는 수행하지 않았다.
