# DistanceConstraint — 후속 결과
status: partial (네이티브 수학·전체 힘 코어 완료, 공용 접촉 전파 연결 대기)
files: source-migration/source-distanceconstraint-devices.js, source-migration/source-distanceconstraint-math.js (신규), source-migration/source-distanceconstraint-devices.test.cjs, source-migration/distanceconstraint-device-report.json
담당: 보조 세션 3 (01a13559-c00c-7060-b3b1-0466fccc7349)
tests: 전용 32/32 통과; 최종 전체 592/592 통과.

what it is: 플레이어 순서에 따라 거리 제한으로 서로 연결하는 장치입니다. 이번 후속에서 동적 좌표용 전체 FP 조회표 length/normalize와 calcPrev/NextTension, 두 calcF의 수치·접촉·플래그 분기를 순수 함수로 완성했습니다. 수송은 리드가 정확한 공용 접촉 계약으로 연결해야 합니다.

stage compiles alone: 기본 옵션으로는 거부합니다. nativeConstraintFacts:true로 st_w_02_01, st_w_02_03, st_w_09_04의 2~8인 21조합 코어 compile은 됩니다. runtime beforeStep은 dense native player facts와 성공한 applyConstraintUpdate 전파 트랜잭션이 반드시 필요하므로 playable 완료가 아닙니다.

key findings:
- FPSqrt 전체 65,537 int32, resources.assets byte11384408/262148 bytes. SHA256 de5265f651730f20b54cc24bdcd3047e61320be44a5ae54796d290a189f4bca5. 별도 DistanceConstraint 전용 math UMD에 수치표와 정수 알고리즘을 넣었습니다.
- normalize는 x²+y²의 low64와 조회표 shift/value를 사용해 trunc(2^44/value)로 계산합니다 (0x1816463a0, 0x18163df00). 200px 양의 축은 raw65535, 음의 축은 -65536입니다. 실수 단위벡터로 바꾸면 틀립니다.
- nextTension은 i<count-2라는 엄격한 조건으로 마지막 링크를 제외합니다. prev와 의도적으로 비대칭이며 2인은 next 루프를 돌지 않습니다 (0x18181af37/af4c/b1d5).
- pairF는 내적 장력 비율로 거리 초과 힘을 배분하고 K raw13107을 곱합니다. peer state5는 full share; self state5는 skip (0x18181baa0).
- map/rect의 left/right/ceiling/floor 접촉에서 힘을 다른 축으로 전환합니다. X 또는 Y의 abs65가 엄격한 경계이고, corner에서는 이전 X의 부호를 유지합니다 (0x18181be1d..c171).
- aggregateF는 event24에 따른 반대 X속도 제동, 강한 상승 힘의 flagsbit0clear, 약한 접지 상승 취소, 벽전환 힘과 Y속도 비교, 양음Y cap을 처리합니다 (0x18181b7e4..ba0f).
- 어느 플레이어의 flagsbit9(0x200)이든 있으면 전체 업데이트를 건너뛰고 event24flags를 보존합니다. state5->normal 및 다음 tick flagclear를 테스트했습니다 (0x18181a21a, 0x18181a723).

리드 연결 계약:
- snapshot: index, xRaw/yRaw, vxRaw/vyRaw, state(byte), flags(uint32), hasActor, hasCollision, floating, contactCount0, contacted1, mapFaces[0..3]. 의미와 호출 주소는 report.integration.snapshotFields 참고.
- compile 옵션 nativeConstraintFacts:true. beforeStep에는 constraintPlayers와 applyConstraintUpdate(update) 함수가 필요하며 완료 시 true를 반환해야 합니다.
- moves를 actor-index 순서로 현재 Actor position/velocity에 더하고 mode2 moveContactActor(deltaRaw,directionRaw)를 실행하세요. 이전 수송이 이후 플레이어를 움직일 수 있으므로 update.players의 절대좌표를 일괄 대입하면 안 됩니다. 그 배열은 수송 전 미리보기입니다.
- 전체 수송 완료 후 event24flags를 clear합니다. bit9 skip은 pending flags를 유지합니다.
- 브라우저 로드 순서: source-distanceconstraint-math.js → source-distanceconstraint-devices.js.

unresolved:
- 공용 native floating/contact facts 및 mode2 수송/PlayercontactResponse 연결은 리드 소유이며 수정하지 않았습니다.
- 실제 접촉그래프 수송·원작 플레이 대조는 미검증입니다. multiple DistanceConstraint 순서, null actor 기하 진입, 불완전 native snapshots, 정수 overflow 범위는 특정 오류로 거부합니다.
- TopViewPlayer/StepEnemy/WarpAll 등 다른 장치는 구현하지 않았습니다.

중간 전체 실행은 타세션 Gear 4개가 실패했으나 수정하지 않았고, 최종 전체 실행은 592/592 통과했습니다. 기존 R1 확정 파라미터·상수는 유지했으며 변경 이력은 리포트에 보존했습니다.
등록·공용 파일·play·배포·커밋·푸시는 수정하거나 실행하지 않았습니다.
