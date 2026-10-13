# 06-12-01-gokart-stick — result
status: partial
files: source-migration/source-gokart-devices.js; source-migration/source-gokart-devices.test.cjs; source-migration/gokart-device-report.json; codex-briefs/06-12-01-gokart-stick.result.md
tests: 지정 파일 14개 통과; full suite: 314개 통과, 실패 0
what it is: 플레이어 전원이 GoKart에 탑승하고 최대 네 명이 운전하며, 5인 이상에서는 운전자를 교대한다. Stick은 해당 스테이지에 5~8인일 때만 다섯 개 배치되는 리소스 액터이다. 현재는 근거가 확인된 계산 helper와 명시적 컴파일 거부만 구현했으며, 플레이 가능한 장치 구현은 완료하지 못했다.
stage compiles alone: no — st_w_12_01은 2..8인 모두 GoKart compile 예외로 거부한다. 5..8인 Stick도 별도로 컴파일을 거부한다. 등록·배포·커밋·푸시와 기존 파일 수정은 하지 않았다.
key findings:
- Stick ParseParameter 0x1816f93b0는 non-null 검사 후 반환하며 매개변수 저장이 없다. Creator 0x18170f703는 리소스에서 Actor를 생성하므로 무충돌/장식이라고 판단할 수 없다.
- GoKart datas[0]/[1]은 QPlayerCountParam이며 0x18185c7c3..825 / 844..8ab가 현재 인원 이하의 첫 nonzero 값을 선택한다. 실제 jump는 2인 17, 3..8인 20; speed는 모두 5이다.
- 운전자는 min(count,4), 다음 시작 인덱스는 5인 이상에서 (index+count-4)%count이다: 0x18185cfcc..cfda, 0x18185efb9..efdf. 7인 첫 교대는 0→3이다.
- 점프는 선형 합산이 아니라 [1-(1-입력수/운전자수)^2]×점프값×ActorScale이다: 0x18185ec3c..ecc0.
- 중력은 틱마다 raw 0xa666을 더하고 raw 0x138000에서 제한한다: 0x18185ea87..eb0d. 30틱 raw 1277940, 31틱 raw 1277952가 된다.
- OnStart/OnPost가 좌석을 강제 배치하고 플레이어 mode 11은 자체 충돌을 끈다: 0x18185cd5a..cd7c, 0x18185ee29, 0x1816c7882. 단순 이동 발판 모듈로는 동작을 재현할 수 없다.
unresolved:
- Stick resource prototype 충돌과 접촉 소비 로직 미복원.
- GoKart 자동 스크롤/카메라 경계 좌표 연결, 입력 간격/에지 상태 전이, 탑승·하차·열쇠 소유권 이전·사망 전파와 FP sine chassis 변위 미구현.
- 충돌 튜플 크기 두 성분의 축 의미 미확정. 원시 튜플을 남겼고 실제 solids는 생성하지 않았다.
- 따라서 compile을 거부하는 partial 상태이며, 게임 동작·클리어·온라인 통합 검증은 하지 않았다. 상세 주소와 후속 런타임 hook은 report의 evidence/integration/unresolved와 모듈 header에 기록했다.
