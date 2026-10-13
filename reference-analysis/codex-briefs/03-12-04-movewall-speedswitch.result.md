# 03-12-04-movewall-speedswitch — result

status: partial

files:

- `source-migration/source-movewall-devices.js`
- `source-migration/source-movewall-devices.test.cjs`
- `source-migration/movewall-device-report.json`
- `codex-briefs/03-12-04-movewall-speedswitch.result.md`

tests: 전용 테스트 15개 통과; full suite: 최종 실행432개 통과, 실패 없음. 첫 실행은373개였으며 동시 세션의 테스트 추가로 총수가 늘었다.

what it is: MoveWall은 플레이어를 감지하면 옆으로 움직였다가 대기 후 원위치로 돌아오는 벽이다. SpeedSwitch는 플레이어의 걷기 속도와 얼음 위 최대 속도를 변경하며, 실제 12-3/12-4에서는 각각 전원을 3배/2배로 설정한다. 확인된 파라미터·상태 머신·속도 이벤트를 구현했지만 공통 물리 연결이 없어 단독 실행 완료로 보고하지 않는다.

stage compiles alone: 아니오. `st_w_12_04`는 2~8인 모두 기본 `compile()`에서 구체적인 어댑터 누락 오류를 낸다. `nativeContactFacts:true` 옵션과 검증된 접촉 콜백을 명시한 코어 테스트에서는 세 대상 스테이지의 모든 인원별 원본 데이터가 해석되지만 이는 스테이지 실행 성공이 아니다. 공통 재귀 접촉 판정/이동, SpeedSwitch 접촉과 observer 등록, event57 플레이어 수신 및 표시 연결이 필요하다. 등록·배포·커밋·푸시 또는 기존 파일 변경은 하지 않았다.

key findings:

- `MoveWall..cctor 0x1818861d0`의 모든 상수를 resolver로 확인했다. 이동은 틱당2px (`0x181886343`), 복귀는1.5px (`0x18188636f`), 대기는 raw98304=1.5초다. 60Hz raw1092에서는 대기가91틱이다.
- `0x181885ec4`는 이동 거리의 **엄격한 초과**를 비교한다. -300 벽은 -302까지 이동하고 복귀한다. `0x181885fa5`의 actor raw+0x80은 현재 좌표가 아니라 `m_InitPos`이므로 이동 위치는 초기 좌표+offset이다.
- `InitCollision 0x181885b70`의 고체는16px 폭이며 슬롯 높이에서2px를 뺀다. 12-4 고체는 `(3880,89,16,198)`, 감지 폭은2~4인516px/5~8인246px다. 실제 population 규칙상4인 이하에는 MoveWall1(-500 감지),5인 이상에는 MoveWall2(-230 감지)가 선택된다.
- 벽은 접촉 플레이어를 재귀적으로 민다 (`0x18188602a`). 대상이 지형에 막히면 preflight가 false (`0x1816a1991..0x1816a1a08`), 벽은 이전 offset을 복구한다 (`0x181885f7e`). 이 분기에서는 압착 사망 이벤트를 보내지 않는다.
- SpeedSwitch는 event57의 payload+0x50에 배율을 넣는다 (`0x181709197..0x1817091bd`). 전원 대상은 actor type27이고, 개인 모드는 접촉 entity다. 접촉을 해제해도 속도 reset을 보내지 않는다.
- 플레이어 event57 처리 (`0x1816c6858`)는 배율을 raw6553~196608로 제한하고 `InitWalkSpeed 0x1816bec10`으로 걷기 및 얼음 위 최대 속도를 **재계산**한다. 기존 속도에 반복 곱하거나 점프/중력을 변경하는 동작이 아니다.
- SpeedSwitch 슬롯3/4는 인원별 X/Y를 한 쌍으로 내려가며 검색한다 (`0x181708f04`). 각 축을 독립적으로 fallback하면 잘못된 좌표가 된다.

unresolved:

- 원작 공통 재귀 접촉 solver와 동등한 어댑터가 아직 없다. 해당 판정을 임의 AABB 이동으로 대체하지 않았다. `nativeContactFacts:true`는 검증된 호스트 또는 코어 테스트의 명시적인 계약이며, 실제 스테이지 지원 선언용 우회가 아니다.
- 공통 runtime에 SpeedSwitch sensor·observer·event57 수신이 미연결이다. 요청대로 기존 공통 runtime과 spring-switch 파일을 수정하지 않았다.
- 공통 Switch의 접촉 draw-offset, 애니메이션/소리 및 generic activation/visibility/top-view 경로는 미구현이다. 이 한계는 JSON report에도 기록했다.
- 원본 게임을 실행하지 않았고 실제 플레이, 재귀 물리 통합, 원본 일치 검수는 하지 않았다.

모듈은 `compile/create/solids/beforeStep/afterStep/displays/supportedTypes` 인터페이스를 제공한다. 콜백은 ctx로만 받으므로 상태에 함수가 들어가지 않으며, JSON 왕복 후200틱의 출력과 상태 동일성을 검증했다.
