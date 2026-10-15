# NativeActorAdd — result
status: done / 동결
files: source-migration/source-native-actor-add.js, source-native-actor-add.test.cjs, native-actor-add-report.json; 이 result 및 작업중 claim.
tests: 전용20/20, 전체2081/2081 통과(동시 보조 파일 포함). 원작 실행 없음.

what it is: 실제 materialization이 반환한 EntityRef에 공통 Actor를 추가하는 독립 helper다. 검증된 allocator/기존 Actor physical pool snapshot을 받고, Add와 일반 Actor.Initialize를 별도 API로 제공한다. heap/pool 성장은 구현하지 않으며 holder 할당은 정확한 실제 heap host를 요구한다.
stage compiles alone: 아니오. 실제 Player/Key/Goal prefab materializer→Actor Add→공통 Initialize 연결 fixture는 검증했지만 전체 stage 준비·heap·typed creator·collision·scene 등록은 포함하지 않는다.

## 정적 경계

- ActorComponent ID20 / size336(0x150) / flags0. Setup의 reserved0, builtins19개(View18/MapEntityLink19) 뒤 첫 custom Actor 등록 0x18174f009. MethodSpec94637 slot1831d5700, count→Id0x18072ab03/ab26, size0x18072ab48. flags0은0x18174efef.
- factory wrapper0x1801f9ad0: Activator zero336@0x1801f9b2f→EntityRef capacity/version 검증→Has@0x1801f9c3d→typed Set@0x1801f9cef. 중복은0x1801f9c44→null0x1801f9d30→[null+20] 쓰기0x1801f9d5e 실패이다. 기존 Actor 재사용/get-or-add 아님.
- Set0x1807881a0은 pool data write@0x180788312→mask20@0x180788354→global OnAdded@0x1807883b8→Frame added-listener@0x1807883fd 순서. wrapper의 EntityRef raw+20 쓰기는 그 뒤0x1801f9d5e. 따라서 callback 경계의 Actor.EntityRef는 아직zero다. 표준 global OnAdded는null, OnRemoved만실제등록(Serialize slot1831d58a0 / OnRemoved1831d58a8), 변경없는 표준 SystemSetup의 Frame added-signal도null. custom profile은 명시 거부한다.
- pool append는 실제 기존count를 슬롯으로 쓰며 ref/map을 갱신하고 version은 증가시키지 않는다(0x18193cbe6/cc07/cc0f). block/slot0 sentinel/전체 ushort map을 요구한다. allocator generation과pending physical row도 검증하며 기존mask의 다른bit를 보존한다.
- holder는 Add에서 할당하지 않는다. Actor.Initialize0x18169cc10의 EntityRef/type→QString ctor0x18169ccae→Stage baseScale,scaleXY=1,weight1 다음, capacity4@0x18169cd41/call@cd4a에서 QList<CollisionHolder>를 할당한다. elementSize8@0x18001ced0, header16@0x1807fdaac, data4*8@0x1807fdb09, count0@fdb34. 실제 header handle@0x18169cdc5 후 bit14@cdd4.
- Player는0x1816bd3e4 Frame.Create→AddActor0x1816bd404→Actor.Initialize0x1816bd42d 후 DamageManage/Player.Initialize로 진행. Key는Frame.CreateActorEntity0x18186b520 뒤AddKey0x18186b544, Goal은Frame.CreateActorEntity0x18185f69b 뒤AddGoal0x18185f6bf. 일반 경계 이후 각 typed component는 이 helper가 추가하지 않는다.

## API와 연결 계약

1. addActor(snapshot, entityRef, requiredProfile): schemaVersion1 + 실제 NativeEntityAllocator snapshot + actorPool(componentId20,elementSize336,flags0,blockSize/blockCount/version,slots[null,{ref,actor}],전체entityToSlot)을 요구한다. 성공 반환 state를 caller가 채택한다. Actor projection은 기존 ActorInitialization 스키마이며 raw padding/heap byte serialization이 아니다.
2. initializeAddedActor(snapshot, entityRef, {actorType,name,stageScaleRaw}, profile, {allocateCollisionHolders}): 정확한 fresh Add 결과만 받는다. 명시 heapSnapshot이 필요하다. QString 오류는 기존 NativeQString 메시지를 그대로 전파하며 rename/shortening을 하지 않는다.
3. allocateCollisionHolders(heapSnapshot, {capacity:4,elementSize:8,headerSize:16,initialCount:0}, context)는 QString/scale/weight가 반영되고 handle/bit14는 아직0인 Actor context를 받는다. 실제 post heapSnapshot, signed32 nonzero header handle, 같은 allocation facts를 동기 반환해야 한다. 이 API는 실제 heap allocator 구현을 대신하지 않으며 opaque heap topology를 검증했다고 주장하지 않는다.
4. 반환은 공통 initialized bit14까지만이다. 장치 typed Add, DamageManage, collision, manager/scene/list 등록 및 OnStart는 뒤 단계다. helper는 EntityRef를 생성하지 않는다. 두 API 모두 JSON draft이고 입력은 성공/실패 시 그대로이며, 외부 heap side effect의 rollback은 caller 책임이다.

unresolved: 실제 stage의 초기allocator/pool/heap snapshot, native heap topology/PointerToRef32 변환 및 growth는 외부 구현 필요. NativePoolGrowth 담당 범위와 중복하지 않았다. nonzero signed32 holder handle 경계만 지원한다. custom callback/등록은거부. 기존 Actor 일반 재초기화는 이 helper가 거부하며 기존 ActorInitialization pure patch와 구별한다. 기존 Factory/ActorInitialization/Allocator/Lifecycle/Materializer/공용문서/Git/배포 변경 없음.
