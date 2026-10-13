# 11-coin — result
status: done
files: source-migration/source-coin-devices.js; source-migration/source-coin-devices.test.cjs; source-migration/coin-device-report.json; codex-briefs/11-coin.result.md
tests: 전용 테스트 6개 통과; full suite: 269개 통과, 실패 0개
what it is: 코인을 건드리면 수집 음향을 내고 코인을 삭제하며 관찰자의 미수집 목록에서 제거합니다. 목록이 비면 다음 업데이트에서 비활성 열쇠를 한 번 활성화합니다.
stage compiles alone: 아니요. 모듈 자체는 실제 두 스테이지의 2..8인 전체 14개 조합을 컴파일합니다. 전체 라운드 개방에는 st_w_05_01의 WeightedLift, st_w_05_03의 PlayerMagnet와 Claude의 런타임 등록이 필요합니다.
key findings:
- 관찰자는 미수집 코인 엔티티 목록의 Count가 0 이하일 때 완료하며 별도 인원 배수/목표 파라미터가 없습니다(0x1817f34da). 실제 데이터에서는 2~8인 모두 58개/75개입니다.
- 열쇠 타입 17에 이벤트 1을 전달하고 notified를 설정해 재발행하지 않습니다(0x1817f34fa, 0x1817f350c, 0x1817f3515).
- 코인 충돌 사각형은 높이 38, 폭 22, 로컬 X=-11/Y=-19입니다. RectFP의 순서는 Height/Width/X/Y입니다(0x1817f2e82..0x1817f2ebb).
- 수집 시 SeId 5, 목록 제거, 삭제 예약 bit13을 처리합니다(0x1817f2bb3, 0x1817f2c3b, 0x1817f2c62).
- Initialize의 128은 목록 초기 용량이며 목표 수량이 아닙니다(0x1817f3316).
unresolved:
- 전체 Quantum 충돌 필터/정확한 경계/서브프레임 순서는 미복원입니다. coinContacts는 이미 판정된 접촉을 받아 처리하고, players 폴백은 기존 포트의 엄격 AABB를 사용합니다. completePhysicsFidelity=false입니다.
- 동일 틱 반복 원작 콜백의 음향 중복 여부는 미확정입니다. 포트는 수집 단발 처리합니다.
- 다중 관찰자 전역 슬롯 수명주기 및 지연 생성은 compile()에서 명시적으로 거부합니다. 실제 대상 스테이지에는 해당 사례가 없습니다.
- 런타임 등록/브라우저·온라인 통합/사람의 원작 비교 검수는 수행하지 않았습니다. 기존 파일 수정, 등록, 배포, 커밋, 푸시는 하지 않았습니다.
