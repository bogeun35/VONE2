# 13-wind — result
status: done
files: source-migration/source-wind-devices.js, source-migration/source-wind-devices.test.cjs, source-migration/wind-device-report.json, codex-briefs/13-wind.result.md
tests: 자체 테스트 8건 통과; full suite: 314건 통과, 실패 0건

what it is: Wind는 범위 안의 액터에 수평 바람 값을 기록한다. 스위치 이벤트 61은 강풍, 60은 약풍으로 전환하며, 약풍도 계속 분다. 런타임이 적용할 일회성 이동 속도 보정값과 본체·바람 영역을 제공한다.

stage compiles alone: 아니오(2..8인 모두). 네 스테이지의 Wind 데이터는 전 인원에서 컴파일하지만 스테이지 런타임 등록과 실제 충돌·힘 적용은 아직 필요하다. 현재 remaining-work.json 기준 02-04는 ColorBox/LinePathLift/MoveWall/Text/TouchEnergy, 07-01은 ArrowSign/HalfOperator/StepEnemy, 09-04는 DistanceConstraint/TopViewPlayer, 12-03은 SpeedSwitch/WeightedLiftEx가 추가 차단 요소다. 지시서의 12-03 설명과 현재 목록이 다르므로 검토가 필요하다.

key findings:
- 기본 범위 1280, 강풍 배율 2: Initialize 0x181738a2a/0x181738a58.
- 인원별 힘은 datas[count], 방향은 datas[9] 정수값의 0 여부이며, 위치는 (count-2)×datas[0/1] 보정: ParseParameter 0x181738ac5/0x181738b8e/0x181738c01..3a.
- 본체 RectFP는 높이74·폭48·오프셋(-31,-75), 바람은 높이16·폭범위·오프셋(0,-60): .cctor 0x1817392c2..339 및 InitCollision 0x181738dd1..df3.
- 이벤트 60/61은 비활성화/활성화가 아니라 약풍/강풍: OnRecvEvent 0x181738f4e..fd9.
- 힘은 합산하지 않고 m_Wind를 덮어쓴다: OnCollided 0x181739099. 일반 Player는 계산된 이동 속도에 더하고 지운다: 0x1816c3dcc..e00.
- 09-04는 TopViewPlayer가 있는 스테이지다. 인원별 수치 검증은 했지만 탑뷰 시뮬레이션 지원을 의미하지 않는다.

unresolved: 탑뷰는 명시적으로 거부한다(0x1816b9080, 0x181738ec8). 런타임 연결·충돌 마스크/순서·힘 적용 시점은 담당자가 통합해야 하며 통합 테스트는 수행하지 않았다. 비플레이어 액터의 m_Wind 소비 경로와 원작 대조 플레이는 미검증이다. detailed limitations는 wind-device-report.json의 unresolved에 기록했다. 등록·배포·커밋·푸시 및 기존 파일 수정은 하지 않았다.
