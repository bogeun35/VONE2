# BoundBallPitcher / BoundBall — result
status: partial (검증된 전용 코어 완료·동결, 공용 호스트 연결 대기)
files: source-migration/source-boundballpitcher-devices.js, source-boundball.js, source-boundballpitcher-devices.test.cjs, boundballpitcher-device-report.json, boundballpitcher-native.local.txt; 본 결과와 작업중 선점 노트
tests: 전용 35/35; 전체 1525/1525 통과

what it is: 10-3의 발사기는 공 하나가 존재하는 동안 기다린다. 공이 없어졌다는 실제 종료 콜백이 참조를 지운 뒤 상태를 초기화하고 다음 업데이트에 다시 만든다. 공은 활성 지연·인원별 마찰·무게를 반영한 반사·정지 판정·이벤트39와 소멸을 처리한다.

stage compiles alone: 실제 10-3의 2~8인 발사기 데이터는 모두 compile 가능. 스테이지 플레이 가능을 의미하지 않으며, 공용 Actor 이동·충돌 탐색/접촉 순서·Scene·이벤트풀·Key·렌더 연결이 필요하다.

key findings:
- ordinal61 → BallPitcherComponent.Creator0x1816b2280, delegate0x181776e7a. 실제 위치(1826,336), slot0=270; slot[count]×6553>>16가 속도다(0x1816b2709..2751). 2~8인 raw는317820/324373/348947/589770/524240/458710/425945. 주기 슬롯이 아니다.
- 270도는 정확한 수평이 아니다. native 각도변환→EulerZ→벡터회전(0x1816b2535..25d8)에서 halfangle154305, 설치 LUT sin46419/cos−46262를 써 방향raw(−65535,220). 다른 각도는 compile throw.
- 생성 순서0x1816b347b..3758: Actor.InitPos에서 gunY−34와dir×20을 baseScale로 조정 → factory119/CreateActorEntity → 전용 필드 → 반지름12 원 충돌(type1,layer5,push3,sync) → InitPost(weight50,manyPeople=count>=5,hidden) → Scene.AddActor. 발사기 사각형은 H40/W54/X−40/Y−54,layer4,push3,sync. 실제 BallPitcher2388/BoundBall1298 프리팹에는 해당 simulation component가 직렬화되어 있지 않다.
- 활성 지연32768과 소멸32768은1092raw로31틱. 활성화는 Actor.AccelY(+68)에 실제 Gravity를 쓴다. 업데이트 순서는 waitActivate→checkStall→friction→waitDisappear(0x1817d33c0). 정지로 소멸이 시작된 틱에도 타이머가 감소한다.
- 반사는 이전 위치/이전 속도로 수직 에너지를 보정한 뒤(0x1817d3bb8..3c4e), map은 정상성분 반전, actor는 실제 무게와 속도의 충돌식(0x1817d3e59..413a)을 쓴다. 반사계수1, 2~4인 actor 충돌에 추가raw78643; 최소 정상속도78643. FPSqrt는 기존 source-distanceconstraint-math.js를 읽기 전용 재사용한다.
- 이벤트39(0x1817d3a9c..3b17)는 X를 이벤트X에 맞추고Y를 유지, Velo(0,3), 아직 소멸 중이 아니면 충돌끄기/애니2/소멸, 항상1 반환. 소멸 중 재수신도 위치/속도는 바꾸지만 타이머는 초기화하지 않는다. 동결 BallKeyBox와 실제 sender/target 및 Key 생성 순서 통합 테스트 통과.
- OnExit→notifyDisappeared(0x1817d38d0/3930)는 발사기의 ballref를 직접null로 한다. 별도 NotifyBallDisappeared0x1816b4060의 실패/힌트 카운터 경로를 호출하지 않는다. 상태1은 참조해제 후0으로 돌아가고 그 다음 업데이트에 생성(0x1816b32c0). 임의 주기는 없다.

unresolved:
- completePhysicsFidelity=false. 실제 entity/Actor 초기값·이동·접촉 캐시/정상벡터·상대무게/레이어·Scene 순서·소유자별 충돌/가시성·공용 이벤트풀/Key/렌더는 호스트가 제공한다. solids()는 가짜 AABB를 만들지 않는다.
- beforeStep 래퍼는 pitchers→명시 ballUpdateEntityIds 순서가 실제 Scene과 일치할 때만 사용. 일반 Scene에서는 birth/updatePitcher/ball.update/contact/receive/onExit를 실제 콜백 순서로 연결해야 한다. 새 공의 같은 틱 업데이트 여부도 호스트가 실제 순회에 따라 명시한다.
- host.transaction은 외부 entity/collider/scene/receiver/Key/eventpool까지 rollback해야 한다. 모듈 자체는 실패 시 commit하지 않는다. 동기 host 콜백 필수.
- 270도 외 각도와 지연 생성은 구체적 compile throw. 다른 발사기 종류는 제외. 원작 실행·런타임/플레이/공용 파일 변경·Git 동작 없음.

검증 숫자는 코어 테스트와 실제 데이터 compile에만 해당한다. 결과·보고서·전용 파일을 동결했다.
