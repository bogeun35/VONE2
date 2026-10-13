# 15-touch-energy — result
status: done
files: source-migration/source-touchenergy-devices.js, source-migration/source-touchenergy-devices.test.cjs, source-migration/touchenergy-device-report.json, codex-briefs/15-touch-energy.result.md
tests: 개별 13개 통과; full suite: 358개 통과, 실패 0개 (`node --test source-migration/*.test.cjs`).

what it is: 플레이어끼리 닿으면 공동 에너지가 감소하는 장치다. 처음 닿을 때 즉시 감소하고 계속 닿으면 인원별 설정 간격마다 다시 감소하며, 떨어졌다 다시 닿아도 즉시 감소한다. 표시 잔량이 0이 되면 모든 Player에 QuakeDead를 한 번 보낸다. 충전하거나 가득 찼을 때 성공을 알리는 장치가 아니다.

stage compiles alone: 아니오. 장치 모듈 자체는 st_w_02_02와 st_w_02_04의 실제 변형을 선택해 2~8인 모두 컴파일했다. 전체 스테이지는 런타임 등록과 다른 액터 구현이 필요하다. 02_02에는 SwitchObserver·Text·WeightedLiftSingle 등을, 02_04에는 Text·MoveWall·LinePathLift·Wind 등을 포함해 보고서에 전체 동반 타입을 기록했다. 다른 작업의 파일은 작성하거나 수정하지 않았다.

key findings:
- Creator ordinal 221은 TouchEnergyComponent.Creator다 (등록 지점 `0x181776b22`, Creator `0x18172f180`).
- 슬롯 3/4/5는 초기 잔량·감소량·간격의 FP 인원표다. 두 스테이지 모두 잔량=2×인원, 감소량=2, 간격 raw=65536이다 (`0x18172f491`, `0x18172f4aa`, `0x18172f4c3`). 슬롯 6의 int 인원표는 표시와 보간을 제어한다 (`0x18172f7d4`, `0x18172f170`).
- 접촉 판정은 양쪽 플레이어 상태가 Default(1)인 경우에 한하며 충돌 사각형 간격 raw 655까지 허용한다 (`0x18172fc74`, `0x18172fd0e`, `0x181730470`; QFP `.cctor` `0x181780cc0`).
- 모든 i<j 플레이어 쌍을 별도로 처리한다. 접촉 직후 감소하며 떨어지면 해당 타이머를 0으로 되돌린다 (`0x18172fa5b`~`0x18172faf1`, `0x18172fb83`). 60Hz 연속 접촉의 두 번째 감소는 62번째 틱이다.
- 보이는 잔량은 초당 최대 잔량×5로 실제 잔량에 접근한다 (`0x181730242`~`0x181730299`). 2인 기준 첫 감소의 표시 반영 완료는 7번째 틱, 계속 닿을 때 고갈 통지는 68번째 틱이다.
- 고갈 시 이벤트 43(QuakeDead)을 액터 타입 27(Player)에 보내고 종료 비트를 설정한다 (`0x1817302e7`, `0x1817302fe`, `0x18173030f`). 마지막 감소에서는 SE 11이 생략되지만 히트 표시와 흔들림은 발생한다 (`0x1817300ce`, `0x181730110`, `0x18172fb53`).

unresolved: 등록은 지시대로 하지 않았다. 런타임은 ctx.players에 원작 인덱스·상태·월드 충돌 사각형(raw)을 제공하고 이벤트 43을 원작 Player 처리기로 전달해야 한다. 히트 표시 좌표/애니메이션은 이 모듈에서 복원하지 않고 쌍 인덱스를 반환하며, 호스트가 CollisionUtility.CalcCollidedCenterPosition(`0x18177f9f0`)에 연결해야 한다. 슬롯 0/1/2의 FP로 정확히 표현되지 않는 입력은 컴파일 시 명시적으로 거부한다. 원작 실행·시각 대조·브라우저/온라인 검증은 수행하지 않았다. 구현·정수 타이밍·JSON 왕복은 검증했지만 완전한 물리 일치를 주장하지 않는다.
