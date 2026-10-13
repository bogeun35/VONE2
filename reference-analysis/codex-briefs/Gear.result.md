# Gear — R3 result
status: partial
files: source-migration/source-gear-devices.js; source-migration/source-gear-devices.test.cjs; source-migration/source-gear-collision.js; source-migration/source-gear-collision.test.cjs; source-migration/gear-device-report.json; codex-briefs/Gear.result.md; codex-briefs/작업중-Gear.md
tests: 장치35/35 + 새 원형 helper27/27 = Gear 전용62/62 통과. 최종 전체 source-migration 699/699 통과, 실패0, 종료코드0.

what it is: Gear의 R1/R2 파라미터·전체 FPSqrt·Actor·event43 성과를 유지하고, 원형끼리의 실제 네이티브 FP 되감기 응답과 접촉 캐시 생성/갱신/삭제를 Gear 고유 helper로 추가했다. 원형-사각형이 어떤 네이티브 경로를 쓰는지와 실제 콜백 순서도 확인했다. 모든 분석은 원작 실행 없이 바이너리/자산을 읽었다.

stage compiles alone: 아니오. 2~8인 기본 compile은 nativeActorBridge 부재를 계속 거부한다. 이번 helper는 확인한 원형 수치 응답과 캐시·콜백 계약을 완성했지만, 리드가 담당하는 사각형 응답·Map.Move/IsContacted·inertia·공간 분할·타입별 Actor 연결을 대신하지 않는다. 새 배포/개방 라운드 없음.

이번 해소:
- source-gear-collision.js는 원형-원형 FP 응답, 혼합 shape 라우팅, actor contact 캐시, Collision.updateAfter 및 late OnCollided 순서용 순수 helper다. SourceGearDevices의 전체 sqrt를 재사용하므로 추가 LUT 복사본이 없다. Node/browser 둘 다 검증했다.
- UpdatePushBack0x1817f9c80..da1의 target bit1, layer check, moved bit6, fixed bit2/3, 현재 충돌·이전 충돌 거부를 그대로 보존한다.
- updatePushBackCircle0x1817fb7a0..f04는 각 이동 벡터의 reciprocal/LUT 정규화, 같은 방향 dot 분기, FP 이차식 되감기, raw65 마진, 최종 위치·flag6 갱신, 서로 반대 방향 contact cache 추가를 수행한다. velocity를 직접 수정하지 않는다.
- normal은 최종 collision anchor2-anchor1에서 구한다(0x1817fbd6c..e04). circle center offset 차이로 바꾸지 않는다.
- AddContactInfo0x181690ec0는 collisionID 중복 시 기존 normal/state를 보존하고, Up↔Up 역참조를 방지하며 신규 state0를 append한다. 이 시점에는 콜백을 부르지 않는다.
- updateContactCollision0x181693fd9..419e는 own position + signed(normal/2)의 엄격한 overlap으로 기존 캐시를 확인한다. 최초 valid는 Added→Contacted, 계속 valid는 Contacted만, stale/missing/disabled는 원래 인덱스를 뒤에서부터 삭제한다. Added 뒤 Contacted는 캐시 normal을 다시 읽는다.
- ForceUp flag5는 scaleX만 절반으로 한 native search를 수행하고 복구한다(0x181693c67..e89). 순서가 검증된 search adapter 없으면 거부한다.
- Collision.updateAfter0x181693641..a71: prePos=current/flag6 해제 → 등록된 scale callback → preScale/expectedScale → squared displacement>=4일 때 Actor position sync 및 등록된 pushed-back callback → actor cache callbacks → map cache callbacks. 변위511raw는 sync하지 않고512raw는 sync한다.
- Stage.onUpdate0x18170b4cc/4fc/561는 Actor.Update → Collision.Update → Actor.Post다. collision 내부는 Map → normal/fixed push passes → inertia/fixPlayerPos → scale → 각 updateAfter(actor접촉 다음map접촉) → late OnCollided다(0x1817f88d7/8911/8951/8993/8add/8c92/8d15).
- late OnCollided는 native candidate 순서의 i<j, owner→other callback이다. owner notify-bit는 내부 루프 전에, other bit는 callback 전에 캡처한다. callback 이후 quadtree를 갱신한다(0x1817ff734..822).

정정과 중요한 경계:
- R1/R2의 “원형은 AABB로 대체 불가”를 전체 경우에 적용하면 틀린다. 두 shape가 모두circle일 때만 radial이고, 원형-사각형은 원형의 scaled bounding rectangle을 읽어 native updatePushBackRect로 보낸다(0x181691f3f/49,0x18169210d/145,0x1817f9da7/db1/e88). 따라서 유클리드 원 밖의 사각형 모서리도 혼합 네이티브 경로에서는 충돌할 수 있다. 임의 nearest-point mixed solver를 만들지 않았다.
- 정규화5FP의 +X가 raw65535, -X가-65536이다. 이에 raw65 마진은 각각64/-65가 된다. 최종 normal65537 사례도 있다. 65535/65537을65536으로 보정하지 않아야 한다. exact face1 캐시 판정이 이 차이를 그대로 소비한다.
- 처음부터 충돌한 pair는 응답을 적용하지 않는다. 정지·겹침을 임의로 최소 관통 방향에 밀어내지 않는다.
- 독립 Python/LUT 계산과 고정된 기대값으로 head-on, 실제Gear radius45 단독이동, 동일방향, effectivePre override, 대각선 응답을 확인했다. 대각선 사례: discriminant2620391424, rewindTime28783, rewind(86387,115183), final position(110221,146961), normal(40362,51632).

