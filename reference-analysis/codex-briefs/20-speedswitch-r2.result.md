# 20-speedswitch-r2 — result
status: done
files: source-migration/source-movewall-devices.js, source-migration/source-movewall-devices.test.cjs, source-migration/movewall-device-report.json, codex-briefs/20-speedswitch-r2.result.md
tests: 전용 17개 통과; 전체 447개 통과, 실패 없음.
what it is: SpeedSwitch는 접촉한 플레이어 또는 전체 플레이어에게 event57을 반복 발행하여 걷기 속도와 얼음 최대 속도를 바꾼다. 접촉 해제 시 속도 복원 이벤트는 없다. MoveWall 접촉 어댑터 없이 SpeedSwitch만 독립적으로 컴파일하고 처리할 수 있다.
stage compiles alone: 장치 모듈 기준 st_w_12_03의 2..8인 모두 성공. 기존 컴파일 가드는 이미 선택된 MoveWall에만 적용되고 있어 유지했으며, 실제 데이터 회귀 테스트를 추가했다. 공통 런타임 전체 스테이지 컴파일/플레이는 등록하지 않았으므로 아직 완료를 주장하지 않는다. SpeedSwitch 충돌 공급·event57 라우팅과 기존 Wind 연결이 필요하다.
key findings:
- event57 배율 clamp는 raw6553..196608 (0x1816c6858..0x1816c6878).
- InitWalkSpeed는 배율 × Stage.m_BaseScale × QPlayerDefine.SPEED_X를 각 곱셈마다 imul64/sar16로 계산한다 (0x1816bec85/91, 0x1816becb4/b9). 얼음 최대 속도는 결과 × Stage.m_IceSpeedUp (0x1816becc4/c9).
- SPEED_X는 raw196608=3. QPlayerDefine..cctor 0x18177e300/307에서 QFP._3(+0x128)를 복사한다. 이전 보고의 QFP[8]/stage.walkSpeed 설명을 correctionHistory에 수정 기록했다.
- 실제 st_w_12_03은 모든 인원에서 스위치 (3168,432), 배율3, 전원 모드, 방향0. stage scale1/iceSpeedUp1.5이므로 변경 후 걷기 raw589824, 얼음 최대 raw884736.
런타임 호출 계약: applyPlayerSpeedEvent(current,event57). current에는 stageBaseScaleRaw와 iceSpeedUpRaw, 이벤트에는 speedScaleRaw를 정수 raw로 전달한다. 반환 객체의 walkSpeedRaw/walkSpeedMaxOnIceRaw를 런타임 플레이어 이동 값에 연결한다. 기존 필드는 보존하고 입력 객체는 변경하지 않는다. 이벤트 대상 선택은 런타임이 담당한다. 동일 이벤트 재적용은 속도를 누적 증폭하지 않는다.
unresolved: MoveWall 공통 재귀 접촉 어댑터는 여전히 필요하며 기본 컴파일 거부를 유지한다. SpeedSwitch의 공통 Switch 충돌 순서 공급, observer, 시각/음향 부작용과 실제 플레이 통합 검수는 남는다. 병렬 작업17의 완료를 기다리거나 해당 파일을 수정하지 않았다. 런타임 등록·배포·커밋·푸시는 수행하지 않았다.
