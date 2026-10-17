# ActorInitialization — result
status: done (검증된 helper 경계; runtime 통합은 리드)
files: source-migration/source-actor-initialization.js, source-migration/source-actor-initialization.test.cjs, source-migration/actor-initialization-report.json, 이 결과 및 선점

tests: 전용 16 passing; full suite 1384 passing / 0 failing.

what it is: Actor의 실제 생성 상태에 Initialize의 검증된 쓰기만 적용하는 순수 helper다. Actor가 없는 경우의 implicit zero 상태도 별도 API로 제공한다. 입력의 기존 필드 보존은 Initialize 자체의 의미이며, factory의 existing-Actor AddComponent 성공을 뜻하지 않는다. 성공한 AddActor의 InitPos/Pos 설정과 충돌 위치·스케일 처리는 기존 PlayerCollisionInit 코어를 재사용한다.

stage compiles alone: no. 실제 3-2·10-4 온/오프라인 2..8인 population 및 Player collider 초기화 조합 검증은 통과했다. 완전한 stage factory는 실제 프리팹 상태, allocator EntityRef, holder handle, QString 결과와 scene 등록을 공급해야 한다.

API:
- `defaultMaterialized({actorComponentAbsent:true})`: Actor component 부재가 확인된 경로만 zero 상태. EntityRef와 owner refs는 null, 모든 vector/scalar/animation/flags/scale은 zero다. Entity를 할당하지 않는다.
- `initialize(materialized, {entityId,actorType,stageScaleRaw,collisionHolderListHandle,nameQStringBytes})`: Actor.Initialize 전용. `nameQStringBytes`는 호스트가 확정한 정확한32바이트다. 반환된 객체를 PlayerInit 이전 Actor로 사용한다.
- `register(actor, collisions, mutableFactoryPosition, stageScaleRaw, {uniqueNameVerified:true})`: creator 완료 후의 위치를 받아 InitPos/Pos와 collision current/pre position을 설정하고 모든 collision scale에 ActorXY*StageScale을 곱한다. Actor.PrePos·Velo·Accel은 보존한다. holder.syncPos가 authoritative이며 missing collision은 native처럼 skip한다.

key findings:
- Frame.AddComponent helper 0x1801f9b2f ->0x180684320은 native generic table/MethodSpec82962/inst486/type4490을 따라 `Activator.CreateInstance<ActorComponent>`로 확정했다. ActorComponent에는 instance `.ctor`가 없고 static `.cctor`만 있다. 따라서 부재한 component의 기본값은 implicit zero이며, 프리팹 existing component에 이를 덮으면 안 된다.
- Initialize 0x18169cc10: EntityRef+20, ActorType ushort+6, Name+130, Stage.BaseScale+50, scaleXY=(65536,65536), Weight=65536, holder allocation capacity4/실제handle+8. Flags는 0x18169cdd4에서 기존값 OR bit14이며 다른 bit를 보존한다.
- Initialize는 Pos/PrePos/InitPos/Velo/Accel을 쓰지 않는다. SetInitPos도 0x18169d2cf/+80, 0x18169d2d6/+b0만 써서 Actor.PrePos+c0는 그대로다. Update1에 이르러 Pos가 PrePos로 복사된다.
- PlayerCreator 순서는 AddComponent<ActorComponent>(부재 필요) ->Actor.Initialize(0x1816bd42d) ->DamageManage.Initialize ->Player.Initialize(0x1816bd4d2) ->ActorType27 ->mutableY-=32768(0x1816bd4e8) ->AddActor. AddActor는 SetInitPos(0x1816a73ee) 다음 SetBaseScale(0x1816a7422)이다.
- 3-2 authored actor 수는 2인20/3..8인18, 10-4는 모두26이다. authored Player 슬롯은 모두8개이며 실제 count개만 기존 PlayerInit과 비교했다. 테스트 EntityRef/collision ID는 명시적 호스트 fixture이며 native allocator 순서 주장에 사용하지 않았다.

unresolved / 명시적 경계:
- allocator/entity identity/authored ID 변환, 프리팹 asset 해석, unique-name 생성/QString UTF8 truncation은 구현하지 않았다. 실제 host 값을 요구한다.
- native holder handle 할당·해제와 scene dictionary/type bitset 삽입은 host 책임이다. helper는 새 논리 holder 목록만 만든다.
- duplicate-name 경로의 OnExit/Destroy는 helper가 대행하지 않으며 `uniqueNameVerified:true`가 없으면 거부한다.
- 중복 collision IDs/holders는 반복 lookup에 따른 누적 scale 처리를 생략하지 않도록 명시적으로 거부한다.
- Player.Initialize 자체 Actor flags/state 변경은 기존 Player core 소유다. 본 모듈은 그 이전 generic Actor와 이후 등록 패치만 담당한다.

기존 파일, runtime/play, factory/bridge/motion/lifecycle/PlayerInit 및 Git 변경 없음. 본 작업 파일 동결.

## NativeCreationOrder 후 문서 정정
0x1801f9ad0은 get-or-add가 아닌 Frame.AddComponent<ActorComponent>(MethodSpec95521, slot0x1831c6a98)다. Actor가 이미 있으면 Has 분기0x1801f9c44 ->0x1801f9d30 zero-pointer 뒤0x1801f9d5e 쓰기로 가므로 기존 Actor를 반환하는 생성 경로가 아니다. initialize API는 Actor.Initialize 자체의 순수 쓰기 패치로서 입력 상태를 보존하는 동작이 맞지만, 실제 factory creation은 Actor 부재를 확인하고 defaultMaterialized를 사용해야 한다. 이 정정은 소유 report/result/header·주석에 한하며 API/동작은 변경하지 않았다.
