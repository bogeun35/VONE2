# 14-player-magnet — result
status: partial
files: source-migration/source-magnet-devices.js, source-migration/source-magnet-devices.test.cjs, source-migration/magnet-device-report.json, codex-briefs/14-player-magnet.result.md
tests: 전용 파일 8건 통과; full suite: 269건 통과, 실패 없음
what it is: 플레이어에게 장착되는 자석이며 입력 enum 9로 포획 가능한 충돌 대상을 끌어당긴다. 플레이어뿐 아니라 다른 Actor의 포획 승인 이벤트와도 연결된다. 이번 결과는 원본 상수·파라미터·접근 계산의 검증된 부분 복원이며, 활성 장치의 compile은 미해결 계약을 명시해 거부한다.
stage compiles alone: 아니오. st_w_03_03, st_w_03_04, st_w_05_03 모두 2..8인에서 활성 자석 때문에 거부한다. 03_03은 LinePathLift/DelaySwitch 등, 03_04는 ColorBox/Arrangement 등, 05_03은 CoinObserver/Coin 등 별도 모듈도 필요하다. 등록·배포·커밋·푸시는 수행하지 않았다.
key findings:
- Creator ordinal72는 PlayerMagnetComponent.Creator 0x1816cf980이다. ParseParameter는 datas[0]만 읽고 플레이어 actor index로 연결한다(0x1816cfe1e, 0x1816cfe37). 나머지 슬롯의 1을 임의 옵션으로 해석하지 않았다.
- 실제 세 스테이지의 모든 online 2..8인 선택에 자석8개가 항상 존재하며 슬롯0은 0..7이다. 존재하지 않는 플레이어일 때는 원본 ParseParameter가 반환한다(0x1816cfea42..a5); 이 모듈은 매핑 미구현 때문에 모든 활성 장치의 컴파일을 보수적으로 거부한다.
- 정적 문자열을 복원했다: 0.6 raw39321(0x1816d2f75), X계수0.03 raw1966(0x1816d2f95), Y계수0.08 raw5242(0x1816d2fcb). OFFSET_X는18.5+8.25=26.75(0x1816d301f). unsigned 출력의 TRACTOR_Y는 실제 signed -44(0x1816d2dcd)로 바로잡았다.
- 접근 가속량의 상한은 X1/Y2이며 스냅 경계는 포함이다(0x1816d1581..160f, 0x1816d164a..16c8). 원본은 위치도 직접 변경한다(0x1816d1a6e). helper는 이 계산만 검증하며 전체 흡입으로 가장하지 않는다.
- 후보 정렬 이후 event16을 보내고 양수 반환한 첫 대상만 잡는다(0x1816d1f6d, 0x1816d200f, 0x1816d203e). 대상 플레이어의 자석도 조건부 연쇄 갱신된다(0x1816d125c).
unresolved:
- 후보 정렬 comparer와 동률 순서, FP 각도 필터 lookup, event16 승인·해제 계약을 아직 복원하지 못했다.
- 포획 상대관계, floating/calcGravity, 연쇄 갱신 및 입력/장착 생명주기, sound/particle/checkCatch 상태 전이의 완전 구현이 남았다.
- 현재 런타임에 동기 Actor.NotifyEvent 승인과 필요한 FP 물리 계약이 없어 등록하면 안 된다. 기존 파일 변경 권한 없이 이 계약을 근사치로 만들어내지 않았다.
- 활성 장치 틱·타이머·상태전이는 미구현/미검증이다. 테스트 통과는 부분 계산과 거부 계약의 검증이며 게임 플레이 완료가 아니다.
