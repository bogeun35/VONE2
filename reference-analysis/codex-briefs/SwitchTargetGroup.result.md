# SwitchTargetGroup — result
status: done
files: source-migration/source-switchtargetgroup-devices.js; source-migration/source-switchtargetgroup-devices.test.cjs; source-migration/switchtargetgroup-device-report.json; codex-briefs/SwitchTargetGroup.result.md

tests: 개별 18건 모두 통과. 첫 전체 테스트 494/494 통과. 최종 전체 테스트에서는 다른 세션 파일 두 곳 실패: source-distanceconstraint-devices.test.cjs의 native floor friction(11234/11233 불일치), source-registration.test.cjs의 checkpoint JSON BigInt 직렬화 오류. 해당 파일은 수정하지 않음.

what it is: 스위치 켜짐(61)·꺼짐(60)을 최대 20개의 이름 대상에 순서대로 전달하는 보이지 않는 장치입니다. 4-2에서는 Gear1·Gear2를 함께 제어합니다. 물리 충돌·화면 표시·타이머·상태 래치는 없습니다.

stage compiles alone: 아니오. 장치 자체는 실제 5개 스테이지의 2~8인 35개 선택에서 정확하게 컴파일됩니다. 전체 4-2는 보조 세션 1의 Gear와 리드의 런타임 등록이 필요하며, 다른 라운드도 개별 차단 장치가 남습니다.

key findings:
- Creator 0x181719a30, actor ordinal205(0x181776283).
- ParseParameter 0x181719db8..0x181719e01: 20개 QStringUtf8_32 슬롯. 빈 슬롯이 중간에 있어도 계속 진행하며 대상 중복도 유지합니다.
- OnRecvEvent 0x181719eda..0x181719ee1: 정확히 60/61만 그룹 전달. 다른 이벤트는 ActorComponent에 위임(0x181719f04).
- GetEventParam 0x18171a0ec, 0x18169dc4a: 새 이벤트 발신자는 원래 스위치가 아닌 그룹 엔티티.
- Frame.NotifyEvent 0x18174a073..0x18174a0a5: 이름으로 찾은 한 액터에 즉시 전달. 대상 부재는 전달 없이 종료.
- QStringUtf8_32 0x18168e7c2/0x18168e82a: UTF-8 30바이트. 문자열의 따옴표·공백을 임의 제거하지 않음.
- 실제 6-4의 비활성 Key1이 기존 key signal 처리기를 통해 그룹 on/off에 따라 바뀌는 통합 테스트 통과.

unresolved: 공통 ActorComponent 이벤트 처리, 지연 생성 생명주기, 중복 scene name의 FindActor 선택 순서, 잘못된 UTF-16 문자열의 인코더 fallback, 풀링 이벤트의 추가 필드 기본값, 중첩 그룹/순환의 공통 디스패처 처리가 남습니다. 지연 생성·중복 그룹 이름·UTF-8 용량 초과는 정확한 사유로 거부합니다. Gear·BgmChanger 등 대상 장치 구현은 범위 밖입니다.

integration: signal(state,event) 반환 events를 즉시 대상 이름 디스패처로 전달합니다. 한 입력을 signal/beforeStep/afterStep 중 한 경로로만 처리해야 합니다. actorEvents는 공통 ActorComponent로 전달합니다. 중첩 그룹은 다음 슬롯보다 먼저 재귀 전달해야 합니다. 공용 파일·큐·play·등록·배포·커밋은 건드리지 않았습니다.
