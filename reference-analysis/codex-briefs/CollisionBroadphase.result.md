# CollisionBroadphase — result
status: partial
files: source-migration/source-collision-broadphase.js, source-migration/source-collision-broadphase.test.cjs, source-migration/collision-broadphase-report.json
tests: 전용 15 passing; full suite 725 passing / 0 failing
what it is: 네이티브 충돌 목록의 물리 슬롯 순서, 삭제 슬롯 LIFO 재사용, signed priority CLR introsort 및 Morton 후보 관계를 JSON 순수 helper로 구현했습니다. Gear R3와 공유 scene/map/rect/inertia 파일은 수정하지 않았습니다.
stage compiles alone: no. 호스트가 정확한 scaled Collision.GetRect, 좌표 raws, 충돌 반응 콜백을 제공해야 합니다.

key findings:
- active 목록은 primary 다음 secondary의 실제 슬롯 순서이며 비활성 flag bit0만 제외합니다(0x181800370). 삭제 슬롯은 LIFO 재사용합니다(0x1809529a0).
- priority signed byte 내림차순이며 X tie-break는 없습니다(0x1818007b0). CLR introsort threshold16/median pivot/right recursion/heap fallback을 복원했습니다(0x1808ef130, 0x1808ef610, 0x1808efa00). 같은 값 17개의 실제 설치 CLR 순서를 독립적으로 대조했습니다.
- splitSpace는 전체 목록 복사입니다(0x1817f8020). descriptor는 제자리 갱신하며 순서를 바꾸지 않습니다(0x18177eae0).
- 다른 level의 Morton 비교는 ancestor 전체가 아니라 하위 2bit 비교입니다(0x18177ec30). False positive를 제거하는 기하 overlap 검사는 추가하지 않았습니다.
- rect far corner는 inclusive이고 밖으로 나가면 root입니다(0x18177ec90). map47×10의 unitRaw464 때문에 x141은 아직 첫 cell입니다.

unresolved: 최초 capacity 표는 추가 조사로 해결했습니다. 요청90 → 실제97이며 기본값97을 제공합니다. 성장/rebucket은 거부합니다. collision 초기 payload/geometry와 scene 반응은 호스트 책임이며 원본 게임을 실행하지 않았습니다.

사용: createStorage() → createCollision/resolved payload → buildChunk(storage,config). 이동 뒤 updateDescriptors(chunk,config,lookup)를 호출하며 scanCandidates callback에서 네이티브 반응과 필요한 descriptor 갱신을 진행합니다. 후보 목록을 사전에 고정하지 않습니다. compile은 actor가 없는 helper 구성만 허용하고 잘못된 capacity/geometry 입력은 명확히 거부합니다.

추가 확정: cctor0x18197f4e0의 30개 정수 배열을 field handle0x1831a1448(token0x800002ad, kind4, fieldRef342) → typeIndex14318 → native types registration0x182ca8ee0/type pointer0x1831f0fa0 → typeDefinition8793(<PrivateImplementationDetails>)/field41356까지 추적했습니다. metadata blob byte6127992, length120의 SHA256은 FA856B58B602D1AFB828D70020BB2D88B0C50B97FE8920E56AEBF6D280C11175이며 필드명과 일치합니다. 표의 첫 >=90은97입니다. 기존의 explicit capacity 필수 제한을 제거했습니다. 중간 노트의 handle 주소0x183ba1448은 산술 기록 오류였고0x1831a1448로 정정합니다.

다음 작업: 리드가 scene의 checkChunk 진입에서 buildChunk를 호출하고 이동/반응 후 updateDescriptors, 각 native phase에서 scanCandidates를 연결해야 합니다. 정확한 actor 초기 collision payload 및 scaled rectangle 공급이 필요합니다. 공유 파일은 수정하지 않았습니다.

removeCollision은 dictionary bookkeeping helper입니다. 호스트는 네이티브 순서대로 Collision.Dispose를 먼저 수행한 뒤 unlink해야 합니다.