리드/LinePathGear 재사용 계약:
1. 브라우저에서 source-gear-devices.js 다음 source-gear-collision.js를 로드한다. Node는 후자가 전자를 require한다. 새 helper 전용 전역은 SourceGearCollision이다.
2. world.collisions는 실제 native active/chunk 순서를 유지한다. 각 collider는 collisionId/actorId, shape(circle/rect), flags/layer/pushBackTarget, current/pre position/scale, pivot, local circle 또는 H/W/X/Y rect, contacts를 제공한다. contacts는 collisionID/normalXRaw/normalYRaw/hasCalledAdded를 보존한다. 함수와 game 상태는 JSON 가능한 데이터와 host callback으로 분리된다.
3. pushBackPair(world,idA,idB,{isEnableCheck,rectResponse,...})는 복제된 world를 반환한다. 두 circle이면 실제 radial response, mixed면 리드의 rectResponse를 호출한다. circleResponse는 낮은 수준 solver이므로 scene gates는 pushBackPair에서 수행한다. nullable previous override는 절대 이전 위치이며 기존 native prePose와 혼동하지 않는다.
4. 계산된 circle 위치/flag6/contact cache를 scene에 적용한다. AddContactInfo 직후 Gear.contact를 호출하지 않는다. 각 updateAfter 위치에서 finishCollision을 native 순서로 호출한다.
5. finishCollision host callbacks: hasOnChangeScale/hasOnPushedBack 실제 타입 registry, syncActorPosition, onChangeScale/onPushedBack, onContactAdded/onContacted, refreshMapContacts. 임의로 없는 Gear handler를 만들지 않는다. actorExists와 expected pose/scale을 제공한다.
6. ForceUp flag5이면 forceUpSearch의 native ordered result가 필수다. Map.IsContacted 접촉/normal 생성은 리드 adapter가 맡는다. map 접촉은 actor 접촉 뒤 contactType0으로 전달한다. actor 접촉은 contactType1/otherLayer/실제other velocity로 Gear.contact에 전달한다.
7. lateCollided는 native orderedIds 및 isEnableCheck/candidateCheck/타입 dispatcher/updateTreeObjects를 사용한다. quadtree·chunk 순서를 임의 정렬하거나 전체 overlap 생성 결과를 native 목록이라 부르지 않는다.
8. raw FP 단계는 0x1817f8911..896f의 normal/fixed 최대8회·fixed return1 outer 최대8회, lead inertia/fixPlayerPos/scale 다음 cache callbacks, 마지막 late collided를 지킨다. helper가 이 사각형·맵·inertia scene scheduler 전체를 구현했다고 간주하지 않는다.
9. SourceGearCollision.normalized는 일반 diagonal FP 법선 계산에 재사용 가능하다. SourceGearDevices의 sqrtTableEntry를 써 원본 FPSqrt 경로를 유지한다.

REA/Ghidra 현재 증거:
- first-run.md는 현재15880bytes, gameassembly.json은17787bytes, 2026-10-13 22:32경 결과다. 이전0bytes 관측은 폐기한다.
- Ghidra12.1.4의 실제0x1818713e0 의사코드를 읽고 Landmine의 signed magic division을 어셈블리0x181871571/585/59e/5af/5b7/5c2/5d0과 대조했다. 5→3276,66→43253,-5→-3276,-66→-43253,0→0,100→65536 모두 일치한다.
- rea decompile --help와 설치 CLI/provider 코드를 확인했다. 각 CLI 분석은 세션을 열고 닫으며 imported Program/temp project는 종료 시 삭제된다. 현재 snapshot entries/workflow_entries는 비었고 evidence_bundle에는 해당 함수 결과가 있다. 영속 전체 Ghidra 프로젝트/캐시라고 주장하지 않는다.
- 원형 함수 의사코드는 현재 snapshot에 없다. 원형 복원은 실제 어셈블리와 검증한 LUT가 근거다. 무거운 전체 재분석·동일 snapshot 덮어쓰기·백그라운드 중복 분석은 하지 않았다. CODEX-HANDOFF의 오래된 현황 갱신은 리드 담당이다.

unresolved:
- 새 helper와 common runtime의 실제 등록·접속은 리드 작업이다. native circle/circle 수치·actor cache·coarse callback order는 이번 작업에서 해소했다.
- mixed rectResponse, Map.Move/Map.IsContacted, inertia/fixPlayerPos/scale, native layer table 및 broadphase/active/chunk/quadtree 순서는 리드 adapter를 요구한다. 해당 adapter가 없으면 구체적으로 거부한다.
- ActorUpdater 안의 개별 delegate 등록 순서, generic Actor prototype/pause/warp/out-of-map 및 player 전체 이벤트는 host metadata/입력으로 남는다. Gear event43 범위는 R2 구현 그대로다.
- live gameplay/사람의 원작 대조 검수는 하지 않았다.

이번에는 Gear 소유7파일만 작성/갱신했다. source-move-contact.js·공용 contactResponse·source-stage-runtime.js·LinePathGear·다른 선점·play·배포·큐·커밋/푸시는 수정하지 않았다. 테스트 중 다른 세션 실패 없음. 주소별 전체 근거와 과거 정정 이력은 gear-device-report.json에 남겼다.